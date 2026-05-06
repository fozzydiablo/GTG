import * as THREE from 'three';
import {
  buildSkeleton, setPose, applyEnvironment, buildEnvironment, applyEnvVisibility,
} from './stickFigure.js';
import { buildProps, updateProps } from './props.js';

const activeStages = new Set();

const _camTarget = new THREE.Vector3();

export class Stage {
  constructor(canvas, { exercise, speed = 1.0, autoRotate = true } = {}) {
    this.canvas = canvas;
    this.exercise = exercise;
    this.speed = speed;
    this.autoRotate = autoRotate;
    this.t0 = performance.now();
    this.disposed = false;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    this.camera = camera;

    const hemi = new THREE.HemisphereLight(0xeaf2ff, 0x0e1320, 0.55);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7cf2c8, 0.45);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    this.skel = buildSkeleton();
    scene.add(this.skel.root);
    this.env = buildEnvironment(scene);
    this.props = buildProps(scene);

    this.frame();
    this.observer = new ResizeObserver(() => this.frame());
    this.observer.observe(canvas);

    activeStages.add(this);
    this.loop();
  }

  setExercise(exercise) {
    this.exercise = exercise;
    this.t0 = performance.now();
  }

  frame() {
    const w = this.canvas.clientWidth || 300;
    const h = this.canvas.clientHeight || 200;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
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

  loop = () => {
    if (this.disposed) return;
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
      updateProps(this.props, this.skel, p, this.env);
      this.cameraFor(ex, elapsed);
    }

    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(this.loop);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this._raf);
    this.observer?.disconnect();
    this.renderer.dispose();
    activeStages.delete(this);
  }
}

export function disposeAllStages() {
  for (const s of [...activeStages]) s.dispose();
}
