use json_patch::{Patch, PatchOperation};
use serde_json::Value;
use std::collections::HashSet;
use std::sync::LazyLock;
use uuid::Uuid;

static SCHEMA: LazyLock<jsonschema::Validator> = LazyLock::new(|| {
    let schema = serde_json::from_str(include_str!("../../../contract/project.schema.json"))
        .expect("embedded project schema is JSON");
    jsonschema::options()
        .should_validate_formats(true)
        .build(&schema)
        .expect("embedded project schema is valid")
});

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Project(Value);

impl Project {
    pub fn from_json(input: &str) -> Result<Self, String> {
        Self::from_value(serde_json::from_str(input).map_err(|error| error.to_string())?)
    }

    pub fn from_value(value: Value) -> Result<Self, String> {
        if value.get("schemaVersion").and_then(Value::as_u64) != Some(1) {
            return Err("unsupported project schema version".into());
        }
        SCHEMA.validate(&value).map_err(|error| error.to_string())?;
        Ok(Self(value))
    }

    pub fn value(&self) -> &Value {
        &self.0
    }
}

pub fn export_name(kind: &str, id: Uuid) -> Option<String> {
    if kind.is_empty() || !kind.bytes().all(|b| b.is_ascii_lowercase() || b == b'_') {
        return None;
    }
    let id = id.simple().to_string();
    Some(format!("sf_{kind}_{}", &id[20..]))
}

pub fn check_export_names<'a>(entities: impl IntoIterator<Item = (&'a str, Uuid)>) -> Result<(), String> {
    let mut names = HashSet::new();
    for (kind, id) in entities {
        let name = export_name(kind, id).ok_or_else(|| format!("invalid export kind: {kind}"))?;
        if !names.insert(name.clone()) {
            return Err(format!("duplicate export name: {name}"));
        }
    }
    Ok(())
}

pub struct EditHistory {
    current: Project,
    undo: Vec<Project>,
    redo: Vec<Project>,
}

impl EditHistory {
    pub fn new(project: Project) -> Self {
        Self { current: project, undo: Vec::new(), redo: Vec::new() }
    }

    pub fn project(&self) -> &Project {
        &self.current
    }

    pub fn apply(&mut self, patch: &Patch) -> Result<(), String> {
        if patch.0.is_empty()
            || patch.0.iter().any(|operation| {
                !matches!(
                    operation,
                    PatchOperation::Add(_) | PatchOperation::Replace(_) | PatchOperation::Remove(_)
                )
            })
        {
            return Err("expected a nonempty add, replace, or remove patch".into());
        }
        let mut candidate = self.current.0.clone();
        json_patch::patch(&mut candidate, patch).map_err(|error| error.to_string())?;
        let project = Project::from_value(candidate)?;
        self.undo.push(std::mem::replace(&mut self.current, project));
        self.redo.clear();
        Ok(())
    }

    pub fn undo(&mut self) -> bool {
        let Some(previous) = self.undo.pop() else { return false };
        self.redo.push(std::mem::replace(&mut self.current, previous));
        true
    }

    pub fn redo(&mut self) -> bool {
        let Some(next) = self.redo.pop() else { return false };
        self.undo.push(std::mem::replace(&mut self.current, next));
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_invalid_ids_and_unsupported_versions() {
        let fixture = include_str!("../../../contract/fixtures/summer-house.json");
        let mut value: Value = serde_json::from_str(fixture).unwrap();
        value["nodes"][0]["id"] = Value::String("not-a-uuid".into());
        assert!(Project::from_value(value).is_err());
        let mut value: Value = serde_json::from_str(fixture).unwrap();
        value["schemaVersion"] = Value::from(2);
        assert_eq!(
            Project::from_value(value).unwrap_err(),
            "unsupported project schema version"
        );
    }

    #[test]
    fn schema_and_history_preserve_project_on_failed_edit() {
        let project = Project::from_json(include_str!("../../../contract/fixtures/summer-house.json")).unwrap();
        let mut history = EditHistory::new(project.clone());
        let patch = serde_json::from_str(r#"[{"op":"replace","path":"/name","value":"ใหม่"}]"#).unwrap();
        history.apply(&patch).unwrap();
        let edited = history.project().clone();
        assert!(history.undo());
        assert_eq!(history.project(), &project);
        let invalid = serde_json::from_str(r#"[{"op":"remove","path":"/name"}]"#).unwrap();
        assert!(history.apply(&invalid).is_err());
        assert_eq!(history.project(), &project);
        assert!(history.redo());
        assert_eq!(history.project(), &edited);
        assert!(history.undo());
        history.apply(&patch).unwrap();
        assert!(!history.redo());
    }

    #[test]
    fn detects_name_collisions_between_distinct_uuids() {
        let a = Uuid::parse_str("00000000-0000-4000-8000-000000000001").unwrap();
        let b = Uuid::parse_str("10000000-0000-4000-8000-000000000001").unwrap();
        assert!(check_export_names([("scene", a), ("scene", b)]).is_err());
        assert!(check_export_names([("scene", a), ("end", b)]).is_ok());
    }
}
