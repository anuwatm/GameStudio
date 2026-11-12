use serde::Deserialize;
use std::cmp::Ordering;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(untagged)]
pub enum Value {
    Int(i32),
    Bool(bool),
    String(String),
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase", rename_all_fields = "camelCase")]
pub enum Operand {
    Variable { variable_id: Uuid },
    Literal { value: Value },
    Day,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Operator {
    Eq,
    Ne,
    Lt,
    Le,
    Gt,
    Ge,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum Condition {
    All { conditions: Vec<Condition> },
    Any { conditions: Vec<Condition> },
    Not { condition: Box<Condition> },
    Compare { left: Operand, operator: Operator, right: Operand },
}

impl Operand {
    fn resolve(&self, vars: &HashMap<Uuid, Value>, day: i32) -> Result<Value, String> {
        match self {
            Self::Variable { variable_id } => vars.get(variable_id).cloned()
                .ok_or_else(|| format!("unknown variable: {variable_id}")),
            Self::Literal { value } => Ok(value.clone()),
            Self::Day => Ok(Value::Int(day)),
        }
    }
}

impl Condition {
    pub fn evaluate(&self, vars: &HashMap<Uuid, Value>, day: i32) -> Result<bool, String> {
        match self {
            Self::All { conditions } | Self::Any { conditions } => {
                let all = matches!(self, Self::All { .. });
                let mut result = all;
                for condition in conditions {
                    let next = condition.evaluate(vars, day)?;
                    result = if all { result && next } else { result || next };
                }
                Ok(result)
            }
            Self::Not { condition } => Ok(!condition.evaluate(vars, day)?),
            Self::Compare { left, operator, right } => {
                let left = left.resolve(vars, day)?;
                let right = right.resolve(vars, day)?;
                if std::mem::discriminant(&left) != std::mem::discriminant(&right) {
                    return Err("comparison operands must have the same type".into());
                }
                match operator {
                    Operator::Eq => Ok(left == right),
                    Operator::Ne => Ok(left != right),
                    _ => {
                        let (Value::Int(left), Value::Int(right)) = (left, right) else {
                            return Err("ordered comparison requires integers".into());
                        };
                        let ordering = left.cmp(&right);
                        Ok(match operator {
                            Operator::Lt => ordering == Ordering::Less,
                            Operator::Le => ordering != Ordering::Greater,
                            Operator::Gt => ordering == Ordering::Greater,
                            Operator::Ge => ordering != Ordering::Less,
                            _ => unreachable!(),
                        })
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn evaluates_fixture_condition_and_rejects_mixed_operands() {
        let project: serde_json::Value =
            serde_json::from_str(include_str!("../../../contract/fixtures/summer-house.json")).unwrap();
        let id: Uuid = serde_json::from_value(project["variables"][0]["id"].clone()).unwrap();
        let expr = &project["events"][0]["condition"];
        let condition: Condition = serde_json::from_value(expr.clone()).unwrap();
        let vars = HashMap::from([(id, Value::Int(20))]);
        assert!(!condition.evaluate(&vars, 2).unwrap());
        assert!(condition.evaluate(&vars, 3).unwrap());
        assert!(condition.evaluate(&HashMap::from([(id, Value::Bool(true))]), 3).is_err());
    }
}
