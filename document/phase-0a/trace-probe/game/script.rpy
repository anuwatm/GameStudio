define config.menu_actions = False
define mina = Character("Mina", interact=False)
default affection = 0

init python:
    import json
    import os

    def probe_menu(items):
        global visible_choices
        visible_choices = [label for label, value in items if value is not None]
        return next(value for label, value in items if label == "Help Mina" and value is not None)

label start:
    $ menu = probe_menu
    $ before = affection
    mina "Would you like to help?"
    menu:
        "Help Mina":
            $ affection += 10
            $ choice = "help_mina"
        "Rest":
            $ choice = "rest"
        "Date Invite" if affection >= 20:
            $ choice = "date_invite"
    python:
        assert choice == "help_mina" and affection == 10
        assert visible_choices == ["Help Mina", "Rest"]
        row = dict(step=1, nodeId="trace_probe", day=1, phase="activity",
                   choiceId=choice, eventId=None, ending=None,
                   varsBefore={"affection": before}, varsAfter={"affection": affection},
                   visibleChoices=visible_choices,
                   conditionResults={"date_invite": before >= 20},
                   transition="finish", renpy=renpy.version())
        with open(os.path.join(config.basedir, "trace.jsonl"), "w", encoding="utf-8") as output:
            output.write(json.dumps(row) + "\n")
        renpy.quit()
    return
