use serde_json::Value;
use sf_core::{project::Project, sim::Simulator, validate::validate};
use std::collections::VecDeque;

fn fixture() -> Value {
    serde_json::from_str(include_str!("../../../contract/fixtures/summer-house.json")).unwrap()
}

fn patched(mut project: Value, patch: &Value) -> Project {
    let patch: json_patch::Patch = serde_json::from_value(patch.clone()).unwrap();
    json_patch::patch(&mut project, &patch).unwrap();
    Project::from_value(project).unwrap()
}

#[test]
fn validator_fixture_pairs() {
    let cases: Value = serde_json::from_str(include_str!("../../../contract/fixtures/validator-cases.json")).unwrap();
    for rule in cases["rules"].as_array().unwrap() {
        let code = rule["code"].as_str().unwrap();
        let valid = validate(&patched(fixture(), &rule["valid"]["patch"]));
        assert!(valid.is_empty(), "{code} valid: {valid:?}");
        let invalid = validate(&patched(fixture(), &rule["invalid"]["patch"]));
        assert!(invalid.iter().any(|i| i.code == code && i.severity == rule["invalid"]["expect"]["severity"]), "{code}: {invalid:?}");
    }
}

fn matches(actual: &Value, expected: &Value) -> bool {
    match expected.as_object() {
        Some(fields) => fields.iter().all(|(key, value)| actual.get(key).is_some_and(|a| matches(a, value))),
        None => actual == expected,
    }
}

#[test]
fn summer_house_cases() {
    let cases: Value = serde_json::from_str(include_str!("../../../contract/fixtures/summer-house-cases.json")).unwrap();
    for case in cases["cases"].as_array().unwrap() {
        let id = &case["id"];
        let project = patched(fixture(), &case["projectPatch"]);
        let mut sim = Simulator::new(&project, case["startNodeId"].as_str(), serde_json::from_value(case["initialVarsOverride"].clone()).unwrap()).unwrap();
        let mut inputs = serde_json::from_value(case["inputs"].clone()).unwrap();
        let waiting = sim.advance(&mut inputs).unwrap_or_else(|e| panic!("{id}: {e}"));
        assert!(waiting.is_empty() && sim.is_finished() && inputs.is_empty(), "{id}: incomplete run");
        let trace: Vec<_> = sim.trace().iter().map(|row| serde_json::to_value(row).unwrap()).collect();
        for assertion in case["assertions"].as_array().unwrap() {
            let mut fields = assertion.clone();
            let count = fields.as_object_mut().unwrap().remove("count");
            let found = trace.iter().filter(|row| matches(row, &fields)).count();
            assert!(count.as_ref().and_then(Value::as_u64).map_or(found > 0, |n| found as u64 == n), "{id}: {assertion}");
        }
    }
}

#[test]
fn playtest_wait_set_var_and_rewind() {
    let project = Project::from_value(fixture()).unwrap();
    let mut sim = Simulator::new(&project, None, Default::default()).unwrap();
    let mut inputs = VecDeque::new();
    let waiting = sim.advance(&mut inputs).unwrap();
    assert_eq!(waiting.len(), 2);
    let id = project.value()["variables"][1]["id"].as_str().unwrap();
    sim.set_var(id, Value::from(19)).unwrap();
    assert_eq!(sim.advance(&mut inputs).unwrap().len(), 1);
    assert!(sim.rewind(1));
    assert_eq!(sim.vars()[id], 100);
    assert_eq!(sim.advance(&mut inputs).unwrap(), waiting);
}

#[test]
fn automatic_loop_hits_guard() {
    let mut data = fixture();
    data["edges"][0]["to"] = data["nodes"][0]["id"].clone();
    let project = Project::from_value(data).unwrap();
    let mut sim = Simulator::new(&project, None, Default::default()).unwrap();
    let err = sim.advance(&mut VecDeque::new()).unwrap_err();
    assert!(err.starts_with("Loop guard at node "));
    assert_eq!(sim.trace().len(), 1000);
}

#[test]
fn rejects_nonterminating_subgraph_path() {
    let mut data = fixture();
    let invite = data["nodes"][3]["id"].clone();
    data["edges"][2]["to"] = invite.clone();
    let project = Project::from_value(data).unwrap();
    assert!(validate(&project).iter().any(|i| {
        i.code == "V019" && i.node_id.as_deref() == invite.as_str()
    }));
}
