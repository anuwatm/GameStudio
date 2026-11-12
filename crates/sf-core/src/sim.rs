use crate::{
    effect::{apply_int_effect, IntEffect},
    expression::{Condition, Value as Var},
    project::Project,
    validate::{index, rows, text, validate},
};
use serde::Serialize;
use serde_json::Value;
use std::collections::{BTreeMap, HashMap, HashSet};
use uuid::Uuid;

type Variables = BTreeMap<String, Value>;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StepTrace {
    pub step: usize,
    pub node_id: String,
    pub day: i32,
    pub phase: &'static str,
    pub choice_id: Option<String>,
    pub event_id: Option<String>,
    pub ending: Option<String>,
    pub vars_before: Variables,
    pub vars_after: Variables,
    pub visible_choices: Vec<String>,
    pub condition_results: BTreeMap<String, bool>,
    pub transition: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplainCondition {
    pub passed: bool,
    pub expression: String,
    pub operands: Vec<Value>,
}

#[derive(Debug, Clone, Copy)]
enum Stage { Enter, Before, Activity, After, EndDay, Complete, Finished }

#[derive(Clone)]
struct State {
    node: String,
    day: i32,
    vars: Variables,
    fired: HashSet<String>,
    stage: Stage,
    resume: Option<(String, Stage)>,
}

pub struct Simulator<'a> {
    nodes: HashMap<&'a str, &'a Value>,
    graphs: HashMap<&'a str, &'a Value>,
    activities: HashMap<&'a str, &'a Value>,
    events: HashMap<&'a str, &'a Value>,
    variables: HashMap<&'a str, &'a Value>,
    links: HashMap<(&'a str, &'a str), &'a str>,
    state: State,
    trace: Vec<StepTrace>,
    history: Vec<(State, usize)>,
    explanations: Vec<ExplainCondition>,
}

impl<'a> Simulator<'a> {
    pub fn new(project: &'a Project, start: Option<&str>, overrides: Variables) -> Result<Self, String> {
        if let Some(issue) = validate(project).into_iter().find(|i| i.severity == "error") {
            return Err(format!("{}: {}", issue.code, issue.message));
        }
        let p = project.value();
        let nodes = index(&p["nodes"]);
        let graphs = index(&p["graphs"]);
        let variables = index(&p["variables"]);
        let default = text(&graphs[text(&p["entryGraphId"])]["entryNodeId"]);
        let node = start.unwrap_or(default).to_owned();
        if !nodes.contains_key(node.as_str()) { return Err(format!("Unknown start node: {node}")); }
        let state = State { node, day: 1, stage: Stage::Enter, resume: None, fired: HashSet::new(),
            vars: variables.iter().map(|(&id, row)| (id.to_owned(), row["initial"].clone())).collect() };
        let links = rows(&p["edges"]).iter().map(|e| ((text(&e["from"]), text(&e["port"])), text(&e["to"]))).collect();
        let mut sim = Self { nodes, graphs, variables, links, activities: index(&p["activities"]),
            events: index(&p["events"]), state, trace: Vec::new(), history: Vec::new(), explanations: Vec::new() };
        for (id, value) in overrides { sim.state.vars.insert(id.clone(), sim.checked_value(&id, value)?); }
        Ok(sim)
    }

    pub fn trace(&self) -> &[StepTrace] { &self.trace }
    pub fn vars(&self) -> &Variables { &self.state.vars }
    pub fn explanations(&self) -> &[ExplainCondition] { &self.explanations }
    pub fn is_finished(&self) -> bool { matches!(self.state.stage, Stage::Finished) }

    pub fn run_state(&self) -> Value {
        let mut fired: Vec<_> = self.state.fired.iter().collect();
        fired.sort();
        serde_json::json!({"nodeId":self.state.node,"day":self.state.day,"vars":self.state.vars,"firedEventIds":fired})
    }

    fn checkpoint(&mut self) { self.history.push((self.state.clone(), self.trace.len())); }

    pub fn rewind(&mut self, steps: usize) -> bool {
        if steps == 0 || steps > self.history.len() { return false; }
        let (state, len) = self.history.remove(self.history.len() - steps);
        self.history.truncate(self.history.len() + 1 - steps);
        self.state = state;
        self.trace.truncate(len);
        self.explanations.clear();
        true
    }

