use crate::{project::{export_name, Project}, validate::{index, rows, text, validate}};
use serde_json::Value;
use std::collections::{BTreeMap, HashMap};
use std::fmt::Write;
use uuid::Uuid;

fn name(kind: &str, id: &str) -> String {
    export_name(kind, Uuid::parse_str(id).expect("validated UUID")).expect("known kind")
}

fn literal(value: &Value) -> String {
    match value {
        Value::Bool(true) => "True".into(),
        Value::Bool(false) => "False".into(),
        _ => value.to_string(),
    }
}

fn dialogue(value: &Value) -> String {
    literal(&Value::String(text(value).replace('[', "[[").replace('{', "{{").replace('%', "%%")))
}

// Character names bypass the legacy percent interpolation used by say/menu.
fn character_name(value: &Value) -> String {
    literal(&Value::String(text(value).replace('[', "[[").replace('{', "{{")))
}

fn operand(value: &Value) -> String {
    match text(&value["kind"]) {
        "day" => "sf_day".into(),
        "variable" => name("variable", text(&value["variableId"])),
        _ => literal(&value["value"]),
    }
}

fn condition(value: &Value) -> String {
    match text(&value["kind"]) {
        "all" | "any" => {
            let all = value["kind"] == "all";
            let parts: Vec<_> = rows(&value["conditions"]).iter().map(condition).collect();
            if parts.is_empty() { return if all { "True" } else { "False" }.into(); }
            format!("({})", parts.join(if all { " and " } else { " or " }))
        }
        "not" => format!("(not {})", condition(&value["condition"])),
        "compare" => {
            let op = match text(&value["operator"]) {
                "eq" => "==", "ne" => "!=", "lt" => "<", "le" => "<=", "gt" => ">", _ => ">=",
            };
            format!("({} {op} {})", operand(&value["left"]), operand(&value["right"]))
        }
        _ => "True".into(),
    }
}

struct Generator<'a> {
    nodes: HashMap<&'a str, &'a Value>,
    graphs: HashMap<&'a str, &'a Value>,
    variables: HashMap<&'a str, &'a Value>,
    activities: HashMap<&'a str, &'a Value>,
    events: HashMap<&'a str, &'a Value>,
    assets: HashMap<&'a str, &'a Value>,
    edges: HashMap<(&'a str, &'a str), &'a str>,
}

