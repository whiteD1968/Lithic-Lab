import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const byId = (id) => document.getElementById(id);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const wrap01 = (v) => ((v % 1) + 1) % 1;
const densityKgPerM3 = 2600;

const state = {
  designMode: "Generated",
  vaultType: "Barrel Vault",
  pattern: "Radial joints",
  structuralDirection: "Compression lines",
  registrationMode: "UV coordinates",
  jointMode: "Visual seams",
  params: { span: 22, rise: 10, length: 28, thickness: 1.1, courseCount: 16, blockCount: 18, subdivisionDensity: 1, keystoneSize: 0.45 },
  springingAngle: 0,
  bayRatioX: 1,
  bayRatioY: 1,
  ribCount: 8,
  lierneDensity: 0.4,
  netFrequency: 10,
  tileLayers: 3,
  extradosOffset: 0.15,
  supportTopology: "4 corners",
  workflowStep: 1,
  customPatternSource: "Imported 2D Layout",
  supportCount: 4,
  forceLmin: 0.15,
  forceLmax: 0.75,
  forceLocks: {},
  pipelineStage: 0,
  groinMorph: 0,
  lInterlockBias: 0.35,
  cubeScale: 1,
  arrayU: 1,
  arrayV: 1,
  align: { scale: 1, offsetU: 0, offsetV: 0, rotationDeg: 0 },
  constraints: {
    maxLength: 2.4, maxWidth: 1.2, minThickness: 0.3, maxWeight: 520, jointGap: 0.02,
    bedDepth: 0.24, courseHeight: 0.65, taperAngle: 4, maxTaper: 8, minEdgeLength: 0.18, fabTolerance: 0.008,
  },
  blocks: [],
  selectedBlockId: null,
  dragging: null,
  imported2DPolys: null,
  importedSurface: null,
  importedSurfaceBbox: null,
  view2d: { x: 0, y: 0, w: 1000, h: 700 },
  pan2d: null,
  lightingPreset: "Three-Point",
  displayPreset: "Shaded + Edges",
  layoutStyle: "Rhino Gray",
  foilGradient: { a: "#d8dce4", b: "#8fb7d9", mix: 0.55 },
  display: {
    baseGrid: true,
    boundingBoxes: false,
    latticeControls: false,
    meshWires: false,
    foilMaterial: true,
    backFaces: false,
    seamDebug: true,
  },
};

const vaultTypes = [
  "Barrel Vault",
  "Groin Vault",
  "Cloister Vault",
  "Sail Vault",
  "Dome",
  "Rib Vault",
  "Fan Vault",
  "Lierne Vault",
  "Net Vault",
  "Catalan Vault",
  "Guastavino Vault",
  "Custom Imported Rhino Surface",
];
const patterns = ["Courses", "Radial joints", "Running bond", "Diagonal joints", "Hex / NGon", "Rib-aligned", "Keystone zones"];
const viewModes = ["Geometry", "Structure", "Fabrication", "Assembly", "Material", "Printability"];
const vaultParamRules = {
  "Barrel Vault": ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "keystoneSize", "springingAngle"],
  "Groin Vault": ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "springingAngle", "bayRatio", "groinMorph", "lInterlockBias"],
  "Cloister Vault": ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "keystoneSize", "bayRatio"],
  "Sail Vault": ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "bayRatio"],
  Dome: ["span", "rise", "thickness", "courseCount", "blockCount", "subdivisionDensity"],
  "Rib Vault": ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "ribCount", "bayRatio"],
  "Fan Vault": ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "ribCount"],
  "Lierne Vault": ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "ribCount", "lierneDensity"],
  "Net Vault": ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "netFrequency"],
  "Catalan Vault": ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "tileLayers"],
  "Guastavino Vault": ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "tileLayers"],
  "Custom Imported Rhino Surface": ["thickness", "courseCount", "blockCount", "subdivisionDensity"],
};
const vaultPatternPreset = {
  "Barrel Vault": "Running bond",
  "Groin Vault": "Radial joints",
  "Cloister Vault": "Rib-aligned",
  "Sail Vault": "Rib-aligned",
  Dome: "Radial joints",
  "Rib Vault": "Rib-aligned",
  "Fan Vault": "Rib-aligned",
  "Lierne Vault": "Hex / NGon",
  "Net Vault": "Hex / NGon",
  "Catalan Vault": "Running bond",
  "Guastavino Vault": "Running bond",
};
const vaultPatternAllowed = {
  "Barrel Vault": ["Courses", "Running bond", "Radial joints", "Keystone zones"],
  "Groin Vault": ["Radial joints", "Diagonal joints", "Rib-aligned", "Keystone zones"],
  "Cloister Vault": ["Radial joints", "Rib-aligned", "Keystone zones"],
  "Sail Vault": ["Radial joints", "Rib-aligned", "Keystone zones"],
  Dome: ["Radial joints", "Courses", "Keystone zones"],
  "Rib Vault": ["Rib-aligned", "Radial joints", "Diagonal joints"],
  "Fan Vault": ["Rib-aligned", "Radial joints"],
  "Lierne Vault": ["Rib-aligned", "Hex / NGon", "Diagonal joints"],
  "Net Vault": ["Hex / NGon", "Diagonal joints", "Rib-aligned"],
  "Catalan Vault": ["Running bond", "Diagonal joints", "Courses"],
  "Guastavino Vault": ["Running bond", "Diagonal joints", "Courses"],
  "Custom Imported Rhino Surface": ["Hex / NGon", "Rib-aligned", "Diagonal joints", "Running bond", "Radial joints", "Courses", "Keystone zones"],
};
const vaultStructuralDefault = {
  "Barrel Vault": "Compression lines",
  "Groin Vault": "Thrust paths",
  "Cloister Vault": "Compression lines",
  "Sail Vault": "Compression lines",
  Dome: "Compression lines",
  "Rib Vault": "Rib lines",
  "Fan Vault": "Rib lines",
  "Lierne Vault": "Rib lines",
  "Net Vault": "Rib lines",
  "Catalan Vault": "Compression lines",
  "Guastavino Vault": "Compression lines",
  "Custom Imported Rhino Surface": "Compression lines",
};
const vaultStartupSolutions = {
  "Barrel Vault": {
    pattern: "Running bond",
    params: { span: 22, rise: 10, length: 28, thickness: 0.9, courseCount: 20, blockCount: 22, subdivisionDensity: 1.1, keystoneSize: 0.35 },
  },
  "Groin Vault": {
    pattern: "Radial joints",
    params: { span: 22, rise: 11, length: 22, thickness: 0.88, courseCount: 22, blockCount: 20, subdivisionDensity: 1.2, keystoneSize: 0.42 },
    bayRatioX: 1,
    bayRatioY: 1,
    groinMorph: 0.45,
  },
  "Cloister Vault": {
    pattern: "Rib-aligned",
    params: { span: 22, rise: 10, length: 22, thickness: 0.82, courseCount: 18, blockCount: 16, subdivisionDensity: 1.05, keystoneSize: 0.58 },
    bayRatioX: 1,
    bayRatioY: 1,
  },
  "Sail Vault": {
    pattern: "Rib-aligned",
    params: { span: 22, rise: 12, length: 22, thickness: 0.78, courseCount: 18, blockCount: 18, subdivisionDensity: 1.08, keystoneSize: 0.52 },
    bayRatioX: 1,
    bayRatioY: 1,
  },
  Dome: {
    pattern: "Radial joints",
    params: { span: 22, rise: 13, length: 22, thickness: 0.85, courseCount: 24, blockCount: 24, subdivisionDensity: 1.15, keystoneSize: 0.5 },
  },
  "Rib Vault": {
    pattern: "Rib-aligned",
    params: { span: 20, rise: 11, length: 22, thickness: 0.72, courseCount: 16, blockCount: 14, subdivisionDensity: 1, keystoneSize: 0.45 },
    ribCount: 8,
    bayRatioX: 1,
    bayRatioY: 1,
  },
  "Fan Vault": {
    pattern: "Rib-aligned",
    params: { span: 20, rise: 16, length: 20, thickness: 0.72, courseCount: 18, blockCount: 14, subdivisionDensity: 1, keystoneSize: 0.55 },
    ribCount: 12,
  },
  "Lierne Vault": {
    pattern: "Hex / NGon",
    params: { span: 22, rise: 13, length: 22, thickness: 0.78, courseCount: 18, blockCount: 16, subdivisionDensity: 1, keystoneSize: 0.55 },
    ribCount: 10,
    lierneDensity: 0.52,
  },
  "Net Vault": {
    pattern: "Hex / NGon",
    params: { span: 22, rise: 13, length: 22, thickness: 0.8, courseCount: 18, blockCount: 16, subdivisionDensity: 1, keystoneSize: 0.58 },
    netFrequency: 8,
  },
  "Catalan Vault": {
    pattern: "Running bond",
    params: { span: 20, rise: 8, length: 24, thickness: 0.54, courseCount: 22, blockCount: 24, subdivisionDensity: 1.1, keystoneSize: 0.24 },
    tileLayers: 3,
  },
  "Guastavino Vault": {
    pattern: "Running bond",
    params: { span: 24, rise: 9, length: 28, thickness: 0.5, courseCount: 24, blockCount: 26, subdivisionDensity: 1.15, keystoneSize: 0.2 },
    tileLayers: 3,
  },
  "Custom Imported Rhino Surface": {
    pattern: "Hex / NGon",
    params: { thickness: 0.75, courseCount: 20, blockCount: 22, subdivisionDensity: 1.15 },
  },
};
const vaultStartupSeen = new Set(["Barrel Vault"]);
const referencePresets = {
  Custom: null,
  "Aqueduc Barrel Stereotomy": {
    vaultType: "Barrel Vault",
    pattern: "Running bond",
    params: { span: 26, rise: 12, length: 30, thickness: 1.25, courseCount: 16, blockCount: 14, subdivisionDensity: 1.1, keystoneSize: 0.35 },
    cubeScale: 1,
    arrayU: 1,
    arrayV: 1,
  },
  "Groined Plate XXIV": {
    vaultType: "Groin Vault",
    pattern: "Radial joints",
    params: { span: 24, rise: 12, length: 24, thickness: 1.1, courseCount: 20, blockCount: 16, subdivisionDensity: 1.15, keystoneSize: 0.45 },
    cubeScale: 1,
    arrayU: 1,
    arrayV: 1,
  },
  "Arc de Cloitre": {
    vaultType: "Cloister Vault",
    pattern: "Rib-aligned",
    params: { span: 24, rise: 10, length: 24, thickness: 0.95, courseCount: 14, blockCount: 12, subdivisionDensity: 1, keystoneSize: 0.55 },
    cubeScale: 1,
    arrayU: 1,
    arrayV: 1,
  },
  "Fan Vault Bath": {
    vaultType: "Fan Vault",
    pattern: "Rib-aligned",
    params: { span: 22, rise: 18, length: 22, thickness: 0.9, courseCount: 24, blockCount: 22, subdivisionDensity: 1.2, keystoneSize: 0.5 },
    cubeScale: 1,
    arrayU: 2,
    arrayV: 1,
  },
  "Catalan Running Bond": {
    vaultType: "Catalan Vault",
    pattern: "Running bond",
    params: { span: 20, rise: 7, length: 26, thickness: 0.55, courseCount: 18, blockCount: 20, subdivisionDensity: 1.1, keystoneSize: 0.2 },
    cubeScale: 1,
    arrayU: 1,
    arrayV: 1,
  },
  "Guastavino Thin Tile": {
    vaultType: "Guastavino Vault",
    pattern: "Running bond",
    params: { span: 26, rise: 10, length: 30, thickness: 0.5, courseCount: 22, blockCount: 24, subdivisionDensity: 1.2, keystoneSize: 0.2 },
    cubeScale: 1,
    arrayU: 1,
    arrayV: 1,
  },
  "Lierne Gothic Nodework": {
    vaultType: "Lierne Vault",
    pattern: "Hex / NGon",
    params: { span: 22, rise: 14, length: 22, thickness: 0.85, courseCount: 22, blockCount: 22, subdivisionDensity: 1.25, keystoneSize: 0.6 },
    cubeScale: 1,
    arrayU: 1,
    arrayV: 1,
  },
  "Net Vault Lattice": {
    vaultType: "Net Vault",
    pattern: "Hex / NGon",
    params: { span: 22, rise: 13, length: 22, thickness: 0.9, courseCount: 24, blockCount: 24, subdivisionDensity: 1.3, keystoneSize: 0.6 },
    cubeScale: 1,
    arrayU: 1,
    arrayV: 1,
  },
};

