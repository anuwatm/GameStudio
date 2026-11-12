use crate::{expression::{Condition, Value as Var}, project::{export_name, Project}};
use serde::Serialize;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

pub(crate) fn rows(value: &Value) -> &[Value] {
    value.as_array().map_or(&[], Vec::as_slice)
}

pub(crate) fn text(value: &Value) -> &str {
    value.as_str().unwrap_or_default()
}

pub(crate) fn index(value: &Value) -> HashMap<&str, &Value> {
    rows(value).iter().map(|row| (text(&row["id"]), row)).collect()
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Issue {
    pub code: &'static str,
    pub severity: &'static str,
    pub message: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub node_id: Option<String>,
}

pub fn validate(project: &Project) -> Vec<Issue> {
    let p = project.value();
    let nodes = index(&p["nodes"]);
    let graphs = index(&p["graphs"]);
    let activities = index(&p["activities"]);
    let events = index(&p["events"]);
    let variables = index(&p["variables"]);
    let assets = index(&p["assets"]);
    let characters = index(&p["characters"]);
    let mut issues = Vec::new();
    let mut report = |code, message, node: Option<&str>| issues.push(Issue {
        code, message, node_id: node.map(str::to_owned),
        severity: if code == "V011" { "warning" } else { "error" },
    });
    let mut ids = HashSet::from([text(&p["id"]).to_ascii_lowercase()]);
    for collection in ["nodes", "graphs", "activities", "events", "variables", "assets", "characters", "edges"] {
        for row in rows(&p[collection]) {
            if !ids.insert(text(&row["id"]).to_ascii_lowercase()) {
                report("V001", "Duplicate UUID", None);
            }
            for choice in rows(&row["choices"]) {
                if !ids.insert(text(&choice["id"]).to_ascii_lowercase()) {
                    report("V001", "Duplicate choice UUID", None);
                }
            }
        }
    }
    let mut links = HashMap::new();
    let mut outgoing = HashMap::<&str, Vec<(&str, &str)>>::new();
    for edge in rows(&p["edges"]) {
        let (from, port, to) = (text(&edge["from"]), text(&edge["port"]), text(&edge["to"]));
        if !matches!((nodes.get(from), nodes.get(to)), (Some(a), Some(b)) if a["graphId"] == b["graphId"])
            || links.insert((from, port), to).is_some()
        {
            report("V010", "Invalid or duplicate edge", Some(from));
        } else {
            outgoing.entry(from).or_default().push((port, to));
        }
    }
    let initial: HashMap<Uuid, Var> = variables.values().filter_map(|v| {
        Some((Uuid::parse_str(text(&v["id"])).ok()?, serde_json::from_value(v["initial"].clone()).ok()?))
    }).collect();
    for v in variables.values() {
        let value = &v["initial"];
        let matches = match text(&v["type"]) {
            "int" => value.is_i64(),
            "bool" => value.is_boolean(),
            "string" => value.is_string(),
            _ => false,
        };
        if !matches { report("V009", "Initial value does not match variable type", None); }
        let min = v["min"].as_i64().unwrap_or(i32::MIN.into());
        let max = v["max"].as_i64().unwrap_or(i32::MAX.into());
        if min > max || value.as_i64().is_some_and(|n| n < min || n > max)
            || (v["type"] != "int" && (v.get("min").is_some() || v.get("max").is_some()))
        {
            report("V020", "Invalid variable bounds", None);
        }
    }
    for a in assets.values() {
        let path = text(&a["path"]);
        if path.contains(['\\', ':']) || path.split('/').any(|part| matches!(part, "" | "." | "..")) {
            report("V012", "Asset path must stay beneath game/assets", None);
        }
    }
    let mut names = HashSet::new();
    for (collection, default_kind) in [("nodes", ""), ("variables", "variable"), ("characters", "character")] {
        for row in rows(&p[collection]) {
            let kind = if default_kind.is_empty() { text(&row["kind"]) } else { default_kind };
            if let Ok(id) = Uuid::parse_str(text(&row["id"])) {
                if export_name(kind, id).is_some_and(|name| !names.insert(name)) {
                    report("V021", "Duplicate generated name", None);
                }
            }
        }
    }
    let mut conditions_and_effects = |row: &Value, node: Option<&str>| {
        for field in ["condition", "visibleIf"] {
            if !row[field].is_null() {
                let valid = serde_json::from_value::<Condition>(row[field].clone())
                    .is_ok_and(|condition| condition.evaluate(&initial, 1).is_ok());
                if !valid { report("V014", "Invalid condition operands", node); }
            }
        }
        for effect in rows(&row["effects"]) {
            let variable = variables.get(text(&effect["variableId"]));
            let value = &effect["value"];
            let valid = variable.is_some_and(|v| match text(&v["type"]) {
                "int" => value.is_i64(),
                "bool" => effect["op"] == "set" && value.is_boolean(),
                "string" => effect["op"] == "set" && value.is_string(),
                _ => false,
            });
            if !valid { report("V015", "Invalid effect operand", node); }
        }
    };
    for node in nodes.values() {
        let id = text(&node["id"]);
        conditions_and_effects(node, Some(id));
        for choice in rows(&node["choices"]) { conditions_and_effects(choice, Some(id)); }
    }
    for row in activities.values().chain(events.values()) { conditions_and_effects(row, None); }
    let is_sub = |id: &str| graphs.get(id).is_some_and(|g| g["kind"] == "subgraph");
    let entry = |graph: &str| graphs.get(graph).map_or("", |g| text(&g["entryNodeId"]));
    for graph in graphs.values() {
        let id = text(&graph["id"]);
        if !nodes.get(entry(id)).is_some_and(|n| n["graphId"] == id) {
            report("V010", "Graph entry is missing or outside graph", None);
        }
    }
    let root = text(&p["entryGraphId"]);
    if !graphs.get(root).is_some_and(|g| g["kind"] == "main") {
        report("V010", "Project requires a main entry graph", None);
    }
    for a in activities.values().chain(events.values()) {
        if !a["subgraphId"].is_null() && !is_sub(text(&a["subgraphId"])) {
            report("V010", "Invalid subgraph reference", None);
        }
    }
    for (&id, &node) in &nodes {
        let graph = text(&node["graphId"]);
        let choices = rows(&node["choices"]);
        let mut ports = Vec::new();
        match text(&node["kind"]) {
            "scene" if choices.is_empty() => ports.push(("next", "V002")),
            "scene" => {
                ports.push(("fallback", "V004"));
                ports.extend(choices.iter().map(|c| (text(&c["id"]), "V018")));
            }
            "branch" => ports.extend([("true", "V016"), ("false", "V016")]),
            "effect" => ports.push(("next", "V017")),
            "schedule" => {
                ports.push(("onComplete", "V003"));
                if is_sub(graph) { report("V013", "Schedule in subgraph", Some(id)); }
                let start = node["startDay"].as_i64().unwrap_or(1);
                let last = node["lastDay"].as_i64();
                if !last.is_some_and(|day| day >= start && day <= i64::from(i32::MAX)) {
                    report("V007", "Invalid schedule day range", Some(id));
                }
                if !rows(&node["activityIds"]).iter().any(|a| activities.get(text(a)).is_some_and(|a| a["condition"].is_null())) {
                    report("V005", "Schedule requires an unconditional activity", Some(id));
                }
                let mut order = HashSet::new();
                for event in rows(&node["eventIds"]) {
                    if let Some(e) = events.get(text(event)) {
                        if !order.insert((text(&e["phase"]), e["priority"].as_i64(), e["order"].as_i64())) {
                            report("V006", "Duplicate event priority and order", Some(id));
                        }
                    } else { report("V010", "Unknown event", Some(id)); }
                }
                if rows(&node["activityIds"]).iter().any(|a| !activities.contains_key(text(a))) {
                    report("V010", "Unknown activity", Some(id));
                }
            }
            "end" if node["mode"] == "return" && !is_sub(graph) => report("V019", "Return outside subgraph", Some(id)),
            "end" if node["mode"] == "jump" => {
                if is_sub(graph) { report("V008", "Jump from subgraph", Some(id)); }
                let target = text(&node["targetGraphId"]);
                if !graphs.get(target).is_some_and(|g| g["kind"] == "main") {
                    report("V010", "Jump target is not a main graph", Some(id));
                }
            }
            _ => {}
        }
        for &(port, code) in &ports {
            if !links.contains_key(&(id, port)) { report(code, "Required port is not connected", Some(id)); }
        }
        if outgoing.get(id).into_iter().flatten().any(|(port, _)| !ports.iter().any(|(p, _)| p == port))
            || !graphs.contains_key(graph)
            || rows(&node["assetIds"]).iter().any(|a| !assets.contains_key(text(a)))
            || rows(&node["lines"]).iter().any(|l| !l["characterId"].is_null() && !characters.contains_key(text(&l["characterId"])))
        {
            report("V010", "Invalid node reference or port", Some(id));
        }
    }
    // Mark a subgraph node safe only when every outgoing path is safe.
    let mut remaining = HashMap::new();
    let mut incoming = HashMap::<&str, Vec<&str>>::new();
    let mut safe = HashSet::new();
    let mut finished = Vec::new();
    for (&id, node) in &nodes {
        if !is_sub(text(&node["graphId"])) { continue; }
        if node["kind"] == "end" && matches!(text(&node["mode"]), "return" | "ending") {
            safe.insert(id);
            finished.push(id);
        } else {
            let edges = outgoing.get(id).map_or(&[][..], Vec::as_slice);
            remaining.insert(id, edges.len());
            for &(_, target) in edges { incoming.entry(target).or_default().push(id); }
        }
    }
    while let Some(id) = finished.pop() {
        for &source in incoming.get(id).into_iter().flatten() {
            let count = remaining.get_mut(source).expect("nonterminal source");
            *count -= 1;
            if *count == 0 {
                safe.insert(source);
                finished.push(source);
            }
        }
    }
    for id in remaining.keys().filter(|id| !safe.contains(*id)) {
        report("V019", "Subgraph path does not terminate", Some(id));
    }
    let mut seen = HashSet::new();
    let mut todo = vec![entry(root)];
    while let Some(id) = todo.pop() {
        let Some(node) = nodes.get(id) else { continue };
        if !seen.insert(id) { continue; }
        todo.extend(outgoing.get(id).into_iter().flatten().map(|(_, to)| *to));
        if node["mode"] == "jump" { todo.push(entry(text(&node["targetGraphId"]))); }
        for (field, entries) in [("activityIds", &activities), ("eventIds", &events)] {
            for key in rows(&node[field]) {
                if let Some(row) = entries.get(text(key)) { todo.push(entry(text(&row["subgraphId"]))); }
            }
        }
    }
    for &id in nodes.keys() {
        if !seen.contains(id) { report("V011", "Unreachable node", Some(id)); }
    }
    issues.sort_by(|a, b| (a.code, &a.node_id, a.message).cmp(&(b.code, &b.node_id, b.message)));
    issues
}
