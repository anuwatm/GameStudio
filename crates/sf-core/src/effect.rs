#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IntEffect {
    Set(i32),
    Add(i32),
    Subtract(i32),
}

/// Applies one effect. Callers must apply effects in order to clamp each step.
/// Inverted bounds are invalid and produce no result.
pub fn apply_int_effect(current: i32, effect: IntEffect, min: i32, max: i32) -> Option<i32> {
    if min > max {
        return None;
    }

    let result = match effect {
        IntEffect::Set(value) => i64::from(value),
        IntEffect::Add(value) => i64::from(current) + i64::from(value),
        IntEffect::Subtract(value) => i64::from(current) - i64::from(value),
    };

    Some(result.clamp(i64::from(min), i64::from(max)) as i32)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamps_each_effect_at_i32_boundaries() {
        let apply = |value, effect| apply_int_effect(value, effect, i32::MIN, i32::MAX).unwrap();
        let low = apply(i32::MIN, IntEffect::Subtract(1));
        assert_eq!(apply(low, IntEffect::Add(1)), i32::MIN + 1);
        let high = apply(i32::MAX, IntEffect::Add(1));
        assert_eq!(apply(high, IntEffect::Subtract(1)), i32::MAX - 1);
    }

    #[test]
    fn respects_configured_bounds() {
        assert_eq!(apply_int_effect(100, IntEffect::Add(20), 0, 100), Some(100));
        assert_eq!(apply_int_effect(0, IntEffect::Set(-1), 0, 100), Some(0));
        assert_eq!(apply_int_effect(0, IntEffect::Set(0), 1, 0), None);
    }
}