const nodes = {
  layout2d: byId("layout2d"),
  metrics: byId("metrics"),
  warnings: byId("warnings"),
  inspector: byId("inspector"),
  viewModes: byId("viewModes"),
  precedentDetails: byId("precedentDetails"),
  workflowSteps: byId("workflowSteps"),
  formDiagram: byId("formDiagram"),
  forceDiagram: byId("forceDiagram"),
  diagramMode: byId("diagramMode"),
  toolTabs: byId("toolTabs"),
  pipelineStatus: byId("pipelineStatus"),
};

byId("vaultType").innerHTML = vaultTypes.map((v) => `<option>${v}</option>`).join("");
byId("subdivision").innerHTML = patterns.map((v) => `<option>${v}</option>`).join("");
nodes.viewModes.innerHTML = viewModes.map((v) => `<button data-mode="${v}">${v}</button>`).join("");
[...nodes.viewModes.querySelectorAll("button")][0]?.classList.add("active");

const setToolTab = (tab) => {
  if (!nodes.toolTabs) return;
  [...nodes.toolTabs.querySelectorAll("button[data-tab]")].forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll("[data-tool-group]").forEach((section) => {
    section.classList.toggle("tab-hidden", section.getAttribute("data-tool-group") !== tab);
  });
};

const setPipelineStatus = (txt) => {
  if (nodes.pipelineStatus) nodes.pipelineStatus.textContent = txt;
};

const runPipelineStage = (stage) => {
  state.pipelineStage = stage;
  if (stage === 1) {
    state.customPatternSource = "UV Form Grid";
    if (byId("customPatternSource")) byId("customPatternSource").value = state.customPatternSource;
    setPipelineStatus("Stage 1: traced form/force guides from current surface.");
  }
  if (stage === 2) {
    state.customPatternSource = "Imported 2D Layout";
    if (byId("customPatternSource")) byId("customPatternSource").value = state.customPatternSource;
    setPipelineStatus("Stage 2: intrados cut network generated.");
  }
  if (stage === 3) {
    state.extradosOffset = Math.max(0.08, state.extradosOffset);
    if (byId("extradosOffset")) byId("extradosOffset").value = String(state.extradosOffset);
    setPipelineStatus("Stage 3: cuts projected to extrados.");
  }
  if (stage === 4) {
    state.customPatternSource = "NGon Adaptive";
    if (byId("customPatternSource")) byId("customPatternSource").value = state.customPatternSource;
    state.forceLmin *= 0.95;
    state.forceLmax *= 1.05;
    if (byId("forceLmin")) byId("forceLmin").value = state.forceLmin.toFixed(2);
    if (byId("forceLmax")) byId("forceLmax").value = state.forceLmax.toFixed(2);
    setPipelineStatus("Stage 4: concave transition cleanup pass applied.");
  }
  if (stage === 5) {
    runChecksAndAssemblyPreview();
    setPipelineStatus("Stage 5: assembly/tolerance checks complete.");
  }
  rebuild();
};

const runChecksAndAssemblyPreview = () => {
  state.constraints.fabTolerance = Math.max(0.003, state.constraints.fabTolerance);
};

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1b2330, 0.012);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
camera.position.set(20, 14, 26);
const renderer = new THREE.WebGLRenderer({ canvas: byId("viewport"), antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.enableZoom = false;
controls.enableRotate = true;
controls.zoomSpeed = 1.35;
controls.panSpeed = 1.1;
controls.minDistance = 0.05;
controls.maxDistance = 10000;
controls.screenSpacePanning = true;
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
renderer.domElement.style.touchAction = "none";
const ambient = new THREE.AmbientLight(0xffffff, 0.58);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x141b28, 0.4);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xb6d9ff, 1.18);
const fill = new THREE.DirectionalLight(0x9cc7ff, 0.45);
const rim = new THREE.DirectionalLight(0xffffff, 0.35);
scene.add(key);
scene.add(fill);
scene.add(rim);
const gridHelper = new THREE.GridHelper(120, 60, 0x324f69, 0x1c2c39);
const axesHelper = new THREE.AxesHelper(6);
scene.add(gridHelper);
scene.add(axesHelper);
const bboxHelpersGroup = new THREE.Group();
const lightRigHelpers = new THREE.Group();
lightRigHelpers.visible = false;
lightRigHelpers.add(new THREE.DirectionalLightHelper(key, 2.4, 0xff8fe5));
lightRigHelpers.add(new THREE.DirectionalLightHelper(fill, 2.4, 0x9ad0ff));
lightRigHelpers.add(new THREE.DirectionalLightHelper(rim, 2.4, 0xffd47f));
scene.add(lightRigHelpers);
scene.add(bboxHelpersGroup);

const applyLightingPreset = (preset) => {
  state.lightingPreset = preset;
  if (preset === "Studio Soft") {
    scene.background = new THREE.Color(0x243041);
    scene.fog = new THREE.FogExp2(0x1b2634, 0.01);
    ambient.intensity = 0.62;
    renderer.toneMappingExposure = 1.18;
    hemi.color.set(0xcfe6ff); hemi.groundColor.set(0x121822); hemi.intensity = 0.45;
    key.color.set(0xbfe0ff); key.intensity = 1.05; key.position.set(18, 28, 12);
    fill.color.set(0x9ec8ff); fill.intensity = 0.48; fill.position.set(-16, 13, 18);
    rim.color.set(0xffffff); rim.intensity = 0.30; rim.position.set(0, 10, -24);
  } else if (preset === "Three-Point") {
    scene.background = new THREE.Color(0x273243);
    scene.fog = new THREE.FogExp2(0x1f2a39, 0.009);
    ambient.intensity = 0.64;
    renderer.toneMappingExposure = 1.2;
    hemi.color.set(0xd6e8ff); hemi.groundColor.set(0x131a25); hemi.intensity = 0.28;
    key.color.set(0xffffff); key.intensity = 1.25; key.position.set(22, 24, 16);
    fill.color.set(0xaed3ff); fill.intensity = 0.62; fill.position.set(-22, 10, 6);
    rim.color.set(0xffffff); rim.intensity = 0.68; rim.position.set(0, 20, -26);
  } else if (preset === "Clay Neutral") {
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.FogExp2(0x161616, 0.018);
    ambient.intensity = 0.42;
    renderer.toneMappingExposure = 0.98;
    hemi.color.set(0xe8e8e8); hemi.groundColor.set(0x1a1a1a); hemi.intensity = 0.35;
    key.color.set(0xffffff); key.intensity = 1.10; key.position.set(16, 24, 14);
    fill.color.set(0xffffff); fill.intensity = 0.35; fill.position.set(-12, 10, 8);
    rim.color.set(0xf2f2f2); rim.intensity = 0.25; rim.position.set(6, 14, -20);
  } else if (preset === "Overcast Daylight") {
    scene.background = new THREE.Color(0xaeb9c7);
    scene.fog = new THREE.FogExp2(0xaab6c4, 0.012);
    ambient.intensity = 0.55;
    renderer.toneMappingExposure = 1.12;
    hemi.color.set(0xf2f6ff); hemi.groundColor.set(0x6e7886); hemi.intensity = 0.7;
    key.color.set(0xf5f8ff); key.intensity = 0.62; key.position.set(12, 30, 10);
    fill.color.set(0xe4ecff); fill.intensity = 0.52; fill.position.set(-14, 18, 12);
    rim.color.set(0xdde8ff); rim.intensity = 0.2; rim.position.set(0, 12, -18);
  } else if (preset === "Sunset Rim") {
    scene.background = new THREE.Color(0x241820);
    scene.fog = new THREE.FogExp2(0x1f1620, 0.02);
    ambient.intensity = 0.3;
    renderer.toneMappingExposure = 1.05;
    hemi.color.set(0xffd2a6); hemi.groundColor.set(0x22161a); hemi.intensity = 0.32;
    key.color.set(0xffb37a); key.intensity = 0.95; key.position.set(-18, 16, 16);
    fill.color.set(0xa6b9ff); fill.intensity = 0.42; fill.position.set(18, 8, 6);
    rim.color.set(0xffd0b0); rim.intensity = 0.9; rim.position.set(0, 12, -28);
  }
  lightRigHelpers.visible = !!state.display.latticeControls;
};

const blockGroup = new THREE.Group();
const importedSurfaceGroup = new THREE.Group();
scene.add(blockGroup);
scene.add(importedSurfaceGroup);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const objLoader = new OBJLoader();
const stlLoader = new STLLoader();
const gltfLoader = new GLTFLoader();

