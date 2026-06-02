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
  archType: "Semicircular",
  targetBlockWidth: 1.2,
  taperScale: 0.55,
  barrelOffsetSide: "Inside",
  wallThickness: 0.45,
  wallHeightOffset: 0,
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
  patternAppliedToModel: false,
  barrelBondMode: "1",
  dragSensitivity: "Normal",
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
  draggingSectionHandle: null,
  suspendViewportFit: false,
  draggingPointerId: null,
  hoveredSectionHandle: null,
  imported2DPolys: null,
  importedSurface: null,
  importedSurfaceBbox: null,
  view2d: { x: 0, y: 0, w: 1000, h: 700 },
  pan2d: null,
  lightingPreset: "Rhino Studio",
  displayPreset: "Rendered",
  layoutStyle: "Rhino Gray",
  foilGradient: { a: "#d9dde2", b: "#c1c7cf", mix: 0.5 },
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

const patterns = ["Courses", "Radial joints", "Running bond", "Diagonal joints", "Hex / NGon", "Rib-aligned", "Keystone zones"];
const isBarrelLikeVault = (vaultType = state.vaultType) => vaultType === "Barrel Vault" || vaultType === "Tapered Barrel Vault";
const vaultLibrary = {
  "Barrel Vault": {
    name: "Barrel Vault",
    construction2D: "Longitudinal ring courses and springing control lines.",
    construction3D: "Continuous semicylindrical shell from a single arc family.",
    forceFlowType: "Compression lines",
    stereotomyType: "Courses",
    parameters: ["span", "rise", "length", "thickness", "archType", "courseHeight", "targetBlockWidth", "barrelBondMode", "barrelOffsetSide", "wallThickness", "wallHeightOffset"].map((key) => ({ key })),
    allowedPatterns: ["Courses", "Running bond", "Radial joints", "Keystone zones"],
    startup: { params: { span: 22, rise: 10, length: 28, thickness: 0.9, courseCount: 20, blockCount: 22, subdivisionDensity: 1.1, keystoneSize: 0.35 } },
  },
  "Tapered Barrel Vault": {
    name: "Tapered Barrel Vault",
    construction2D: "Longitudinal courses lofted between full-size and scaled barrel end profiles.",
    construction3D: "Tapered barrel shell from two parallel 2D barrel curves joined by a loft.",
    forceFlowType: "Compression lines",
    stereotomyType: "Courses",
    parameters: ["span", "rise", "length", "thickness", "archType", "taperScale", "courseHeight", "targetBlockWidth", "barrelBondMode", "barrelOffsetSide", "wallThickness", "wallHeightOffset"].map((key) => ({ key })),
    allowedPatterns: ["Courses", "Running bond", "Radial joints", "Keystone zones"],
    startup: { params: { span: 24, rise: 10, length: 30, thickness: 0.9, courseCount: 22, blockCount: 24, subdivisionDensity: 1.1, keystoneSize: 0.35 }, taperScale: 0.55 },
  },
  "Groin Vault": {
    name: "Groin Vault",
    construction2D: "Crossed barrel guides with diagonal arris seams.",
    construction3D: "Intersection of orthogonal barrel surfaces with groin arrises.",
    forceFlowType: "Thrust paths",
    stereotomyType: "Radial joints",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "springingAngle", "bayRatio", "groinMorph", "lInterlockBias"].map((key) => ({ key })),
    allowedPatterns: ["Radial joints", "Diagonal joints", "Rib-aligned", "Keystone zones"],
    startup: { params: { span: 22, rise: 11, length: 22, thickness: 0.88, courseCount: 22, blockCount: 20, subdivisionDensity: 1.2, keystoneSize: 0.42 }, bayRatioX: 1, bayRatioY: 1, groinMorph: 0.45 },
  },
  "Cloister Vault": {
    name: "Cloister Vault",
    construction2D: "Four corner fans converging to apex control.",
    construction3D: "Corner-rising sectors meeting toward central summit.",
    forceFlowType: "Compression lines",
    stereotomyType: "Rib-aligned",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "keystoneSize", "bayRatio"].map((key) => ({ key })),
    allowedPatterns: ["Radial joints", "Rib-aligned", "Keystone zones"],
    startup: { params: { span: 22, rise: 10, length: 22, thickness: 0.82, courseCount: 18, blockCount: 16, subdivisionDensity: 1.05, keystoneSize: 0.58 }, bayRatioX: 1, bayRatioY: 1 },
  },
  "Sail Vault": {
    name: "Sail Vault",
    construction2D: "Square bay guide with corner-support arcs.",
    construction3D: "Billowed surface spanning between four corner supports.",
    forceFlowType: "Compression lines",
    stereotomyType: "Rib-aligned",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "bayRatio"].map((key) => ({ key })),
    allowedPatterns: ["Radial joints", "Rib-aligned", "Keystone zones"],
    startup: { params: { span: 22, rise: 12, length: 22, thickness: 0.78, courseCount: 18, blockCount: 18, subdivisionDensity: 1.08, keystoneSize: 0.52 }, bayRatioX: 1, bayRatioY: 1 },
  },
  Dome: {
    name: "Dome",
    construction2D: "Polar radial rings with meridian controls.",
    construction3D: "Axisymmetric shell from revolution geometry.",
    forceFlowType: "Compression lines",
    stereotomyType: "Radial joints",
    parameters: ["span", "rise", "thickness", "courseCount", "blockCount", "subdivisionDensity"].map((key) => ({ key })),
    allowedPatterns: ["Radial joints", "Courses", "Keystone zones"],
    startup: { params: { span: 22, rise: 13, length: 22, thickness: 0.85, courseCount: 24, blockCount: 24, subdivisionDensity: 1.15, keystoneSize: 0.5 } },
  },
  "Rib Vault": {
    name: "Rib Vault",
    construction2D: "Primary rib skeleton with web infill zones.",
    construction3D: "Groin-like web reinforced by raised diagonal ribs.",
    forceFlowType: "Rib lines",
    stereotomyType: "Rib-aligned",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "ribCount", "bayRatio"].map((key) => ({ key })),
    allowedPatterns: ["Rib-aligned", "Radial joints", "Diagonal joints"],
    startup: { params: { span: 20, rise: 11, length: 22, thickness: 0.72, courseCount: 16, blockCount: 14, subdivisionDensity: 1, keystoneSize: 0.45 }, ribCount: 8, bayRatioX: 1, bayRatioY: 1 },
  },
  "Fan Vault": {
    name: "Fan Vault",
    construction2D: "Sectorized fan ribs from clustered spring points.",
    construction3D: "Conoidal fan surfaces with scalloped rib emphasis.",
    forceFlowType: "Rib lines",
    stereotomyType: "Rib-aligned",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "ribCount"].map((key) => ({ key })),
    allowedPatterns: ["Rib-aligned", "Radial joints"],
    startup: { params: { span: 20, rise: 16, length: 20, thickness: 0.72, courseCount: 18, blockCount: 14, subdivisionDensity: 1, keystoneSize: 0.55 }, ribCount: 12 },
  },
  "Lierne Vault": {
    name: "Lierne Vault",
    construction2D: "Primary ribs with tertiary lierne connectors.",
    construction3D: "Rib-vault web enriched by dense linking ribs.",
    forceFlowType: "Rib lines",
    stereotomyType: "Hex / NGon",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "ribCount", "lierneDensity"].map((key) => ({ key })),
    allowedPatterns: ["Rib-aligned", "Hex / NGon", "Diagonal joints"],
    startup: { params: { span: 22, rise: 13, length: 22, thickness: 0.78, courseCount: 18, blockCount: 16, subdivisionDensity: 1, keystoneSize: 0.55 }, ribCount: 10, lierneDensity: 0.52 },
  },
  "Net Vault": {
    name: "Net Vault",
    construction2D: "Interwoven diagonal net lanes and node loci.",
    construction3D: "Groin-derived web with periodic net modulation.",
    forceFlowType: "Rib lines",
    stereotomyType: "Hex / NGon",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "netFrequency"].map((key) => ({ key })),
    allowedPatterns: ["Hex / NGon", "Diagonal joints", "Rib-aligned"],
    startup: { params: { span: 22, rise: 13, length: 22, thickness: 0.8, courseCount: 18, blockCount: 16, subdivisionDensity: 1, keystoneSize: 0.58 }, netFrequency: 8 },
  },
  "Catalan Vault": {
    name: "Catalan Vault",
    construction2D: "Layered running-bond tile courses.",
    construction3D: "Shallow compression shell tuned for thin-tile layering.",
    forceFlowType: "Compression lines",
    stereotomyType: "Running bond",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "tileLayers"].map((key) => ({ key })),
    allowedPatterns: ["Running bond", "Diagonal joints", "Courses"],
    startup: { params: { span: 20, rise: 8, length: 24, thickness: 0.54, courseCount: 22, blockCount: 24, subdivisionDensity: 1.1, keystoneSize: 0.24 }, tileLayers: 3 },
  },
  "Guastavino Vault": {
    name: "Guastavino Vault",
    construction2D: "Multi-layer timbrel tile bond sequencing.",
    construction3D: "Timbrel shell profile with catenary-inspired rise.",
    forceFlowType: "Compression lines",
    stereotomyType: "Running bond",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "tileLayers"].map((key) => ({ key })),
    allowedPatterns: ["Running bond", "Diagonal joints", "Courses"],
    startup: { params: { span: 24, rise: 9, length: 28, thickness: 0.5, courseCount: 24, blockCount: 26, subdivisionDensity: 1.15, keystoneSize: 0.2 }, tileLayers: 3 },
  },
  "Custom Imported Rhino Surface": {
    name: "Custom Imported Rhino Surface",
    construction2D: "User-supplied 2D network registration.",
    construction3D: "Imported mesh/surface projection target.",
    forceFlowType: "Compression lines",
    stereotomyType: "Hex / NGon",
    parameters: ["thickness", "courseCount", "blockCount", "subdivisionDensity"].map((key) => ({ key })),
    allowedPatterns: ["Hex / NGon", "Rib-aligned", "Diagonal joints", "Running bond", "Radial joints", "Courses", "Keystone zones"],
    startup: { params: { thickness: 0.75, courseCount: 20, blockCount: 22, subdivisionDensity: 1.15 } },
  },
};
const vaultTypes = Object.keys(vaultLibrary);
const vaultParamRules = Object.fromEntries(vaultTypes.map((name) => [name, (vaultLibrary[name].parameters || []).map((p) => p.key)]));
const vaultPatternPreset = Object.fromEntries(vaultTypes.map((name) => [name, vaultLibrary[name].stereotomyType]));
const vaultPatternAllowed = Object.fromEntries(vaultTypes.map((name) => [name, vaultLibrary[name].allowedPatterns || patterns]));
const vaultStructuralDefault = Object.fromEntries(vaultTypes.map((name) => [name, vaultLibrary[name].forceFlowType || "Compression lines"]));
const vaultStartupSolutions = Object.fromEntries(vaultTypes.map((name) => [name, { pattern: vaultLibrary[name].stereotomyType, ...(vaultLibrary[name].startup || {}) }]));
const vaultStartupSeen = new Set(["Barrel Vault"]);
const referencePresets = {
  Custom: null,
  "Default Groin Vault (Solid First)": {
    vaultType: "Groin Vault",
    pattern: "Radial joints",
    params: { span: 24, rise: 12, length: 24, thickness: 1.05, courseCount: 22, blockCount: 20, subdivisionDensity: 1.2, keystoneSize: 0.42 },
    cubeScale: 1,
    arrayU: 1,
    arrayV: 1,
    groinMorph: 0.5,
    bayRatioX: 1,
    bayRatioY: 1,
  },
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
  precedentDetails: byId("precedentDetails"),
  workflowSteps: byId("workflowSteps"),
  formDiagram: byId("formDiagram"),
  forceDiagram: byId("forceDiagram"),
  diagramMode: byId("diagramMode"),
  toolTabs: byId("toolTabs"),
  pipelineStatus: byId("pipelineStatus"),
  activeVaultTools: byId("activeVaultTools"),
  rightPanelTitle: byId("rightPanelTitle"),
};