impl Generator<'_> {
    fn label(&self, id: &str) -> String { name(text(&self.nodes[id]["kind"]), id) }
    fn entry(&self, graph: &str) -> String { self.label(text(&self.graphs[graph]["entryNodeId"])) }
    fn target(&self, id: &str, port: &str) -> String { self.label(self.edges[&(id, port)]) }

    fn effects(&self, out: &mut String, row: &Value, indent: &str) {
        for e in rows(&row["effects"]) {
            let id = text(&e["variableId"]);
            let variable = self.variables[id];
            let lhs = name("variable", id);
            let rhs = literal(&e["value"]);
            let expr = match text(&e["op"]) {
                "add" => format!("{lhs} + {rhs}"),
                "subtract" => format!("{lhs} - {rhs}"),
                _ => rhs,
            };
            if variable["type"] == "int" {
                let min = variable["min"].as_i64().unwrap_or(i32::MIN.into());
                let max = variable["max"].as_i64().unwrap_or(i32::MAX.into());
                writeln!(out, "{indent}$ {lhs} = sf_clamp({expr}, {min}, {max})").unwrap();
            } else {
                writeln!(out, "{indent}$ {lhs} = {expr}").unwrap();
            }
        }
    }

    fn call(&self, out: &mut String, graph: &Value, indent: &str) {
        if let Some(graph) = graph.as_str() {
            writeln!(out, "{indent}call {}", self.entry(graph)).unwrap();
            writeln!(out, "{indent}if sf_ending is not None:\n{indent}    return").unwrap();
        }
    }

    fn schedule(&self, out: &mut String, id: &str, node: &Value) {
        let first = node["startDay"].as_i64().unwrap_or(1);
        let last = node["lastDay"].as_i64().expect("validated day");
        writeln!(out, "    $ sf_day = {first}\n    while sf_day <= {last}:").unwrap();
        for phase in ["before_activity", "activity", "after_activity", "end_of_day"] {
            writeln!(out, "        # phase {phase}").unwrap();
            if phase == "activity" {
                out.push_str("        menu:\n");
                for activity in rows(&node["activityIds"]) {
                    let row = self.activities[text(activity)];
                    writeln!(out, "            {} if {}:", dialogue(&row["name"]), condition(&row["condition"])).unwrap();
                    self.effects(out, row, "                ");
                    self.call(out, &row["subgraphId"], "                ");
                    out.push_str("                pass\n");
                }
                continue;
            }
            let mut events: Vec<_> = rows(&node["eventIds"]).iter().map(|id| self.events[text(id)])
                .filter(|event| event["phase"] == phase).collect();
            events.sort_by_key(|event| (std::cmp::Reverse(event["priority"].as_i64()), event["order"].as_i64()));
            for (index, event) in events.iter().enumerate() {
                let key = literal(&event["id"]);
                let mut predicate = condition(&event["condition"]);
                if event["once"] == true { write!(predicate, " and {key} not in sf_fired").unwrap(); }
                let keyword = if index == 0 { "if" } else { "elif" };
                writeln!(out, "        {keyword} {predicate}:").unwrap();
                if event["once"] == true { writeln!(out, "            $ sf_fired = sf_fired + [{key}]").unwrap(); }
                self.call(out, &event["subgraphId"], "            ");
            }
        }
        writeln!(out, "        if sf_day == {last}:\n            # phase schedule_complete\n            jump {}\n        $ sf_day += 1\n    return", self.target(id, "onComplete")).unwrap();
    }

    fn node(&self, out: &mut String, node: &Value) -> Result<(), String> {
        let id = text(&node["id"]);
        writeln!(out, "label {}:", self.label(id)).unwrap();
        match text(&node["kind"]) {
            "scene" => {
                for asset in rows(&node["assetIds"]) {
                    let path = format!("assets/{}", text(&self.assets[text(asset)]["path"]));
                    let path_literal = literal(&Value::String(path.clone()));
                    match path.rsplit('.').next().unwrap_or_default().to_ascii_lowercase().as_str() {
                        "webm" => writeln!(out, "    $ renpy.movie_cutscene({path_literal})").unwrap(),
                        "png" | "jpg" | "jpeg" | "webp" => writeln!(out, "    scene expression {path_literal}").unwrap(),
                        "ogg" | "opus" | "mp3" | "wav" => writeln!(out, "    play sound {path_literal}").unwrap(),
                        _ => return Err(format!("Unsupported scene asset: {path}")),
                    }
                }
                for line in rows(&node["lines"]) {
                    let speaker = line["characterId"].as_str().map(|id| name("character", id) + " ").unwrap_or_default();
                    writeln!(out, "    {speaker}{}", dialogue(&line["text"])).unwrap();
                }
                self.effects(out, node, "    ");
                let choices = rows(&node["choices"]);
                if choices.is_empty() { writeln!(out, "    jump {}", self.target(id, "next")).unwrap(); }
                else {
                    let visible: Vec<_> = choices.iter().map(|choice| condition(&choice["visibleIf"])).collect();
                    writeln!(out, "    if not ({}):\n        jump {}\n    menu:", visible.join(" or "), self.target(id, "fallback")).unwrap();
                    for (choice, predicate) in choices.iter().zip(visible) {
                        writeln!(out, "        {} if {predicate}:", dialogue(&choice["text"])).unwrap();
                        self.effects(out, choice, "            ");
                        writeln!(out, "            jump {}", self.target(id, text(&choice["id"]))).unwrap();
                    }
                }
            }
            "effect" => {
                self.effects(out, node, "    ");
                writeln!(out, "    jump {}", self.target(id, "next")).unwrap();
            }
            "branch" => writeln!(out, "    if {}:\n        jump {}\n    else:\n        jump {}", condition(&node["condition"]), self.target(id, "true"), self.target(id, "false")).unwrap(),
            "schedule" => self.schedule(out, id, node),
            "end" => match text(&node["mode"]) {
                "return" => out.push_str("    return\n"),
                "jump" => writeln!(out, "    jump {}", self.entry(text(&node["targetGraphId"]))).unwrap(),
                _ => writeln!(out, "    $ sf_ending = {}\n    return", literal(&node["id"])).unwrap(),
            },
            _ => unreachable!("validated node kind"),
        }
        out.push('\n');
        Ok(())
    }
}

