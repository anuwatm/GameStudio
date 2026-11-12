define config.menu_actions = False

init python:
    import json
    import os

    def sf_test_vars():
        return {v["id"]: getattr(renpy.store, sf_test_names[v["id"]]) for v in sf_test_project["variables"]}

    def sf_test_operand(o):
        if o["kind"] == "day":
            return sf_day
        if o["kind"] == "variable":
            return getattr(renpy.store, sf_test_names[o["variableId"]])
        return o["value"]

    def sf_test_condition(c):
        if c is None:
            return True
        kind = c["kind"]
        if kind == "all":
            return all(sf_test_condition(x) for x in c["conditions"])
        if kind == "any":
            return any(sf_test_condition(x) for x in c["conditions"])
        if kind == "not":
            return not sf_test_condition(c["condition"])
        a, b = sf_test_operand(c["left"]), sf_test_operand(c["right"])
        op = c["operator"]
        if op == "eq": return a == b
        if op == "ne": return a != b
        if op == "lt": return a < b
        if op == "le": return a <= b
        if op == "gt": return a > b
        return a >= b

    def sf_test_flush(target):
        global sf_test_pending
        if sf_test_pending is None:
            return
        row = sf_test_pending
        row["varsAfter"] = sf_test_vars()
        row["transition"] = row["transition"] or target
        sf_test_rows.append(row)
        sf_test_pending = None

    def sf_test_begin(node_id, phase):
        global sf_test_pending, sf_test_visible
        sf_test_flush(node_id)
        node = sf_test_nodes[node_id]
        row = dict(step=len(sf_test_rows)+1, nodeId=node_id, day=sf_day, phase=phase,
                   choiceId=None, eventId=None, ending=None, varsBefore=sf_test_vars(),
                   varsAfter={}, visibleChoices=[], conditionResults={}, transition="")
        sf_test_pending = row
        sf_test_visible = []
        if phase == "branch":
            row["conditionResults"][node_id] = sf_test_condition(node["condition"])
        if phase in ("before_activity", "after_activity", "end_of_day"):
            events = [sf_test_events[e] for e in node["eventIds"] if sf_test_events[e]["phase"] == phase]
            for event in sorted(events, key=lambda e: (-e["priority"], e["order"])):
                key = event["id"]
                if event["once"] and key in sf_fired:
                    continue
                passed = sf_test_condition(event["condition"])
                row["conditionResults"][key] = passed
                if passed:
                    row["eventId"] = key
                    break
        if phase == "end":
            if node["mode"] == "return":
                row["transition"] = "return"
            elif node["mode"] == "ending":
                row["ending"] = node_id
                row["transition"] = "ending:" + node_id
        if phase == "activity":
            sf_test_choices(node_id, True)

    def sf_test_choices(node_id, activity=False):
        global sf_test_visible
        node = sf_test_nodes[node_id]
        choices = [sf_test_activities[a] for a in node["activityIds"]] if activity else node["choices"]
        sf_test_visible = []
        for choice in choices:
            key = choice["id"]
            passed = sf_test_condition(choice.get("condition") if activity else choice.get("visibleIf"))
            sf_test_pending["conditionResults"][key] = passed
            if passed:
                sf_test_visible.append((key, choice["name"] if activity else choice["text"]))
        sf_test_pending["visibleChoices"] = [key for key, label in sf_test_visible]

    def sf_test_menu(items):
        key = sf_test_inputs.pop(0)
        position = [k for k, label in sf_test_visible].index(key)
        available = [value for label, value in items if value is not None]
        assert len(available) == len(sf_test_visible)
        sf_test_pending["choiceId"] = key
        return available[position]

    def sf_test_setup():
        global sf_test_project, sf_test_nodes, sf_test_events, sf_test_activities
        global sf_test_names, sf_test_rows, sf_test_pending, sf_test_inputs, sf_test_visible
        with open(os.path.join(config.basedir, "parity-input.json"), encoding="utf-8") as source:
            data = json.load(source)
        sf_test_project = data["project"]
        sf_test_nodes = {n["id"]: n for n in sf_test_project["nodes"]}
        sf_test_events = {e["id"]: e for e in sf_test_project["events"]}
        sf_test_activities = {a["id"]: a for a in sf_test_project["activities"]}
        sf_test_names = {v["id"]: "sf_variable_" + v["id"].replace("-", "")[-12:].lower()
                         for v in sf_test_project["variables"]}
        sf_test_rows, sf_test_pending, sf_test_visible = [], None, []
        sf_test_inputs = list(data["case"]["inputs"])
        for key, value in data["case"]["initialVarsOverride"].items():
            setattr(renpy.store, sf_test_names[key], value)

    def sf_test_finish():
        sf_test_flush("")
        assert not sf_test_inputs, "Unconsumed inputs"
        with open(os.path.join(config.basedir, "sdk-trace.json"), "w", encoding="utf-8") as out:
            json.dump(sf_test_rows, out, ensure_ascii=False)
        renpy.quit()
