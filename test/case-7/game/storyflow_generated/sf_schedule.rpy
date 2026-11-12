label sf_schedule_000000000004:
    $ sf_day = 1
    while sf_day <= 3:
        # phase before_activity
        # phase activity
        menu:
            "Help Mina" if (sf_variable_000000000011 >= 20):
                $ sf_variable_000000000010 = sf_clamp(sf_variable_000000000010 + 10, 0, 100)
                $ sf_variable_000000000011 = sf_clamp(sf_variable_000000000011 - 20, 0, 100)
                pass
            "Rest" if True:
                $ sf_variable_000000000011 = sf_clamp(sf_variable_000000000011 + 20, 0, 100)
                pass
        # phase after_activity
        if ((sf_day >= 3) and (sf_variable_000000000010 >= 20)) and "00000000-0000-4000-8000-000000000014" not in sf_fired:
            $ sf_fired = sf_fired + ["00000000-0000-4000-8000-000000000014"]
            call sf_scene_000000000006
            if sf_ending is not None:
                return
        # phase end_of_day
        if sf_day == 3:
            # phase schedule_complete
            jump sf_end_000000000005
        $ sf_day += 1
    return


# revision two
