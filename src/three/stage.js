import * as THREE from 'three';
import { buildSkeleton, setPose, applyEnvironment, buildEnvironment, applyEnvVisibility } from './stickFigure.js';

const activeStages = new Set();

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
    renderer.shadowMap.enabled = false;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    camera.position.set(2.6, 1.6, 3.4);
    camera.lookAt(0, 1.1, 0);
    this.camera = camera;

    // Lights
    const hemi = new THREE.HemisphereLight(0xeaf2ff, 0x0e1320, 0.55);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7cf2c8, 0.45);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    // Skeleton + environment
    this.skel = buildSkeleton();
    scene.add(this.skel.root);
    this.env = buildEnvironment(scene);

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

  cameraFor(exercise) {
    const view = exercise?.view || 'front';
    if (view === 'side') {
      this.camera.position.set(3.2, 1.5, 0.6);
      this.camera.lookAt(0, 1.0, 0);
    } else {
      this.camera.position.set(0.6, 1.6, 3.4);
      this.camera.lookAt(0, 1.1, 0);
    }
  }

  loop = () => {
    if (this.disposed) return;
    const now = performance.now();
    const elapsed = (now - this.t0) / 1000;
    const periodSec = 2.4 / this.speed;
    const t = (elapsed % periodSec) / periodSec;

    const ex = this.exercise;
    if (ex && ex.rig) {
      const p = ex.rig(t);
      const env = applyEnvironment(this.skel, p);
      applyEnvVisibility(this.env, env);
      setPose(this.skel, p);
      this.cameraFor(ex);
      // Slow auto-orbit on front-view exercises for a touch of life.
      if (this.autoRotate && (ex.view || 'front') === 'front') {
        const orbit = Math.sin(elapsed * 0.3) * 0.25;
        this.camera.position.x = 0.6 + orbit;
        this.camera.lookAt(0, 1.1, 0);
      }
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
