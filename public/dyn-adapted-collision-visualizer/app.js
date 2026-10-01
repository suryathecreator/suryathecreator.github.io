"use strict";

const data = window.COLLISION_POLICY_VIEWER_DATA;
const armOrder = [
  "baseline",
  "gap_close_1",
  "anchor_expand_1",
  "gap_close_expand_relabel_1",
  "gap_close_le_3_relabel_1",
];
const armLabels = {
  baseline: "GT · Current",
  gap_close_1: "Gap close 1",
  anchor_expand_1: "Expand ±1",
  gap_close_expand_relabel_1: "Close → ±1",
  gap_close_le_3_relabel_1: "Close ≤3 → ±1",
};
const categoryLabels = {
  train: "Training",
  eval: "Evaluation",
  random_sample: "Uniform random sample",
  object_object_gap_close: "object–object gap close",
  object_ground_gap_close: "object–ground gap close",
  object_object_gap_2: "object–object joined gap 2",
  object_ground_gap_2: "object–ground joined gap 2",
};

const elements = {
  armFilters: document.querySelector("#armFilters"),
  baselineDefinition: document.querySelector("#baselineDefinition"),
  combinedDefinition: document.querySelector("#combinedDefinition"),
  errorMessage: document.querySelector("#errorMessage"),
  expandDefinition: document.querySelector("#expandDefinition"),
  frameReadout: document.querySelector("#frameReadout"),
  frameStatus: document.querySelector("#frameStatus"),
  gapDefinition: document.querySelector("#gapDefinition"),
  interactionCount: document.querySelector("#interactionCount"),
  interactionSearch: document.querySelector("#interactionSearch"),
  nextFrame: document.querySelector("#nextFrame"),
  objectLegend: document.querySelector("#objectLegend"),
  objectOverlay: document.querySelector("#objectOverlay"),
  playIcon: document.querySelector(".play-icon"),
  playLabel: document.querySelector(".play-label"),
  previousFrame: document.querySelector("#previousFrame"),
  reasonBadges: document.querySelector("#reasonBadges"),
  sceneCount: document.querySelector("#sceneCount"),
  sceneKicker: document.querySelector("#sceneKicker"),
  sceneList: document.querySelector("#sceneList"),
  sceneMeta: document.querySelector("#sceneMeta"),
  sceneTitle: document.querySelector("#sceneTitle"),
  segmentationVideo: document.querySelector("#segmentationVideo"),
  showObjectOverlay: document.querySelector("#showObjectOverlay"),
  timelineScroll: document.querySelector("#timelineScroll"),
  timelines: document.querySelector("#timelines"),
  togglePlayback: document.querySelector("#togglePlayback"),
  video: document.querySelector("#video"),
  wideGapDefinition: document.querySelector("#wideGapDefinition"),
};

const state = {
  animationFrame: null,
  currentFrame: 0,
  enabledArms: new Set(armOrder),
  sceneIndex: 0,
  showObjectOverlay: true,
  visiblePairKeys: new Set(),
};

function currentScene() {
  return data.scenes[state.sceneIndex];
}

function showError(message) {
  elements.errorMessage.textContent = message || "";
}

function enabledArmOrder() {
  return armOrder.filter((armName) => state.enabledArms.has(armName));
}

function renderArmFilters() {
  const fragment = document.createDocumentFragment();
  armOrder.forEach((armName) => {
    const option = document.createElement("label");
    const checkbox = document.createElement("input");
    const text = document.createElement("span");
    option.className = `arm-filter-option ${armName}`;
    checkbox.type = "checkbox";
    checkbox.checked = state.enabledArms.has(armName);
    checkbox.value = armName;
    text.textContent = armLabels[armName];
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.enabledArms.add(armName);
      else state.enabledArms.delete(armName);
      refreshArmSelection();
    });
    option.append(checkbox, text);
    fragment.append(option);
  });
  elements.armFilters.replaceChildren(fragment);
}

function categorySummary(scene) {
  return `${scene.objects.length} objects · ${scene.all_interaction_pairs} interaction pairs`;
}