byId("vaultType").innerHTML = vaultTypes.map((v) => `<option>${v}</option>`).join("");
byId("subdivision").innerHTML = patterns.map((v) => `<option>${v}</option>`).join("");

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

const parameterLabelMap = {
  span: "Span",
  rise: "Rise",
  length: "Length",
  thickness: "Thickness",
  archType: "Arch Type",
  taperScale: "Taper End Scale",
  courseHeight: "Course Height",
  targetBlockWidth: "Target Block Width",
  courseCount: "Courses",
  blockCount: "Blocks/Course",
  subdivisionDensity: "Subdivision Density",
  keystoneSize: "Keystone Size",
  springingAngle: "Springing Angle",
  barrelBondMode: "Barrel Pattern Option",
  barrelOffsetSide: "Thickness Side",
  wallThickness: "Wall Thickness",
  wallHeightOffset: "Wall Height Offset",
  bayRatio: "Bay Ratio",
  ribCount: "Rib Count",
  lierneDensity: "Lierne Density",
  netFrequency: "Net Frequency",
  tileLayers: "Tile Layers",
  groinMorph: "Groin Morph",
  lInterlockBias: "L-Interlock Bias",
};

const renderActiveVaultTools = () => {
  if (!nodes.activeVaultTools) return;
  const def = vaultLibrary[state.vaultType];
  const params = (def?.parameters || []).map((p) => parameterLabelMap[p.key] || p.key);
  const patternsAllowed = vaultPatternAllowed[state.vaultType] || patterns;
  nodes.activeVaultTools.innerHTML = [
    `<div><b>Vault:</b> ${state.vaultType}</div>`,
    `<div><b>2D Logic:</b> ${def?.construction2D || "n/a"}</div>`,
    `<div><b>3D Logic:</b> ${def?.construction3D || "n/a"}</div>`,
    `<div><b>Force Flow:</b> ${def?.forceFlowType || "n/a"}</div>`,
    `<div><b>Stereotomy:</b> ${def?.stereotomyType || "n/a"}</div>`,
    `<div><b>Active Parameters:</b> ${params.length ? params.join(", ") : "n/a"}</div>`,
    `<div><b>Allowed Patterns:</b> ${patternsAllowed.join(", ")}</div>`,
  ].join("");
};

const applyRightPanelToolVisibility = () => {
  if (nodes.rightPanelTitle) {
    nodes.rightPanelTitle.textContent = state.designMode === "Custom Import"
      ? "Import + Analysis"
      : "Vault Tools + Analysis";
  }
  const isCustom = state.designMode === "Custom Import" || state.vaultType === "Custom Imported Rhino Surface";
  document.querySelectorAll("[data-right-section]").forEach((sec) => {
    const key = sec.getAttribute("data-right-section");
    let show = true;
    if (key === "vault-tools" || key === "precedent") show = !isCustom;
    if (key === "constraints") show = true;
    if (key === "display" || key === "metrics") show = true;
    sec.setAttribute("data-hidden", show ? "0" : "1");
  });
  renderActiveVaultTools();
};

const linkRangeAndNumber = (rangeId, numberId, onInput) => {
  const r = byId(rangeId);
  const n = byId(numberId);
  if (!r || !n) return;
  const apply = (v, fromRange = false) => {
    const num = Number(v);
    if (!Number.isFinite(num)) return;
    r.value = String(num);
    n.value = String(num);
    if (onInput) onInput(num);
    else if (fromRange) n.dispatchEvent(new Event("input", { bubbles: true }));
  };
  r.addEventListener("input", (e) => apply(e.target.value, true));
  n.addEventListener("input", (e) => apply(e.target.value, false));
};

const syncInputPair = (id, value) => {
  if (byId(id)) byId(id).value = String(value);
  if (byId(`${id}Num`)) byId(`${id}Num`).value = String(value);
};

const runPipelineStage = (stage) => {
  state.pipelineStage = stage;
  if (stage === 1) {
    state.designMode = "Generated";
    if (byId("designMode")) byId("designMode").value = "Generated";
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

const runSolidToStereotomicWorkflow = () => {
  state.designMode = "Generated";
  if (byId("designMode")) byId("designMode").value = "Generated";
  state.customPatternSource = "UV Form Grid";
  if (byId("customPatternSource")) byId("customPatternSource").value = state.customPatternSource;
  state.pattern = vaultPatternPreset[state.vaultType] || state.pattern;
  if (byId("subdivision")) byId("subdivision").value = state.pattern;
  state.patternAppliedToModel = false;
  state.pipelineStage = 0;
  setPipelineStatus("Solid model opened. Developing stereotomic pattern...");
  rebuild();
};

const runVaultSelectionPipeline = (vaultType) => {
  const def = vaultLibrary[vaultType];
  if (!def) return;
  state.vaultType = vaultType;
  applyVaultStartupSolution(vaultType);
  fitStartupParamsToConstraints(vaultType);
  state.structuralDirection = def.forceFlowType || state.structuralDirection;
  state.pattern = def.stereotomyType || state.pattern;
  state.patternAppliedToModel = false;
  state.selectedBlockId = null;
  if (state.vaultType !== "Custom Imported Rhino Surface") {
    state.designMode = "Generated";
    if (byId("designMode")) byId("designMode").value = "Generated";
  }
  if (byId("subdivision")) byId("subdivision").value = state.pattern;
  if (byId("structuralDirection")) byId("structuralDirection").value = state.structuralDirection;
  applyVaultParamRules();
  syncWallThicknessWithVault();
  syncInputsFromState();
  setPipelineStatus(`Loaded ${def.name}: 2D construction, 3D geometry, force flow, and default stereotomy ready.`);
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
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
  if (preset === "Rhino Studio") {
    scene.background = new THREE.Color(0x283444);
    scene.fog = new THREE.FogExp2(0x202b38, 0.0085);
    ambient.intensity = 0.68;
    renderer.toneMappingExposure = 1.24;
    hemi.color.set(0xe4efff); hemi.groundColor.set(0x18202b); hemi.intensity = 0.34;
    key.color.set(0xffffff); key.intensity = 1.35; key.position.set(24, 26, 16);
    fill.color.set(0xd6e6ff); fill.intensity = 0.58; fill.position.set(-18, 13, 12);
    rim.color.set(0xf9fbff); rim.intensity = 0.56; rim.position.set(-2, 20, -28);
  } else if (preset === "Studio Soft") {
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
const solidVaultGroup = new THREE.Group();
const supportWallGroup = new THREE.Group();
const importedSurfaceGroup = new THREE.Group();
const sectionGizmoGroup = new THREE.Group();
const sectionActiveGizmoGroup = new THREE.Group();
scene.add(blockGroup);
scene.add(solidVaultGroup);
scene.add(supportWallGroup);
scene.add(importedSurfaceGroup);
scene.add(sectionGizmoGroup);
scene.add(sectionActiveGizmoGroup);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const sectionDragPlane = new THREE.Plane();
const sectionDragPoint = new THREE.Vector3();
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
  "Tapered Barrel Vault": {
    historicalReferences: [],
    blockLogic: "Longitudinal courses lofted between full-size and scaled barrel sections.",
    jointPatterns: "Transverse arch rings gradually change width along the taper.",
    constructionMethods: "Duplicate the barrel profile, scale the far end profile, then loft intrados/extrados surfaces.",
  },
  "Groin Vault": {
    historicalReferences: [
      { title: "Britannica: Groin Vault", url: "https://www.britannica.com/technology/groin-vault" },
      { title: "Wikipedia: Groin Vault", url: "https://en.wikipedia.org/wiki/Groin_vault" },
      { title: "CGTrader: Gothic Groin + Rib Vault Model", url: "https://www.cgtrader.com/3d-models/architectural/other/gothic-groin-vault-and-rib-vault" },
      { title: "SketchUp Warehouse: Roman Groin Vault", url: "https://3dwarehouse.sketchup.com/model/c8db1f7f207c40c6256ec53cd94b6afc/Roman-Groin-Vault" },
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

const evalBarrelArchProfile = (nx) => {
  const x = clamp(nx, 0, 1);
  if (state.archType === "Semicircular") {
    return Math.sqrt(Math.max(0, 1 - x ** 2));
  }
  if (state.archType === "Segmental") {
    // Flatter than semicircular while keeping springings and crown fixed.
    return Math.pow(Math.max(0, 1 - x ** 2), 1.25);
  }
  if (state.archType === "Pointed") {
    // DXF-calibrated pointed profile (piecewise quadratic, C0 at apex).
    // Control ratio from "pointer arch .dxf": yc/apex = 26.41583180471286 / 30.74196557076337.
    const yc = 0.8592909561274998;
    const t = Math.sqrt(Math.max(0, 1 - x)); // x=1 springing, x=0 apex
    const y = 2 * (1 - t) * t * yc + t * t;
    return Math.max(0, Math.min(1, y));
  }
  if (state.archType === "Elliptical" || state.archType === "Catenary") {
    // Legacy "Catenary" option maps to Elliptical behavior.
    return Math.pow(Math.max(0, 1 - x ** 2), 0.82);
  }
  return Math.sqrt(Math.max(0, 1 - x ** 2));
};

const getBarrelWallHeight = (scale = state.cubeScale) => {
  return Math.max(0.3, (state.params.rise + state.wallHeightOffset) * scale);
};

const syncWallThicknessWithVault = () => {
  state.wallThickness = clamp(state.params.thickness, 0.1, 4);
};

const getDragLerp = () => {
  if (state.dragSensitivity === "Precise") return 0.18;
  if (state.dragSensitivity === "Fast") return 0.55;
  return 0.32;
};

const getBarrelSpringingY = (scale = state.cubeScale) => {
  return getBarrelWallHeight(scale);
};

const intersectInfinite2D = (p1, p2, p3, p4) => {
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;
  const x4 = p4.x, y4 = p4.y;
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 1e-8) return null;
  const a = x1 * y2 - y1 * x2;
  const b = x3 * y4 - y3 * x4;
  const x = (a * (x3 - x4) - (x1 - x2) * b) / den;
  const y = (a * (y3 - y4) - (y1 - y2) * b) / den;
  return new THREE.Vector2(x, y);
};

const offsetJoinedPolyline = (pts, dist, miterLimit = 3.0) => {
  if (!pts?.length) return [];
  if (pts.length < 2) return pts.map((p) => p.clone());
  const out = [];
  const segNormals = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.max(1e-8, Math.hypot(dx, dy));
    segNormals.push(new THREE.Vector2(dy / len, -dx / len)); // right normal
  }
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) {
      out.push(pts[i].clone().addScaledVector(segNormals[0], dist));
      continue;
    }
    if (i === pts.length - 1) {
      out.push(pts[i].clone().addScaledVector(segNormals[segNormals.length - 1], dist));
      continue;
    }
    const pPrev = pts[i - 1];
    const pCurr = pts[i];
    const pNext = pts[i + 1];
    const t0 = pCurr.clone().sub(pPrev).normalize();
    const t1 = pNext.clone().sub(pCurr).normalize();
    const n0 = segNormals[i - 1];
    const n1 = segNormals[i];
    // Very sharp cusps (e.g. pointed arch apex) are unstable for miter intersections.
    // Use a safe averaged bevel point to avoid spikes/self-intersection.
    const turnDot = t0.dot(t1);
    if (turnDot < -0.2) {
      // Reduce effective offset near very sharp cusps (pointed apex) to avoid
      // local foldover/self-intersection while preserving a pointed silhouette.
      const cuspScale = clamp((turnDot + 1) / 0.8, 0.12, 1);
      const localDist = dist * cuspScale;
      const q0 = pCurr.clone().addScaledVector(n0, localDist);
      const q1 = pCurr.clone().addScaledVector(n1, localDist);
      out.push(q0.add(q1).multiplyScalar(0.5));
      continue;
    }
    const a0 = pPrev.clone().addScaledVector(n0, dist);
    const a1 = pCurr.clone().addScaledVector(n0, dist);
    const b0 = pCurr.clone().addScaledVector(n1, dist);
    const b1 = pNext.clone().addScaledVector(n1, dist);
    const hit = intersectInfinite2D(a0, a1, b0, b1);
    if (!hit) {
      out.push(pCurr.clone().addScaledVector(n1, dist));
      continue;
    }
    const mLen = hit.distanceTo(pCurr);
    if (!Number.isFinite(mLen) || mLen > Math.abs(dist) * miterLimit) {
      const bis = n0.clone().add(n1);
      if (bis.lengthSq() < 1e-8) {
        out.push(pCurr.clone().addScaledVector(n1, dist));
      } else {
        bis.normalize();
        out.push(pCurr.clone().addScaledVector(bis, dist));
      }
    } else {
      out.push(hit);
    }
  }
  return out;
};

const buildBarrelSectionPolyline = (scale = state.cubeScale, includeLegs = true) => {
  const span = state.params.span * scale;
  const rise = state.params.rise * scale * (Math.cos((state.springingAngle * Math.PI) / 180) || 1);
  const springY = getBarrelSpringingY(scale);
  const halfW = span * 0.5;
  const legN = 12;
  // Denser sampling improves crown/springing shading quality.
  // Keep pointed odd so no sample sits exactly on the cusp.
  const archN = state.archType === "Pointed" ? 361 : 240;
  const pts = [];
  if (includeLegs) {
    for (let i = 0; i <= legN; i++) {
      const t = i / legN;
      pts.push(new THREE.Vector2(-halfW, t * springY));
    }
  }
  // Cosine-reparameterized sampling concentrates points near springings,
  // removing the visible "extra segment" artifact at leg/arch transitions.
  for (let i = 1; i < archN; i++) {
    const t = i / archN;
    const tw = 0.5 - 0.5 * Math.cos(Math.PI * t);
    const x = -halfW + tw * span;
    const nx = clamp(Math.abs(x) / Math.max(0.001, halfW), 0, 1);
    const y = springY + rise * Math.max(0, evalBarrelArchProfile(nx));
    pts.push(new THREE.Vector2(x, y));
  }
  if (includeLegs) {
    for (let i = 0; i <= legN; i++) {
      const t = i / legN;
      pts.push(new THREE.Vector2(halfW, springY * (1 - t)));
    }
  }
  return { pts, halfW, springY, rise };
};

const makeTextSprite = (text, color = "#ffe2a0") => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "600 26px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(2.4, 0.6, 1);
  return sp;
};

const setSectionGizmoHover = (handleName) => {
  state.hoveredSectionHandle = handleName || null;
  sectionGizmoGroup.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || !obj.userData.gizmoHandle || !obj.material) return;
    const active = obj.userData.gizmoHandle === state.hoveredSectionHandle || obj.userData.gizmoHandle === state.draggingSectionHandle;
    obj.material.emissive = new THREE.Color(active ? 0x7ec8ff : 0x3b2d16);
    obj.material.emissiveIntensity = active ? 0.95 : 0.4;
    obj.scale.setScalar(active ? 1.18 : 1);
  });
};