const precedentDb = {
  "Barrel Vault": {
    historicalReferences: [
      { title: "Britannica: Barrel Vault", url: "https://www.britannica.com/technology/barrel-vault" },
      { title: "Wikipedia: Barrel Vault", url: "https://en.wikipedia.org/wiki/Barrel_vault" },
    ],
    blockLogic: "Longitudinal voussoir courses with repeated arch rings.",
    jointPatterns: "Radial bed joints, longitudinal running joints.",
    constructionMethods: "Centering/formwork with sequential ring closure from springing lines.",
  },
  "Groin Vault": {
    historicalReferences: [
      { title: "Britannica: Groin Vault", url: "https://www.britannica.com/technology/groin-vault" },
      { title: "Wikipedia: Groin Vault", url: "https://en.wikipedia.org/wiki/Groin_vault" },
    ],
    blockLogic: "Intersection of two barrel systems with emphasized arrises.",
    jointPatterns: "Diagonal groin seams plus transverse arch courses.",
    constructionMethods: "Four-bay centering with groin arris control and phased quadrant completion.",
  },
  "Cloister Vault": {
    historicalReferences: [
      { title: "Wikipedia: Cloister Vault", url: "https://en.wikipedia.org/wiki/Cloister_vault" },
      { title: "Britannica: Vault (overview)", url: "https://www.britannica.com/technology/vault-architecture" },
    ],
    blockLogic: "Four curved triangular sectors rising to a central apex.",
    jointPatterns: "Meridian-like seams from corners to apex.",
    constructionMethods: "Corner-guided centering; sector-by-sector closure.",
  },
  "Sail Vault": {
    historicalReferences: [
      { title: "ISPRS: Sail Vault Survey", url: "https://isprs-archives.copernicus.org/articles/XLII-2-W15/139/2019/isprs-archives-XLII-2-W15-139-2019.pdf" },
      { title: "Wikipedia: Dome (sail geometry note)", url: "https://en.wikipedia.org/wiki/Dome" },
    ],
    blockLogic: "Square-based domical surface with billowed infill between corner supports.",
    jointPatterns: "Curvilinear seams following principal curvature from corners.",
    constructionMethods: "Corner springing geometry and infill webbing toward crown.",
  },
  Dome: {
    historicalReferences: [
      { title: "Britannica: Dome", url: "https://www.britannica.com/technology/dome-architecture" },
      { title: "Wikipedia: Dome", url: "https://en.wikipedia.org/wiki/Dome" },
    ],
    blockLogic: "Ring courses with progressively shorter crown voussoirs.",
    jointPatterns: "Radial meridians and circumferential rings.",
    constructionMethods: "Circular centering/ring progression with compression locking at crown.",
  },
  "Rib Vault": {
    historicalReferences: [
      { title: "Britannica: Rib Vault", url: "https://www.britannica.com/technology/rib-vault" },
      { title: "Wikipedia: Rib Vault", url: "https://en.wikipedia.org/wiki/Rib_vault" },
    ],
    blockLogic: "Primary rib skeleton with lighter web infill blocks.",
    jointPatterns: "Rib-aligned seams + web panels between ribs.",
    constructionMethods: "Erect ribs first, then web infill between rib guides.",
  },
  "Fan Vault": {
    historicalReferences: [
      { title: "Wikipedia: Fan Vault", url: "https://en.wikipedia.org/wiki/Fan_vault" },
      { title: "Britannica: Gothic Vault context", url: "https://www.britannica.com/art/Western-architecture/Early-Gothic" },
    ],
    blockLogic: "Conoid fans springing from clustered supports.",
    jointPatterns: "Equal-curve rib fans with circumferential ties.",
    constructionMethods: "Template-based repetitive conoids and decorative/ribbed intersections.",
  },
  "Lierne Vault": {
    historicalReferences: [
      { title: "Wikipedia: Lierne Vault", url: "https://en.wikipedia.org/wiki/Lierne_%28vault%29" },
      { title: "Wikipedia: Rib Vault", url: "https://en.wikipedia.org/wiki/Rib_vault" },
    ],
    blockLogic: "Rib vault with tertiary lierne connectors between major ribs.",
    jointPatterns: "Star/stellar rib intersections and short linking joints.",
    constructionMethods: "Primary ribs first, secondary lierne network added for pattern/stiffening.",
  },
  "Net Vault": {
    historicalReferences: [
      { title: "Springer: Late Gothic Net Vaults", url: "https://link.springer.com/article/10.1007/s00004-024-00780-1" },
      { title: "Wikipedia: Vault (architecture)", url: "https://en.wikipedia.org/wiki/Vault_%28architecture%29" },
    ],
    blockLogic: "Dense rib lattice generating net-like rhombic fields.",
    jointPatterns: "Interwoven diagonal rib seams across entire intrados.",
    constructionMethods: "Geometric rib layout from repeating arc families and node bosses.",
  },
  "Catalan Vault": {
    historicalReferences: [
      { title: "Wikipedia: Catalan Vault", url: "https://en.wikipedia.org/wiki/Catalan_vault" },
      { title: "Britannica: Vault overview", url: "https://www.britannica.com/technology/vault-architecture" },
    ],
    blockLogic: "Thin tile/brick layers forming shallow compression shells.",
    jointPatterns: "Overlapping tile joints with staggered bonding.",
    constructionMethods: "Fast-set mortar with layered thin tiles, often minimal centering.",
  },
  "Guastavino Vault": {
    historicalReferences: [
      { title: "Wikipedia: Guastavino Tile", url: "https://en.wikipedia.org/wiki/Guastavino_tile" },
      { title: "Wikipedia: Catalan Vault", url: "https://en.wikipedia.org/wiki/Catalan_vault" },
    ],
    blockLogic: "American timbrel tile vaulting derived from Catalan systems.",
    jointPatterns: "Multi-layer thin-tile seams with offset bonds.",
    constructionMethods: "Layered terracotta tile and mortar, fireproofing-focused structural tile system.",
  },
  "Custom Imported Rhino Surface": {
    historicalReferences: [],
    blockLogic: "User-defined logic from imported surfaces.",
    jointPatterns: "User-defined pattern mapping.",
    constructionMethods: "Digital registration and mapped fabrication workflow.",
  },
};

const barrelVaultPoint = (u, v) => {
  const { span, rise, length } = state.params;
  const scale = state.cubeScale;
  const sSpan = span * scale;
  const sRise = rise * scale;
  const sLength = length * scale;
  const x = (u - 0.5) * sSpan;
  const z = (v - 0.5) * sLength;
  const springFactor = Math.cos((state.springingAngle * Math.PI) / 180) || 1;
  const y = sRise * springFactor * Math.sqrt(Math.max(0, 1 - (x / (sSpan * 0.5)) ** 2));
  return new THREE.Vector3(x, y, z);
};
const vaultEvaluators = {
  "Barrel Vault": barrelVaultPoint,
  "Groin Vault": (u, v) => {
    const { span, rise, length } = state.params;
    const x = (u - 0.5) * span * state.bayRatioX;
    const z = (v - 0.5) * length * state.bayRatioY;
    const yx = rise * Math.sqrt(Math.max(0, 1 - (x / (span * 0.5)) ** 2));
    const yz = rise * Math.sqrt(Math.max(0, 1 - (z / (length * 0.5)) ** 2));
    const groin = Math.min(yx, yz);
    // Mallorcan-inspired morph toward smoother elliptical transitions.
    const nx = x / Math.max(0.001, span * 0.5);
    const nz = z / Math.max(0.001, length * 0.5);
    const elliptic = rise * Math.sqrt(Math.max(0, 1 - 0.55 * nx * nx - 0.55 * nz * nz));
    const y = THREE.MathUtils.lerp(groin, elliptic, clamp(state.groinMorph, 0, 1));
    return new THREE.Vector3(x, y, z);
  },
  "Cloister Vault": (u, v) => {
    const { span, rise, length } = state.params;
    const x = (u - 0.5) * span * state.bayRatioX;
    const z = (v - 0.5) * length * state.bayRatioY;
    const yx = rise * (1 - Math.abs(x) / (span * 0.5));
    const yz = rise * (1 - Math.abs(z) / (length * 0.5));
    return new THREE.Vector3(x, Math.max(0, Math.min(yx, yz)), z);
  },
  "Sail Vault": (u, v) => {
    const { span, rise, length } = state.params;
    const x = (u - 0.5) * span * state.bayRatioX;
    const z = (v - 0.5) * length * state.bayRatioY;
    const nx = x / (span * 0.5);
    const nz = z / (length * 0.5);
    const y = rise * Math.sqrt(Math.max(0, (1 - nx * nx) * (1 - nz * nz)));
    return new THREE.Vector3(x, y, z);
  },
  Dome: (u, v) => {
    const { span, rise } = state.params;
    const r = span * 0.5;
    const theta = u * Math.PI * 2;
    const phi = v * (Math.PI * 0.5);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const z = r * Math.sin(phi) * Math.sin(theta);
    const y = rise * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  },
  "Rib Vault": (u, v) => {
    const base = vaultEvaluators["Groin Vault"](u, v);
    const ribN = Math.max(2, state.ribCount);
    const rib = Math.max(Math.exp(-(30 + ribN * 3) * (u - v) ** 2), Math.exp(-(30 + ribN * 3) * ((u + v) - 1) ** 2));
    base.y += rib * state.params.rise * 0.12;
    return base;
  },
  "Fan Vault": (u, v) => {
    const { span, rise, length } = state.params;
    const x = (u - 0.5) * span;
    const z = (v - 0.5) * length;
    const rr = Math.sqrt((Math.abs(x) / (span * 0.5)) ** 2 + (Math.abs(z) / (length * 0.5)) ** 2);
    const sectors = Math.max(3, state.ribCount);
    const scallop = 1 + 0.08 * Math.cos(sectors * Math.atan2(z, x));
    const y = Math.max(0, rise * (1 - rr ** 0.8) * scallop);
    return new THREE.Vector3(x, y, z);
  },
  "Lierne Vault": (u, v) => {
    const base = vaultEvaluators["Rib Vault"](u, v);
    const d = 4 + Math.round(state.lierneDensity * 18);
    base.y += state.params.rise * 0.04 * Math.sin(d * Math.PI * u) * Math.sin(d * Math.PI * v);
    return base;
  },
  "Net Vault": (u, v) => {
    const base = vaultEvaluators["Groin Vault"](u, v);
    const f = Math.max(1, state.netFrequency);
    base.y += state.params.rise * 0.06 * Math.sin(f * Math.PI * (u + v)) * Math.cos(f * Math.PI * (u - v));
    return base;
  },
  "Catalan Vault": (u, v) => {
    const { span, rise, length } = state.params;
    const x = (u - 0.5) * span;
    const z = (v - 0.5) * length;
    const nx = x / (span * 0.5);
    const y = Math.max(0, rise * (1 - nx * nx) * 0.62);
    return new THREE.Vector3(x, y, z);
  },
  "Guastavino Vault": (u, v) => {
    const { span, rise, length } = state.params;
    const x = (u - 0.5) * span;
    const z = (v - 0.5) * length;
    const r = span * 0.5;
    const k = 1.2;
    const y = rise * ((Math.cosh(k) - Math.cosh((k * x) / r)) / (Math.cosh(k) - 1)) * 0.7;
    return new THREE.Vector3(x, Math.max(0, y), z);
  },
  "Custom Imported Rhino Surface": barrelVaultPoint,
};

const clearGroup = (group) => {
  while (group.children.length) {
    const child = group.children.pop();
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
    if (child.parent) child.parent.remove(child);
  }
};

const parseSvgPolys = (text) => {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const polys = [];
  doc.querySelectorAll("polygon,polyline").forEach((el) => {
    const pts = (el.getAttribute("points") || "").trim().split(/\s+/).map((p) => p.split(",").map(Number)).filter((xy) => xy.length === 2 && !Number.isNaN(xy[0]));
    if (pts.length >= 4) polys.push(pts);
  });
  doc.querySelectorAll("rect").forEach((r) => {
    const x = Number(r.getAttribute("x") || 0);
    const y = Number(r.getAttribute("y") || 0);
    const w = Number(r.getAttribute("width") || 0);
    const h = Number(r.getAttribute("height") || 0);
    if (w > 0 && h > 0) polys.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
  });
  return polys;
};