function renderSceneList() {
  const fragment = document.createDocumentFragment();
  data.scenes.forEach((scene, index) => {
    const split = document.querySelector("#splitFilter").value;
    if (split !== "all" && scene.split !== split) return;
    const button = document.createElement("button");
    const number = document.createElement("span");
    const name = document.createElement("span");
    const impact = document.createElement("span");
    button.type = "button";
    button.className = `scene-button${index === state.sceneIndex ? " active" : ""}`;
    button.setAttribute("aria-current", index === state.sceneIndex ? "true" : "false");
    number.className = "scene-index";
    number.textContent = String(index + 1).padStart(2, "0");
    name.className = "scene-name";
    name.textContent = `${scene.split === "train" ? "Train" : "Eval"} · ${scene.media_id}`;
    impact.className = "scene-impact";
    impact.textContent = categorySummary(scene);
    button.append(number, name, impact);
    button.addEventListener("click", () => loadScene(index));
    fragment.append(button);
  });
  elements.sceneList.replaceChildren(fragment);
  elements.sceneCount.textContent = `${data.scenes.length} videos`;
}

function renderReasons(scene) {
  const fragment = document.createDocumentFragment();
  scene.selection_reasons.forEach((reason) => {
    const badge = document.createElement("span");
    badge.className = "reason-badge";
    badge.textContent = categoryLabels[reason] || reason;
    fragment.append(badge);
  });
  elements.reasonBadges.replaceChildren(fragment);
}

function sceneObjectsById(scene) {
  return new Map(scene.objects.map((object) => [Number(object.object_id), object]));
}

function objectIdsForPairs(pairs) {
  return new Set(
    pairs.flatMap((pair) => pair.pair.map(Number)).filter((objectId) => objectId !== 65535),
  );
}

function visiblePairs(scene) {
  return scene.pairs.filter((pair) => state.visiblePairKeys.has(pair.pair_key));
}

function renderObjectLegend(scene, visibleObjectIds) {
  const fragment = document.createDocumentFragment();
  scene.objects.filter((object) => visibleObjectIds.has(Number(object.object_id))).forEach((object) => {
    const chip = document.createElement("span");
    const color = document.createElement("i");
    const text = document.createElement("span");
    chip.className = "object-chip";
    chip.title = `Object ${object.object_id} · ${object.semantic_type}`;
    color.className = "object-chip-color";
    color.style.background = object.color;
    text.className = "object-chip-text";
    text.textContent = `#${object.object_id} ${object.semantic_type}`;
    chip.append(color, text);
    fragment.append(chip);
  });
  elements.objectLegend.replaceChildren(fragment);
}

function pairSearchText(pair) {
  const baselineKinds = [...new Set(pair.arms.baseline.map((segment) => segment.type))];
  const participantAliases = pair.pair.flatMap((objectId) => [
    `object ${objectId}`,
    `object #${objectId}`,
    `#${objectId}`,
  ]);
  return [
    pair.label,
    pair.pair_key,
    pair.pair_type,
    pair.pair_type.replaceAll("_", " "),
    pair.pair_type.replaceAll("_", "-"),
    ...participantAliases,
    ...baselineKinds,
  ].join(" ").toLocaleLowerCase();
}