    fn checked_value(&self, id: &str, value: Value) -> Result<Value, String> {
        let row = self.variables.get(id).ok_or_else(|| format!("Unknown variable: {id}"))?;
        let valid = match text(&row["type"]) {
            "int" => value.as_i64().is_some_and(|v| {
                v >= row["min"].as_i64().unwrap_or(i32::MIN.into()) &&
                v <= row["max"].as_i64().unwrap_or(i32::MAX.into())
            }),
            "bool" => value.is_boolean(),
            "string" => value.is_string(),
            _ => false,
        };
        if valid { Ok(value) } else { Err(format!("Invalid variable value: {id}")) }
    }

    pub fn set_var(&mut self, id: &str, value: Value) -> Result<(), String> {
        let value = self.checked_value(id, value)?;
        self.checkpoint();
        self.state.vars.insert(id.to_owned(), value);
        self.explanations.clear();
        Ok(())
    }

    fn condition(&mut self, expression: &Value) -> Result<bool, String> {
        if expression.is_null() { return Ok(true); }
        let vars: HashMap<Uuid, Var> = self.state.vars.iter().map(|(id, value)| {
            (Uuid::parse_str(id).expect("validated UUID"), serde_json::from_value(value.clone()).expect("validated value"))
        }).collect();
        let condition: Condition = serde_json::from_value(expression.clone()).map_err(|e| e.to_string())?;
        let passed = condition.evaluate(&vars, self.state.day)?;
        let mut operands = Vec::new();
        collect_operands(expression, &self.state, &mut operands);
        self.explanations.push(ExplainCondition { passed, expression: expression.to_string(), operands });
        Ok(passed)
    }

    fn effects(&mut self, row: &Value) {
        for e in rows(&row["effects"]) {
            let id = text(&e["variableId"]);
            let variable = self.variables[id];
            let value = if let Some(n) = e["value"].as_i64() {
                let current = self.state.vars[id].as_i64().expect("validated integer") as i32;
                let op = match text(&e["op"]) {
                    "add" => IntEffect::Add(n as i32),
                    "subtract" => IntEffect::Subtract(n as i32),
                    _ => IntEffect::Set(n as i32),
                };
                let min = variable["min"].as_i64().unwrap_or(i32::MIN.into()) as i32;
                let max = variable["max"].as_i64().unwrap_or(i32::MAX.into()) as i32;
                Value::from(apply_int_effect(current, op, min, max).expect("validated bounds"))
            } else { e["value"].clone() };
            self.state.vars.insert(id.to_owned(), value);
        }
    }

    fn goto(&mut self, target: &str) {
        self.state.node = target.to_owned();
        self.state.stage = Stage::Enter;
    }

    fn call(&mut self, graph: &str, resume: Stage) {
        self.state.resume = Some((self.state.node.clone(), resume));
        self.goto(text(&self.graphs[graph]["entryNodeId"]));
    }

