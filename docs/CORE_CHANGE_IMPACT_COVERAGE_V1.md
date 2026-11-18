# Electropanel — coverage of saved project dependencies

The core change-impact preview monitors declared project inputs and
summarizes which existing engineering evidence domains need new review:
`load`, `network`, `cable`, `device`, `topology`, and
`enclosure`.

Expanded inputs:
- incoming fault studies, declared supply network, calculation-point bindings;
- cable design and route inputs;
- device coordination and short-circuit scenarios;
- actual protection hierarchy, device-supply connections, terminal and
  neutral declarations, and alarm-controlled equipment links;
- cabinet sizing preferences and enclosure layout.

The changes trigger **review requirements only**. The software must not
invent a supply impedance, conductor length, pass/selectivity verdict, or
physical cabinet clearance. Evidence source and methodology remain attached
to existing entries, and only affected areas are marked stale.

The primary integration also retains the prior semantics for line names,
screen presentation and design stage metadata; those fields alone do not
invalidate completed electrical calculations.

The new regression tests are in
`tests/core-change-impact-coverage-v1.test.js` and cover both changes and
idempotence for the additional supported fields.
