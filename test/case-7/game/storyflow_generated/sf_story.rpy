label sf_entry:
    call sf_scene_000000000003
    return

label sf_scene_000000000003:
    "Summer House"
    jump sf_branch_000000000201

label sf_end_000000000005:
    $ sf_ending = "00000000-0000-4000-8000-000000000005"
    return

label sf_scene_000000000006:
    "Summer House"
    if not ((sf_variable_000000000010 >= 20) or (sf_variable_000000000010 >= 20)):
        jump sf_end_000000000008
    menu:
        "Accept" if (sf_variable_000000000010 >= 20):
            jump sf_end_000000000009
        "Decline" if (sf_variable_000000000010 >= 20):
            jump sf_end_000000000008

label sf_end_000000000009:
    $ sf_ending = "00000000-0000-4000-8000-000000000009"
    return

label sf_end_000000000008:
    return

label sf_branch_000000000201:
    if (sf_variable_000000000010 >= 0):
        jump sf_effect_000000000202
    else:
        jump sf_effect_000000000203

label sf_effect_000000000202:
    $ sf_variable_000000000204 = sf_clamp(sf_variable_000000000204 - 1, -2147483648, 2147483647)
    $ sf_variable_000000000204 = sf_clamp(sf_variable_000000000204 + 1, -2147483648, 2147483647)
    jump sf_schedule_000000000004

label sf_effect_000000000203:
    $ sf_variable_000000000204 = sf_clamp(sf_variable_000000000204 + 1, -2147483648, 2147483647)
    $ sf_variable_000000000204 = sf_clamp(sf_variable_000000000204 - 1, -2147483648, 2147483647)
    jump sf_schedule_000000000004


# revision two