    /// Runs automatic transitions until input is needed or an ending is reached.
    pub fn advance(&mut self, inputs: &mut std::collections::VecDeque<String>) -> Result<Vec<String>, String> {
        let mut automatic = 0;
        while !self.is_finished() {
            if automatic >= 1000 { return Err(format!("Loop guard at node {}", self.state.node)); }
            automatic += 1;
            let previous = self.state.clone();
            let id = previous.node.as_str();
            let node = self.nodes[id];
            let mut row = StepTrace {
                step: self.trace.len()+1, node_id: id.to_owned(), day: previous.day, phase: "scene",
                choice_id: None, event_id: None, ending: None, vars_before: previous.vars.clone(),
                vars_after: Variables::new(), visible_choices: Vec::new(),
                condition_results: BTreeMap::new(), transition: String::new(),
            };
            self.explanations.clear();
            match previous.stage {
                Stage::Enter => match text(&node["kind"]) {
                    "scene" => {
                        self.effects(node);
                        let choices = rows(&node["choices"]);
                        if choices.is_empty() {
                            self.goto(self.links[&(id, "next")]);
                        } else {
                            for c in choices {
                                let key = text(&c["id"]).to_owned();
                                let passed = self.condition(&c["visibleIf"])?;
                                if passed { row.visible_choices.push(key.clone()); }
                                row.condition_results.insert(key, passed);
                            }
                            if row.visible_choices.is_empty() { self.goto(self.links[&(id, "fallback")]); }
                            else {
                                let Some(choice) = inputs.front() else {
                                    self.state = previous;
                                    return Ok(row.visible_choices);
                                };
                                if !row.visible_choices.contains(choice) {
                                    self.state = previous;
                                    return Err(format!("Unavailable choice: {choice}"));
                                }
                                let choice = inputs.pop_front().expect("queued choice");
                                self.effects(choices.iter().find(|c| c["id"] == choice).expect("visible choice"));
                                self.goto(self.links[&(id, choice.as_str())]);
                                row.choice_id = Some(choice);
                                automatic = 0;
                            }
                        }
                    }
                    "branch" => {
                        row.phase = "branch";
                        let pass = self.condition(&node["condition"])?;
                        row.condition_results.insert(id.to_owned(), pass);
                        self.goto(self.links[&(id, if pass { "true" } else { "false" })]);
                    }
                    "effect" => {
                        row.phase = "effect";
                        self.effects(node);
                        self.goto(self.links[&(id, "next")]);
                    }
                    "schedule" => {
                        self.state.day = node["startDay"].as_i64().unwrap_or(1) as i32;
                        self.state.stage = Stage::Before;
                        continue;
                    }
                    "end" => {
                        row.phase = "end";
                        match text(&node["mode"]) {
                            "return" => {
                                let Some((target, stage)) = self.state.resume.take() else { return Err("Return without an active subgraph call".into()); };
                                self.goto(&target);
                                self.state.stage = stage;
                                row.transition = "return".into();
                            }
                            "jump" => self.goto(text(&self.graphs[text(&node["targetGraphId"])]["entryNodeId"])),
                            _ => {
                                row.ending = Some(id.to_owned());
                                row.transition = format!("ending:{id}");
                                self.state.stage = Stage::Finished;
                            }
                        }
                    }
                    _ => return Err("Unknown node kind".into()),
                },
                Stage::Before | Stage::After | Stage::EndDay => {
                    let (phase, next) = match previous.stage {
                        Stage::Before => ("before_activity", Stage::Activity),
                        Stage::After => ("after_activity", Stage::EndDay),
                        _ => ("end_of_day", Stage::Complete),
                    };
                    row.phase = phase;
                    self.state.stage = next;
                    let mut events: Vec<_> = rows(&node["eventIds"]).iter().map(|e| self.events[text(e)])
                        .filter(|e| e["phase"] == phase).collect();
                    events.sort_by_key(|e| (std::cmp::Reverse(e["priority"].as_i64()), e["order"].as_i64()));
                    for e in events {
                        let key = text(&e["id"]);
                        let once = e["once"] == true;
                        if once && self.state.fired.contains(key) { continue; }
                        let pass = self.condition(&e["condition"])?;
                        row.condition_results.insert(key.to_owned(), pass);
                        if pass {
                            if once { self.state.fired.insert(key.to_owned()); }
                            row.event_id = Some(key.to_owned());
                            self.call(text(&e["subgraphId"]), next);
                            break;
                        }
                    }
                }
                Stage::Activity => {
                    row.phase = "activity";
                    for a in rows(&node["activityIds"]) {
                        let key = text(a);
                        let pass = self.condition(&self.activities[key]["condition"])?;
                        row.condition_results.insert(key.to_owned(), pass);
                        if pass { row.visible_choices.push(key.to_owned()); }
                    }
                    let Some(choice) = inputs.front() else { return Ok(row.visible_choices); };
                    if !row.visible_choices.contains(choice) { return Err(format!("Unavailable activity: {choice}")); }
                    let choice = inputs.pop_front().expect("queued activity");
                    let activity = self.activities[choice.as_str()];
                    self.effects(activity);
                    self.state.stage = Stage::After;
                    if let Some(graph) = activity["subgraphId"].as_str() { self.call(graph, Stage::After); }
                    row.choice_id = Some(choice);
                    automatic = 0;
                }
                Stage::Complete => {
                    row.phase = "schedule_complete";
                    if i64::from(self.state.day) < node["lastDay"].as_i64().expect("validated last day") {
                        self.state.day = self.state.day.checked_add(1).ok_or("Day overflow")?;
                        self.state.stage = Stage::Before;
                        continue;
                    }
                    self.goto(self.links[&(id, "onComplete")]);
                }
                Stage::Finished => unreachable!(),
            }
            self.history.push((previous, self.trace.len()));
            row.vars_after = self.state.vars.clone();
            if row.transition.is_empty() { row.transition = self.state.node.clone(); }
            self.trace.push(row);
        }
        Ok(Vec::new())
    }
}

fn collect_operands(expression: &Value, state: &State, operands: &mut Vec<Value>) {
    for key in ["left", "right"] {
        let op = &expression[key];
        match text(&op["kind"]) {
            "variable" => operands.push(state.vars[text(&op["variableId"])].clone()),
            "day" => operands.push(Value::from(state.day)),
            "literal" => operands.push(op["value"].clone()),
            _ => {}
        }
    }
    for child in rows(&expression["conditions"]) { collect_operands(child, state, operands); }
    if !expression["condition"].is_null() { collect_operands(&expression["condition"], state, operands); }
}
