# How GTG classifies an exercise

Every exercise in the library is described against a set of controlled
vocabularies in [`src/data/taxonomy.js`](../src/data/taxonomy.js). Nothing is a
free-text string that only a human can interpret: if a field exists, it has a
fixed list of legal values, and `npm run validate` fails the build when
something drifts.

The point is not bookkeeping. It's that a routine becomes a *query* — "cover a
hinge, a squat, a press and a pull, with a kettlebell and a mat, at beginner
level, in 40 minutes, without stacking three grip-heavy lifts" — instead of a
list somebody typed out by hand.

---

## The five questions

The schema deliberately keeps five things apart. Most exercise databases
collapse them, and then can't answer anything interesting.

| # | Question | Fields |
|---|---|---|
| 1 | What shape is the movement? | `pattern`, `secondaryPatterns`, `planes`, `force`, `mechanics`, `chain`, `laterality`, `setup` |
| 2 | What does it train? | `muscles.primary` / `.secondary` / `.stabilizers`, `jointActions` |
| 3 | How is it loaded? | `equipment`, `equipmentAlt`, `loading`, `metric` |
| 4 | What does it cost? | `demands.*` (1–5) |
| 5 | How do you program it? | `level`, `goals`, `programming`, `progression` |

The classic example is the kettlebell swing. Calling it "cardio" throws away
everything useful. Here it is:

```js
pattern:   'hinge',        // same joint action as a deadlift
loading:   'ballistic',    // but expressed explosively, not as a grind
force:     'pull',
goals:     ['power', 'conditioning', 'endurance'],
demands:   { grip: 3, core: 4, cardio: 5, technical: 3, spinalLoad: 3, fatigue: 4 },
```

Three orthogonal facts. A strength day can pull it in as a hinge; a
conditioning day can pull it in for `cardio: 5`; a builder trying to keep a
session under a fatigue budget can see it costs 4.

---

## 1. Movement shape

### `pattern` — the kinematic skeleton of the rep

One of: `horizontal-press`, `vertical-press`, `horizontal-pull`,
`vertical-pull`, `squat`, `hinge`, `lunge`, `carry`, `rotation`,
`anti-extension`, `anti-rotation`, `anti-lateral-flexion`, `trunk-flexion`,
`hip-flexion`, `elbow-flexion`, `elbow-extension`, `get-up`, `mobility`.

Each pattern names the one that balances it (`opposes`), which is how
`analyseRoutine()` reports "this week has no counterpart for hinge". Ballistic
lifts are *not* their own pattern: a swing, clean and snatch are all `hinge`,
separated from a deadlift by `loading`.

### The rest of the shape

- **`planes`** — `sagittal` / `frontal` / `transverse`. A program that only
  ever moves in the sagittal plane is a program with a hole in it; the windmill
  and halo exist to fill it.
- **`force`** — `push` / `pull` / `static` / `mixed`. Independent of pattern:
  a hinge can be a pull (swing) and a squat is a push. Drives the push/pull
  balance report.
- **`mechanics`** — `compound` / `isolation`.
- **`chain`** — `open` (the limb moves: curl, press) / `closed` (the limb is
  fixed and the body moves: push-up, pull-up, squat).
- **`laterality`** — `bilateral` / `unilateral` / `alternating` / `offset`.
  `offset` is the suitcase carry: loaded on one side, both sides working.
- **`setup`** — the station and body position (`standing`, `bench-supine`,
  `floor-prone`, `hanging`, …). It also tells the 3D stage which environment to
  draw.

## 2. What it trains

Muscles are ids from a fixed anatomical list, not display strings, and they
carry three levels of involvement:

```js
muscles: {
  primary:     ['glutes', 'hamstrings'],                    // prime movers
  secondary:   ['lower-back', 'abs', 'quads', 'front-delts'],// assisting
  stabilizers: ['deep-core', 'forearms', 'lats'],            // isometric work
}
```

The Exercise Library groups by the **primary** list only — otherwise every
exercise would show up under every muscle. Weekly-volume questions can use all
three.

`jointActions` is the mechanical ground truth beneath the muscle list:

```js
jointActions: [
  { joint: 'hip',   action: 'extension' },
  { joint: 'knee',  action: 'extension' },
  { joint: 'spine', action: 'isometric' },
]
```

Two exercises with the same joint actions are substitutable even when the
equipment differs — that's what makes "swap this for something I can do at
home" a lookup rather than a guess.

## 3. How it's loaded

- **`equipment`** — everything you *must* have. `equipmentAlt` is what you can
  get away with instead. `exercisesWithKit(['kettlebell', 'mat'])` is a one-line
  filter for a home gym.
- **`loading`** — `grind` (slow, continuous tension), `ballistic` (accelerate
  then float), `isometric` (hold), `carry` (isometric under locomotion),
  `flow` (mobility work).
- **`metric`** — how a set is measured, so the logger renders the right columns:

  ```js
  metric: { type: 'distance', load: 'external', perSide: true }
  ```

  `type` is `reps` / `time` / `distance`; `load` is `external` /
  `bodyweight` / `weighted-bodyweight` / `assisted`; `perSide` doubles the
  time estimate and labels the logger.

## 4. What it costs