const parseDxfPolys = (text) => {
  const lines = text.split(/\r?\n/);
  const polys = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].trim() === "0" && lines[i + 1].trim() === "LWPOLYLINE") {
      const pts = [];
      i += 2;
      while (i < lines.length - 1 && lines[i].trim() !== "0") {
        const code = lines[i].trim();
        const val = lines[i + 1].trim();
        if (code === "10") {
          const x = Number(val);
          const yIdx = i + 2;
          if (lines[yIdx]?.trim() === "20") {
            const y = Number(lines[yIdx + 1].trim());
            pts.push([x, y]);
          }
        }
        i += 2;
      }
      if (pts.length >= 4) polys.push(pts);
    }
  }
  return polys;
};

const normalizePolysToUv = (polys) => {
  const all = polys.flat();
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const dx = Math.max(1e-9, maxX - minX);
  const dy = Math.max(1e-9, maxY - minY);
  return polys.map((poly) => poly.map(([x, y]) => [(x - minX) / dx, (y - minY) / dy]));
};

const applyAlign = ([u, v]) => {
  const a = state.align;
  const angle = (a.rotationDeg * Math.PI) / 180;
  const cu = u - 0.5;
  const cv = v - 0.5;
  const ru = cu * Math.cos(angle) - cv * Math.sin(angle);
  const rv = cu * Math.sin(angle) + cv * Math.cos(angle);
  const uu = ru * a.scale + 0.5 + a.offsetU;
  const vv = rv * a.scale + 0.5 + a.offsetV;
  const cyclicU = state.vaultType === "Dome";
  return [cyclicU ? wrap01(uu) : clamp(uu, 0, 1), clamp(vv, 0, 1)];
};

const lineIntersection2d = (a1, a2, b1, b2) => {
  const dax = a2.x - a1.x;
  const day = a2.y - a1.y;
  const dbx = b2.x - b1.x;
  const dby = b2.y - b1.y;
  const den = dax * dby - day * dbx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((b1.x - a1.x) * dby - (b1.y - a1.y) * dbx) / den;
  return { x: a1.x + t * dax, y: a1.y + t * day };
};

const insetQuadMiterUv = (uv, insetMeters) => {
  const sx = Math.max(0.001, state.params.span);
  const sy = Math.max(0.001, state.params.length);
  const pts = uv.map(([u, v]) => ({ x: u * sx, y: v * sy }));
  let area2 = 0;
  for (let i = 0; i < 4; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    area2 += a.x * b.y - b.x * a.y;
  }
  const ccw = area2 > 0;
  const off = [];
  for (let i = 0; i < 4; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const len = Math.hypot(ex, ey);
    if (len < 1e-9) return uv;
    const nx = ccw ? -ey / len : ey / len;
    const ny = ccw ? ex / len : -ex / len;
    off.push([{ x: a.x + nx * insetMeters, y: a.y + ny * insetMeters }, { x: b.x + nx * insetMeters, y: b.y + ny * insetMeters }]);
  }
  const out = [];
  for (let i = 0; i < 4; i++) {
    const lPrev = off[(i + 3) % 4];
    const lNext = off[i];
    const p = lineIntersection2d(lPrev[0], lPrev[1], lNext[0], lNext[1]);
    if (!p) return uv;
    out.push([clamp(p.x / sx, 0, 1), clamp(p.y / sy, 0, 1)]);
  }
  return out;
};

const getVaultPoint = (u, v) => {
  const useImportedSurface =
    state.designMode === "Custom Import" &&
    state.vaultType === "Custom Imported Rhino Surface" &&
    state.importedSurface;
  if (useImportedSurface) {
    const bbox = state.importedSurfaceBbox;
    if (!bbox) return barrelVaultPoint(u, v);
    const x = THREE.MathUtils.lerp(bbox.min.x, bbox.max.x, u);
    const z = THREE.MathUtils.lerp(bbox.min.z, bbox.max.z, v);
    const origin = new THREE.Vector3(x, bbox.max.y + 5, z);
    const dir = new THREE.Vector3(0, -1, 0);
    raycaster.set(origin, dir);
    const hit = raycaster.intersectObject(state.importedSurface, true)[0];
    if (hit) return hit.point.clone();
    return new THREE.Vector3(x, bbox.max.y, z);
  }
  return (vaultEvaluators[state.vaultType] || barrelVaultPoint)(u, v);
};

const generatePatternBlocks = () => {
  const physicalJoint = state.jointMode === "Physical cut";
  const conforming2D = true;
  if (state.designMode === "Custom Import") {
    if (state.customPatternSource === "Imported 2D Layout" && state.imported2DPolys?.length) {
      return state.imported2DPolys.map((poly, i) => {
        const transformed = poly.map(applyAlign);
        const quad = transformed.length >= 4 ? [transformed[0], transformed[1], transformed[2], transformed[3]] : null;
        if (!quad) return null;
        return { id: `I-${i + 1}`, uv: quad };
      }).filter(Boolean);
    }

    const rows = Math.max(2, Math.floor(state.params.courseCount * state.params.subdivisionDensity));
    const cols = Math.max(2, Math.floor(state.params.blockCount * state.params.subdivisionDensity));
    const out = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let u0 = c / cols;
        let u1 = (c + 1) / cols;
        let v0 = r / rows;
        let v1 = (r + 1) / rows;
        if (state.customPatternSource === "NGon Adaptive") {
          const cu = (u0 + u1) * 0.5;
          const cv = (v0 + v1) * 0.5;
          const warp = 0.05 * Math.sin(cu * Math.PI * 8) * Math.cos(cv * Math.PI * 8);
          u0 += warp * 0.5;
          u1 -= warp * 0.5;
          v0 += warp * 0.3;
          v1 -= warp * 0.3;
        }
        const localGap = physicalJoint ? clamp(state.constraints.jointGap, state.forceLmin * 0.03, state.forceLmax * 0.15) : 0;
        let uv = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
        if (physicalJoint && localGap > 0) uv = insetQuadMiterUv(uv, localGap);
        out.push({
          id: `C-${r + 1}-${c + 1}`,
          uv: uv.map(applyAlign),
        });
      }
    }
    return out;
  }

  const density = state.params.subdivisionDensity;
  const rows = Math.max(2, Math.floor(state.params.courseCount * density * Math.max(1, state.arrayV)));
  const cols = Math.max(2, Math.floor(state.params.blockCount * density * Math.max(1, state.arrayU)));
  const blocks = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let u0 = c / cols;
      let u1 = (c + 1) / cols;
      let v0 = r / rows;
      let v1 = (r + 1) / rows;
      if (state.pattern === "Running bond" && r % 2) { u0 += 0.5 / cols; u1 += 0.5 / cols; }
      if (state.pattern === "Diagonal joints") { const sk = (r / rows - 0.5) * (0.6 / cols); u0 += sk; u1 += sk; }
      if (state.pattern === "Radial joints") { u0 = Math.pow(c / cols, 0.92); u1 = Math.pow((c + 1) / cols, 0.92); }
      if (state.pattern === "Rib-aligned" && !conforming2D) {
        const ribLines = Math.max(3, Math.floor(state.ribCount || 8));
        const center = (u0 + u1) * 0.5;
        const phase = 0.5 * (1 + Math.sin((r / Math.max(1, rows - 1)) * Math.PI));
        const target = Math.round(center * (ribLines - 1)) / (ribLines - 1);
        const shift = (target - center) * (0.18 + 0.22 * phase);
        u0 += shift;
        u1 += shift;
      }
      if (state.vaultType === "Groin Vault" && !conforming2D) {
        // Push seams toward groin arrises like classical groined drawings.
        const diag = (r + c) % 2 ? 0.12 : -0.12;
        const sk = diag / Math.max(rows, cols);
        u0 += sk;
        u1 += sk;
        // Mallorcan cue: L-shaped tie tendency near corner+groin transitions.
        const edgeU = Math.min((c + 0.5) / cols, 1 - (c + 0.5) / cols);
        const edgeV = Math.min((r + 0.5) / rows, 1 - (r + 0.5) / rows);
        const cornerness = 1 - clamp((edgeU + edgeV) * 2.4, 0, 1);
        const lBias = state.lInterlockBias * cornerness * 0.18 / Math.max(rows, cols);
        u0 -= lBias;
        v0 += lBias * 0.6;
      }
      if ((state.vaultType === "Cloister Vault" || state.vaultType === "Sail Vault") && !conforming2D) {
        // Corner-fan behavior: denser wedge-like seams toward corners.
        const vv = (r + 0.5) / rows;
        const taper = 1 - Math.abs(vv - 0.5) * 1.6;
        const w = (u1 - u0) * clamp(taper, 0.55, 1);
        const mid = (u0 + u1) * 0.5;
        u0 = mid - w * 0.5;
        u1 = mid + w * 0.5;
      }
      if (state.vaultType === "Fan Vault" && !conforming2D) {
        const fanCenter = 0.5;
        const d = Math.abs((u0 + u1) * 0.5 - fanCenter);
        const fanBias = 1 - clamp(d * 2, 0, 1);
        const sk = fanBias * (0.14 / cols) * (r / rows);
        u0 -= sk;
        u1 += sk;
      }
      let pad = 0;
      if (state.pattern === "Hex / NGon" && !conforming2D) {
        const wave = Math.sin((u0 + u1) * Math.PI * 3) * Math.sin((v0 + v1) * Math.PI * 2.5);
        pad = clamp(Math.abs(wave) * 0.02, 0, 0.03);
      }
      if (state.pattern === "Keystone zones" && !conforming2D) {
        const centerU = (u0 + u1) / 2;
        const bias = 1 - Math.abs(wrap01(centerU) - 0.5) * 2;
        pad = clamp(state.params.keystoneSize * 0.08 * bias, 0, 0.04);
      }
      const minBand = 0.22 / cols;
      const mid = (u0 + u1) * 0.5;
      if (u1 - u0 < minBand) {
        u0 = mid - minBand * 0.5;
        u1 = mid + minBand * 0.5;
      }
      if (u0 < 0) { u1 -= u0; u0 = 0; }
      if (u1 > 1) { u0 -= (u1 - 1); u1 = 1; }
      const supportTightness = state.supportTopology === "continuous walls" ? 1 : state.supportTopology === "4 corners" ? 0.85 : 0.75;
      const localGap = physicalJoint ? state.constraints.jointGap * supportTightness : 0;
      let uv = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
      if (physicalJoint && localGap > 0) uv = insetQuadMiterUv(uv, localGap);
      uv = uv.map(applyAlign);
      blocks.push({ id: `B-${r + 1}-${c + 1}`, uv });
    }
  }
  return blocks;
};

