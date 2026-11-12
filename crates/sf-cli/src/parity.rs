use crate::{sdk_run, write_new_game};
use serde_json::{json, Value};
use sf_core::{project::{export_name, Project}, sim::Simulator};
use std::{collections::HashMap, fs, path::Path};

fn name(node: &Value) -> String {
    export_name(node["kind"].as_str().unwrap(), node["id"].as_str().unwrap().parse().unwrap()).unwrap()
}

fn matching(actual: &Value, expected: &Value) -> bool {
    match expected.as_object() {
        Some(fields) => fields.iter().all(|(key, value)| actual.get(key).is_some_and(|actual| matching(actual, value))),
        None => actual == expected,
    }
}

pub fn run(project: &Project, cases: &Path, sdk: &Path, dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    fs::create_dir(dir)?;
    let cases: Value = serde_json::from_str(&fs::read_to_string(cases)?)?;
    let mut report = Vec::new();
    for case in cases["cases"].as_array().ok_or("Missing cases")? {
        let case_id = case["id"].as_str().ok_or("Missing case ID")?;
        if !case_id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-') {
            return Err("Invalid case ID".into());
        }
        let path = dir.join(case_id);
        let mut value = project.value().clone();
        let patch: json_patch::Patch = serde_json::from_value(case["projectPatch"].clone())?;
        json_patch::patch(&mut value, &patch)?;
        let project = Project::from_value(value)?;
        let mut sim = Simulator::new(&project, case["startNodeId"].as_str(),
            serde_json::from_value(case["initialVarsOverride"].clone())?)?;
        let mut inputs = serde_json::from_value(case["inputs"].clone())?;
        sim.advance(&mut inputs)?;
        if !sim.is_finished() || !inputs.is_empty() { return Err(format!("{case_id}: incomplete Core run").into()); }
        let core = serde_json::to_value(sim.trace())?;
        write_new_game(&project, &path)?;
        fs::write(path.join("core-trace.json"), serde_json::to_string_pretty(&core)?)?;
        instrument(&project, &path)?;
        let node = project.value()["nodes"].as_array().unwrap().iter()
            .find(|n| n["id"] == case["startNodeId"]).ok_or("Start node missing")?;
        fs::write(path.join("game/script.rpy"), format!(
            "label start:\n    $ sf_test_setup()\n    $ menu = sf_test_menu\n    $ narrator = Character(None, interact=False)\n    call {}\n    $ sf_test_finish()\n    return\n", name(node)))?;
        fs::write(path.join("parity-input.json"), serde_json::to_string(&json!({"project":project.value(),"case":case}))?)?;
        fs::write(path.join("game/sf_parity.rpy"), include_str!("parity.rpy"))?;
        sdk_run(sdk, &path, false)?;
        let actual: Value = serde_json::from_str(&fs::read_to_string(path.join("sdk-trace.json"))?)?;
        if core != actual {
            let expected = core.as_array().unwrap();
            let actual = actual.as_array().ok_or("SDK trace must be an array")?;
            let step = (0..expected.len().max(actual.len()))
                .find(|&i| expected.get(i) != actual.get(i)).unwrap();
            let diff = json!({"case":case_id,"step":step+1,"core":expected.get(step),"sdk":actual.get(step)});
            fs::write(path.join("diff.json"), serde_json::to_string_pretty(&diff)?)?;
            return Err(format!("{case_id}: Trace mismatch at step {}, see {}", step+1, path.display()).into());
        }
        for assertion in case["assertions"].as_array().ok_or("Missing assertions")? {
            let mut fields = assertion.clone();
            let count = fields.as_object_mut().ok_or("Invalid assertion")?.remove("count");
            let found = actual.as_array().unwrap().iter().filter(|row| matching(row, &fields)).count();
            if !count.and_then(|v| v.as_u64()).map_or(found > 0, |count| found as u64 == count) {
                return Err(format!("{case_id}: expected assertion missing: {assertion}").into());
            }
        }
        println!("{case_id}: PASS ({} steps)", core.as_array().unwrap().len());
        report.push(json!({"case":case_id,"steps":core.as_array().unwrap().len(),"passed":true}));
    }
    fs::write(dir.join("report.json"), serde_json::to_string_pretty(&report)?)?;
    Ok(())
}

fn instrument(project: &Project, dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let nodes: HashMap<_, _> = project.value()["nodes"].as_array().unwrap().iter()
        .map(|node| (name(node), node)).collect();
    for file in ["sf_story.rpy", "sf_schedule.rpy"] {
        let path = dir.join("game/storyflow_generated").join(file);
        let source = fs::read_to_string(&path)?;
        let mut output = String::new();
        let mut current: Option<&Value> = None;
        for line in source.lines() {
            output.push_str(line);
            output.push('\n');
            if let Some(label) = line.strip_prefix("label ").and_then(|s| s.strip_suffix(':')) {
                current = nodes.get(label).copied();
                if let Some(node) = current.filter(|node| node["kind"] != "schedule") {
                    output.push_str(&format!("    $ sf_test_begin({}, {})\n", node["id"], node["kind"]));
                }
            }
            if let Some(node) = current {
                if let Some(phase) = line.trim().strip_prefix("# phase ") {
                    let indentation = &line[..line.len()-line.trim_start().len()];
                    output.push_str(&format!("{indentation}$ sf_test_begin({}, \"{phase}\")\n", node["id"]));
                }
                // Capture visibility after scene effects but before the fallback test or menu.
                if line.starts_with("    if not (") && node["kind"] == "scene" {
                    let start = output.len() - line.len() - 1;
                    output.insert_str(start, &format!("    $ sf_test_choices({})\n", node["id"]));
                }
            }
        }
        fs::write(path, output)?;
    }
    Ok(())
}