Seven scores, all 1–5, all meaning the same thing: **1 = negligible, 3 =
noticeable, 5 = this is the limiting factor.**

| Demand | 5 means |
|---|---|
| `grip` | your hands fail before the target muscle does (snatch, suitcase carry) |
| `core` | the trunk is the weak link (renegade row, windmill) |
| `cardio` | a working set spikes your heart rate (swing, thruster) |
| `balance` | stability limits the load (windmill, get-up) |
| `technical` | sloppy execution is punished immediately (snatch, get-up) |
| `spinalLoad` | meaningful compression or shear on the lower back |
| `fatigue` | one set eats a large share of the day's total budget |

These exist so the routine builder can *avoid* stacking cost. Once a session
has spent enough on one demand, `scoreCandidate()` starts penalising exercises
that pile more onto it.

## 5. How to program it

```js
level: 'intermediate',
goals: ['power', 'conditioning'],
programming: {
  sets: 5, reps: 15, weight: 35, restSec: 60,
  repRange: [10, 25], tempo: 'explosive', rpe: 7, frequencyPerWeek: [2, 4],
},
progression: {
  regressions:  ['kb-deadlift'],       // do this first if the lift is too much
  progressions: ['kb-snatch'],         // where it leads
  variations:   ['kb-clean'],          // same job, different flavour
  pairsWith:    ['kb-goblet-squat'],   // good superset partner
},
```

`progression` links are validated: every id must resolve to a real exercise, so
the "Related" section on the Today page can never dead-end.

## Coaching content

`cues` (what to do), `mistakes` (what goes wrong), `breathing`, and
`contraindications` (when to skip or modify). These are the only free-text
fields in the schema, and they're required to be non-empty for `cues`.

---

## Adding an exercise

Append to `src/data/exercises/kettlebell.js` (or `gym.js`, or a new module
wired into `exercises/index.js`) and run `npm run validate`. The rest of the
app — library grouping, filters, the detail card, routine analysis — picks it
up with no further changes.

```js
defineExercise({
  id: 'kb-around-the-world',
  name: 'Around the World',
  category: 'core',
  pattern: 'rotation',
  planes: ['transverse', 'frontal'],
  force: 'mixed', mechanics: 'compound', chain: 'closed',
  laterality: 'alternating', loading: 'flow', setup: 'standing',
  equipment: ['kettlebell'], level: 'beginner',
  muscles: { primary: ['obliques'], secondary: ['forearms'], stabilizers: ['deep-core'] },
  jointActions: [{ joint: 'spine', action: 'isometric' }],
  demands: { grip: 3, core: 3, cardio: 2, balance: 2, technical: 2, spinalLoad: 1, fatigue: 2 },
  metric: { type: 'reps', load: 'external' },
  goals: ['mobility', 'endurance'],
  programming: { sets: 2, reps: 10, weight: 18, restSec: 45 },
  cues: ['Pass the bell hand to hand around your hips without moving your ribs.'],
  tempo: 2.6,
  rig: (t) => pose({ rootRotY: sway(t) * 0.2, /* … */ }),
  camera: { view: 'front' },
})
```

### Animations

`rig(t)` takes a phase in `[0, 1]` that loops and returns a pose. The
conventions — and the helpers that make poses come out anatomically correct —
live in [`src/data/rig-kit.js`](../src/data/rig-kit.js):

- `plantedLegs(thighFwd, shinFwd)` — squat/hinge legs with the feet pinned to
  the floor. It returns the hip and knee angles *and* the `rootY` / `rootZ`
  offsets that keep the feet planted while the hips travel back and down.
- `armPitch(worldAngle, spine)` — arms hang under gravity, not off the chest.
  Cancels the torso lean so a hinged-over figure's arms still point down.
- `keyframeRig([...])` — multi-position lifts (clean, snatch, thruster) as
  keyframes. Numbers interpolate; equipment hints step.
- `ballistic(t, up)` — fast concentric, slow eccentric.
- `genericRig(pattern)` — the fallback animation for an imported exercise that
  arrived without one.

`poster` (0–1, default 0.5) marks the frame worth photographing; the screenshot
script freezes the animation there via `?phase=`.

---

## Importing exercises from elsewhere

`importExercises(payload)` in [`src/data/routines.js`](../src/data/routines.js)
validates and normalises third-party definitions. JSON can't carry a function,
so anything without a `rig` gets `genericRig(pattern)` — the classification is
enough to show an animation that at least matches the movement. Bad rows are
returned in `rejected` with their validation errors rather than thrown, so one
malformed entry can't take the library down.

`exportExercises()` goes the other way, dropping functions and leaving a
`rigRef` behind.

## Building a routine from the classification

```js
buildRoutine({
  equipment: ['kettlebell', 'mat'],
  level: 'beginner',
  goal: 'strength',
  minutes: 40,
})
```

It walks the pattern template for the goal, picks the best-scoring exercise for
each pattern that fits the kit and level, tracks a time budget and a running
demand total, and returns the session plus warnings for anything it couldn't
cover. `analyseRoutine(ids)` reports the same picture for a hand-written day:
patterns hit, push/pull balance, muscle groups, demand totals, estimated
minutes, and which patterns have no counterpart.