const buildBlockMesh = (block) => {
  const t = state.params.thickness;
  const cyclicU = state.vaultType === "Dome";
  const q = block.uv.map(([u, v]) => getVaultPoint(cyclicU ? wrap01(u) : clamp(u, 0, 1), clamp(v, 0, 1)));
  const center = q.reduce((acc, p) => acc.add(p.clone()), new THREE.Vector3()).multiplyScalar(0.25);
  const normal = q[1].clone().sub(q[0]).cross(q[3].clone().sub(q[0])).normalize();
  // Keep plan edges aligned between neighboring blocks; only offset along local normal.
  const top = q.map((p) => p.clone().addScaledVector(normal, t * 0.5));
  const bot = q.map((p) => p.clone().addScaledVector(normal, -(t * 0.5 + state.extradosOffset)));
  const vertices = [...top, ...bot];
  const index = [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0];
  const pos = new Float32Array(vertices.length * 3);
  vertices.forEach((v, i) => { pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const edges = [q[0].distanceTo(q[1]), q[1].distanceTo(q[2]), q[2].distanceTo(q[3]), q[3].distanceTo(q[0])];
  const avgLength = (edges[0] + edges[2]) / 2;
  const avgWidth = (edges[1] + edges[3]) / 2;
  const volume = avgLength * avgWidth * state.params.thickness;
  const weight = volume * densityKgPerM3;
  return { geometry, q, avgLength, avgWidth, volume, weight, minEdge: Math.min(...edges) };
};

const validate = (m) => {
  const c = state.constraints;
  const failed = [];
  if (m.avgLength > c.maxLength + c.fabTolerance) failed.push("length");
  if (m.avgWidth > c.maxWidth + c.fabTolerance) failed.push("width");
  if (state.params.thickness < c.minThickness) failed.push("thickness");
  if (m.weight > c.maxWeight) failed.push("weight");
  if (c.taperAngle > c.maxTaper) failed.push("taper");
  if (m.minEdge < c.minEdgeLength) failed.push("min-edge");
  if (c.bedDepth < c.jointGap * 4) failed.push("bed-depth");
  return failed;
};

const draw2d = () => {
  const margin = 24;
  const iw = 952;
  const ih = 652;
  const lines = [];
  if (state.display.baseGrid) {
    for (let gx = 0; gx <= 1000; gx += 20) {
      const major = gx % 100 === 0;
      lines.push(`<line x1="${gx}" y1="0" x2="${gx}" y2="700" stroke="${major ? "rgba(173,215,255,0.28)" : "rgba(173,215,255,0.1)"}" stroke-width="${major ? 1.2 : 0.7}"/>`);
    }
    for (let gy = 0; gy <= 700; gy += 20) {
      const major = gy % 100 === 0;
      lines.push(`<line x1="0" y1="${gy}" x2="1000" y2="${gy}" stroke="${major ? "rgba(173,215,255,0.28)" : "rgba(173,215,255,0.1)"}" stroke-width="${major ? 1.2 : 0.7}"/>`);
    }
  }
  const baseFill = state.layoutStyle === "Paper" ? "rgba(245,240,228,0.6)" : state.layoutStyle === "High Contrast" ? "rgba(8,8,8,0.5)" : state.layoutStyle === "Rhino Gray" ? "rgba(96,102,112,0.45)" : "rgba(3,10,18,0.35)";
  nodes.layout2d.setAttribute("viewBox", `${state.view2d.x} ${state.view2d.y} ${state.view2d.w} ${state.view2d.h}`);
  nodes.layout2d.innerHTML = [
    `<rect x="0" y="0" width="1000" height="700" fill="${baseFill}"/>`,
    ...lines,
    ...state.blocks.map((b) => {
      const pts = b.uv.map(([u, v]) => `${(margin + wrap01(u) * iw).toFixed(2)},${(margin + v * ih).toFixed(2)}`).join(" ");
      const bad = b.failed.length ? " invalid" : "";
      const sel = state.selectedBlockId === b.id ? " selected" : "";
      const handles = b.uv.map(([u, v], i) => `<circle class="uv-handle${sel}" data-id="${b.id}" data-vertex="${i}" cx="${(margin + wrap01(u) * iw).toFixed(2)}" cy="${(margin + v * ih).toFixed(2)}" r="4"/>`).join("");
      return `<g><polygon class="block2d${bad}${sel}" data-id="${b.id}" points="${pts}"/>${handles}</g>`;
    }),
  ].join("");
};

const renderFormForceDiagrams = () => {
  if (!nodes.formDiagram || !nodes.forceDiagram) return;
  const lockCount = Object.values(state.forceLocks).filter(Boolean).length;
  nodes.diagramMode.textContent = `${state.designMode} | Locks ${lockCount}`;
  const blocks = state.blocks.slice(0, 220);
  if (!blocks.length) {
    nodes.formDiagram.innerHTML = "";
    nodes.forceDiagram.innerHTML = "";
    return;
  }

  const formLines = [];
  const forceLines = [];
  const heatDots = [];
  const centers = blocks.map((b) => {
    const cx = b.uv.reduce((s, p) => s + p[0], 0) / b.uv.length;
    const cy = b.uv.reduce((s, p) => s + p[1], 0) / b.uv.length;
    return [cx, cy];
  });

  const mapX = (u) => 8 + u * 224;
  const mapY = (v) => 8 + v * 104;

  for (let i = 0; i < blocks.length; i++) {
    const uv = blocks[i].uv;
    for (let k = 0; k < 4; k++) {
      const a = uv[k];
      const b = uv[(k + 1) % 4];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const edgeKey = `${i}:${k}`;
      const locked = Boolean(state.forceLocks[edgeKey]);
      const clr = locked ? "#40ffb7" : len < state.forceLmin * 0.01 ? "#ff5d5d" : len > state.forceLmax * 0.03 ? "#ffbf4d" : "#7fd7ff";
      formLines.push(`<line data-edge="${edgeKey}" x1="${mapX(a[0]).toFixed(2)}" y1="${mapY(a[1]).toFixed(2)}" x2="${mapX(b[0]).toFixed(2)}" y2="${mapY(b[1]).toFixed(2)}" stroke="${clr}" stroke-width="${locked ? 2.2 : 1}"/>`);
    }
  }

  for (let i = 0; i < centers.length; i++) {
    const [x, y] = centers[i];
    const jump = Math.max(2, Math.floor(Math.sqrt(centers.length)));
    const neigh = [i + 1, i + jump];
    neigh.forEach((j) => {
      if (!centers[j]) return;
      const [x2, y2] = centers[j];
      const dx = x2 - x;
      const dy = y2 - y;
      const d = Math.hypot(dx, dy);
      const midTarget = (state.forceLmin + state.forceLmax) * 0.5;
      const dev = clamp(Math.abs(d - midTarget) / Math.max(0.0001, state.forceLmax - state.forceLmin), 0, 1);
      const r = Math.round(255 * dev);
      const g = Math.round(255 * (1 - dev));
      const clr = `rgb(${r},${g},120)`;
      // Reciprocal-style sketch: rotate edge direction by 90deg about center.
      const mx = (x + x2) * 0.5;
      const my = (y + y2) * 0.5;
      const rx = -dy * 0.35;
      const ry = dx * 0.35;
      forceLines.push(`<line x1="${mapX(mx - rx).toFixed(2)}" y1="${mapY(my - ry).toFixed(2)}" x2="${mapX(mx + rx).toFixed(2)}" y2="${mapY(my + ry).toFixed(2)}" stroke="${clr}" stroke-width="1"/>`);
      heatDots.push(`<circle cx="${mapX(mx).toFixed(2)}" cy="${mapY(my).toFixed(2)}" r="1.8" fill="${clr}" />`);
    });
  }

  nodes.formDiagram.innerHTML = `<rect x="0" y="0" width="240" height="120" fill="transparent"/>${formLines.join("")}`;
  nodes.forceDiagram.innerHTML = `<rect x="0" y="0" width="240" height="120" fill="transparent"/>${forceLines.join("")}${heatDots.join("")}`;

  nodes.formDiagram.onclick = (ev) => {
    const line = ev.target.closest("[data-edge]");
    if (!line) return;
    const key = line.getAttribute("data-edge");
    state.forceLocks[key] = !state.forceLocks[key];
    renderFormForceDiagrams();
  };
};

const build3d = () => {
  clearGroup(blockGroup);
  state.blocks.forEach((b) => {
    const m = buildBlockMesh(b);
    b.metrics = m;
    b.failed = validate(m);
    const mesh = new THREE.Mesh(m.geometry, new THREE.MeshStandardMaterial({ color: b.failed.length ? 0xd15a5a : 0x7ab8df, roughness: 0.48, metalness: 0.08, transparent: true, opacity: 0.92 }));
    mesh.userData.blockId = b.id;
    const seam = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 16), new THREE.LineBasicMaterial({ color: 0xcff2ff, transparent: true, opacity: 0.5 }));
    seam.scale.setScalar(Math.max(0.9, 1 - state.constraints.jointGap));
    seam.name = "seam";
    mesh.add(seam);
    b.mesh = mesh;
    blockGroup.add(mesh);
  });
  applyDisplayPreset();
};

const createFoilMaterial = (color) => {
  const cold = new THREE.Color(state.foilGradient.b);
  const warm = new THREE.Color(state.foilGradient.a);
  const sheenColor = cold.clone().lerp(warm, 0.18);
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.28,
    roughness: 0.36,
    clearcoat: 0.72,
    clearcoatRoughness: 0.24,
    iridescence: 0.45,
    iridescenceIOR: 1.45,
    reflectivity: 0.9,
    sheen: 0.6,
    sheenColor,
    transmission: 0,
    transparent: true,
    opacity: 0.96,
  });
};

const getFoilGradientColor = (t) => {
  const a = new THREE.Color(state.foilGradient.a);
  const b = new THREE.Color(state.foilGradient.b);
  const u = clamp(t * 0.35 + state.foilGradient.mix * 0.65, 0, 1);
  return a.lerp(b, u);
};

const refreshBboxHelpers = () => {
  clearGroup(bboxHelpersGroup);
  if (!state.display.boundingBoxes) return;
  const mk = (obj, color) => {
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    const helper = new THREE.Box3Helper(box, color);
    bboxHelpersGroup.add(helper);
  };
  mk(blockGroup, 0xffcc66);
  mk(importedSurfaceGroup, 0x78cfff);
};

const applyLayoutStyle = () => {
  nodes.layout2d.classList.remove("layout-blueprint", "layout-paper", "layout-contrast");
  if (state.layoutStyle === "Blueprint") nodes.layout2d.classList.add("layout-blueprint");
  else if (state.layoutStyle === "Paper") nodes.layout2d.classList.add("layout-paper");
  else if (state.layoutStyle === "High Contrast") nodes.layout2d.classList.add("layout-contrast");
};

