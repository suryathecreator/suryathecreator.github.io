---
title: Dyn-adapted collision viewer
emoji: 🎬
colorFrom: blue
colorTo: purple
sdk: static
app_file: index.html
fullWidth: true
---

# Dyn-adapted ground-truth collision viewer

24 freshly rendered MOVi-E/GSO scenes with four or five objects: 12 sampled
uniformly without replacement from the saved STRIVE training split (8,775
scenes), and 12 from its evaluation split (975 scenes). Selection seed:
`20261001`. These are the Dyn-adapted component's original split memberships.

The renders use the locked `movi_e_dyn_motion_collision` scene plan, 256×256,
24 frames at 12 fps, and the original collision tuning (dynamic centering
strength 1.25). Playback is slowed to 1 fps for inspection. A failed visibility
audit uses the original deterministic retry seed schedule; the selected scene
IDs are never replaced with more interesting examples.

Ground truth is recomputed from each accepted new render. Raw contacts are
binned with STRIVE's existing state-based contact/collision function; its
`original_spans` visibility rules and `collision_max_frames=1` are reused.
Object IDs follow first in-frame appearance and position. Points use STRIVE's
maximal interior point of the largest segmentation component. Invisible
points are hidden. Segmentation colors match the displayed object IDs.

The Current row is that baseline GT. The other four rows are display-only
policy comparisons, not altered training labels or evaluation results.
All 3,080 policy rows across the reference viewer's 616 interaction pairs were
checked for exact equality with the reconstruction used here.

The UI adapts the [STRIVE collision policy viewer](https://justachetan.github.io/strive/collision-visualizer/).
Use the split selector, interaction search, policy checkboxes, timeline seeking,
and frame controls. All scene objects remain available even when a random scene
has no interactions. Scene links expose the derived GT, original renderer
metadata, and raw contacts. Selection and source hashes are in `selection.json`
and `manifest.json`.

Download `viewer.zip`, unzip, and run `python3 -m http.server 8127` inside
`dyn-adapted-viewer`. Open `http://localhost:8127/`. No packages are needed to
serve the viewer. `checksums.sha256` covers the files inside the ZIP.
