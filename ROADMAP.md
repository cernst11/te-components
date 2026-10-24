# Roadmap

Tracker for planned components and release work. Model names are proposals until shipped (then they move
to DESIGN.md §6a). Status: `[ ]` todo · `[~]` in progress · `[x]` done.

## Components — HA control gaps

- [x] **SW-5 セレクター — Selector.** Detented rotary switch or row of mode keys with LEDs. `input_select`,
      `select`, climate `hvac_mode`, fan `preset_mode`, media `source`.
- [x] **PD-16 パッド — Pads.** K.O. II 4×4 pad grid for scenes/scripts; active scene LED.
- [x] **KP-12 テンキー — Alarm keypad.** 3×4 keypad, arm modes, PIN on a mini screen, hold to disarm.
      `alarm_control_panel`.
- [x] **SL-2 スライド — Slide switch.** TP-7 side switch for locks, garage doors, gates; slide + hold-to-confirm.
- [x] **LD-8 インジケーター — LED strip.** Labelled LED row for doors, windows, motion, presence.

## Components — screens

- [x] **SG-7 セグメント — Seven-segment display.** Big digits for clock, timers, a hero value (promised in
      DESIGN.md §4).
- [x] **VU-10 メーター — Meter.** LED ladder / needle gauge for power, battery, CO2, volume; accent thresholds.
- [ ] **DS-64 modes.** `image` (dithered album art / camera), `weather`, `list` (todo, calendar); more
      animations: vacuum, kettle, 3D printer, energy flow.
- [ ] **TM-60 タイマー — Timer.** Kitchen-timer dial with countdown ring; `timer` entities.

## Design system

- [x] Speaker grille module (SP-1) and K.O. II bracket labels (`{ bracket, cards }` rows) (DESIGN.md §2, §5).
- [x] Optional haptics / click sounds (knob detents, key presses) — `feedback:` / `te-feedback`.

## Release

- [~] Visual editor previews verified in HA's card picker. `playground/check.html` replays HA's picker/editor
      contract (from the frontend source) for every card: no errors. Still to do: one pass in a real HA.
- [ ] Real-HA test pass: DS-64 history, phone layout.
- [x] LICENSE (GPL-3.0-or-later, CLA for outside contributions) + GitHub repo (cernst11/te-components).
- [ ] First GitHub release → HACS install.

## Done

- [x] CT-27 color temperature · DS-64 matrix (graphs, washer/dryer/dishwasher/fan/car) · PP-3 popup