const showActiveHandleGizmo = (handleName) => {
  clearGroup(sectionActiveGizmoGroup);
  if (!handleName) return;
  const h = sectionGizmoGroup.children.find((x) => x?.userData?.gizmoHandle === handleName);
  if (!h) return;
  const p = h.position.clone();
  const axisLen = 2.6;
  const mx = new THREE.Mesh(new THREE.BoxGeometry(axisLen, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0xff5a4f }));
  mx.position.set(p.x + axisLen * 0.5, p.y, p.z);
  const my = new THREE.Mesh(new THREE.BoxGeometry(0.08, axisLen, 0.08), new THREE.MeshBasicMaterial({ color: 0x56e56a }));
  my.position.set(p.x, p.y + axisLen * 0.5, p.z);
  const mz = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, axisLen), new THREE.MeshBasicMaterial({ color: 0x4a79ff }));
  mz.position.set(p.x, p.y, p.z + axisLen * 0.5);
  sectionActiveGizmoGroup.add(mx);
  sectionActiveGizmoGroup.add(my);
  sectionActiveGizmoGroup.add(mz);
};

const barrelVaultPoint = (u, v) => {
  const { span, rise, length } = state.params;
  const scale = state.cubeScale;
  const sSpan = span * scale;
  const sRise = rise * scale;
  const sLength = length * scale;
  const x = (u - 0.5) * sSpan;
  const z = (v - 0.5) * sLength;
  const nx = clamp(Math.abs(x) / Math.max(0.001, sSpan * 0.5), 0, 1);
  const springFactor = Math.cos((state.springingAngle * Math.PI) / 180) || 1;
  const profile = evalBarrelArchProfile(nx);
  const springY = getBarrelSpringingY(scale);
  const y = springY + sRise * springFactor * Math.max(0, profile);
  return new THREE.Vector3(x, y, z);
};

const taperedBarrelVaultPoint = (u, v) => {
  const { span, rise, length } = state.params;
  const scale = state.cubeScale;
  const taper = THREE.MathUtils.lerp(1, clamp(state.taperScale, 0.25, 1.5), clamp(v, 0, 1));
  const sSpan = span * scale * taper;
  const sRise = rise * scale;
  const sLength = length * scale;
  const x = (u - 0.5) * sSpan;
  const z = (v - 0.5) * sLength;
  const nx = clamp(Math.abs(u - 0.5) * 2, 0, 1);
  const springFactor = Math.cos((state.springingAngle * Math.PI) / 180) || 1;
  const profile = evalBarrelArchProfile(nx);
  const springY = getBarrelSpringingY(scale);
  const y = springY + sRise * springFactor * Math.max(0, profile);
  return new THREE.Vector3(x, y, z);
};

const vaultEvaluators = {
  "Barrel Vault": barrelVaultPoint,
  "Tapered Barrel Vault": taperedBarrelVaultPoint,
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
      if (isBarrelLikeVault()) {
        if (state.barrelBondMode === "2") {
          const sh = (r % 2 ? 0.5 : 0) / cols;
          u0 += sh;
          u1 += sh;
        } else if (state.barrelBondMode === "3") {
          const sh = (r / Math.max(1, rows - 1)) * (0.75 / cols);
          u0 += sh;
          u1 += sh;
        } else if (state.barrelBondMode === "4") {
          const side = ((c + 0.5) / cols - 0.5);
          const fan = (r / Math.max(1, rows - 1)) * (0.8 / cols);
          u0 += Math.sign(side || 1) * fan;
          u1 += Math.sign(side || 1) * fan;
          // Add taper condition: courses tighten toward crown.
          const crown = clamp((r / Math.max(1, rows - 1)), 0, 1);
          const taper = 1 - crown * 0.28;
          const mid = (u0 + u1) * 0.5;
          const w = (u1 - u0) * taper;
          u0 = mid - w * 0.5;
          u1 = mid + w * 0.5;
        }
      }
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

const archOverlayConfig = {
  cx: 500,
  baseY: 650,
  spanScalePxPerM: 8.5,
  riseScalePxPerM: 13,
  minHalfW: 40,
  maxHalfW: 420,
  minRisePx: 20,
  maxRisePx: 320,
};

const buildBarrelSectionGizmo3d = () => {
  clearGroup(sectionGizmoGroup);
  clearGroup(sectionActiveGizmoGroup);
  if (!isBarrelLikeVault()) return;
  const scale = state.cubeScale;
  const span = state.params.span * scale;
  const { pts: sectionPts, halfW, springY, rise } = buildBarrelSectionPolyline(scale);
  const length = state.params.length * scale;
  const z = -(length * 0.58);
  const wallT = Math.max(0.1, state.wallThickness * scale);
  const wallH = Math.max(0.3, rise + state.wallHeightOffset * scale);
  const useInsideRef = state.barrelOffsetSide !== "Outside";
  const shellT = Math.max(0.1, state.params.thickness * scale);
  const offsetPts = offsetJoinedPolyline(sectionPts, shellT, 2.2);
  const refPts = (useInsideRef ? sectionPts : offsetPts).map((p) => new THREE.Vector3(p.x, p.y, z));
  const otherPts = (useInsideRef ? offsetPts : sectionPts).map((p) => new THREE.Vector3(p.x, p.y, z));
  const mkOverlayMat = (color, opacity) => new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
  });
  const profileGeo = new THREE.BufferGeometry().setFromPoints(refPts);
  const profile = new THREE.Line(profileGeo, mkOverlayMat(0xffdf9f, 0.95));
  profile.renderOrder = 9000;
  sectionGizmoGroup.add(profile);
  const altGeo = new THREE.BufferGeometry().setFromPoints(otherPts);
  const altLine = new THREE.Line(altGeo, mkOverlayMat(0x9eb2c9, 0.65));
  altLine.renderOrder = 9000;
  sectionGizmoGroup.add(altLine);
  const baseGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-halfW, 0, z), new THREE.Vector3(halfW, 0, z)]);
  const base = new THREE.Line(baseGeo, mkOverlayMat(0xd2bd8a, 0.7));
  base.renderOrder = 9000;
  sectionGizmoGroup.add(base);
  const xAxisGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, springY, z), new THREE.Vector3(Math.max(2, halfW * 0.45), springY, z)]);
  const xAxis = new THREE.Line(xAxisGeo, mkOverlayMat(0xff6b6b, 0.85));
  xAxis.renderOrder = 9000;
  sectionGizmoGroup.add(xAxis);
  const yAxisGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, springY, z), new THREE.Vector3(0, springY + Math.max(2, rise * 0.75), z)]);
  const yAxis = new THREE.Line(yAxisGeo, mkOverlayMat(0x76d275, 0.85));
  yAxis.renderOrder = 9000;
  sectionGizmoGroup.add(yAxis);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffdf9f, emissive: 0x3b2d16, emissiveIntensity: 0.4, roughness: 0.4, metalness: 0.1 });
  const r = Math.max(0.18, span * 0.014);
  const handleGeo = new THREE.SphereGeometry(r, 14, 14);
  const spanHandle = new THREE.Mesh(handleGeo, mat.clone());
  spanHandle.position.set(halfW, springY, z);
  spanHandle.userData.gizmoHandle = "span";
  sectionGizmoGroup.add(spanHandle);
  const riseHandle = new THREE.Mesh(handleGeo, mat.clone());
  riseHandle.position.set(0, springY + rise, z);
  riseHandle.userData.gizmoHandle = "rise";
  sectionGizmoGroup.add(riseHandle);
  const spanLabel = makeTextSprite("Width", "#ff8f8f");
  if (spanLabel) {
    spanLabel.position.set(halfW + r * 2.4, r * 2.6, z);
    sectionGizmoGroup.add(spanLabel);
  }
  const spanValue = makeTextSprite(`Span ${state.params.span.toFixed(2)} m`, "#ffd0d0");
  if (spanValue) {
    spanValue.position.set(halfW + r * 3.2, springY - r * 2.2, z);
    sectionGizmoGroup.add(spanValue);
  }
  const riseLabel = makeTextSprite("Height", "#92e097");
  if (riseLabel) {
    riseLabel.position.set(r * 3.2, rise + r * 2.3, z);
    sectionGizmoGroup.add(riseLabel);
  }
  const riseValue = makeTextSprite(`Rise ${state.params.rise.toFixed(2)} m`, "#c6ffd2");
  if (riseValue) {
    riseValue.position.set(r * 3.4, springY + rise + r * 0.2, z);
    sectionGizmoGroup.add(riseValue);
  }
  void wallT;
  void wallH;
  setSectionGizmoHover(state.hoveredSectionHandle);
  showActiveHandleGizmo(state.draggingSectionHandle || state.hoveredSectionHandle);
};