const applyDisplayPreset = () => {
  const foilBase = getFoilGradientColor(0.5);
  const foilFail = foilBase.clone().lerp(new THREE.Color(0xd8b078), 0.5);
  state.blocks.forEach((b, i) => {
    if (!b.mesh) return;
    const failed = b.failed.length > 0;
    const seam = b.mesh.getObjectByName("seam");
    if (b.mesh.material) b.mesh.material.dispose();
    const sideMode = state.display.backFaces ? THREE.DoubleSide : THREE.FrontSide;
    if (state.displayPreset === "Clay") {
      b.mesh.material = state.display.foilMaterial ? createFoilMaterial(failed ? foilFail : foilBase) : new THREE.MeshStandardMaterial({
        color: failed ? 0xd5a86f : 0xd9d4cc, roughness: 0.86, metalness: 0.02, transparent: false,
      });
      b.mesh.material.side = sideMode;
      if (seam) seam.visible = state.display.seamDebug ? false : false;
    } else if (state.displayPreset === "Technical Wire") {
      b.mesh.material = new THREE.MeshStandardMaterial({
        color: 0xa9c2de, roughness: 0.3, metalness: 0.05, wireframe: true, transparent: true, opacity: 0.92,
      });
      b.mesh.material.side = sideMode;
      if (seam) seam.visible = state.display.seamDebug && !state.display.meshWires;
    } else if (state.displayPreset === "Analysis Heatmap") {
      const w = clamp((b.metrics.weight - 120) / 700, 0, 1);
      const c = new THREE.Color().setHSL((1 - w) * 0.66, 0.85, 0.5);
      b.mesh.material = state.display.foilMaterial ? createFoilMaterial(c) : new THREE.MeshStandardMaterial({
        color: c, roughness: 0.5, metalness: 0.08, transparent: true, opacity: 0.95,
      });
      b.mesh.material.side = sideMode;
      if (seam) seam.visible = state.display.seamDebug;
    } else if (state.displayPreset === "Fabrication IDs") {
      const hue = (i % 48) / 48;
      const c = new THREE.Color().setHSL(hue, 0.72, 0.55);
      b.mesh.material = state.display.foilMaterial ? createFoilMaterial(c) : new THREE.MeshStandardMaterial({
        color: c, roughness: 0.52, metalness: 0.07, transparent: true, opacity: 0.95,
      });
      b.mesh.material.side = sideMode;
      if (seam) seam.visible = state.display.seamDebug;
    } else {
      b.mesh.material = state.display.foilMaterial ? createFoilMaterial(failed ? foilFail : foilBase) : new THREE.MeshStandardMaterial({
        color: failed ? 0xd5a86f : 0xb8c0cc, roughness: 0.48, metalness: 0.08, transparent: true, opacity: 0.92,
      });
      b.mesh.material.side = sideMode;
      if (seam) seam.visible = state.display.seamDebug;
    }
    if (state.display.meshWires) b.mesh.material.wireframe = true;
    b.mesh.material.needsUpdate = true;
  });
  importedSurfaceGroup.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || !obj.material) return;
    obj.material.side = state.display.backFaces ? THREE.DoubleSide : THREE.FrontSide;
    if (state.display.meshWires || state.displayPreset === "Technical Wire") {
      obj.material.wireframe = true;
      obj.material.transparent = true;
      obj.material.opacity = 0.88;
    } else {
      obj.material.wireframe = false;
      obj.material.transparent = true;
      obj.material.opacity = 0.5;
    }
    obj.material.needsUpdate = true;
  });
  gridHelper.visible = !!state.display.baseGrid;
  axesHelper.visible = !!state.display.baseGrid;
  lightRigHelpers.visible = !!state.display.latticeControls;
  refreshBboxHelpers();
};

const fitCameraToBlocks = () => {
  const box = new THREE.Box3().setFromObject(blockGroup);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const dist = maxDim * 1.9;
  camera.position.set(center.x + dist * 0.9, center.y + dist * 0.7, center.z + dist * 0.9);
  controls.target.copy(center);
  controls.update();
};

const fitCameraToObject = (obj) => {
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const dist = maxDim * 1.9;
  camera.position.set(center.x + dist * 0.9, center.y + dist * 0.7, center.z + dist * 0.9);
  controls.target.copy(center);
  controls.update();
};

const zoomExtents = () => {
  const combined = new THREE.Box3();
  const a = new THREE.Box3().setFromObject(blockGroup);
  const b = new THREE.Box3().setFromObject(importedSurfaceGroup);
  if (!a.isEmpty()) combined.union(a);
  if (!b.isEmpty()) combined.union(b);
  if (combined.isEmpty()) return;
  const size = combined.getSize(new THREE.Vector3());
  const center = combined.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const dist = maxDim * 2.1;
  camera.position.set(center.x + dist, center.y + dist * 0.75, center.z + dist);
  controls.target.copy(center);
  controls.update();
};

const renderInspector = () => {
  const b = state.blocks.find((x) => x.id === state.selectedBlockId);
  if (!b) {
    nodes.inspector.innerHTML = "<b>Inspector</b><p>Select a block in 2D or 3D.</p>";
    return;
  }
  nodes.inspector.innerHTML = `<b>Inspector</b><p>ID: ${b.id}</p><p>Length: ${b.metrics.avgLength.toFixed(2)} m</p><p>Width: ${b.metrics.avgWidth.toFixed(2)} m</p><p>Weight: ${b.metrics.weight.toFixed(1)} kg</p><p>Status: ${b.failed.length ? `Invalid (${b.failed.join(", ")})` : "Valid"}</p>`;
};

const renderMetrics = () => {
  const invalid = state.blocks.filter((b) => b.failed.length);
  const vol = state.blocks.reduce((s, b) => s + b.metrics.volume, 0);
  const wt = state.blocks.reduce((s, b) => s + b.metrics.weight, 0);
  nodes.metrics.innerHTML = [
    ["Block Count", state.blocks.length],
    ["Invalid Blocks", invalid.length],
    ["Total Volume", `${vol.toFixed(2)} m^3`],
    ["Total Weight", `${(wt / 1000).toFixed(2)} t`],
    ["Mode", state.designMode],
    ["Registration", state.registrationMode],
    ["Cube Scale", state.cubeScale.toFixed(2)],
    ["Array UxV", `${state.arrayU}x${state.arrayV}`],
    ["Tile Layers", state.tileLayers],
  ].map(([k, v]) => `<div class="metric"><b>${k}</b><span>${v}</span></div>`).join("");
  if (!invalid.length) nodes.warnings.innerHTML = '<li class="ok">All blocks satisfy current constraints.</li>';
  else {
    const summary = {};
    invalid.forEach((b) => b.failed.forEach((f) => { summary[f] = (summary[f] || 0) + 1; }));
    nodes.warnings.innerHTML = Object.entries(summary).map(([k, v]) => `<li class="bad">${k}: ${v} block(s)</li>`).join("");
  }
};

const renderPrecedent = () => {
  const p = precedentDb[state.vaultType];
  if (!p) {
    nodes.precedentDetails.innerHTML = "No precedent data.";
    return;
  }
  const refs = p.historicalReferences.length
    ? p.historicalReferences.map((r) => `<li><a href="${r.url}" target="_blank" rel="noreferrer">${r.title}</a></li>`).join("")
    : "<li>No external references</li>";
  nodes.precedentDetails.innerHTML = [
    `<div><b>Block logic:</b> ${p.blockLogic}</div>`,
    `<div><b>Joint patterns:</b> ${p.jointPatterns}</div>`,
    `<div><b>Construction:</b> ${p.constructionMethods}</div>`,
    "<div><b>Historical references:</b></div>",
    `<ul>${refs}</ul>`,
  ].join("");
};

const syncInputsFromState = () => {
  ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "keystoneSize"].forEach((id) => {
    if (byId(id)) byId(id).value = state.params[id];
  });
  if (byId("vaultType")) byId("vaultType").value = state.vaultType;
  if (byId("subdivision")) byId("subdivision").value = state.pattern;
  if (byId("jointMode")) byId("jointMode").value = state.jointMode;
  if (byId("cubeScale")) byId("cubeScale").value = String(state.cubeScale);
  if (byId("arrayUV")) byId("arrayUV").value = `${state.arrayU}x${state.arrayV}`;
  if (byId("springingAngle")) byId("springingAngle").value = String(state.springingAngle);
  if (byId("bayRatio")) byId("bayRatio").value = `${state.bayRatioX}:${state.bayRatioY}`;
  if (byId("ribCount")) byId("ribCount").value = String(state.ribCount);
  if (byId("lierneDensity")) byId("lierneDensity").value = String(state.lierneDensity);
  if (byId("netFrequency")) byId("netFrequency").value = String(state.netFrequency);
  if (byId("tileLayers")) byId("tileLayers").value = String(state.tileLayers);
  if (byId("extradosOffset")) byId("extradosOffset").value = String(state.extradosOffset);
  if (byId("supportTopology")) byId("supportTopology").value = state.supportTopology;
  if (byId("groinMorph")) byId("groinMorph").value = String(state.groinMorph);
  if (byId("lInterlockBias")) byId("lInterlockBias").value = String(state.lInterlockBias);
  if (byId("lightingPreset")) byId("lightingPreset").value = state.lightingPreset;
  if (byId("displayPreset")) byId("displayPreset").value = state.displayPreset;
  if (byId("layoutStyle")) byId("layoutStyle").value = state.layoutStyle;
  if (byId("foilColorA")) byId("foilColorA").value = state.foilGradient.a;
  if (byId("foilColorB")) byId("foilColorB").value = state.foilGradient.b;
  if (byId("foilMix")) byId("foilMix").value = String(state.foilGradient.mix);
  if (byId("toggleBaseGrid")) byId("toggleBaseGrid").checked = state.display.baseGrid;
  if (byId("toggleBoundingBoxes")) byId("toggleBoundingBoxes").checked = state.display.boundingBoxes;
  if (byId("toggleLatticeControls")) byId("toggleLatticeControls").checked = state.display.latticeControls;
  if (byId("toggleMeshWires")) byId("toggleMeshWires").checked = state.display.meshWires;
  if (byId("toggleFoilMaterial")) byId("toggleFoilMaterial").checked = state.display.foilMaterial;
  if (byId("toggleBackFaces")) byId("toggleBackFaces").checked = state.display.backFaces;
  if (byId("toggleSeamDebug")) byId("toggleSeamDebug").checked = state.display.seamDebug;
};

const applyReferencePreset = (name) => {
  const preset = referencePresets[name];
  if (!preset) return;
  state.vaultType = preset.vaultType;
  state.pattern = preset.pattern;
  state.params = { ...state.params, ...preset.params };
  state.cubeScale = preset.cubeScale ?? state.cubeScale;
  state.arrayU = preset.arrayU ?? state.arrayU;
  state.arrayV = preset.arrayV ?? state.arrayV;
  state.designMode = "Generated";
  byId("designMode").value = "Generated";
  syncInputsFromState();
  rebuild();
};

