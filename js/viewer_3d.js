import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'https://unpkg.com/three@0.126.1/examples/jsm/loaders/OBJLoader.js';

let animateId;
let objectGroup = new THREE.Group();
let axis = 'y';
let rotationSpeedIndex = 0;
const rotationSpeeds = [0, 0.01, 0.02];
let dist = 5;
let isUserInteracting = false;
let initialCamPos;

export function init3DViewer(containerId, singleModelPath = null) {
  const container = document.getElementById(containerId);

  const models = singleModelPath
    ? [{ file: singleModelPath, color: '#cccccc', label: 'Model' }]
    : JSON.parse(container.dataset.models || '[]');

  container.innerHTML = '';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f111a);

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
  const group = new THREE.Group();
  scene.add(group);

  const loader = new OBJLoader();
  const meshList = [];

  let maxBox = new THREE.Box3();

  models.forEach((m, index) => {
    loader.load(m.file, obj => {
      obj.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(m.color) });
        }
      });

      obj.userData.index = index;
      group.add(obj);
      meshList[index] = obj;

      maxBox.union(new THREE.Box3().setFromObject(obj));

      if (meshList.filter(Boolean).length === models.length) {
        const center = maxBox.getCenter(new THREE.Vector3());
        const size = maxBox.getSize(new THREE.Vector3());
        group.position.sub(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const fovRad = (camera.fov * Math.PI) / 180;
        dist = maxDim / (2 * Math.tan(fovRad / 2));
        camera.position.set(0, 0, dist * 1.2);
        camera.lookAt(0, 0, 0);
        initialCamPos = camera.position.clone();
        updateZoomDisplay();
      }
    });
  });

  objectGroup = group;
  container.meshList = meshList; // ✅ Fix: salva i meshList come proprietà diretta, NON su dataset

  function animate() {
    animateId = requestAnimationFrame(animate);
    if (rotationSpeeds[rotationSpeedIndex] > 0 && objectGroup) {
      objectGroup.rotation[axis] += rotationSpeeds[rotationSpeedIndex];
    }
    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  window.setView = function (view, id) {
    if (id !== containerId) return;

    const views = {
      axial: [0, -1, 0],
      coronal: [0, 0, 1],
      sagittal: [1, 0, 0]
    };
    const dir = views[view];
    if (!dir) return;

    objectGroup.rotation.set(0, 0, 0);
    camera.position.set(...dir.map(v => v * dist * 1.2));
    camera.lookAt(0, 0, 0);

    axis = view === 'axial' ? 'z' : view === 'coronal' ? 'y' : 'x';

    const controlsDiv = document.getElementById(containerId).parentElement?.querySelector('.viewer-controls');
    if (controlsDiv) {
      controlsDiv.querySelectorAll('button.axial, button.coronal, button.sagittal')
        .forEach(btn => btn.classList.remove('active'));
      const btn = controlsDiv.querySelector(`button.${view}`);
      if (btn) btn.classList.add('active');
    }
  };

  window.toggleRotation = function (id) {
    if (id !== containerId) return;

    rotationSpeedIndex = (rotationSpeedIndex + 1) % rotationSpeeds.length;

    const controlsDiv = document.getElementById(containerId).parentElement?.querySelector('.viewer-controls');
    const btn = controlsDiv?.querySelector('button.rotate');
    if (btn) {
      if (rotationSpeedIndex === 0) btn.classList.remove('rotating');
      else btn.classList.add('rotating');
    }
  };

  window.resetView = function (id) {
    if (id !== containerId) return;
    rotationSpeedIndex = 0;
    objectGroup.rotation.set(0, 0, 0);
    camera.position.copy(initialCamPos);
    camera.lookAt(0, 0, 0);
    updateZoomDisplay();
    const btn = container.parentElement?.querySelector('button.rotate');
    btn?.classList.remove('rotating');

    // Rimuovi lo stato attivo dai pulsanti A / C / S
    const controlsDiv = document.getElementById(containerId).parentElement?.querySelector('.viewer-controls');
    if (controlsDiv) {
    controlsDiv.querySelectorAll('button.axial, button.coronal, button.sagittal')
        .forEach(btn => btn.classList.remove('active'));
    }
  };

  let zoomFactor = 1; // 1 = 100%
  function updateZoomDisplay() {
    const label = document.getElementById(`zoom-${containerId}`);
    if (label) label.textContent = `${Math.round(zoomFactor * 100)}%`;
  }

  window.zoom = function (id, direction) {
    if (id !== containerId) return;
    const step = 0.1;
    zoomFactor = Math.min(2, Math.max(0.5, zoomFactor + step * direction));
    camera.position.set(0, 0, dist * 1.2 / zoomFactor);
    camera.lookAt(0, 0, 0);
    updateZoomDisplay();
  };

  window.toggleVisibility = function (viewerId, index) {
    const container = document.getElementById(viewerId);
    const meshList = container.meshList;
    if (!meshList || !meshList[index]) return;
    meshList[index].visible = !meshList[index].visible;
  };

}