const buildBarrelArchOverlay2d = () => {
  if (!isBarrelLikeVault()) return [];
  const { cx, baseY, spanScalePxPerM, riseScalePxPerM, minHalfW, maxHalfW, minRisePx, maxRisePx } = archOverlayConfig;
  const halfW = clamp(state.params.span * spanScalePxPerM * 0.5, minHalfW, maxHalfW);
  const risePx = clamp(state.params.rise * riseScalePxPerM, minRisePx, maxRisePx);
  const tPx = Math.max(2, state.params.thickness * riseScalePxPerM);
  const useInsideRef = state.barrelOffsetSide !== "Outside";
  const legPx = clamp(risePx * 0.32, 20, 150);
  const legN = 12;
  const archN = 84;
  const section = [];
  for (let i = 0; i <= legN; i++) {
    const t = i / legN;
    section.push({ x: cx - halfW, y: baseY + legPx * (1 - t) });
  }
  for (let i = 1; i < archN; i++) {
    const t = i / archN;
    const nx = Math.abs((t - 0.5) * 2);
    const profile = Math.max(0, evalBarrelArchProfile(nx));
    section.push({ x: cx - halfW + t * halfW * 2, y: baseY - profile * risePx });
  }
  for (let i = 0; i <= legN; i++) {
    const t = i / legN;
    section.push({ x: cx + halfW, y: baseY - legPx * t });
  }
  const sectionV = section.map((p) => new THREE.Vector2(p.x, p.y));
  const offsetV = offsetJoinedPolyline(sectionV, tPx, 2.2);
  const refV = useInsideRef ? sectionV : offsetV;
  const otherV = useInsideRef ? offsetV : sectionV;
  const ptsRef = refV.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  const ptsOther = otherV.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  return [
    `<line x1="${(cx - halfW).toFixed(2)}" y1="${baseY}" x2="${(cx + halfW).toFixed(2)}" y2="${baseY}" stroke="rgba(255,226,160,0.45)" stroke-width="1.0" stroke-dasharray="4 4"/>`,
    `<line x1="${cx}" y1="${baseY}" x2="${cx}" y2="${(baseY - risePx).toFixed(2)}" stroke="rgba(255,226,160,0.35)" stroke-width="1"/>`,
    `<polyline points="${ptsOther.join(" ")}" fill="none" stroke="rgba(150,176,206,0.7)" stroke-width="1.6"/>`,
    `<polyline points="${ptsRef.join(" ")}" fill="none" stroke="rgba(255,226,160,0.95)" stroke-width="2.2"/>`,
    `<circle class="arch-handle" data-handle="span" cx="${(cx + halfW).toFixed(2)}" cy="${baseY}" r="6" fill="rgba(255,226,160,0.95)" stroke="rgba(20,20,20,0.7)" stroke-width="1.2"/>`,
    `<circle class="arch-handle" data-handle="rise" cx="${cx}" cy="${(baseY - risePx).toFixed(2)}" r="6" fill="rgba(255,226,160,0.95)" stroke="rgba(20,20,20,0.7)" stroke-width="1.2"/>`,
    `<text x="${cx}" y="${(baseY - risePx - 12).toFixed(2)}" fill="rgba(255,236,188,0.9)" font-size="12" text-anchor="middle">Barrel Arch: ${state.archType}</text>`,
  ];
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
  clearGroup(solidVaultGroup);
  clearGroup(supportWallGroup);
  buildSupportWalls();
  if (!state.patternAppliedToModel) {
    buildSolidVaultMesh();
    applyDisplayPreset();
    return;
  }
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

const buildSupportWalls = () => {
  const def = vaultLibrary[state.vaultType];
  if (!def?.construction3D?.toLowerCase().includes("extrud") && !isBarrelLikeVault()) return;
  if (isBarrelLikeVault()) {
    // Barrel now derives wall continuity from the joined section profile itself.
    // Do not add separate support-wall boxes here, or we get duplicate/offset walls.
    return;
  }
};

const buildSolidVaultMesh = () => {
  if (state.vaultType === "Barrel Vault") {
    buildBarrelSolidExtrusionMesh();
    return;
  }
  if (state.vaultType === "Tapered Barrel Vault") {
    buildTaperedBarrelSolidLoftMesh();
    return;
  }
  const cyclicU = state.vaultType === "Dome";
  const du = 1 / 72;
  const dv = 1 / 56;
  const rows = Math.max(18, Math.floor((state.params.courseCount || 18) * 2.2));
  const cols = Math.max(18, Math.floor((state.params.blockCount || 18) * 2.2));
  const top = [];
  const bot = [];
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const v = r / rows;
      const uu = cyclicU ? wrap01(u) : clamp(u, 0, 1);
      const p = getVaultPoint(uu, clamp(v, 0, 1));
      const pu = getVaultPoint(cyclicU ? wrap01(uu + du) : clamp(uu + du, 0, 1), clamp(v, 0, 1));
      const pv = getVaultPoint(uu, clamp(v + dv, 0, 1));
      const normal = pu.clone().sub(p).cross(pv.clone().sub(p)).normalize();
      top.push(p);
      bot.push(p.clone().addScaledVector(normal, -(state.params.thickness + state.extradosOffset)));
    }
  }
  const vertices = [...top, ...bot];
  const stride = cols + 1;
  const baseBot = top.length;
  const idx = [];
  const quad = (a, b, c, d) => { idx.push(a, b, c, a, c, d); };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * stride + c;
      const b = a + 1;
      const d = a + stride;
      const c2 = d + 1;
      quad(a, b, c2, d);
      quad(baseBot + d, baseBot + c2, baseBot + b, baseBot + a);
    }
  }
  for (let c = 0; c < cols; c++) {
    const a = c;
    const b = c + 1;
    quad(a, b, baseBot + b, baseBot + a);
    const ar = rows * stride + c;
    const br = ar + 1;
    quad(baseBot + ar, baseBot + br, br, ar);
  }
  if (!cyclicU) {
    for (let r = 0; r < rows; r++) {
      const a = r * stride;
      const b = a + stride;
      quad(baseBot + a, a, b, baseBot + b);
      const ar = r * stride + cols;
      const br = ar + stride;
      quad(ar, baseBot + ar, baseBot + br, br);
    }
  }
  const pos = new Float32Array(vertices.length * 3);
  vertices.forEach((v, i) => {
    pos[i * 3] = v.x;
    pos[i * 3 + 1] = v.y;
    pos[i * 3 + 2] = v.z;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setIndex(idx);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xb8c0cc, roughness: 0.42, metalness: 0.08, transparent: true, opacity: 0.95 }));
  mesh.name = "solid-vault";
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 26),
    new THREE.LineBasicMaterial({ color: 0xeff4ff, transparent: true, opacity: 0.2 })
  );
  edges.name = "solid-edges";
  mesh.add(edges);
  solidVaultGroup.add(mesh);
};

