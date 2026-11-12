# Test-only instrumentation; never included in production exporter output.
init offset = 100
define config.name = "StoryFlow 0b.3 Media Proof"
define config.default_text_cps = 0

default sf_probe_rows = []
default sf_probe_movies = []
default sf_probe_samples = []

init 10 python:
    import json
    import os
    import time
    import unicodedata
    sf_probe_layouts = []
    with open(os.path.join(config.gamedir, "expected.json"), encoding="utf-8") as f:
        sf_expected = json.load(f)

    def sf_plain(screen, widget):
        d = renpy.get_displayable(screen, widget)
        layout = d.get_layout()
        assert layout is not None, "No rendered layout: " + widget
        assert layout.size[0] / layout.oversample <= 1200, "Text overflows: " + widget
        for line in layout.lines:
            glyphs = [g for g in line.glyphs if g.character not in (0x200b, 0x20)]
            if glyphs:
                assert unicodedata.category(chr(glyphs[0].character)) not in ("Mn", "Mc"), "Detached mark at line start"
                assert not 0x0e40 <= glyphs[-1].character <= 0x0e44, "Detached leading vowel at line end"
        sf_probe_layouts.append({"widget":widget,"width":layout.size[0]/layout.oversample,"lines":len(layout.lines)})
        paragraphs = ["".join(s for ts, s in p) for p in layout.paragraphs]
        return chr(10).join(paragraphs).replace(chr(0x200b), "")

    def sf_capture_text(stage):
        row = {"stage":stage}
        if stage == "say":
            row["who"] = sf_plain("say", "who")
            row["what"] = sf_plain("say", "what")
            row["stringInitial"] = sf_plain("say", "variable")
            assert row["who"] == sf_expected["special"], repr(row["who"])
            assert row["what"] == sf_expected["dialogue"], repr(row["what"])
            assert row["stringInitial"] == sf_expected["special"]
            assert sf_variable_0000000003ee == sf_expected["special"]
        elif stage == "choice":
            row["caption"] = sf_plain("choice", "caption")
            assert row["caption"] == sf_expected["special"], repr(row["caption"])
        else:
            row["stringAfterEffect"] = sf_plain("sf_string_result", "result")
            assert sf_variable_0000000003ee == sf_expected["after"]
            assert row["stringAfterEffect"] == sf_expected["after"]
        sf_probe_rows.append(row)
        renpy.screenshot(os.path.join(config.basedir, stage + ".png"))

    sf_original_movie = renpy.movie_cutscene
    sf_movie_active = False
    sf_movie_images = set()
    sf_probe_boot = time.monotonic()
    sf_probe_diagnostic = False
    def sf_movie_sample():
        global sf_probe_diagnostic
        with open(os.path.join(config.basedir, "live.json"), "w") as f:
            json.dump({"active":sf_movie_active,"pos":renpy.music.get_pos(channel="movie"),"script":renpy.get_filename_line(),"seconds":time.monotonic()-sf_probe_boot}, f)
        if time.monotonic()-sf_probe_boot > 12 and not sf_probe_diagnostic:
            renpy.screenshot(os.path.join(config.basedir, "diagnostic.png"))
            sf_probe_diagnostic = True
        if not sf_movie_active:
            return
        pos = renpy.music.get_pos(channel="movie")
        if pos is not None:
            sf_probe_samples.append({"pos":pos,"playing":renpy.music.get_playing(channel="movie")})
            slot = "movie-early" if pos >= 0.4 and pos < 1.4 else "movie-late" if pos >= 1.6 else None
            if slot and slot not in sf_movie_images:
                renpy.screenshot(os.path.join(config.basedir, slot + ".png"))
                sf_movie_images.add(slot)
    config.periodic_callbacks.append(sf_movie_sample)

    def sf_checked_movie(filename, *args, **kwargs):
        global sf_movie_active
        sf_movie_active = True
        start = time.monotonic()
        rv = sf_original_movie(filename, *args, **kwargs)
        sf_movie_active = False
        elapsed = time.monotonic() - start
        sf_probe_movies.append({"path":filename,"elapsed":elapsed,"interrupted":bool(rv)})
        assert not rv, "Movie interrupted"
        assert elapsed >= 2.7, "Movie ended too early"
        assert max(s["pos"] for s in sf_probe_samples) >= 2.5, "Movie channel did not reach end"
        return rv
    renpy.movie_cutscene = sf_checked_movie

screen say(who, what):
    add Solid("#131922")
    vbox:
        xpos 40
        ypos 36
        xsize 1200
        spacing 20
        text "NAME / DIALOGUE / STRING INITIAL" size 22 color "#B9C5D3"
        text who id "who" color "#58D4B4"
        text what id "what"
        text "[sf_variable_0000000003ee!q]" id "variable" color "#E8CF82"
    timer 0.8 action Function(sf_capture_text, "say")
    timer 1.8 action Return()

screen choice(items):
    add Solid("#131922")
    vbox:
        xpos 40
        ypos 100
        xsize 1200
        spacing 28
        text "CHOICE LITERAL" color "#58D4B4"
        for item in items:
            button:
                action item.action
                text item.caption id "caption"
    timer 0.8 action Function(sf_capture_text, "choice")
    timer 1.8 action items[0].action

screen sf_string_result():
    add Solid("#131922")
    vbox:
        xpos 40
        ypos 100
        xsize 1200
        spacing 24
        text "STRING AFTER EFFECT" color "#58D4B4"
        text "[sf_variable_0000000003ee!q]" id "result"
    timer 0.8 action Function(sf_capture_text, "string")
    timer 1.8 action Return()

label sf_probe_start:
    call sf_entry
    call screen sf_string_result
    python:
        assert len(sf_probe_rows) == 3
        assert len(sf_probe_movies) == 1
        assert renpy.audio.audio.pcm_ok, "Audio decoder not initialized"
        with open(os.path.join(config.basedir, "media-result.json"), "w", encoding="utf-8") as f:
            json.dump({"sdk":renpy.version(),"rows":sf_probe_rows,"layouts":sf_probe_layouts,"movies":sf_probe_movies,"samples":sf_probe_samples,"audio":{"pcm_ok":bool(renpy.audio.audio.pcm_ok),"driver":os.environ.get("SDL_AUDIODRIVER", "default")},"ending":sf_ending}, f, ensure_ascii=False, indent=2)
        renpy.quit()
    return

init 20 python:
    config.label_overrides["start"] = "sf_probe_start"
