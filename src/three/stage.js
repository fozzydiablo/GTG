import * as THREE from 'three';
import {
  buildSkeleton, setPose, applyEnvironment, buildEnvironment, applyEnvVisibility,
  solveArmIK,
} from './stickFigure.js';
import { buildProps, updateProps } from './props.js';

// Browsers allow only a handful of live WebGL contexts per page (~8-16);
// one renderer per tile crashes the exercise library. Instead, ALL stages
// share a single offscreen WebGL renderer: each frame, every visible stage
// is rendered into it and blitted onto that stage's plain 2D canvas.
// One GL context total, any number of animated tiles.

const MAX_DPR = 2;

const activeStages = new Set();
let rafId = 0;
let shared = null;

function getShared() {
  if (!shared) {
    const canvas = document.createElement('canvas');
    // Keep the context on GPU resets so tiles recover instead of dying.
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(1); // all sizing is done in device pixels
    renderer.setClearColor(0x000000, 0);
    renderer.setScissorTest(true);
    shared = { canvas, renderer };
  }
  return shared;
}

// Grow-only backing store so we never reallocate per tile.
function ensureSharedSize(px, py) {
  const { canvas, renderer } = shared;
  if (canvas.width < px || canvas.height < py) {
    renderer.setSize(Math.max(canvas.width, px), Math.max(canvas.height, py), false);
  }
}

function tick() {
  rafId = 0;
  if (!activeStages.size) return;
  const { renderer, canvas } = getShared();
  for (const stage of activeStages) stage.renderFrame(renderer, canvas);
  rafId = requestAnimationFrame(tick);
}

function ensureLoop() {
  if (!rafId) rafId = requestAnimationFrame(tick);
}

const _camTarget = new THREE.Vector3();

export class Stage {
  constructor(canvas, { exercise, speed = 1.0, autoRotate = true } = {}) {
    this.canvas = canvas;
    this.ctx2d = canvas.getContext('2d');
    this.exercise = exercise;
    this.speed = speed;
    this.autoRotate = autoRotate;
    this.t0 = performance.now();
    this.disposed = false;
    this.onScreen = true;
    this.needsBlit = true;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);

    const hemi = new THREE.HemisphereLight(0xeaf2ff, 0x0e1320, 0.55);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(3, 5, 4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7cf2c8, 0.45);
    rim.position.set(-3, 2, -2);
    this.scene.add(rim);

    this.skel = buildSkeleton();
    this.scene.add(this.skel.root);
    this.env = buildEnvironment(this.scene);
    this.props = buildProps(this.scene);

    this.cssW = canvas.clientWidth || 300;
    this.cssH = canvas.clientHeight || 200;
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const e of entries) {
        this.cssW = e.contentRect.width || this.cssW;
        this.cssH = e.contentRect.height || this.cssH;
      }
    });
    this.resizeObserver.observe(canvas);

    // Pause stages that scroll out of view — they cost nothing while hidden.
    this.visObserver = new IntersectionObserver(([e]) => {
      this.onScreen = e.isIntersecting;
    }, { rootMargin: '120px 0px' });
    this.visObserver.observe(canvas);

    getShared();
    activeStages.add(this);
    ensureLoop();
  }

  setExercise(exercise) {
    this.exercise = exercise;
    this.t0 = performance.now();
  }

  cameraFor(exercise, elapsed) {
    const cam = exercise?.camera || { view: 'front' };
    const target = cam.target || [0, 1.1, 0];
    _camTarget.set(target[0], target[1], target[2]);

    let pos;
    if (cam.position) {
      pos = cam.position;
    } else if (cam.view === 'side') {
      pos = [3.4, 1.4, 0.6];
    } else if (cam.view === '3q') {
      pos = [2.4, 1.55, 2.6];
    } else {
      pos = [0.4, 1.55, 3.6];
    }
    this.camera.position.set(pos[0], pos[1], pos[2]);

    if (this.autoRotate && cam.view === 'front') {
      const orbit = Math.sin(elapsed * 0.3) * 0.3;
      this.camera.position.x += orbit;
    }
    this.camera.lookAt(_camTarget);
  }

  renderFrame(renderer, sharedCanvas) {
    if (this.disposed || !this.onScreen) return;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const pw = Math.max(1, Math.round(this.cssW * dpr));
    const ph = Math.max(1, Math.round(this.cssH * dpr));
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    ensureSharedSize(pw, ph);

    const now = performance.now();
    const elapsed = (now - this.t0) / 1000;
    const periodSec = (this.exercise?.tempo || 2.4) / this.speed;
    const t = (elapsed % periodSec) / periodSec;

    const ex = this.exercise;
    if (ex && ex.rig) {
      const p = ex.rig(t);
      const env = applyEnvironment(this.skel, p);
      applyEnvVisibility(this.env, env);
      setPose(this.skel, p);
      if (p.ikL || p.ikR) {
        this.skel.root.updateMatrixWorld(true);
        if (p.ikL) solveArmIK(this.skel, 'l', p.ikL.t, p.ikL.p);
        if (p.ikR) solveArmIK(this.skel, 'r', p.ikR.t, p.ikR.p);
      }
      updateProps(this.props, this.skel, p, this.env);
      this.camera.aspect = pw / ph;
      this.camera.updateProjectionMatrix();
      this.cameraFor(ex, elapsed);
    }

    // Render into the shared GL canvas, then copy this stage's region onto
    // its own 2D canvas (drawImage is valid until the browser composites).
    renderer.setViewport(0, 0, pw, ph);
    renderer.setScissor(0, 0, pw, ph);
    renderer.render(this.scene, this.camera);

    this.ctx2d.clearRect(0, 0, pw, ph);
    this.ctx2d.drawImage(
      sharedCanvas,
      0, sharedCanvas.height - ph, pw, ph,
      0, 0, pw, ph,
    );
  }

  dispose() {
    this.disposed = true;
    this.resizeObserver?.disconnect();
    this.visObserver?.disconnect();
    activeStages.delete(this);
    // Free this stage's GPU buffers from the shared context.
    this.scene.traverse((obj) => {
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material?.dispose();
    });
  }
}

export function disposeAllStages() {
  for (const s of [...activeStages]) s.dispose();
}