const buildBarrelSolidExtrusionMesh = () => {
  const scale = state.cubeScale;
  const length = state.params.length * scale;
  const z0 = -length * 0.5;
  const z1 = length * 0.5;
  const { pts: sectionPts } = buildBarrelSectionPolyline(scale, true);
  const profileN = sectionPts.length - 1;
  const zN = Math.max(10, Math.floor((state.params.courseCount || 16) * 1.2));
  const offset = Math.max(0.1, state.params.thickness * scale);
  const useInsideRef = state.barrelOffsetSide !== "Outside";
  const offsetPts = offsetJoinedPolyline(sectionPts, offset, 2.2);
  const top = [];
  const bot = [];
  for (let r = 0; r <= zN; r++) {
    const z = THREE.MathUtils.lerp(z0, z1, r / zN);
    for (let c = 0; c < sectionPts.length; c++) {
      const ref2 = useInsideRef ? sectionPts[c] : offsetPts[c];
      const off2 = useInsideRef ? offsetPts[c] : sectionPts[c];
      const ref = new THREE.Vector3(ref2.x, ref2.y, z);
      const off = new THREE.Vector3(off2.x, off2.y, z);
      top.push(ref);
      bot.push(off);
    }
  }
  const vertices = [...top, ...bot];
  const stride = profileN + 1;
  const botBase = top.length;
  const idx = [];
  const quad = (a, b, c, d) => { idx.push(a, b, c, a, c, d); };
  for (let r = 0; r < zN; r++) {
    for (let c = 0; c < profileN; c++) {
      const a = r * stride + c;
      const b = a + 1;
      const d = a + stride;
      const c2 = d + 1;
      quad(a, b, c2, d);
      quad(botBase + d, botBase + c2, botBase + b, botBase + a);
    }
  }
  for (let r = 0; r < zN; r++) {
    const a0 = r * stride;
    const b0 = a0 + stride;
    quad(botBase + a0, a0, b0, botBase + b0);
    const a1 = r * stride + profileN;
    const b1 = a1 + stride;
    quad(a1, botBase + a1, botBase + b1, b1);
  }
  // Close barrel ends so shell thickness reads clearly in Rendered/Shaded modes.
  for (let c = 0; c < profileN; c++) {
    const a = c;
    const b = c + 1;
    quad(a, b, botBase + b, botBase + a);
    const ar = zN * stride + c;
    const br = ar + 1;
    quad(botBase + ar, botBase + br, br, ar);
  }
  const pos = new Float32Array(vertices.length * 3);
  vertices.forEach((v, i) => {
    pos[i * 3] = v.x;
    pos[i * 3 + 1] = v.y;
    pos[i * 3 + 2] = v.z;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setIndex(idx);
  geometry.computeVertexNormals();
  geometry.normalizeNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xb8c0cc, roughness: 0.42, metalness: 0.08, transparent: false, opacity: 1 }));
  mesh.name = "solid-vault";
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 26),
    new THREE.LineBasicMaterial({ color: 0xeff4ff, transparent: true, opacity: 0.2 })
  );
  edges.name = "solid-edges";
  mesh.add(edges);
  solidVaultGroup.add(mesh);
};

const buildTaperedBarrelSolidLoftMesh = () => {
  const scale = state.cubeScale;
  const length = state.params.length * scale;
  const z0 = -length * 0.5;
  const z1 = length * 0.5;
  const { pts: sectionPts } = buildBarrelSectionPolyline(scale, true);
  const profileN = sectionPts.length - 1;
  const zN = Math.max(10, Math.floor((state.params.courseCount || 16) * 1.2));
  const offset = Math.max(0.1, state.params.thickness * scale);
  const useInsideRef = state.barrelOffsetSide !== "Outside";
  const offsetPts = offsetJoinedPolyline(sectionPts, offset, 2.2);
  const taperEnd = clamp(state.taperScale, 0.25, 1.5);
  const scaleSectionPoint = (p, t) => new THREE.Vector2(p.x * THREE.MathUtils.lerp(1, taperEnd, t), p.y);
  const top = [];
  const bot = [];
  for (let r = 0; r <= zN; r++) {
    const t = r / zN;
    const z = THREE.MathUtils.lerp(z0, z1, t);
    for (let c = 0; c < sectionPts.length; c++) {
      const ref2 = scaleSectionPoint(useInsideRef ? sectionPts[c] : offsetPts[c], t);
      const off2 = scaleSectionPoint(useInsideRef ? offsetPts[c] : sectionPts[c], t);
      top.push(new THREE.Vector3(ref2.x, ref2.y, z));
      bot.push(new THREE.Vector3(off2.x, off2.y, z));
    }
  }
  const vertices = [...top, ...bot];
  const stride = profileN + 1;
  const botBase = top.length;
  const idx = [];
  const quad = (a, b, c, d) => { idx.push(a, b, c, a, c, d); };
  for (let r = 0; r < zN; r++) {
    for (let c = 0; c < profileN; c++) {
      const a = r * stride + c;
      const b = a + 1;
      const d = a + stride;
      const c2 = d + 1;
      quad(a, b, c2, d);
      quad(botBase + d, botBase + c2, botBase + b, botBase + a);
    }
  }
  for (let r = 0; r < zN; r++) {
    const a0 = r * stride;
    const b0 = a0 + stride;
    quad(botBase + a0, a0, b0, botBase + b0);
    const a1 = r * stride + profileN;
    const b1 = a1 + stride;
    quad(a1, botBase + a1, botBase + b1, b1);
  }
  for (let c = 0; c < profileN; c++) {
    const a = c;
    const b = c + 1;
    quad(a, b, botBase + b, botBase + a);
    const ar = zN * stride + c;
    const br = ar + 1;
    quad(botBase + ar, botBase + br, br, ar);
  }
  const pos = new Float32Array(vertices.length * 3);
  vertices.forEach((v, i) => {
    pos[i * 3] = v.x;
    pos[i * 3 + 1] = v.y;
    pos[i * 3 + 2] = v.z;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setIndex(idx);
  geometry.computeVertexNormals();
  geometry.normalizeNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xb8c0cc, roughness: 0.42, metalness: 0.08, transparent: false, opacity: 1 }));
  mesh.name = "solid-vault";
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 26),
    new THREE.LineBasicMaterial({ color: 0xeff4ff, transparent: true, opacity: 0.2 })
  );
  edges.name = "solid-edges";
  mesh.add(edges);
  solidVaultGroup.add(mesh);
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
    transparent: false,
    opacity: 1,
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
  mk(solidVaultGroup, 0x9be6be);
  mk(supportWallGroup, 0xa0a7b3);
  mk(importedSurfaceGroup, 0x78cfff);
};

const applyLayoutStyle = () => {
  nodes.layout2d.classList.remove("layout-blueprint", "layout-paper", "layout-contrast");
  if (state.layoutStyle === "Blueprint") nodes.layout2d.classList.add("layout-blueprint");
  else if (state.layoutStyle === "Paper") nodes.layout2d.classList.add("layout-paper");
  else if (state.layoutStyle === "High Contrast") nodes.layout2d.classList.add("layout-contrast");
};

const applyDisplayPreset = () => {
  // Backward-compat mapping for older saved presets.
  const mappedPreset = state.displayPreset === "Shaded + Edges" ? "Shaded"
    : state.displayPreset === "Technical Wire" ? "Wireframe"
      : state.displayPreset;
  state.displayPreset = mappedPreset;
  const foilBase = getFoilGradientColor(0.5);
  const foilFail = foilBase.clone().lerp(new THREE.Color(0xd8b078), 0.5);
  state.blocks.forEach((b, i) => {
    if (!b.mesh) return;
    const failed = b.failed.length > 0;
    const seam = b.mesh.getObjectByName("seam");
    if (b.mesh.material) b.mesh.material.dispose();
    const sideMode = state.display.backFaces ? THREE.DoubleSide : THREE.FrontSide;
    if (state.displayPreset === "Rendered") {
      b.mesh.material = state.display.foilMaterial ? createFoilMaterial(failed ? foilFail : foilBase) : new THREE.MeshStandardMaterial({
        color: failed ? 0xd5a86f : 0xc7ced6, roughness: 0.42, metalness: 0.14, transparent: false,
      });
      b.mesh.material.side = sideMode;
      if (seam) seam.visible = false;
    } else if (state.displayPreset === "Shaded") {
      b.mesh.material = new THREE.MeshStandardMaterial({
        color: failed ? 0xd5a86f : 0xc6ccd4, roughness: 0.62, metalness: 0.03, transparent: false,
      });
      b.mesh.material.side = sideMode;
      if (seam) seam.visible = state.display.seamDebug;
    } else if (state.displayPreset === "XRay") {
      b.mesh.material = new THREE.MeshStandardMaterial({
        color: failed ? 0xe0a58d : 0xcfd6e0, roughness: 0.55, metalness: 0.02, transparent: true, opacity: 0.28,
      });
      b.mesh.material.side = THREE.DoubleSide;
      if (seam) seam.visible = true;
    } else if (state.displayPreset === "Wireframe") {
      b.mesh.material = new THREE.MeshStandardMaterial({
        color: 0xb9c5d4, roughness: 0.3, metalness: 0.05, wireframe: true, transparent: false, opacity: 1,
      });
      b.mesh.material.side = sideMode;
      if (seam) seam.visible = false;
    } else if (state.displayPreset === "Ghosted") {
      b.mesh.material = new THREE.MeshStandardMaterial({
        color: failed ? 0xd5a86f : 0xc8cfd8, roughness: 0.5, metalness: 0.03, transparent: true, opacity: 0.58,
      });
      b.mesh.material.side = THREE.DoubleSide;
      if (seam) seam.visible = true;
    } else if (state.displayPreset === "Clay") {
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
    if (state.display.meshWires || state.displayPreset === "Wireframe" || state.displayPreset === "Technical Wire") {
      obj.material.wireframe = true;
      obj.material.transparent = true;
      obj.material.opacity = 0.88;
    } else if (state.displayPreset === "XRay") {
      obj.material.wireframe = false;
      obj.material.transparent = true;
      obj.material.opacity = 0.22;
    } else if (state.displayPreset === "Ghosted") {
      obj.material.wireframe = false;
      obj.material.transparent = true;
      obj.material.opacity = 0.45;
    } else {
      obj.material.wireframe = false;
      obj.material.transparent = true;
      obj.material.opacity = 0.5;
    }
    obj.material.needsUpdate = true;
  });
  solidVaultGroup.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const solidEdges = obj.getObjectByName("solid-edges");
    obj.castShadow = true;
    obj.receiveShadow = true;
    if (obj.material) obj.material.dispose();
    const sideMode = state.display.backFaces ? THREE.DoubleSide : THREE.FrontSide;
    const c = getFoilGradientColor(0.5);
    if (state.displayPreset === "Shaded") {
      obj.material = new THREE.MeshStandardMaterial({ color: 0xc6ccd4, roughness: 0.62, metalness: 0.03, transparent: false, opacity: 1 });
    } else if (state.displayPreset === "XRay") {
      obj.material = new THREE.MeshStandardMaterial({ color: 0xcfd6e0, roughness: 0.55, metalness: 0.02, transparent: true, opacity: 0.24 });
    } else if (state.displayPreset === "Wireframe") {
      obj.material = new THREE.MeshStandardMaterial({ color: 0xb9c5d4, roughness: 0.3, metalness: 0.05, wireframe: true, transparent: false, opacity: 1 });
    } else if (state.displayPreset === "Ghosted") {
      obj.material = new THREE.MeshStandardMaterial({ color: 0xc8cfd8, roughness: 0.5, metalness: 0.03, transparent: true, opacity: 0.55 });
    } else {
      obj.material = state.display.foilMaterial
        ? createFoilMaterial(c)
        : new THREE.MeshStandardMaterial({ color: 0xc7ced6, roughness: 0.44, metalness: 0.06, transparent: false, opacity: 1 });
    }
    obj.material.polygonOffset = true;
    obj.material.polygonOffsetFactor = 1;
    obj.material.polygonOffsetUnits = 1;
    obj.material.side = (state.displayPreset === "Rendered" || state.displayPreset === "Shaded")
      ? THREE.DoubleSide
      : sideMode;
    if (state.displayPreset === "XRay" || state.displayPreset === "Ghosted") {
      obj.material.side = THREE.DoubleSide;
    }
    if (state.display.meshWires || state.displayPreset === "Wireframe" || state.displayPreset === "Technical Wire") {
      obj.material.wireframe = true;
      obj.material.transparent = true;
      obj.material.opacity = 0.88;
    }
    obj.material.needsUpdate = true;
    if (solidEdges?.material) {
      solidEdges.visible = state.displayPreset !== "Wireframe";
      solidEdges.material.transparent = true;
      solidEdges.material.opacity = state.displayPreset === "Rendered" ? 0.24
        : state.displayPreset === "Shaded" ? 0.18
          : state.displayPreset === "Ghosted" ? 0.35
            : state.displayPreset === "XRay" ? 0.42
              : 0.12;
      solidEdges.material.depthTest = true;
      solidEdges.material.needsUpdate = true;
    }
  });
  supportWallGroup.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.material.side = state.display.backFaces ? THREE.DoubleSide : THREE.FrontSide;
    if (state.display.meshWires || state.displayPreset === "Wireframe" || state.displayPreset === "Technical Wire") {
      obj.material.wireframe = true;
      obj.material.transparent = true;
      obj.material.opacity = 0.85;
    } else if (state.displayPreset === "XRay") {
      obj.material.wireframe = false;
      obj.material.transparent = true;
      obj.material.opacity = 0.2;
      obj.material.side = THREE.DoubleSide;
    } else if (state.displayPreset === "Ghosted") {
      obj.material.wireframe = false;
      obj.material.transparent = true;
      obj.material.opacity = 0.48;
      obj.material.side = THREE.DoubleSide;
    } else {
      obj.material.wireframe = false;
      obj.material.transparent = true;
      obj.material.opacity = 0.92;
    }
    obj.material.needsUpdate = true;
  });
  gridHelper.visible = !!state.display.baseGrid;
  axesHelper.visible = !!state.display.baseGrid;
  lightRigHelpers.visible = !!state.display.latticeControls;
  refreshBboxHelpers();
};

