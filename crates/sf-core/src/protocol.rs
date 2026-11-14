use crate::{project::{EditHistory, Project}, sim::Simulator, validate::validate};
use serde_json::{json, Value};
use std::{collections::VecDeque, sync::LazyLock};

static MESSAGES: LazyLock<jsonschema::Validator> = LazyLock::new(|| {
    let worker: Value = serde_json::from_str(include_str!("../../../contract/worker.schema.json")).unwrap();
    let mut options = jsonschema::options().should_validate_formats(true);
    for source in [
        include_str!("../../../contract/project.schema.json"),
        include_str!("../../../contract/step-trace.schema.json"),
    ] {
        let schema: Value = serde_json::from_str(source).unwrap();
        let uri = schema["$id"].as_str().unwrap().to_owned();
        options = options.with_resource(uri, jsonschema::Resource::from_contents(schema).unwrap());
    }
    options.build(&worker).expect("valid Worker contract")
});

#[derive(Default)]
pub struct Session {
    history: Option<EditHistory>,
    run: Option<(Project, Value, Vec<Value>)>,
}

impl Session {
    pub fn dispatch(&mut self, message: Value) -> Value {
        let id = message.get("requestId").and_then(Value::as_str).unwrap_or_default();
        let name = message.get("name").and_then(Value::as_str).unwrap_or_default();
        match self.execute(&message) {
            Ok(value) => json!({"contractVersion":1,"requestId":id,"kind":"result","name":name,"value":value}),
            Err(message) => json!({"contractVersion":1,"requestId":id,"kind":"error","error":{"code":"CORE_ERROR","message":message}}),
        }
    }

    fn execute(&mut self, message: &Value) -> Result<Value, String> {
        MESSAGES.validate(message).map_err(|e| e.to_string())?;
        let name = message["name"].as_str().ok_or("Request name required")?;
        let kind = message["kind"].as_str().ok_or("Request kind required")?;
        if !matches!(kind, "command" | "query") { return Err("Expected a request".into()); }
        let payload = &message["payload"];
        if name == "openProject" {
            let project = Project::from_value(payload["project"].clone())?;
            let result = json!({"project":project.value()});
            self.history = Some(EditHistory::new(project));
            self.run = None;
            return Ok(result);
        }
        let history = self.history.as_mut().ok_or("No open project")?;
        match name {
            "buildExport" => crate::export::export_bundle(history.project()),
            "getProject" => Ok(json!({"project":history.project().value()})),
            "applyEdit" | "undo" | "redo" => {
                match name {
                    "applyEdit" => history.apply(&serde_json::from_value(payload["patch"].clone()).map_err(|e| e.to_string())?)?,
                    "undo" => { if !history.undo() { return Err("Nothing to undo".into()); } },
                    _ => { if !history.redo() { return Err("Nothing to redo".into()); } },
                }
                Ok(json!({"project":history.project().value()}))
            }
            "validate" => Ok(json!({"issues":validate(history.project())})),
            "startPlaytest" => {
                let project = history.project().clone();
                let value = play(&project, payload, &[])?;
                self.run = Some((project, payload.clone(), Vec::new()));
                Ok(value)
            }
            "choose" | "setVar" | "rewind" | "getTrace" => {
                let (project, start, actions) = self.run.as_mut().ok_or("No active playtest")?;
                if name == "getTrace" {
                    let state = play(project, start, actions)?;
                    return Ok(json!({"trace":state["trace"]}));
                }
                let mut candidate = actions.clone();
                candidate.push(message.clone());
                let state = play(project, start, &candidate)?;
                *actions = candidate;
                Ok(state)
            }
            _ => Err(format!("Unsupported request: {name}")),
        }
    }
}

// Replay keeps the playtest snapshot independent of later editor changes.
fn play(project: &Project, start: &Value, actions: &[Value]) -> Result<Value, String> {
    let overrides = start.get("initialVarsOverride").cloned().unwrap_or_else(|| json!({}));
    let mut sim = Simulator::new(project, start["startNodeId"].as_str(),
        serde_json::from_value(overrides).map_err(|e| e.to_string())?)?;
    let mut visible = sim.advance(&mut VecDeque::new())?;
    for action in actions {
        match action["name"].as_str().unwrap_or_default() {
            "choose" => {
                let mut input = VecDeque::from([action["payload"]["choiceId"].as_str().ok_or("Invalid choice ID")?.to_owned()]);
                visible = sim.advance(&mut input)?;
                if !input.is_empty() { return Err("Input after ending".into()); }
            }
            "setVar" => {
                sim.set_var(action["payload"]["variableId"].as_str().ok_or("Invalid variable ID")?, action["payload"]["value"].clone())?;
                visible = sim.advance(&mut VecDeque::new())?;
            }
            "rewind" => {
                let steps = action["payload"]["steps"].as_u64().ok_or("Invalid rewind steps")?;
                if !sim.rewind(steps as usize) { return Err("Insufficient rewind history".into()); }
                // Resume only until the next input boundary.
                visible = sim.advance(&mut VecDeque::new())?;
            }
            _ => return Err("Invalid playtest action".into()),
        }
    }
    Ok(json!({"runState":sim.run_state(),"visibleChoices":visible,"trace":sim.trace(),"conditions":sim.explanations()}))
}