function filteredInteractionPairs(scene) {
  const tokens = elements.interactionSearch.value
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return scene.pairs;
  return scene.pairs.filter((pair) => {
    const haystack = pairSearchText(pair);
    return tokens.every((token) => {
      const idMatch = token.match(/^#?(\d+)$/);
      if (idMatch) {
        return pair.pair.some((objectId) => Number(objectId) === Number(idMatch[1]));
      }
      return haystack.includes(token);
    });
  });
}

function makeParticipant(objectId, scene) {
  const participant = document.createElement("span");
  const color = document.createElement("i");
  const label = document.createElement("span");
  const object = sceneObjectsById(scene).get(Number(objectId));
  participant.className = "pair-participant";
  color.className = "pair-color";
  color.style.background = object ? object.color : "#718096";
  label.textContent = object
    ? `Object ${object.object_id} · ${object.semantic_type}`
    : "Ground";
  participant.append(color, label);
  return participant;
}

function makeFrameRuler(numFrames) {
  const ruler = document.createElement("div");
  const label = document.createElement("span");
  const track = document.createElement("div");
  ruler.className = "frame-ruler";
  label.className = "frame-ruler-label";
  label.textContent = "Frame";
  track.className = "ruler-track";
  track.style.setProperty("--frames", String(numFrames));
  for (let frame = 0; frame < numFrames; frame += 1) {
    const tick = document.createElement("span");
    tick.className = "frame-tick";
    tick.textContent = String(frame);
    track.append(tick);
  }
  ruler.append(label, track);
  return ruler;
}

function frameAtVideoTime() {
  const scene = currentScene();
  if (!Number.isFinite(elements.video.duration) || elements.video.duration <= 0) {
    return state.currentFrame;
  }
  const fraction = elements.video.currentTime / elements.video.duration;
  return Math.max(0, Math.min(scene.num_frames - 1, Math.floor(fraction * scene.num_frames)));
}

function seekVideoToFrame(video, frame) {
  const scene = currentScene();
  if (!Number.isFinite(video.duration) || video.duration <= 0) return;
  video.currentTime = (frame + 0.5) / scene.num_frames * video.duration;
}

function syncSegmentationToRgb(force = false) {
  if (
    !Number.isFinite(elements.video.duration)
    || elements.video.duration <= 0
    || !Number.isFinite(elements.segmentationVideo.duration)
    || elements.segmentationVideo.duration <= 0
  ) return;
  const targetTime = (
    elements.video.currentTime / elements.video.duration * elements.segmentationVideo.duration
  );
  if (force || Math.abs(elements.segmentationVideo.currentTime - targetTime) > 0.12) {
    elements.segmentationVideo.currentTime = targetTime;
  }
}

function seekFrame(frame) {
  const scene = currentScene();
  const bounded = Math.max(0, Math.min(scene.num_frames - 1, Math.round(Number(frame))));
  state.currentFrame = bounded;
  seekVideoToFrame(elements.video, bounded);
  seekVideoToFrame(elements.segmentationVideo, bounded);
  updateTimelinePosition((bounded + 0.5) / scene.num_frames, bounded);
}

function pausePlayback() {
  elements.video.pause();
  elements.segmentationVideo.pause();
  if (state.animationFrame !== null) {
    cancelAnimationFrame(state.animationFrame);
    state.animationFrame = null;
  }
  updatePlaybackControl();
}

function stepFrame(delta) {
  const sourceFrame = frameAtVideoTime();
  pausePlayback();
  seekFrame(sourceFrame + delta);
}

function updatePlaybackControl() {
  const isPlaying = !elements.video.paused;
  elements.togglePlayback.setAttribute("aria-pressed", String(isPlaying));
  elements.togglePlayback.setAttribute("aria-label", isPlaying ? "Pause video" : "Play video");
  elements.playIcon.textContent = isPlaying ? "❚❚" : "▶";
  elements.playLabel.textContent = isPlaying ? "Pause" : "Play";
}

function togglePlayback() {
  if (!elements.video.paused) {
    pausePlayback();
    return;
  }
  syncSegmentationToRgb(true);
  const playPromises = [elements.video.play(), elements.segmentationVideo.play()]
    .filter((promise) => promise !== undefined);
  if (playPromises.length > 0) {
    Promise.all(playPromises).catch((error) => {
      pausePlayback();
      updatePlaybackControl();
      showError(`Playback could not start: ${error.message}`);
    });
  }
}

function makeTimelineTrack(segments, numFrames, pairLabel, armName) {
  const track = document.createElement("div");
  track.className = "timeline-track";
  track.style.setProperty("--frames", String(numFrames));
  segments.forEach((segment) => {
    const bar = document.createElement("span");
    const width = segment.ends_at - segment.begins_at + 1;
    bar.className = `segment ${segment.type}`;
    bar.dataset.start = String(segment.begins_at);
    bar.dataset.end = String(segment.ends_at);
    bar.style.left = `${segment.begins_at / numFrames * 100}%`;
    bar.style.width = `${width / numFrames * 100}%`;
    bar.title = `${armLabels[armName]} · ${segment.type} · frames ${segment.begins_at}–${segment.ends_at} · ${pairLabel}`;
    track.append(bar);
  });
  const playhead = document.createElement("span");
  playhead.className = "playhead";
  playhead.setAttribute("aria-hidden", "true");
  track.append(playhead);
  track.addEventListener("click", (event) => {
    const bounds = track.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(0.999999, (event.clientX - bounds.left) / bounds.width));
    seekFrame(Math.floor(fraction * numFrames));
  });
  return track;
}

function statChip(text) {
  const chip = document.createElement("span");
  chip.className = "stat-chip";
  chip.textContent = text;
  return chip;
}