const applyVaultStartupSolution = (vaultType) => {
  const sol = vaultStartupSolutions[vaultType];
  if (!sol) return;
  if (sol.pattern) state.pattern = sol.pattern;
  state.structuralDirection = vaultStructuralDefault[vaultType] || state.structuralDirection;
  if (sol.params) state.params = { ...state.params, ...sol.params };
  if (typeof sol.ribCount === "number") state.ribCount = sol.ribCount;
  if (typeof sol.lierneDensity === "number") state.lierneDensity = sol.lierneDensity;
  if (typeof sol.netFrequency === "number") state.netFrequency = sol.netFrequency;
  if (typeof sol.tileLayers === "number") state.tileLayers = sol.tileLayers;
  if (typeof sol.groinMorph === "number") state.groinMorph = sol.groinMorph;
  if (typeof sol.bayRatioX === "number") state.bayRatioX = sol.bayRatioX;
  if (typeof sol.bayRatioY === "number") state.bayRatioY = sol.bayRatioY;
  if (byId("subdivision")) byId("subdivision").value = state.pattern;
  if (byId("structuralDirection")) byId("structuralDirection").value = state.structuralDirection;
  syncInputsFromState();
};

const fitStartupParamsToConstraints = (vaultType) => {
  const c = state.constraints;
  const maxL = Math.max(0.2, c.maxLength - c.fabTolerance);
  const maxW = Math.max(0.2, c.maxWidth - c.fabTolerance);
  const targetCols = Math.ceil(state.params.span / maxL);
  const targetRows = Math.ceil(state.params.length / maxW);
  const ribLike = vaultType === "Rib Vault" || vaultType === "Fan Vault" || vaultType === "Lierne Vault" || vaultType === "Net Vault";
  const ribMul = ribLike ? 0.72 : 1;
  state.params.blockCount = clamp(Math.round(targetCols * ribMul), 8, 40);
  state.params.courseCount = clamp(Math.round(targetRows * ribMul), 8, 40);
  const safeT = (c.maxWeight * 0.9) / (densityKgPerM3 * Math.max(0.05, maxL * maxW));
  state.params.thickness = clamp(Math.min(state.params.thickness, safeT), c.minThickness + 0.02, 2.5);
  if (vaultType === "Rib Vault") state.ribCount = clamp(state.ribCount, 4, 12);
  if (vaultType === "Fan Vault") state.ribCount = clamp(state.ribCount, 8, 20);
};

const applyVaultParamRules = () => {
  const allowed = new Set(vaultParamRules[state.vaultType] || []);
  const map = {
    span: "span", rise: "rise", length: "length", thickness: "thickness",
    courseCount: "courseCount", blockCount: "blockCount", subdivisionDensity: "subdivisionDensity", keystoneSize: "keystoneSize",
    springingAngle: "springingAngle", bayRatio: "bayRatio", ribCount: "ribCount",
    lierneDensity: "lierneDensity", netFrequency: "netFrequency", tileLayers: "tileLayers", groinMorph: "groinMorph", lInterlockBias: "lInterlockBias",
  };
  Object.entries(map).forEach(([key, id]) => {
    const el = byId(id);
    if (!el) return;
    const on = allowed.has(key);
    el.disabled = !on;
    const label = el.closest("label");
    if (label) label.style.opacity = on ? "1" : "0.45";
  });
  const allowedPatterns = vaultPatternAllowed[state.vaultType] || patterns;
  const subEl = byId("subdivision");
  if (subEl) {
    [...subEl.options].forEach((opt) => { opt.disabled = !allowedPatterns.includes(opt.value); });
    if (!allowedPatterns.includes(state.pattern)) state.pattern = allowedPatterns[0];
    subEl.value = state.pattern;
  }
};

const applyWorkflowStep = (step) => {
  state.workflowStep = step;
  if (nodes.workflowSteps) {
    [...nodes.workflowSteps.querySelectorAll("button[data-step]")].forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.step) === step);
    });
  }
  renderPrecedent();
};

const applySelection = () => {
  state.blocks.forEach((b) => {
    if (!b.mesh) return;
    const selected = b.id === state.selectedBlockId;
    b.mesh.material.emissive = new THREE.Color(selected ? 0x2f91ff : 0x000000);
    b.mesh.material.emissiveIntensity = selected ? 0.35 : 0;
  });
  draw2d();
  renderInspector();
};

const rebuild = () => {
  try {
    state.blocks = generatePatternBlocks();
  } catch (err) {
    console.error("rebuild/generatePatternBlocks failed", err);
    state.blocks = [];
  }
  if (!state.blocks.length) {
    const rows = Math.max(2, Math.floor(state.params.courseCount || 12));
    const cols = Math.max(2, Math.floor(state.params.blockCount || 12));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u0 = c / cols;
        const u1 = (c + 1) / cols;
        const v0 = r / rows;
        const v1 = (r + 1) / rows;
        state.blocks.push({
          id: `F-${r + 1}-${c + 1}`,
          uv: [[u0, v0], [u1, v0], [u1, v1], [u0, v1]],
        });
      }
    }
  }
  build3d();
  if (!blockGroup.children.length) {
    const dbg = new THREE.Mesh(
      new THREE.BoxGeometry(4, 2, 4),
      new THREE.MeshStandardMaterial({ color: 0x2fa9ff, wireframe: true })
    );
    blockGroup.add(dbg);
  }
  fitCameraToBlocks();
  draw2d();
  renderFormForceDiagrams();
  renderMetrics();
  renderPrecedent();
  if (!state.blocks.some((b) => b.id === state.selectedBlockId)) state.selectedBlockId = null;
  applySelection();
};

const load3DObject = async (file) => {
  const url = URL.createObjectURL(file);
  const lower = file.name.toLowerCase();
  let obj = null;
  if (lower.endsWith(".obj")) {
    const txt = await file.text();
    obj = objLoader.parse(txt);
  } else if (lower.endsWith(".stl")) {
    const arr = await file.arrayBuffer();
    obj = new THREE.Mesh(stlLoader.parse(arr), new THREE.MeshStandardMaterial({ color: 0x6ea2c7, wireframe: false, transparent: true, opacity: 0.35 }));
  } else if (lower.endsWith(".glb") || lower.endsWith(".gltf")) {
    const gltf = await new Promise((resolve, reject) => gltfLoader.load(url, resolve, undefined, reject));
    obj = gltf.scene;
  }
  URL.revokeObjectURL(url);
  if (!obj) return;
  clearGroup(importedSurfaceGroup);
  importedSurfaceGroup.add(obj);
  obj.traverse((c) => {
    if (c.isMesh) {
      c.material = new THREE.MeshStandardMaterial({ color: 0x7ca7c6, transparent: true, opacity: 0.26, side: THREE.DoubleSide });
      c.geometry.computeBoundingBox();
    }
  });
  const bbox = new THREE.Box3().setFromObject(obj);
  state.importedSurface = obj;
  state.importedSurfaceBbox = bbox;
  fitCameraToObject(obj);
};

const on2dImport = async (file) => {
  const lower = file.name.toLowerCase();
  const text = await file.text();
  let polys = [];
  if (lower.endsWith(".svg")) polys = parseSvgPolys(text);
  if (lower.endsWith(".dxf")) polys = parseDxfPolys(text);
  if (polys.length) state.imported2DPolys = normalizePolysToUv(polys);
};

const resize = () => {
  const box = byId("viewport").getBoundingClientRect();
  renderer.setSize(box.width, box.height, false);
  camera.aspect = box.width / box.height;
  camera.updateProjectionMatrix();
};

const pick3d = (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hit = raycaster.intersectObjects(blockGroup.children, true).find((x) => x.object.userData.blockId);
  if (!hit) return;
  state.selectedBlockId = hit.object.userData.blockId;
  applySelection();
};

nodes.layout2d.addEventListener("click", (e) => {
  const poly = e.target.closest(".block2d");
  if (!poly) return;
  state.selectedBlockId = poly.dataset.id;
  applySelection();
});
nodes.layout2d.addEventListener("pointerdown", (e) => {
  const handle = e.target.closest(".uv-handle");
  if (!handle) return;
  e.preventDefault();
  state.dragging = { id: handle.dataset.id, vertex: Number(handle.dataset.vertex) };
});
window.addEventListener("pointermove", (e) => {
  if (!state.dragging) return;
  const rect = nodes.layout2d.getBoundingClientRect();
  const u = clamp((e.clientX - rect.left) / rect.width, 0, 1);
  const v = clamp((e.clientY - rect.top) / rect.height, 0, 1);
  const b = state.blocks.find((x) => x.id === state.dragging.id);
  if (!b) return;
  b.uv[state.dragging.vertex] = [u, v];
  build3d();
  draw2d();
  renderFormForceDiagrams();
  renderMetrics();
  applySelection();
});
window.addEventListener("pointerup", () => { state.dragging = null; });
renderer.domElement.addEventListener("pointerdown", pick3d);

nodes.layout2d.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rect = nodes.layout2d.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * state.view2d.w + state.view2d.x;
  const py = ((e.clientY - rect.top) / rect.height) * state.view2d.h + state.view2d.y;
  const z = e.deltaY > 0 ? 1.08 : 0.92;
  const nw = clamp(state.view2d.w * z, 120, 3000);
  const nh = clamp(state.view2d.h * z, 84, 2100);
  const rx = (px - state.view2d.x) / state.view2d.w;
  const ry = (py - state.view2d.y) / state.view2d.h;
  state.view2d.x = px - rx * nw;
  state.view2d.y = py - ry * nh;
  state.view2d.w = nw;
  state.view2d.h = nh;
  draw2d();
}, { passive: false });

nodes.layout2d.addEventListener("pointerdown", (e) => {
  if (e.button !== 1 && e.button !== 2 && !e.shiftKey) return;
  const rect = nodes.layout2d.getBoundingClientRect();
  state.pan2d = { x: e.clientX, y: e.clientY, ox: state.view2d.x, oy: state.view2d.y, rw: rect.width, rh: rect.height };
});
window.addEventListener("pointermove", (e) => {
  if (!state.pan2d) return;
  const dx = e.clientX - state.pan2d.x;
  const dy = e.clientY - state.pan2d.y;
  state.view2d.x = state.pan2d.ox - (dx / state.pan2d.rw) * state.view2d.w;
  state.view2d.y = state.pan2d.oy - (dy / state.pan2d.rh) * state.view2d.h;
  draw2d();
});
window.addEventListener("pointerup", () => { state.pan2d = null; });
nodes.layout2d.addEventListener("contextmenu", (e) => e.preventDefault());