const fitCameraToBlocks = () => {
  const box = new THREE.Box3();
  const a = new THREE.Box3().setFromObject(blockGroup);
  const s = new THREE.Box3().setFromObject(solidVaultGroup);
  const w = new THREE.Box3().setFromObject(supportWallGroup);
  if (!a.isEmpty()) box.union(a);
  if (!s.isEmpty()) box.union(s);
  if (!w.isEmpty()) box.union(w);
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
  const s = new THREE.Box3().setFromObject(solidVaultGroup);
  const w = new THREE.Box3().setFromObject(supportWallGroup);
  const b = new THREE.Box3().setFromObject(importedSurfaceGroup);
  if (!a.isEmpty()) combined.union(a);
  if (!s.isEmpty()) combined.union(s);
  if (!w.isEmpty()) combined.union(w);
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
  if (!state.patternAppliedToModel) {
    nodes.inspector.innerHTML = "<b>Inspector</b><p>Solid preview active. Click Apply To Model to map blocks onto the vault.</p>";
    return;
  }
  const b = state.blocks.find((x) => x.id === state.selectedBlockId);
  if (!b) {
    nodes.inspector.innerHTML = "<b>Inspector</b><p>Select a block in 2D or 3D.</p>";
    return;
  }
  nodes.inspector.innerHTML = `<b>Inspector</b><p>ID: ${b.id}</p><p>Length: ${b.metrics.avgLength.toFixed(2)} m</p><p>Width: ${b.metrics.avgWidth.toFixed(2)} m</p><p>Weight: ${b.metrics.weight.toFixed(1)} kg</p><p>Status: ${b.failed.length ? `Invalid (${b.failed.join(", ")})` : "Valid"}</p>`;
};

const renderMetrics = () => {
  const invalid = state.blocks.filter((b) => (b.failed || []).length);
  const vol = state.blocks.reduce((s, b) => s + (b.metrics?.volume || 0), 0);
  const wt = state.blocks.reduce((s, b) => s + (b.metrics?.weight || 0), 0);
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
  const def = vaultLibrary[state.vaultType];
  const p = precedentDb[state.vaultType];
  if (!p) {
    nodes.precedentDetails.innerHTML = "No precedent data.";
    return;
  }
  const refs = p.historicalReferences.length
    ? p.historicalReferences.map((r) => `<li><a href="${r.url}" target="_blank" rel="noreferrer">${r.title}</a></li>`).join("")
    : "<li>No external references</li>";
  nodes.precedentDetails.innerHTML = [
    def ? `<div><b>2D construction:</b> ${def.construction2D}</div>` : "",
    def ? `<div><b>3D construction:</b> ${def.construction3D}</div>` : "",
    def ? `<div><b>Force flow:</b> ${def.forceFlowType}</div>` : "",
    def ? `<div><b>Default stereotomy:</b> ${def.stereotomyType}</div>` : "",
    `<div><b>Block logic:</b> ${p.blockLogic}</div>`,
    `<div><b>Joint patterns:</b> ${p.jointPatterns}</div>`,
    `<div><b>Construction:</b> ${p.constructionMethods}</div>`,
    "<div><b>Historical references:</b></div>",
    `<ul>${refs}</ul>`,
  ].join("");
};

const syncInputsFromState = () => {
  syncWallThicknessWithVault();
  ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "keystoneSize"].forEach((id) => {
    syncInputPair(id, state.params[id]);
  });
  if (byId("vaultType")) byId("vaultType").value = state.vaultType;
  if (byId("subdivision")) byId("subdivision").value = state.pattern;
  if (byId("jointMode")) byId("jointMode").value = state.jointMode;
  syncInputPair("cubeScale", state.cubeScale);
  if (byId("arrayUV")) byId("arrayUV").value = `${state.arrayU}x${state.arrayV}`;
  syncInputPair("springingAngle", state.springingAngle);
  syncInputPair("taperScale", state.taperScale);
  if (byId("archType")) byId("archType").value = state.archType;
  syncInputPair("targetBlockWidth", state.targetBlockWidth);
  if (byId("barrelBondMode")) byId("barrelBondMode").value = state.barrelBondMode;
  if (byId("dragSensitivity")) byId("dragSensitivity").value = state.dragSensitivity;
  if (byId("barrelOffsetSide")) byId("barrelOffsetSide").value = state.barrelOffsetSide;
  syncInputPair("wallThickness", state.wallThickness);
  syncInputPair("wallHeightOffset", state.wallHeightOffset);
  if (byId("bayRatio")) byId("bayRatio").value = `${state.bayRatioX}:${state.bayRatioY}`;
  syncInputPair("ribCount", state.ribCount);
  syncInputPair("lierneDensity", state.lierneDensity);
  syncInputPair("netFrequency", state.netFrequency);
  syncInputPair("tileLayers", state.tileLayers);
  syncInputPair("extradosOffset", state.extradosOffset);
  if (byId("supportTopology")) byId("supportTopology").value = state.supportTopology;
  syncInputPair("groinMorph", state.groinMorph);
  syncInputPair("lInterlockBias", state.lInterlockBias);
  if (byId("lightingPreset")) byId("lightingPreset").value = state.lightingPreset;
  if (byId("displayPreset")) byId("displayPreset").value = state.displayPreset;
  if (byId("layoutStyle")) byId("layoutStyle").value = state.layoutStyle;
  if (byId("foilColorA")) byId("foilColorA").value = state.foilGradient.a;
  if (byId("foilColorB")) byId("foilColorB").value = state.foilGradient.b;
  if (byId("foilMix")) byId("foilMix").value = String(state.foilGradient.mix);
  if (byId("foilMixNum")) byId("foilMixNum").value = String(state.foilGradient.mix);
  ["maxLength", "maxWidth", "minThickness", "maxWeight", "maxTaper", "minEdgeLength", "fabTolerance"].forEach((k) => {
    if (byId(k)) byId(k).value = String(state.constraints[k]);
    if (byId(`${k}Slider`)) byId(`${k}Slider`).value = String(state.constraints[k]);
  });
  if (byId("toggleBaseGrid")) byId("toggleBaseGrid").checked = state.display.baseGrid;
  document.querySelectorAll('[data-status-toggle="grid"]').forEach((el) => { el.checked = state.display.baseGrid; });
  if (byId("toggleBoundingBoxes")) byId("toggleBoundingBoxes").checked = state.display.boundingBoxes;
  if (byId("toggleLatticeControls")) byId("toggleLatticeControls").checked = state.display.latticeControls;
  document.querySelectorAll('[data-status-toggle="gumball"]').forEach((el) => { el.checked = state.display.latticeControls; });
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
  if (typeof preset.groinMorph === "number") state.groinMorph = preset.groinMorph;
  if (typeof preset.bayRatioX === "number") state.bayRatioX = preset.bayRatioX;
  if (typeof preset.bayRatioY === "number") state.bayRatioY = preset.bayRatioY;
  state.designMode = "Generated";
  state.patternAppliedToModel = false;
  if (isBarrelLikeVault()) state.barrelOffsetSide = "Inside";
  syncWallThicknessWithVault();
  byId("designMode").value = "Generated";
  syncInputsFromState();
  if (name === "Default Groin Vault (Solid First)") {
    runSolidToStereotomicWorkflow();
    return;
  }
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
  if (typeof sol.taperScale === "number") state.taperScale = sol.taperScale;
  if (typeof sol.bayRatioX === "number") state.bayRatioX = sol.bayRatioX;
  if (typeof sol.bayRatioY === "number") state.bayRatioY = sol.bayRatioY;
  if (isBarrelLikeVault(vaultType)) state.barrelOffsetSide = "Inside";
  if (byId("subdivision")) byId("subdivision").value = state.pattern;
  if (byId("structuralDirection")) byId("structuralDirection").value = state.structuralDirection;
  syncWallThicknessWithVault();
  syncInputsFromState();
};