function renderPairGroup(pair, scene) {
  const group = document.createElement("section");
  const heading = document.createElement("div");
  const identity = document.createElement("div");
  const title = document.createElement("div");
  const kind = document.createElement("div");
  const stats = document.createElement("div");
  group.className = "pair-group";
  heading.className = "pair-heading";
  identity.className = "pair-identity";
  title.className = "pair-title";
  pair.pair.forEach((objectId) => title.append(makeParticipant(objectId, scene)));
  kind.className = "pair-kind";
  kind.textContent = pair.pair_type.replaceAll("_", "–");
  stats.className = "pair-stats";
  stats.append(
    statChip(`${pair.stats.baseline_collision_anchors} anchors`),
    statChip(`${pair.stats.gap_close_merges} gap closes`),
    statChip(`${pair.stats.anchor_expand_joined_anchors} expansion joins`),
    statChip(`${pair.stats.combined_relabelled_anchors} combined relabels`),
    statChip(`${pair.stats.gap_close_le_3_merged_gaps} ≤3-gap merges`),
  );
  identity.append(title, kind);
  heading.append(identity, stats);
  group.append(heading);

  enabledArmOrder().forEach((armName) => {
    const row = document.createElement("div");
    const label = document.createElement("span");
    row.className = "timeline-row";
    label.className = `arm-label ${armName}`;
    label.textContent = armLabels[armName];
    row.append(
      label,
      makeTimelineTrack(pair.arms[armName], scene.num_frames, pair.label, armName),
    );
    group.append(row);
  });
  return group;
}

function renderTimelines(scene) {
  const fragment = document.createDocumentFragment();
  const pairs = filteredInteractionPairs(scene);
  state.visiblePairKeys = new Set(pairs.map((pair) => pair.pair_key));
  elements.interactionCount.textContent = elements.interactionSearch.value.trim()
    ? `${pairs.length} of ${scene.pairs.length} pairs`
    : `${scene.pairs.length} interaction pairs`;
  if (pairs.length > 0 && state.enabledArms.size > 0) {
    fragment.append(makeFrameRuler(scene.num_frames));
    pairs.forEach((pair) => fragment.append(renderPairGroup(pair, scene)));
  } else {
    const empty = document.createElement("p");
    empty.className = "no-interactions";
    empty.textContent = pairs.length > 0
      ? "Enable at least one Gantt row above."
      : (scene.pairs.length ? "No interaction pairs match this search." : "No visible ground-truth interactions in this randomly sampled clip.");
    fragment.append(empty);
  }
  elements.timelines.replaceChildren(fragment);
  renderObjectLegend(scene, new Set(scene.objects.map((object) => object.object_id)));
}

function activeCollisionCounts(scene, frame) {
  const enabledArms = enabledArmOrder();
  const counts = Object.fromEntries(enabledArms.map((arm) => [arm, 0]));
  visiblePairs(scene).forEach((pair) => {
    enabledArms.forEach((arm) => {
      if (pair.arms[arm].some((segment) => (
        segment.type === "collision"
        && segment.begins_at <= frame
        && frame <= segment.ends_at
      ))) {
        counts[arm] += 1;
      }
    });
  });
  return counts;
}

function collisionIsActive(segments, frame) {
  return segments.some((segment) => (
    segment.type === "collision"
    && segment.begins_at <= frame
    && frame <= segment.ends_at
  ));
}

function activeCollisionObjectIds(scene, frame) {
  const objectIds = new Set();
  const enabledArms = enabledArmOrder();
  visiblePairs(scene).forEach((pair) => {
    if (enabledArms.some((arm) => collisionIsActive(pair.arms[arm], frame))) {
      pair.pair.forEach((objectId) => {
        if (Number(objectId) !== 65535) objectIds.add(Number(objectId));
      });
    }
  });
  return objectIds;
}

function drawCross(ctx, x, y, size, color, lineWidth) {
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.stroke();
}

function drawPointerLabel(ctx, x, y, text, color, width, height) {
  ctx.font = "700 12px ui-monospace, SFMono-Regular, Menlo, monospace";
  const padding = 5;
  const boxWidth = ctx.measureText(text).width + padding * 2;
  const boxHeight = 20;
  const boxX = Math.max(3, Math.min(width - boxWidth - 3, x + 11));
  const preferredY = y - boxHeight - 9;
  const boxY = preferredY >= 3 ? preferredY : Math.min(height - boxHeight - 3, y + 9);
  ctx.fillStyle = "rgba(2, 6, 15, 0.88)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f2f5f9";
  ctx.textBaseline = "middle";
  ctx.fillText(text, boxX + padding, boxY + boxHeight / 2);
}