/// Generates text in memory. Writing files belongs to the caller.
pub fn export_renpy(project: &Project) -> Result<BTreeMap<&'static str, String>, String> {
    if let Some(issue) = validate(project).into_iter().find(|issue| issue.severity == "error") {
        return Err(format!("{}: {}", issue.code, issue.message));
    }
    let p = project.value();
    let g = Generator {
        nodes: index(&p["nodes"]), graphs: index(&p["graphs"]), variables: index(&p["variables"]),
        activities: index(&p["activities"]), events: index(&p["events"]), assets: index(&p["assets"]),
        edges: rows(&p["edges"]).iter().map(|e| ((text(&e["from"]), text(&e["port"])), text(&e["to"]))).collect(),
    };
    let mut vars = String::from("default sf_day = 1\ndefault sf_fired = []\ndefault sf_ending = None\n");
    for row in rows(&p["variables"]) {
        writeln!(vars, "default {} = {}", name("variable", text(&row["id"])), literal(&row["initial"])).unwrap();
    }
    for row in rows(&p["characters"]) {
        writeln!(vars, "define {} = Character({})", name("character", text(&row["id"])), character_name(&row["name"])).unwrap();
    }
    let mut story = format!("label sf_entry:\n    call {}\n    return\n\n", g.entry(text(&p["entryGraphId"])));
    let mut schedule = String::new();
    for node in rows(&p["nodes"]) {
        g.node(if node["kind"] == "schedule" { &mut schedule } else { &mut story }, node)?;
    }
    Ok(BTreeMap::from([
        ("script.rpy", "label start:\n    call sf_entry\n    return\n".into()),
        ("storyflow_generated/sf_runtime.rpy", "init python:\n    def sf_clamp(value, lower, upper):\n        return min(max(value, lower), upper)\n".into()),
        ("storyflow_generated/sf_story.rpy", story),
        ("storyflow_generated/sf_schedule.rpy", schedule),
        ("storyflow_generated/sf_variables.rpy", vars),
    ]))
}

/// Maps generated source lines to their owning node and optional choice.
pub fn source_map(project: &Project, files: &BTreeMap<&str, String>) -> Value {
    let nodes = rows(&project.value()["nodes"]);
    let labels: HashMap<_, _> = nodes.iter().map(|n| (name(text(&n["kind"]), text(&n["id"])), n)).collect();
    let mut mapped = serde_json::Map::new();
    for (path, source) in files {
        let mut node = None;
        let mut choice_id: Option<&str> = None;
        let mut choice_index = 0;
        let mut lines = serde_json::Map::new();
        for (index, line) in source.lines().enumerate() {
            if let Some(label) = line.strip_prefix("label ").and_then(|line| line.strip_suffix(':')) {
                node = labels.get(label).copied();
                choice_id = None;
                choice_index = 0;
            }
            if let Some(node) = node {
                // Exported menu rows follow choice order; text can be duplicated.
                if line.starts_with("        \"") && line.contains(" if ") && line.ends_with(':') {
                    if let Some(choice) = rows(&node["choices"]).get(choice_index) {
                        choice_id = choice["id"].as_str();
                        choice_index += 1;
                    }
                }
                lines.insert((index+1).to_string(), serde_json::json!({
                    "nodeId":node["id"],"choiceId":choice_id
                }));
            }
        }
        if !lines.is_empty() { mapped.insert(format!("game/{path}"), Value::Object(lines)); }
    }
    serde_json::json!({"version":1,"files":mapped})
}

