/* Local STEP rendering. All input stays in the browser. */
import * as THREE from '../vendor/cad/three.module.js';
import { OrbitControls } from '../vendor/cad/OrbitControls.js';

export function createLocalViewer(container, onSelection) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xc8d5de);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 1000000);
  camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x657483, 2));
  const lamp = new THREE.DirectionalLight(0xffffff, 2.2); lamp.position.set(5, -8, 10); scene.add(lamp);
  let group = new THREE.Group(), meshes = [], selected = null, frame = 0, worker = null;
  scene.add(group); container.replaceChildren(renderer.domElement);
  function draw() { if (!frame) frame = requestAnimationFrame(() => { frame = 0; renderer.render(scene, camera); }); }
  controls.addEventListener('change', draw);
  function resize() {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); draw();
  }
  const observer = new ResizeObserver(resize); observer.observe(container);
  function fit(objects = meshes) {
    const bounds = new THREE.Box3();
    for (const object of objects) bounds.expandByObject(object);
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
    const distance = Math.max(size.x, size.y, size.z, 0.01) * 2.6;
    controls.target.copy(center); camera.position.copy(center).add(new THREE.Vector3(distance, -distance, distance));
    camera.near = Math.max(distance / 10000, 0.001); camera.far = distance * 10000;
    camera.updateProjectionMatrix(); controls.update(); draw();
  }
  function select(mesh) {
    if (selected) selected.material.emissive.setHex(0x000000);
    selected = mesh;
    if (selected) selected.material.emissive.setHex(0x245a78);
    onSelection(selected ? { name: selected.userData.name, index: selected.userData.index } : null);
    draw();
  }
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(meshes.filter(m => m.visible), false)[0];
    select(hit ? hit.object : null);
  });
  resize();
  return {
    async load(file) {
      if (!/\.(step|stp)$/i.test(file.name)) throw new Error('This local viewer currently supports STEP files. Export Inventor files to STEP first.');
      if (!file.size || file.size > 100 * 1024 * 1024) throw new Error('Choose a STEP file smaller than 100 MB.');
      const bytes = await file.arrayBuffer();
      const result = await new Promise((resolve, reject) => {
        worker = new Worker(new URL('./cad-local-worker.js', import.meta.url));
        worker.onmessage = event => { worker.terminate(); worker = null; event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.result); };
        worker.onerror = () => { worker.terminate(); worker = null; reject(new Error('The local STEP reader could not start. Open Nova through its local server.')); };
        worker.postMessage(bytes, [bytes]);
      });
      scene.remove(group);
      for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); }
      group = new THREE.Group(); meshes = []; selected = null; scene.add(group);
      result.meshes.forEach((source, index) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(source.attributes.position.array, 3));
        geometry.setIndex(source.index.array);
        if (source.attributes.normal) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(source.attributes.normal.array, 3));
        else geometry.computeVertexNormals();
        const color = Array.isArray(source.color) ? new THREE.Color().setRGB(...source.color.slice(0, 3)) : new THREE.Color(0x91a9bb);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, metalness: 0.15, roughness: 0.65, side: THREE.DoubleSide }));
        mesh.userData = { name: source.name || 'Component ' + (index + 1), index };
        group.add(mesh); meshes.push(mesh);
      });
      fit(); resize();
      return meshes.map(mesh => ({ name: mesh.userData.name, index: mesh.userData.index }));
    },
    fit: () => fit(),
    focus: () => { if (selected) fit([selected]); },
    select: index => select(meshes[index] || null),
    isolate: () => { if (selected) { meshes.forEach(mesh => { mesh.visible = mesh === selected; }); draw(); } },
    showAll: () => { meshes.forEach(mesh => { mesh.visible = true; }); draw(); },
    resize,
    dispose() {
      if (worker) worker.terminate();
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect(); controls.dispose();
      for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); }
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
