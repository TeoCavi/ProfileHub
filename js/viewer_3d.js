import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { TrackballControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/TrackballControls.js';
import { OBJLoader } from 'https://unpkg.com/three@0.126.1/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'https://unpkg.com/three@0.126.1/examples/jsm/loaders/PLYLoader.js';

let animateId;
let objectGroup = new THREE.Group();
let rotationSpeedIndex = 0;
const rotationSpeeds = [0, 0.01, 0.02];
let dist = 5;
let rotationAxis = new THREE.Vector3(0, 1, 0);
let centerOfRotation = new THREE.Vector3();
let controls, camera, renderer;
let zoomFactor = 1;
let baseCameraDirection = new THREE.Vector3(0, -1, 0);
let currentViewName = null;
let lastMatchedView = null;

export async function init3DViewer(containerId, singleModelPath = null) {
  const container = document.getElementById(containerId);
  const models = singleModelPath
    ? [{ file: singleModelPath, color: '#cccccc', label: 'Model' }]
    : JSON.parse(container.dataset.models || '[]');

  const spinner = document.createElement('div');
  spinner.className = 'viewer-spinner';
  spinner.innerHTML = `
    <div class="spinner"></div>
    <div class="spinner-label">Loading 0%</div>
  `;
  container.innerHTML = '';
  container.appendChild(spinner);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f111a);

  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  controls = new TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 2.5;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.0;
  controls.noPan = true;
  controls.dynamicDampingFactor = 0.5;
  controls.enabled = true;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.ZOOM,
    RIGHT: null
  };

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  scene.add(directionalLight);
  directionalLight.target.position.set(0, 0, 0);
  scene.add(directionalLight.target);
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  const pivot = new THREE.Group();
  const group = new THREE.Group();
  pivot.add(group);
  scene.add(pivot);
  objectGroup = pivot;

  const objLoader = new OBJLoader();
  const plyLoader = new PLYLoader();
  const meshList = [];
  let maxBox = new THREE.Box3();

  let loadedCount = 0;
  const totalToLoad = models.length;
  const updateLoadingProgress = () => {
    const percent = Math.floor((loadedCount / totalToLoad) * 100);
    const label = container.querySelector('.spinner-label');
    if (label) label.textContent = `Loading ${percent}%`;
  };

  models.forEach((m, index) => {
    const extension = m.file.split('.').pop().toLowerCase();
    const onLoad = obj => {
      obj.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(m.color) });
        }
      });
      const mesh = obj.isMesh ? new THREE.Group().add(obj) : obj;
      mesh.userData.index = index;
      group.add(mesh);
      meshList[index] = mesh;
      maxBox.union(new THREE.Box3().setFromObject(mesh));
      loadedCount++;
      updateLoadingProgress();
      if (loadedCount === totalToLoad) {
        const center = maxBox.getCenter(new THREE.Vector3());
        const size = maxBox.getSize(new THREE.Vector3());
        group.position.sub(center);
        centerOfRotation.set(0, 0, 0);
        const maxDim = Math.max(size.x, size.y, size.z);
        const fovRad = (camera.fov * Math.PI) / 180;
        dist = maxDim / (2 * Math.tan(fovRad / 2));
        container.querySelector('.viewer-spinner')?.remove();
        setView('anterior', containerId);
        updateZoomDisplay(containerId);
      }
    };
    if (extension === 'obj') objLoader.load(m.file, onLoad);
    else if (extension === 'ply') {
      plyLoader.load(m.file, geometry => {
        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(m.color) });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.visible = m.visible !== false; // ✅ CORRETTO
        scene.add(mesh);
        onLoad(mesh);
      });
    }
  });
  container.meshList = meshList;

  function animate() {
    animateId = requestAnimationFrame(animate);
    if (rotationSpeeds[rotationSpeedIndex] > 0 && objectGroup) {
      objectGroup.rotateOnWorldAxis(rotationAxis, rotationSpeeds[rotationSpeedIndex]);
    }

    if (currentViewName) {
      const tilt = 30 * Math.PI / 180;
      const views = {
        anterior: { dir: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1) },
        superior: { dir: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, -1, 0) },
        operative: { dir: new THREE.Vector3(0, -1, -Math.tan(tilt)), up: new THREE.Vector3(0, 0, 1) }
      };
      const view = views[currentViewName];
      const expectedPos = centerOfRotation.clone().add(view.dir.clone().normalize().multiplyScalar(dist * 1.2));
      const camDiff = camera.position.distanceTo(expectedPos);
      const upDiff = camera.up.angleTo(view.up);
      const isViewMatched = camDiff < 0.05 && upDiff < 0.05 && objectGroup.rotation.toVector3().length() < 0.001;

      const controlsDiv = document.getElementById(containerId).parentElement?.querySelector('.viewer-controls');
      if (!isViewMatched && lastMatchedView) {
        controlsDiv?.querySelectorAll('button.anterior, button.superior, button.operative')
          .forEach(btn => btn.classList.remove('active'));
        lastMatchedView = null;
      }
      if (isViewMatched && !lastMatchedView) {
        controlsDiv?.querySelector(`button.${currentViewName}`)?.classList.add('active');
        lastMatchedView = currentViewName;
      }
    }

    directionalLight.position.copy(camera.position);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.setView = function (view, id) {
    if (id !== containerId) return;
    rotationSpeedIndex = 0;
    const tilt = 20 * Math.PI / 180;
    const views = {
      anterior: { dir: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1) },
      superior: { dir: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, -1, 0) },
      operative: { dir: new THREE.Vector3(0, -1, -Math.tan(tilt)), up: new THREE.Vector3(0, 0, 1) }
    };
    const { dir, up } = views[view];
    objectGroup.rotation.set(0, 0, 0);
    camera.position.copy(centerOfRotation.clone().add(dir.clone().normalize().multiplyScalar(dist * 1.2)));
    camera.up.copy(up);
    rotationAxis = up.clone();
    controls.target.copy(centerOfRotation);
    controls.update();
    const controlsDiv = document.getElementById(containerId).parentElement?.querySelector('.viewer-controls');
    controlsDiv?.querySelectorAll('button.anterior, button.superior, button.operative')
      .forEach(btn => btn.classList.remove('active'));
    controlsDiv?.querySelector(`button.${view}`)?.classList.add('active');
    baseCameraDirection.copy(dir);
    currentViewName = view;
    lastMatchedView = view;
  };

  window.resetView = function (id) {
    if (id !== containerId) return;
    rotationSpeedIndex = 0;
    objectGroup.rotation.set(0, 0, 0);
    const controlsDiv = document.getElementById(containerId).parentElement?.querySelector('.viewer-controls');
    const lastBtn = currentViewName
      ? controlsDiv?.querySelector(`button.${currentViewName}`)
      : null;
    if (lastBtn) lastBtn.click();
    else setView('anterior', id);
    zoomFactor = 1;
    updateZoomDisplay(id);
    controlsDiv?.querySelector('button.rotate')?.classList.remove('rotating');
  };

  window.toggleRotation = function (id) {
    if (id !== containerId) return;
    rotationSpeedIndex = (rotationSpeedIndex + 1) % rotationSpeeds.length;
    const controlsDiv = document.getElementById(containerId).parentElement?.querySelector('.viewer-controls');
    controlsDiv?.querySelector('button.rotate')?.classList.toggle('rotating', rotationSpeedIndex !== 0);
  };

  window.zoom = function (id, direction) {
    if (id !== containerId) return;
    const step = 0.1;
    zoomFactor = Math.min(2, Math.max(0.5, zoomFactor + step * direction));
    camera.position.setLength(dist * 1.2 / zoomFactor);
    controls.target.copy(centerOfRotation);
    controls.update();
    updateZoomDisplay(containerId);
  };

  window.toggleVisibility = function (viewerId, index) {
    const container = document.getElementById(viewerId);
    const meshList = container.meshList;
    if (!meshList || !meshList[index]) return;
    meshList[index].visible = !meshList[index].visible;
  };

  function updateZoomDisplay(id) {
    const label = document.getElementById(`zoom-${id}`);
    if (label) label.textContent = `${Math.round(zoomFactor * 100)}%`;
  }
}