const fitStartupParamsToConstraints = (vaultType) => {
  const c = state.constraints;
  if (isBarrelLikeVault(vaultType)) {
    const w = clamp(state.targetBlockWidth || 1.2, 0.1, 5);
    const h = clamp(c.courseHeight || 0.65, 0.1, 5);
    state.params.blockCount = clamp(Math.round(state.params.span / w), 6, 60);
    state.params.courseCount = clamp(Math.round(state.params.length / h), 4, 80);
    return;
  }
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
    springingAngle: "springingAngle", archType: "archType", taperScale: "taperScale", targetBlockWidth: "targetBlockWidth", barrelBondMode: "barrelBondMode", barrelOffsetSide: "barrelOffsetSide", wallThickness: "wallThickness", wallHeightOffset: "wallHeightOffset", courseHeight: "courseHeight", bayRatio: "bayRatio", ribCount: "ribCount",
    lierneDensity: "lierneDensity", netFrequency: "netFrequency", tileLayers: "tileLayers", groinMorph: "groinMorph", lInterlockBias: "lInterlockBias",
  };
  Object.entries(map).forEach(([key, id]) => {
    const el = byId(id);
    const on = allowed.has(key);
    if (el) el.disabled = !on;
    if (byId(`${id}Num`)) byId(`${id}Num`).disabled = !on;
    const control = document.querySelector(`[data-param-control="${key}"]`);
    const label = control || el?.closest("label");
    if (label) label.style.opacity = on ? "1" : "0.45";
  });
  // Barrel-like vaults use explicit inside/outside shell side; hide extrados offset there.
  const extradosEl = byId("extradosOffset");
  if (extradosEl) {
    const extradosLabel = extradosEl.closest("label");
    const showExtrados = !isBarrelLikeVault();
    extradosEl.disabled = !showExtrados;
    if (byId("extradosOffsetNum")) byId("extradosOffsetNum").disabled = !showExtrados;
    if (extradosLabel) extradosLabel.style.display = showExtrados ? "" : "none";
  }
  const allowedPatterns = vaultPatternAllowed[state.vaultType] || patterns;
  const subEl = byId("subdivision");
  if (subEl) {
    [...subEl.options].forEach((opt) => { opt.disabled = !allowedPatterns.includes(opt.value); });
    if (!allowedPatterns.includes(state.pattern)) state.pattern = allowedPatterns[0];
    subEl.value = state.pattern;
  }
  applyRightPanelToolVisibility();
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
  syncWallThicknessWithVault();
  if (!state.patternAppliedToModel) {
    build3d();
  }
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
  state.blocks.forEach((b) => {
    const m = buildBlockMesh(b);
    b.metrics = m;
    b.failed = validate(m);
    if (m.geometry) m.geometry.dispose();
  });
  if (state.patternAppliedToModel) {
    build3d();
  }
  buildBarrelSectionGizmo3d();
  if (!blockGroup.children.length && !solidVaultGroup.children.length) {
    const dbg = new THREE.Mesh(
      new THREE.BoxGeometry(4, 2, 4),
      new THREE.MeshStandardMaterial({ color: 0x2fa9ff, wireframe: true })
    );
    blockGroup.add(dbg);
  }
  if (!state.suspendViewportFit) fitCameraToBlocks();
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
  const gizmoHit = raycaster.intersectObjects(sectionGizmoGroup.children, true).find((x) => x.object.userData.gizmoHandle);
  if (gizmoHit && isBarrelLikeVault()) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
    state.draggingSectionHandle = gizmoHit.object.userData.gizmoHandle;
    state.suspendViewportFit = true;
    state.draggingPointerId = event.pointerId;
    setSectionGizmoHover(state.draggingSectionHandle);
    showActiveHandleGizmo(state.draggingSectionHandle);
    const scale = state.cubeScale;
    const z = -(state.params.length * scale * 0.58);
    sectionDragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, z));
    if (renderer.domElement.setPointerCapture && typeof event.pointerId === "number") {
      renderer.domElement.setPointerCapture(event.pointerId);
    }
    controls.enabled = false;
    return;
  }
  if (!state.patternAppliedToModel) return;
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
  if (!state.draggingSectionHandle && isBarrelLikeVault()) {
    const rect3 = renderer.domElement.getBoundingClientRect();
    const inside3d = e.clientX >= rect3.left && e.clientX <= rect3.right && e.clientY >= rect3.top && e.clientY <= rect3.bottom;
    if (inside3d) {
      mouse.x = ((e.clientX - rect3.left) / rect3.width) * 2 - 1;
      mouse.y = -((e.clientY - rect3.top) / rect3.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hoverHit = raycaster.intersectObjects(sectionGizmoGroup.children, true).find((x) => x.object.userData.gizmoHandle);
      setSectionGizmoHover(hoverHit ? hoverHit.object.userData.gizmoHandle : null);
      showActiveHandleGizmo(state.draggingSectionHandle || state.hoveredSectionHandle);
    } else if (state.hoveredSectionHandle) {
      setSectionGizmoHover(null);
      showActiveHandleGizmo(state.draggingSectionHandle || null);
    }
  }
  if (state.draggingSectionHandle && isBarrelLikeVault()) {
    const rect3 = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect3.left) / rect3.width) * 2 - 1;
    mouse.y = -((e.clientY - rect3.top) / rect3.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    if (!raycaster.ray.intersectPlane(sectionDragPlane, sectionDragPoint)) return;
    const scale = state.cubeScale;
    const springY = getBarrelSpringingY(scale);
    if (state.draggingSectionHandle === "span") {
      const halfW = clamp(Math.abs(sectionDragPoint.x), 2 * scale, 30 * scale);
      const targetSpan = clamp((halfW * 2) / Math.max(0.001, scale), 4, 60);
      state.params.span = THREE.MathUtils.lerp(state.params.span, targetSpan, getDragLerp());
    } else if (state.draggingSectionHandle === "rise") {
      const ry = clamp(sectionDragPoint.y - springY, 2 * scale, 30 * scale);
      const targetRise = clamp(ry / Math.max(0.001, scale), 2, 30);
      state.params.rise = THREE.MathUtils.lerp(state.params.rise, targetRise, getDragLerp());
    } else if (state.draggingSectionHandle === "wallThickness") {
      const halfW = state.params.span * scale * 0.5;
      const outer = clamp(sectionDragPoint.x, -halfW - 2 * scale, -halfW - 0.05 * scale);
      state.params.thickness = clamp((2 * Math.abs(outer + halfW)) / Math.max(0.001, scale), 0.1, 4);
    } else if (state.draggingSectionHandle === "wallHeight") {
      const rise = state.params.rise * scale * (Math.cos((state.springingAngle * Math.PI) / 180) || 1);
      const h = clamp(sectionDragPoint.y, 0.3, 40 * scale);
      state.wallHeightOffset = clamp((h - rise) / Math.max(0.001, scale), -2, 4);
    }
    fitStartupParamsToConstraints(state.vaultType);
    syncInputsFromState();
    rebuild();
    return;
  }
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
window.addEventListener("pointerup", () => {
  state.dragging = null;
  state.draggingSectionHandle = null;
  state.suspendViewportFit = false;
  if (renderer.domElement.releasePointerCapture && typeof state.draggingPointerId === "number") {
    try { renderer.domElement.releasePointerCapture(state.draggingPointerId); } catch {}
  }
  state.draggingPointerId = null;
  controls.enabled = true;
  setSectionGizmoHover(state.hoveredSectionHandle);
  showActiveHandleGizmo(state.hoveredSectionHandle);
});
renderer.domElement.addEventListener("pointerdown", pick3d, { capture: true });

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
  linkRangeAndNumber(id, `${id}Num`, (value) => {
    state.params[id] = value;
    if (id === "thickness") {
      syncWallThicknessWithVault();
      syncInputPair("wallThickness", state.wallThickness);
    }
    rebuild();
  });
});
linkRangeAndNumber("springingAngle", "springingAngleNum", (value) => { state.springingAngle = value; rebuild(); });
linkRangeAndNumber("taperScale", "taperScaleNum", (value) => {
  state.taperScale = clamp(value, 0.25, 1.5);
  syncInputPair("taperScale", state.taperScale);
  rebuild();
});
linkRangeAndNumber("targetBlockWidth", "targetBlockWidthNum", (value) => {
  state.targetBlockWidth = Math.max(0.1, value);
  if (isBarrelLikeVault()) fitStartupParamsToConstraints(state.vaultType);
  syncInputsFromState();
  rebuild();
});
linkRangeAndNumber("wallThickness", "wallThicknessNum", (value) => {
  state.params.thickness = Math.max(0.1, value);
  syncWallThicknessWithVault();
  syncInputPair("thickness", state.params.thickness);
  syncInputPair("wallThickness", state.wallThickness);
  rebuild();
});
linkRangeAndNumber("wallHeightOffset", "wallHeightOffsetNum", (value) => {
  state.wallHeightOffset = value;
  rebuild();
});
linkRangeAndNumber("ribCount", "ribCountNum", (value) => { state.ribCount = Math.max(2, value); syncInputPair("ribCount", state.ribCount); rebuild(); });
linkRangeAndNumber("lierneDensity", "lierneDensityNum", (value) => { state.lierneDensity = clamp(value, 0, 1); syncInputPair("lierneDensity", state.lierneDensity); rebuild(); });
linkRangeAndNumber("netFrequency", "netFrequencyNum", (value) => { state.netFrequency = Math.max(1, value); syncInputPair("netFrequency", state.netFrequency); rebuild(); });
linkRangeAndNumber("tileLayers", "tileLayersNum", (value) => {
  state.tileLayers = Math.max(1, value);
  state.params.thickness = Math.max(0.15, 0.18 * state.tileLayers);
  syncInputsFromState();
  rebuild();
});
linkRangeAndNumber("extradosOffset", "extradosOffsetNum", (value) => { state.extradosOffset = Math.max(0, value); syncInputPair("extradosOffset", state.extradosOffset); rebuild(); });
linkRangeAndNumber("groinMorph", "groinMorphNum", (value) => { state.groinMorph = clamp(value, 0, 1); syncInputPair("groinMorph", state.groinMorph); rebuild(); });
linkRangeAndNumber("lInterlockBias", "lInterlockBiasNum", (value) => { state.lInterlockBias = clamp(value, 0, 1); syncInputPair("lInterlockBias", state.lInterlockBias); rebuild(); });
linkRangeAndNumber("cubeScale", "cubeScaleNum", (value) => { state.cubeScale = Math.max(0.1, value); syncInputPair("cubeScale", state.cubeScale); rebuild(); });
["maxLength", "maxWidth", "minThickness", "maxWeight", "jointGap", "bedDepth", "courseHeight", "taperAngle", "maxTaper", "minEdgeLength", "fabTolerance"].forEach((id) => {
  byId(id).addEventListener("input", (e) => { state.constraints[id] = Number(e.target.value); rebuild(); });
});
[
  ["maxLengthSlider", "maxLength"],
  ["maxWidthSlider", "maxWidth"],
  ["minThicknessSlider", "minThickness"],
  ["maxWeightSlider", "maxWeight"],
  ["maxTaperSlider", "maxTaper"],
  ["minEdgeLengthSlider", "minEdgeLength"],
  ["fabToleranceSlider", "fabTolerance"],
].forEach(([sliderId, numberId]) => linkRangeAndNumber(sliderId, numberId));
if (byId("courseHeight")) byId("courseHeight").addEventListener("input", () => {
  if (isBarrelLikeVault()) {
    fitStartupParamsToConstraints(state.vaultType);
    syncInputsFromState();
    rebuild();
  }
});
["alignScale", "alignOffsetU", "alignOffsetV", "alignRotation"].forEach((id) => {
  byId(id).addEventListener("input", (e) => {
    const key = id === "alignScale" ? "scale" : id === "alignOffsetU" ? "offsetU" : id === "alignOffsetV" ? "offsetV" : "rotationDeg";
    state.align[key] = Number(e.target.value);
    rebuild();
  });
});
byId("arrayUV").addEventListener("input", (e) => {
  const m = String(e.target.value).toLowerCase().match(/(\d+)\s*x\s*(\d+)/);
  if (!m) return;
  state.arrayU = Math.max(1, Number(m[1]));
  state.arrayV = Math.max(1, Number(m[2]));
  rebuild();
});
if (byId("archType")) byId("archType").addEventListener("change", (e) => { state.archType = e.target.value; rebuild(); });
if (byId("barrelBondMode")) byId("barrelBondMode").addEventListener("change", (e) => {
  state.barrelBondMode = e.target.value;
  rebuild();
});
if (byId("barrelOffsetSide")) byId("barrelOffsetSide").addEventListener("change", (e) => {
  state.barrelOffsetSide = e.target.value === "Outside" ? "Outside" : "Inside";
  rebuild();
});
if (byId("dragSensitivity")) byId("dragSensitivity").addEventListener("change", (e) => {
  state.dragSensitivity = ["Precise", "Normal", "Fast"].includes(e.target.value) ? e.target.value : "Normal";
});
byId("bayRatio").addEventListener("input", (e) => {
  const m = String(e.target.value).match(/([\d.]+)\s*:\s*([\d.]+)/);
  if (!m) return;
  state.bayRatioX = Math.max(0.2, Number(m[1]));
  state.bayRatioY = Math.max(0.2, Number(m[2]));
  rebuild();
});
if (byId("supportTopology")) byId("supportTopology").addEventListener("change", (e) => { state.supportTopology = e.target.value; rebuild(); });
byId("designMode").addEventListener("change", (e) => { state.designMode = e.target.value; applyRightPanelToolVisibility(); rebuild(); });
if (byId("customPatternSource")) byId("customPatternSource").addEventListener("change", (e) => { state.customPatternSource = e.target.value; rebuild(); });
if (byId("supportCount")) byId("supportCount").addEventListener("input", (e) => { state.supportCount = Math.max(3, Number(e.target.value)); rebuild(); });
if (byId("forceLmin")) byId("forceLmin").addEventListener("input", (e) => { state.forceLmin = Math.max(0.01, Number(e.target.value)); rebuild(); });
if (byId("forceLmax")) byId("forceLmax").addEventListener("input", (e) => { state.forceLmax = Math.max(state.forceLmin + 0.01, Number(e.target.value)); rebuild(); });
byId("registrationMode").addEventListener("change", (e) => { state.registrationMode = e.target.value; rebuild(); });
if (byId("jointMode")) byId("jointMode").addEventListener("change", (e) => { state.jointMode = e.target.value; rebuild(); });
byId("vaultType").addEventListener("change", (e) => {
  state.imported2DPolys = null;
  vaultStartupSeen.add(e.target.value);
  if (byId("referencePreset")) byId("referencePreset").value = "Custom";
  runVaultSelectionPipeline(e.target.value);
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
document.querySelectorAll("[data-display-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    state.displayPreset = button.dataset.displayPreset;
    syncInputsFromState();
    applyDisplayPreset();
    button.closest("details")?.removeAttribute("open");
  });
});
if (byId("layoutStyle")) byId("layoutStyle").addEventListener("change", (e) => {
  state.layoutStyle = e.target.value;
  applyLayoutStyle();
  draw2d();
});
document.querySelectorAll("[data-layout-style]").forEach((button) => {
  button.addEventListener("click", () => {
    state.layoutStyle = button.dataset.layoutStyle;
    syncInputsFromState();
    applyLayoutStyle();
    draw2d();
    button.closest("details")?.removeAttribute("open");
  });
});
if (byId("foilColorA")) byId("foilColorA").addEventListener("input", (e) => { state.foilGradient.a = e.target.value; applyDisplayPreset(); });
if (byId("foilColorB")) byId("foilColorB").addEventListener("input", (e) => { state.foilGradient.b = e.target.value; applyDisplayPreset(); });
linkRangeAndNumber("foilMix", "foilMixNum", (num) => { state.foilGradient.mix = clamp(num, 0, 1); applyDisplayPreset(); });
if (byId("toggleBaseGrid")) byId("toggleBaseGrid").addEventListener("change", (e) => {
  state.display.baseGrid = !!e.target.checked;
  document.querySelectorAll('[data-status-toggle="grid"]').forEach((el) => { el.checked = state.display.baseGrid; });
  applyDisplayPreset();
  draw2d();
});
if (byId("toggleBoundingBoxes")) byId("toggleBoundingBoxes").addEventListener("change", (e) => { state.display.boundingBoxes = !!e.target.checked; applyDisplayPreset(); });
if (byId("toggleLatticeControls")) byId("toggleLatticeControls").addEventListener("change", (e) => {
  state.display.latticeControls = !!e.target.checked;
  document.querySelectorAll('[data-status-toggle="gumball"]').forEach((el) => { el.checked = state.display.latticeControls; });
  applyDisplayPreset();
});
if (byId("toggleMeshWires")) byId("toggleMeshWires").addEventListener("change", (e) => { state.display.meshWires = !!e.target.checked; applyDisplayPreset(); });
if (byId("toggleFoilMaterial")) byId("toggleFoilMaterial").addEventListener("change", (e) => { state.display.foilMaterial = !!e.target.checked; applyDisplayPreset(); });
if (byId("toggleBackFaces")) byId("toggleBackFaces").addEventListener("change", (e) => { state.display.backFaces = !!e.target.checked; applyDisplayPreset(); });
if (byId("toggleSeamDebug")) byId("toggleSeamDebug").addEventListener("change", (e) => { state.display.seamDebug = !!e.target.checked; applyDisplayPreset(); });
document.querySelectorAll("[data-toggle-view]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.toggleView;
    if (key === "grid") {
      state.display.baseGrid = !state.display.baseGrid;
      if (byId("toggleBaseGrid")) byId("toggleBaseGrid").checked = state.display.baseGrid;
      document.querySelectorAll('[data-status-toggle="grid"]').forEach((el) => { el.checked = state.display.baseGrid; });
      applyDisplayPreset();
      draw2d();
    }
    if (key === "edges") {
      state.display.meshWires = !state.display.meshWires;
      if (byId("toggleMeshWires")) byId("toggleMeshWires").checked = state.display.meshWires;
      applyDisplayPreset();
    }
    if (key === "boxes") {
      state.display.boundingBoxes = !state.display.boundingBoxes;
      if (byId("toggleBoundingBoxes")) byId("toggleBoundingBoxes").checked = state.display.boundingBoxes;
      applyDisplayPreset();
    }
    button.closest("details")?.removeAttribute("open");
  });
});
document.querySelectorAll("[data-status-toggle]").forEach((toggle) => {
  toggle.addEventListener("change", () => {
    if (toggle.dataset.statusToggle === "grid") {
      state.display.baseGrid = !!toggle.checked;
      if (byId("toggleBaseGrid")) byId("toggleBaseGrid").checked = state.display.baseGrid;
      applyDisplayPreset();
      draw2d();
    }
    if (toggle.dataset.statusToggle === "gumball") {
      state.display.latticeControls = !!toggle.checked;
      if (byId("toggleLatticeControls")) byId("toggleLatticeControls").checked = state.display.latticeControls;
      applyDisplayPreset();
    }
  });
});
byId("structuralDirection").addEventListener("change", (e) => { state.structuralDirection = e.target.value; rebuild(); });
const generateVaultBtn = byId("generateVault");
if (generateVaultBtn) generateVaultBtn.addEventListener("click", () => rebuild());
byId("zoomExtents").addEventListener("click", () => zoomExtents());
if (byId("zoomExtentsTop")) byId("zoomExtentsTop").addEventListener("click", () => zoomExtents());
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
  state.patternAppliedToModel = false;
  if (byId("referencePreset")) byId("referencePreset").value = "Custom";
  applyVaultParamRules();
  rebuild();
});
if (byId("applyPatternToModel")) byId("applyPatternToModel").addEventListener("click", () => {
  state.patternAppliedToModel = true;
  setPipelineStatus("Blocks applied to vault model.");
  rebuild();
});
if (byId("showSolidOnly")) byId("showSolidOnly").addEventListener("click", () => {
  state.patternAppliedToModel = false;
  state.selectedBlockId = null;
  setPipelineStatus("Solid model preview active.");
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
  applyRightPanelToolVisibility();
  rebuild();
});
byId("import3d").addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  await load3DObject(f);
  state.designMode = "Custom Import";
  byId("designMode").value = "Custom Import";
  applyRightPanelToolVisibility();
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