["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "keystoneSize"].forEach((id) => {
  byId(id).addEventListener("input", (e) => { state.params[id] = Number(e.target.value); rebuild(); });
});
["maxLength", "maxWidth", "minThickness", "maxWeight", "jointGap", "bedDepth", "courseHeight", "taperAngle", "maxTaper", "minEdgeLength", "fabTolerance"].forEach((id) => {
  byId(id).addEventListener("input", (e) => { state.constraints[id] = Number(e.target.value); rebuild(); });
});
["alignScale", "alignOffsetU", "alignOffsetV", "alignRotation"].forEach((id) => {
  byId(id).addEventListener("input", (e) => {
    const key = id === "alignScale" ? "scale" : id === "alignOffsetU" ? "offsetU" : id === "alignOffsetV" ? "offsetV" : "rotationDeg";
    state.align[key] = Number(e.target.value);
    rebuild();
  });
});
byId("cubeScale").addEventListener("input", (e) => { state.cubeScale = Math.max(0.1, Number(e.target.value)); rebuild(); });
byId("arrayUV").addEventListener("input", (e) => {
  const m = String(e.target.value).toLowerCase().match(/(\d+)\s*x\s*(\d+)/);
  if (!m) return;
  state.arrayU = Math.max(1, Number(m[1]));
  state.arrayV = Math.max(1, Number(m[2]));
  rebuild();
});
byId("springingAngle").addEventListener("input", (e) => { state.springingAngle = Number(e.target.value); rebuild(); });
byId("bayRatio").addEventListener("input", (e) => {
  const m = String(e.target.value).match(/([\d.]+)\s*:\s*([\d.]+)/);
  if (!m) return;
  state.bayRatioX = Math.max(0.2, Number(m[1]));
  state.bayRatioY = Math.max(0.2, Number(m[2]));
  rebuild();
});
byId("ribCount").addEventListener("input", (e) => { state.ribCount = Math.max(2, Number(e.target.value)); rebuild(); });
byId("lierneDensity").addEventListener("input", (e) => { state.lierneDensity = clamp(Number(e.target.value), 0, 1); rebuild(); });
byId("netFrequency").addEventListener("input", (e) => { state.netFrequency = Math.max(1, Number(e.target.value)); rebuild(); });
byId("tileLayers").addEventListener("input", (e) => { state.tileLayers = Math.max(1, Number(e.target.value)); state.params.thickness = Math.max(0.15, 0.18 * state.tileLayers); syncInputsFromState(); rebuild(); });
if (byId("extradosOffset")) byId("extradosOffset").addEventListener("input", (e) => { state.extradosOffset = Math.max(0, Number(e.target.value)); rebuild(); });
if (byId("supportTopology")) byId("supportTopology").addEventListener("change", (e) => { state.supportTopology = e.target.value; rebuild(); });
if (byId("groinMorph")) byId("groinMorph").addEventListener("input", (e) => { state.groinMorph = clamp(Number(e.target.value), 0, 1); rebuild(); });
if (byId("lInterlockBias")) byId("lInterlockBias").addEventListener("input", (e) => { state.lInterlockBias = clamp(Number(e.target.value), 0, 1); rebuild(); });
byId("designMode").addEventListener("change", (e) => { state.designMode = e.target.value; rebuild(); });
if (byId("customPatternSource")) byId("customPatternSource").addEventListener("change", (e) => { state.customPatternSource = e.target.value; rebuild(); });
if (byId("supportCount")) byId("supportCount").addEventListener("input", (e) => { state.supportCount = Math.max(3, Number(e.target.value)); rebuild(); });
if (byId("forceLmin")) byId("forceLmin").addEventListener("input", (e) => { state.forceLmin = Math.max(0.01, Number(e.target.value)); rebuild(); });
if (byId("forceLmax")) byId("forceLmax").addEventListener("input", (e) => { state.forceLmax = Math.max(state.forceLmin + 0.01, Number(e.target.value)); rebuild(); });
byId("registrationMode").addEventListener("change", (e) => { state.registrationMode = e.target.value; rebuild(); });
if (byId("jointMode")) byId("jointMode").addEventListener("change", (e) => { state.jointMode = e.target.value; rebuild(); });
byId("vaultType").addEventListener("change", (e) => {
  state.vaultType = e.target.value;
  if (state.vaultType !== "Custom Imported Rhino Surface") {
    state.designMode = "Generated";
    byId("designMode").value = "Generated";
    state.imported2DPolys = null;
  }
  const firstLoadForVault = !vaultStartupSeen.has(state.vaultType);
  if (firstLoadForVault) {
    applyVaultStartupSolution(state.vaultType);
    fitStartupParamsToConstraints(state.vaultType);
    vaultStartupSeen.add(state.vaultType);
  } else {
    const preset = vaultPatternPreset[state.vaultType];
    if (preset) {
      state.pattern = preset;
      byId("subdivision").value = preset;
    }
  }
  state.selectedBlockId = null;
  applyVaultParamRules();
  if (byId("referencePreset")) byId("referencePreset").value = "Custom";
  rebuild();
});
byId("subdivision").addEventListener("change", (e) => { state.pattern = e.target.value; rebuild(); });
if (byId("lightingPreset")) byId("lightingPreset").addEventListener("change", (e) => {
  applyLightingPreset(e.target.value);
  applyDisplayPreset();
});
if (byId("displayPreset")) byId("displayPreset").addEventListener("change", (e) => {
  state.displayPreset = e.target.value;
  applyDisplayPreset();
});
if (byId("layoutStyle")) byId("layoutStyle").addEventListener("change", (e) => {
  state.layoutStyle = e.target.value;
  applyLayoutStyle();
  draw2d();
});
if (byId("foilColorA")) byId("foilColorA").addEventListener("input", (e) => { state.foilGradient.a = e.target.value; applyDisplayPreset(); });
if (byId("foilColorB")) byId("foilColorB").addEventListener("input", (e) => { state.foilGradient.b = e.target.value; applyDisplayPreset(); });
if (byId("foilMix")) byId("foilMix").addEventListener("input", (e) => { state.foilGradient.mix = Number(e.target.value); applyDisplayPreset(); });
if (byId("toggleBaseGrid")) byId("toggleBaseGrid").addEventListener("change", (e) => { state.display.baseGrid = !!e.target.checked; applyDisplayPreset(); draw2d(); });
if (byId("toggleBoundingBoxes")) byId("toggleBoundingBoxes").addEventListener("change", (e) => { state.display.boundingBoxes = !!e.target.checked; applyDisplayPreset(); });
if (byId("toggleLatticeControls")) byId("toggleLatticeControls").addEventListener("change", (e) => { state.display.latticeControls = !!e.target.checked; applyDisplayPreset(); });
if (byId("toggleMeshWires")) byId("toggleMeshWires").addEventListener("change", (e) => { state.display.meshWires = !!e.target.checked; applyDisplayPreset(); });
if (byId("toggleFoilMaterial")) byId("toggleFoilMaterial").addEventListener("change", (e) => { state.display.foilMaterial = !!e.target.checked; applyDisplayPreset(); });
if (byId("toggleBackFaces")) byId("toggleBackFaces").addEventListener("change", (e) => { state.display.backFaces = !!e.target.checked; applyDisplayPreset(); });
if (byId("toggleSeamDebug")) byId("toggleSeamDebug").addEventListener("change", (e) => { state.display.seamDebug = !!e.target.checked; applyDisplayPreset(); });
byId("structuralDirection").addEventListener("change", (e) => { state.structuralDirection = e.target.value; rebuild(); });
const generateVaultBtn = byId("generateVault");
if (generateVaultBtn) generateVaultBtn.addEventListener("click", () => rebuild());
byId("zoomExtents").addEventListener("click", () => zoomExtents());
if (byId("ffFullscreen")) byId("ffFullscreen").addEventListener("click", () => {
  document.body.classList.toggle("ff-fullscreen");
});
byId("referencePreset").addEventListener("change", (e) => {
  const name = e.target.value;
  if (name === "Custom") return;
  applyReferencePreset(name);
});
if (byId("resetRecommended")) byId("resetRecommended").addEventListener("click", () => {
  const vt = state.vaultType;
  applyVaultStartupSolution(vt);
  fitStartupParamsToConstraints(vt);
  state.selectedBlockId = null;
  if (byId("referencePreset")) byId("referencePreset").value = "Custom";
  applyVaultParamRules();
  rebuild();
});
if (nodes.workflowSteps) {
  nodes.workflowSteps.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-step]");
    if (!btn) return;
    applyWorkflowStep(Number(btn.dataset.step));
  });
}
byId("runChecks").addEventListener("click", rebuild);
byId("import2d").addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  await on2dImport(f);
  state.designMode = "Custom Import";
  byId("designMode").value = "Custom Import";
  rebuild();
});
byId("import3d").addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  await load3DObject(f);
  state.designMode = "Custom Import";
  byId("designMode").value = "Custom Import";
  rebuild();
});

byId("exportJson").addEventListener("click", () => {
  const payload = {
    designMode: state.designMode,
    vaultType: state.vaultType,
    registrationMode: state.registrationMode,
    structuralDirection: state.structuralDirection,
    customPatternSource: state.customPatternSource,
    supportCount: state.supportCount,
    forceLmin: state.forceLmin,
    forceLmax: state.forceLmax,
    params: state.params,
    align: state.align,
    constraints: state.constraints,
    blocks: state.blocks.map((b) => ({
      id: b.id,
      uv: b.uv,
      failed: b.failed,
      metrics: {
        length: b.metrics.avgLength,
        width: b.metrics.avgWidth,
        volume: b.metrics.volume,
        weight: b.metrics.weight,
      },
      topFace: b.metrics.q.map((p) => [p.x, p.y, p.z]),
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lithic-lab-blocks.json";
  a.click();
  URL.revokeObjectURL(url);
});

byId("exportBlocks").addEventListener("click", () => {
  state.blocks.forEach((b) => {
    const payload = {
      id: b.id,
      uv: b.uv,
      failed: b.failed,
      metrics: {
        length: b.metrics.avgLength,
        width: b.metrics.avgWidth,
        volume: b.metrics.volume,
        weight: b.metrics.weight,
      },
      vertices: b.metrics.q.map((p) => [p.x, p.y, p.z]),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${b.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
});

nodes.viewModes.addEventListener("click", (e) => {
  if (!(e.target instanceof HTMLButtonElement)) return;
  [...nodes.viewModes.querySelectorAll("button")].forEach((b) => b.classList.toggle("active", b === e.target));
});
if (nodes.toolTabs) {
  nodes.toolTabs.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (!b) return;
    setToolTab(b.dataset.tab);
  });
}
if (byId("pipeTrace")) byId("pipeTrace").addEventListener("click", () => runPipelineStage(1));
if (byId("pipeIntrados")) byId("pipeIntrados").addEventListener("click", () => runPipelineStage(2));
if (byId("pipeProject")) byId("pipeProject").addEventListener("click", () => runPipelineStage(3));
if (byId("pipeCleanup")) byId("pipeCleanup").addEventListener("click", () => runPipelineStage(4));
if (byId("pipeAssembly")) byId("pipeAssembly").addEventListener("click", () => runPipelineStage(5));

window.addEventListener("resize", resize);
renderer.domElement.addEventListener("wheel", (e) => {
  e.preventDefault();
  e.stopPropagation();
  const zoomFactor = Math.exp(e.deltaY * 0.0015);
  const toCam = camera.position.clone().sub(controls.target);
  const current = toCam.length();
  const next = clamp(current * zoomFactor, controls.minDistance, controls.maxDistance);
  if (!Number.isFinite(next)) return;
  toCam.setLength(next);
  camera.position.copy(controls.target.clone().add(toCam));
  controls.update();
}, { passive: false });

const tick = () => {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
};

applyVaultParamRules();
applyWorkflowStep(1);
setToolTab("catalog");
syncInputsFromState();
applyLayoutStyle();
applyLightingPreset(state.lightingPreset);
rebuild();
resize();
tick();
