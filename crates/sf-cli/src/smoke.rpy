define config.menu_actions = False

init python:
    import json
    import os

    def sf_test_menu(items):
        expected = sf_test_inputs.pop(0)
        matches = [value for label, value in items if label == expected and value is not None]
        assert len(matches) == 1, "Expected exactly one visible choice: " + expected
        return matches[0]

    def sf_test_finish(expected):
        assert not sf_test_inputs, "Unconsumed choices"
        assert sf_ending == expected, "Unexpected ending"
        with open(os.path.join(config.basedir, "smoke-result.json"), "w", encoding="utf-8") as output:
            json.dump({"ending": sf_ending, "day": sf_day, "sdk": renpy.version()}, output)
        renpy.quit()