if (nodes.toolTabs) {
  nodes.toolTabs.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (!b) return;
    setToolTab(b.dataset.tab);
  });
}
document.querySelectorAll("[data-dock-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const dock = button.dataset.dockToggle;
    document.body.classList.toggle(`${dock}-collapsed`);
    requestAnimationFrame(resize);
  });
});

let activeSplitter = null;
let activeViewportSplitter = false;
document.querySelectorAll("[data-splitter]").forEach((splitter) => {
  splitter.addEventListener("pointerdown", (e) => {
    activeSplitter = splitter.dataset.splitter;
    splitter.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
  });
});
document.querySelectorAll("[data-viewport-splitter]").forEach((splitter) => {
  splitter.addEventListener("pointerdown", (e) => {
    activeViewportSplitter = true;
    splitter.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
  });
});
window.addEventListener("pointermove", (e) => {
  if (activeSplitter) {
    const bounds = document.querySelector(".workspace")?.getBoundingClientRect();
    if (!bounds) return;
    if (activeSplitter === "left" && !document.body.classList.contains("left-collapsed")) {
      const width = clamp(e.clientX - bounds.left, 240, 520);
      document.documentElement.style.setProperty("--left-pane", `${width}px`);
    }
    if (activeSplitter === "right" && !document.body.classList.contains("right-collapsed")) {
      const width = clamp(bounds.right - e.clientX, 260, 560);
      document.documentElement.style.setProperty("--right-pane", `${width}px`);
    }
    resize();
  }
  if (activeViewportSplitter) {
    const bounds = document.querySelector(".modelspace")?.getBoundingClientRect();
    if (!bounds) return;
    const isStacked = window.matchMedia("(max-width: 900px)").matches;
    const next = isStacked
      ? clamp(((e.clientY - bounds.top) / bounds.height) * 100, 24, 76)
      : clamp(((e.clientX - bounds.left) / bounds.width) * 100, 24, 76);
    document.documentElement.style.setProperty("--top-view-pane", `${next}%`);
    resize();
  }
});
window.addEventListener("pointerup", () => {
  activeSplitter = null;
  activeViewportSplitter = false;
  document.body.style.userSelect = "";
});
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

applyWorkflowStep(1);
setToolTab("catalog");
syncInputsFromState();
applyLayoutStyle();
applyLightingPreset(state.lightingPreset);
runVaultSelectionPipeline(state.vaultType);
resize();
tick();