/// Accepted CLI bundle representation, shared by native and Worker export.
pub fn export_bundle(project: &Project) -> Result<Value, String> {
            let files = export_renpy(project)?;
            let map = source_map(project, &files);
            let nodes = project.value()["nodes"].as_array().unwrap();
            let graphs = project.value()["graphs"].as_array().unwrap();
            let subgraphs: Vec<_> = graphs.iter().filter(|g| g["kind"] == "subgraph").collect();
            let ids: std::collections::HashSet<_> = subgraphs.iter().map(|g| &g["id"]).collect();
            let subnodes: Vec<_> = nodes.iter().filter(|n| ids.contains(&n["graphId"])).collect();
            let node_ids: std::collections::HashSet<_> = subnodes.iter().map(|n| &n["id"]).collect();
            let edges: Vec<_> = project.value()["edges"].as_array().unwrap().iter()
                .filter(|e| node_ids.contains(&e["from"])).collect();
            // Save compatibility depends on graph structure, not dialogue or display names.
            let mut graph_structure: Vec<_> = subgraphs.iter().map(|g| serde_json::json!({
                "id":g["id"],"entryNodeId":g["entryNodeId"]})).collect();
            let mut node_structure: Vec<_> = subnodes.iter().map(|n| serde_json::json!({
                "id":n["id"],"graphId":n["graphId"],"kind":n["kind"],
                "choices":n["choices"].as_array().map(|c| c.iter().map(|v| v["id"].clone()).collect::<Vec<_>>())})).collect();
            let mut edge_structure: Vec<_> = edges.iter().map(|e| serde_json::json!({
                "from":e["from"],"to":e["to"],"port":e["port"]})).collect();
            for rows in [&mut graph_structure,&mut node_structure,&mut edge_structure] {
                rows.sort_by_key(|v| v.to_string());
            }
            let structure = serde_json::json!({"graphs":graph_structure,"nodes":node_structure,"edges":edge_structure});
            let generated: serde_json::Map<String, Value> = files.into_iter()
                .filter(|(path, _)| path.starts_with("storyflow_generated/"))
                .map(|(path, source)| (format!("game/{path}"), Value::String(source))).collect();
            let bundle = serde_json::json!({"projectId":project.value()["id"],"files":generated,
                "sourceMap":map,"subgraphStructure":structure});
    Ok(bundle)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn names_and_say_use_different_percent_contexts() {
        let value = json!("ไทย [name] {b} 100% ] } \"quote\" \\path\nจบ");
        assert!(dialogue(&value).contains("100%%"));
        assert!(character_name(&value).contains("100%"));
        assert!(!character_name(&value).contains("100%%"));
        assert!(character_name(&value).contains("[[name] {{b}"));
        assert_eq!(serde_json::from_str::<Value>(&literal(&value)).unwrap(), value);
    }

    #[test]
    fn export_is_deterministic_and_keeps_test_hooks_out() {
        let mut fixture: Value = serde_json::from_str(include_str!("../../../contract/fixtures/summer-house.json")).unwrap();
        fixture["nodes"][0]["lines"][0]["text"] = json!("ไทย [tag] {b} 100% \"quote\" \\path");
        let project = Project::from_value(fixture).unwrap();
        let files = export_renpy(&project).unwrap();
        assert_eq!(files, export_renpy(&project).unwrap());
        assert!(files["storyflow_generated/sf_story.rpy"].contains(&dialogue(&json!("ไทย [tag] {b} 100% \"quote\" \\path"))));
        assert_eq!(files.values().map(|s| s.matches("label start:").count()).sum::<usize>(), 1);
        for source in files.values() {
            assert!(!source.contains(['\r', '\u{feff}']));
            assert!(!source.contains("sf_test_") && !source.contains("random"));
        }
    }
}
