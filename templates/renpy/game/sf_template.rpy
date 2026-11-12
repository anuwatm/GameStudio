# StoryFlow new-game template · Ren'Py 8.3.7
# Copied only into a NEW game by sf-cli; never replace an existing game's UI.
init offset = -100
define config.screen_width = 1280
define config.screen_height = 720

init -1 python:
    import re
    from sf_tcc import segment as sf_thai_clusters
    sf_game_font = FontGroup().add("DejaVuSans.ttf", 0x0000, 0x0dff).add("assets/fonts/NotoSansThaiLoopedUI-Regular.ttf", 0x0e00, 0x0e7f).add("DejaVuSans.ttf", 0x0e80, 0x10ffff)
    def sf_thai_wrap(text):
        # Presentation-only soft breaks; stored strings stay literal.
        return re.sub(r"[\u0e00-\u0e7f]+", lambda m: chr(0x200b).join(sf_thai_clusters(m.group(0))), text)
    config.replace_text = sf_thai_wrap

style default:
    font sf_game_font
    size 28
    language "unicode"
    shaper "harfbuzz"

screen main_menu():
    tag menu
    add Solid("#131922")
    vbox:
        align (0.5, 0.5)
        spacing 24
        text "StoryFlow"
        textbutton "Start" action Start()
        textbutton "Quit" action Quit(confirm=False)

screen say(who, what):
    frame:
        xfill True
        yalign 1.0
        padding (32, 24)
        background Solid("#131922")
        vbox:
            spacing 12
            if who:
                text who id "who" color "#58D4B4"
            text what id "what"

screen choice(items):
    vbox:
        align (0.5, 0.5)
        spacing 16
        for item in items:
            textbutton item.caption action item.action