function drawObjectPointers(frame) {
  const canvas = elements.objectOverlay;
  const bounds = elements.video.getBoundingClientRect();
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const density = Math.max(1, window.devicePixelRatio || 1);
  const pixelWidth = Math.round(width * density);
  const pixelHeight = Math.round(height * density);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(density, 0, 0, density, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (!state.showObjectOverlay) return;

  const scene = currentScene();
  const visibleObjectIds = new Set(scene.objects.map((object) => object.object_id));
  const activeObjects = activeCollisionObjectIds(scene, frame);
  scene.objects.filter((object) => visibleObjectIds.has(Number(object.object_id))).forEach((object) => {
    const track = object.track[frame];
    if (!track || !track.visible || !track.in_frame || !Array.isArray(track.point)) return;
    const x = Math.max(0, Math.min(1, Number(track.point[0]))) * width;
    const y = Math.max(0, Math.min(1, Number(track.point[1]))) * height;
    const active = activeObjects.has(Number(object.object_id));
    const size = active ? 12 : 9;
    drawCross(ctx, x, y, size + 1, "rgba(0, 0, 0, 0.88)", active ? 6 : 5);
    drawCross(ctx, x, y, size, object.color, active ? 3.2 : 2.5);
    if (active) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.strokeStyle = object.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    drawPointerLabel(ctx, x, y, `#${object.object_id}`, object.color, width, height);
  });
}

function updateTimelinePosition(fraction, frame) {
  const scene = currentScene();
  const boundedFraction = Math.max(0, Math.min(1, fraction));
  const boundedFrame = Math.max(0, Math.min(scene.num_frames - 1, frame));
  document.querySelectorAll(".playhead").forEach((playhead) => {
    playhead.style.left = `${boundedFraction * 100}%`;
  });
  document.querySelectorAll(".segment").forEach((segment) => {
    const active = Number(segment.dataset.start) <= boundedFrame
      && boundedFrame <= Number(segment.dataset.end);
    segment.classList.toggle("is-active", active);
  });
  const counts = activeCollisionCounts(scene, boundedFrame);
  const collisionSummary = enabledArmOrder()
    .map((armName) => `${counts[armName]} ${armLabels[armName]}`)
    .join(" · ");
  elements.frameReadout.textContent = `Frame ${boundedFrame} / ${scene.num_frames - 1}`;
  elements.frameStatus.textContent = collisionSummary
    ? `Frame ${boundedFrame} · collision pairs: ${collisionSummary}`
    : `Frame ${boundedFrame} · no policy rows enabled`;
  drawObjectPointers(boundedFrame);
}

function syncFromVideo() {
  const scene = currentScene();
  if (!Number.isFinite(elements.video.duration) || elements.video.duration <= 0) return;
  const fraction = Math.max(0, Math.min(1, elements.video.currentTime / elements.video.duration));
  const frame = Math.min(scene.num_frames - 1, Math.floor(fraction * scene.num_frames));
  state.currentFrame = frame;
  updateTimelinePosition(fraction, frame);
}

function animationTick() {
  syncFromVideo();
  syncSegmentationToRgb();
  if (elements.video.paused) {
    state.animationFrame = null;
    return;
  }
  state.animationFrame = requestAnimationFrame(animationTick);
}

function startAnimation() {
  if (state.animationFrame === null) {
    state.animationFrame = requestAnimationFrame(animationTick);
  }
}

function refreshInteractionFilter() {
  const scene = currentScene();
  const fraction = Number.isFinite(elements.video.duration) && elements.video.duration > 0
    ? elements.video.currentTime / elements.video.duration
    : (state.currentFrame + 0.5) / scene.num_frames;
  renderTimelines(scene);
  elements.timelineScroll.scrollTop = 0;
  updateTimelinePosition(fraction, state.currentFrame);
}

function refreshArmSelection() {
  const scene = currentScene();
  const scrollTop = elements.timelineScroll.scrollTop;
  const scrollLeft = elements.timelineScroll.scrollLeft;
  const fraction = Number.isFinite(elements.video.duration) && elements.video.duration > 0
    ? elements.video.currentTime / elements.video.duration
    : (state.currentFrame + 0.5) / scene.num_frames;
  renderTimelines(scene);
  elements.timelineScroll.scrollTop = scrollTop;
  elements.timelineScroll.scrollLeft = scrollLeft;
  updateTimelinePosition(fraction, state.currentFrame);
}

function loadScene(index) {
  const bounded = Math.max(0, Math.min(data.scenes.length - 1, Number(index)));
  if (state.animationFrame !== null) {
    cancelAnimationFrame(state.animationFrame);
    state.animationFrame = null;
  }
  state.sceneIndex = bounded;
  state.currentFrame = 0;
  const scene = currentScene();
  pausePlayback();
  elements.video.src = scene.video_url;
  elements.video.load();
  elements.segmentationVideo.src = scene.segmentation_url;
  elements.segmentationVideo.load();
  updatePlaybackControl();
  elements.sceneKicker.textContent = `Example ${scene.selection_index} of ${data.scenes.length}`;
  elements.sceneTitle.textContent = `${scene.split === "train" ? "Training" : "Evaluation"} scene ${scene.media_id}`;
  document.querySelector("#gtDownload").href = scene.ground_truth_url;
  document.querySelector("#metadataDownload").href = scene.raw_metadata_url;
  document.querySelector("#eventsDownload").href = scene.raw_events_url;
  elements.sceneMeta.textContent = (
    `${scene.objects.length} objects · 24 frames · `
    + `${scene.all_interaction_pairs} interaction pairs · `
    + `${scene.all_collision_pairs} contain collision`
  );
  elements.interactionSearch.value = "";
  renderReasons(scene);
  renderTimelines(scene);
  renderSceneList();
  elements.timelineScroll.scrollTop = 0;
  elements.timelineScroll.scrollLeft = 0;
  updateTimelinePosition(0, 0);
  showError(null);
}

function initialize() {
  if (!data || !Array.isArray(data.scenes) || data.scenes.length < 10) {
    showError("Viewer data is missing or contains fewer than 10 scenes.");
    return;
  }
  elements.baselineDefinition.textContent = data.policies.baseline;
  elements.gapDefinition.textContent = data.policies.gap_close_1;
  elements.expandDefinition.textContent = data.policies.anchor_expand_1;
  elements.combinedDefinition.textContent = data.policies.gap_close_expand_relabel_1;
  elements.wideGapDefinition.textContent = data.policies.gap_close_le_3_relabel_1;
  document.querySelector("#splitFilter").addEventListener("change", (event) => {
    const first = data.scenes.findIndex((scene) => event.target.value === "all" || scene.split === event.target.value);
    if (first >= 0) loadScene(first);
  });
  renderArmFilters();

  elements.previousFrame.addEventListener("click", () => stepFrame(-1));
  elements.nextFrame.addEventListener("click", () => stepFrame(1));
  elements.togglePlayback.addEventListener("click", togglePlayback);
  elements.interactionSearch.addEventListener("input", refreshInteractionFilter);
  elements.showObjectOverlay.addEventListener("change", () => {
    state.showObjectOverlay = elements.showObjectOverlay.checked;
    drawObjectPointers(state.currentFrame);
  });
  elements.video.addEventListener("loadedmetadata", () => {
    seekFrame(0);
    showError(null);
  });
  elements.segmentationVideo.addEventListener("loadedmetadata", () => {
    seekVideoToFrame(elements.segmentationVideo, state.currentFrame);
  });
  elements.video.addEventListener("timeupdate", syncFromVideo);
  elements.video.addEventListener("seeked", syncFromVideo);
  elements.video.addEventListener("play", () => {
    updatePlaybackControl();
    startAnimation();
  });
  elements.video.addEventListener("pause", () => {
    elements.segmentationVideo.pause();
    updatePlaybackControl();
  });
  elements.video.addEventListener("error", () => {
    showError(`Could not load ${currentScene().video_url}. Serve the repository root as documented in the lab note.`);
  });
  elements.segmentationVideo.addEventListener("error", () => {
    showError(
      `Could not load ${currentScene().segmentation_url}. Rebuild the generated segmentation videos as documented in the lab note.`,
    );
  });
  window.addEventListener("resize", () => drawObjectPointers(state.currentFrame));
  document.addEventListener("keydown", (event) => {
    if (
      event.target instanceof HTMLInputElement
      || event.target instanceof HTMLSelectElement
      || event.target instanceof HTMLButtonElement
    ) return;
    if (event.key === "ArrowLeft") stepFrame(-1);
    if (event.key === "ArrowRight") stepFrame(1);
    if (event.key === " ") {
      event.preventDefault();
      togglePlayback();
    }
  });
  loadScene(0);
}

initialize();
