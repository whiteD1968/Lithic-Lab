import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Rhino3dmLoader } from "three/examples/jsm/loaders/3DMLoader.js";
import rhino3dmFactory from "three/examples/jsm/libs/rhino3dm/rhino3dm.module.js";
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";
import { Brush, Evaluator, INTERSECTION } from "three-bvh-csg";

const byId = (id) => document.getElementById(id);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const smoothstep = (min, max, v) => {
  const t = clamp((v - min) / Math.max(0.000001, max - min), 0, 1);
  return t * t * (3 - 2 * t);
};
const wrap01 = (v) => ((v % 1) + 1) % 1;
const hexToRgba = (hex, alpha = 1) => {
  const m = String(hex || "").trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return `rgba(255,255,255,${clamp(alpha, 0, 1)})`;
  const [, r, g, b] = m;
  return `rgba(${parseInt(r, 16)},${parseInt(g, 16)},${parseInt(b, 16)},${clamp(alpha, 0, 1)})`;
};

THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
const densityKgPerM3 = 2600;

const state = {
  designMode: "Generated",
  vaultType: "Barrel Vault",
  vaultDesignerPreview: true,
  blockDesigner: { baseGeometry: "Cuboid", jointType: "Sine Wave Joint", length: 120, width: 65, height: 90, thickness: 30, draft: 2, fillet: 3, clearance: 1, density: 2600, frequency: 3, amplitude: 12, depth: 35, phase: 0, morph: 20, tileMode: "Running Bond", swatch: 5, view: "assembled", activeTileId: null, userCamera: false },
  appliedTileSystem: null,
  pattern: "Radial joints",
  structuralDirection: "Compression lines",
  registrationMode: "UV coordinates",
  jointMode: "Visual seams",
  params: { span: 15, rise: 8, length: 15, thickness: 0.2, courseCount: 16, blockCount: 18, subdivisionDensity: 1, keystoneSize: 0.45 },
  springingAngle: 0,
  archType: "Semicircular",
  targetBlockWidth: 1.2,
  blockDimensionMode: "applied",
  blockPreviewCount: 1,
  strategyViewMode: "uv-layout",
  customPanel: null,
  customPanelObject: null,
  customPanelMorphObject: null,
  libraryCandidates: { tile: null, host: null },
  assetLibraryEntries: [],
  activeLibraryAssetIds: { host: null, panel: null, tile: null },
  customPanelSeamAllowance: 0,
  customPanelThicknessScale: 1,
  customPanelThicknessOffset: 0,
  activePanelVariantRole: "base",
  panelVariantAssignmentMode: "auto",
  customPanelVariantTransforms: {},
  panelSubdivisionU: 1,
  panelSubdivisionV: 1,
  panelWeightSubdivision: false,
  panelMorphStrength: 0,
  panelAttractorResponse: { mode: "apertureMorph", amount: 1 },
  topologyLattice: { enabled: false, showU: true, showV: true, railWidth: 0.12, railDepth: 0.06, fillet: 0.12, layerGap: 0, opening: 0.55, density: 3, bottomWidth: 0.12, bottomDepth: 0.06, bottomFillet: 0.12, bottomOpening: 0.55, bottomDensity: 3, loopBindings: { enabled: false, family: "both", every: 4, width: 0.08, depth: 0.08, offset: 0, fillet: 0.12 } },
  supportScaffold: { enabled: false, xCount: 8, yCount: 10, ribDepth: 1.8, ribThickness: 0.08 },
  ngonCellType: "Hex",
  ngonShape: 0.5,
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
  activeTraitConstructionStep: null,
  activeTraitFocus: "all",
  drawingPreset: "Full Epure",
  viewportLayout: "split",
  blockPreviewWindow: { x: null, y: null, w: 420, h: 340 },
  pipelineStage: 0,
  stereotomyProcess: {
    stageName: "Idle",
    geometryBasis: "parametric vault surface",
    forceFlowDiagram: "compression-line field",
    patternIntent: "vault default",
    tessellationMethod: "course grid",
    voussoirMethod: "normal-offset prism",
    fabricationFocus: "visual seam review",
    stabilityFocus: "not evaluated",
  },
  strategy: {
    host: "procedural-vault",
    field: "courses",
    component: "voussoir",
    componentMode: "single",
    fill: "quad",
    rotation: "course-tangent",
    rotationVariation: "none",
    scale: "fit-to-cell",
    thickness: "constant",
    patchSubdivision: 4,
    patchSmoothing: 0,
    topology: "primal",
    dualBoundaryCleanup: true,
    boundary: "trim",
    merge: "separate-blocks",
  },
  dualPreviewLoops: [],
  fieldWeights: {
    source: "curvature",
    formula: "0.45 * curvature + 0.25 * crown + 0.2 * support + 0.1 * boundary",
    smoothing: "none",
    smoothingIterations: 1,
    randomSeed: 17,
    materialStrategy: "weight-bands",
    driveDensity: false,
    driveComponent: false,
    driveThickness: false,
    driveRotation: false,
    driveTaper: false,
    driveZones: true,
  },
  attractorField: {
    elements: [],
    mode: "select",
    pendingCurve: [],
    selectedId: null,
    radius: 0.18,
    strength: 1,
    curvatureMix: 0.25,
  },
  contourField: {
    enabled: true,
    source: "height",
    bands: 8,
    maskMode: "none",
    showContours: true,
    showMasks: true,
    streamlines: true,
    streamlineSource: "compression",
    streamlineCount: 9,
    guideDirectionDeg: 35,
    reactionDiffusion: false,
    reactionScale: 0.45,
  },
  customPatternSource: "UV Form Grid",
  supportCount: 4,
  forceLmin: 0.15,
  forceLmax: 0.75,
  forceLocks: {},
  patternAppliedToModel: false,
  barrelBondMode: "5",
  dragSensitivity: "Normal",
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
  draggingAttractor: null,
  draggingSectionHandle: null,
  suspendViewportFit: false,
  userDefinedCamera: false,
  draggingPointerId: null,
  hoveredSectionHandle: null,
  imported2DPolys: null,
  importedSurface: null,
  importedSurfaceBbox: null,
  importedRhinoDoc: null,
  importedRhinoBrepFaces: null,
  importedBrepPatches: null,
  importedTopology: null,
  importedTopologyPolys: null,
  importedTissueCells: null,
  importedTopologyMeshName: "",
  importedTopologyMeshStats: null,
  importedModelName: "",
  importedModelStats: null,
  sourceTransform: { tx: 0, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
  view2d: { x: -95, y: -75, w: 1190, h: 850 },
  surfacePrinciple: "Cylinder",
  constructionTemplate: "Barrel Vault | Tav. 60-82",
  projectionOperation: "Project Plan To Section",
  jointPrinciple: "orthogonal ring courses",
  traitStep: "All Trait Lines",
  stereotomyStep: "All Stereotomy",
  blockStep: "Generated Voussoirs",
  fabricationCheck: "All Checks",
  blocksGeneratedFromTrait: true,
  view2dOptions: {
    mode: "Trait / Epure",
    showBlocks: true,
    showReferenceGeometry: true,
    showVertices: false,
    showGuides: true,
    showLabels: true,
    showCutLines: true,
    showTraitLines: true,
    showProjectionRays: false,
    showCourseDivisions: true,
    showJointNormals: false,
    showDevelopmentLines: false,
    showDerivedStereotomy: true,
    showBedJoints: true,
    showHeadJoints: true,
    showKeystoneZone: true,
    showContourField: true,
    showStreamlines: true,
    showTrueShapePanels: false,
    guideDensity: 8,
    blockStroke: "#ffffff",
    blockFill: "#ffffff",
    blockFillOpacity: 0.16,
    blockStrokeOpacity: 0.9,
    showBlockIds: false,
    showBlockMetrics: false,
    showFabricationChecks: false,
    showFabricationLegend: true,
    showAnnotations: true,
    showSpanDimension: true,
    showRiseDimension: true,
    showThicknessDimension: true,
    showAngleLabels: true,
    showRadiusLabels: true,
    showCourseCount: true,
    showBlockWidth: true,
    showJointGap: true,
    showTrueLength: true,
    showSurfaceFamilyLabel: true,
  },
  constructionEntities: {
    springing: { show: true, color: "#ffffff" },
    axis: { show: true, color: "#afd2ff" },
    apex: { show: true, color: "#ffe2a0" },
    intrados: { show: true, color: "#ffffff" },
    extrados: { show: true, color: "#ffe2a0" },
    neutral: { show: true, color: "#9fd8ff" },
    imposts: { show: true, color: "#ffffff" },
    skewAxis: { show: false, color: "#89f5d1" },
    groinLine: { show: true, color: "#89f5d1" },
  },
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
    foilMaterial: false,
    backFaces: false,
    seamDebug: true,
  },
  layers: {
    sourceModel: true,
    builtInForm: true,
    blocks: true,
    copies: true,
    supports: true,
    guides: true,
  },
  transformTool: "select",
  snaps: {
    end: true,
    mid: true,
    perpendicular: false,
    vertex: true,
    point: true,
    intersection: false,
  },
  copiedGeometryCount: 0,
  historicalValidationResults: [],
};

const patterns = ["Courses", "Groin-line courses", "Radial joints", "Running bond", "Diagonal joints", "Hex / NGon", "Rib-aligned", "Keystone zones"];
const patternDisplayLabels = {
  "Hex / NGon": "Dual / Polygon Cells",
};
const panelQuadSource = "Panel Quad Mesh";
const legacyPanelQuadSource = "Tissue Quad Mesh";
const isPanelQuadSource = (value) => value === panelQuadSource || value === legacyPanelQuadSource;
const panelVariantRoles = [
  { id: "base", label: "Base" },
  { id: "left-edge", label: "Left Edge" },
  { id: "right-edge", label: "Right Edge" },
  { id: "corner", label: "Corner" },
  { id: "keystone", label: "Keystone" },
  { id: "support-adjacent", label: "Support-Adjacent" },
  { id: "high-curvature", label: "High-Curvature" },
];
const defaultPanelVariantTransform = () => ({
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  rotateDeg: 0,
  mirrorU: false,
  mirrorV: false,
  surfaceOffset: 0,
  flipNormal: false,
  align: "strategy",
});
const getPanelVariantLabel = (role) => panelVariantRoles.find((item) => item.id === role)?.label || "Base";
const isBarrelLikeVault = (vaultType = state.vaultType) => vaultType === "Barrel Vault" || vaultType === "Tapered Barrel Vault";
const isCustomHostWorkflow = () => (
  state.designMode === "Custom Import" ||
  state.vaultType === "Custom Imported Rhino Surface" ||
  state.strategy?.component === "custom" ||
  !!state.customPanel ||
  !!state.importedSurface ||
  !!state.importedTopologyPolys?.length ||
  !!state.importedTissueCells?.length
);
const vaultLibrary = {
  "Barrel Vault": {
    name: "Barrel Vault",
    construction2D: "Longitudinal ring courses and springing control lines.",
    construction3D: "Continuous semicylindrical shell from a single arc family.",
    forceFlowType: "Compression lines",
    stereotomyType: "Courses",
    parameters: ["span", "rise", "length", "thickness", "archType", "courseHeight", "targetBlockWidth", "barrelBondMode", "barrelOffsetSide", "wallThickness", "wallHeightOffset"].map((key) => ({ key })),
    allowedPatterns: ["Courses", "Running bond", "Radial joints", "Keystone zones"],
    startup: { params: { span: 15, rise: 8, length: 15, thickness: 0.2, courseCount: 20, blockCount: 22, subdivisionDensity: 1.1, keystoneSize: 0.35 } },
  },
  "Tapered Barrel Vault": {
    name: "Tapered Barrel Vault",
    construction2D: "Longitudinal courses lofted between full-size and scaled barrel end profiles.",
    construction3D: "Tapered barrel shell from two parallel 2D barrel curves joined by a loft.",
    forceFlowType: "Compression lines",
    stereotomyType: "Courses",
    parameters: ["span", "rise", "length", "thickness", "archType", "taperScale", "courseHeight", "targetBlockWidth", "barrelBondMode", "barrelOffsetSide", "wallThickness", "wallHeightOffset"].map((key) => ({ key })),
    allowedPatterns: ["Courses", "Running bond", "Radial joints", "Keystone zones"],
    startup: { params: { span: 15, rise: 8, length: 15, thickness: 0.9, courseCount: 22, blockCount: 24, subdivisionDensity: 1.1, keystoneSize: 0.35 }, taperScale: 0.55 },
  },
  "Groin Vault": {
    name: "Groin Vault",
    construction2D: "Plan diagram: two intersecting barrel axes with diagonal groin lines.",
    construction3D: "Two orthogonal barrel extrusions intersect to form the Groin Vault; thickness is applied after the form surface is resolved.",
    forceFlowType: "Compression converges into groins; groins act as structural spines.",
    stereotomyType: "Groin-line courses",
    parameters: ["span", "length", "rise", "thickness", "springingAngle", "groinMorph", "courseHeight", "targetBlockWidth"].map((key) => ({ key })),
    allowedPatterns: ["Groin-line courses", "Diagonal joints", "Rib-aligned", "Keystone zones"],
    startup: { params: { span: 15, rise: 8, length: 15, thickness: 0.88, courseCount: 22, blockCount: 20, subdivisionDensity: 1.2, keystoneSize: 0.42 }, bayRatioX: 1, bayRatioY: 1, groinMorph: 0.35 },
  },
  "Cloister Vault": {
    name: "Cloister Vault",
    construction2D: "Four corner fans converging to apex control.",
    construction3D: "Corner-rising sectors meeting toward central summit.",
    forceFlowType: "Compression lines",
    stereotomyType: "Rib-aligned",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "keystoneSize", "bayRatio"].map((key) => ({ key })),
    allowedPatterns: ["Radial joints", "Rib-aligned", "Keystone zones"],
    startup: { params: { span: 15, rise: 8, length: 15, thickness: 0.82, courseCount: 18, blockCount: 16, subdivisionDensity: 1.05, keystoneSize: 0.58 }, bayRatioX: 1, bayRatioY: 1 },
  },
  "Sail Vault": {
    name: "Sail Vault",
    construction2D: "Square bay guide with corner-support arcs.",
    construction3D: "Billowed surface spanning between four corner supports.",
    forceFlowType: "Compression lines",
    stereotomyType: "Rib-aligned",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "bayRatio"].map((key) => ({ key })),
    allowedPatterns: ["Radial joints", "Rib-aligned", "Keystone zones"],
    startup: { params: { span: 15, rise: 8, length: 15, thickness: 0.78, courseCount: 18, blockCount: 18, subdivisionDensity: 1.08, keystoneSize: 0.52 }, bayRatioX: 1, bayRatioY: 1 },
  },
  Dome: {
    name: "Dome",
    construction2D: "Polar radial rings with meridian controls.",
    construction3D: "Axisymmetric shell from revolution geometry.",
    forceFlowType: "Compression lines",
    stereotomyType: "Radial joints",
    parameters: ["span", "rise", "thickness", "courseCount", "blockCount", "subdivisionDensity"].map((key) => ({ key })),
    allowedPatterns: ["Radial joints", "Courses", "Keystone zones"],
    startup: { params: { span: 15, rise: 8, length: 15, thickness: 0.85, courseCount: 24, blockCount: 24, subdivisionDensity: 1.15, keystoneSize: 0.5 } },
  },
  "Rib Vault": {
    name: "Rib Vault",
    construction2D: "Primary rib skeleton with web infill zones.",
    construction3D: "Groin-like web reinforced by raised diagonal ribs.",
    forceFlowType: "Rib lines",
    stereotomyType: "Rib-aligned",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "ribCount", "bayRatio"].map((key) => ({ key })),
    allowedPatterns: ["Rib-aligned", "Radial joints", "Diagonal joints"],
    startup: { params: { span: 15, rise: 8, length: 15, thickness: 0.72, courseCount: 16, blockCount: 14, subdivisionDensity: 1, keystoneSize: 0.45 }, ribCount: 8, bayRatioX: 1, bayRatioY: 1 },
  },
  "Fan Vault": {
    name: "Fan Vault",
    construction2D: "Sectorized fan ribs from clustered spring points.",
    construction3D: "Conoidal fan surfaces with scalloped rib emphasis.",
    forceFlowType: "Rib lines",
    stereotomyType: "Rib-aligned",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "ribCount"].map((key) => ({ key })),
    allowedPatterns: ["Rib-aligned", "Radial joints"],
    startup: { params: { span: 15, rise: 8, length: 15, thickness: 0.72, courseCount: 18, blockCount: 14, subdivisionDensity: 1, keystoneSize: 0.55 }, ribCount: 12 },
  },
  "Lierne Vault": {
    name: "Lierne Vault",
    construction2D: "Primary ribs with tertiary lierne connectors.",
    construction3D: "Rib-vault web enriched by dense linking ribs.",
    forceFlowType: "Rib lines",
    stereotomyType: "Hex / NGon",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "ribCount", "lierneDensity"].map((key) => ({ key })),
    allowedPatterns: ["Rib-aligned", "Hex / NGon", "Diagonal joints"],
    startup: { params: { span: 15, rise: 8, length: 15, thickness: 0.78, courseCount: 18, blockCount: 16, subdivisionDensity: 1, keystoneSize: 0.55 }, ribCount: 10, lierneDensity: 0.52 },
  },
  "Net Vault": {
    name: "Net Vault",
    construction2D: "Interwoven diagonal net lanes and node loci.",
    construction3D: "Groin-derived web with periodic net modulation.",
    forceFlowType: "Rib lines",
    stereotomyType: "Hex / NGon",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "netFrequency"].map((key) => ({ key })),
    allowedPatterns: ["Hex / NGon", "Diagonal joints", "Rib-aligned"],
    startup: { params: { span: 15, rise: 8, length: 15, thickness: 0.8, courseCount: 18, blockCount: 16, subdivisionDensity: 1, keystoneSize: 0.58 }, netFrequency: 8 },
  },
  "Catalan Vault": {
    name: "Catalan Vault",
    construction2D: "Layered running-bond tile courses.",
    construction3D: "Shallow compression shell tuned for thin-tile layering.",
    forceFlowType: "Compression lines",
    stereotomyType: "Running bond",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "tileLayers"].map((key) => ({ key })),
    allowedPatterns: ["Running bond", "Diagonal joints", "Courses"],
    startup: { params: { span: 15, rise: 8, length: 15, thickness: 0.54, courseCount: 22, blockCount: 24, subdivisionDensity: 1.1, keystoneSize: 0.24 }, tileLayers: 3 },
  },
  "Guastavino Vault": {
    name: "Guastavino Vault",
    construction2D: "Multi-layer timbrel tile bond sequencing.",
    construction3D: "Timbrel shell profile with catenary-inspired rise.",
    forceFlowType: "Compression lines",
    stereotomyType: "Running bond",
    parameters: ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "tileLayers"].map((key) => ({ key })),
    allowedPatterns: ["Running bond", "Diagonal joints", "Courses"],
    startup: { params: { span: 15, rise: 8, length: 15, thickness: 0.5, courseCount: 24, blockCount: 26, subdivisionDensity: 1.15, keystoneSize: 0.2 }, tileLayers: 3 },
  },
  "Custom Imported Rhino Surface": {
    name: "Custom Imported Rhino Surface",
    construction2D: "User-supplied 2D network registration.",
    construction3D: "Imported mesh/surface projection target.",
    forceFlowType: "Compression lines",
    stereotomyType: "Hex / NGon",
    parameters: ["thickness", "targetBlockWidth", "courseHeight", "courseCount", "blockCount", "subdivisionDensity"].map((key) => ({ key })),
    allowedPatterns: ["Hex / NGon", "Rib-aligned", "Diagonal joints", "Groin-line courses", "Running bond", "Radial joints", "Courses", "Keystone zones"],
    startup: { params: { thickness: 0.75, courseCount: 20, blockCount: 22, subdivisionDensity: 1.15 } },
  },
};
const vaultTypes = Object.keys(vaultLibrary);
const surfacePrinciples = ["Plane", "Cylinder", "Cone", "Sphere", "Ruled Surface", "Compound / Intersection"];
const drawingModes2d = ["Plan", "Section", "Elevation", "Trait / Epure", "Surface Development", "Block / Voussoir Layout"];
const drawingModeLayerPresets = {
  Plan: {
    showReferenceGeometry: true,
    showTraitLines: true,
    showProjectionRays: false,
    showCourseDivisions: true,
    showJointNormals: false,
    showDevelopmentLines: false,
    showDerivedStereotomy: false,
    showBedJoints: false,
    showHeadJoints: false,
    showKeystoneZone: true,
    showTrueShapePanels: false,
    showBlocks: false,
    showBlockIds: false,
    showBlockMetrics: false,
    showFabricationChecks: false,
    showFabricationLegend: false,
    showVertices: false,
    showGuides: true,
    showLabels: true,
    showCutLines: true,
  },
  Section: {
    showReferenceGeometry: true,
    showTraitLines: true,
    showProjectionRays: false,
    showCourseDivisions: true,
    showJointNormals: true,
    showDevelopmentLines: false,
    showDerivedStereotomy: false,
    showBedJoints: false,
    showHeadJoints: false,
    showKeystoneZone: true,
    showTrueShapePanels: false,
    showBlocks: false,
    showBlockIds: false,
    showBlockMetrics: false,
    showFabricationChecks: false,
    showFabricationLegend: false,
    showVertices: false,
    showGuides: true,
    showLabels: true,
    showCutLines: true,
  },
  Elevation: {
    showReferenceGeometry: true,
    showTraitLines: true,
    showProjectionRays: true,
    showCourseDivisions: true,
    showJointNormals: false,
    showDevelopmentLines: false,
    showDerivedStereotomy: false,
    showBedJoints: false,
    showHeadJoints: false,
    showKeystoneZone: true,
    showTrueShapePanels: false,
    showBlocks: false,
    showBlockIds: false,
    showBlockMetrics: false,
    showFabricationChecks: false,
    showFabricationLegend: false,
    showVertices: false,
    showGuides: true,
    showLabels: true,
    showCutLines: true,
  },
  "Trait / Epure": {
    showReferenceGeometry: true,
    showTraitLines: true,
    showProjectionRays: true,
    showCourseDivisions: true,
    showJointNormals: true,
    showDevelopmentLines: false,
    showDerivedStereotomy: true,
    showBedJoints: true,
    showHeadJoints: true,
    showKeystoneZone: true,
    showTrueShapePanels: false,
    showBlocks: true,
    showBlockIds: false,
    showBlockMetrics: false,
    showFabricationChecks: false,
    showFabricationLegend: false,
    showVertices: false,
    showGuides: true,
    showLabels: true,
    showCutLines: true,
  },
  "Surface Development": {
    showReferenceGeometry: false,
    showTraitLines: true,
    showProjectionRays: false,
    showCourseDivisions: true,
    showJointNormals: true,
    showDevelopmentLines: true,
    showDerivedStereotomy: true,
    showBedJoints: true,
    showHeadJoints: true,
    showKeystoneZone: false,
    showTrueShapePanels: true,
    showBlocks: false,
    showBlockIds: false,
    showBlockMetrics: false,
    showFabricationChecks: false,
    showFabricationLegend: false,
    showVertices: false,
    showGuides: true,
    showLabels: true,
    showCutLines: true,
  },
  "Block / Voussoir Layout": {
    showReferenceGeometry: false,
    showTraitLines: false,
    showProjectionRays: false,
    showCourseDivisions: false,
    showJointNormals: false,
    showDevelopmentLines: false,
    showDerivedStereotomy: true,
    showBedJoints: true,
    showHeadJoints: true,
    showKeystoneZone: true,
    showTrueShapePanels: false,
    showBlocks: true,
    showBlockIds: true,
    showBlockMetrics: false,
    showFabricationChecks: false,
    showFabricationLegend: false,
    showVertices: false,
    showGuides: true,
    showLabels: true,
    showCutLines: true,
  },
};
const fabricationChecks = [
  { label: "All Checks", key: null },
  { label: "Length", key: "length" },
  { label: "Width", key: "width" },
  { label: "Thickness", key: "thickness" },
  { label: "Weight", key: "weight" },
  { label: "Taper", key: "taper" },
  { label: "Min Edge", key: "min-edge" },
  { label: "Bed Depth", key: "bed-depth" },
  { label: "Convexity", key: "convexity" },
  { label: "Stretched Cells", key: "stretched-cell" },
  { label: "Twisted Patch", key: "twisted-patch" },
  { label: "Mapping Distortion", key: "mapping-distortion" },
  { label: "Taper Distortion", key: "taper-distortion" },
];
const fabricationCheckByLabel = Object.fromEntries(fabricationChecks.map((item) => [item.label, item]));
const fabricationLabelByKey = Object.fromEntries(fabricationChecks.filter((item) => item.key).map((item) => [item.key, item.label]));
const defaultTraitConstructionSteps = [
  "Set springing datum and principal reference axes.",
  "Draw the intrados profile or source surface section.",
  "Offset the extrados by the selected thickness.",
  "Divide the intrados into courses.",
  "Project courses across the surface principle.",
  "Add bed and head joints from the trait.",
  "Generate editable voussoir panels.",
  "Validate block proportions and fabrication limits.",
];
const traitConstructionTemplates = {
  "Barrel Vault": [
    "Set springing line.",
    "Draw intrados profile.",
    "Offset extrados by thickness.",
    "Divide arch into courses.",
    "Project courses along vault length.",
    "Add head joints.",
    "Generate voussoir panels.",
    "Validate block proportions.",
  ],
  "Tapered Barrel Vault": [
    "Set springing line and tapered vault axis.",
    "Draw intrados profiles at start and end spans.",
    "Offset extrados by thickness.",
    "Divide the arch profiles into courses.",
    "Project courses along the tapered length.",
    "Add head joints normal to the developed surface.",
    "Generate tapered voussoir panels.",
    "Validate taper, width, and block proportions.",
  ],
  "Groin Vault": [
    "Set crossing barrel axes and springing lines.",
    "Draw both intrados barrel profiles.",
    "Construct the groin intersection curves.",
    "Offset extrados after the compound surface is resolved.",
    "Divide courses from groin and springing references.",
    "Add head joints and diagonal arris-related joints.",
    "Generate voussoir panels from the compound trait.",
    "Validate block proportions near groins and crown.",
  ],
  "Cloister Vault": [
    "Set bay perimeter and springing lines.",
    "Draw curved webs rising from each side.",
    "Resolve diagonal meeting curves at the crown.",
    "Offset extrados by thickness.",
    "Divide web courses from springing to crown.",
    "Add head joints between web panels.",
    "Generate voussoir panels for each web.",
    "Validate crown, corner, and edge block proportions.",
  ],
  "Sail Vault": [
    "Set square or polygonal plan and springing boundary.",
    "Draw spherical intrados section.",
    "Trim the spherical surface by the plan boundary.",
    "Offset extrados by thickness.",
    "Divide courses from supports toward crown.",
    "Add radial and transverse joints.",
    "Generate spherical voussoir panels.",
    "Validate edge length, convexity, and weight.",
  ],
  Dome: [
    "Set plan center, radius, and springing circle.",
    "Draw meridian intrados profile.",
    "Offset extrados by thickness.",
    "Divide meridian into hoop courses.",
    "Project meridians around the dome.",
    "Add radial joints and crown/keystone zone.",
    "Generate dome voussoir panels.",
    "Validate hoop, radial, and crown block proportions.",
  ],
  "Rib Vault": [
    "Set bay, springing points, and rib network.",
    "Draw rib intrados curves.",
    "Define web surfaces between ribs.",
    "Offset ribs and webs by thickness.",
    "Divide web courses by rib references.",
    "Add head joints between web courses.",
    "Generate rib and web voussoir panels.",
    "Validate rib intersections and web block proportions.",
  ],
  "Fan Vault": [
    "Set impost points and fan centerlines.",
    "Draw fan rib profile and conoid guide.",
    "Offset extrados by thickness.",
    "Divide fan ribs into equal construction intervals.",
    "Project courses through the fan surface.",
    "Add lierne/head joints between fan ribs.",
    "Generate fan voussoir panels.",
    "Validate impost, rib, and panel proportions.",
  ],
  "Custom Imported Rhino Surface": [
    "Identify source surface, supports, and springing references.",
    "Extract or assign intrados guide sections.",
    "Define thickness/extrados strategy.",
    "Divide the source surface into courses.",
    "Project the trait through the imported surface.",
    "Add bed and head joints from the selected strategy.",
    "Generate editable voussoir panels.",
    "Validate projection misses, proportions, and fabrication limits.",
  ],
};
const vaultSurfacePrincipleDefault = {
  "Barrel Vault": "Cylinder",
  "Tapered Barrel Vault": "Cone",
  "Groin Vault": "Compound / Intersection",
  "Cloister Vault": "Compound / Intersection",
  "Sail Vault": "Sphere",
  Dome: "Sphere",
  "Rib Vault": "Compound / Intersection",
  "Fan Vault": "Ruled Surface",
  "Lierne Vault": "Compound / Intersection",
  "Net Vault": "Compound / Intersection",
  "Catalan Vault": "Ruled Surface",
  "Guastavino Vault": "Ruled Surface",
  "Custom Imported Rhino Surface": "Ruled Surface",
};
const sourceLibraryTypes = [
  ...vaultTypes.filter((name) => name !== "Custom Imported Rhino Surface").map((name) => ({ value: name, label: `Built-in: ${name}` })),
  { value: "Custom Imported Rhino Surface", label: "Uploaded Host Geometry" },
];
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
    pattern: "Groin-line courses",
    params: { span: 15, rise: 8, length: 15, thickness: 1.05, courseCount: 22, blockCount: 20, subdivisionDensity: 1.2, keystoneSize: 0.42 },
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
    params: { span: 15, rise: 8, length: 15, thickness: 1.25, courseCount: 16, blockCount: 14, subdivisionDensity: 1.1, keystoneSize: 0.35 },
    cubeScale: 1,
    arrayU: 1,
    arrayV: 1,
  },
  "Groined Plate XXIV": {
    vaultType: "Groin Vault",
    pattern: "Groin-line courses",
    params: { span: 15, rise: 8, length: 15, thickness: 1.1, courseCount: 20, blockCount: 16, subdivisionDensity: 1.15, keystoneSize: 0.45 },
    cubeScale: 1,
    arrayU: 1,
    arrayV: 1,
  },
  "Arc de Cloitre": {
    vaultType: "Cloister Vault",
    pattern: "Rib-aligned",
    params: { span: 15, rise: 8, length: 15, thickness: 0.95, courseCount: 14, blockCount: 12, subdivisionDensity: 1, keystoneSize: 0.55 },
    cubeScale: 1,
    arrayU: 1,
    arrayV: 1,
  },
  "Fan Vault Bath": {
    vaultType: "Fan Vault",
    pattern: "Rib-aligned",
    params: { span: 15, rise: 8, length: 15, thickness: 0.9, courseCount: 24, blockCount: 22, subdivisionDensity: 1.2, keystoneSize: 0.5 },
    cubeScale: 1,
    arrayU: 2,
    arrayV: 1,
  },
  "Catalan Running Bond": {
    vaultType: "Catalan Vault",
    pattern: "Running bond",
    params: { span: 15, rise: 8, length: 15, thickness: 0.55, courseCount: 18, blockCount: 20, subdivisionDensity: 1.1, keystoneSize: 0.2 },
    cubeScale: 1,
    arrayU: 1,
    arrayV: 1,
  },
  "Guastavino Thin Tile": {
    vaultType: "Guastavino Vault",
    pattern: "Running bond",
    params: { span: 15, rise: 8, length: 15, thickness: 0.5, courseCount: 22, blockCount: 24, subdivisionDensity: 1.2, keystoneSize: 0.2 },
    cubeScale: 1,
    arrayU: 1,
    arrayV: 1,
  },
  "Lierne Gothic Nodework": {
    vaultType: "Lierne Vault",
    pattern: "Hex / NGon",
    params: { span: 15, rise: 8, length: 15, thickness: 0.85, courseCount: 22, blockCount: 22, subdivisionDensity: 1.25, keystoneSize: 0.6 },
    cubeScale: 1,
    arrayU: 1,
    arrayV: 1,
  },
  "Net Vault Lattice": {
    vaultType: "Net Vault",
    pattern: "Hex / NGon",
    params: { span: 15, rise: 8, length: 15, thickness: 0.9, courseCount: 24, blockCount: 24, subdivisionDensity: 1.3, keystoneSize: 0.6 },
    cubeScale: 1,
    arrayU: 1,
    arrayV: 1,
  },
};
const constructionTemplateCatalog = {
  "Piattabanda / Flat Arch | Tav. 3-13": {
    category: "Architraves and piattabande",
    plateRange: "Tav. 3-13",
    vaultType: "Barrel Vault",
    surfacePrinciple: "Plane",
    drawingMode: "Section",
    traitStep: "Section Curves",
    stereotomyStep: "Head Joints",
    pattern: "Radial joints",
    params: { span: 15, rise: 8, length: 15, thickness: 0.85, courseCount: 7, blockCount: 13, subdivisionDensity: 1, keystoneSize: 0.18 },
    jointLogic: "vertical exterior / convergent interior joints",
    operations: ["flat arch springing datum", "convergent joint fan", "wall-face projection", "voussoir proportion check"],
  },
  "Abeille Plane Vault | Tav. 14-26": {
    category: "Plane vaults",
    plateRange: "Tav. 14-26",
    vaultType: "Cloister Vault",
    surfacePrinciple: "Plane",
    drawingMode: "Plan",
    traitStep: "Course Divisions",
    stereotomyStep: "Courses",
    pattern: "Hex / NGon",
    params: { span: 15, rise: 8, length: 15, thickness: 0.55, courseCount: 14, blockCount: 14, subdivisionDensity: 1.15, keystoneSize: 0.35 },
    jointLogic: "square/concentric topology preserving block identity under deformation",
    operations: ["plane tessellation", "square or circular boundary", "plane-to-cylinder/sphere deformation", "identity preservation check"],
  },
  "Oblique Arch / Biais Passe | Tav. 33-43": {
    category: "Arches",
    plateRange: "Tav. 33-43",
    vaultType: "Tapered Barrel Vault",
    surfacePrinciple: "Cylinder",
    drawingMode: "Elevation",
    traitStep: "Projection Rays",
    stereotomyStep: "Head Joints",
    pattern: "Diagonal joints",
    params: { span: 15, rise: 8, length: 15, thickness: 0.85, courseCount: 16, blockCount: 14, subdivisionDensity: 1.05, keystoneSize: 0.28 },
    jointLogic: "oblique/skew joints projected between plan, section, and elevation",
    operations: ["skew axis setup", "plan-to-section projection", "oblique head-joint layout", "true-length check"],
  },
  "Spatial Arch | Tav. 44-55": {
    category: "Arches",
    plateRange: "Tav. 44-55",
    vaultType: "Tapered Barrel Vault",
    surfacePrinciple: "Ruled Surface",
    drawingMode: "Trait / Epure",
    traitStep: "All Trait Lines",
    stereotomyStep: "All Stereotomy",
    pattern: "Rib-aligned",
    params: { span: 15, rise: 8, length: 15, thickness: 0.75, courseCount: 15, blockCount: 16, subdivisionDensity: 1.1, keystoneSize: 0.32 },
    jointLogic: "spatial cylindrical/conoidal arch joints controlled by ruled generators",
    operations: ["spatial directrix", "ruled-surface sectioning", "intrados/hypography view", "face true-shape check"],
  },
  "Barrel Vault | Tav. 60-82": {
    category: "Barrel vaults",
    plateRange: "Tav. 60-82",
    vaultType: "Barrel Vault",
    surfacePrinciple: "Cylinder",
    drawingMode: "Trait / Epure",
    traitStep: "All Trait Lines",
    stereotomyStep: "All Stereotomy",
    pattern: "Running bond",
    params: { span: 15, rise: 8, length: 15, thickness: 1.1, courseCount: 16, blockCount: 18, subdivisionDensity: 1.05, keystoneSize: 0.35 },
    jointLogic: "orthogonal/running ring courses with cylindrical development",
    operations: ["barrel profile", "course grid", "running bond", "cylindrical unfolding", "voussoir development"],
  },
  "Arriere-voussure | Tav. 83-95": {
    category: "Arriere-voussure",
    plateRange: "Tav. 83-95",
    vaultType: "Barrel Vault",
    surfacePrinciple: "Compound / Intersection",
    drawingMode: "Trait / Epure",
    traitStep: "Projection Rays",
    stereotomyStep: "Head Joints",
    pattern: "Diagonal joints",
    params: { span: 15, rise: 8, length: 15, thickness: 0.8, courseCount: 12, blockCount: 14, subdivisionDensity: 1.05, keystoneSize: 0.25 },
    jointLogic: "opening-behind-vault projection with localized lunettes",
    operations: ["rear opening geometry", "convergence point controls", "lunette penetration", "localized panelization"],
  },
  "Trompe | Tav. 96-226": {
    category: "Trompes and projecting vaults",
    plateRange: "Tav. 96-226",
    vaultType: "Sail Vault",
    surfacePrinciple: "Cone",
    drawingMode: "Surface Development",
    traitStep: "Surface Development",
    stereotomyStep: "True-Shape Panels",
    pattern: "Radial joints",
    params: { span: 15, rise: 8, length: 15, thickness: 0.75, courseCount: 14, blockCount: 18, subdivisionDensity: 1.1, keystoneSize: 0.28 },
    jointLogic: "conic/spherical/ruled corner-transition joints",
    operations: ["corner support transition", "conic development", "false-square cuts", "panel template extraction"],
  },
  "Fan Vault | Tav. 227-237": {
    category: "Fan vaults",
    plateRange: "Tav. 227-237",
    vaultType: "Fan Vault",
    surfacePrinciple: "Ruled Surface",
    drawingMode: "Trait / Epure",
    traitStep: "Joint Normals",
    stereotomyStep: "Courses",
    pattern: "Rib-aligned",
    params: { span: 15, rise: 8, length: 15, thickness: 0.9, courseCount: 24, blockCount: 22, subdivisionDensity: 1.2, keystoneSize: 0.5 },
    jointLogic: "fan ribs and conoid surface families",
    operations: ["springer fan field", "equal-curve rib layout", "conoid guide surface", "springer block segmentation"],
  },
  "Dome | Tav. 238-260": {
    category: "Domes",
    plateRange: "Tav. 238-260",
    vaultType: "Dome",
    surfacePrinciple: "Sphere",
    drawingMode: "Plan",
    traitStep: "Course Divisions",
    stereotomyStep: "Keystone Zone",
    pattern: "Radial joints",
    params: { span: 15, rise: 8, length: 15, thickness: 0.9, courseCount: 18, blockCount: 24, subdivisionDensity: 1.1, keystoneSize: 0.45 },
    jointLogic: "spherical meridian/parallel joints with crown control",
    operations: ["polar radial joints", "hoop courses", "helical rib option", "elliptical dome ring check"],
  },
  "Compound Vault | Tav. 261-293": {
    category: "Compound vaults",
    plateRange: "Tav. 261-293",
    vaultType: "Groin Vault",
    surfacePrinciple: "Compound / Intersection",
    drawingMode: "Trait / Epure",
    traitStep: "All Trait Lines",
    stereotomyStep: "All Stereotomy",
    pattern: "Groin-line courses",
    params: { span: 15, rise: 8, length: 15, thickness: 1.05, courseCount: 20, blockCount: 18, subdivisionDensity: 1.15, keystoneSize: 0.45 },
    jointLogic: "groin-line courses and diagonal arris construction",
    operations: ["rib/vault intersection", "compound arch layering", "groin arris extraction", "horizontal and vertical development"],
  },
};
const constructionTemplateNames = Object.keys(constructionTemplateCatalog);
const projectionDevelopmentOperations = {
  "Project Plan To Section": {
    drawingMode: "Section",
    traitStep: "Projection Rays",
    stereotomyStep: "Courses",
    surfacePrinciple: null,
    layers: { showReferenceGeometry: true, showTraitLines: true, showProjectionRays: true, showCourseDivisions: true, showDevelopmentLines: false, showTrueShapePanels: false },
    description: "Project plan divisions into the sectional arch profile.",
  },
  "Project Section To Elevation": {
    drawingMode: "Elevation",
    traitStep: "Projection Rays",
    stereotomyStep: "Head Joints",
    surfacePrinciple: null,
    layers: { showReferenceGeometry: true, showTraitLines: true, showProjectionRays: true, showCourseDivisions: true, showHeadJoints: true, showDevelopmentLines: false },
    description: "Carry section points into elevation to locate courses and head joints.",
  },
  "Derive Intrados / Extrados From Thickness": {
    drawingMode: "Section",
    traitStep: "Section Curves",
    stereotomyStep: "Keystone Zone",
    surfacePrinciple: null,
    layers: { showReferenceGeometry: true, showTraitLines: true, showProjectionRays: false, showCourseDivisions: false, showJointNormals: true, showDevelopmentLines: false },
    description: "Offset the intrados reference curve to construct extrados and neutral curves.",
  },
  "Unfold Cylindrical Surface": {
    drawingMode: "Surface Development",
    traitStep: "Surface Development",
    stereotomyStep: "True-Shape Panels",
    surfacePrinciple: "Cylinder",
    layers: { showReferenceGeometry: false, showTraitLines: true, showProjectionRays: false, showCourseDivisions: true, showJointNormals: true, showDevelopmentLines: true, showTrueShapePanels: true },
    description: "Develop the barrel surface as a rectangular cylinder unrolling.",
  },
  "Unfold Conical Surface": {
    drawingMode: "Surface Development",
    traitStep: "Surface Development",
    stereotomyStep: "True-Shape Panels",
    surfacePrinciple: "Cone",
    layers: { showReferenceGeometry: false, showTraitLines: true, showProjectionRays: false, showCourseDivisions: true, showJointNormals: true, showDevelopmentLines: true, showTrueShapePanels: true },
    description: "Develop a conical surface with generatrix-driven panels.",
  },
  "Map Plane Pattern To Sphere": {
    drawingMode: "Surface Development",
    traitStep: "Surface Development",
    stereotomyStep: "Courses",
    surfacePrinciple: "Sphere",
    layers: { showReferenceGeometry: false, showTraitLines: true, showProjectionRays: false, showCourseDivisions: true, showJointNormals: true, showDevelopmentLines: true, showKeystoneZone: true },
    description: "Map a plane tessellation to spherical meridians and parallels.",
  },
  "Generate Hypography / Underside": {
    drawingMode: "Trait / Epure",
    traitStep: "All Trait Lines",
    stereotomyStep: "All Stereotomy",
    surfacePrinciple: null,
    layers: { showReferenceGeometry: true, showTraitLines: true, showProjectionRays: true, showCourseDivisions: true, showJointNormals: true, showDevelopmentLines: false, showDerivedStereotomy: true },
    description: "Show the underside drawing that relates intrados geometry to the cut layout.",
  },
  "Generate Panel Templates / Panneaux": {
    drawingMode: "Surface Development",
    traitStep: "Surface Development",
    stereotomyStep: "True-Shape Panels",
    surfacePrinciple: null,
    layers: { showReferenceGeometry: false, showTraitLines: true, showProjectionRays: false, showCourseDivisions: true, showJointNormals: true, showDevelopmentLines: true, showTrueShapePanels: true, showBlocks: false },
    description: "Extract working panel templates for cutting faces.",
  },
  "Show True Shape Of Face": {
    drawingMode: "Surface Development",
    traitStep: "Surface Development",
    stereotomyStep: "True-Shape Panels",
    surfacePrinciple: null,
    layers: { showReferenceGeometry: false, showTraitLines: true, showProjectionRays: false, showCourseDivisions: false, showJointNormals: true, showDevelopmentLines: true, showTrueShapePanels: true },
    description: "Isolate true-shape face panels from the developed surface.",
  },
  "Show Normal / Radial Joint Direction": {
    drawingMode: "Trait / Epure",
    traitStep: "Joint Normals",
    stereotomyStep: "Head Joints",
    surfacePrinciple: null,
    layers: { showReferenceGeometry: true, showTraitLines: true, showProjectionRays: false, showCourseDivisions: true, showJointNormals: true, showDevelopmentLines: false, showHeadJoints: true },
    description: "Display normal or radial joint direction before block generation.",
  },
};
const projectionDevelopmentOperationNames = Object.keys(projectionDevelopmentOperations);
const jointPrinciples = {
  "radial joints": {
    pattern: "Radial joints",
    surfacePrinciple: null,
    traitStep: "Joint Normals",
    stereotomyStep: "Head Joints",
    description: "Joints radiate from a center or crown point, common in arches and domes.",
  },
  "vertical exterior / convergent interior joints": {
    pattern: "Radial joints",
    surfacePrinciple: "Plane",
    traitStep: "Projection Rays",
    stereotomyStep: "Head Joints",
    description: "Exterior joints read vertical while interior bed logic converges toward the arch center.",
  },
  "orthogonal ring courses": {
    pattern: "Courses",
    surfacePrinciple: null,
    traitStep: "Course Divisions",
    stereotomyStep: "Courses",
    description: "Courses remain orthogonal to the vault axis or principal section.",
  },
  "staggered ring courses": {
    pattern: "Running bond",
    surfacePrinciple: null,
    traitStep: "Course Divisions",
    stereotomyStep: "All Stereotomy",
    description: "Ring courses are staggered by course to avoid continuous head joints.",
  },
  "groin-line courses": {
    pattern: "Groin-line courses",
    surfacePrinciple: "Compound / Intersection",
    traitStep: "All Trait Lines",
    stereotomyStep: "All Stereotomy",
    description: "Courses are organized by diagonal groin arrises rather than simple barrel rings.",
  },
  "oblique / skew joints": {
    pattern: "Diagonal joints",
    surfacePrinciple: null,
    traitStep: "Projection Rays",
    stereotomyStep: "Head Joints",
    description: "Head joints follow skew projection between plan, section, and elevation.",
  },
  "helical courses": {
    pattern: "Diagonal joints",
    surfacePrinciple: "Sphere",
    traitStep: "Surface Development",
    stereotomyStep: "Courses",
    description: "Courses advance helically around the surface, useful for domes and stair/vault families.",
  },
  "conic generatrix joints": {
    pattern: "Radial joints",
    surfacePrinciple: "Cone",
    traitStep: "Joint Normals",
    stereotomyStep: "Head Joints",
    description: "Joints follow cone generators in development and true-shape layout.",
  },
  "spherical meridian / parallel joints": {
    pattern: "Radial joints",
    surfacePrinciple: "Sphere",
    traitStep: "Course Divisions",
    stereotomyStep: "Courses",
    description: "Meridians and parallels structure dome or spherical vault cutting.",
  },
  "fan ribs": {
    pattern: "Rib-aligned",
    surfacePrinciple: "Ruled Surface",
    traitStep: "Joint Normals",
    stereotomyStep: "Courses",
    description: "Joints align to fan rib families radiating from clustered springers.",
  },
  "keystone compression zone": {
    pattern: "Keystone zones",
    surfacePrinciple: null,
    traitStep: "Course Divisions",
    stereotomyStep: "Keystone Zone",
    description: "The crown or compression zone controls local course tightening and block bias.",
  },
};
const jointPrincipleNames = Object.keys(jointPrinciples);
const inferJointPrincipleFromTemplate = (tpl) => {
  const text = `${tpl?.jointLogic || ""} ${tpl?.pattern || ""}`.toLowerCase();
  if (text.includes("vertical exterior")) return "vertical exterior / convergent interior joints";
  if (text.includes("staggered") || text.includes("running")) return "staggered ring courses";
  if (text.includes("groin")) return "groin-line courses";
  if (text.includes("skew") || text.includes("oblique")) return "oblique / skew joints";
  if (text.includes("helical")) return "helical courses";
  if (text.includes("conic") || text.includes("generatrix")) return "conic generatrix joints";
  if (text.includes("spherical") || text.includes("meridian")) return "spherical meridian / parallel joints";
  if (text.includes("fan")) return "fan ribs";
  if (text.includes("keystone")) return "keystone compression zone";
  if (text.includes("radial")) return "radial joints";
  return "orthogonal ring courses";
};

const nodes = {
  layout2d: byId("layout2d"),
  metrics: byId("metrics"),
  diagnosticSummary: byId("diagnosticSummary"),
  ngonDiagnostics: byId("ngonDiagnostics"),
  warnings: byId("warnings"),
  inspector: byId("inspector"),
  precedentDetails: byId("precedentDetails"),
  historicalValidation: byId("historicalValidation"),
  currentTraitState: byId("currentTraitState"),
  activeHostName: byId("activeHostName"),
  activePanelName: byId("activePanelName"),
  activeMappingName: byId("activeMappingName"),
  activeMorphName: byId("activeMorphName"),
  strategyViewLabel: byId("strategyViewLabel"),
  customPanelStatus: byId("customPanelStatus"),
  hostLibrarySelect: byId("hostLibrarySelect"),
  hostLibraryStatus: byId("hostLibraryStatus"),
  hostLibraryPreview: byId("hostLibraryPreview"),
  panelLibrarySelect: byId("panelLibrarySelect"),
  panelLibraryStatus: byId("panelLibraryStatus"),
  panelLibraryPreview: byId("panelLibraryPreview"),
  tileLibrarySelect: byId("tileLibrarySelect"),
  tileLibraryStatus: byId("tileLibraryStatus"),
  tileLibraryPreview: byId("tileLibraryPreview"),
  saveTileAsset: byId("saveTileAsset"),
  saveHostAsset: byId("saveHostAsset"),
  saveEditedPanelAsset: byId("saveEditedPanelAsset"),
  duplicatePanelVariant: byId("duplicatePanelVariant"),
  loadHostAsset: byId("loadHostAsset"),
  deleteHostAsset: byId("deleteHostAsset"),
  loadPanelAsset: byId("loadPanelAsset"),
  deletePanelAsset: byId("deletePanelAsset"),
  loadTileAsset: byId("loadTileAsset"),
  deleteTileAsset: byId("deleteTileAsset"),
  importCustomPanel: byId("importCustomPanel"),
  importCustomPanelMorph: byId("importCustomPanelMorph"),
  customPanelSeamAllowance: byId("customPanelSeamAllowance"),
  customPanelThicknessScale: byId("customPanelThicknessScale"),
  customPanelThicknessOffset: byId("customPanelThicknessOffset"),
  panelVariantRole: byId("panelVariantRole"),
  panelVariantAssignmentMode: byId("panelVariantAssignmentMode"),
  panelScaleX: byId("panelScaleX"),
  panelScaleY: byId("panelScaleY"),
  panelScaleZ: byId("panelScaleZ"),
  panelRotateDeg: byId("panelRotateDeg"),
  panelSurfaceOffset: byId("panelSurfaceOffset"),
  panelLongAxisAlign: byId("panelLongAxisAlign"),
  panelMirrorU: byId("panelMirrorU"),
  panelMirrorV: byId("panelMirrorV"),
  panelFlipNormal: byId("panelFlipNormal"),
  panelVariantStatus: byId("panelVariantStatus"),
  panelAttractorResponseMode: byId("panelAttractorResponseMode"),
  panelAttractorResponseAmount: byId("panelAttractorResponseAmount"),
  panelAttractorResponseStatus: byId("panelAttractorResponseStatus"),
  topologyLatticeEnabled: byId("topologyLatticeEnabled"),
  topologyLatticeShowU: byId("topologyLatticeShowU"),
  topologyLatticeShowV: byId("topologyLatticeShowV"),
  topologyLatticeRailWidth: byId("topologyLatticeRailWidth"),
  topologyLatticeRailDepth: byId("topologyLatticeRailDepth"),
  topologyLatticeFillet: byId("topologyLatticeFillet"),
  topologyLatticeLayerGap: byId("topologyLatticeLayerGap"),
  topologyLatticeOpening: byId("topologyLatticeOpening"),
  topologyLatticeDensity: byId("topologyLatticeDensity"),
  topologyLatticeBottomWidth: byId("topologyLatticeBottomWidth"),
  topologyLatticeBottomDepth: byId("topologyLatticeBottomDepth"),
  topologyLatticeBottomFillet: byId("topologyLatticeBottomFillet"),
  topologyLatticeBottomOpening: byId("topologyLatticeBottomOpening"),
  topologyLatticeBottomDensity: byId("topologyLatticeBottomDensity"),
  topologyLoopBindingsEnabled: byId("topologyLoopBindingsEnabled"),
  topologyLoopBindingsFamily: byId("topologyLoopBindingsFamily"),
  topologyLoopBindingsEvery: byId("topologyLoopBindingsEvery"),
  topologyLoopBindingsWidth: byId("topologyLoopBindingsWidth"),
  topologyLoopBindingsDepth: byId("topologyLoopBindingsDepth"),
  topologyLoopBindingsOffset: byId("topologyLoopBindingsOffset"),
  topologyLoopBindingsFillet: byId("topologyLoopBindingsFillet"),
  topologyLatticeGenerate: byId("topologyLatticeGenerate"),
  topologyLatticeStatus: byId("topologyLatticeStatus"),
  supportScaffoldEnabled: byId("supportScaffoldEnabled"),
  supportScaffoldXCount: byId("supportScaffoldXCount"),
  supportScaffoldYCount: byId("supportScaffoldYCount"),
  supportScaffoldDepth: byId("supportScaffoldDepth"),
  supportScaffoldThickness: byId("supportScaffoldThickness"),
  supportScaffoldStatus: byId("supportScaffoldStatus"),
  constructionTemplateDetails: byId("constructionTemplateDetails"),
  sourceGeometryDimensions: byId("sourceGeometryDimensions"),
  projectionOperationDetails: byId("projectionOperationDetails"),
  jointPrincipleDetails: byId("jointPrincipleDetails"),
  workflowSteps: byId("workflowSteps"),
  traitConstructionSteps: byId("traitConstructionSteps"),
  formDiagram: byId("formDiagram"),
  forceDiagram: byId("forceDiagram"),
  diagramMode: byId("diagramMode"),
  toolTabs: byId("toolTabs"),
  pipelineStatus: byId("pipelineStatus"),
  activeVaultTools: byId("activeVaultTools"),
  rightPanelTitle: byId("rightPanelTitle"),
  blockPreview: byId("blockPreview"),
  blockPreviewPanel: byId("blockPreviewPanel"),
  blockPreviewInfo: byId("blockPreviewInfo"),
  blockPreviewTitle: byId("blockPreviewTitle"),
  blockPreviewResize: byId("blockPreviewResize"),
  blockPreviewLength: byId("blockPreviewLength"),
  blockPreviewWidth: byId("blockPreviewWidth"),
  blockPreviewHeight: byId("blockPreviewHeight"),
  panelSubdivisionU: byId("panelSubdivisionU"),
  panelSubdivisionUNum: byId("panelSubdivisionUNum"),
  panelSubdivisionV: byId("panelSubdivisionV"),
  panelSubdivisionVNum: byId("panelSubdivisionVNum"),
  panelWeightSubdivision: byId("panelWeightSubdivision"),
  panelMorphWeightSource: byId("panelMorphWeightSource"),
  panelMorphStrength: byId("panelMorphStrength"),
  panelMorphStrengthNum: byId("panelMorphStrengthNum"),
  ngonCellType: byId("ngonCellType"),
  ngonShape: byId("ngonShape"),
  ngonShapeNum: byId("ngonShapeNum"),
  strategyComponent: byId("strategyComponent"),
  strategyComponentMode: byId("strategyComponentMode"),
  strategyFill: byId("strategyFill"),
  strategyRotation: byId("strategyRotation"),
  strategyRotationVariation: byId("strategyRotationVariation"),
  strategyComponentMapping: byId("strategyComponentMapping"),
  strategyThickness: byId("strategyThickness"),
  strategyPatchSubdivision: byId("strategyPatchSubdivision"),
  strategyPatchSubdivisionNum: byId("strategyPatchSubdivisionNum"),
  strategyPatchSmoothing: byId("strategyPatchSmoothing"),
  strategyPatchSmoothingNum: byId("strategyPatchSmoothingNum"),
  strategyTopology: byId("strategyTopology"),
  strategyDualBoundaryCleanup: byId("strategyDualBoundaryCleanup"),
  strategyMerge: byId("strategyMerge"),
  strategyPreset: byId("strategyPreset"),
  fieldWeightSource: byId("fieldWeightSource"),
  fieldWeightFormula: byId("fieldWeightFormula"),
  fieldWeightSmoothing: byId("fieldWeightSmoothing"),
  fieldWeightSmoothingIterations: byId("fieldWeightSmoothingIterations"),
  fieldWeightRandomSeed: byId("fieldWeightRandomSeed"),
  fieldWeightMaterialStrategy: byId("fieldWeightMaterialStrategy"),
  fieldWeightDriveDensity: byId("fieldWeightDriveDensity"),
  fieldWeightDriveComponent: byId("fieldWeightDriveComponent"),
  fieldWeightDriveThickness: byId("fieldWeightDriveThickness"),
  fieldWeightDriveRotation: byId("fieldWeightDriveRotation"),
  fieldWeightDriveTaper: byId("fieldWeightDriveTaper"),
  fieldWeightDriveZones: byId("fieldWeightDriveZones"),
  attractorSelect: byId("attractorSelect"),
  attractorAddPoint: byId("attractorAddPoint"),
  attractorDrawCurve: byId("attractorDrawCurve"),
  attractorFinishCurve: byId("attractorFinishCurve"),
  attractorDelete: byId("attractorDelete"),
  attractorClear: byId("attractorClear"),
  attractorRadius: byId("attractorRadius"),
  attractorStrength: byId("attractorStrength"),
  attractorCurvatureMix: byId("attractorCurvatureMix"),
  attractorStatus: byId("attractorStatus"),
  attractorApplyDensity: byId("attractorApplyDensity"),
  contourFieldEnabled: byId("contourFieldEnabled"),
  contourFieldSource: byId("contourFieldSource"),
  contourFieldBands: byId("contourFieldBands"),
  contourMaskMode: byId("contourMaskMode"),
  showContourField: byId("showContourField"),
  showContourMasks: byId("showContourMasks"),
  showStreamlines: byId("showStreamlines"),
  streamlineSource: byId("streamlineSource"),
  streamlineCount: byId("streamlineCount"),
  guideDirectionDeg: byId("guideDirectionDeg"),
  reactionDiffusion: byId("reactionDiffusion"),
  reactionScale: byId("reactionScale"),
  editSplitCell: byId("editSplitCell"),
  editMergeCell: byId("editMergeCell"),
  editRotateComponent: byId("editRotateComponent"),
  editPinBoundary: byId("editPinBoundary"),
  editMarkSupport: byId("editMarkSupport"),
  editComponentVariant: byId("editComponentVariant"),
  editAssignVariant: byId("editAssignVariant"),
  customPatternSource: byId("customPatternSource"),
  workflowPatternSource: byId("workflowPatternSource"),
};

byId("vaultType").innerHTML = sourceLibraryTypes.map((v) => `<option value="${v.value}">${v.label}</option>`).join("");
if (byId("vaultDesignerType")) {
  byId("vaultDesignerType").innerHTML = sourceLibraryTypes.map((v) => `<option value="${v.value}">${v.label}</option>`).join("");
}
byId("subdivision").innerHTML = patterns.map((v) => `<option value="${v}">${patternDisplayLabels[v] || v}</option>`).join("");
if (byId("constructionTemplate")) {
  byId("constructionTemplate").innerHTML = constructionTemplateNames.map((name) => `<option>${name}</option>`).join("");
}
if (byId("projectionOperation")) {
  byId("projectionOperation").innerHTML = projectionDevelopmentOperationNames.map((name) => `<option>${name}</option>`).join("");
}
if (byId("jointPrinciple")) {
  byId("jointPrinciple").innerHTML = jointPrincipleNames.map((name) => `<option>${name}</option>`).join("");
}

const setToolTab = (tab) => {
  if (!nodes.toolTabs) return;
  const visibleGroups = {
    "vault-designer": ["vault-designer"],
    "block-designer": ["block-designer"],
    source: ["source", "form"],
    "panel-library": ["panel-library"],
    form: ["form"],
    strategy: ["strategy"],
    "edit-panels": ["blocks", "editor"],
    blocks: ["blocks", "editor"],
    fields: ["fields"],
    "topology-lattice": ["topology-lattice"],
    editor: ["editor"],
    fabrication: ["fabrication"],
    export: ["export", "display"],
    display: ["display"],
    catalog: ["source"],
    workflow: ["source"],
    params: ["form"],
    pattern: ["strategy"],
    layers: ["display"],
  }[tab] || [tab];
  [...nodes.toolTabs.querySelectorAll("button[data-tab]")].forEach((b) => {
    const isActive = b.dataset.tab === tab;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-selected", String(isActive));
  });
  document.querySelector(".tool-scroll")?.setAttribute("data-active-tab", tab);
  document.body.classList.toggle("block-designer-active", tab === "block-designer");
  byId("blockDesignerWorkbench")?.classList.toggle("hidden", tab !== "block-designer");
  document.querySelectorAll("[data-tool-group]").forEach((section) => {
    const groups = (section.getAttribute("data-tool-group") || "").split(/\s+/).filter(Boolean);
    section.classList.toggle("tab-hidden", !groups.some((group) => visibleGroups.includes(group)));
  });
  if (tab === "block-designer") { renderBlockDesigner(); requestAnimationFrame(resize); }
};

const setPipelineStatus = (txt) => {
  if (nodes.pipelineStatus) nodes.pipelineStatus.textContent = txt;
};

const strategyViewLabels = {
  "uv-layout": "UV / Layout",
  "component-mapping": "Component Mapping",
  "assembly-sequence": "Assembly Sequence",
  distortion: "Distortion / Deformation",
  zones: "Zones / Weights",
};

const renderCustomPanelStatus = () => {
  if (!nodes.customPanelStatus) return;
  const panel = state.customPanel;
  if (!panel) {
    nodes.customPanelStatus.textContent = "No custom panel loaded.";
    return;
  }
  const size = panel.size
    ? `${panel.size.x.toFixed(2)} x ${panel.size.y.toFixed(2)} x ${panel.size.z.toFixed(2)} m`
    : "size unavailable";
  const morph = panel.morph
    ? ` | Morph: ${panel.morph.name} (${panel.morph.compatible ? "matched" : panel.morph.compatibilityReason || "incompatible"})`
    : "";
  nodes.customPanelStatus.textContent = `${panel.name} | ${panel.meshCount} mesh(es), ${panel.triangleCount} triangles | ${size}${morph}`;
};

const setStrategyViewMode = (mode) => {
  const next = strategyViewLabels[mode] ? mode : "uv-layout";
  state.strategyViewMode = next;
  if (nodes.strategyViewLabel) nodes.strategyViewLabel.textContent = strategyViewLabels[next];
  document.querySelectorAll("[data-strategy-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.strategyView === next);
  });
  if (next === "uv-layout") {
    state.view2dOptions.mode = "Block / Voussoir Layout";
    state.traitStep = "Course Divisions";
    state.stereotomyStep = "All Stereotomy";
    state.view2dOptions.showReferenceGeometry = false;
    state.view2dOptions.showTraitLines = false;
    state.view2dOptions.showProjectionRays = false;
    state.view2dOptions.showDevelopmentLines = false;
    state.view2dOptions.showTrueShapePanels = false;
    state.view2dOptions.showCutLines = false;
    state.view2dOptions.showJointNormals = false;
    state.view2dOptions.showDerivedStereotomy = true;
    state.view2dOptions.showCourseDivisions = true;
    state.view2dOptions.showBedJoints = true;
    state.view2dOptions.showHeadJoints = true;
    state.view2dOptions.showKeystoneZone = false;
    state.view2dOptions.showGuides = true;
    state.view2dOptions.showBlocks = true;
    state.view2dOptions.showBlockIds = false;
    state.view2dOptions.showBlockMetrics = false;
    state.view2dOptions.showFabricationChecks = false;
  } else if (next === "component-mapping") {
    state.view2dOptions.showBlocks = true;
    state.view2dOptions.showTrueShapePanels = true;
    state.view2dOptions.showStreamlines = true;
    state.view2dOptions.showContourField = true;
    state.view2dOptions.showBlockIds = false;
    state.view2dOptions.showBlockMetrics = false;
  } else if (next === "assembly-sequence") {
    state.view2dOptions.showBlocks = true;
    state.view2dOptions.showBlockIds = true;
    state.view2dOptions.showBlockMetrics = true;
    state.view2dOptions.showFabricationChecks = false;
  } else if (next === "distortion") {
    state.view2dOptions.showBlocks = true;
    state.view2dOptions.showBlockIds = false;
    state.view2dOptions.showBlockMetrics = true;
    state.view2dOptions.showFabricationChecks = true;
    state.view2dOptions.showFabricationLegend = true;
  } else if (next === "zones") {
    state.view2dOptions.showBlocks = true;
    state.view2dOptions.showContourField = true;
    state.view2dOptions.showStreamlines = true;
    state.view2dOptions.showBlockIds = false;
    state.view2dOptions.showBlockMetrics = false;
  }
  renderCurrentTraitState();
  draw2d();
};

const strategyLabels = {
  "procedural-vault": "Procedural vault",
  "uploaded-surface": "Uploaded surface",
  "surface-field": "Surface field",
  courses: "Course field",
  radial: "Radial voussoir field",
  runningBond: "Running bond field",
  diagonal: "Diagonal joint field",
  ngon: "Dual / polygon cell field",
  "Hex / NGon": "Dual / polygon cells",
  "NGon Cells": "Dual / polygon cells",
  "NGon Adaptive": "Adaptive polygon cells",
  importedTopology: "Imported topology field",
  tissueQuadMesh: "Panel quad mesh",
  "Panel Quad Mesh": "Panel quad mesh",
  "Tissue Quad Mesh": "Panel quad mesh",
  importedLayout: "Imported 2D layout",
  freeformCourses: "Freeform courses",
  surfaceGrid: "Surface UV grid",
  proceduralVault: "Procedural vault field",
  ribAligned: "Rib-aligned field",
  keystoneZones: "Keystone zone field",
  voussoir: "Tapered voussoir",
  ashlar: "Ashlar block",
  keyedVoussoir: "Keyed voussoir",
  interlock: "Interlocking block",
  custom: "Custom component",
  single: "Single component",
  family: "Component family",
  zone: "Zone/material driven",
  quad: "Quad cells",
  fan: "Fan cells",
  frame: "Frame cells",
  patch: "Patch cells",
  "course-tangent": "Course tangent",
  "compression-flow": "Compression flow",
  "surface-uv": "Surface UV",
  "principal-curvature": "Principal curvature",
  edgeBending: "Edges bending",
  edgeDeformation: "Edges deformation",
  harmonic: "Harmonic",
  "cell-normal": "Cell normal",
  none: "No variation",
  random: "Random",
  field: "Field driven",
  alternating: "Alternating",
  "fit-to-cell": "Fit to cell",
  "cell-bounds": "Fit to cell",
  "local-frame": "Local frame",
  "global-orientation": "Global orientation",
  "preserve-component-scale": "Preserve component scale",
  constant: "Constant thickness",
  relative: "Relative thickness",
  "relative-cell": "Relative thickness",
  scale: "Scaled source thickness",
  offset: "Offset source thickness",
  "intrados-extrados": "Intrados/extrados",
  "vertex-field": "Vertex field",
  primal: "Primal cells",
  dual: "Dual cells",
  trim: "Trim at boundary",
  "separate-blocks": "Separate blocks",
  "merge-visual": "Merged visual seams",
  "merge-fabrication": "Merge fabrication mesh",
  base: "Base",
  "left-edge": "Left edge",
  "right-edge": "Right edge",
  corner: "Corner",
  keystone: "Keystone",
  "support-adjacent": "Support-adjacent",
  "high-curvature": "High-curvature",
  apertureMorph: "Aperture Morph",
};

const labelStrategyValue = (value) => strategyLabels[value] || value || "n/a";

const ensurePanelVariantTransforms = () => {
  panelVariantRoles.forEach(({ id }) => {
    state.customPanelVariantTransforms[id] = {
      ...defaultPanelVariantTransform(),
      ...(state.customPanelVariantTransforms[id] || {}),
    };
  });
  return state.customPanelVariantTransforms;
};

const getPanelVariantTransform = (role = state.activePanelVariantRole) => {
  ensurePanelVariantTransforms();
  return state.customPanelVariantTransforms[role] || state.customPanelVariantTransforms.base;
};

const setActivePanelVariantTransformValue = (key, value) => {
  ensurePanelVariantTransforms();
  const role = state.activePanelVariantRole || "base";
  state.customPanelVariantTransforms[role] = {
    ...defaultPanelVariantTransform(),
    ...(state.customPanelVariantTransforms[role] || {}),
    [key]: value,
  };
};

const resolvePanelVariantRoleForBlock = (block) => {
  if (block?.manualPanelVariantRole) return block.manualPanelVariantRole;
  if (state.panelVariantAssignmentMode === "single") return state.activePanelVariantRole || "base";
  const basis = block?.fieldWeights?.basis || {};
  const anchor = block?.anchorUv || polygonCentroidUv(block?.uv || [[0.5, 0.5]]);
  const u = Number(anchor?.[0] ?? basis.u ?? 0.5);
  if (block?.isKeystone || block?.zone === "crown" || basis.crown > 0.82) return "keystone";
  if (block?.supportMarked || basis.support > 0.78 || block?.zone === "support") return "support-adjacent";
  if (basis.boundary > 0.9 && (u < 0.12 || u > 0.88)) return "corner";
  if (basis.boundary > 0.72) return u < 0.5 ? "left-edge" : "right-edge";
  if (basis.curvature > 0.72 || block?.zone === "high") return "high-curvature";
  return "base";
};

const applyPanelTransformToUv = (u, v, transform) => {
  let tu = transform.mirrorU ? 1 - u : u;
  let tv = transform.mirrorV ? 1 - v : v;
  tu = 0.5 + (tu - 0.5) * clamp(Number(transform.scaleX) || 1, 0.05, 8);
  tv = 0.5 + (tv - 0.5) * clamp(Number(transform.scaleY) || 1, 0.05, 8);
  const angle = THREE.MathUtils.degToRad(Number(transform.rotateDeg) || 0);
  if (Math.abs(angle) > 1e-8) {
    const x = tu - 0.5;
    const y = tv - 0.5;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    tu = 0.5 + x * c - y * s;
    tv = 0.5 + x * s + y * c;
  }
  return [tu, tv];
};

const renderPanelVariantControls = () => {
  ensurePanelVariantTransforms();
  const role = state.activePanelVariantRole || "base";
  const transform = getPanelVariantTransform(role);
  setInputValue(nodes.panelVariantRole, role, { force: true });
  setInputValue(nodes.panelVariantAssignmentMode, state.panelVariantAssignmentMode || "auto", { force: true });
  setInputValue(nodes.panelScaleX, transform.scaleX);
  setInputValue(nodes.panelScaleY, transform.scaleY);
  setInputValue(nodes.panelScaleZ, transform.scaleZ);
  setInputValue(nodes.panelRotateDeg, transform.rotateDeg);
  setInputValue(nodes.panelSurfaceOffset, metersToCmInput(transform.surfaceOffset || 0));
  setInputValue(nodes.panelLongAxisAlign, transform.align || "strategy", { force: true });
  if (nodes.panelMirrorU) nodes.panelMirrorU.checked = !!transform.mirrorU;
  if (nodes.panelMirrorV) nodes.panelMirrorV.checked = !!transform.mirrorV;
  if (nodes.panelFlipNormal) nodes.panelFlipNormal.checked = !!transform.flipNormal;
  if (nodes.panelVariantStatus) {
    const mode = state.panelVariantAssignmentMode === "single" ? "used on all cells" : "assigned automatically";
    nodes.panelVariantStatus.textContent = `${getPanelVariantLabel(role)} variant active; ${mode}.`;
  }
};

const renderPanelAttractorResponseControls = () => {
  const response = state.panelAttractorResponse;
  setInputValue(nodes.panelAttractorResponseMode, response.mode, { force: true });
  setInputValue(nodes.panelAttractorResponseAmount, response.amount, { force: true });
  if (nodes.panelAttractorResponseStatus) {
    const descriptions = {
      apertureMorph: "Aperture morph uses a topology-matched Morph Panel; carrier cells stay fixed.",
      thickness: "Thickness changes along the panel normal; plan footprint is fixed.",
      offset: "Surface offset changes along the panel normal; plan footprint is fixed.",
      none: "This panel family ignores the attractor field.",
    };
    const data = state.customPanel?.geometryData;
    const interiorCount = data?.positions?.reduce((count, point) => {
      const u = getNormalizedAxisValue(point, data.axes.u);
      const v = getNormalizedAxisValue(point, data.axes.v);
      return count + (Math.min(u, 1 - u, v, 1 - v) > 0.085 ? 1 : 0);
    }, 0) || 0;
    const diagnostic = response.mode === "apertureMorph"
      ? state.customPanel?.morph?.compatible
        ? " Morph Panel is topology-compatible and ready for attractor control."
        : " Load a Morph Panel with the same vertex count and triangle order to activate aperture change."
      : "";
    nodes.panelAttractorResponseStatus.textContent = `${descriptions[response.mode] || descriptions.none}${diagnostic}`;
  }
};

const inferStrategyHost = () => {
  if (state.designMode === "Custom Import" || state.vaultType === "Custom Imported Rhino Surface") {
    return state.importedSurface ? "uploaded-surface" : "surface-field";
  }
  return "procedural-vault";
};

const inferStrategyField = () => {
  if (isPanelQuadSource(state.customPatternSource) && state.importedTissueCells?.length) return "tissueQuadMesh";
  if (state.customPatternSource === "Imported Topology Mesh" && state.importedTopologyPolys?.length) return "importedTopology";
  if (state.customPatternSource === "Imported 2D Layout" && state.imported2DPolys?.length) return "importedLayout";
  if (state.customPatternSource === "Freeform Courses" && state.importedSurface) return "freeformCourses";
  if (state.designMode === "Custom Import" && state.customPatternSource === "UV Form Grid") return "surfaceGrid";
  if (state.customPatternSource === "NGon Cells" || state.customPatternSource === "NGon Adaptive" || state.pattern === "Hex / NGon") return "ngon";
  if (state.pattern === "Running bond") return "runningBond";
  if (state.pattern === "Diagonal joints") return "diagonal";
  if (state.pattern === "Radial joints") return "radial";
  if (state.pattern === "Rib-aligned") return "ribAligned";
  if (state.pattern === "Keystone zones") return "keystoneZones";
  return "courses";
};

const inferDefaultStrategyComponent = () => {
  if (state.pattern === "Keystone zones") return "keyedVoussoir";
  if (state.pattern === "Running bond") return "ashlar";
  if (state.pattern === "Hex / NGon" || state.customPatternSource?.includes("NGon")) return "interlock";
  return "voussoir";
};

const getActiveStrategy = () => ({
  host: inferStrategyHost(),
  field: inferStrategyField(),
  component: state.strategy.component || inferDefaultStrategyComponent(),
  componentMode: state.strategy.componentMode || "single",
  fill: state.strategy.fill || "quad",
  rotation: state.strategy.rotation || (state.structuralDirection === "Compression lines" ? "compression-flow" : "course-tangent"),
  rotationVariation: state.strategy.rotationVariation || "none",
  scale: state.strategy.scale === "cell-bounds" ? "fit-to-cell" : (state.strategy.scale || "fit-to-cell"),
  thickness: state.strategy.thickness || "constant",
  patchSubdivision: clamp(Math.round(state.strategy.patchSubdivision || 4), 2, 12),
  patchSmoothing: clamp(Math.round(state.strategy.patchSmoothing || 0), 0, 4),
  topology: state.strategy.topology || "primal",
  dualBoundaryCleanup: state.strategy.dualBoundaryCleanup !== false,
  boundary: state.strategy.boundary || "trim",
  merge: state.strategy.merge || "separate-blocks",
});

const updateStrategyFromControls = () => {
  state.strategy = {
    ...getActiveStrategy(),
    component: nodes.strategyComponent?.value || state.strategy.component || inferDefaultStrategyComponent(),
    componentMode: nodes.strategyComponentMode?.value || state.strategy.componentMode || "single",
    fill: nodes.strategyFill?.value || state.strategy.fill || "quad",
    rotation: nodes.strategyRotation?.value || state.strategy.rotation || "course-tangent",
    rotationVariation: nodes.strategyRotationVariation?.value || state.strategy.rotationVariation || "none",
    scale: nodes.strategyComponentMapping?.value || state.strategy.scale || "fit-to-cell",
    thickness: nodes.strategyThickness?.value || state.strategy.thickness || "constant",
    patchSubdivision: clamp(Number(nodes.strategyPatchSubdivision?.value || state.strategy.patchSubdivision || 4), 2, 12),
    patchSmoothing: clamp(Number(nodes.strategyPatchSmoothing?.value || state.strategy.patchSmoothing || 0), 0, 4),
    topology: nodes.strategyTopology?.value || state.strategy.topology || "primal",
    dualBoundaryCleanup: nodes.strategyDualBoundaryCleanup ? nodes.strategyDualBoundaryCleanup.checked : state.strategy.dualBoundaryCleanup !== false,
    merge: nodes.strategyMerge?.value || state.strategy.merge || "separate-blocks",
  };
  return state.strategy;
};

const refreshStrategyDescriptor = () => {
  state.strategy = { ...state.strategy, ...getActiveStrategy() };
  setInputValue(nodes.strategyComponent, state.strategy.component, { force: true });
  setInputValue(nodes.strategyComponentMode, state.strategy.componentMode, { force: true });
  setInputValue(nodes.strategyFill, state.strategy.fill, { force: true });
  setInputValue(nodes.strategyRotation, state.strategy.rotation, { force: true });
  setInputValue(nodes.strategyRotationVariation, state.strategy.rotationVariation, { force: true });
  setInputValue(nodes.strategyComponentMapping, state.strategy.scale, { force: true });
  setInputValue(nodes.strategyThickness, state.strategy.thickness, { force: true });
  setInputValue(nodes.strategyPatchSubdivision, state.strategy.patchSubdivision, { force: true });
  setInputValue(nodes.strategyPatchSubdivisionNum, state.strategy.patchSubdivision, { force: true });
  setInputValue(nodes.strategyPatchSmoothing, state.strategy.patchSmoothing, { force: true });
  setInputValue(nodes.strategyPatchSmoothingNum, state.strategy.patchSmoothing, { force: true });
  setInputValue(nodes.strategyTopology, state.strategy.topology, { force: true });
  if (nodes.strategyDualBoundaryCleanup) nodes.strategyDualBoundaryCleanup.checked = state.strategy.dualBoundaryCleanup !== false;
  setInputValue(nodes.strategyMerge, state.strategy.merge, { force: true });
  setInputValue(nodes.customPanelSeamAllowance, metersToCmInput(state.customPanelSeamAllowance));
  setInputValue(nodes.customPanelThicknessScale, state.customPanelThicknessScale);
  setInputValue(nodes.customPanelThicknessOffset, metersToCmInput(state.customPanelThicknessOffset));
  renderCustomPanelStatus();
  state.stereotomyProcess.geometryBasis = labelStrategyValue(state.strategy.host);
  state.stereotomyProcess.tessellationMethod = labelStrategyValue(state.strategy.field);
  state.stereotomyProcess.voussoirMethod = labelStrategyValue(state.strategy.component);
  return state.strategy;
};

const syncFieldWeightControls = () => {
  const fw = state.fieldWeights;
  setInputValue(nodes.fieldWeightSource, fw.source, { force: true });
  setInputValue(nodes.panelMorphWeightSource, fw.source, { force: true });
  setInputValue(nodes.fieldWeightFormula, fw.formula, { force: true });
  setInputValue(nodes.fieldWeightSmoothing, fw.smoothing, { force: true });
  setInputValue(nodes.fieldWeightSmoothingIterations, fw.smoothingIterations, { force: true });
  setInputValue(nodes.fieldWeightRandomSeed, fw.randomSeed, { force: true });
  setInputValue(nodes.fieldWeightMaterialStrategy, fw.materialStrategy, { force: true });
  if (nodes.fieldWeightDriveDensity) nodes.fieldWeightDriveDensity.checked = !!fw.driveDensity;
  if (nodes.fieldWeightDriveComponent) nodes.fieldWeightDriveComponent.checked = !!fw.driveComponent;
  if (nodes.fieldWeightDriveThickness) nodes.fieldWeightDriveThickness.checked = !!fw.driveThickness;
  if (nodes.fieldWeightDriveRotation) nodes.fieldWeightDriveRotation.checked = !!fw.driveRotation;
  if (nodes.fieldWeightDriveTaper) nodes.fieldWeightDriveTaper.checked = !!fw.driveTaper;
  if (nodes.fieldWeightDriveZones) nodes.fieldWeightDriveZones.checked = !!fw.driveZones;
};

const updateFieldWeightsFromControls = () => {
  state.fieldWeights = {
    ...state.fieldWeights,
    source: nodes.fieldWeightSource?.value || state.fieldWeights.source,
    formula: nodes.fieldWeightFormula?.value || state.fieldWeights.formula,
    smoothing: nodes.fieldWeightSmoothing?.value || state.fieldWeights.smoothing,
    smoothingIterations: clamp(Math.round(Number(nodes.fieldWeightSmoothingIterations?.value || state.fieldWeights.smoothingIterations || 0)), 0, 8),
    randomSeed: Math.round(Number(nodes.fieldWeightRandomSeed?.value || state.fieldWeights.randomSeed || 0)),
    materialStrategy: nodes.fieldWeightMaterialStrategy?.value || state.fieldWeights.materialStrategy,
    driveDensity: !!nodes.fieldWeightDriveDensity?.checked,
    driveComponent: !!nodes.fieldWeightDriveComponent?.checked,
    driveThickness: !!nodes.fieldWeightDriveThickness?.checked,
    driveRotation: !!nodes.fieldWeightDriveRotation?.checked,
    driveTaper: !!nodes.fieldWeightDriveTaper?.checked,
    driveZones: !!nodes.fieldWeightDriveZones?.checked,
  };
  syncFieldWeightControls();
  return state.fieldWeights;
};

const getAttractorField = () => state.attractorField;
const attractorId = () => `field-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const pointToSegmentDistance = (point, a, b) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-10) return Math.hypot(point[0] - a[0], point[1] - a[1]);
  const t = clamp(((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSq, 0, 1);
  return Math.hypot(point[0] - (a[0] + dx * t), point[1] - (a[1] + dy * t));
};
const getAttractorWeightAt = (uv) => {
  const elements = getAttractorField().elements || [];
  return elements.reduce((best, element) => {
    const points = element.points || [];
    if (!points.length) return best;
    const distance = element.type === "curve" && points.length > 1
      ? points.slice(1).reduce((min, point, index) => Math.min(min, pointToSegmentDistance(uv, points[index], point)), Infinity)
      : Math.hypot(uv[0] - points[0][0], uv[1] - points[0][1]);
    const radius = Math.max(0.0001, Number(element.radius) || 0.18);
    const influence = 1 - smoothstep(0, radius, distance);
    return Math.max(best, influence * clamp(Number(element.strength) || 0, 0, 1));
  }, 0);
};
const normalizedAttractorWeightAt = (uv) => clamp(getAttractorWeightAt(uv), 0, 1);
const syncAttractorControls = () => {
  const field = getAttractorField();
  const selected = field.elements.find((element) => element.id === field.selectedId);
  if (selected) {
    setInputValue(nodes.attractorRadius, selected.radius, { force: true });
    setInputValue(nodes.attractorStrength, selected.strength, { force: true });
  } else {
    setInputValue(nodes.attractorRadius, field.radius, { force: true });
    setInputValue(nodes.attractorStrength, field.strength, { force: true });
  }
  setInputValue(nodes.attractorCurvatureMix, field.curvatureMix, { force: true });
  [nodes.attractorSelect, nodes.attractorAddPoint, nodes.attractorDrawCurve].forEach((button) => {
    if (!button) return;
    const mode = button === nodes.attractorSelect ? "select" : button === nodes.attractorAddPoint ? "point" : "curve";
    button.classList.toggle("active", field.mode === mode);
  });
  if (nodes.attractorStatus) {
    const count = field.elements.length;
    const selectedLabel = selected ? ` Selected ${selected.type}: radius ${selected.radius.toFixed(2)}, strength ${selected.strength.toFixed(2)}.` : "";
    const drawing = field.mode === "curve" && field.pendingCurve.length ? ` Curve: ${field.pendingCurve.length} vertices; click Finish Curve or press Enter.` : "";
    nodes.attractorStatus.textContent = `${count} control${count === 1 ? "" : "s"} in field.${selectedLabel}${drawing}`;
  }
};
const updateSelectedAttractorParameters = () => {
  const field = getAttractorField();
  const selected = field.elements.find((element) => element.id === field.selectedId);
  const readNumber = (node, fallback) => {
    const value = Number(node?.value);
    return Number.isFinite(value) ? value : fallback;
  };
  const radius = clamp(readNumber(nodes.attractorRadius, field.radius), 0.02, 1);
  const strength = clamp(readNumber(nodes.attractorStrength, field.strength), 0, 1);
  field.radius = radius;
  field.strength = strength;
  field.curvatureMix = clamp(readNumber(nodes.attractorCurvatureMix, field.curvatureMix), 0, 1);
  if (selected) Object.assign(selected, { radius, strength });
  syncAttractorControls();
};
const refreshAttractorField = ({ rebuild = true } = {}) => {
  syncAttractorControls();
  if (rebuild && state.blocks.length) refreshEditedBlocks();
  else draw2d();
};
const finishPendingAttractorCurve = () => {
  const field = getAttractorField();
  if (field.pendingCurve.length < 2) return false;
  const element = { id: attractorId(), type: "curve", points: field.pendingCurve.map(([u, v]) => [u, v]), radius: field.radius, strength: field.strength };
  field.elements.push(element);
  field.selectedId = element.id;
  field.pendingCurve = [];
  field.mode = "select";
  refreshAttractorField();
  return true;
};

const syncContourFieldControls = () => {
  const cf = state.contourField;
  if (nodes.contourFieldEnabled) nodes.contourFieldEnabled.checked = !!cf.enabled;
  setInputValue(nodes.contourFieldSource, cf.source, { force: true });
  setInputValue(nodes.contourFieldBands, cf.bands, { force: true });
  setInputValue(nodes.contourMaskMode, cf.maskMode, { force: true });
  if (nodes.showContourField) nodes.showContourField.checked = !!cf.showContours;
  if (nodes.showContourMasks) nodes.showContourMasks.checked = !!cf.showMasks;
  if (nodes.showStreamlines) nodes.showStreamlines.checked = !!cf.streamlines;
  setInputValue(nodes.streamlineSource, cf.streamlineSource, { force: true });
  setInputValue(nodes.streamlineCount, cf.streamlineCount, { force: true });
  setInputValue(nodes.guideDirectionDeg, cf.guideDirectionDeg, { force: true });
  if (nodes.reactionDiffusion) nodes.reactionDiffusion.checked = !!cf.reactionDiffusion;
  setInputValue(nodes.reactionScale, cf.reactionScale, { force: true });
};

const updateContourFieldFromControls = () => {
  state.contourField = {
    ...state.contourField,
    enabled: !!nodes.contourFieldEnabled?.checked,
    source: nodes.contourFieldSource?.value || state.contourField.source,
    bands: clamp(Math.round(Number(nodes.contourFieldBands?.value || state.contourField.bands || 8)), 2, 24),
    maskMode: nodes.contourMaskMode?.value || state.contourField.maskMode,
    showContours: !!nodes.showContourField?.checked,
    showMasks: !!nodes.showContourMasks?.checked,
    streamlines: !!nodes.showStreamlines?.checked,
    streamlineSource: nodes.streamlineSource?.value || state.contourField.streamlineSource,
    streamlineCount: clamp(Math.round(Number(nodes.streamlineCount?.value || state.contourField.streamlineCount || 9)), 2, 24),
    guideDirectionDeg: Number(nodes.guideDirectionDeg?.value || state.contourField.guideDirectionDeg || 0),
    reactionDiffusion: !!nodes.reactionDiffusion?.checked,
    reactionScale: clamp(Number(nodes.reactionScale?.value || state.contourField.reactionScale || 0), 0, 1),
  };
  syncContourFieldControls();
  return state.contourField;
};

const strategyPresets = {
  custom: { label: "Custom" },
  romanBarrel: {
    label: "Roman barrel voussoirs",
    vaultType: "Barrel Vault",
    pattern: "Radial joints",
    customPatternSource: "UV Form Grid",
    barrelBondMode: "1",
    strategy: { component: "voussoir", componentMode: "single", fill: "quad", rotation: "course-tangent", rotationVariation: "none", scale: "fit-to-cell", thickness: "intrados-extrados", topology: "primal", merge: "separate-blocks" },
  },
  keystoneCourse: {
    label: "Keystone course",
    vaultType: "Barrel Vault",
    pattern: "Keystone zones",
    customPatternSource: "UV Form Grid",
    barrelBondMode: "5",
    strategy: { component: "keyedVoussoir", componentMode: "zone", fill: "quad", rotation: "course-tangent", rotationVariation: "field", scale: "local-frame", thickness: "constant", topology: "primal", merge: "separate-blocks" },
  },
  herringboneDiagonal: {
    label: "Herringbone / diagonal bond",
    vaultType: "Barrel Vault",
    pattern: "Diagonal joints",
    customPatternSource: "UV Form Grid",
    barrelBondMode: "3",
    strategy: { component: "ashlar", componentMode: "family", fill: "quad", rotation: "surface-uv", rotationVariation: "alternating", scale: "global-orientation", thickness: "constant", topology: "primal", merge: "merge-visual" },
  },
  fanVoussoirs: {
    label: "Fan voussoirs",
    vaultType: "Barrel Vault",
    pattern: "Radial joints",
    customPatternSource: "UV Form Grid",
    barrelBondMode: "4",
    strategy: { component: "voussoir", componentMode: "single", fill: "fan", rotation: "compression-flow", rotationVariation: "field", scale: "local-frame", thickness: "relative-cell", topology: "primal", merge: "separate-blocks" },
  },
  tissueCustomComponent: {
    label: "Panel quad component",
    customPatternSource: panelQuadSource,
    strategy: { component: "custom", componentMode: "single", fill: "patch", rotation: "surface-uv", rotationVariation: "none", scale: "local-frame", thickness: "constant", patchSubdivision: 4, patchSmoothing: 0, topology: "primal", dualBoundaryCleanup: true, merge: "merge-visual" },
  },
  ngonDual: {
    label: "Hex/NGon dual blocks",
    pattern: "Hex / NGon",
    customPatternSource: "NGon Cells",
    strategy: { component: "interlock", componentMode: "family", fill: "patch", rotation: "cell-normal", rotationVariation: "field", scale: "local-frame", thickness: "relative-cell", patchSubdivision: 6, patchSmoothing: 1, topology: "dual", dualBoundaryCleanup: true, merge: "merge-fabrication" },
  },
  interlockingGroin: {
    label: "Interlocking groin blocks",
    vaultType: "Groin Vault",
    pattern: "Groin-line courses",
    customPatternSource: "UV Form Grid",
    strategy: { component: "interlock", componentMode: "zone", fill: "frame", rotation: "compression-flow", rotationVariation: "alternating", scale: "local-frame", thickness: "intrados-extrados", topology: "dual", dualBoundaryCleanup: true, merge: "separate-blocks" },
  },
};

const applyStrategyPreset = (presetId) => {
  const preset = strategyPresets[presetId];
  if (!preset || presetId === "custom") return;
  if (preset.vaultType) {
    state.designMode = "Generated";
    if (byId("designMode")) byId("designMode").value = "Generated";
    state.vaultType = preset.vaultType;
    if (byId("vaultType")) byId("vaultType").value = state.vaultType;
  }
  if (preset.pattern) state.pattern = preset.pattern;
  if (preset.customPatternSource) state.customPatternSource = preset.customPatternSource;
  if (isPanelQuadSource(preset.customPatternSource) && state.importedTissueCells?.length) {
    state.designMode = "Custom Import";
    if (byId("designMode")) byId("designMode").value = "Custom Import";
    state.vaultType = "Custom Imported Rhino Surface";
    if (byId("vaultType")) byId("vaultType").value = state.vaultType;
    state.patternAppliedToModel = true;
  }
  if (preset.barrelBondMode) state.barrelBondMode = preset.barrelBondMode;
  state.strategy = { ...state.strategy, ...preset.strategy };
  state.patternAppliedToModel = true;
  state.layers.blocks = true;
  if (byId("layerBlocks")) byId("layerBlocks").checked = true;
  syncCustomPatternSourceInputs();
  syncInputsFromState();
  applyVaultParamRules();
  setPipelineStatus(`Strategy preset applied: ${preset.label}.`);
  rebuild();
};

const apply2dDrawingMode = (mode) => {
  state.view2dOptions.mode = drawingModes2d.includes(mode) ? mode : "Trait / Epure";
  Object.assign(state.view2dOptions, drawingModeLayerPresets[state.view2dOptions.mode] || {});
  if (state.view2dOptions.mode === "Plan") {
    state.traitStep = "Course Divisions";
    state.stereotomyStep = "Keystone Zone";
  } else if (state.view2dOptions.mode === "Section") {
    state.traitStep = "Section Curves";
    state.stereotomyStep = "Keystone Zone";
  } else if (state.view2dOptions.mode === "Elevation") {
    state.traitStep = "Projection Rays";
    state.stereotomyStep = "Courses";
  } else if (state.view2dOptions.mode === "Trait / Epure") {
    state.traitStep = "All Trait Lines";
    state.stereotomyStep = "All Stereotomy";
  } else if (state.view2dOptions.mode === "Surface Development") {
    state.traitStep = "Surface Development";
    state.stereotomyStep = "True-Shape Panels";
  } else if (state.view2dOptions.mode === "Block / Voussoir Layout") {
    state.traitStep = "Course Divisions";
    state.stereotomyStep = "All Stereotomy";
    state.blockStep = "Numbered Blocks";
    state.blocksGeneratedFromTrait = true;
  }
};

const parameterLabelMap = {
  span: "Span",
  rise: "Rise",
  length: "Length",
  thickness: "Masonry Thickness (cm)",
  archType: "Arch Type",
  taperScale: "Taper End Scale",
  courseHeight: "Block Width (cm)",
  targetBlockWidth: "Block Length (cm)",
  courseCount: "Field U Divisions",
  blockCount: "Field V Divisions",
  subdivisionDensity: "Block Density",
  keystoneSize: "Keystone Width",
  springingAngle: "Springing Angle",
  barrelBondMode: "Barrel Pattern Option",
  barrelOffsetSide: "Thickness Side",
  wallThickness: "Wall Thickness (cm)",
  wallHeightOffset: "Wall Height Offset",
  bayRatio: "Bay Ratio",
  ribCount: "Rib Count",
  lierneDensity: "Lierne Density",
  netFrequency: "Net Frequency",
  tileLayers: "Tile Layers",
  groinMorph: "Groin Curve Type",
  lInterlockBias: "L-Interlock Bias",
};

const renderActiveVaultTools = () => {
  if (!nodes.activeVaultTools) return;
  const def = vaultLibrary[state.vaultType];
  const params = (def?.parameters || []).map((p) => parameterLabelMap[p.key] || p.key);
  const patternsAllowed = vaultPatternAllowed[state.vaultType] || patterns;
  const process = state.stereotomyProcess;
  const strategy = refreshStrategyDescriptor();
  const sourceLabel = state.vaultType === "Custom Imported Rhino Surface"
    ? `Uploaded host${state.importedModelName ? `: ${state.importedModelName}` : ""}`
    : `Built-in procedural source: ${state.vaultType}`;
  const stats = state.importedModelStats
    ? `<div><b>Model Meshes:</b> ${state.importedModelStats.meshCount}; <b>Triangles:</b> ${state.importedModelStats.triangleCount}</div>`
    : "";
  const topology = state.importedTopology
    ? `<div><b>Topology:</b> ${state.importedTopology.boundaryEdgeCount} boundary edges; ${state.importedTopology.featureEdgeCount} feature edges; ${state.importedTopology.nonManifoldEdgeCount} non-manifold edges</div>`
    : "";
  const topologyMesh = state.importedTopologyMeshStats
    ? `<div><b>Pattern Mesh:</b> ${state.importedTopologyMeshStats.faceCount} faces from ${state.importedTopologyMeshName}</div>`
    : "";
  const carrier = getTissueCarrierSummary();
  const carrierStatus = `<div class="carrier-inline ${carrier.statusClass}"><b>Carrier:</b> ${carrier.title}; ${carrier.lines[0] || ""}</div>`;
  nodes.activeVaultTools.innerHTML = [
    `<div><b>Source:</b> ${sourceLabel}</div>`,
    `<div><b>Stage:</b> ${state.pipelineStage || 0} ${process.stageName}</div>`,
    `<div><b>2D Logic:</b> ${def?.construction2D || "n/a"}</div>`,
    `<div><b>3D Logic:</b> ${def?.construction3D || "n/a"}</div>`,
    stats,
    topology,
    topologyMesh,
    carrierStatus,
    `<div><b>Strategy Host:</b> ${labelStrategyValue(strategy.host)}</div>`,
    `<div><b>Strategy Field:</b> ${labelStrategyValue(strategy.field)}</div>`,
    `<div><b>Block Component:</b> ${labelStrategyValue(strategy.component)}; ${labelStrategyValue(strategy.componentMode)}</div>`,
    `<div><b>Fill + Merge:</b> ${labelStrategyValue(strategy.fill)}; ${labelStrategyValue(strategy.merge)}</div>`,
    `<div><b>Mapping:</b> ${labelStrategyValue(strategy.rotation)}; ${labelStrategyValue(strategy.rotationVariation)}; ${labelStrategyValue(strategy.scale)}; ${labelStrategyValue(strategy.thickness)}</div>`,
    `<div><b>Force Flow:</b> ${process.forceFlowDiagram}</div>`,
    `<div><b>Tessellation:</b> ${process.tessellationMethod}</div>`,
    `<div><b>Voussoir:</b> ${process.voussoirMethod}</div>`,
    `<div><b>Fabrication:</b> ${process.fabricationFocus}</div>`,
    `<div><b>Active Parameters:</b> ${params.length ? params.join(", ") : "n/a"}</div>`,
    `<div><b>Allowed Patterns:</b> ${patternsAllowed.join(", ")}</div>`,
  ].join("");
};

const usesSourceSizeInputs = () => state.designMode !== "Custom Import" && state.vaultType !== "Custom Imported Rhino Surface";

const getBaseSourceDimensions = () => {
  const shellThickness = state.params.thickness || 0;
  const springingHeight = getBarrelSpringingY(1);
  return {
    span: state.params.span || 0,
    outsideSpan: (state.params.span || 0) + shellThickness * 2,
    rise: state.params.rise || 0,
    outsideHeight: springingHeight + (state.params.rise || 0) + shellThickness,
    length: state.params.length || 0,
    shellThickness,
    wallThickness: state.wallThickness || shellThickness,
    wallHeight: getBarrelWallHeight(1),
  };
};

const getTissueCarrierSummary = () => {
  const cells = state.importedTissueCells || [];
  const stats = state.importedTopologyMeshStats;
  if (!cells.length) {
    return {
      statusClass: state.importedSurface ? "warn" : "neutral",
      title: state.importedSurface ? "No panel carrier mesh" : "No uploaded carrier mesh",
      lines: state.importedSurface
        ? ["The host is loaded, but no reusable OBJ face layout was detected for panel mapping."]
        : ["Upload an OBJ host with quad faces to use panel-based component mapping."],
    };
  }
  const counts = cells.reduce((acc, cell) => {
    const n = cell.points?.length || 0;
    acc[n] = (acc[n] || 0) + 1;
    return acc;
  }, {});
  const total = cells.length;
  const quads = counts[4] || 0;
  const tris = counts[3] || 0;
  const quadRatio = quads / Math.max(1, total);
  const triRatio = tris / Math.max(1, total);
  const mixed = Object.keys(counts).length > 1;
  const statusClass = quadRatio >= 0.9 ? "ok" : triRatio >= 0.75 ? "bad" : "warn";
  const title = statusClass === "ok"
    ? "Panel carrier ready"
    : statusClass === "bad"
      ? "Triangulated carrier warning"
      : "Mixed carrier mesh";
  const faceText = Object.entries(counts)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([verts, count]) => `${count} ${verts}-vertex`)
    .join(", ");
  const lines = [
    `${total} carrier face(s): ${faceText}.`,
    `${quads} quad face(s), ${tris} triangle face(s).`,
  ];
  if (statusClass === "ok") {
    lines.push("Good for panel-based component mapping.");
  } else if (statusClass === "bad") {
    lines.push("Re-export a quad mesh from Blender/Rhino; triangulated hosts cannot preserve panel patch mapping cleanly.");
  } else if (mixed) {
    lines.push("Mapping will work, but quad-dominant meshes give the most predictable component deformation.");
  }
  if (stats?.source) lines.push(`Source: ${stats.source}.`);
  return { statusClass, title, lines };
};

const renderSourceGeometryDimensions = () => {
  if (!nodes.sourceGeometryDimensions) return;
  const fmtM = (value) => `${Number(value || 0).toFixed(2)} m`;
  const scale = Math.max(0.001, Number(state.sourceTransform.scale) || 1);
  const base = getBaseSourceDimensions();
  const scaled = Object.fromEntries(Object.entries(base).map(([key, value]) => [key, value * scale]));
  const importedBox = state.importedSurfaceBbox && !state.importedSurfaceBbox.isEmpty()
    ? state.importedSurfaceBbox.getSize(new THREE.Vector3())
    : null;
  const carrier = getTissueCarrierSummary();
  nodes.sourceGeometryDimensions.innerHTML = [
    `<b>Base Geometry Dimensions</b>`,
    `<div class="dimension-grid">`,
    `<span>Span: <b>${fmtM(base.span)}</b></span>`,
    `<span>Outside span: <b>${fmtM(base.outsideSpan)}</b></span>`,
    `<span>Rise: <b>${fmtM(base.rise)}</b></span>`,
    `<span>Outside height: <b>${fmtM(base.outsideHeight)}</b></span>`,
    `<span>Length: <b>${fmtM(base.length)}</b></span>`,
    `<span>Vault thickness: <b>${fmtM(base.shellThickness)}</b></span>`,
    `<span>Wall thickness: <b>${fmtM(base.wallThickness)}</b></span>`,
    `<span>Wall height: <b>${fmtM(base.wallHeight)}</b></span>`,
    `</div>`,
    `<b>With Source Scale ${scale.toFixed(3)}</b>`,
    `<div class="dimension-grid">`,
    `<span>Span: <b>${fmtM(scaled.span)}</b></span>`,
    `<span>Outside span: <b>${fmtM(scaled.outsideSpan)}</b></span>`,
    `<span>Rise: <b>${fmtM(scaled.rise)}</b></span>`,
    `<span>Outside height: <b>${fmtM(scaled.outsideHeight)}</b></span>`,
    `<span>Length: <b>${fmtM(scaled.length)}</b></span>`,
    `<span>Thickness: <b>${fmtM(scaled.shellThickness)}</b></span>`,
    `</div>`,
    importedBox ? `<b>Uploaded Source Bounds</b>` : "",
    importedBox ? `<div class="dimension-grid"><span>X: <b>${fmtM(importedBox.x)}</b></span><span>Y: <b>${fmtM(importedBox.z)}</b></span><span>Z: <b>${fmtM(importedBox.y)}</b></span></div>` : "",
    `<div class="carrier-summary ${carrier.statusClass}">`,
    `<b>${carrier.title}</b>`,
    ...carrier.lines.map((line) => `<span>${line}</span>`),
    `</div>`,
  ].join("");
};

const renderConstructionTemplateDetails = () => {
  if (!nodes.constructionTemplateDetails) return;
  const tpl = constructionTemplateCatalog[state.constructionTemplate];
  if (!tpl) {
    nodes.constructionTemplateDetails.innerHTML = "<span>No 2D construction template selected.</span>";
    return;
  }
  nodes.constructionTemplateDetails.innerHTML = [
    `<b>${tpl.category}</b>`,
    `<span>${tpl.plateRange} | ${tpl.surfacePrinciple} | ${tpl.drawingMode}</span>`,
    `<span>Joint logic: ${tpl.jointLogic}</span>`,
    `<ul>${tpl.operations.map((op) => `<li>${op}</li>`).join("")}</ul>`,
  ].join("");
};

const renderProjectionOperationDetails = () => {
  if (!nodes.projectionOperationDetails) return;
  const op = projectionDevelopmentOperations[state.projectionOperation];
  if (!op) {
    nodes.projectionOperationDetails.innerHTML = "<span>No projection operation selected.</span>";
    return;
  }
  nodes.projectionOperationDetails.innerHTML = [
    `<b>${state.projectionOperation}</b>`,
    `<span>${op.description}</span>`,
    `<span>${op.drawingMode} | ${op.traitStep} | ${op.stereotomyStep}</span>`,
  ].join("");
};

const applyProjectionDevelopmentOperation = (name) => {
  const op = projectionDevelopmentOperations[name];
  if (!op) return;
  state.projectionOperation = name;
  apply2dDrawingMode(op.drawingMode);
  state.traitStep = op.traitStep;
  state.stereotomyStep = op.stereotomyStep;
  if (op.surfacePrinciple) state.surfacePrinciple = op.surfacePrinciple;
  Object.assign(state.view2dOptions, op.layers);
  state.view2dOptions.showGuides = true;
  state.view2dOptions.showLabels = true;
  updateStereotomyProcess(Math.max(state.pipelineStage || 0, 3));
  syncInputsFromState();
  renderProjectionOperationDetails();
  renderTraitConstructionSteps();
  setPipelineStatus(`Applied projection/development operation: ${name}.`);
  draw2d();
};

const renderJointPrincipleDetails = () => {
  if (!nodes.jointPrincipleDetails) return;
  const joint = jointPrinciples[state.jointPrinciple];
  if (!joint) {
    nodes.jointPrincipleDetails.innerHTML = "<span>No joint principle selected.</span>";
    return;
  }
  nodes.jointPrincipleDetails.innerHTML = [
    `<b>${state.jointPrinciple}</b>`,
    `<span>${joint.description}</span>`,
    `<span>pattern: ${joint.pattern} | trait: ${joint.traitStep}</span>`,
  ].join("");
};

const applyJointPrinciple = (name) => {
  const joint = jointPrinciples[name];
  if (!joint) return;
  state.jointPrinciple = name;
  state.pattern = joint.pattern;
  if (joint.surfacePrinciple) state.surfacePrinciple = joint.surfacePrinciple;
  state.traitStep = joint.traitStep;
  state.stereotomyStep = joint.stereotomyStep;
  state.view2dOptions.showTraitLines = true;
  state.view2dOptions.showDerivedStereotomy = true;
  state.view2dOptions.showCourseDivisions = true;
  state.view2dOptions.showBedJoints = true;
  state.view2dOptions.showHeadJoints = true;
  state.view2dOptions.showJointNormals = ["radial joints", "conic generatrix joints", "fan ribs", "spherical meridian / parallel joints"].includes(name) || joint.traitStep === "Joint Normals";
  state.view2dOptions.showProjectionRays = name.includes("skew") || name.includes("convergent");
  state.view2dOptions.showDevelopmentLines = name.includes("helical") || name.includes("generatrix");
  state.view2dOptions.showKeystoneZone = name.includes("keystone");
  if (name.includes("skew") || name.includes("oblique")) state.constructionEntities.skewAxis.show = true;
  if (name.includes("groin")) state.constructionEntities.groinLine.show = true;
  updateStereotomyProcess(Math.max(state.pipelineStage || 0, 4));
  applyVaultParamRules();
  syncInputsFromState();
  renderJointPrincipleDetails();
  renderTraitConstructionSteps();
  setPipelineStatus(`Applied joint principle: ${name}.`);
  rebuild();
};

const getTraitConstructionStepIndex = () => {
  if (state.activeTraitConstructionStep) return state.activeTraitConstructionStep;
  if (state.pipelineStage >= 6 || state.blockStep === "Fabrication Preview") return 8;
  if (state.pipelineStage >= 5 || state.blocksGeneratedFromTrait) return 7;
  if (state.pipelineStage >= 4 || state.stereotomyStep !== "All Stereotomy") return 6;
  if (state.pipelineStage >= 3 || state.traitStep === "Surface Development") return 5;
  if (state.traitStep !== "All Trait Lines") return 4;
  if (state.surfacePrinciple) return 3;
  return 1;
};

const classifyTraitConstructionStep = (label = "", index = 1) => {
  const text = label.toLowerCase();
  if (text.includes("springing") || text.includes("datum") || text.includes("axis")) return "springing";
  if (text.includes("intrados") || text.includes("profile") || text.includes("section")) return "intrados";
  if (text.includes("extrados") || text.includes("thickness") || text.includes("offset")) return "extrados";
  if (text.includes("divide") || text.includes("course") || text.includes("interval")) return "courses";
  if (text.includes("project") || text.includes("hypography") || text.includes("underside")) return "projection";
  if (text.includes("head joint") || text.includes("bed") || text.includes("joint")) return "joints";
  if (text.includes("panel") || text.includes("panneaux") || text.includes("voussoir")) return "panels";
  if (text.includes("validate") || text.includes("check") || text.includes("proportion")) return "validation";
  return ["springing", "intrados", "extrados", "courses", "projection", "joints", "panels", "validation"][clamp(index - 1, 0, 7)];
};

const focusConstructionEntities = (keys) => {
  Object.entries(state.constructionEntities).forEach(([key, item]) => {
    item.show = keys.includes(key);
  });
};

const traitFocusControls = {
  springing: ["drawingMode2d", "show2dReference", "show2dGuides", "entitySpringing", "entityAxis", "entityImposts"],
  intrados: ["drawingMode2d", "traitStep", "show2dReference", "show2dTraitLines", "entityIntrados", "entityApex", "entitySpringing"],
  extrados: ["thickness", "thicknessNum", "show2dJointNormals", "entityExtrados", "entityNeutral", "entityIntrados"],
  courses: ["traitStep", "stereotomyStep", "show2dCourseDivisions", "show2dDerivedStereotomy", "show2dBedJoints"],
  projection: ["drawingMode2d", "projectionOperation", "show2dProjectionRays", "show2dCourseDivisions"],
  joints: ["jointPrinciple", "stereotomyStep", "show2dJointNormals", "show2dHeadJoints", "show2dBedJoints"],
  panels: ["drawingMode2d", "projectionOperation", "show2dDevelopmentLines", "show2dTrueShapePanels", "show2dBlocks"],
  validation: ["fabricationCheck", "show2dFabricationChecks", "show2dFabricationLegend", "show2dBlockIds", "show2dBlockMetrics"],
};

const traitFocusLayerKeys = [
  "showBlocks",
  "showReferenceGeometry",
  "showVertices",
  "showGuides",
  "showLabels",
  "showCutLines",
  "showTraitLines",
  "showProjectionRays",
  "showCourseDivisions",
  "showJointNormals",
  "showDevelopmentLines",
  "showDerivedStereotomy",
  "showBedJoints",
  "showHeadJoints",
  "showKeystoneZone",
  "showTrueShapePanels",
  "showBlockIds",
  "showBlockMetrics",
  "showFabricationChecks",
  "showFabricationLegend",
  "showAnnotations",
  "showSpanDimension",
  "showRiseDimension",
  "showThicknessDimension",
  "showAngleLabels",
  "showRadiusLabels",
  "showCourseCount",
  "showBlockWidth",
  "showJointGap",
  "showTrueLength",
  "showSurfaceFamilyLabel",
];

const traitFocusLayerPresets = {
  springing: { showReferenceGeometry: true, showGuides: true, showLabels: true, showTraitLines: true },
  intrados: { showReferenceGeometry: true, showGuides: true, showLabels: true, showTraitLines: true, showAnnotations: true, showSpanDimension: true, showRiseDimension: true },
  extrados: { showReferenceGeometry: true, showGuides: true, showLabels: true, showTraitLines: true, showJointNormals: true, showAnnotations: true, showThicknessDimension: true, showRadiusLabels: true },
  courses: { showReferenceGeometry: true, showGuides: true, showLabels: true, showTraitLines: true, showCourseDivisions: true, showDerivedStereotomy: true, showBedJoints: true, showAnnotations: true, showCourseCount: true },
  projection: { showReferenceGeometry: true, showGuides: true, showLabels: true, showTraitLines: true, showProjectionRays: true, showCourseDivisions: true },
  joints: { showReferenceGeometry: true, showGuides: true, showLabels: true, showTraitLines: true, showDerivedStereotomy: true, showJointNormals: true, showBedJoints: true, showHeadJoints: true },
  panels: { showGuides: true, showLabels: true, showTraitLines: true, showDevelopmentLines: true, showDerivedStereotomy: true, showTrueShapePanels: true, showBlocks: true, showAnnotations: true, showTrueLength: true, showSurfaceFamilyLabel: true },
  validation: { showGuides: true, showLabels: true, showDerivedStereotomy: true, showBlocks: true, showBlockIds: true, showBlockMetrics: true, showFabricationChecks: true, showFabricationLegend: true, showAnnotations: true, showBlockWidth: true, showJointGap: true, showSurfaceFamilyLabel: true },
};

const applyTraitFocusLayerPreset = (kind) => {
  const reset = Object.fromEntries(traitFocusLayerKeys.map((key) => [key, false]));
  Object.assign(state.view2dOptions, reset, traitFocusLayerPresets[kind] || {});
};

const drawingPresetConfigs = {
  "Clean Trait": {
    mode: "Section",
    focus: "intrados",
    traitStep: "Section Curves",
    stereotomyStep: "Keystone Zone",
    layers: { showReferenceGeometry: true, showGuides: true, showLabels: true, showTraitLines: true, showAnnotations: true, showSpanDimension: true, showRiseDimension: true, showThicknessDimension: true },
  },
  "Full Epure": {
    mode: "Trait / Epure",
    focus: "all",
    traitStep: "All Trait Lines",
    stereotomyStep: "All Stereotomy",
    layers: { showReferenceGeometry: true, showGuides: true, showLabels: true, showTraitLines: true, showProjectionRays: true, showCourseDivisions: true, showJointNormals: true, showDerivedStereotomy: true, showBedJoints: true, showHeadJoints: true, showKeystoneZone: true, showBlocks: true, showAnnotations: true, showCourseCount: true, showSurfaceFamilyLabel: true },
  },
  Development: {
    mode: "Surface Development",
    focus: "panels",
    traitStep: "Surface Development",
    stereotomyStep: "True-Shape Panels",
    projectionOperation: "Generate Panel Templates / Panneaux",
    layers: { showGuides: true, showLabels: true, showTraitLines: true, showDevelopmentLines: true, showDerivedStereotomy: true, showTrueShapePanels: true, showBlocks: true, showAnnotations: true, showTrueLength: true, showSurfaceFamilyLabel: true },
  },
  Fabrication: {
    mode: "Block / Voussoir Layout",
    focus: "validation",
    traitStep: "Course Divisions",
    stereotomyStep: "All Stereotomy",
    blockStep: "Fabrication Preview",
    layers: { showGuides: true, showLabels: false, showDerivedStereotomy: true, showBlocks: true, showBlockIds: true, showBlockMetrics: true, showFabricationChecks: true, showFabricationLegend: true, showAnnotations: true, showBlockWidth: true, showJointGap: true, showSurfaceFamilyLabel: true },
  },
  Teaching: {
    mode: "Trait / Epure",
    focus: "teaching",
    traitStep: "All Trait Lines",
    stereotomyStep: "All Stereotomy",
    layers: { showReferenceGeometry: true, showGuides: true, showLabels: true, showTraitLines: true, showProjectionRays: true, showCourseDivisions: true, showJointNormals: true, showDevelopmentLines: true, showDerivedStereotomy: true, showBedJoints: true, showHeadJoints: true, showKeystoneZone: true, showTrueShapePanels: true, showBlocks: true, showAnnotations: true, showSpanDimension: true, showRiseDimension: true, showThicknessDimension: true, showAngleLabels: true, showRadiusLabels: true, showCourseCount: true, showBlockWidth: true, showJointGap: true, showTrueLength: true, showSurfaceFamilyLabel: true },
  },
};

const renderDrawingPresetButtons = () => {
  document.querySelectorAll("[data-drawing-preset]").forEach((button) => {
    button.classList.toggle("active", button.dataset.drawingPreset === state.drawingPreset);
    button.setAttribute("aria-pressed", String(button.dataset.drawingPreset === state.drawingPreset));
  });
};

const renderViewportLayoutButtons = () => {
  document.querySelectorAll("[data-view-layout]").forEach((button) => {
    const isActive = button.dataset.viewLayout === state.viewportLayout;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
};

const applyViewportLayout = (layout = state.viewportLayout) => {
  state.viewportLayout = ["2d", "split", "3d"].includes(layout) ? layout : "split";
  document.body.classList.toggle("view-2d-only", state.viewportLayout === "2d");
  document.body.classList.toggle("view-3d-only", state.viewportLayout === "3d");
  renderViewportLayoutButtons();
  requestAnimationFrame(resize);
};

const applyDrawingPreset = (name) => {
  const preset = drawingPresetConfigs[name];
  if (!preset) return;
  state.drawingPreset = name;
  state.activeTraitFocus = preset.focus || "all";
  state.activeTraitConstructionStep = null;
  apply2dDrawingMode(preset.mode);
  state.traitStep = preset.traitStep || state.traitStep;
  state.stereotomyStep = preset.stereotomyStep || state.stereotomyStep;
  if (preset.blockStep) state.blockStep = preset.blockStep;
  if (preset.projectionOperation) state.projectionOperation = preset.projectionOperation;
  const reset = Object.fromEntries(traitFocusLayerKeys.map((key) => [key, false]));
  Object.assign(state.view2dOptions, reset, preset.layers || {});
  syncInputsFromState();
  renderDrawingPresetButtons();
  renderTraitConstructionSteps();
  renderCurrentTraitState();
  draw2d();
};

const renderCurrentTraitState = () => {
  if (!nodes.currentTraitState) return;
  const focus = state.activeTraitFocus && state.activeTraitFocus !== "all" ? ` | ${state.activeTraitFocus}` : "";
  const view = strategyViewLabels[state.strategyViewMode] || "UV / Layout";
  const drawingLabel = state.strategyViewMode === "uv-layout" ? "Block / Voussoir Layout" : state.drawingPreset;
  nodes.currentTraitState.textContent = `${view} | ${state.vaultType} | ${state.surfacePrinciple} | ${state.jointPrinciple} | ${drawingLabel}${focus}`;
};

const isTeachingDrawingPreset = () => state.drawingPreset === "Teaching" || state.drawingPreset === "Teaching View";

const renderTraitFocusControls = () => {
  document.querySelectorAll(".control-focus").forEach((el) => el.classList.remove("control-focus"));
  const ids = traitFocusControls[state.activeTraitFocus] || [];
  ids.forEach((id) => {
    const el = byId(id);
    const target = el?.closest("label, details, .joint-card, .projection-card, .trait-steps-panel");
    if (target) target.classList.add("control-focus");
  });
  if (nodes.traitConstructionSteps && state.activeTraitFocus !== "all") {
    nodes.traitConstructionSteps.classList.add("control-focus");
  }
};

const applyTraitConstructionStep = (stepNumber) => {
  const steps = traitConstructionTemplates[state.vaultType] || defaultTraitConstructionSteps;
  const step = clamp(Number(stepNumber) || 1, 1, steps.length);
  const kind = classifyTraitConstructionStep(steps[step - 1], step);
  state.activeTraitConstructionStep = step;
  state.activeTraitFocus = kind;
  state.drawingPreset = "Construction Step";
  state.view2dOptions.showGuides = true;
  state.view2dOptions.showLabels = true;
  state.view2dOptions.showReferenceGeometry = true;
  state.view2dOptions.showTraitLines = true;
  state.view2dOptions.showDerivedStereotomy = false;
  state.view2dOptions.showBlocks = false;
  state.view2dOptions.showBlockIds = false;
  state.view2dOptions.showBlockMetrics = false;
  state.view2dOptions.showFabricationChecks = false;
  state.view2dOptions.showFabricationLegend = false;
  state.view2dOptions.showProjectionRays = false;
  state.view2dOptions.showCourseDivisions = false;
  state.view2dOptions.showJointNormals = false;
  state.view2dOptions.showDevelopmentLines = false;
  state.view2dOptions.showBedJoints = false;
  state.view2dOptions.showHeadJoints = false;
  state.view2dOptions.showKeystoneZone = false;
  state.view2dOptions.showTrueShapePanels = false;
  state.view2dOptions.showVertices = false;

  if (kind === "springing") {
    apply2dDrawingMode("Plan");
    focusConstructionEntities(["springing", "axis", "imposts", "skewAxis", "groinLine"]);
    state.traitStep = "Section Curves";
    state.stereotomyStep = "Keystone Zone";
  } else if (kind === "intrados") {
    apply2dDrawingMode("Section");
    focusConstructionEntities(["springing", "axis", "apex", "intrados", "imposts"]);
    state.traitStep = "Section Curves";
    state.stereotomyStep = "Keystone Zone";
  } else if (kind === "extrados") {
    apply2dDrawingMode("Section");
    focusConstructionEntities(["intrados", "extrados", "neutral", "axis", "apex"]);
    state.traitStep = "Section Curves";
    state.view2dOptions.showJointNormals = true;
  } else if (kind === "courses") {
    apply2dDrawingMode("Trait / Epure");
    focusConstructionEntities(["springing", "axis", "intrados", "extrados", "apex"]);
    state.traitStep = "Course Divisions";
    state.stereotomyStep = "Courses";
    state.view2dOptions.showBlocks = false;
    state.view2dOptions.showBlockIds = false;
    state.view2dOptions.showBlockMetrics = false;
    state.view2dOptions.showCourseDivisions = true;
    state.view2dOptions.showDerivedStereotomy = true;
    state.view2dOptions.showBedJoints = true;
  } else if (kind === "projection") {
    apply2dDrawingMode("Elevation");
    focusConstructionEntities(["springing", "axis", "intrados", "extrados", "skewAxis", "groinLine"]);
    state.traitStep = "Projection Rays";
    state.stereotomyStep = "Courses";
    state.view2dOptions.showProjectionRays = true;
    state.view2dOptions.showCourseDivisions = true;
  } else if (kind === "joints") {
    apply2dDrawingMode("Trait / Epure");
    focusConstructionEntities(["axis", "intrados", "extrados", "skewAxis", "groinLine"]);
    state.traitStep = "Joint Normals";
    state.stereotomyStep = "Head Joints";
    state.view2dOptions.showBlocks = false;
    state.view2dOptions.showBlockIds = false;
    state.view2dOptions.showBlockMetrics = false;
    state.view2dOptions.showDerivedStereotomy = true;
    state.view2dOptions.showJointNormals = true;
    state.view2dOptions.showHeadJoints = true;
    state.view2dOptions.showBedJoints = true;
  } else if (kind === "panels") {
    apply2dDrawingMode("Surface Development");
    focusConstructionEntities(["intrados", "extrados", "neutral"]);
    state.traitStep = "Surface Development";
    state.stereotomyStep = "True-Shape Panels";
    state.view2dOptions.showDevelopmentLines = true;
    state.view2dOptions.showDerivedStereotomy = true;
    state.view2dOptions.showTrueShapePanels = true;
    state.view2dOptions.showBlocks = true;
  } else if (kind === "validation") {
    apply2dDrawingMode("Block / Voussoir Layout");
    focusConstructionEntities(["intrados", "extrados", "neutral"]);
    state.blockStep = "Fabrication Preview";
    state.traitStep = "Course Divisions";
    state.stereotomyStep = "All Stereotomy";
    state.view2dOptions.showDerivedStereotomy = true;
    state.view2dOptions.showBlocks = true;
    state.view2dOptions.showBlockIds = true;
    state.view2dOptions.showBlockMetrics = true;
    state.view2dOptions.showFabricationChecks = true;
    state.view2dOptions.showFabricationLegend = true;
  }

  applyTraitFocusLayerPreset(kind);
  syncInputsFromState();
  renderDrawingPresetButtons();
  renderCurrentTraitState();
  renderTraitConstructionSteps();
  renderTraitFocusControls();
  draw2d();
};

const renderTraitConstructionSteps = () => {
  if (!nodes.traitConstructionSteps) return;
  const steps = traitConstructionTemplates[state.vaultType] || defaultTraitConstructionSteps;
  const current = getTraitConstructionStepIndex();
  const tpl = constructionTemplateCatalog[state.constructionTemplate];
  const header = tpl
    ? state.constructionTemplate
    : state.vaultType === "Custom Imported Rhino Surface"
    ? "Imported Surface Trait"
    : `${state.vaultType} Trait`;
  const meta = [
    tpl ? `plates: ${tpl.plateRange}` : null,
    `surface: ${state.surfacePrinciple}`,
    `trait: ${state.traitStep}`,
    `stereotomy: ${state.stereotomyStep}`,
    `blocks: ${state.blockStep}`,
  ].filter(Boolean).join(" | ");
  nodes.traitConstructionSteps.innerHTML = [
    `<div class="trait-steps-title">${header}</div>`,
    `<div class="trait-steps-meta">${meta}</div>`,
    `<ol class="trait-steps-list">`,
    ...steps.map((step, i) => {
      const n = i + 1;
      const status = n < current ? "complete" : n === current ? "current" : "pending";
      return `<li class="${status}"><button class="trait-step-button" data-trait-construction-step="${n}" type="button"><span class="trait-step-number">${n}</span><span>${step}</span></button></li>`;
    }),
    `</ol>`,
  ].join("");
  renderTraitFocusControls();
};

const applyRightPanelToolVisibility = () => {
  if (nodes.rightPanelTitle) {
    nodes.rightPanelTitle.textContent = state.designMode === "Custom Import"
      ? "Model Source + Analysis"
      : "Built-In Source + Analysis";
  }
  const isCustom = state.designMode === "Custom Import" || state.vaultType === "Custom Imported Rhino Surface";
  document.querySelectorAll("[data-right-section]").forEach((sec) => {
    const key = sec.getAttribute("data-right-section");
    let show = true;
    if (key === "precedent") show = !isCustom;
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
    if (String(v).trim() === "") return;
    const num = Number(v);
    if (!Number.isFinite(num)) return;
    r.value = String(num);
    if (fromRange) n.value = String(num);
    if (onInput) onInput(num);
    else if (fromRange) n.dispatchEvent(new Event("input", { bubbles: true }));
  };
  r.addEventListener("input", (e) => apply(e.target.value, true));
  n.addEventListener("input", (e) => apply(e.target.value, false));
};

const setInputValue = (el, value, { force = false } = {}) => {
  if (!el) return;
  if (!force && document.activeElement === el) return;
  el.value = String(value);
};

const syncInputPair = (id, value) => {
  setInputValue(byId(id), value);
  setInputValue(byId(`${id}Num`), value);
};

const metersToCmInput = (value) => String(Number((value * 100).toFixed(2)));
const cmInputToMeters = (value) => Number(value) / 100;
const syncCmInputPair = (id, meters) => syncInputPair(id, metersToCmInput(meters));
const syncCmInput = (id, meters) => {
  setInputValue(byId(id), metersToCmInput(meters));
};

const syncCustomPatternSourceInputs = () => {
  if (state.customPatternSource === legacyPanelQuadSource) state.customPatternSource = panelQuadSource;
  setInputValue(nodes.customPatternSource, state.customPatternSource, { force: true });
  setInputValue(nodes.workflowPatternSource, state.customPatternSource, { force: true });
};

const setCustomPatternSource = (value, { shouldRebuild = true } = {}) => {
  state.customPatternSource = value === legacyPanelQuadSource ? panelQuadSource : value;
  syncCustomPatternSourceInputs();
  ensureImportedFreeformApplied();
  if (["Freeform Courses", "NGon Cells", "NGon Adaptive"].includes(state.customPatternSource)) {
    updateFreeformCountsFromBlockDimensions();
  }
  if (shouldRebuild) rebuild();
};

const activateNgonPatternSource = () => {
  if (
    state.designMode === "Custom Import" &&
    state.vaultType === "Custom Imported Rhino Surface" &&
    state.importedSurface &&
    !["NGon Cells", "NGon Adaptive"].includes(state.customPatternSource)
  ) {
    state.customPatternSource = "NGon Cells";
    syncCustomPatternSourceInputs();
  }
  ensureImportedFreeformApplied();
};

const linkCmRangeAndNumber = (rangeId, numberId, onInput) => linkRangeAndNumber(rangeId, numberId, (valueCm) => {
  const meters = cmInputToMeters(valueCm);
  if (onInput) onInput(meters, valueCm);
});
const linkCmNumber = (id, onInput) => {
  const el = byId(id);
  if (!el) return;
  el.addEventListener("input", (e) => {
    if (String(e.target.value).trim() === "") return;
    const valueCm = Number(e.target.value);
    if (!Number.isFinite(valueCm)) return;
    if (onInput) onInput(cmInputToMeters(valueCm), valueCm);
  });
};

document.addEventListener("focusout", (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type === "number") {
    syncInputsFromState();
  }
});

const syncTransformToolbar = () => {
  document.querySelectorAll("[data-transform-tool]").forEach((button) => {
    button.classList.toggle("active", button.dataset.transformTool === state.transformTool);
  });
  document.querySelectorAll("[data-snap]").forEach((button) => {
    button.classList.toggle("active", !!state.snaps[button.dataset.snap]);
  });
};

const brgPipelineStages = {
  1: {
    name: "Geometry + Supports",
    status: "Stage 1: vault geometry and support assumptions established.",
    workflowStep: 2,
  },
  2: {
    name: "Force Flow",
    status: "Stage 2: form and force diagrams aligned to the current support topology.",
    workflowStep: 3,
  },
  3: {
    name: "Pattern Topology",
    status: "Stage 3: pattern topology, density, and singularity assumptions set.",
    workflowStep: 1,
  },
  4: {
    name: "Masonry Tessellation",
    status: "Stage 4: pattern converted into a block tessellation with bond logic.",
    workflowStep: 4,
  },
  5: {
    name: "Voussoir Solids",
    status: "Stage 5: voussoir solids generated from intrados to extrados.",
    workflowStep: 5,
  },
  6: {
    name: "Fabrication Checks",
    status: "Stage 6: ruled-face, convexity, size, weight, and tolerance checks complete.",
    workflowStep: 6,
  },
  7: {
    name: "Stability Report",
    status: "Stage 7: stability assumptions summarized for review.",
    workflowStep: 6,
  },
};

const getForceFlowDiagram = () => {
  if (state.vaultType === "Groin Vault") {
    if (state.pattern === "Groin-line courses") return "compression converges into groin spine lines";
    if (state.pattern === "Diagonal joints") return "orthogonal groin force diagram";
    if (state.pattern === "Rib-aligned") return "curved groin force diagram";
    return "fan-like groin force diagram";
  }
  if (state.vaultType === "Dome") return "radial hoop-meridian compression field";
  if (isBarrelLikeVault()) return "parallel arch compression field";
  return state.structuralDirection || vaultStructuralDefault[state.vaultType] || "compression-line field";
};

const getTessellationMethod = () => {
  if (state.pattern === "Groin-line courses") return "courses follow diagonal groin lines, not barrel rings";
  if (state.pattern === "Hex / NGon") return "dualized anisotropic mesh";
  if (state.pattern === "Running bond") return "staggered running bond";
  if (state.pattern === "Keystone zones") return "course grid with crown/keystone bias";
  if (state.pattern === "Rib-aligned") return "feature-aligned rib field";
  if (state.pattern === "Diagonal joints") return "transverse cutting curves";
  return "course grid";
};

const updateStereotomyProcess = (stage) => {
  const def = vaultLibrary[state.vaultType] || {};
  const stageInfo = brgPipelineStages[stage] || { name: "Idle" };
  const imported = state.vaultType === "Custom Imported Rhino Surface";
  state.stereotomyProcess = {
    stageName: stageInfo.name,
    geometryBasis: imported
      ? `${state.surfacePrinciple} principle on uploaded mesh source${state.importedModelName ? ` (${state.importedModelName})` : ""}; supports/feature zones assigned from source metadata or manual strategy`
      : `${state.surfacePrinciple} principle; ${def.construction3D || "parametric vault surface"}; supports: ${state.supportTopology}`,
    forceFlowDiagram: getForceFlowDiagram(),
    patternIntent: `${state.pattern}; ${Math.round(state.params.courseCount * state.params.subdivisionDensity)} x ${Math.round(state.params.blockCount * state.params.subdivisionDensity)} target field`,
    tessellationMethod: getTessellationMethod(),
    voussoirMethod: imported
      ? "projected voussoir field from source mesh raycast; thickness/block depth controlled by strategy parameters"
      : state.vaultType === "Groin Vault"
      ? "intersection of two orthogonally extruded barrel vaults; thickness follows after form resolution"
      : state.jointMode === "Physical cut" ? "mitered normal-offset prism" : "visual normal-offset prism",
    fabricationFocus: imported
      ? "source mesh quality, block proportions, projection misses, joint gaps, tolerance"
      : state.jointMode === "Physical cut" ? "physical joint gaps, ruled faces, convexity, tolerance" : "visual seams, block proportions, early tolerance review",
    stabilityFocus: imported
      ? "pending feature annotations for supports, springing lines, ribs/groins, and load paths"
      : state.vaultType === "Groin Vault"
      ? `minimum-thickness review with ${getForceFlowDiagram()}`
      : "compression-only review with current form diagram",
  };
};

const runPipelineStage = (stage) => {
  state.pipelineStage = stage;
  [
    ["pipeTrace", 1],
    ["pipeIntrados", 2],
    ["pipeProject", 3],
    ["pipeCleanup", 4],
    ["pipeAssembly", 5],
    ["pipeFabrication", 6],
    ["pipeStability", 7],
  ].forEach(([id, value]) => byId(id)?.classList.toggle("active", value === stage));
  updateStereotomyProcess(stage);
  const stageInfo = brgPipelineStages[stage];
  if (stage === 1) {
    state.designMode = "Generated";
    if (byId("designMode")) byId("designMode").value = "Generated";
    state.customPatternSource = "UV Form Grid";
    if (byId("customPatternSource")) byId("customPatternSource").value = state.customPatternSource;
    state.patternAppliedToModel = false;
  }
  if (stage === 2) {
    state.structuralDirection = vaultStructuralDefault[state.vaultType] || state.structuralDirection;
    if (byId("structuralDirection")) byId("structuralDirection").value = state.structuralDirection;
    state.forceLmin = Math.max(0.12, state.forceLmin);
    state.forceLmax = Math.max(state.forceLmin + 0.25, state.forceLmax);
    setInputValue(byId("forceLmin"), state.forceLmin.toFixed(2));
    setInputValue(byId("forceLmax"), state.forceLmax.toFixed(2));
  }
  if (stage === 3) {
    state.pattern = vaultPatternPreset[state.vaultType] || state.pattern;
    if (byId("subdivision")) byId("subdivision").value = state.pattern;
    state.customPatternSource = "UV Form Grid";
    if (byId("customPatternSource")) byId("customPatternSource").value = state.customPatternSource;
  }
  if (stage === 4) {
    if (state.pattern === "Hex / NGon") {
      state.customPatternSource = "NGon Adaptive";
      if (byId("customPatternSource")) byId("customPatternSource").value = state.customPatternSource;
    }
    state.params.subdivisionDensity = Math.max(1, state.params.subdivisionDensity);
    syncInputPair("subdivisionDensity", state.params.subdivisionDensity);
  }
  if (stage === 5) {
    state.patternAppliedToModel = true;
    state.extradosOffset = Math.max(0.08, state.extradosOffset);
    syncInputPair("extradosOffset", state.extradosOffset);
  }
  if (stage === 6) runChecksAndAssemblyPreview();
  if (stage === 7) {
    state.displayPreset = "Analysis Heatmap";
    if (byId("displayPreset")) byId("displayPreset").value = state.displayPreset;
  }
  updateStereotomyProcess(stage);
  if (stageInfo?.workflowStep) applyWorkflowStep(stageInfo.workflowStep);
  setPipelineStatus(stageInfo?.status || "Pipeline idle.");
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
  updateStereotomyProcess(0);
  setPipelineStatus("Solid model opened. Developing stereotomic pattern...");
  rebuild();
};

const renderVaultDesigner = () => {
  const def = vaultLibrary[state.vaultType];
  if (!def) return;
  const selector = byId("vaultDesignerType");
  if (selector) selector.value = state.vaultType;
  const definition = byId("vaultDesignerDefinition");
  if (definition) {
    definition.innerHTML = `<b>${def.name}</b><span>${def.construction2D || "Construction logic is generated from the active vault profile."}</span>`;
  }
  const status = byId("vaultDesignerStatus");
  if (status) status.textContent = state.vaultDesignerPreview ? "Surface ready" : "Handed off";
  const handoff = byId("vaultDesignerHandoff");
  if (handoff) handoff.textContent = state.vaultDesignerPreview
    ? "No blocks generated. The active vault surface is ready for downstream block design."
    : "Vault surface handed to Block Designer. Block generation remains an explicit downstream action.";
  document.querySelectorAll("[data-vault-stage]").forEach((step) => {
    step.classList.toggle("active", Number(step.dataset.vaultStage) <= 4);
  });
};

const runVaultSelectionPipeline = (vaultType) => {
  const def = vaultLibrary[vaultType];
  if (!def) return;
  state.vaultType = vaultType;
  state.surfacePrinciple = vaultSurfacePrincipleDefault[vaultType] || state.surfacePrinciple;
  applyVaultStartupSolution(vaultType);
  fitStartupParamsToConstraints(vaultType);
  state.structuralDirection = def.forceFlowType || state.structuralDirection;
  state.pattern = def.stereotomyType || state.pattern;
  state.patternAppliedToModel = false;
  state.vaultDesignerPreview = true;
  state.blocksGeneratedFromTrait = false;
  state.view2dOptions.showBlocks = false;
  state.selectedBlockId = null;
  if (state.vaultType !== "Custom Imported Rhino Surface") {
    state.designMode = "Generated";
    if (byId("designMode")) byId("designMode").value = "Generated";
  } else {
    state.designMode = "Custom Import";
    if (byId("designMode")) byId("designMode").value = "Custom Import";
    state.customPatternSource = state.imported2DPolys?.length
      ? "Imported 2D Layout"
      : state.importedTissueCells?.length
        ? panelQuadSource
        : "UV Form Grid";
    if (byId("customPatternSource")) byId("customPatternSource").value = state.customPatternSource;
  }
  if (byId("subdivision")) byId("subdivision").value = state.pattern;
  if (byId("structuralDirection")) byId("structuralDirection").value = state.structuralDirection;
  applyVaultParamRules();
  syncWallThicknessWithVault();
  syncInputsFromState();
  state.pipelineStage = 1;
  updateStereotomyProcess(1);
  setPipelineStatus(state.vaultType === "Custom Imported Rhino Surface"
    ? "Uploaded model source active. Import a 3D model or apply a stereotomy strategy to the current source mesh."
    : `Loaded ${def.name}: 2D construction, 3D geometry, force flow, and default stereotomy ready.`);
  rebuild();
  renderVaultDesigner();
};

const runChecksAndAssemblyPreview = () => {
  state.constraints.fabTolerance = Math.max(0.003, state.constraints.fabTolerance);
  state.blockStep = "Fabrication Preview";
  state.fabricationCheck = state.fabricationCheck || "All Checks";
  state.view2dOptions.showBlocks = true;
  state.view2dOptions.showFabricationChecks = true;
  state.view2dOptions.showFabricationLegend = true;
  state.view2dOptions.showBlockIds = true;
  state.view2dOptions.showBlockMetrics = true;
  state.view2dOptions.showVertices = false;
};

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1b2330, 0.012);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
camera.position.set(20, 14, 26);
const renderer = new THREE.WebGLRenderer({ canvas: byId("viewport"), antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
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
controls.addEventListener("start", () => { state.userDefinedCamera = true; });
renderer.domElement.style.touchAction = "none";
const ambient = new THREE.AmbientLight(0xffffff, 0.44);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0xf2f7ff, 0x28313c, 0.62);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff8ed, 2.25);
const fill = new THREE.DirectionalLight(0xbddcff, 0.72);
const rim = new THREE.DirectionalLight(0xffffff, 1.1);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1;
key.shadow.camera.far = 160;
key.shadow.camera.left = -55;
key.shadow.camera.right = 55;
key.shadow.camera.top = 55;
key.shadow.camera.bottom = -55;
key.shadow.bias = -0.0002;
scene.add(key);
scene.add(fill);
scene.add(rim);
const softbox = new THREE.DirectionalLight(0xffffff, 0.95);
softbox.position.set(-18, 30, 18);
scene.add(softbox);
const gridHelper = new THREE.GridHelper(240, 120, 0x3e5f7d, 0x203342);
const axesHelper = new THREE.AxesHelper(6);
axesHelper.visible = false;
scene.add(gridHelper);
scene.add(axesHelper);
const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 260),
  new THREE.ShadowMaterial({ color: 0x07101a, opacity: 0.22, transparent: true })
);
shadowPlane.name = "soft-contact-shadow-plane";
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -0.045;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);
const bboxHelpersGroup = new THREE.Group();
const originAxesGroup = new THREE.Group();
const lightRigHelpers = new THREE.Group();
lightRigHelpers.visible = false;
lightRigHelpers.add(new THREE.DirectionalLightHelper(key, 2.4, 0xff8fe5));
lightRigHelpers.add(new THREE.DirectionalLightHelper(fill, 2.4, 0x9ad0ff));
lightRigHelpers.add(new THREE.DirectionalLightHelper(rim, 2.4, 0xffd47f));
scene.add(lightRigHelpers);
scene.add(bboxHelpersGroup);
scene.add(originAxesGroup);

const applyLightingPreset = (preset) => {
  state.lightingPreset = preset;
  if (preset === "Rhino Studio") {
    scene.background = new THREE.Color(0x334153);
    scene.fog = new THREE.FogExp2(0x2b3747, 0.0065);
    ambient.intensity = 0.42;
    renderer.toneMappingExposure = 1.36;
    hemi.color.set(0xf4f8ff); hemi.groundColor.set(0x2a3440); hemi.intensity = 0.66;
    key.color.set(0xfff7ea); key.intensity = 2.35; key.position.set(28, 34, 20);
    fill.color.set(0xc4ddff); fill.intensity = 0.74; fill.position.set(-22, 14, 18);
    rim.color.set(0xffffff); rim.intensity = 1.18; rim.position.set(-4, 22, -30);
    softbox.color.set(0xffffff); softbox.intensity = 1.05; softbox.position.set(-18, 32, 18);
  } else if (preset === "Studio Soft") {
    scene.background = new THREE.Color(0x303c4d);
    scene.fog = new THREE.FogExp2(0x273242, 0.008);
    ambient.intensity = 0.48;
    renderer.toneMappingExposure = 1.28;
    hemi.color.set(0xe6f1ff); hemi.groundColor.set(0x202936); hemi.intensity = 0.58;
    key.color.set(0xfffbf2); key.intensity = 1.65; key.position.set(18, 30, 14);
    fill.color.set(0xb7d7ff); fill.intensity = 0.72; fill.position.set(-18, 13, 18);
    rim.color.set(0xffffff); rim.intensity = 0.72; rim.position.set(0, 16, -26);
    softbox.color.set(0xffffff); softbox.intensity = 0.86; softbox.position.set(-16, 30, 16);
  } else if (preset === "Three-Point") {
    scene.background = new THREE.Color(0x273243);
    scene.fog = new THREE.FogExp2(0x1f2a39, 0.009);
    ambient.intensity = 0.64;
    renderer.toneMappingExposure = 1.2;
    hemi.color.set(0xd6e8ff); hemi.groundColor.set(0x131a25); hemi.intensity = 0.28;
    key.color.set(0xffffff); key.intensity = 1.25; key.position.set(22, 24, 16);
    fill.color.set(0xaed3ff); fill.intensity = 0.62; fill.position.set(-22, 10, 6);
    rim.color.set(0xffffff); rim.intensity = 0.68; rim.position.set(0, 20, -26);
    softbox.color.set(0xffffff); softbox.intensity = 0.62; softbox.position.set(-18, 28, 14);
  } else if (preset === "Clay Neutral") {
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.FogExp2(0x161616, 0.018);
    ambient.intensity = 0.42;
    renderer.toneMappingExposure = 0.98;
    hemi.color.set(0xe8e8e8); hemi.groundColor.set(0x1a1a1a); hemi.intensity = 0.35;
    key.color.set(0xffffff); key.intensity = 1.10; key.position.set(16, 24, 14);
    fill.color.set(0xffffff); fill.intensity = 0.35; fill.position.set(-12, 10, 8);
    rim.color.set(0xf2f2f2); rim.intensity = 0.25; rim.position.set(6, 14, -20);
    softbox.color.set(0xffffff); softbox.intensity = 0.55; softbox.position.set(-14, 26, 14);
  } else if (preset === "Overcast Daylight") {
    scene.background = new THREE.Color(0xaeb9c7);
    scene.fog = new THREE.FogExp2(0xaab6c4, 0.012);
    ambient.intensity = 0.55;
    renderer.toneMappingExposure = 1.12;
    hemi.color.set(0xf2f6ff); hemi.groundColor.set(0x6e7886); hemi.intensity = 0.7;
    key.color.set(0xf5f8ff); key.intensity = 0.62; key.position.set(12, 30, 10);
    fill.color.set(0xe4ecff); fill.intensity = 0.52; fill.position.set(-14, 18, 12);
    rim.color.set(0xdde8ff); rim.intensity = 0.2; rim.position.set(0, 12, -18);
    softbox.color.set(0xffffff); softbox.intensity = 0.7; softbox.position.set(-18, 34, 12);
  } else if (preset === "Sunset Rim") {
    scene.background = new THREE.Color(0x241820);
    scene.fog = new THREE.FogExp2(0x1f1620, 0.02);
    ambient.intensity = 0.3;
    renderer.toneMappingExposure = 1.05;
    hemi.color.set(0xffd2a6); hemi.groundColor.set(0x22161a); hemi.intensity = 0.32;
    key.color.set(0xffb37a); key.intensity = 0.95; key.position.set(-18, 16, 16);
    fill.color.set(0xa6b9ff); fill.intensity = 0.42; fill.position.set(18, 8, 6);
    rim.color.set(0xffd0b0); rim.intensity = 0.9; rim.position.set(0, 12, -28);
    softbox.color.set(0xffdcc8); softbox.intensity = 0.48; softbox.position.set(-20, 22, 18);
  }
  lightRigHelpers.visible = !!state.display.latticeControls;
};

const blockGroup = new THREE.Group();
const solidVaultGroup = new THREE.Group();
const supportWallGroup = new THREE.Group();
const scaffoldGroup = new THREE.Group();
const topologyLatticeGroup = new THREE.Group();
const importedSurfaceGroup = new THREE.Group();
const copiedGeometryGroup = new THREE.Group();
const sectionGizmoGroup = new THREE.Group();
const sectionActiveGizmoGroup = new THREE.Group();
scene.add(blockGroup);
scene.add(solidVaultGroup);
scene.add(supportWallGroup);
scene.add(scaffoldGroup);
scene.add(topologyLatticeGroup);
scene.add(importedSurfaceGroup);
scene.add(copiedGeometryGroup);
scene.add(sectionGizmoGroup);
scene.add(sectionActiveGizmoGroup);

const blockPreviewScene = new THREE.Scene();
blockPreviewScene.background = new THREE.Color(0x111927);
const blockPreviewCamera = new THREE.PerspectiveCamera(45, 1, 0.05, 500);
blockPreviewCamera.position.set(4, 3, 5);
const blockPreviewRenderer = nodes.blockPreview
  ? new THREE.WebGLRenderer({ canvas: nodes.blockPreview, antialias: true, alpha: true })
  : null;
if (blockPreviewRenderer) {
  blockPreviewRenderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  blockPreviewRenderer.outputColorSpace = THREE.SRGBColorSpace;
  blockPreviewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  blockPreviewRenderer.toneMappingExposure = 1.18;
}
const blockPreviewControls = blockPreviewRenderer ? new OrbitControls(blockPreviewCamera, blockPreviewRenderer.domElement) : null;
if (blockPreviewControls) {
  blockPreviewControls.enableDamping = true;
  blockPreviewControls.enablePan = false;
  blockPreviewControls.enableZoom = true;
  blockPreviewControls.minDistance = 0.2;
  blockPreviewControls.maxDistance = 80;
}
const blockPreviewGroup = new THREE.Group();
blockPreviewScene.add(new THREE.AmbientLight(0xffffff, 0.74));
const blockPreviewKey = new THREE.DirectionalLight(0xffffff, 1.2);
blockPreviewKey.position.set(5, 7, 4);
blockPreviewScene.add(blockPreviewKey);
const blockPreviewFill = new THREE.DirectionalLight(0xc9ddff, 0.42);
blockPreviewFill.position.set(-4, 2, -3);
blockPreviewScene.add(blockPreviewFill);
blockPreviewScene.add(blockPreviewGroup);

// Independent Block Designer viewport: a real three-dimensional pair editor.
const bdModelCanvas = byId("bdModelCanvas");
const bdModelRenderer = bdModelCanvas ? new THREE.WebGLRenderer({ canvas: bdModelCanvas, antialias: true, alpha: true }) : null;
const bdModelScene = new THREE.Scene();
const bdModelCamera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
const bdModelGroup = new THREE.Group();
bdModelScene.add(new THREE.HemisphereLight(0xf2f3eb, 0x647067, 2.1));
const bdModelKey = new THREE.DirectionalLight(0xffffff, 2.6); bdModelKey.position.set(4, 6, 5); bdModelScene.add(bdModelKey);
const bdModelRim = new THREE.DirectionalLight(0x9bac96, 1.05); bdModelRim.position.set(-5, 2, -4); bdModelScene.add(bdModelRim, bdModelGroup);
const bdModelControls = bdModelRenderer ? new OrbitControls(bdModelCamera, bdModelRenderer.domElement) : null;
if (bdModelRenderer) { bdModelRenderer.setPixelRatio(1); bdModelRenderer.outputColorSpace = THREE.SRGBColorSpace; bdModelRenderer.toneMapping = THREE.ACESFilmicToneMapping; }
if (bdModelControls) { bdModelControls.enableDamping = false; bdModelControls.enablePan = true; bdModelControls.rotateSpeed = 1.18; bdModelControls.minDistance = .4; bdModelControls.maxDistance = 30; bdModelControls.addEventListener("start", () => { state.blockDesigner.userCamera = true; }); }

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const sectionDragPlane = new THREE.Plane();
const sectionDragPoint = new THREE.Vector3();
const objLoader = new OBJLoader();
const stlLoader = new STLLoader();
const gltfLoader = new GLTFLoader();
const rhinoLoader = new Rhino3dmLoader();
rhinoLoader.setLibraryPath("/rhino3dm/");
let rhinoModulePromise = null;
const getRhinoModule = () => {
  if (!rhinoModulePromise) {
    rhinoModulePromise = rhino3dmFactory({ locateFile: (path) => `/rhino3dm/${path}` });
  }
  return rhinoModulePromise;
};

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

const fallacaraSources = {
  plates: "Fallacara, Volume II. Tavole",
  apparatus: "Fallacara, Volume III. Apparati",
};

const stereotomyValidationCatalog = {
  "Barrel Vault": {
    plateRange: "Tav. 60-82",
    category: "Volte a botte",
    geometryTypes: ["straight barrel", "oblique barrel", "annular/parabolic barrel", "decorated intrados"],
    operations: ["arch-profile generation", "course grid", "running bond", "oblique axis mapping", "annular directrix", "voussoir development"],
    treatiseLineage: ["Philibert Delorme", "Jean Chereau", "Abraham Bosse / Desargues"],
  },
  "Tapered Barrel Vault": {
    plateRange: "Tav. 72-82 plus barrel variations",
    category: "Volte a botte",
    geometryTypes: ["lofted barrel", "oblique barrel", "annular/parabolic barrel"],
    operations: ["profile scaling", "lofted intrados/extrados", "course drift", "variable block width", "head-joint development"],
    treatiseLineage: ["Abraham Bosse / Desargues", "Amedee-Francois Frezier"],
  },
  "Groin Vault": {
    plateRange: "Tav. 261-293 for compound intersections",
    category: "Volte composte",
    geometryTypes: ["intersecting barrels", "compound arch fields", "horizontal/vertical vault development"],
    operations: ["two-barrel intersection", "groin arris extraction", "diagonal course mapping", "solid-first thickness", "block validity checks"],
    treatiseLineage: ["Francois Derand", "Amedee-Francois Frezier", "Gaspard Monge"],
  },
  "Cloister Vault": {
    plateRange: "Tav. 14-26 and 261-293",
    category: "Volte piane / volte composte",
    geometryTypes: ["corner-rising sectors", "square-bay deformation", "apex convergence"],
    operations: ["corner fan layout", "sector-to-surface mapping", "keystone zone control", "support topology checks"],
    treatiseLineage: ["Amedee-Francois Frezier", "Gaspard Monge"],
  },
  "Sail Vault": {
    plateRange: "Tav. 14-26 and 196-207",
    category: "Volte piane / trompe sferiche",
    geometryTypes: ["spherical deformation", "pendentive-like spherical transitions", "square-bay domical surface"],
    operations: ["plane-to-sphere remapping", "corner support projection", "curvature-safe tessellation", "radial/rib comparison"],
    treatiseLineage: ["Jean Chereau", "Mathurin Jousse", "Gaspard Monge"],
  },
  Dome: {
    plateRange: "Tav. 238-260",
    category: "Cupole",
    geometryTypes: ["spherical dome", "elliptical dome", "helical ribs", "triangular rib pattern"],
    operations: ["polar radial joints", "hoop courses", "elliptical ring courses", "helical rib controls", "bed-face extraction"],
    treatiseLineage: ["Philibert Delorme", "Guarino Guarini", "Amedee-Francois Frezier"],
  },
  "Rib Vault": {
    plateRange: "Tav. 261-286",
    category: "Volte composte a sviluppo verticale",
    geometryTypes: ["ribbed web", "interlaced arches", "spheroidal dome crossings"],
    operations: ["rib skeleton layout", "web panel mapping", "rib-to-web intersections", "node/keystone checks"],
    treatiseLineage: ["Guarino Guarini", "Amedee-Francois Frezier"],
  },
  "Fan Vault": {
    plateRange: "Tav. 227-237",
    category: "Volte a ventaglio",
    geometryTypes: ["decorated fan", "smooth fan", "conoid fan fields"],
    operations: ["clustered springer ribs", "equal-curve fan layout", "conoid surface generation", "springer block segmentation"],
    treatiseLineage: ["Guarino Guarini", "Gaspard Monge"],
  },
  "Lierne Vault": {
    plateRange: "Tav. 261-286",
    category: "Volte composte",
    geometryTypes: ["interlaced rib network", "tertiary connector ribs", "node-rich vault web"],
    operations: ["primary/secondary rib graph", "node spacing", "web panel tessellation", "keystone and boss zones"],
    treatiseLineage: ["Guarino Guarini", "Amedee-Francois Frezier"],
  },
  "Net Vault": {
    plateRange: "Tav. 261-286",
    category: "Volte composte",
    geometryTypes: ["repeating rib net", "diagonal lattice", "compound rib intersections"],
    operations: ["rib lattice generation", "diagonal seam mapping", "node validity", "panel subdivision"],
    treatiseLineage: ["Guarino Guarini", "Gaspard Monge"],
  },
  "Catalan Vault": {
    plateRange: "Use Tav. 14-26 as 2D deformation baseline",
    category: "2D-first surface mapping",
    geometryTypes: ["shallow shell", "running-bond layers", "plane-to-curved tile map"],
    operations: ["running bond", "layer offsets", "surface remapping", "thin-tile fabrication checks"],
    treatiseLineage: ["Gaspard Monge", "Charles-Felix-Augustin Leroy"],
  },
  "Guastavino Vault": {
    plateRange: "Use Tav. 14-26 as 2D deformation baseline",
    category: "2D-first surface mapping",
    geometryTypes: ["thin-tile timbrel shell", "multi-layer running bond", "shallow compression surface"],
    operations: ["tile layer sequencing", "staggered bonds", "surface remapping", "weight/thickness checks"],
    treatiseLineage: ["Gaspard Monge", "Charles-Felix-Augustin Leroy"],
  },
  "Custom Imported Rhino Surface": {
    plateRange: "Tav. 345-347 plus selected source family",
    category: "Stereotomia e modellazione parametrica",
    geometryTypes: ["imported surface", "boolean intersections", "cylinder/cylinder", "cone/sphere"],
    operations: ["CSG robustness", "intersection curve extraction", "UV registration", "imported 2D layout projection"],
    treatiseLineage: ["Gaspard Monge", "Charles-Felix-Augustin Leroy", "Louis Monduit / Alexandre Denis"],
  },
};

const renderValidationChecklist = (item) => {
  if (!item) return "";
  const list = (values) => values.map((v) => `<li>${v}</li>`).join("");
  return `
    <div class="validation-card">
      <div><b>${fallacaraSources.plates}:</b> ${item.plateRange}</div>
      <div><b>Category:</b> ${item.category}</div>
      <div><b>Geometry:</b></div>
      <ul>${list(item.geometryTypes)}</ul>
      <div><b>Tool checks:</b></div>
      <ul>${list(item.operations)}</ul>
      <div><b>Historical lineage:</b> ${item.treatiseLineage.join(", ")}</div>
    </div>
  `;
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

const makePreviewTextSprite = (text, color = "#ffe2a0") => {
  const sprite = makeTextSprite(text, color);
  if (!sprite) return null;
  sprite.scale.set(0.78, 0.2, 1);
  sprite.renderOrder = 9000;
  return sprite;
};

const buildOriginAxes3d = () => {
  clearGroup(originAxesGroup);
  const origin = new THREE.Vector3(0, 0, 0);
  const axisLen = 2.8;
  const headLen = 0.28;
  const headWidth = 0.14;
  [
    { label: "X", dir: new THREE.Vector3(1, 0, 0), color: 0xff5a4f, text: "#ff8f8f" },
    { label: "Y", dir: new THREE.Vector3(0, 0, 1), color: 0x4a79ff, text: "#9bb7ff" },
    { label: "Z", dir: new THREE.Vector3(0, 1, 0), color: 0x56e56a, text: "#a7ffad" },
  ].forEach(({ label, dir, color, text }) => {
    const arrow = new THREE.ArrowHelper(dir, origin, axisLen, color, headLen, headWidth);
    arrow.name = `origin-axis-${label.toLowerCase()}`;
    originAxesGroup.add(arrow);
    const sprite = makeTextSprite(label, text);
    if (sprite) {
      sprite.position.copy(dir.clone().multiplyScalar(axisLen + 0.32));
      sprite.scale.set(0.82, 0.22, 1);
      sprite.name = `origin-axis-label-${label.toLowerCase()}`;
      sprite.renderOrder = 9000;
      originAxesGroup.add(sprite);
    }
  });
  const originMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 14, 14),
    new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false })
  );
  originMarker.name = "world-origin-marker";
  originMarker.renderOrder = 9000;
  originAxesGroup.add(originMarker);
  const originLabel = makeTextSprite("Origin", "#ffffff");
  if (originLabel) {
    originLabel.position.set(0.32, 0.24, 0.32);
    originLabel.scale.set(1.25, 0.28, 1);
    originLabel.renderOrder = 9000;
    originAxesGroup.add(originLabel);
  }
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

const getGroinSpringingY = (scale = state.cubeScale) => {
  return getBarrelSpringingY(scale);
};

const getGroinBayMetrics = (scale = state.cubeScale) => ({
  halfX: Math.max(0.001, state.params.span * state.bayRatioX * scale * 0.5),
  halfZ: Math.max(0.001, state.params.length * state.bayRatioY * scale * 0.5),
  springY: getGroinSpringingY(scale),
  rise: state.params.rise * scale,
});

const getGroinSupportMetrics = (scale = state.cubeScale) => {
  const { halfX, halfZ, springY, rise } = getGroinBayMetrics(scale);
  const pierW = clamp(Math.min(halfX, halfZ) * 0.18, 0.85 * scale, 2.2 * scale);
  const capH = Math.max(0.18, pierW * 0.16);
  return {
    halfX,
    halfZ,
    springY,
    rise,
    pierW,
    capH,
    capW: pierW * 1.04,
    pierH: Math.max(0.8, springY - capH),
  };
};

const evalGroinHeights = (u, v, scale = state.cubeScale) => {
  const { halfX, halfZ, springY, rise } = getGroinBayMetrics(scale);
  const x = (u - 0.5) * halfX * 2;
  const z = (v - 0.5) * halfZ * 2;
  const t = clamp(state.params.thickness * scale, 0.18 * scale, Math.max(0.22 * scale, rise * 0.24));
  const evalBarrelHeight = (coord, halfSpan, barrelRise, offset = 0) => {
    const rx = halfSpan + offset;
    const ry = barrelRise + offset;
    const nx = coord / Math.max(0.001, rx);
    return ry * Math.sqrt(Math.max(0, 1 - nx * nx));
  };
  const yx = evalBarrelHeight(x, halfX, rise, 0);
  const yz = evalBarrelHeight(z, halfZ, rise, 0);
  const yxOut = evalBarrelHeight(x, halfX, rise, t);
  const yzOut = evalBarrelHeight(z, halfZ, rise, t);
  const intradosGroin = Math.max(yx, yz);
  const extradosGroin = Math.max(yxOut, yzOut);
  const curveSoftness = clamp(state.groinMorph, 0, 1);
  const arrisProximity = 1 - clamp(Math.abs(yx - yz) / Math.max(0.001, rise * (0.08 + curveSoftness * 0.2)), 0, 1);
  const intradosY = springY + intradosGroin;
  const extradosY = springY + extradosGroin + arrisProximity * curveSoftness * rise * 0.018;
  return { x, z, yx, yz, springY, rise, extradosY, intradosY, arrisProximity, masonryDepth: t };
};

const getGroinSupportAdjustedPoint = (u, v, { scale = state.cubeScale, surface = "intrados" } = {}) => {
  const metrics = getGroinSupportMetrics(scale);
  const sx = u >= 0.5 ? 1 : -1;
  const sz = v >= 0.5 ? 1 : -1;
  let alpha = clamp(Math.abs(u - 0.5) * 2, 0, 1);
  let beta = clamp(Math.abs(v - 0.5) * 2, 0, 1);
  const cornerTrim = metrics.capW * 0.52;
  const transition = Math.max(metrics.capW * 1.2, 0.001);
  const distanceToBearing = () => (1 - alpha) * metrics.halfX + (1 - beta) * metrics.halfZ - cornerTrim;
  let d = distanceToBearing();
  if (d < 0) {
    const deficit = -d;
    const wx = metrics.halfZ / Math.max(0.001, metrics.halfX + metrics.halfZ);
    const wz = metrics.halfX / Math.max(0.001, metrics.halfX + metrics.halfZ);
    alpha = clamp(alpha - (deficit * wx) / Math.max(0.001, metrics.halfX), 0, 1);
    beta = clamp(beta - (deficit * wz) / Math.max(0.001, metrics.halfZ), 0, 1);
    d = 0;
  }
  const uu = 0.5 + sx * alpha * 0.5;
  const vv = 0.5 + sz * beta * 0.5;
  const h = evalGroinHeights(uu, vv, scale);
  const resolvedY = surface === "extrados" ? h.extradosY : h.intradosY;
  const supportBlend = smoothstep(0, transition, Math.max(0, d));
  return new THREE.Vector3(h.x, THREE.MathUtils.lerp(metrics.springY, resolvedY, supportBlend), h.z);
};

const vaultEvaluators = {
  "Barrel Vault": barrelVaultPoint,
  "Tapered Barrel Vault": taperedBarrelVaultPoint,
  "Groin Vault": (u, v) => {
    return getGroinSupportAdjustedPoint(u, v, { surface: "intrados" });
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
    child.traverse?.((obj) => {
      if (obj.geometry) {
        obj.geometry.disposeBoundsTree?.();
        obj.geometry.dispose();
      }
      if (Array.isArray(obj.material)) obj.material.forEach((mat) => mat.dispose?.());
      else if (obj.material) obj.material.dispose();
    });
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
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const polys = [];
  const readNumber = (idx) => Number(lines[idx] || 0);
  const pushIfUseful = (pts) => {
    const clean = pts.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
    if (clean.length >= 4) polys.push(clean);
  };
  const sampleArc = (cx, cy, r, startDeg, endDeg) => {
    if (![cx, cy, r, startDeg, endDeg].every(Number.isFinite) || r <= 0) return [];
    let a0 = THREE.MathUtils.degToRad(startDeg);
    let a1 = THREE.MathUtils.degToRad(endDeg);
    while (a1 < a0) a1 += Math.PI * 2;
    const steps = clamp(Math.ceil(Math.abs(a1 - a0) / (Math.PI / 18)), 8, 48);
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = THREE.MathUtils.lerp(a0, a1, i / steps);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts;
  };
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i] !== "0") continue;
    const type = lines[i + 1];
    if (type === "LWPOLYLINE") {
      const pts = [];
      i += 2;
      while (i < lines.length - 1 && lines[i] !== "0") {
        const code = lines[i];
        const val = lines[i + 1];
        if (code === "10") {
          const x = Number(val);
          const yIdx = i + 2;
          if (lines[yIdx] === "20") {
            const y = Number(lines[yIdx + 1]);
            pts.push([x, y]);
          }
        }
        i += 2;
      }
      pushIfUseful(pts);
      i -= 1;
    } else if (type === "POLYLINE") {
      const pts = [];
      i += 2;
      while (i < lines.length - 1) {
        if (lines[i] === "0" && lines[i + 1] === "VERTEX") {
          let x = NaN;
          let y = NaN;
          i += 2;
          while (i < lines.length - 1 && lines[i] !== "0") {
            if (lines[i] === "10") x = readNumber(i + 1);
            if (lines[i] === "20") y = readNumber(i + 1);
            i += 2;
          }
          if (Number.isFinite(x) && Number.isFinite(y)) pts.push([x, y]);
        } else if (lines[i] === "0" && lines[i + 1] === "SEQEND") {
          break;
        } else if (lines[i] === "0") {
          i -= 1;
          break;
        } else {
          i += 2;
        }
      }
      pushIfUseful(pts);
    } else if (type === "SPLINE") {
      const pts = [];
      i += 2;
      while (i < lines.length - 1 && lines[i] !== "0") {
        if (lines[i] === "10") {
          const x = readNumber(i + 1);
          let y = NaN;
          for (let j = i + 2; j < Math.min(lines.length - 1, i + 14); j += 2) {
            if (lines[j] === "20") {
              y = readNumber(j + 1);
              break;
            }
          }
          if (Number.isFinite(x) && Number.isFinite(y)) pts.push([x, y]);
        }
        i += 2;
      }
      pushIfUseful(pts);
      i -= 1;
    } else if (type === "ARC" || type === "CIRCLE") {
      let cx = NaN;
      let cy = NaN;
      let r = NaN;
      let start = 0;
      let end = 360;
      i += 2;
      while (i < lines.length - 1 && lines[i] !== "0") {
        if (lines[i] === "10") cx = readNumber(i + 1);
        if (lines[i] === "20") cy = readNumber(i + 1);
        if (lines[i] === "40") r = readNumber(i + 1);
        if (lines[i] === "50") start = readNumber(i + 1);
        if (lines[i] === "51") end = readNumber(i + 1);
        i += 2;
      }
      pushIfUseful(sampleArc(cx, cy, r, start, end));
      i -= 1;
    } else if (type === "LINE") {
      const pts = [];
      let x0 = NaN;
      let y0 = NaN;
      let x1 = NaN;
      let y1 = NaN;
      i += 2;
      while (i < lines.length - 1 && lines[i] !== "0") {
        if (lines[i] === "10") x0 = readNumber(i + 1);
        if (lines[i] === "20") y0 = readNumber(i + 1);
        if (lines[i] === "11") x1 = readNumber(i + 1);
        if (lines[i] === "21") y1 = readNumber(i + 1);
        i += 2;
      }
      if (Number.isFinite(x0) && Number.isFinite(y0) && Number.isFinite(x1) && Number.isFinite(y1)) pts.push([x0, y0], [x1, y1]);
      pushIfUseful(pts);
      i -= 1;
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
    const hit = getImportedSurfaceHit(u, v);
    if (hit) return hit.point.clone();
    const bbox = state.importedSurfaceBbox;
    if (!bbox) return barrelVaultPoint(u, v);
    const x = THREE.MathUtils.lerp(bbox.min.x, bbox.max.x, u);
    const z = THREE.MathUtils.lerp(bbox.min.z, bbox.max.z, v);
    return new THREE.Vector3(x, bbox.max.y, z);
  }
  return (vaultEvaluators[state.vaultType] || barrelVaultPoint)(u, v);
};

const rhinoPointToVector3 = (point) => {
  if (!point) return null;
  if (Array.isArray(point)) return new THREE.Vector3(point[0] || 0, point[1] || 0, point[2] || 0);
  return new THREE.Vector3(point.x || point[0] || 0, point.y || point[1] || 0, point.z || point[2] || 0);
};

const rhinoDomain = (surface, dir) => {
  try {
    const d = surface?.domain?.(dir);
    if (Array.isArray(d)) return [Number(d[0]), Number(d[1])];
    if (d && Number.isFinite(d.t0) && Number.isFinite(d.t1)) return [d.t0, d.t1];
  } catch {}
  return [0, 1];
};

const getImportedRhinoFaceAtUv = (u, v) => {
  const faces = state.importedRhinoBrepFaces || [];
  if (!faces.length) return null;
  const cu = clamp(u, 0, 1);
  const face = faces.find((item) => (
    cu >= item.patch.domain.u0 - 1e-7 &&
    cu <= item.patch.domain.u1 + 1e-7 &&
    v >= item.patch.domain.v0 - 1e-7 &&
    v <= item.patch.domain.v1 + 1e-7
  )) || faces[Math.min(faces.length - 1, Math.floor(cu * faces.length))];
  if (!face?.surface) return null;
  const { domain, rhinoDomain: rd } = face.patch;
  const localU = clamp((cu - domain.u0) / Math.max(1e-9, domain.u1 - domain.u0), 0, 1);
  const localV = clamp((clamp(v, 0, 1) - domain.v0) / Math.max(1e-9, domain.v1 - domain.v0), 0, 1);
  return {
    face,
    u: THREE.MathUtils.lerp(rd.u0, rd.u1, localU),
    v: THREE.MathUtils.lerp(rd.v0, rd.v1, localV),
  };
};

const getImportedRhinoSurfaceSample = (u, v) => {
  const ref = getImportedRhinoFaceAtUv(u, v);
  if (!ref) return null;
  let point;
  let normal;
  try {
    point = rhinoPointToVector3(ref.face.surface.pointAt(ref.u, ref.v));
    normal = rhinoPointToVector3(ref.face.surface.normalAt(ref.u, ref.v));
  } catch (err) {
    console.warn("Rhino surface sample failed", err);
    return null;
  }
  if (!point || !normal) return null;
  state.importedSurface?.updateMatrixWorld(true);
  point.applyMatrix4(state.importedSurface?.matrixWorld || new THREE.Matrix4());
  normal.transformDirection(state.importedSurface?.matrixWorld || new THREE.Matrix4()).normalize();
  if (ref.face.reversed) normal.multiplyScalar(-1);
  if (normal.y < 0) normal.multiplyScalar(-1);
  if (normal.lengthSq() < 1e-8) normal.set(0, 1, 0);
  return { point, normal, source: "rhino-brep" };
};

const getImportedSurfaceHit = (u, v) => {
  const bbox = state.importedSurfaceBbox;
  if (!state.importedSurface || !bbox || bbox.isEmpty()) return null;
  const size = bbox.getSize(new THREE.Vector3());
  const x = THREE.MathUtils.lerp(bbox.min.x, bbox.max.x, clamp(u, 0, 1));
  const z = THREE.MathUtils.lerp(bbox.min.z, bbox.max.z, clamp(v, 0, 1));
  const origin = new THREE.Vector3(x, bbox.max.y + Math.max(5, size.y * 0.25), z);
  raycaster.set(origin, new THREE.Vector3(0, -1, 0));
  return raycaster.intersectObject(state.importedSurface, true)[0] || null;
};

const getImportedSurfaceSample = (u, v) => {
  const rhinoSample = getImportedRhinoSurfaceSample(u, v);
  if (rhinoSample) return rhinoSample;
  const hit = getImportedSurfaceHit(u, v);
  if (!hit) return null;
  const normal = hit.face?.normal
    ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
    : new THREE.Vector3(0, 1, 0);
  if (normal.y < 0) normal.multiplyScalar(-1);
  if (normal.lengthSq() < 1e-8) normal.set(0, 1, 0);
  return { point: hit.point.clone(), normal };
};

const getImportedSurfaceSampleNear = (u, v, centerU = 0.5, centerV = 0.5) => {
  const direct = getImportedSurfaceSample(u, v);
  if (direct) return direct;
  if (!getImportedSurfaceSample(centerU, centerV)) return null;
  let lo = 0;
  let hi = 1;
  let best = null;
  for (let i = 0; i < 8; i++) {
    const t = (lo + hi) * 0.5;
    const sample = getImportedSurfaceSample(
      THREE.MathUtils.lerp(centerU, u, t),
      THREE.MathUtils.lerp(centerV, v, t)
    );
    if (sample) {
      best = sample;
      lo = t;
    } else {
      hi = t;
    }
  }
  return best;
};

const estimateBarrelArchLength = (samples = 160) => {
  let length = 0;
  let prev = getVaultPoint(0, 0.5);
  for (let i = 1; i <= samples; i++) {
    const p = getVaultPoint(i / samples, 0.5);
    length += p.distanceTo(prev);
    prev = p;
  }
  return length;
};

const buildBarrelArchUBreaks = (courseCount) => {
  const samples = 240;
  const points = [];
  const cumulative = [0];
  let total = 0;
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const p = getVaultPoint(u, 0.5);
    points.push({ u, p });
    if (i > 0) {
      total += p.distanceTo(points[i - 1].p);
      cumulative.push(total);
    }
  }
  const breaks = [];
  for (let c = 0; c <= courseCount; c++) {
    const target = (total * c) / courseCount;
    let i = 1;
    while (i < cumulative.length && cumulative[i] < target) i += 1;
    const prevLen = cumulative[i - 1] ?? 0;
    const nextLen = cumulative[i] ?? total;
    const t = clamp((target - prevLen) / Math.max(1e-9, nextLen - prevLen), 0, 1);
    const u = THREE.MathUtils.lerp(points[Math.max(0, i - 1)].u, points[Math.min(points.length - 1, i)].u, t);
    breaks.push(clamp(u, 0, 1));
  }
  return breaks;
};

const sampleBarrelArchLengthMap = (samples = 320) => {
  const points = [];
  const cumulative = [0];
  let total = 0;
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const p = getVaultPoint(u, 0.5);
    points.push({ u, p });
    if (i > 0) {
      total += p.distanceTo(points[i - 1].p);
      cumulative.push(total);
    }
  }
  const uAtLength = (target) => {
    let i = 1;
    const bounded = clamp(target, 0, total);
    while (i < cumulative.length && cumulative[i] < bounded) i += 1;
    const prevLen = cumulative[i - 1] ?? 0;
    const nextLen = cumulative[i] ?? total;
    const t = clamp((bounded - prevLen) / Math.max(1e-9, nextLen - prevLen), 0, 1);
    return clamp(THREE.MathUtils.lerp(points[Math.max(0, i - 1)].u, points[Math.min(points.length - 1, i)].u, t), 0, 1);
  };
  return { total, uAtLength };
};

const buildStoneKeystoneArchUBreaks = (courseCount) => {
  const samples = 320;
  const points = [];
  const cumulative = [0];
  let total = 0;
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const p = getVaultPoint(u, 0.5);
    points.push({ u, p });
    if (i > 0) {
      total += p.distanceTo(points[i - 1].p);
      cumulative.push(total);
    }
  }
  const uAtLength = (target) => {
    let i = 1;
    while (i < cumulative.length && cumulative[i] < target) i += 1;
    const prevLen = cumulative[i - 1] ?? 0;
    const nextLen = cumulative[i] ?? total;
    const t = clamp((target - prevLen) / Math.max(1e-9, nextLen - prevLen), 0, 1);
    return clamp(THREE.MathUtils.lerp(points[Math.max(0, i - 1)].u, points[Math.min(points.length - 1, i)].u, t), 0, 1);
  };
  const sideCourses = Math.max(1, Math.floor((courseCount - 1) / 2));
  const baseCourseLen = total / courseCount;
  const keyFactor = THREE.MathUtils.lerp(1.25, 2.35, clamp(state.params.keystoneSize || 0.45, 0, 1));
  const keystoneLen = clamp(baseCourseLen * keyFactor, baseCourseLen * 1.05, total * 0.18);
  const sideLen = Math.max(baseCourseLen, (total - keystoneLen) * 0.5);
  const sideStep = sideLen / sideCourses;
  const targets = [0];
  for (let i = 1; i <= sideCourses; i++) targets.push(i * sideStep);
  targets.push(total - sideLen);
  for (let i = 1; i <= sideCourses; i++) targets.push(total - sideLen + i * sideStep);
  targets[0] = 0;
  targets[targets.length - 1] = total;
  return targets.map(uAtLength);
};

const buildAppliedBarrelArchUBreaks = (courseHeight, stoneKeystoneMode) => {
  const { total, uAtLength } = sampleBarrelArchLengthMap();
  const step = clamp(courseHeight || 0.65, 0.1, Math.max(0.1, total));
  const pushTarget = (targets, value) => {
    const bounded = clamp(value, 0, total);
    const last = targets[targets.length - 1];
    if (last === undefined || Math.abs(bounded - last) > 1e-5) targets.push(bounded);
  };
  const targets = [0];
  if (stoneKeystoneMode) {
    const keyFactor = THREE.MathUtils.lerp(1.25, 2.35, clamp(state.params.keystoneSize || 0.45, 0, 1));
    const keystoneLen = clamp(step * keyFactor, step * 1.05, total * 0.22);
    const leftKey = Math.max(step, total * 0.5 - keystoneLen * 0.5);
    const rightKey = Math.min(total - step, total * 0.5 + keystoneLen * 0.5);
    for (let s = step; s < leftKey - step * 0.35; s += step) pushTarget(targets, s);
    pushTarget(targets, leftKey);
    pushTarget(targets, rightKey);
    for (let s = rightKey + step; s < total - step * 0.35; s += step) pushTarget(targets, s);
  } else {
    for (let s = step; s < total - step * 0.35; s += step) pushTarget(targets, s);
  }
  pushTarget(targets, total);
  if (targets.length < 5) return buildBarrelArchUBreaks(4);
  return targets.map(uAtLength);
};

const getBarrelLengthCourseSpans = (courseIndex, lengthCount, courseCount = Math.max(1, state.params.courseCount || 1)) => {
  const shifted = (state.pattern === "Running bond" || state.barrelBondMode === "2") && courseIndex % 2 === 1;
  const bayStart = shifted ? -1 : 0;
  const bayEnd = shifted ? lengthCount : lengthCount - 1;
  const spans = [];
  for (let bay = bayStart; bay <= bayEnd; bay++) {
    let v0 = shifted ? (bay + 0.5) / lengthCount : bay / lengthCount;
    let v1 = shifted ? (bay + 1.5) / lengthCount : (bay + 1) / lengthCount;
    if (state.pattern === "Diagonal joints") {
      const sk = (courseIndex / Math.max(1, courseCount - 1) - 0.5) * (0.55 / lengthCount);
      v0 += sk;
      v1 += sk;
    }
    if (v0 < 0) { v1 -= v0; v0 = 0; }
    if (v1 > 1) { v0 -= (v1 - 1); v1 = 1; }
    if (v1 - v0 < 1e-5) continue;
    spans.push({ bay, v0, v1 });
  }
  return spans;
};

const getBarrelAppliedLengthSpans = (courseIndex, targetWidth, courseCount = Math.max(1, state.params.courseCount || 1)) => {
  const length = Math.max(0.1, state.params.length || 1);
  const width = clamp(targetWidth || 1.2, 0.1, length);
  const count = Math.max(1, Math.min(240, Math.ceil(length / width)));
  const shifted = (state.pattern === "Running bond" || state.barrelBondMode === "2") && courseIndex % 2 === 1;
  const spans = [];
  for (let i = 0; i < count; i++) {
    let start = i * width;
    let end = Math.min(length, start + width);
    if (shifted) {
      start -= width * 0.5;
      end -= width * 0.5;
    }
    if (state.pattern === "Diagonal joints") {
      const sk = (courseIndex / Math.max(1, courseCount - 1) - 0.5) * width * 0.55;
      start += sk;
      end += sk;
    }
    start = clamp(start, 0, length);
    end = clamp(end, 0, length);
    if (end - start < 1e-5) continue;
    spans.push({ bay: i, v0: start / length, v1: end / length });
  }
  if (shifted) {
    const tailStart = Math.max(0, length - width * 0.5);
    if (length - tailStart > 1e-5) spans.push({ bay: count, v0: tailStart / length, v1: 1 });
  }
  return spans;
};

const generateBarrelLikeBlocksFromTrait = () => {
  const density = Math.max(0.25, state.params.subdivisionDensity || 1);
  const archLength = estimateBarrelArchLength();
  const courseHeight = clamp(state.constraints.courseHeight || 0.65, 0.1, 5);
  const targetWidth = clamp(state.targetBlockWidth || 1.2, 0.1, 5);
  const stoneKeystoneMode = state.barrelBondMode === "5";
  const appliedDimensions = state.blockDimensionMode !== "fit";
  let courseCount = Math.max(4, Math.min(120, Math.round((archLength / courseHeight) * density * Math.max(1, state.arrayU))));
  let uBreaks;
  if (appliedDimensions) {
    uBreaks = buildAppliedBarrelArchUBreaks(courseHeight, stoneKeystoneMode);
    courseCount = uBreaks.length - 1;
  } else {
    if (stoneKeystoneMode && courseCount % 2 === 0) courseCount += courseCount < 120 ? 1 : -1;
    uBreaks = stoneKeystoneMode ? buildStoneKeystoneArchUBreaks(courseCount) : buildBarrelArchUBreaks(courseCount);
  }
  const lengthCount = appliedDimensions
    ? Math.max(1, Math.min(240, Math.ceil((state.params.length || 1) / targetWidth)))
    : Math.max(2, Math.min(160, Math.round((state.params.length / targetWidth) * density * Math.max(1, state.arrayV))));
  const keystoneCourse = stoneKeystoneMode ? Math.floor(courseCount / 2) : -1;
  const blocks = [];
  const physicalJoint = state.jointMode === "Physical cut";
  const localGap = physicalJoint ? state.constraints.jointGap : 0;
  for (let course = 0; course < courseCount; course++) {
    let u0 = uBreaks[course];
    let u1 = uBreaks[course + 1];
    const isKeystoneCourse = course === keystoneCourse;
    if (state.pattern === "Radial joints" && !stoneKeystoneMode && !isKeystoneCourse) {
      const mid = (u0 + u1) * 0.5;
      const crownBias = 1 - Math.abs(mid - 0.5) * 2;
      const tighten = 1 - clamp(crownBias, 0, 1) * clamp(state.params.keystoneSize || 0.35, 0, 1) * 0.06;
      const w = (u1 - u0) * tighten;
      u0 = mid - w * 0.5;
      u1 = mid + w * 0.5;
    }
    const lengthSpans = appliedDimensions
      ? getBarrelAppliedLengthSpans(course, targetWidth, courseCount)
      : getBarrelLengthCourseSpans(course, lengthCount, courseCount);
    for (const { v0, v1 } of lengthSpans) {
      let uv = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
      if (physicalJoint && localGap > 0) {
        uv = insetQuadMiterUv(uv, localGap);
        if (course === 0) {
          uv[0][0] = u0;
          uv[3][0] = u0;
        }
        if (course === courseCount - 1) {
          uv[1][0] = u1;
          uv[2][0] = u1;
        }
      }
      blocks.push({
        id: `${isKeystoneCourse ? "K" : "B"}-${course + 1}-${blocks.length + 1}`,
        uv: uv.map(applyAlign),
        isKeystone: isKeystoneCourse,
        courseIndex: course,
        courseCount,
      });
    }
  }
  state.params.courseCount = courseCount;
  state.params.blockCount = lengthCount;
  return blocks;
};

const clipUvCellToUnit = (uv) => {
  const clipEdge = (points, inside, intersect) => {
    const out = [];
    points.forEach((current, i) => {
      const prev = points[(i + points.length - 1) % points.length];
      const currentInside = inside(current);
      const prevInside = inside(prev);
      if (currentInside) {
        if (!prevInside) out.push(intersect(prev, current));
        out.push(current);
      } else if (prevInside) {
        out.push(intersect(prev, current));
      }
    });
    return out;
  };
  const ix = (x) => (a, b) => {
    const t = clamp((x - a[0]) / Math.max(1e-9, b[0] - a[0]), 0, 1);
    return [x, THREE.MathUtils.lerp(a[1], b[1], t)];
  };
  const iy = (y) => (a, b) => {
    const t = clamp((y - a[1]) / Math.max(1e-9, b[1] - a[1]), 0, 1);
    return [THREE.MathUtils.lerp(a[0], b[0], t), y];
  };
  let out = uv;
  out = clipEdge(out, ([u]) => u >= 0, ix(0));
  out = clipEdge(out, ([u]) => u <= 1, ix(1));
  out = clipEdge(out, ([, v]) => v >= 0, iy(0));
  out = clipEdge(out, ([, v]) => v <= 1, iy(1));
  return out;
};

const buildTopologyGuidedBreaks = (count, hints, minGap = 0.012) => {
  const base = Array.from({ length: count + 1 }, (_, i) => i / count);
  const merged = mergeTopologyBreakHints(base, hints, minGap);
  if (merged.length < 3) return base;
  const limit = Math.max(count + 1, Math.min(count * 2 + 1, 180));
  if (merged.length <= limit) return merged;
  const stride = (merged.length - 1) / (limit - 1);
  return Array.from({ length: limit }, (_, i) => merged[Math.round(i * stride)]);
};

const buildProjectedHexCellFactory = (rows, cols) => {
  const slider = clamp(state.ngonShape ?? 0.25, 0, 1);
  const t = clamp(slider <= 0.5 ? THREE.MathUtils.lerp(0.25, 0.5, slider / 0.5) : 0.5, 0.01, 0.5);
  const rowCount = Math.max(1, rows);
  const colCount = Math.max(1, cols);
  const cellW = 1 / colCount;
  const cellH = 1 / rowCount;
  const pt = (i, j) => [i * cellW, j * cellH];
  const collapseCoincident = (poly) => {
    const out = [];
    poly.forEach((p) => {
      const last = out[out.length - 1];
      if (!last || Math.hypot(last[0] - p[0], last[1] - p[1]) > 1e-8) out.push(p);
    });
    if (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= 1e-8) out.pop();
    return out;
  };
  const meshCreateHexCell = (i, j) => {
    const item = i > 0 ? pt(i - 1, j + t > rowCount ? j : j + t) : pt(i, j);
    const item2 = i > 0 ? pt(i - 1, j - t < 0 ? j : j - t) : pt(i, j);
    const item4 = j > 0 ? pt(i, j - (1 - t) < 0 ? j - 1 : j - (1 - t)) : pt(i, j);
    const item5 = i < colCount ? pt(i + 1, j + t > rowCount ? j : j + t) : pt(i, j);
    const item6 = i < colCount ? pt(i + 1, j - t < 0 ? j : j - t) : pt(i, j);
    const item7 = j <= rowCount - 1 ? pt(i, j + (1 - t)) : pt(i, j);
    if (i > 0 && j > 0 && i < colCount && j <= rowCount - 1) {
      return collapseCoincident([item, item2, item4, item6, item5, item7]);
    }
    if (i === 0 && j === 0) return collapseCoincident([item7, item, item6, item5]);
    if (i === 0 && j === rowCount && rowCount % 2 === 0) return collapseCoincident([item, item4, item6, item5]);
    if (i === colCount && j === 0 && colCount % 2 === 0) return collapseCoincident([item, item2, item6, item7]);
    if (i === colCount && j === rowCount) return collapseCoincident([item, item2, item4, item7]);
    if (i === 0 && j > 0 && j < rowCount) return collapseCoincident([item7, item4, item6, item5]);
    if (i === colCount && j > 0 && j < rowCount) return collapseCoincident([item, item2, item4, item7]);
    if (j === 0 && i > 0 && i < colCount) return collapseCoincident([item5, item7, item, item2, item6]);
    if (j === rowCount && i > 0 && i < colCount) return collapseCoincident([item2, item4, item6, item5, item]);
    return [];
  };
  return (c, r) => {
    const i = c + 1;
    const j = r + 1;
    if (i < 0 || j < 0 || i > colCount || j > rowCount || (i + j) % 2 !== 0) return [];
    return clipUvCellToUnit(meshCreateHexCell(i, j));
  };
};

const buildNgonGithubHexUvLoops = (rows, cols) => {
  const rowCount = Math.max(2, rows + (rows % 2));
  const colCount = Math.max(2, cols + (cols % 2));
  const makeCell = buildProjectedHexCellFactory(rowCount, colCount);
  const loops = [];
  for (let i = 0; i <= colCount; i++) {
    for (let j = 0; j <= rowCount; j++) {
      if ((i + j) % 2 !== 0) continue;
      const loop = cellHasUsableArea(makeCell(i - 1, j - 1), 0.000001);
      if (!loop) continue;
      loops.push(loop);
    }
  }
  return loops;
};

const buildProjectedNgonCellFactory = (rows, cols, uLines = null, vLines = null) => {
  const shape = clamp(state.ngonShape ?? 0.5, 0, 1);
  const morph = shape - 0.5;
  const isDiamond = state.ngonCellType === "Diamond";
  const uBreaks = uLines?.length >= 2 ? uLines : Array.from({ length: cols + 1 }, (_, i) => i / cols);
  const vBreaks = vLines?.length >= 2 ? vLines : Array.from({ length: rows + 1 }, (_, i) => i / rows);
  const colCount = uBreaks.length - 1;
  const rowCount = vBreaks.length - 1;
  const colStep = 1 / Math.max(1, colCount);
  const rowStep = 1 / Math.max(1, rowCount);
  const rowSkewAmp = (isDiamond ? 0.42 : 0.28) * colStep * morph;
  const longEdgeAmp = isDiamond ? 0 : 0.42 * rowStep * morph;
  const rowPoint = (c, r) => {
    const rowShift = (r % 2 ? 1 : -1) * rowSkewAmp;
    return [uBreaks[clamp(c, 0, colCount)] + rowShift, vBreaks[clamp(r, 0, rowCount)]];
  };
  const longEdgeMid = (c, r) => {
    const a = rowPoint(c, r);
    const b = rowPoint(c + 1, r);
    const sign = (c + r) % 2 ? -1 : 1;
    return [
      (a[0] + b[0]) * 0.5,
      (a[1] + b[1]) * 0.5 + sign * longEdgeAmp,
    ];
  };
  return (c, r) => {
    if (isDiamond) {
      const a = rowPoint(c, r);
      const b = rowPoint(c + 1, r);
      const d = rowPoint(c, r + 1);
      const e = rowPoint(c + 1, r + 1);
      return clipUvCellToUnit([
        [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5],
        [(b[0] + e[0]) * 0.5, (b[1] + e[1]) * 0.5],
        [(d[0] + e[0]) * 0.5, (d[1] + e[1]) * 0.5],
        [(a[0] + d[0]) * 0.5, (a[1] + d[1]) * 0.5],
      ]);
    }
    const p00 = rowPoint(c, r);
    const p10 = rowPoint(c + 1, r);
    const p11 = rowPoint(c + 1, r + 1);
    const p01 = rowPoint(c, r + 1);
    if (Math.abs(morph) < 1e-6) return clipUvCellToUnit([p00, p10, p11, p01]);
    return clipUvCellToUnit([
      p00,
      longEdgeMid(c, r),
      p10,
      p11,
      longEdgeMid(c, r + 1),
      p01,
    ]);
  };
};

const cellHasUsableArea = (uv, minArea = 0.00002) => {
  const unique = [];
  uv.forEach((p) => {
    if (!unique.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-5)) unique.push(p);
  });
  return unique.length >= 3 && Math.abs(signedUvArea(unique)) >= minArea ? unique : null;
};

const cleanPairedUvPoints = (uv, points, minArea = 0.000001) => {
  if (!uv?.length || !points?.length || uv.length !== points.length) return null;
  const pairs = [];
  uv.forEach((coord, index) => {
    if (!pairs.some((pair) => Math.hypot(pair.uv[0] - coord[0], pair.uv[1] - coord[1]) < 1e-5)) {
      pairs.push({ uv: [coord[0], coord[1]], point: points[index].clone() });
    }
  });
  if (pairs.length < 3 || Math.abs(signedUvArea(pairs.map((pair) => pair.uv))) < minArea) return null;
  if (pairs.length === 4) {
    const ordered = [null, null, null, null];
    pairs.forEach((pair) => {
      const [u, v] = pair.uv;
      const sum = u + v;
      const diff = u - v;
      if (!ordered[0] || sum < ordered[0].sum) ordered[0] = { ...pair, sum, diff };
      if (!ordered[2] || sum > ordered[2].sum) ordered[2] = { ...pair, sum, diff };
      if (!ordered[1] || diff > ordered[1].diff) ordered[1] = { ...pair, sum, diff };
      if (!ordered[3] || diff < ordered[3].diff) ordered[3] = { ...pair, sum, diff };
    });
    const uniqueOrdered = new Set(ordered.map((pair) => `${pair.uv[0].toFixed(6)},${pair.uv[1].toFixed(6)}`));
    if (uniqueOrdered.size === 4) {
      return {
        uv: ordered.map((pair) => pair.uv),
        points: ordered.map((pair) => pair.point),
      };
    }
  }
  if (signedUvArea(pairs.map((pair) => pair.uv)) < 0) pairs.reverse();
  return {
    uv: pairs.map((pair) => pair.uv),
    points: pairs.map((pair) => pair.point),
  };
};

const polygonBoundsUv = (uv) => {
  const us = uv.map(([u]) => u);
  const vs = uv.map(([, v]) => v);
  return {
    minU: Math.min(...us),
    maxU: Math.max(...us),
    minV: Math.min(...vs),
    maxV: Math.max(...vs),
  };
};

const cleanUvPolygon = (uv, epsilon = 1e-6) => {
  if (!uv?.length) return null;
  const out = [];
  uv.forEach((p) => {
    if (!out.length || Math.hypot(out[out.length - 1][0] - p[0], out[out.length - 1][1] - p[1]) > epsilon) {
      out.push([p[0], p[1]]);
    }
  });
  if (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= epsilon) out.pop();
  return cellHasUsableArea(out, 0.000001);
};

const trimUvPolygonToSurfaceFootprint = (uv, anchorUv, hasSurface) => {
  if (!uv?.length || !anchorUv || !hasSurface?.(anchorUv[0], anchorUv[1])) return null;
  const pullToSurface = ([u, v]) => {
    const target = [clamp(u, 0, 1), clamp(v, 0, 1)];
    if (hasSurface(target[0], target[1])) return target;
    let lo = 0;
    let hi = 1;
    let best = null;
    for (let i = 0; i < 14; i++) {
      const t = (lo + hi) * 0.5;
      const p = [
        THREE.MathUtils.lerp(anchorUv[0], target[0], t),
        THREE.MathUtils.lerp(anchorUv[1], target[1], t),
      ];
      if (hasSurface(p[0], p[1])) {
        best = p;
        lo = t;
      } else {
        hi = t;
      }
    }
    if (!best) return null;
    return [
      THREE.MathUtils.lerp(anchorUv[0], best[0], 0.997),
      THREE.MathUtils.lerp(anchorUv[1], best[1], 0.997),
    ];
  };
  const trimmed = uv.map(pullToSurface);
  if (trimmed.some((p) => !p)) return null;
  const cleaned = cleanUvPolygon(trimmed, 0.00001);
  if (!cleaned) return null;
  const edgeMids = cleaned.map((p, i) => [
    (p[0] + cleaned[(i + 1) % cleaned.length][0]) * 0.5,
    (p[1] + cleaned[(i + 1) % cleaned.length][1]) * 0.5,
  ]);
  const radialMids = cleaned.map((p) => [
    (p[0] + anchorUv[0]) * 0.5,
    (p[1] + anchorUv[1]) * 0.5,
  ]);
  const checks = [anchorUv, ...cleaned, ...edgeMids, ...radialMids];
  const hits = checks.filter(([u, v]) => hasSurface(u, v)).length;
  return hits >= Math.ceil(checks.length * 0.86) ? cleaned : null;
};

const clipUvPolygonToConvexPolygon = (subject, clipper) => {
  const cleanClipper = cleanUvPolygon(clipper);
  if (!cleanClipper) return null;
  const clipSign = Math.sign(signedUvArea(cleanClipper)) || 1;
  let output = cleanUvPolygon(subject);
  if (!output) return null;
  const lineIntersection = (a, b, c, d) => {
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const cdx = d[0] - c[0];
    const cdy = d[1] - c[1];
    const denom = abx * cdy - aby * cdx;
    if (Math.abs(denom) < 1e-10) return b;
    const t = ((c[0] - a[0]) * cdy - (c[1] - a[1]) * cdx) / denom;
    return [a[0] + abx * t, a[1] + aby * t];
  };
  for (let i = 0; i < cleanClipper.length; i++) {
    const cp1 = cleanClipper[i];
    const cp2 = cleanClipper[(i + 1) % cleanClipper.length];
    const input = output;
    output = [];
    const inside = (p) => {
      const cross = (cp2[0] - cp1[0]) * (p[1] - cp1[1]) - (cp2[1] - cp1[1]) * (p[0] - cp1[0]);
      return clipSign > 0 ? cross >= -1e-8 : cross <= 1e-8;
    };
    for (let j = 0; j < input.length; j++) {
      const current = input[j];
      const prev = input[(j - 1 + input.length) % input.length];
      const currentInside = inside(current);
      const prevInside = inside(prev);
      if (currentInside) {
        if (!prevInside) output.push(lineIntersection(prev, current, cp1, cp2));
        output.push(current);
      } else if (prevInside) {
        output.push(lineIntersection(prev, current, cp1, cp2));
      }
    }
    output = cleanUvPolygon(output);
    if (!output) return null;
  }
  return cleanUvPolygon(output);
};

const buildImportedCourseIntervals = (u0, u1, sampleCount = 180) => {
  const lanes = [0.2, 0.5, 0.8].map((t) => THREE.MathUtils.lerp(u0, u1, t));
  const validAt = (v) => {
    const hits = lanes.reduce((count, u) => count + (getImportedSurfaceHit(u, v) ? 1 : 0), 0);
    return hits >= 2;
  };
  const refine = (a, b, wantValid) => {
    let lo = a;
    let hi = b;
    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) * 0.5;
      if (validAt(mid) === wantValid) hi = mid;
      else lo = mid;
    }
    return hi;
  };
  const intervals = [];
  let prevV = 0;
  let prevValid = validAt(prevV);
  let start = prevValid ? 0 : null;
  for (let i = 1; i <= sampleCount; i++) {
    const v = i / sampleCount;
    const isValid = validAt(v);
    if (isValid !== prevValid) {
      const boundary = refine(prevV, v, isValid);
      if (isValid) start = boundary;
      else if (start !== null) {
        intervals.push([start, boundary]);
        start = null;
      }
    }
    prevV = v;
    prevValid = isValid;
  }
  if (start !== null) intervals.push([start, 1]);
  return intervals
    .map(([a, b]) => [clamp(a, 0, 1), clamp(b, 0, 1)])
    .filter(([a, b]) => b - a > 0.004);
};

const getImportedUvPointNear = (u, v, centerU = u, centerV = v) => {
  const sample = getImportedSurfaceSampleNear(clamp(u, 0, 1), clamp(v, 0, 1), clamp(centerU, 0, 1), clamp(centerV, 0, 1));
  return sample?.point || null;
};

const averageImportedSegmentDistance = (a, b, lanes) => {
  let total = 0;
  let count = 0;
  lanes.forEach(([au, av, bu, bv]) => {
    const centerU = (au + bu) * 0.5;
    const centerV = (av + bv) * 0.5;
    const pa = getImportedUvPointNear(au, av, centerU, centerV);
    const pb = getImportedUvPointNear(bu, bv, centerU, centerV);
    if (!pa || !pb) return;
    total += pa.distanceTo(pb);
    count += 1;
  });
  if (count) return total / count;
  const fallback = state.importedSurfaceBbox?.getSize(new THREE.Vector3()) || new THREE.Vector3(1, 1, 1);
  return Math.hypot((b[0] - a[0]) * fallback.x, (b[1] - a[1]) * fallback.z);
};

const buildImportedAdaptiveCourseBreaks = (targetCourseHeight) => {
  const sampleCount = 180;
  const target = clamp(targetCourseHeight || state.constraints.courseHeight || 0.65, 0.08, 8);
  const breaks = [0];
  let accumulated = 0;
  let lastU = 0;
  for (let i = 1; i <= sampleCount; i++) {
    const u = i / sampleCount;
    const lanes = [0.18, 0.38, 0.62, 0.82].map((v) => [lastU, v, u, v]);
    accumulated += averageImportedSegmentDistance([lastU, 0.5], [u, 0.5], lanes);
    if (accumulated >= target && u - breaks[breaks.length - 1] > 0.01 && u < 0.985) {
      breaks.push(u);
      accumulated = 0;
    }
    lastU = u;
  }
  if (1 - breaks[breaks.length - 1] < 0.018 && breaks.length > 1) breaks.pop();
  breaks.push(1);
  return mergeTopologyBreakHints(breaks, state.importedTopology?.courseHints, 0.018);
};

const mergeTopologyBreakHints = (breaks, hints, minGap = 0.018) => {
  if (!hints?.length) return breaks;
  const merged = [...breaks, ...hints].sort((a, b) => a - b);
  const out = [];
  merged.forEach((value) => {
    const v = clamp(value, 0, 1);
    if (!out.length || v - out[out.length - 1] >= minGap) out.push(v);
    else if (v === 0 || v === 1 || Math.abs(v - out[out.length - 1]) < minGap * 0.35) out[out.length - 1] = v;
  });
  if (out[0] !== 0) out.unshift(0);
  if (out[out.length - 1] !== 1) out.push(1);
  return out;
};

const insertTopologySpanHints = (breaks, span0, span1, minGap = 0.006) => {
  const hints = state.importedTopology?.spanHints;
  if (!hints?.length) return breaks;
  const local = hints.filter((v) => v > span0 + minGap && v < span1 - minGap);
  if (!local.length) return breaks;
  return mergeTopologyBreakHints(breaks, local, minGap)
    .filter((v) => v >= span0 - 1e-6 && v <= span1 + 1e-6);
};

const buildImportedAdaptiveSpanBreaks = (u0, u1, span0, span1, targetLength, stagger = 0) => {
  const sampleCount = Math.max(40, Math.min(260, Math.ceil((span1 - span0) * 260)));
  const target = clamp(targetLength || state.targetBlockWidth || 1.2, 0.08, 10);
  const breaks = [span0];
  let accumulated = stagger ? target * 0.45 : 0;
  let lastV = span0;
  for (let i = 1; i <= sampleCount; i++) {
    const v = THREE.MathUtils.lerp(span0, span1, i / sampleCount);
    const lanes = [0.2, 0.5, 0.8].map((t) => {
      const u = THREE.MathUtils.lerp(u0, u1, t);
      return [u, lastV, u, v];
    });
    accumulated += averageImportedSegmentDistance([(u0 + u1) * 0.5, lastV], [(u0 + u1) * 0.5, v], lanes);
    if (accumulated >= target && v - breaks[breaks.length - 1] > 0.004 && v < span1 - 0.004) {
      breaks.push(v);
      accumulated = 0;
    }
    lastV = v;
  }
  if (span1 - breaks[breaks.length - 1] < 0.006 && breaks.length > 1) breaks.pop();
  breaks.push(span1);
  return insertTopologySpanHints(breaks, span0, span1);
};

const buildImportedAdaptiveCurvedSpanBreaks = (lowerCurve, upperCurve, span0, span1, targetLength, stagger = 0) => {
  const sampleCount = Math.max(40, Math.min(260, Math.ceil((span1 - span0) * 260)));
  const target = clamp(targetLength || state.targetBlockWidth || 1.2, 0.08, 10);
  const breaks = [span0];
  let accumulated = stagger ? target * 0.45 : 0;
  let lastV = span0;
  for (let i = 1; i <= sampleCount; i++) {
    const v = THREE.MathUtils.lerp(span0, span1, i / sampleCount);
    const lanes = [0.18, 0.5, 0.82].map((t) => {
      const lastU = THREE.MathUtils.lerp(lowerCurve.at(lastV), upperCurve.at(lastV), t);
      const nextU = THREE.MathUtils.lerp(lowerCurve.at(v), upperCurve.at(v), t);
      return [lastU, lastV, nextU, v];
    });
    accumulated += averageImportedSegmentDistance([0, lastV], [0, v], lanes);
    if (accumulated >= target && v - breaks[breaks.length - 1] > 0.004 && v < span1 - 0.004) {
      breaks.push(v);
      accumulated = 0;
    }
    lastV = v;
  }
  if (span1 - breaks[breaks.length - 1] < 0.006 && breaks.length > 1) breaks.pop();
  breaks.push(span1);
  return insertTopologySpanHints(breaks, span0, span1);
};

const makeCurveInterpolator = (points) => {
  if (!points?.length) return () => 0;
  const sorted = [...points].sort((a, b) => a.v - b.v);
  return (v) => {
    const vv = clamp(v, 0, 1);
    if (vv <= sorted[0].v) return sorted[0].u;
    if (vv >= sorted[sorted.length - 1].v) return sorted[sorted.length - 1].u;
    let i = 1;
    while (i < sorted.length && sorted[i].v < vv) i += 1;
    const a = sorted[i - 1];
    const b = sorted[i];
    const t = clamp((vv - a.v) / Math.max(1e-9, b.v - a.v), 0, 1);
    return THREE.MathUtils.lerp(a.u, b.u, t);
  };
};

const smoothCourseCurvePoints = (points, iterations = 2) => {
  let out = points.map((p) => ({ ...p }));
  for (let k = 0; k < iterations; k++) {
    out = out.map((p, i) => {
      if (i === 0 || i === out.length - 1) return p;
      return {
        v: p.v,
        u: p.pinned ? p.u : (out[i - 1].u * 0.25 + p.u * 0.5 + out[i + 1].u * 0.25),
        pinned: p.pinned,
      };
    });
  }
  return out;
};

const buildImportedDirectionalCourseField = (baseBreaks) => {
  const sampleCount = 72;
  const radiusU = 0.055;
  const radiusV = 0.07;
  const strength = 0.036 * clamp(state.params.subdivisionDensity || 1, 0.5, 2.4);
  const curves = baseBreaks.map((baseU, breakIndex) => {
    const pinned = breakIndex === 0 || breakIndex === baseBreaks.length - 1;
    const points = [];
    for (let i = 0; i <= sampleCount; i++) {
      const v = i / sampleCount;
      let offset = 0;
      if (!pinned) {
        for (let du = -2; du <= 2; du++) {
          for (let dv = -2; dv <= 2; dv++) {
            if (!du && !dv) continue;
            const pu = clamp(baseU + du * radiusU * 0.5, 0, 1);
            const pv = clamp(v + dv * radiusV * 0.5, 0, 1);
            if (getImportedSurfaceHit(pu, pv)) continue;
            const dist = Math.hypot((pu - baseU) / radiusU, (pv - v) / radiusV);
            if (dist > 1.5) continue;
            const side = baseU >= pu ? 1 : -1;
            offset += side * (1.5 - dist) * strength;
          }
        }
        if (!getImportedSurfaceHit(baseU + offset, v)) {
          const upValid = getImportedSurfaceHit(clamp(baseU + radiusU, 0, 1), v);
          const downValid = getImportedSurfaceHit(clamp(baseU - radiusU, 0, 1), v);
          if (upValid && !downValid) offset += radiusU * 0.5;
          else if (downValid && !upValid) offset -= radiusU * 0.5;
        }
      }
      const prev = baseBreaks[Math.max(0, breakIndex - 1)];
      const next = baseBreaks[Math.min(baseBreaks.length - 1, breakIndex + 1)];
      const minU = pinned ? baseU : prev + Math.max(0.006, (baseU - prev) * 0.32);
      const maxU = pinned ? baseU : next - Math.max(0.006, (next - baseU) * 0.32);
      points.push({ v, u: clamp(baseU + offset, minU, maxU), pinned });
    }
    return smoothCourseCurvePoints(points, pinned ? 0 : 3);
  });
  return curves.map((points) => ({ points, at: makeCurveInterpolator(points) }));
};

const buildTopologyWarp = (baseBreaks, courseField) => {
  if (!baseBreaks?.length || !courseField?.length || courseField.length !== baseBreaks.length) return null;
  return ([u, v]) => {
    const uu = clamp(u, 0, 1);
    const vv = clamp(v, 0, 1);
    let index = 0;
    while (index < baseBreaks.length - 2 && uu > baseBreaks[index + 1]) index += 1;
    const a = baseBreaks[index];
    const b = baseBreaks[index + 1];
    const t = clamp((uu - a) / Math.max(1e-9, b - a), 0, 1);
    return [
      clamp(THREE.MathUtils.lerp(courseField[index].at(vv), courseField[index + 1].at(vv), t), 0, 1),
      vv,
    ];
  };
};

const buildImportedCurvedCourseIntervals = (lowerCurve, upperCurve, sampleCount = 180) => {
  const validAt = (v) => {
    const u0 = lowerCurve.at(v);
    const u1 = upperCurve.at(v);
    const hits = [0.18, 0.42, 0.68, 0.88].reduce((count, t) => {
      const u = THREE.MathUtils.lerp(u0, u1, t);
      return count + (getImportedSurfaceHit(u, v) ? 1 : 0);
    }, 0);
    return hits >= 3;
  };
  const intervals = [];
  let prevV = 0;
  let prevValid = validAt(prevV);
  let start = prevValid ? 0 : null;
  for (let i = 1; i <= sampleCount; i++) {
    const v = i / sampleCount;
    const isValid = validAt(v);
    if (isValid !== prevValid) {
      const boundary = v;
      if (isValid) start = boundary;
      else if (start !== null) {
        intervals.push([start, boundary]);
        start = null;
      }
    }
    prevV = v;
    prevValid = isValid;
  }
  if (start !== null) intervals.push([start, 1]);
  return intervals.filter(([a, b]) => b - a > 0.004);
};

const generateNgonCellBlocks = () => {
  const bbox = state.importedSurfaceBbox;
  if (!state.importedSurface || !bbox || bbox.isEmpty()) return [];
  const density = Math.max(0.25, state.params.subdivisionDensity || 1);
  const rows = Math.max(3, Math.min(96, Math.round((state.params.courseCount || 12) * density)));
  const cols = Math.max(3, Math.min(180, Math.round((state.params.blockCount || 12) * density)));
  const blocks = [];
  const isHex = state.ngonCellType !== "Diamond";
  const topologyAware = false;
  const rectAspect = clamp((state.targetBlockWidth || 1.2) / Math.max(0.1, state.constraints.courseHeight || 0.65), 1.15, 2.4);
  const hexCols = Math.max(3, Math.round(cols * rectAspect));
  const targetCourseHeight = clamp((state.constraints.courseHeight || 0.65) / density, 0.08, 8);
  const topologyBreaks = topologyAware ? buildImportedAdaptiveCourseBreaks(targetCourseHeight) : null;
  const topologyField = topologyAware ? buildImportedDirectionalCourseField(topologyBreaks) : null;
  const warpUvPoint = buildTopologyWarp(topologyBreaks, topologyField);
  const uLines = isHex || topologyAware ? null : buildTopologyGuidedBreaks(cols, state.importedTopology?.courseHints, 0.012);
  const vLines = isHex || topologyAware ? null : buildTopologyGuidedBreaks(rows, state.importedTopology?.spanHints, 0.012);
  const rowLimit = isHex ? rows : vLines.length - 1;
  const colLimit = isHex ? hexCols + 1 : uLines.length - 1;
  const buildCell = isHex
    ? buildProjectedHexCellFactory(rowLimit, hexCols)
    : buildProjectedNgonCellFactory(rowLimit, colLimit, uLines, vLines);
  const hitCache = new Map();
  const hasSurface = (u, v) => {
    const key = `${u.toFixed(4)},${v.toFixed(4)}`;
    if (!hitCache.has(key)) hitCache.set(key, !!getImportedSurfaceHit(u, v));
    return hitCache.get(key);
  };
  const cellSurfaceSamples = (uv) => {
    const centerU = uv.reduce((sum, p) => sum + p[0], 0) / uv.length;
    const centerV = uv.reduce((sum, p) => sum + p[1], 0) / uv.length;
    const edgeSamples = uv.map((p, i) => [
      (p[0] + uv[(i + 1) % uv.length][0]) * 0.5,
      (p[1] + uv[(i + 1) % uv.length][1]) * 0.5,
    ]);
    const radialSamples = uv.map((p) => [
      (p[0] + centerU) * 0.5,
      (p[1] + centerV) * 0.5,
    ]);
    const samples = [[centerU, centerV], ...uv, ...edgeSamples, ...radialSamples];
    const hits = samples.filter(([su, sv]) => hasSurface(su, sv));
    const boundary = uv.some(([su, sv]) => su <= 1e-5 || su >= 1 - 1e-5 || sv <= 1e-5 || sv >= 1 - 1e-5);
    return { samples, hits, center: [centerU, centerV], boundary };
  };
  const rawLoops = isHex
    ? buildNgonGithubHexUvLoops(rowLimit, hexCols)
    : null;
  const addLoop = (rawUv, r, c) => {
      const warpedUv = warpUvPoint ? rawUv.map(warpUvPoint) : rawUv;
      const uv = cellHasUsableArea(warpedUv);
      if (!uv) return;
      const expectedMin = isHex ? 4 : 3;
      const expectedMax = isHex ? 6 : 4;
      if (uv.length < expectedMin || uv.length > expectedMax) return;
      const { samples, hits, center, boundary } = cellSurfaceSamples(uv);
      if (hits.length !== samples.length) return;
      const anchorUv = center;
      blocks.push({
        id: `N-${r + 1}-${blocks.length + 1}`,
        uv: uv.map(applyAlign),
        anchorUv: applyAlign(anchorUv),
        courseIndex: r,
        requireDirectSurfaceSamples: true,
        tessellationStrategy: `github-ngon ${state.ngonCellType.toLowerCase()} mesh field`,
      });
  };
  if (rawLoops) {
    rawLoops.forEach((loop, i) => addLoop(loop, Math.floor(i / Math.max(1, hexCols)), i % Math.max(1, hexCols)));
  } else {
    const rStart = 0;
    const rEnd = rowLimit;
    const cStart = 0;
    const cEnd = colLimit;
    for (let r = rStart; r < rEnd; r++) {
      for (let c = cStart; c < cEnd; c++) {
        addLoop(buildCell(c, r), r, c);
      }
    }
  }
  if (topologyBreaks?.length > 1) {
    state.params.courseCount = Math.max(1, topologyBreaks.length - 1);
    state.params.blockCount = Math.max(1, Math.round(blocks.length / Math.max(1, state.params.courseCount)));
  }
  return blocks;
};

const generateFreeformCourseBlocks = () => {
  const bbox = state.importedSurfaceBbox;
  if (!state.importedSurface || !bbox || bbox.isEmpty()) return [];
  const density = Math.max(0.25, state.params.subdivisionDensity || 1);
  const targetCourseHeight = clamp((state.constraints.courseHeight || 0.65) / density, 0.08, 8);
  const targetBlockLength = clamp((state.targetBlockWidth || 1.2) / density, 0.08, 10);
  const uBreaks = buildImportedAdaptiveCourseBreaks(targetCourseHeight);
  const courseField = buildImportedDirectionalCourseField(uBreaks);
  const blocks = [];
  const physicalJoint = state.jointMode === "Physical cut";
  const minUvSpan = 1e-4;
  const hasSurface = (u, v) => !!getImportedSurfaceHit(u, v);
  const findCellAnchor = (uv) => {
    const centerU = (uv[0][0] + uv[2][0]) * 0.5;
    const centerV = (uv[0][1] + uv[2][1]) * 0.5;
    const samples = [
      [centerU, centerV],
      ...uv,
      [(uv[0][0] + uv[1][0]) * 0.5, (uv[0][1] + uv[1][1]) * 0.5],
      [(uv[1][0] + uv[2][0]) * 0.5, (uv[1][1] + uv[2][1]) * 0.5],
      [(uv[2][0] + uv[3][0]) * 0.5, (uv[2][1] + uv[3][1]) * 0.5],
      [(uv[3][0] + uv[0][0]) * 0.5, (uv[3][1] + uv[0][1]) * 0.5],
    ];
    const center = hasSurface(centerU, centerV) ? [centerU, centerV] : null;
    const hits = samples.filter(([u, v]) => hasSurface(u, v));
    if (hits.length < Math.max(3, Math.ceil(samples.length * 0.34))) return null;
    return center || hits[0];
  };

  for (let r = 0; r < uBreaks.length - 1; r++) {
    const lowerCurve = courseField[r];
    const upperCurve = courseField[r + 1];
    const stagger = r % 2 ? 0.5 : 0;
    const intervals = buildImportedCurvedCourseIntervals(lowerCurve, upperCurve, 220);
    intervals.forEach(([span0, span1], intervalIndex) => {
      const midU = (lowerCurve.at((span0 + span1) * 0.5) + upperCurve.at((span0 + span1) * 0.5)) * 0.5;
      const localTarget = targetBlockLength * THREE.MathUtils.lerp(0.82, 1.12, Math.sin(midU * Math.PI));
      const breaks = buildImportedAdaptiveCurvedSpanBreaks(lowerCurve, upperCurve, span0, span1, localTarget, stagger);
      for (let c = 0; c < breaks.length - 1; c++) {
        const edgeOvercut = 0.01;
        const v0 = c === 0 ? clamp(breaks[c] - edgeOvercut, 0, 1) : breaks[c];
        const v1 = c === breaks.length - 2 ? clamp(breaks[c + 1] + edgeOvercut, 0, 1) : breaks[c + 1];
        if (v1 - v0 < minUvSpan) continue;
        let uv = [
          [lowerCurve.at(v0), v0],
          [upperCurve.at(v0), v0],
          [upperCurve.at(v1), v1],
          [lowerCurve.at(v1), v1],
        ];
        let anchorUv = findCellAnchor(uv);
        if (!anchorUv) continue;
      if (physicalJoint && state.constraints.jointGap > 0) {
        uv = insetQuadMiterUv(uv, state.constraints.jointGap);
          anchorUv = findCellAnchor(uv);
          if (!anchorUv) continue;
      }
      blocks.push({
          id: `F-${r + 1}-${intervalIndex + 1}-${blocks.length + 1}`,
        uv: uv.map(applyAlign),
          anchorUv: applyAlign(anchorUv),
        courseIndex: r,
          tessellationStrategy: "directional freeform transverse courses",
      });
    }
    });
  }
  state.params.courseCount = Math.max(1, uBreaks.length - 1);
  state.params.blockCount = Math.max(1, Math.round(blocks.length / Math.max(1, state.params.courseCount)));
  return blocks;
};

const topologyUvKey = ([u, v], precision = 5) => `${u.toFixed(precision)},${v.toFixed(precision)}`;

const topologyEdgeKey = (a, b) => {
  const ka = topologyUvKey(a);
  const kb = topologyUvKey(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
};

const polygonCentroidUv = (uv) => [
  uv.reduce((sum, p) => sum + p[0], 0) / uv.length,
  uv.reduce((sum, p) => sum + p[1], 0) / uv.length,
];

const orientUvLike = (uv, referenceUv) => {
  const clean = cleanUvPolygon(uv, 0.000001);
  if (!clean) return null;
  const refSign = Math.sign(signedUvArea(referenceUv)) || 1;
  return Math.sign(signedUvArea(clean)) === refSign ? clean : clean.slice().reverse();
};

const triangleIncenterUv = (uv) => {
  const [a, b, c] = uv;
  const la = Math.hypot(b[0] - c[0], b[1] - c[1]);
  const lb = Math.hypot(a[0] - c[0], a[1] - c[1]);
  const lc = Math.hypot(a[0] - b[0], a[1] - b[1]);
  const total = la + lb + lc;
  if (total <= 1e-9) return polygonCentroidUv(uv);
  return [
    (la * a[0] + lb * b[0] + lc * c[0]) / total,
    (la * a[1] + lb * b[1] + lc * c[1]) / total,
  ];
};

const topologyFaceCenterUv = (uv) => {
  const centroid = polygonCentroidUv(uv);
  if (uv.length !== 3) return centroid;
  const shaped = triangleIncenterUv(uv);
  const t = clamp(state.ngonShape ?? 0.5, 0, 1);
  return [
    THREE.MathUtils.lerp(centroid[0], shaped[0], t),
    THREE.MathUtils.lerp(centroid[1], shaped[1], t),
  ];
};

const getTopologySubdivisionPlan = (polys) => {
  const bboxSize = state.importedSurfaceBbox?.getSize(new THREE.Vector3()) || new THREE.Vector3(1, 1, 1);
  const scaleArea = Math.max(1e-9, bboxSize.x) * Math.max(1e-9, bboxSize.z);
  const areas = polys.map((uv) => Math.max(1e-9, Math.abs(signedUvArea(uv)) * scaleArea));
  const totalArea = areas.reduce((sum, area) => sum + area, 0) || 1;
  const density = clamp(state.params.subdivisionDensity || 1, 0.25, 8);
  const fieldTarget = Math.max(1, (state.params.courseCount || 16) * (state.params.blockCount || 18) * density);
  const targetLength = clamp(state.targetBlockWidth || 1.2, 0.08, 10);
  const targetWidth = clamp(state.constraints.courseHeight || 0.65, 0.08, 8);
  const targetArea = Math.max(0.005, (targetLength * targetWidth) / Math.max(0.1, density));
  const physicalTarget = totalArea / targetArea;
  const targetCells = state.blockDimensionMode === "fit"
    ? fieldTarget
    : Math.max(fieldTarget, physicalTarget);
  return { areas, totalArea, targetCells };
};

const getTopologySubdivisionFrequency = (faceArea, plan) => {
  const targetForFace = Math.max(1, plan.targetCells * (faceArea / Math.max(1e-9, plan.totalArea)));
  return Math.max(1, Math.min(24, Math.ceil(Math.sqrt(targetForFace))));
};

const subdivideTriangleUv = (tri, frequency) => {
  const n = Math.max(1, Math.floor(frequency));
  const [a, b, c] = tri;
  const point = (i, j) => {
    const u = i / n;
    const v = j / n;
    const w = 1 - u - v;
    return [
      a[0] * w + b[0] * u + c[0] * v,
      a[1] * w + b[1] * u + c[1] * v,
    ];
  };
  const out = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i; j++) {
      const t0 = orientUvLike([point(i, j), point(i + 1, j), point(i, j + 1)], tri);
      if (t0) out.push(t0);
      if (j < n - i - 1) {
        const t1 = orientUvLike([point(i + 1, j), point(i + 1, j + 1), point(i, j + 1)], tri);
        if (t1) out.push(t1);
      }
    }
  }
  return out;
};

const subdividePolygonToTrianglesUv = (uv, frequency) => {
  if (uv.length === 3) return subdivideTriangleUv(uv, frequency);
  const center = polygonCentroidUv(uv);
  const out = [];
  for (let i = 0; i < uv.length; i++) {
    const tri = orientUvLike([center, uv[i], uv[(i + 1) % uv.length]], uv);
    if (tri) out.push(...subdivideTriangleUv(tri, frequency));
  }
  return out;
};

const subdividePolygonToRadialQuadsUv = (uv, frequency) => {
  const n = Math.max(1, Math.floor(frequency));
  const rings = Math.max(1, Math.ceil(n * 0.7));
  const center = polygonCentroidUv(uv);
  const out = [];
  const lerpPoint = (a, b, t) => [
    THREE.MathUtils.lerp(a[0], b[0], t),
    THREE.MathUtils.lerp(a[1], b[1], t),
  ];
  for (let e = 0; e < uv.length; e++) {
    const a = uv[e];
    const b = uv[(e + 1) % uv.length];
    for (let s = 0; s < n; s++) {
      const edge0 = lerpPoint(a, b, s / n);
      const edge1 = lerpPoint(a, b, (s + 1) / n);
      for (let r = 0; r < rings; r++) {
        const inner = r / rings;
        const outer = (r + 1) / rings;
        if (r === 0) {
          const tri = orientUvLike([center, lerpPoint(center, edge1, outer), lerpPoint(center, edge0, outer)], uv);
          if (tri) out.push(tri);
        } else {
          const quad = orientUvLike([
            lerpPoint(center, edge0, inner),
            lerpPoint(center, edge1, inner),
            lerpPoint(center, edge1, outer),
            lerpPoint(center, edge0, outer),
          ], uv);
          if (quad) out.push(quad);
        }
      }
    }
  }
  return out;
};

const subdividePolygonToUvGridQuads = (uv, frequency) => {
  const n = Math.max(1, Math.floor(frequency));
  const center = polygonCentroidUv(uv);
  let longest = { len: 0, axis: [1, 0] };
  for (let i = 0; i < uv.length; i++) {
    const a = uv[i];
    const b = uv[(i + 1) % uv.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len > longest.len) longest = { len, axis: [dx / Math.max(1e-9, len), dy / Math.max(1e-9, len)] };
  }
  const cross = [-longest.axis[1], longest.axis[0]];
  const local = uv.map((p) => {
    const dx = p[0] - center[0];
    const dy = p[1] - center[1];
    return [dx * longest.axis[0] + dy * longest.axis[1], dx * cross[0] + dy * cross[1]];
  });
  const minS = Math.min(...local.map(([s]) => s));
  const maxS = Math.max(...local.map(([s]) => s));
  const minT = Math.min(...local.map(([, t]) => t));
  const maxT = Math.max(...local.map(([, t]) => t));
  const cols = Math.max(1, Math.ceil(n * Math.max(1, (maxS - minS) / Math.max(1e-6, maxT - minT))));
  const rows = Math.max(1, n);
  const fromLocal = (s, t) => [
    center[0] + longest.axis[0] * s + cross[0] * t,
    center[1] + longest.axis[1] * s + cross[1] * t,
  ];
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const s0 = THREE.MathUtils.lerp(minS, maxS, c / cols);
      const s1 = THREE.MathUtils.lerp(minS, maxS, (c + 1) / cols);
      const t0 = THREE.MathUtils.lerp(minT, maxT, r / rows);
      const t1 = THREE.MathUtils.lerp(minT, maxT, (r + 1) / rows);
      const chebySkew = state.ngonCellType === "Chebychev"
        ? (state.ngonShape - 0.5) * (maxS - minS) / Math.max(1, cols) * 0.9
        : 0;
      const rowSkew0 = chebySkew * ((r / rows) - 0.5);
      const rowSkew1 = chebySkew * (((r + 1) / rows) - 0.5);
      const clipped = clipUvPolygonToConvexPolygon([
        fromLocal(s0 + rowSkew0, t0),
        fromLocal(s1 + rowSkew0, t0),
        fromLocal(s1 + rowSkew1, t1),
        fromLocal(s0 + rowSkew1, t1),
      ], uv);
      if (clipped) out.push(clipped);
    }
  }
  return out;
};

const refineTopologyPolysForNgon = (polys) => {
  const cleaned = polys.map((rawUv) => cleanUvPolygon(rawUv)).filter(Boolean);
  const plan = getTopologySubdivisionPlan(cleaned);
  const refined = [];
  cleaned.forEach((uv, index) => {
    const frequency = getTopologySubdivisionFrequency(plan.areas[index], plan);
    const type = state.ngonCellType || "Hex";
    const pieces = type === "Diamond"
      ? subdividePolygonToRadialQuadsUv(uv, frequency)
      : type === "Quad" || type === "Chebychev"
        ? subdividePolygonToUvGridQuads(uv, frequency)
        : subdividePolygonToTrianglesUv(uv, frequency);
    refined.push(...pieces);
  });
  return {
    source: cleaned,
    refined: refined.length ? refined : cleaned,
    plan,
  };
};

const importedSurfaceSupportsUvCell = (uv) => {
  if (!state.importedSurface) return true;
  const anchor = polygonCentroidUv(uv);
  const edgeMids = uv.map((p, i) => [
    (p[0] + uv[(i + 1) % uv.length][0]) * 0.5,
    (p[1] + uv[(i + 1) % uv.length][1]) * 0.5,
  ]);
  const samples = [anchor, ...uv, ...edgeMids];
  const hits = samples.reduce((count, [u, v]) => count + (getImportedSurfaceSample(u, v) ? 1 : 0), 0);
  return !!getImportedSurfaceSample(anchor[0], anchor[1]) && hits >= Math.ceil(samples.length * 0.45);
};

const pushClippedUvLoop = (loops, loop, patchUv, minArea = 0.000001) => {
  const clipped = clipUvPolygonToConvexPolygon(loop, patchUv);
  const clean = clipped && cellHasUsableArea(clipped, minArea);
  if (clean) loops.push(clean);
};

const makeHexMeshCellLoops = (patchUv, uDiv, vDiv, parameter, quadrangulate = true) => {
  const loops = [];
  const t = clamp(parameter, 0, 1);
  const pointAt = (u, v) => bilerpUv(patchUv, u, v);
  const invU = 1 / Math.max(1, uDiv);
  const invV = 1 / Math.max(1, vDiv);
  for (let i = -1; i <= uDiv + 1; i++) {
    for (let j = 0; j <= vDiv; j++) {
      if ((i + j) % 2 !== 0) continue;
      if (i < 0 || i > uDiv) continue;
      const rowShift = quadrangulate && j % 2 ? invU * 0.5 : 0;
      const p0 = pointAt((i - 1) * invU + rowShift, (j + t) * invV);
      const p1 = pointAt((i - 1) * invU + rowShift, (j - t) * invV);
      const p2 = pointAt(i * invU + rowShift, (j - (1 - t)) * invV);
      const p3 = pointAt((i + 1) * invU + rowShift, (j - t) * invV);
      const p4 = pointAt((i + 1) * invU + rowShift, (j + t) * invV);
      const p5 = pointAt(i * invU + rowShift, (j + (1 - t)) * invV);
      if (quadrangulate) {
        pushClippedUvLoop(loops, [p0, p1, p2, p5], patchUv);
        pushClippedUvLoop(loops, [p2, p3, p4, p5], patchUv);
      } else {
        pushClippedUvLoop(loops, [p0, p1, p2, p3, p4, p5], patchUv);
      }
    }
  }
  return loops;
};

const makeStaggeredQuadCellLoops = (patchUv, uDiv, vDiv) => {
  const loops = [];
  const pointAt = (u, v) => bilerpUv(patchUv, u, v);
  const invU = 1 / Math.max(1, uDiv);
  const invV = 1 / Math.max(1, vDiv);
  for (let r = 0; r < vDiv; r++) {
    const rowShift = r % 2 ? invU * 0.5 : 0;
    for (let c = -1; c <= uDiv; c++) {
      const u0 = c * invU + rowShift;
      const u1 = (c + 1) * invU + rowShift;
      const v0 = r * invV;
      const v1 = (r + 1) * invV;
      pushClippedUvLoop(loops, [
        pointAt(u0, v0),
        pointAt(u1, v0),
        pointAt(u1, v1),
        pointAt(u0, v1),
      ], patchUv);
    }
  }
  return loops;
};

const makeDiamondMeshCellLoops = (patchUv, uDiv, vDiv) => {
  const loops = [];
  const pointAt = (u, v) => bilerpUv(patchUv, u, v);
  for (let r = 0; r < vDiv; r++) {
    for (let c = 0; c < uDiv; c++) {
      const u0 = c / uDiv;
      const u1 = (c + 1) / uDiv;
      const v0 = r / vDiv;
      const v1 = (r + 1) / vDiv;
      const um = (u0 + u1) * 0.5;
      const vm = (v0 + v1) * 0.5;
      pushClippedUvLoop(loops, [
        pointAt(um, v0),
        pointAt(u1, vm),
        pointAt(um, v1),
        pointAt(u0, vm),
      ], patchUv);
    }
  }
  return loops;
};

const bilerpUv = (quad, u, v) => {
  const bottom = [
    THREE.MathUtils.lerp(quad[0][0], quad[1][0], u),
    THREE.MathUtils.lerp(quad[0][1], quad[1][1], u),
  ];
  const top = [
    THREE.MathUtils.lerp(quad[3][0], quad[2][0], u),
    THREE.MathUtils.lerp(quad[3][1], quad[2][1], u),
  ];
  return [
    THREE.MathUtils.lerp(bottom[0], top[0], v),
    THREE.MathUtils.lerp(bottom[1], top[1], v),
  ];
};

const getImportedBrepPatches = () => state.importedBrepPatches || [];

const getImportedBrepDivisionCounts = () => {
  const density = clamp(state.params.subdivisionDensity || 1, 0.25, 8);
  const uControl = clamp(Math.round(state.params.courseCount || 16), 2, 240);
  const vControl = clamp(Math.round(state.params.blockCount || 18), 2, 240);
  return {
    uDiv: Math.max(2, Math.min(240, Math.round(uControl * density))),
    vDiv: Math.max(2, Math.min(240, Math.round(vControl * density))),
  };
};

const generateHexDivideBrepFieldBlocks = () => {
  if (!state.importedBrepPatches?.length) return [];
  const { uDiv, vDiv } = getImportedBrepDivisionCounts();
  const parameter = clamp(state.ngonShape ?? 0.5, 0, 1);
  const blocks = [];
  const physicalJoint = state.jointMode === "Physical cut";
  getImportedBrepPatches().forEach((patch, patchIndex) => {
    const patchUv = cleanUvPolygon(patch.uv);
    if (!patchUv || patchUv.length !== 4) return;
    const cellLoops = parameter <= 0.0001
      ? makeDiamondMeshCellLoops(patchUv, uDiv, vDiv)
      : Math.abs(parameter - 0.5) <= 0.015
        ? makeStaggeredQuadCellLoops(patchUv, uDiv, vDiv)
        : makeHexMeshCellLoops(patchUv, uDiv, vDiv, parameter, true);
    cellLoops.forEach((cellUv) => {
      let uv = cellUv;
      if (!importedSurfaceSupportsUvCell(uv)) return;
      if (physicalJoint && state.constraints.jointGap > 0 && uv.length === 4) {
        uv = cellHasUsableArea(insetQuadMiterUv(uv, state.constraints.jointGap), 0.000001);
        if (!uv) return;
      }
      const alignedUv = uv.map(applyAlign);
      blocks.push({
        id: `H-${patchIndex + 1}-${blocks.length + 1}`,
        uv: alignedUv,
        anchorUv: applyAlign(polygonCentroidUv(uv)),
        topologyVertexKey: `hexdivide-${patchIndex}-${blocks.length}`,
        topologyValence: uv.length,
        topologyBoundary: false,
        requireDirectSurfaceSamples: false,
        tessellationStrategy: "ngon hexdivide brep-uv quadrangulated",
      });
    });
  });
  return blocks;
};

const pushUniqueTopologyPoint = (items, point, type, id) => {
  const key = `${type}:${id ?? topologyUvKey(point, 7)}`;
  if (items.some((item) => item.key === key)) return;
  items.push({ key, point, type });
};

const buildNgonDualTopologyUvLoops = (polys) => {
  const faces = polys
    .map((rawUv, faceIndex) => {
      const uv = cleanUvPolygon(rawUv);
      if (!uv) return null;
      return {
        faceIndex,
        uv,
        center: topologyFaceCenterUv(uv),
      };
    })
    .filter(Boolean);
  const vertices = new Map();
  const edges = new Map();
  const ensureVertex = (uv) => {
    const key = topologyUvKey(uv);
    if (!vertices.has(key)) vertices.set(key, { key, uv, faces: new Set(), boundaryMids: [] });
    return vertices.get(key);
  };
  faces.forEach((face, localFaceIndex) => {
    face.uv.forEach((point, i) => {
      const next = face.uv[(i + 1) % face.uv.length];
      ensureVertex(point).faces.add(localFaceIndex);
      const edgeKey = topologyEdgeKey(point, next);
      if (!edges.has(edgeKey)) {
        edges.set(edgeKey, {
          key: edgeKey,
          a: point,
          b: next,
          midpoint: [(point[0] + next[0]) * 0.5, (point[1] + next[1]) * 0.5],
          faces: [],
        });
      }
      edges.get(edgeKey).faces.push(localFaceIndex);
    });
  });
  edges.forEach((edge) => {
    if (edge.faces.length !== 1) return;
    const a = vertices.get(topologyUvKey(edge.a));
    const b = vertices.get(topologyUvKey(edge.b));
    a?.boundaryMids.push({ key: edge.key, point: edge.midpoint });
    b?.boundaryMids.push({ key: edge.key, point: edge.midpoint });
  });
  const loops = [];
  vertices.forEach((vertex) => {
    const items = [];
    vertex.faces.forEach((faceIndex) => {
      const face = faces[faceIndex];
      if (face) pushUniqueTopologyPoint(items, face.center, "face", face.faceIndex);
    });
    vertex.boundaryMids.forEach((mid) => pushUniqueTopologyPoint(items, mid.point, "edge", mid.key));
    if (vertex.boundaryMids.length && vertex.faces.size <= 10) {
      pushUniqueTopologyPoint(items, vertex.uv, "vertex", vertex.key);
    }
    if (items.length < 3) return;
    items.sort((a, b) => {
      const aa = Math.atan2(a.point[1] - vertex.uv[1], a.point[0] - vertex.uv[0]);
      const bb = Math.atan2(b.point[1] - vertex.uv[1], b.point[0] - vertex.uv[0]);
      return aa - bb;
    });
    let uv = cleanUvPolygon(items.map((item) => item.point), 0.000001);
    if (!uv) return;
    if (signedUvArea(uv) < 0) uv = uv.slice().reverse();
    loops.push({
      uv,
      anchorUv: polygonCentroidUv(uv),
      topologyVertexKey: vertex.key,
      valence: vertex.faces.size,
      isBoundary: vertex.boundaryMids.length > 0,
    });
  });
  return loops;
};

const bilerpArray2 = (quad, u, v) => [
  THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(quad[0][0], quad[1][0], u),
    THREE.MathUtils.lerp(quad[3][0], quad[2][0], u),
    v
  ),
  THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(quad[0][1], quad[1][1], u),
    THREE.MathUtils.lerp(quad[3][1], quad[2][1], u),
    v
  ),
];

const bilerpVector3 = (quad, u, v) => {
  const bottom = quad[0].clone().lerp(quad[1], u);
  const top = quad[3].clone().lerp(quad[2], u);
  return bottom.lerp(top, v);
};

const bilerpNormal3 = (quad, u, v, fallback = new THREE.Vector3(0, 1, 0)) => {
  if (!quad?.length || quad.length !== 4) return fallback.clone();
  const n = bilerpVector3(quad, u, v);
  return n.lengthSq() > 1e-10 ? n.normalize() : fallback.clone();
};

const getPanelMorphWeight = (uv, id = "panel-morph") => {
  const block = { id, uv };
  const { basis, sourceWeight } = computeRawSourceWeight(block);
  const curvatureWeight = clamp((basis.curvature || 0) * 1.8, 0, 1);
  const compressionWeight = clamp(((basis.compression || 0) - 0.18) / 0.72, 0, 1);
  // In explicit field mode, honor the selected source exactly. This lets an
  // attractor be the sole driver of a matched panel morph rather than letting
  // curvature or compression bleed into the response.
  if (state.panelWeightSubdivision) return clamp(sourceWeight, 0, 1);
  return clamp(Math.max(curvatureWeight, compressionWeight), 0, 1);
};

const smoothDomainCoordinate = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

const topologyMorphCoordinate = (value, axisWeight = 1) => {
  const t = clamp(value, 0, 1);
  const edgeDense = THREE.MathUtils.lerp(t, smoothDomainCoordinate(t), 0.72 * axisWeight);
  return THREE.MathUtils.lerp(t, edgeDense, clamp(state.panelMorphStrength || 0, 0, 1) * 0.9);
};

const getPanelDomainMorphUv = (uv, id = "panel-domain-morph") => {
  return uv ? [clamp(uv[0], 0, 1), clamp(uv[1], 0, 1)] : [0.5, 0.5];
};

const getPanelDomainMorphSample = (uv, fallbackPoint, fallbackNormal, id = "panel-domain-morph") => {
  const morphedUv = getPanelDomainMorphUv(uv, id);
  return {
    uv: morphedUv,
    point: fallbackPoint?.clone?.() || new THREE.Vector3(),
    normal: fallbackNormal?.clone?.() || new THREE.Vector3(0, 1, 0),
  };
};

const getPanelSubdivisionCounts = (cell) => {
  const uCount = clamp(Math.round(state.panelSubdivisionU || 1), 1, 8);
  const vCount = clamp(Math.round(state.panelSubdivisionV || 1), 1, 8);
  const sourceWeight = getPanelMorphWeight(cell.uv, `panel-morph-${cell.faceIndex ?? 0}`);
  return {
    uCount,
    vCount,
    sourceWeight,
  };
};

const subdivideTissueQuadCell = (cell, cellIndex) => {
  if (cell.points?.length !== 4 || cell.uv?.length !== 4) return [cell];
  const { uCount, vCount, sourceWeight } = getPanelSubdivisionCounts(cell);
  const morphStrength = clamp(state.panelMorphStrength || 0, 0, 1);
  if (uCount === 1 && vCount === 1 && morphStrength <= 1e-6) return [cell];
  const sourceCarrierUv = cell.sourceCarrierUv?.length === 4 ? cell.sourceCarrierUv : cell.uv;
  const fallbackNormal = getFaceNormalFromPoints(cell.points) || new THREE.Vector3(0, 1, 0);
  const normalQuad = cell.targetNormals?.length === 4 ? cell.targetNormals : [fallbackNormal, fallbackNormal, fallbackNormal, fallbackNormal];
  const out = [];
  for (let y = 0; y < vCount; y++) {
    const v0 = y / vCount;
    const v1 = (y + 1) / vCount;
    for (let x = 0; x < uCount; x++) {
      const u0 = x / uCount;
      const u1 = (x + 1) / uCount;
      const rawUv = [
        bilerpArray2(cell.uv, u0, v0),
        bilerpArray2(cell.uv, u1, v0),
        bilerpArray2(cell.uv, u1, v1),
        bilerpArray2(cell.uv, u0, v1),
      ];
      const rawCarrierUv = [
        bilerpArray2(sourceCarrierUv, u0, v0),
        bilerpArray2(sourceCarrierUv, u1, v0),
        bilerpArray2(sourceCarrierUv, u1, v1),
        bilerpArray2(sourceCarrierUv, u0, v1),
      ];
      const rawPoints = [
        bilerpVector3(cell.points, u0, v0),
        bilerpVector3(cell.points, u1, v0),
        bilerpVector3(cell.points, u1, v1),
        bilerpVector3(cell.points, u0, v1),
      ];
      const rawNormals = [
        bilerpNormal3(normalQuad, u0, v0, fallbackNormal),
        bilerpNormal3(normalQuad, u1, v0, fallbackNormal),
        bilerpNormal3(normalQuad, u1, v1, fallbackNormal),
        bilerpNormal3(normalQuad, u0, v1, fallbackNormal),
      ];
      const samples = rawCarrierUv.map((coord, cornerIndex) => getPanelDomainMorphSample(
        coord,
        rawPoints[cornerIndex],
        rawNormals[cornerIndex],
        `panel-domain-${cell.faceIndex ?? cellIndex}-${cornerIndex}`
      ));
      out.push({
        ...cell,
        subdivisionIndex: out.length,
        subdivisionU: x,
        subdivisionV: y,
        subdivisionParentIndex: cellIndex,
        subdivisionCounts: { u: uCount, v: vCount },
        morphWeight: Number(sourceWeight.toFixed(4)),
        uv: rawUv.map((coord, cornerIndex) => samples[cornerIndex]?.uv || getPanelDomainMorphUv(coord)),
        sourceCarrierUv: samples.map((sample) => sample.uv),
        points: samples.map((sample) => sample.point),
        targetNormals: samples.map((sample) => sample.normal),
      });
    }
  }
  return out;
};

const generateImportedTopologyMeshBlocks = () => {
  if (isPanelQuadSource(state.customPatternSource) && state.importedTissueCells?.length) {
    const orientedTissueCells = orientTissueCellsByStrips(
      state.importedTissueCells.map((cell) => ({
        ...cell,
        points: cell.points?.map((p) => p.clone()) || [],
        targetNormals: cell.targetNormals?.map((n) => n.clone()),
        uv: cell.uv?.map((coord) => [...coord]) || [],
        sourceCarrierUv: cell.sourceCarrierUv?.map((coord) => [...coord]) || [],
      })),
      state.strategy
    ).flatMap((cell, index) => subdivideTissueQuadCell(cell, index));
    return orientedTissueCells
      .map((cell, index) => {
        const uv = cell.uv?.map(applyAlign) || null;
        if (!uv || !cellHasUsableArea(uv, 0.000001)) return null;
        const parentIndex = cell.subdivisionParentIndex;
        const id = parentIndex !== undefined
          ? `T-${parentIndex + 1}-${cell.subdivisionU + 1}-${cell.subdivisionV + 1}`
          : `T-${index + 1}`;
        return {
          id,
          uv,
          anchorUv: polygonCentroidUv(uv),
          targetPoints: cell.points.map((p) => p.clone()),
          targetNormals: cell.targetNormals?.map((n) => n.clone()),
          sourceCarrierUv: cell.sourceCarrierUv?.map((coord) => [...coord]) || uv.map((coord) => [...coord]),
          orientationShift: cell.orientationShift || 0,
          orientationReversed: !!cell.orientationReversed,
          carrierFaceIndex: cell.faceIndex,
          topologyVertexKey: `tissue-${index}`,
          topologyValence: cell.points.length,
          subdivisionCounts: cell.subdivisionCounts,
          subdivisionParentIndex: cell.subdivisionParentIndex,
          morphWeight: cell.morphWeight,
          topologyBoundary: false,
          requireDirectSurfaceSamples: false,
          tessellationStrategy: cell.points.length === 4 ? "panel quad mesh carrier" : "panel polygon mesh carrier",
        };
      })
      .filter(Boolean);
  }
  if (!state.importedTopologyPolys?.length && !state.importedBrepPatches?.length) return [];
  if (state.importedBrepPatches?.length && state.ngonCellType === "Hex") return generateHexDivideBrepFieldBlocks();
  const physicalJoint = state.jointMode === "Physical cut";
  const topologySource = state.importedTopologyPolys || state.importedBrepPatches.map((patch) => patch.uv);
  const topology = refineTopologyPolysForNgon(topologySource);
  const type = state.ngonCellType || "Hex";
  const loops = type === "Hex"
    ? buildNgonDualTopologyUvLoops(topology.refined)
    : topology.refined.map((uv, index) => ({
      uv,
      anchorUv: polygonCentroidUv(uv),
      topologyVertexKey: `direct-${index}`,
      valence: uv.length,
      isBoundary: false,
    }));
  return loops
    .map((loop, index) => {
      let uv = loop.uv;
      if (physicalJoint && state.constraints.jointGap > 0 && uv.length === 4) {
        uv = cellHasUsableArea(insetQuadMiterUv(uv, state.constraints.jointGap), 0.000001);
        if (!uv) return null;
      }
      const anchorUv = polygonCentroidUv(uv);
      const alignedUv = uv.map(applyAlign);
      const alignedAnchor = applyAlign(anchorUv);
      return {
        id: `D-${index + 1}`,
        uv: alignedUv,
        anchorUv: alignedAnchor,
        topologyVertexKey: loop.topologyVertexKey,
        topologyValence: loop.valence,
        topologyBoundary: loop.isBoundary,
        requireDirectSurfaceSamples: false,
        tessellationStrategy: type === "Hex" ? "ngon mesh-dual topology" : `ngon ${type.toLowerCase()} topology`,
      };
    })
    .filter(Boolean);
};

const generateImported2DLayoutBlocks = () => {
  if (!state.imported2DPolys?.length) return [];
  return state.imported2DPolys.map((poly, i) => {
    const transformed = poly.map(applyAlign);
    const quad = transformed.length >= 4 ? [transformed[0], transformed[1], transformed[2], transformed[3]] : null;
    if (!quad) return null;
    return { id: `I-${i + 1}`, uv: quad };
  }).filter(Boolean);
};

const generateCustomSurfaceGridBlocks = ({ adaptive = false } = {}) => {
  const physicalJoint = state.jointMode === "Physical cut";
  const rows = Math.max(2, Math.floor(state.params.courseCount * state.params.subdivisionDensity));
  const cols = Math.max(2, Math.floor(state.params.blockCount * state.params.subdivisionDensity));
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let u0 = c / cols;
      let u1 = (c + 1) / cols;
      let v0 = r / rows;
      let v1 = (r + 1) / rows;
      if (adaptive) {
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
};

const generateProceduralVaultFieldBlocks = () => {
  const physicalJoint = state.jointMode === "Physical cut";
  const conforming2D = true;
  const density = state.params.subdivisionDensity;
  if (isBarrelLikeVault()) return generateBarrelLikeBlocksFromTrait();
  const rows = Math.max(2, Math.floor(state.params.courseCount * density * Math.max(1, state.arrayV)));
  const cols = Math.max(2, Math.floor(state.params.blockCount * density * Math.max(1, state.arrayU)));
  const blocks = [];
  const pullGroinUvPoint = ([u, v]) => {
    if (state.vaultType !== "Groin Vault" || state.pattern !== "Groin-line courses") return [u, v];
    const dA = Math.abs(u - v);
    const dB = Math.abs(u + v - 1);
    const strength = clamp(0.08 + state.groinMorph * 0.12, 0.04, 0.2);
    let gu;
    let gv;
    if (dA <= dB) {
      gu = (u + v) * 0.5;
      gv = gu;
    } else {
      gu = (u - v + 1) * 0.5;
      gv = 1 - gu;
    }
    const proximity = 1 - clamp(Math.min(dA, dB) * 3.2, 0, 1);
    const k = strength * proximity;
    return [
      clamp(THREE.MathUtils.lerp(u, gu, k), 0, 1),
      clamp(THREE.MathUtils.lerp(v, gv, k), 0, 1),
    ];
  };
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
      let uv = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(pullGroinUvPoint);
      if (physicalJoint && localGap > 0) uv = insetQuadMiterUv(uv, localGap);
      uv = uv.map(applyAlign);
      blocks.push({ id: `B-${r + 1}-${c + 1}`, uv });
    }
  }
  return blocks;
};

const blockStrategyDefinitions = {
  tissueQuadMesh: {
    id: "tissueQuadMesh",
    label: "Panel quad mesh",
    generate: () => generateImportedTopologyMeshBlocks(),
  },
  importedTopology: {
    id: "importedTopology",
    label: "Imported topology field",
    generate: () => generateImportedTopologyMeshBlocks(),
  },
  importedLayout: {
    id: "importedLayout",
    label: "Imported 2D layout",
    generate: () => generateImported2DLayoutBlocks(),
  },
  freeformCourses: {
    id: "freeformCourses",
    label: "Freeform courses",
    generate: () => generateFreeformCourseBlocks(),
  },
  ngonCells: {
    id: "ngonCells",
    label: "NGon cells",
    generate: () => generateNgonCellBlocks(),
  },
  surfaceGrid: {
    id: "surfaceGrid",
    label: "Surface UV grid",
    generate: () => generateCustomSurfaceGridBlocks({ adaptive: state.customPatternSource === "NGon Adaptive" }),
  },
  proceduralVault: {
    id: "proceduralVault",
    label: "Procedural vault field",
    generate: () => generateProceduralVaultFieldBlocks(),
  },
};

const getBlockStrategyDefinition = () => {
  if (isPanelQuadSource(state.customPatternSource) && state.importedTissueCells?.length) {
    return blockStrategyDefinitions.tissueQuadMesh;
  }
  if (
    (state.importedTopologyPolys?.length || state.importedBrepPatches?.length) &&
    (state.customPatternSource === "Imported Topology Mesh" || state.pattern === "Hex / NGon")
  ) return blockStrategyDefinitions.importedTopology;
  if (state.designMode === "Custom Import" && state.customPatternSource === "Imported 2D Layout" && state.imported2DPolys?.length) {
    return blockStrategyDefinitions.importedLayout;
  }
  if (state.designMode === "Custom Import" && state.customPatternSource === "Freeform Courses" && state.importedSurface) {
    return blockStrategyDefinitions.freeformCourses;
  }
  if (
    state.designMode === "Custom Import" &&
    (state.customPatternSource === "NGon Cells" || state.customPatternSource === "NGon Adaptive") &&
    state.importedSurface
  ) return blockStrategyDefinitions.ngonCells;
  if (state.designMode === "Custom Import") return blockStrategyDefinitions.surfaceGrid;
  return blockStrategyDefinitions.proceduralVault;
};

const deterministicHash = (value) => {
  let hash = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

const rotateUvLoop = (uv, steps = 0) => {
  if (!uv?.length) return uv;
  const shift = ((Math.round(steps) % uv.length) + uv.length) % uv.length;
  return uv.slice(shift).concat(uv.slice(0, shift));
};

const getOrientationGuideUv = (anchorUv = [0.5, 0.5], strategy = getActiveStrategy()) => {
  const mode = strategy.rotation || "course-tangent";
  if (mode === "surface-uv") return [0, 1];
  if (mode === "principal-curvature") {
    const curve = getHostField().curvatureAt(anchorUv[0], anchorUv[1]);
    const sign = (curve?.ku || 0) >= (curve?.kv || 0) ? 1 : -1;
    return sign > 0 ? [1, 0] : [0, 1];
  }
  if (mode === "compression-flow") {
    const angle = THREE.MathUtils.degToRad(state.contourField?.guideDirectionDeg ?? 35);
    return [Math.cos(angle), Math.sin(angle)];
  }
  if (mode === "cell-normal") return [0, 1];
  return [1, 0];
};

const orientQuadLoopToGuide = (uv, targetPoints, sourceCarrierUv, targetNormals = null, guide = [1, 0]) => {
  if (!uv?.length || uv.length !== 4) {
    return { uv, targetPoints, sourceCarrierUv, targetNormals, shift: 0 };
  }
  const guideLen = Math.hypot(guide[0], guide[1]) || 1;
  const g = [guide[0] / guideLen, guide[1] / guideLen];
  let bestShift = 0;
  let bestScore = -Infinity;
  for (let shift = 0; shift < 4; shift++) {
    const loop = rotateUvLoop(uv, shift);
    const edge = [loop[1][0] - loop[0][0], loop[1][1] - loop[0][1]];
    const edgeLen = Math.hypot(edge[0], edge[1]) || 1;
    const score = Math.abs((edge[0] / edgeLen) * g[0] + (edge[1] / edgeLen) * g[1]);
    if (score > bestScore) {
      bestScore = score;
      bestShift = shift;
    }
  }
  return {
    uv: rotateUvLoop(uv, bestShift),
    targetPoints: targetPoints?.length === 4 ? rotateUvLoop(targetPoints, bestShift) : targetPoints,
    sourceCarrierUv: sourceCarrierUv?.length === 4 ? rotateUvLoop(sourceCarrierUv, bestShift) : sourceCarrierUv,
    targetNormals: targetNormals?.length === 4 ? rotateUvLoop(targetNormals, bestShift) : targetNormals,
    shift: bestShift,
  };
};

const tissuePointKey = (point, precision = 5) => `${point.x.toFixed(precision)},${point.y.toFixed(precision)},${point.z.toFixed(precision)}`;

const tissueEdgeKey = (a, b) => {
  const ak = tissuePointKey(a);
  const bk = tissuePointKey(b);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
};

const rotateLoopValues = (values, steps = 0) => {
  if (!values?.length) return values;
  const shift = ((Math.round(steps) % values.length) + values.length) % values.length;
  return values.slice(shift).concat(values.slice(0, shift));
};

const reverseLoopValues = (values) => values?.length ? values.slice().reverse() : values;

const getLoopEdgeKeys = (points) => (points || []).map((point, index) => ({
  key: tissueEdgeKey(point, points[(index + 1) % points.length]),
  a: tissuePointKey(point),
  b: tissuePointKey(points[(index + 1) % points.length]),
  index,
}));

const applyTissueCellLoop = (cell, points, uv, sourceCarrierUv, targetNormals = null, shift = 0, reversed = false) => ({
  ...cell,
  points,
  uv,
  sourceCarrierUv,
  targetNormals,
  orientationShift: shift,
  orientationReversed: reversed,
});

const makeTissueCellCandidates = (cell) => {
  const bases = [
    {
      points: cell.points,
      uv: cell.uv,
      sourceCarrierUv: cell.sourceCarrierUv,
      targetNormals: cell.targetNormals,
      reversed: false,
    },
  ];
  if (cell.points?.length === 4) {
    bases.push({
      points: reverseLoopValues(cell.points),
      uv: reverseLoopValues(cell.uv),
      sourceCarrierUv: reverseLoopValues(cell.sourceCarrierUv),
      targetNormals: reverseLoopValues(cell.targetNormals),
      reversed: true,
    });
  }
  const candidates = [];
  bases.forEach((base) => {
    for (let shift = 0; shift < Math.max(1, base.points?.length || 0); shift++) {
      candidates.push({
        points: rotateLoopValues(base.points, shift),
        uv: rotateLoopValues(base.uv, shift),
        sourceCarrierUv: rotateLoopValues(base.sourceCarrierUv, shift),
        targetNormals: rotateLoopValues(base.targetNormals, shift),
        shift,
        reversed: base.reversed,
      });
    }
  });
  return candidates;
};

const pickNeighborTissueOrientation = (cell, sharedEdge, guide = [1, 0]) => {
  const candidates = makeTissueCellCandidates(cell);
  const scoreCandidate = (candidate) => {
    const edge = [candidate.uv[1][0] - candidate.uv[0][0], candidate.uv[1][1] - candidate.uv[0][1]];
    const edgeLen = Math.hypot(edge[0], edge[1]) || 1;
    const guideLen = Math.hypot(guide[0], guide[1]) || 1;
    const guideScore = Math.abs((edge[0] / edgeLen) * (guide[0] / guideLen) + (edge[1] / edgeLen) * (guide[1] / guideLen));
    return guideScore + (candidate.reversed ? -0.08 : 0);
  };
  const scoreSharedEdgeCandidate = (candidate, edge) => {
    const expectedIndex = (sharedEdge.index + 2) % 4;
    const indexScore = edge.index === expectedIndex ? 10 : edge.index % 2 === expectedIndex % 2 ? 3 : -5;
    return indexScore + scoreCandidate(candidate);
  };
  const oppositeCandidates = candidates.filter((candidate) => {
    const edge = getLoopEdgeKeys(candidate.points).find((item) => item.key === sharedEdge.key);
    return edge && edge.a === sharedEdge.b && edge.b === sharedEdge.a;
  }).map((candidate) => ({
    candidate,
    edge: getLoopEdgeKeys(candidate.points).find((item) => item.key === sharedEdge.key),
  }));
  const opposite = oppositeCandidates.sort((a, b) => scoreSharedEdgeCandidate(b.candidate, b.edge) - scoreSharedEdgeCandidate(a.candidate, a.edge))[0]?.candidate;
  if (opposite) return applyTissueCellLoop(cell, opposite.points, opposite.uv, opposite.sourceCarrierUv, opposite.targetNormals, opposite.shift, opposite.reversed);
  const matched = candidates
    .map((candidate) => ({
      candidate,
      edge: getLoopEdgeKeys(candidate.points).find((item) => item.key === sharedEdge.key),
    }))
    .filter((item) => item.edge)
    .sort((a, b) => scoreSharedEdgeCandidate(b.candidate, b.edge) - scoreSharedEdgeCandidate(a.candidate, a.edge))[0]?.candidate;
  if (matched) return applyTissueCellLoop(cell, matched.points, matched.uv, matched.sourceCarrierUv, matched.targetNormals, matched.shift, matched.reversed);
  const oriented = orientQuadLoopToGuide(cell.uv, cell.points, cell.sourceCarrierUv, cell.targetNormals, guide);
  return applyTissueCellLoop(cell, oriented.targetPoints, oriented.uv, oriented.sourceCarrierUv, oriented.targetNormals, oriented.shift, false);
};

const orientTissueCellsByStrips = (cells, strategy = getActiveStrategy()) => {
  const quadCells = cells?.filter((cell) => cell.points?.length === 4 && cell.uv?.length === 4) || [];
  if (quadCells.length < 2) return cells;
  const edgeOwners = new Map();
  cells.forEach((cell, index) => {
    getLoopEdgeKeys(cell.points).forEach((edge) => {
      if (!edgeOwners.has(edge.key)) edgeOwners.set(edge.key, []);
      edgeOwners.get(edge.key).push({ index, edge });
    });
  });
  const oriented = cells.map((cell) => ({ ...cell }));
  const visited = new Set();
  const seedOrder = cells
    .map((cell, index) => {
      const anchor = polygonCentroidUv(cell.uv || [[0, 0]]);
      const guide = getOrientationGuideUv(anchor, strategy);
      const oriented = orientQuadLoopToGuide(cell.uv, cell.points, cell.sourceCarrierUv, cell.targetNormals, guide);
      const edge = oriented.uv?.length >= 2 ? [oriented.uv[1][0] - oriented.uv[0][0], oriented.uv[1][1] - oriented.uv[0][1]] : [0, 0];
      const edgeLen = Math.hypot(edge[0], edge[1]) || 1;
      const guideLen = Math.hypot(guide[0], guide[1]) || 1;
      const score = Math.abs((edge[0] / edgeLen) * (guide[0] / guideLen) + (edge[1] / edgeLen) * (guide[1] / guideLen));
      return { index, anchor, score };
    })
    .sort((a, b) => b.score - a.score || a.anchor[1] - b.anchor[1] || a.anchor[0] - b.anchor[0]);
  seedOrder.forEach(({ index: seedIndex }) => {
    if (visited.has(seedIndex)) return;
    const seed = oriented[seedIndex];
    const seedGuide = getOrientationGuideUv(polygonCentroidUv(seed.uv), strategy);
    const seedOriented = orientQuadLoopToGuide(seed.uv, seed.points, seed.sourceCarrierUv, seed.targetNormals, seedGuide);
    oriented[seedIndex] = applyTissueCellLoop(seed, seedOriented.targetPoints, seedOriented.uv, seedOriented.sourceCarrierUv, seedOriented.targetNormals, seedOriented.shift, false);
    visited.add(seedIndex);
    const queue = [seedIndex];
    while (queue.length) {
      const currentIndex = queue.shift();
      const current = oriented[currentIndex];
      getLoopEdgeKeys(current.points).forEach((edge) => {
        const owners = edgeOwners.get(edge.key) || [];
        owners.forEach(({ index: neighborIndex }) => {
          if (neighborIndex === currentIndex || visited.has(neighborIndex)) return;
          const neighborGuide = getOrientationGuideUv(polygonCentroidUv(oriented[neighborIndex].uv), strategy);
          oriented[neighborIndex] = pickNeighborTissueOrientation(oriented[neighborIndex], edge, neighborGuide);
          visited.add(neighborIndex);
          queue.push(neighborIndex);
        });
      });
    }
  });
  return oriented;
};

const splitBlockToFanCells = (block) => {
  if (!block.uv || block.uv.length < 4) return [block];
  const center = polygonCentroidUv(block.uv);
  return block.uv.map((point, i) => {
    const next = block.uv[(i + 1) % block.uv.length];
    return {
      ...block,
      id: `${block.id}-F${i + 1}`,
      uv: [center, point, next],
      parentCellId: block.id,
      fillCellType: "fan",
    };
  });
};

const splitBlockToFrameCells = (block) => {
  if (!block.uv || block.uv.length !== 4) return [block];
  const center = polygonCentroidUv(block.uv);
  const inner = block.uv.map((point) => [
    THREE.MathUtils.lerp(point[0], center[0], 0.32),
    THREE.MathUtils.lerp(point[1], center[1], 0.32),
  ]);
  return block.uv.map((point, i) => {
    const nextIndex = (i + 1) % block.uv.length;
    return {
      ...block,
      id: `${block.id}-R${i + 1}`,
      uv: [point, block.uv[nextIndex], inner[nextIndex], inner[i]],
      parentCellId: block.id,
      fillCellType: "frame",
    };
  });
};

const applyStrategyFillMode = (blocks, strategy) => {
  if (strategy.fill === "fan") return blocks.flatMap(splitBlockToFanCells);
  if (strategy.fill === "frame") return blocks.flatMap(splitBlockToFrameCells);
  return blocks.map((block) => ({
    ...block,
    fillCellType: strategy.fill === "patch" ? "patch" : "quad",
  }));
};

const applyPrimalDualTopologyMode = (blocks, strategy) => {
  const cleanBlocks = blocks.filter((block) => block.uv?.length >= 3 && cellHasUsableArea(block.uv, 0.000001));
  const dualLoops = buildNgonDualTopologyUvLoops(cleanBlocks.map((block) => block.uv));
  state.dualPreviewLoops = dualLoops.map((loop) => ({
    uv: loop.uv,
    anchorUv: loop.anchorUv,
    isBoundary: loop.isBoundary,
    valence: loop.valence,
  }));
  if (strategy.topology !== "dual") return blocks;
  const areas = dualLoops.map((loop) => Math.abs(signedUvArea(loop.uv))).filter((area) => area > 0);
  const avgArea = areas.reduce((sum, area) => sum + area, 0) / Math.max(1, areas.length);
  return dualLoops
    .filter((loop) => {
      if (!cellHasUsableArea(loop.uv, 0.000001)) return false;
      if (!strategy.dualBoundaryCleanup) return true;
      if (!loop.isBoundary) return true;
      return Math.abs(signedUvArea(loop.uv)) >= avgArea * 0.12 && loop.uv.length >= 3;
    })
    .map((loop, index) => ({
      id: `DU-${index + 1}`,
      uv: loop.uv,
      anchorUv: loop.anchorUv,
      topologyVertexKey: loop.topologyVertexKey,
      topologyValence: loop.valence,
      topologyBoundary: loop.isBoundary,
      sourceTopologyMode: "dual",
      tessellationStrategy: "strategy dual topology",
  }));
};

const splitBlockForWeightDensity = (block) => {
  const uv = block.uv;
  if (!uv || uv.length !== 4) return [block];
  const midpoint = (a, b, normal = false) => {
    if (a?.clone && b?.clone) {
      const value = a.clone().lerp(b, 0.5);
      return normal && value.lengthSq?.() > 1e-10 ? value.normalize() : value;
    }
    if (Array.isArray(a) && Array.isArray(b)) return a.map((value, index) => (value + b[index]) * 0.5);
    return null;
  };
  const splitLoop = (loop, splitU, normal = false) => {
    if (!loop || loop.length !== 4) return null;
    const m01 = midpoint(loop[0], loop[1], normal);
    const m32 = midpoint(loop[3], loop[2], normal);
    const m12 = midpoint(loop[1], loop[2], normal);
    const m03 = midpoint(loop[0], loop[3], normal);
    return splitU
      ? [[loop[0], m01, m32, loop[3]], [m01, loop[1], loop[2], m32]]
      : [[loop[0], loop[1], m12, m03], [m03, m12, loop[2], loop[3]]];
  };
  const makePieces = (uvPieces, splitU) => {
    const targetPieces = splitLoop(block.targetPoints, splitU);
    const normalPieces = splitLoop(block.targetNormals, splitU, true);
    const carrierPieces = splitLoop(block.sourceCarrierUv, splitU);
    return uvPieces.map((piece, index) => ({
      ...block,
      id: `${block.id}-W${index + 1}`,
      uv: piece,
      anchorUv: polygonCentroidUv(piece),
      targetPoints: targetPieces?.[index] || null,
      targetNormals: normalPieces?.[index] || null,
      sourceCarrierUv: carrierPieces?.[index] || piece.map((point) => [...point]),
      parentCellId: block.parentCellId || block.id,
    }));
  };
  const a = uv[0];
  const b = uv[1];
  const c = uv[2];
  const d = uv[3];
  const uSpan = Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(c[0] - d[0], c[1] - d[1]);
  const vSpan = Math.hypot(d[0] - a[0], d[1] - a[1]) + Math.hypot(c[0] - b[0], c[1] - b[1]);
  if (uSpan >= vSpan) {
    const ab = [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5];
    const dc = [(d[0] + c[0]) * 0.5, (d[1] + c[1]) * 0.5];
    return makePieces([[a, ab, dc, d], [ab, b, c, dc]], true);
  }
  const bc = [(b[0] + c[0]) * 0.5, (b[1] + c[1]) * 0.5];
  const ad = [(a[0] + d[0]) * 0.5, (a[1] + d[1]) * 0.5];
  return makePieces([[a, b, bc, ad], [ad, bc, c, d]], false);
};

const applyFieldDensityToBlocks = (blocks) => {
  if (!state.fieldWeights.driveDensity) return blocks;
  // A mapped custom component owns a 3D carrier cell. Splitting that cell after
  // mapping produces non-conforming component boundaries. Its field response is
  // therefore handled as a continuous component scale in buildCustomPanelMappedGeometry.
  if (state.customPanel?.geometryData) return blocks;
  const maxBlocks = 2600;
  const out = [];
  blocks.forEach((block) => {
    const raw = computeRawSourceWeight(block).sourceWeight;
    const canSplit = block.uv?.length === 4 && Math.abs(signedUvArea(block.uv)) > 0.00006 && out.length + 2 <= maxBlocks;
    if (raw > 0.68 && canSplit) {
      out.push(...splitBlockForWeightDensity(block).map((piece) => ({
        ...piece,
        densityDriven: true,
      })));
    } else if (raw < 0.12 && blocks.length > 48 && deterministicHash(block.id) % 3 === 0) {
      // Lightly thin very low-weight regions so dense strategies read as intentionally graded.
    } else {
      out.push(block);
    }
  });
  return out.length ? out : blocks;
};

const applyStrategyRotationVariation = (blocks, strategy) => blocks.map((block, index) => {
  let shift = 0;
  if (
    strategy.component === "custom" &&
    state.customPanel &&
    block.targetPoints?.length &&
    strategy.rotationVariation === "none"
  ) {
    return {
      ...block,
      rotationShift: block.orientationShift || 0,
    };
  }
  if (strategy.rotationVariation === "alternating") shift = index % Math.max(1, block.uv?.length || 1);
  if (strategy.rotationVariation === "random") shift = deterministicHash(block.id) % Math.max(1, block.uv?.length || 1);
  if (strategy.rotationVariation === "field") {
    const anchor = block.anchorUv || polygonCentroidUv(block.uv || [[0, 0]]);
    shift = Math.round((anchor[0] + anchor[1]) * 3) % Math.max(1, block.uv?.length || 1);
  }
  return {
    ...block,
    uv: shift ? rotateUvLoop(block.uv, shift) : block.uv,
    targetPoints: shift && block.targetPoints ? rotateUvLoop(block.targetPoints, shift) : block.targetPoints,
    rotationShift: shift,
  };
});

const assignStrategyComponentVariants = (blocks, strategy) => blocks.map((block, index) => {
  let variant = strategy.component;
  if (strategy.component === "custom" && state.customPanel) {
    variant = "custom";
  } else if (strategy.componentMode === "family") {
    const family = strategy.component === "keyedVoussoir"
      ? ["keyedVoussoir", "voussoir", "ashlar"]
      : [strategy.component, "ashlar", "keyedVoussoir"];
    variant = family[index % family.length];
  } else if (strategy.componentMode === "zone") {
    const anchor = block.anchorUv || polygonCentroidUv(block.uv || [[0, 0]]);
    const edgeDistance = Math.min(anchor[0], 1 - anchor[0], anchor[1], 1 - anchor[1]);
    variant = edgeDistance < 0.08 ? "keyedVoussoir" : strategy.component;
  }
  return {
    ...block,
    componentVariant: variant,
  };
});

const applyStrategyModesToBlocks = (blocks, strategy) => {
  const densityAdjusted = applyFieldDensityToBlocks(blocks);
  const filled = applyStrategyFillMode(densityAdjusted, strategy);
  const topologized = applyPrimalDualTopologyMode(filled, strategy);
  const rotated = applyStrategyRotationVariation(topologized, strategy);
  return assignStrategyComponentVariants(rotated, strategy);
};

const generatePatternBlocks = () => {
  const definition = getBlockStrategyDefinition();
  const strategy = getActiveStrategy();
  const blocks = applyStrategyModesToBlocks(definition.generate() || [], strategy);
  return blocks.map((block) => ({
    ...block,
    generatorStrategy: definition.id,
    generatorStrategyLabel: definition.label,
  }));
};

const signedUvArea = (uv) => {
  let area = 0;
  for (let i = 0; i < uv.length; i++) {
    const [x0, y0] = uv[i];
    const [x1, y1] = uv[(i + 1) % uv.length];
    area += x0 * y1 - x1 * y0;
  }
  return area * 0.5;
};

const isConvexUv = (uv) => {
  if (uv.length < 4) return true;
  let sign = 0;
  for (let i = 0; i < uv.length; i++) {
    const a = uv[i];
    const b = uv[(i + 1) % uv.length];
    const c = uv[(i + 2) % uv.length];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cross) < 1e-6) continue;
    const nextSign = Math.sign(cross);
    if (!sign) sign = nextSign;
    else if (sign !== nextSign) return false;
  }
  return true;
};

const isDrawableBlockUvLoop = (uv) => {
  if (!Array.isArray(uv) || uv.length < 3) return false;
  return uv.every((point) => Array.isArray(point)
    && point.length >= 2
    && Number.isFinite(Number(point[0]))
    && Number.isFinite(Number(point[1])));
};

const getMasonryThickness = (scale = state.cubeScale) => {
  return Math.max(0.02, state.params.thickness * scale);
};

const buildPrismGeometryFromLoops = (top, bot) => {
  const n = Math.min(top.length, bot.length);
  if (n < 3) throw new Error("not enough vertices for prism");
  const vertices = [...top.slice(0, n), ...bot.slice(0, n)];
  const index = [];
  for (let i = 1; i < n - 1; i++) index.push(0, i, i + 1);
  for (let i = 1; i < n - 1; i++) index.push(n, n + i + 1, n + i);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    index.push(i, n + i, n + j, i, n + j, j);
  }
  const pos = new Float32Array(vertices.length * 3);
  vertices.forEach((v, i) => { pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
};

const getLoopEdgeMetrics = (points) => {
  const edges = points.map((p, i) => p.distanceTo(points[(i + 1) % points.length]));
  const minEdge = Math.min(...edges);
  const avgEdge = edges.reduce((sum, edge) => sum + edge, 0) / Math.max(1, edges.length);
  return { edges, minEdge, avgEdge };
};

const offsetUvTowardCenter = (point, center, amount) => [
  THREE.MathUtils.lerp(point[0], center[0], amount),
  THREE.MathUtils.lerp(point[1], center[1], amount),
];

const edgeOutwardUv = (a, b, center, amount) => {
  const mx = (a[0] + b[0]) * 0.5;
  const my = (a[1] + b[1]) * 0.5;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  let nx = dy / len;
  let ny = -dx / len;
  if ((mx + nx * 0.01 - center[0]) ** 2 + (my + ny * 0.01 - center[1]) ** 2 < (mx - center[0]) ** 2 + (my - center[1]) ** 2) {
    nx *= -1;
    ny *= -1;
  }
  return [nx * amount, ny * amount];
};

const buildKeyedUvLoop = (uv) => {
  if (uv.length !== 4) return uv;
  const center = polygonCentroidUv(uv);
  const a = uv[0];
  const b = uv[1];
  const width = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const depth = clamp(width * 0.12, 0.005, 0.035);
  const out = edgeOutwardUv(a, b, center, depth);
  const pA = [
    THREE.MathUtils.lerp(a[0], b[0], 0.38),
    THREE.MathUtils.lerp(a[1], b[1], 0.38),
  ];
  const pB = [
    THREE.MathUtils.lerp(a[0], b[0], 0.62),
    THREE.MathUtils.lerp(a[1], b[1], 0.62),
  ];
  return [
    a,
    pA,
    [pA[0] + out[0], pA[1] + out[1]],
    [pB[0] + out[0], pB[1] + out[1]],
    pB,
    b,
    uv[2],
    uv[3],
  ];
};

const buildInterlockUvLoop = (uv, blockId = "") => {
  if (uv.length < 3) return uv;
  const center = polygonCentroidUv(uv);
  const parity = deterministicHash(blockId) % 2 ? 1 : -1;
  const loop = [];
  uv.forEach((a, i) => {
    const b = uv[(i + 1) % uv.length];
    const edgeLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const depth = clamp(edgeLen * 0.08, 0.004, 0.025) * (i % 2 ? -parity : parity);
    const out = edgeOutwardUv(a, b, center, depth);
    const mid = [
      (a[0] + b[0]) * 0.5 + out[0],
      (a[1] + b[1]) * 0.5 + out[1],
    ];
    loop.push(a, mid);
  });
  return cleanUvPolygon(loop, 0.000001) || uv;
};

const buildUvBoundingRect = (uv) => {
  const minU = Math.min(...uv.map((p) => p[0]));
  const maxU = Math.max(...uv.map((p) => p[0]));
  const minV = Math.min(...uv.map((p) => p[1]));
  const maxV = Math.max(...uv.map((p) => p[1]));
  return [[minU, minV], [maxU, minV], [maxU, maxV], [minU, maxV]];
};

const buildLocalFrameUvRect = (uv) => {
  const center = polygonCentroidUv(uv);
  let axis = [1, 0];
  let longest = 0;
  for (let i = 0; i < uv.length; i++) {
    const a = uv[i];
    const b = uv[(i + 1) % uv.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len > longest) {
      longest = len;
      axis = [dx / Math.max(1e-9, len), dy / Math.max(1e-9, len)];
    }
  }
  const cross = [-axis[1], axis[0]];
  const local = uv.map((p) => {
    const dx = p[0] - center[0];
    const dy = p[1] - center[1];
    return [dx * axis[0] + dy * axis[1], dx * cross[0] + dy * cross[1]];
  });
  const minS = Math.min(...local.map(([s]) => s));
  const maxS = Math.max(...local.map(([s]) => s));
  const minT = Math.min(...local.map(([, t]) => t));
  const maxT = Math.max(...local.map(([, t]) => t));
  const fromLocal = (s, t) => [
    center[0] + axis[0] * s + cross[0] * t,
    center[1] + axis[1] * s + cross[1] * t,
  ];
  return [
    fromLocal(minS, minT),
    fromLocal(maxS, minT),
    fromLocal(maxS, maxT),
    fromLocal(minS, maxT),
  ];
};

const buildPreservedScaleUvRect = (uv) => {
  const center = polygonCentroidUv(uv);
  const rect = buildUvBoundingRect(uv);
  const cellW = Math.max(0.002, rect[1][0] - rect[0][0]);
  const cellH = Math.max(0.002, rect[2][1] - rect[1][1]);
  const span = Math.max(0.001, state.params.span || 1);
  const length = Math.max(0.001, state.params.length || 1);
  const targetU = clamp((state.targetBlockWidth || state.params.targetBlockWidth || 1.2) / span, 0.004, cellW * 0.92);
  const targetV = clamp((state.params.courseHeight || 0.65) / length, 0.004, cellH * 0.92);
  return [
    [center[0] - targetU * 0.5, center[1] - targetV * 0.5],
    [center[0] + targetU * 0.5, center[1] - targetV * 0.5],
    [center[0] + targetU * 0.5, center[1] + targetV * 0.5],
    [center[0] - targetU * 0.5, center[1] + targetV * 0.5],
  ].map(([u, v]) => [clamp(u, 0, 1), clamp(v, 0, 1)]);
};

const getMappedComponentBaseUv = (block) => {
  const uv = cleanUvPolygon(block.uv, 0.000001) || block.uv;
  const mapping = block.mapping?.scale || state.strategy.scale || "cell-bounds";
  if (!uv?.length) return uv;
  if (mapping === "local-frame") return buildLocalFrameUvRect(uv);
  if (mapping === "global-orientation") return buildUvBoundingRect(uv);
  if (mapping === "preserve-component-scale") return buildPreservedScaleUvRect(uv);
  return uv;
};

const makeDesignedJointUvSampler = (block, tile = state.appliedTileSystem) => {
  const uv = getMappedComponentBaseUv(block);
  if (!tile?.jointType || tile.jointType === "Flat Joint" || !Array.isArray(uv) || uv.length !== 4) return null;
  const isFirstCourse = Number.isFinite(block.courseIndex) && block.courseIndex <= 0;
  const isLastCourse = Number.isFinite(block.courseIndex) &&
    Number.isFinite(block.courseCount) &&
    block.courseIndex >= block.courseCount - 1;
  const host = getHostField();
  const cyclicU = state.vaultType === "Dome";
  const amplitudeM = Math.max(0, Number(tile.amplitude) || 0) / 100;
  const amplitudeBasis = Math.max(1e-6, amplitudeM);
  const maxAmplitudeRatio = clamp((Number(tile.amplitude) || 0) / Math.max(1, Number(tile.height) || Number(tile.width) || 100), 0, 0.18);
  const lerpUv = (a, b, t) => [
    THREE.MathUtils.lerp(a[0], b[0], t),
    THREE.MathUtils.lerp(a[1], b[1], t),
  ];
  return {
    uv,
    isFirstCourse,
    isLastCourse,
    sampleUvAt: (courseT, runT) => {
      const leftBase = lerpUv(uv[0], uv[3], runT);
      const rightBase = lerpUv(uv[1], uv[2], runT);
      let axisU = rightBase[0] - leftBase[0];
      let axisV = rightBase[1] - leftBase[1];
      const axisLen = Math.hypot(axisU, axisV) || 1;
      axisU /= axisLen;
      axisV /= axisLen;
      const leftPoint = host.pointAt(cyclicU ? wrap01(leftBase[0]) : clamp(leftBase[0], 0, 1), clamp(leftBase[1], 0, 1));
      const rightPoint = host.pointAt(cyclicU ? wrap01(rightBase[0]) : clamp(rightBase[0], 0, 1), clamp(rightBase[1], 0, 1));
      const physicalAxisLen = Math.max(1e-6, leftPoint.distanceTo(rightPoint));
      const jointShape = getBdJointOffset(runT, tile) / amplitudeBasis;
      const amplitudeRatio = Math.min(amplitudeM / physicalAxisLen, maxAmplitudeRatio);
      const jointOffset = jointShape * amplitudeRatio * axisLen;
      const left = isFirstCourse
        ? leftBase
        : [leftBase[0] + axisU * jointOffset, leftBase[1] + axisV * jointOffset];
      const right = isLastCourse
        ? rightBase
        : [rightBase[0] + axisU * jointOffset, rightBase[1] + axisV * jointOffset];
      return [
        clamp(THREE.MathUtils.lerp(left[0], right[0], courseT), 0, 1),
        clamp(THREE.MathUtils.lerp(left[1], right[1], courseT), 0, 1),
      ];
    },
  };
};

const buildDesignedJointUvLoop = (block, tile = state.appliedTileSystem) => {
  const uv = getMappedComponentBaseUv(block);
  if (!tile || !uv?.length || tile.jointType === "Flat Joint") return uv;
  const designedSampler = makeDesignedJointUvSampler(block, tile);
  if (designedSampler) {
    const samples = Math.max(24, Math.min(72, Math.round((tile.frequency || 3) * 18)));
    const loop = [
      designedSampler.sampleUvAt(0, 0),
      designedSampler.sampleUvAt(1, 0),
    ];
    for (let i = 1; i < samples; i++) loop.push(designedSampler.sampleUvAt(1, i / samples));
    loop.push(designedSampler.sampleUvAt(1, 1), designedSampler.sampleUvAt(0, 1));
    for (let i = samples - 1; i > 0; i--) loop.push(designedSampler.sampleUvAt(0, i / samples));
    return cleanUvPolygon(loop, 0.000001) || uv;
  }
  const samples = Math.max(24, Math.min(72, Math.round((tile.frequency || 3) * 18)));
  const depthScale = clamp((tile.depth || 35) / 520, 0.018, 0.07);
  const isFirstCourse = Number.isFinite(block.courseIndex) && block.courseIndex <= 0;
  const isLastCourse = Number.isFinite(block.courseIndex) &&
    Number.isFinite(block.courseCount) &&
    block.courseIndex >= block.courseCount - 1;
  const edgeShouldMorph = (edgeIndex) => {
    if (uv.length !== 4) return edgeIndex % 2 === 0;
    if (edgeIndex === 1) return !isLastCourse;
    if (edgeIndex === 3) return !isFirstCourse;
    return false;
  };
  const morphPoint = (a, b, edgeIndex, t) => {
    const edgeLen = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const offset = getBdJointOffset(t, tile) * edgeLen * depthScale;
    const baseU = a[0] + (b[0] - a[0]) * t;
    const baseV = a[1] + (b[1] - a[1]) * t;
    if (uv.length === 4 && (edgeIndex === 1 || edgeIndex === 3)) {
      return [clamp(baseU + offset, 0, 1), clamp(baseV, 0, 1)];
    }
    const center = polygonCentroidUv(uv);
    const out = edgeOutwardUv(a, b, center, 1);
    return [clamp(baseU + out[0] * offset, 0, 1), clamp(baseV + out[1] * offset, 0, 1)];
  };
  const loop = [];
  uv.forEach((a, edgeIndex) => {
    const b = uv[(edgeIndex + 1) % uv.length];
    loop.push([clamp(a[0], 0, 1), clamp(a[1], 0, 1)]);
    if (!edgeShouldMorph(edgeIndex)) return;
    for (let i = 1; i < samples; i++) {
      loop.push(morphPoint(a, b, edgeIndex, i / samples));
    }
  });
  return cleanUvPolygon(loop, 0.000001) || uv;
};

const getComponentUvLoop = (block) => {
  if (
    block.targetPoints?.length >= 3 &&
    (block.componentVariant || block.componentType || state.strategy.component) === "custom"
  ) {
    return block.sourceCarrierUv || block.uv;
  }
  const uv = getMappedComponentBaseUv(block);
  if (state.appliedTileSystem?.jointType && state.appliedTileSystem.jointType !== "Flat Joint") {
    return buildDesignedJointUvLoop(block, state.appliedTileSystem);
  }
  const component = block.componentVariant || block.componentType || state.strategy.component;
  if (component === "keyedVoussoir") return buildKeyedUvLoop(uv);
  if (component === "interlock") return buildInterlockUvLoop(uv, block.id);
  if (component === "ashlar") {
    const center = polygonCentroidUv(uv);
    return uv.map((point) => offsetUvTowardCenter(point, center, 0.03));
  }
  return uv;
};

const getBlockThicknessForComponent = (block, baseThickness = getMasonryThickness()) => {
  const component = block.componentVariant || block.componentType || state.strategy.component;
  let factor = 1;
  if (component === "ashlar") factor *= 0.82;
  if (component === "keyedVoussoir") factor *= 1.08;
  if (component === "interlock") factor *= 1.02;
  if (state.fieldWeights.driveThickness) {
    const w = block.fieldWeights?.smoothedWeight ?? block.fieldWeights?.sourceWeight ?? 0.5;
    factor *= THREE.MathUtils.lerp(0.78, 1.28, clamp(w, 0, 1));
  }
  return baseThickness * factor;
};

const getVaultSample = (u, v, cyclicU = state.vaultType === "Dome") => {
  const uu = cyclicU ? wrap01(u) : clamp(u, 0, 1);
  const vv = clamp(v, 0, 1);
  const point = getVaultPoint(uu, vv);
  let normal = getVaultSurfaceNormal(uu, vv, cyclicU);
  if (normal.y < 0) normal = normal.multiplyScalar(-1);
  return { point, normal };
};

const buildDesignedJointOverlay = (block, tile = state.appliedTileSystem, thickness = getBlockThicknessForComponent(block)) => {
  if (!tile?.jointType || tile.jointType === "Flat Joint") return null;
  const designedSampler = makeDesignedJointUvSampler(block, tile);
  const uv = designedSampler?.uv || getMappedComponentBaseUv(block);
  if (!Array.isArray(uv) || uv.length < 3) return null;
  const host = getHostField();
  const cyclicU = state.vaultType === "Dome";
  const samples = Math.max(32, Math.min(96, Math.round((tile.frequency || 3) * 24)));
  const depthScale = clamp((tile.depth || 35) / 520, 0.018, 0.07);
  const isFirstCourse = Number.isFinite(block.courseIndex) && block.courseIndex <= 0;
  const points = [];
  const makePointFromUv = ([u, v]) => {
    const p = host.pointAt(cyclicU ? wrap01(u) : clamp(u, 0, 1), clamp(v, 0, 1));
    const n = host.normalAt(cyclicU ? wrap01(u) : clamp(u, 0, 1), clamp(v, 0, 1)).clone();
    if (n.y < 0) n.multiplyScalar(-1);
    return p.clone().addScaledVector(n, thickness + 0.006);
  };
  const makeFallbackPoint = (a, b, edgeIndex, t) => {
    const edgeLen = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const offset = getBdJointOffset(t, tile) * edgeLen * depthScale;
    const u = clamp(a[0] + (b[0] - a[0]) * t + offset, 0, 1);
    const v = clamp(a[1] + (b[1] - a[1]) * t, 0, 1);
    return makePointFromUv([u, v]);
  };
  if (designedSampler) {
    if (designedSampler.isFirstCourse) return null;
    for (let i = 0; i < samples; i++) {
      points.push(makePointFromUv(designedSampler.sampleUvAt(0, i / samples)));
      points.push(makePointFromUv(designedSampler.sampleUvAt(0, (i + 1) / samples)));
    }
  } else {
  uv.forEach((a, edgeIndex) => {
    const isBedEdge = uv.length === 4
      ? edgeIndex === 3 && !isFirstCourse
      : edgeIndex % 2 === 0;
    if (!isBedEdge) return;
    const b = uv[(edgeIndex + 1) % uv.length];
    for (let i = 0; i < samples; i++) {
      points.push(makeFallbackPoint(a, b, edgeIndex, i / samples));
      points.push(makeFallbackPoint(a, b, edgeIndex, (i + 1) / samples));
    }
  });
  }
  if (points.length < 2) return null;
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0x1d2a22, transparent: true, opacity: 0.96 })
  );
  line.name = "designed-joint-profile";
  line.renderOrder = 15;
  line.frustumCulled = false;
  return line;
};

const buildAppliedBlockHeadSeams = (block, thickness = getBlockThicknessForComponent(block)) => {
  const designedSampler = makeDesignedJointUvSampler(block, state.appliedTileSystem);
  const uv = designedSampler?.uv || getMappedComponentBaseUv(block);
  if (!Array.isArray(uv) || uv.length !== 4) return null;
  const host = getHostField();
  const cyclicU = state.vaultType === "Dome";
  const sample = ([u, v]) => {
    const uu = cyclicU ? wrap01(u) : clamp(u, 0, 1);
    const vv = clamp(v, 0, 1);
    const point = host.pointAt(uu, vv);
    const normal = host.normalAt(uu, vv).clone();
    if (normal.y < 0) normal.multiplyScalar(-1);
    return point.clone().addScaledVector(normal, thickness + 0.008);
  };
  let points;
  if (designedSampler) {
    const segments = 6;
    points = [];
    for (let i = 0; i < segments; i++) {
      points.push(sample(designedSampler.sampleUvAt(i / segments, 0)));
      points.push(sample(designedSampler.sampleUvAt((i + 1) / segments, 0)));
      points.push(sample(designedSampler.sampleUvAt(i / segments, 1)));
      points.push(sample(designedSampler.sampleUvAt((i + 1) / segments, 1)));
    }
  } else {
    points = [
      sample(uv[0]), sample(uv[1]),
      sample(uv[2]), sample(uv[3]),
    ];
  }
  const line = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x1d2a22, transparent: true, opacity: 0.7 })
  );
  line.name = "applied-head-seams";
  line.renderOrder = 14;
  line.frustumCulled = false;
  return line;
};

const createHostField = () => {
  const isUploaded = state.designMode === "Custom Import" && state.vaultType === "Custom Imported Rhino Surface" && state.importedSurface;
  const cyclicU = state.vaultType === "Dome";
  const sampleAt = (u, v) => {
    const uu = cyclicU ? wrap01(u) : clamp(u, 0, 1);
    const vv = clamp(v, 0, 1);
    if (isUploaded) {
      const sample = getImportedSurfaceSample(uu, vv) || getImportedSurfaceSampleNear(uu, vv, 0.5, 0.5);
      if (sample) return sample;
    }
    return getVaultSample(uu, vv, cyclicU);
  };
  return {
    type: isUploaded ? "uploaded-surface" : state.vaultType,
    pointAt: (u, v) => sampleAt(u, v)?.point || new THREE.Vector3(),
    normalAt: (u, v) => sampleAt(u, v)?.normal || new THREE.Vector3(0, 1, 0),
    frameAt: (u, v) => {
      const sample = sampleAt(u, v);
      const normal = sample?.normal?.clone()?.normalize() || new THREE.Vector3(0, 1, 0);
      const eps = 0.002;
      const pU0 = sampleAt(u - eps, v)?.point || sample?.point || new THREE.Vector3();
      const pU1 = sampleAt(u + eps, v)?.point || sample?.point || new THREE.Vector3();
      const pV0 = sampleAt(u, v - eps)?.point || sample?.point || new THREE.Vector3();
      const pV1 = sampleAt(u, v + eps)?.point || sample?.point || new THREE.Vector3();
      const tangentU = pU1.clone().sub(pU0);
      if (tangentU.lengthSq() < 1e-10) tangentU.set(1, 0, 0);
      tangentU.normalize();
      const tangentV = pV1.clone().sub(pV0);
      if (tangentV.lengthSq() < 1e-10) tangentV.crossVectors(normal, tangentU);
      tangentV.normalize();
      return { point: sample?.point || new THREE.Vector3(), normal, tangentU, tangentV };
    },
    curvatureAt: (u, v) => {
      if (isUploaded) {
        const intensity = getImportedMeshCurvatureIntensity(clamp(u, 0, 1), clamp(v, 0, 1));
        if (intensity != null) return { ku: intensity * 4.2, kv: intensity * 4.2, intensity };
      }
      const eps = 0.01;
      const n = sampleAt(u, v)?.normal || new THREE.Vector3(0, 1, 0);
      const nU = sampleAt(u + eps, v)?.normal || n;
      const nV = sampleAt(u, v + eps)?.normal || n;
      return {
        ku: n.angleTo(nU) / eps,
        kv: n.angleTo(nV) / eps,
      };
    },
    boundaryAt: (u, v, tolerance = 1e-4) => ({
      uMin: u <= tolerance,
      uMax: u >= 1 - tolerance,
      vMin: v <= tolerance,
      vMax: v >= 1 - tolerance,
      onBoundary: u <= tolerance || u >= 1 - tolerance || v <= tolerance || v >= 1 - tolerance,
    }),
  };
};

const getHostField = () => createHostField();

const bilerpUvInQuad = (uv, su, sv) => {
  const bottom = [
    THREE.MathUtils.lerp(uv[0][0], uv[1][0], su),
    THREE.MathUtils.lerp(uv[0][1], uv[1][1], su),
  ];
  const top = [
    THREE.MathUtils.lerp(uv[3][0], uv[2][0], su),
    THREE.MathUtils.lerp(uv[3][1], uv[2][1], su),
  ];
  return [
    THREE.MathUtils.lerp(bottom[0], top[0], sv),
    THREE.MathUtils.lerp(bottom[1], top[1], sv),
  ];
};

const smoothPatchSamples = (samples, gridU, gridV, iterations) => {
  let current = samples.map((sample) => ({
    point: sample.point.clone(),
    normal: sample.normal.clone().normalize(),
  }));
  const rowSize = gridU + 1;
  const idx = (x, y) => y * rowSize + x;
  for (let iter = 0; iter < iterations; iter++) {
    const next = current.map((sample) => ({
      point: sample.point.clone(),
      normal: sample.normal.clone(),
    }));
    for (let y = 1; y < gridV; y++) {
      for (let x = 1; x < gridU; x++) {
        const neighbors = [
          current[idx(x, y)],
          current[idx(x - 1, y)],
          current[idx(x + 1, y)],
          current[idx(x, y - 1)],
          current[idx(x, y + 1)],
        ];
        const point = neighbors.reduce((sum, sample) => sum.add(sample.point), new THREE.Vector3()).multiplyScalar(1 / neighbors.length);
        const normal = neighbors.reduce((sum, sample) => sum.add(sample.normal), new THREE.Vector3()).normalize();
        next[idx(x, y)].point.lerp(point, 0.35);
        next[idx(x, y)].normal.copy(normal);
      }
    }
    current = next;
  }
  return current;
};

const buildSampledVaultPatchGeometry = (uv, thickness, options = {}) => {
  const host = getHostField();
  const gridU = clamp(Math.round(options.subdivision ?? state.strategy.patchSubdivision ?? 4), 2, 12);
  const gridV = gridU;
  const smoothing = clamp(Math.round(options.smoothing ?? state.strategy.patchSmoothing ?? 0), 0, 4);
  if (uv.length !== 4) {
    if (uv.length < 3) return null;
    const centerUv = polygonCentroidUv(uv);
    const boundaryUv = [];
    for (let i = 0; i < uv.length; i++) {
      const a = uv[i];
      const b = uv[(i + 1) % uv.length];
      for (let s = 0; s < gridU; s++) {
        const t = s / gridU;
        boundaryUv.push([
          THREE.MathUtils.lerp(a[0], b[0], t),
          THREE.MathUtils.lerp(a[1], b[1], t),
        ]);
      }
    }
    const center = { point: host.pointAt(centerUv[0], centerUv[1]), normal: host.normalAt(centerUv[0], centerUv[1]) };
    const boundary = boundaryUv.map(([u, v]) => ({ point: host.pointAt(u, v), normal: host.normalAt(u, v) }));
    const top = [
      center.point.clone().addScaledVector(center.normal, thickness),
      ...boundary.map((sample) => sample.point.clone().addScaledVector(sample.normal, thickness)),
    ];
    const bot = [
      center.point.clone(),
      ...boundary.map((sample) => sample.point.clone()),
    ];
    const vertices = [...top, ...bot];
    const n = boundary.length;
    const botOffset = top.length;
    const index = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      index.push(0, i + 1, j + 1);
      index.push(botOffset, botOffset + j + 1, botOffset + i + 1);
      index.push(i + 1, botOffset + i + 1, botOffset + j + 1, i + 1, botOffset + j + 1, j + 1);
    }
    const pos = new Float32Array(vertices.length * 3);
    vertices.forEach((point, i) => { pos[i * 3] = point.x; pos[i * 3 + 1] = point.y; pos[i * 3 + 2] = point.z; });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    return {
      geometry,
      bot,
      cornerBot: boundary.map((sample) => sample.point.clone()),
      smooth: true,
    };
  }
  const samples = [];
  for (let y = 0; y <= gridV; y++) {
    for (let x = 0; x <= gridU; x++) {
      const [u, v] = bilerpUvInQuad(uv, x / gridU, y / gridV);
      samples.push({
        point: host.pointAt(u, v),
        normal: host.normalAt(u, v),
      });
    }
  }
  const shapedSamples = smoothing ? smoothPatchSamples(samples, gridU, gridV, smoothing) : samples;
  const top = shapedSamples.map((sample) => sample.point.clone().addScaledVector(sample.normal, thickness));
  const bot = shapedSamples.map((sample) => sample.point.clone());
  const vertices = [...top, ...bot];
  const topOffset = 0;
  const botOffset = top.length;
  const rowSize = gridU + 1;
  const idx = (x, y, offset = topOffset) => offset + y * rowSize + x;
  const index = [];
  const addQuad = (a, b, c, d, flip = false) => {
    if (flip) index.push(a, c, b, a, d, c);
    else index.push(a, b, c, a, c, d);
  };
  for (let y = 0; y < gridV; y++) {
    for (let x = 0; x < gridU; x++) {
      addQuad(idx(x, y), idx(x + 1, y), idx(x + 1, y + 1), idx(x, y + 1));
      addQuad(idx(x, y, botOffset), idx(x + 1, y, botOffset), idx(x + 1, y + 1, botOffset), idx(x, y + 1, botOffset), true);
    }
  }
  for (let x = 0; x < gridU; x++) {
    addQuad(idx(x, 0), idx(x, 0, botOffset), idx(x + 1, 0, botOffset), idx(x + 1, 0));
    addQuad(idx(x + 1, gridV), idx(x + 1, gridV, botOffset), idx(x, gridV, botOffset), idx(x, gridV));
  }
  for (let y = 0; y < gridV; y++) {
    addQuad(idx(0, y + 1), idx(0, y + 1, botOffset), idx(0, y, botOffset), idx(0, y));
    addQuad(idx(gridU, y), idx(gridU, y, botOffset), idx(gridU, y + 1, botOffset), idx(gridU, y + 1));
  }
  const pos = new Float32Array(vertices.length * 3);
  vertices.forEach((point, i) => { pos[i * 3] = point.x; pos[i * 3 + 1] = point.y; pos[i * 3 + 2] = point.z; });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return {
    geometry,
    bot,
    cornerBot: [bot[idx(0, 0)], bot[idx(gridU, 0)], bot[idx(gridU, gridV)], bot[idx(0, gridV)]],
  };
};

const buildDesignedJointSampledBlockGeometry = (block, thickness, tile = state.appliedTileSystem) => {
  if (!tile?.jointType || tile.jointType === "Flat Joint") return null;
  const designedSampler = makeDesignedJointUvSampler(block, tile);
  if (!designedSampler) return null;
  const host = getHostField();
  const cyclicU = state.vaultType === "Dome";
  const runSegments = Math.max(24, Math.min(56, Math.round((tile.frequency || 3) * 18)));
  const courseSegments = 6;
  const samples = [];
  for (let y = 0; y <= runSegments; y++) {
    for (let x = 0; x <= courseSegments; x++) {
      const [u, v] = designedSampler.sampleUvAt(x / courseSegments, y / runSegments);
      const uu = cyclicU ? wrap01(u) : u;
      const sample = {
        point: host.pointAt(uu, v),
        normal: host.normalAt(uu, v).clone(),
      };
      if (sample.normal.y < 0) sample.normal.multiplyScalar(-1);
      samples.push(sample);
    }
  }
  const top = samples.map((sample) => sample.point.clone().addScaledVector(sample.normal, thickness));
  const bot = samples.map((sample) => sample.point.clone());
  const vertices = [...top, ...bot];
  const topOffset = 0;
  const botOffset = top.length;
  const rowSize = courseSegments + 1;
  const idx = (x, y, offset = topOffset) => offset + y * rowSize + x;
  const index = [];
  const addQuad = (a, b, c, d, flip = false) => {
    if (flip) index.push(a, c, b, a, d, c);
    else index.push(a, b, c, a, c, d);
  };
  for (let y = 0; y < runSegments; y++) {
    for (let x = 0; x < courseSegments; x++) {
      addQuad(idx(x, y), idx(x + 1, y), idx(x + 1, y + 1), idx(x, y + 1));
      addQuad(idx(x, y, botOffset), idx(x + 1, y, botOffset), idx(x + 1, y + 1, botOffset), idx(x, y + 1, botOffset), true);
    }
  }
  for (let x = 0; x < courseSegments; x++) {
    addQuad(idx(x, 0), idx(x, 0, botOffset), idx(x + 1, 0, botOffset), idx(x + 1, 0));
    addQuad(idx(x + 1, runSegments), idx(x + 1, runSegments, botOffset), idx(x, runSegments, botOffset), idx(x, runSegments));
  }
  for (let y = 0; y < runSegments; y++) {
    addQuad(idx(0, y + 1), idx(0, y + 1, botOffset), idx(0, y, botOffset), idx(0, y));
    addQuad(idx(courseSegments, y), idx(courseSegments, y, botOffset), idx(courseSegments, y + 1, botOffset), idx(courseSegments, y + 1));
  }
  const pos = new Float32Array(vertices.length * 3);
  vertices.forEach((point, i) => {
    pos[i * 3] = point.x;
    pos[i * 3 + 1] = point.y;
    pos[i * 3 + 2] = point.z;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return {
    geometry,
    bot,
    cornerBot: [bot[idx(0, 0)], bot[idx(courseSegments, 0)], bot[idx(courseSegments, runSegments)], bot[idx(0, runSegments)]],
    uvLoop: buildDesignedJointUvLoop(block, tile),
    smooth: true,
  };
};

const buildImportedSampledBlockGeometry = (block, thickness, anchorU, anchorV, requireDirectSamples = false) => {
  const uv = block.uv;
  const readSample = (u, v) => {
    const cu = clamp(u, 0, 1);
    const cv = clamp(v, 0, 1);
    return requireDirectSamples
      ? getImportedSurfaceSample(cu, cv)
      : getImportedSurfaceSampleNear(cu, cv, anchorU, anchorV);
  };
  if (uv.length !== 4) {
    const edgeSubdiv = 3;
    const boundaryUv = [];
    for (let i = 0; i < uv.length; i++) {
      const a = uv[i];
      const b = uv[(i + 1) % uv.length];
      for (let s = 0; s < edgeSubdiv; s++) {
        const t = s / edgeSubdiv;
        boundaryUv.push([
          THREE.MathUtils.lerp(a[0], b[0], t),
          THREE.MathUtils.lerp(a[1], b[1], t),
        ]);
      }
    }
    const centerUv = block.anchorUv || polygonCentroidUv(uv);
    const centerSample = readSample(centerUv[0], centerUv[1]);
    if (!centerSample) return null;
    const boundarySamples = boundaryUv.map(([u, v]) => readSample(u, v));
    if (boundarySamples.some((sample) => !sample)) return null;
    const top = [
      centerSample.point.clone().addScaledVector(centerSample.normal, thickness),
      ...boundarySamples.map((sample) => sample.point.clone().addScaledVector(sample.normal, thickness)),
    ];
    const bot = [
      centerSample.point.clone(),
      ...boundarySamples.map((sample) => sample.point.clone()),
    ];
    const vertices = [...top, ...bot];
    const n = boundarySamples.length;
    const botOffset = top.length;
    const index = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      index.push(0, i + 1, j + 1);
      index.push(botOffset, botOffset + j + 1, botOffset + i + 1);
      index.push(i + 1, botOffset + i + 1, botOffset + j + 1, i + 1, botOffset + j + 1, j + 1);
    }
    const pos = new Float32Array(vertices.length * 3);
    vertices.forEach((v, i) => { pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    return {
      geometry,
      bot,
      cornerBot: boundarySamples.map((sample) => sample.point.clone()),
      smooth: true,
    };
  }
  const gridU = clamp(Math.round(state.strategy.patchSubdivision || 4), 2, 12);
  const gridV = gridU;
  const sampleAt = (su, sv) => {
    const bottom = [
      THREE.MathUtils.lerp(uv[0][0], uv[1][0], su),
      THREE.MathUtils.lerp(uv[0][1], uv[1][1], su),
    ];
    const top = [
      THREE.MathUtils.lerp(uv[3][0], uv[2][0], su),
      THREE.MathUtils.lerp(uv[3][1], uv[2][1], su),
    ];
    return [
      THREE.MathUtils.lerp(bottom[0], top[0], sv),
      THREE.MathUtils.lerp(bottom[1], top[1], sv),
    ];
  };
  const samples = [];
  for (let y = 0; y <= gridV; y++) {
    for (let x = 0; x <= gridU; x++) {
      const [u, v] = sampleAt(x / gridU, y / gridV);
      const sample = readSample(u, v);
      if (!sample) return null;
      samples.push(sample);
    }
  }
  const top = samples.map((sample) => sample.point.clone().addScaledVector(sample.normal, thickness));
  const bot = samples.map((sample) => sample.point.clone());
  const vertices = [...top, ...bot];
  const topOffset = 0;
  const botOffset = top.length;
  const rowSize = gridU + 1;
  const idx = (x, y, offset = topOffset) => offset + y * rowSize + x;
  const index = [];
  const addQuad = (a, b, c, d, flip = false) => {
    if (flip) index.push(a, c, b, a, d, c);
    else index.push(a, b, c, a, c, d);
  };
  for (let y = 0; y < gridV; y++) {
    for (let x = 0; x < gridU; x++) {
      addQuad(idx(x, y), idx(x + 1, y), idx(x + 1, y + 1), idx(x, y + 1));
      addQuad(idx(x, y, botOffset), idx(x + 1, y, botOffset), idx(x + 1, y + 1, botOffset), idx(x, y + 1, botOffset), true);
    }
  }
  for (let x = 0; x < gridU; x++) {
    addQuad(idx(x, 0), idx(x, 0, botOffset), idx(x + 1, 0, botOffset), idx(x + 1, 0));
    addQuad(idx(x + 1, gridV), idx(x + 1, gridV, botOffset), idx(x, gridV, botOffset), idx(x, gridV));
  }
  for (let y = 0; y < gridV; y++) {
    addQuad(idx(0, y + 1), idx(0, y + 1, botOffset), idx(0, y, botOffset), idx(0, y));
    addQuad(idx(gridU, y), idx(gridU, y, botOffset), idx(gridU, y + 1, botOffset), idx(gridU, y + 1));
  }
  const pos = new Float32Array(vertices.length * 3);
  vertices.forEach((v, i) => { pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return {
    geometry,
    bot,
    cornerBot: [bot[idx(0, 0)], bot[idx(gridU, 0)], bot[idx(gridU, gridV)], bot[idx(0, gridV)]],
    smooth: true,
  };
};

const buildBlockMesh = (block) => {
  const sourceUv = getComponentUvLoop(block);
  const t = getBlockThicknessForComponent(block);
  const cyclicU = state.vaultType === "Dome";
  const host = getHostField();
  const useImportedSurface =
    state.designMode === "Custom Import" &&
    state.vaultType === "Custom Imported Rhino Surface" &&
    state.importedSurface;
  const useCustomPanel =
    (block.componentVariant || block.componentType || state.strategy.component) === "custom" &&
    state.customPanel?.geometryData;
  if (useCustomPanel) {
    const mappedPanel = buildCustomPanelMappedGeometry(block, sourceUv, t, !!useImportedSurface);
    if (mappedPanel) {
      const { minEdge, avgEdge } = getLoopEdgeMetrics(mappedPanel.q);
      const box = mappedPanel.geometry.boundingBox || new THREE.Box3().setFromBufferAttribute(mappedPanel.geometry.getAttribute("position"));
      const size = box.getSize(new THREE.Vector3());
      const avgLength = Math.max(size.x, size.z, avgEdge);
      const avgWidth = Math.max(Math.min(size.x || avgEdge, size.z || avgEdge), minEdge);
      const volume = Math.max(0.0001, avgLength * avgWidth * t);
      return {
        geometry: mappedPanel.geometry,
        q: mappedPanel.q,
        avgLength,
        avgWidth,
        volume,
        weight: volume * densityKgPerM3,
        minEdge,
        uvArea: Math.abs(signedUvArea(sourceUv)),
        isConvex: isConvexUv(sourceUv),
        jointFaceType: `custom uploaded panel ${state.customPanel.name}`,
        customPanelSource: state.customPanel.name,
      };
    }
  }
  const useDesignedJointSampler = !useImportedSurface &&
    !useCustomPanel &&
    state.appliedTileSystem?.jointType &&
    state.appliedTileSystem.jointType !== "Flat Joint";
  if (useDesignedJointSampler) {
    const sampledDesignedBlock = buildDesignedJointSampledBlockGeometry(block, t, state.appliedTileSystem);
    if (sampledDesignedBlock) {
      const metricsLoop = sampledDesignedBlock.cornerBot || sampledDesignedBlock.bot;
      const { edges, minEdge, avgEdge } = getLoopEdgeMetrics(metricsLoop);
      const box = sampledDesignedBlock.geometry.boundingBox || new THREE.Box3().setFromBufferAttribute(sampledDesignedBlock.geometry.getAttribute("position"));
      const size = box.getSize(new THREE.Vector3());
      const avgLength = Math.max(size.x, size.z, avgEdge);
      const avgWidth = Math.max(Math.min(size.x || avgEdge, size.z || avgEdge), minEdge);
      const uvLoop = sampledDesignedBlock.uvLoop || sourceUv;
      const volume = Math.max(0.0001, avgLength * avgWidth * t);
      return {
        geometry: sampledDesignedBlock.geometry,
        q: metricsLoop,
        avgLength,
        avgWidth,
        volume,
        weight: volume * densityKgPerM3,
        minEdge: Math.min(...edges),
        uvArea: Math.abs(signedUvArea(uvLoop)),
        isConvex: isConvexUv(uvLoop),
        jointFaceType: `subdivided sampled ${state.appliedTileSystem.jointType.toLowerCase()} block`,
      };
    }
  }
  if (useImportedSurface) {
    const importBlock = { ...block, uv: sourceUv };
    const centerU = sourceUv.reduce((sum, [u]) => sum + u, 0) / sourceUv.length;
    const centerV = sourceUv.reduce((sum, [, v]) => sum + v, 0) / sourceUv.length;
    let anchorU = clamp(block.anchorUv?.[0] ?? centerU, 0, 1);
    let anchorV = clamp(block.anchorUv?.[1] ?? centerV, 0, 1);
    if (!getImportedSurfaceSample(anchorU, anchorV)) {
      const edgeSamples = sourceUv.map((p, i) => [
        (p[0] + sourceUv[(i + 1) % sourceUv.length][0]) * 0.5,
        (p[1] + sourceUv[(i + 1) % sourceUv.length][1]) * 0.5,
      ]);
      const fallback = [[centerU, centerV], ...sourceUv, ...edgeSamples]
        .map(([u, v]) => [clamp(u, 0, 1), clamp(v, 0, 1)])
        .find(([u, v]) => getImportedSurfaceSample(u, v));
      if (fallback) [anchorU, anchorV] = fallback;
    }
    const sampledPatch = buildImportedSampledBlockGeometry(importBlock, t, anchorU, anchorV, !!block.requireDirectSurfaceSamples);
    let geometry;
    let bot;
    if (sampledPatch) {
      geometry = sampledPatch.geometry;
      bot = sampledPatch.cornerBot;
    } else {
      const samples = sourceUv.map(([u, v]) => (
        block.requireDirectSurfaceSamples
          ? getImportedSurfaceSample(clamp(u, 0, 1), clamp(v, 0, 1))
          : getImportedSurfaceSampleNear(clamp(u, 0, 1), clamp(v, 0, 1), anchorU, anchorV)
      ));
      if (samples.some((sample) => !sample)) throw new Error("block does not fully land on imported surface");
      bot = samples.map((sample) => sample.point);
      const top = samples.map((sample) => sample.point.clone().addScaledVector(sample.normal, t));
      geometry = buildPrismGeometryFromLoops(top, bot);
    }
    const { minEdge, avgEdge } = getLoopEdgeMetrics(bot);
    const box = new THREE.Box3().setFromPoints(bot);
    const size = box.getSize(new THREE.Vector3());
    const avgLength = Math.max(size.x, size.z, avgEdge);
    const avgWidth = Math.max(Math.min(size.x || avgEdge, size.z || avgEdge), minEdge);
    const volume = Math.max(0.0001, Math.abs(signedUvArea(sourceUv)) * (state.importedSurfaceBbox?.getSize(new THREE.Vector3()).x || 1) * (state.importedSurfaceBbox?.getSize(new THREE.Vector3()).z || 1) * t);
    return {
      geometry,
      q: bot,
      avgLength,
      avgWidth,
      volume,
      weight: volume * densityKgPerM3,
      minEdge,
      uvArea: Math.abs(signedUvArea(sourceUv)),
      isConvex: isConvexUv(sourceUv),
      jointFaceType: sampledPatch ? `trimmed sampled imported-surface ${block.componentVariant || "voussoir"}` : `imported surface normal-offset ${block.componentVariant || "voussoir"}`,
    };
  }
  const q = sourceUv.map(([u, v]) => host.pointAt(cyclicU ? wrap01(u) : clamp(u, 0, 1), clamp(v, 0, 1)));
  let top;
  let bot;
  let jointFaceType = "ruled";
  let geometry = null;
  if (block.fillCellType === "patch" && sourceUv.length >= 3 && state.vaultType !== "Groin Vault") {
    const sampled = buildSampledVaultPatchGeometry(sourceUv, t);
    if (sampled) {
      geometry = sampled.geometry;
      bot = sampled.cornerBot;
      jointFaceType = `curved patch ${block.componentVariant || "voussoir"}`;
    }
  }
  if (!geometry && state.vaultType === "Groin Vault") {
    top = sourceUv.map(([u, v]) => {
      return getGroinSupportAdjustedPoint(clamp(u, 0, 1), clamp(v, 0, 1), { surface: "extrados" });
    });
    bot = sourceUv.map(([u, v]) => {
      return getGroinSupportAdjustedPoint(clamp(u, 0, 1), clamp(v, 0, 1), { surface: "intrados" });
    });
    geometry = buildPrismGeometryFromLoops(top, bot);
    jointFaceType = `custom intrados/extrados ${block.componentVariant || "voussoir"}`;
  } else if (!geometry) {
    const normals = sourceUv.map(([u, v]) => {
      if (isBarrelLikeVault() && !cyclicU && u <= 1e-5) return new THREE.Vector3(-1, 0, 0);
      if (isBarrelLikeVault() && !cyclicU && u >= 1 - 1e-5) return new THREE.Vector3(1, 0, 0);
      const n = host.normalAt(cyclicU ? wrap01(u) : clamp(u, 0, 1), clamp(v, 0, 1)).clone();
      if (n.y < 0) n.multiplyScalar(-1);
      return n;
    });
    top = q.map((p, i) => p.clone().addScaledVector(normals[i], t));
    bot = q.map((p) => p.clone());
    geometry = buildPrismGeometryFromLoops(top, bot);
    jointFaceType = state.jointPrinciple === "radial joints" ? `radial normal-cut ${block.componentVariant || "voussoir"}` : `normal-offset ${block.componentVariant || "voussoir"}`;
  }
  const { edges, minEdge, avgEdge } = getLoopEdgeMetrics(bot || q);
  const box = new THREE.Box3().setFromPoints(bot || q);
  const size = box.getSize(new THREE.Vector3());
  const avgLength = Math.max(size.x, size.z, avgEdge);
  const avgWidth = Math.max(Math.min(size.x || avgEdge, size.z || avgEdge), minEdge);
  const volume = Math.max(0.0001, avgLength * avgWidth * t * (sourceUv.length === 3 ? 0.5 : 1));
  const weight = volume * densityKgPerM3;
  return {
    geometry,
    q: bot || q,
    avgLength,
    avgWidth,
    volume,
    weight,
    minEdge: Math.min(...edges),
    uvArea: Math.abs(signedUvArea(sourceUv)),
    isConvex: isConvexUv(sourceUv),
    jointFaceType,
  };
};

const buildProxyBlockVisual = (block) => {
  const cyclicU = state.vaultType === "Dome";
  const q = block.uv.map(([u, v]) => getVaultPoint(cyclicU ? wrap01(u) : clamp(u, 0, 1), clamp(v, 0, 1)));
  const center = q.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(1 / q.length);
  const courseSpan = (q[0].distanceTo(q[1]) + q[2].distanceTo(q[3])) * 0.5;
  const lengthSpan = (q[1].distanceTo(q[2]) + q[3].distanceTo(q[0])) * 0.5;
  const xSize = Math.max(0.08, Math.min(Math.max(courseSpan, state.params.thickness), state.params.span * state.cubeScale * 0.18));
  const ySize = Math.max(0.08, getMasonryThickness());
  const zSize = Math.max(0.08, lengthSpan);
  const geometry = new THREE.BoxGeometry(xSize, ySize, zSize);
  const material = new THREE.MeshStandardMaterial({
    color: 0xb8b2a7,
    roughness: 0.56,
    metalness: 0.04,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(center).add(new THREE.Vector3(0, ySize * 0.5, 0));
  mesh.name = `proxy-${block.id}`;
  mesh.userData.blockId = block.id;
  const seam = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 18),
    new THREE.LineBasicMaterial({ color: 0xf1eadc, transparent: true, opacity: 0.26 })
  );
  seam.name = "seam";
  mesh.add(seam);
  const volume = courseSpan * lengthSpan * state.params.thickness;
  block.metrics = {
    geometry,
    q,
    avgLength: courseSpan,
    avgWidth: lengthSpan,
    volume,
    weight: volume * densityKgPerM3,
    minEdge: Math.min(courseSpan, lengthSpan),
    uvArea: Math.abs(signedUvArea(block.uv)),
    isConvex: isConvexUv(block.uv),
    jointFaceType: "proxy block",
  };
  block.failed = validate(block.metrics, block);
  block.mesh = mesh;
  return mesh;
};

const analyzeBlockDeformation = (block, metrics) => {
  const q = metrics?.q || [];
  const uv = block?.uv || [];
  const edgeMetrics = q.length >= 3 ? getLoopEdgeMetrics(q) : { edges: [], minEdge: 0, avgEdge: 0 };
  const maxEdge = edgeMetrics.edges.length ? Math.max(...edgeMetrics.edges) : 0;
  const stretchRatio = edgeMetrics.minEdge > 1e-6 ? maxEdge / edgeMetrics.minEdge : 1;
  let twistAngle = 0;
  if (q.length >= 4) {
    const nA = new THREE.Vector3().crossVectors(q[1].clone().sub(q[0]), q[2].clone().sub(q[0])).normalize();
    const nB = new THREE.Vector3().crossVectors(q[2].clone().sub(q[0]), q[3].clone().sub(q[0])).normalize();
    if (nA.lengthSq() > 0 && nB.lengthSq() > 0) twistAngle = nA.angleTo(nB) * 180 / Math.PI;
  }
  const uvBox = uv.length ? {
    w: Math.max(...uv.map((p) => p[0])) - Math.min(...uv.map((p) => p[0])),
    h: Math.max(...uv.map((p) => p[1])) - Math.min(...uv.map((p) => p[1])),
  } : { w: 1, h: 1 };
  const uvRatio = Math.max(uvBox.w, uvBox.h) / Math.max(1e-6, Math.min(uvBox.w, uvBox.h));
  const box = q.length ? new THREE.Box3().setFromPoints(q) : new THREE.Box3();
  const size = box.getSize(new THREE.Vector3());
  const spatialRatio = Math.max(size.x, size.z, edgeMetrics.avgEdge || 1) / Math.max(1e-6, Math.min(size.x || edgeMetrics.avgEdge || 1, size.z || edgeMetrics.avgEdge || 1));
  const mappingDistortion = Math.abs(spatialRatio - uvRatio);
  const taperDistortion = (state.constraints.taperAngle + (block?.taperBias || 0)) / Math.max(0.001, state.constraints.maxTaper);
  return {
    stretchRatio: Number(stretchRatio.toFixed(3)),
    twistAngle: Number(twistAngle.toFixed(3)),
    mappingDistortion: Number(mappingDistortion.toFixed(3)),
    taperDistortion: Number(taperDistortion.toFixed(3)),
  };
};

const validate = (m, block = null) => {
  const c = state.constraints;
  const failed = [];
  const fillType = block?.fillCellType || "quad";
  const component = block?.componentVariant || block?.componentType || state.strategy.component;
  const lengthLimit = fillType === "fan" ? c.maxLength * 1.15 : c.maxLength;
  const widthLimit = fillType === "frame" ? c.maxWidth * 0.75 : c.maxWidth;
  const minEdgeLimit = fillType === "fan" ? c.minEdgeLength * 0.45 : fillType === "frame" ? c.minEdgeLength * 0.55 : c.minEdgeLength;
  if (m.avgLength > lengthLimit + c.fabTolerance) failed.push("length");
  if (m.avgWidth > widthLimit + c.fabTolerance) failed.push("width");
  if (state.params.thickness < c.minThickness) failed.push("thickness");
  if (m.weight > c.maxWeight) failed.push("weight");
  const drivenTaper = c.taperAngle + (block?.taperBias || 0);
  if (drivenTaper > c.maxTaper) failed.push("taper");
  if (m.minEdge < minEdgeLimit) failed.push("min-edge");
  if (c.bedDepth < c.jointGap * 4) failed.push("bed-depth");
  if (!m.isConvex && !["keyedVoussoir", "interlock"].includes(component)) failed.push("convexity");
  if (fillType === "fan" && m.uvArea < 0.00001) failed.push("fan-area");
  if (fillType === "frame" && m.avgWidth < c.jointGap * 3) failed.push("frame-web");
  const deformation = analyzeBlockDeformation(block, m);
  m.deformation = deformation;
  if (deformation.stretchRatio > 4.5) failed.push("stretched-cell");
  if (fillType === "patch" && deformation.twistAngle > 14) failed.push("twisted-patch");
  if (deformation.mappingDistortion > 3.5) failed.push("mapping-distortion");
  if (deformation.taperDistortion > 1) failed.push("taper-distortion");
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
  if (!state.view2dOptions.showGuides) return [];
  if (isCustomHostWorkflow()) return [];
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
  const apexY = baseY - risePx;
  const label = state.view2dOptions.showLabels
    ? [
      `<text class="apex-label" x="${(cx + 12).toFixed(2)}" y="${(apexY - 10).toFixed(2)}">Apex / crown</text>`,
      `<text class="apex-label small" x="${(cx + 12).toFixed(2)}" y="${(apexY + 6).toFixed(2)}">rise ${state.params.rise.toFixed(2)} m</text>`,
    ]
    : [];
  return [
    `<line x1="${(cx - halfW).toFixed(2)}" y1="${baseY}" x2="${(cx + halfW).toFixed(2)}" y2="${baseY}" stroke="rgba(255,226,160,0.45)" stroke-width="1.0" stroke-dasharray="4 4"/>`,
    `<line x1="${cx}" y1="${baseY}" x2="${cx}" y2="${(baseY - risePx).toFixed(2)}" stroke="rgba(255,226,160,0.35)" stroke-width="1"/>`,
    `<polyline points="${ptsOther.join(" ")}" fill="none" stroke="rgba(150,176,206,0.7)" stroke-width="1.6"/>`,
    `<polyline points="${ptsRef.join(" ")}" fill="none" stroke="rgba(255,226,160,0.95)" stroke-width="2.2"/>`,
    `<circle class="arch-handle" data-handle="span" cx="${(cx + halfW).toFixed(2)}" cy="${baseY}" r="6" fill="rgba(255,226,160,0.95)" stroke="rgba(20,20,20,0.7)" stroke-width="1.2"/>`,
    `<circle class="arch-handle apex-point" data-handle="rise" cx="${cx}" cy="${apexY.toFixed(2)}" r="6" fill="rgba(255,226,160,0.95)" stroke="rgba(20,20,20,0.7)" stroke-width="1.2"/>`,
    `<path class="apex-callout" d="M ${cx.toFixed(2)} ${(apexY - 2).toFixed(2)} L ${(cx + 48).toFixed(2)} ${(apexY - 26).toFixed(2)}" fill="none"/>`,
    ...label,
  ];
};

const buildGroinPlanOverlay2d = (margin, iw, ih, originY = margin) => {
  if (isCustomHostWorkflow()) return [];
  if (state.vaultType !== "Groin Vault") return [];
  const x0 = margin;
  const y0 = originY;
  const x1 = margin + iw;
  const y1 = originY + ih;
  const cx = margin + iw * 0.5;
  const cy = margin + ih * 0.5;
  const barrelBand = Math.min(iw, ih) * 0.18;
  const courseN = 7;
  const courseLines = [];
  for (let i = 1; i <= courseN; i++) {
    const t = i / (courseN + 1);
    const a = Math.sin(t * Math.PI);
    const off = (t - 0.5) * barrelBand * 1.8;
    courseLines.push(`<path d="M ${x0.toFixed(2)} ${(cy + off).toFixed(2)} Q ${cx.toFixed(2)} ${(cy + off - barrelBand * 0.26 * a).toFixed(2)} ${x1.toFixed(2)} ${(cy + off).toFixed(2)}" fill="none" stroke="rgba(111,211,255,0.24)" stroke-width="1"/>`);
    courseLines.push(`<path d="M ${(cx + off).toFixed(2)} ${y0.toFixed(2)} Q ${(cx + off + barrelBand * 0.26 * a).toFixed(2)} ${cy.toFixed(2)} ${(cx + off).toFixed(2)} ${y1.toFixed(2)}" fill="none" stroke="rgba(255,205,122,0.24)" stroke-width="1"/>`);
  }
  const groinStroke = "rgba(72,255,184,0.9)";
  const spineStroke = "rgba(72,255,184,0.42)";
  return [
    `<g data-vault-plan="groin">`,
    `<rect x="${x0}" y="${y0}" width="${iw}" height="${ih}" fill="rgba(20,30,42,0.18)" stroke="rgba(230,241,255,0.42)" stroke-width="1.4"/>`,
    `<rect x="${x0}" y="${(cy - barrelBand * 0.5).toFixed(2)}" width="${iw}" height="${barrelBand.toFixed(2)}" fill="rgba(111,211,255,0.08)" stroke="rgba(111,211,255,0.36)" stroke-width="1"/>`,
    `<rect x="${(cx - barrelBand * 0.5).toFixed(2)}" y="${y0}" width="${barrelBand.toFixed(2)}" height="${ih}" fill="rgba(255,205,122,0.08)" stroke="rgba(255,205,122,0.36)" stroke-width="1"/>`,
    ...courseLines,
    `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${groinStroke}" stroke-width="2.4"/>`,
    `<line x1="${x1}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="${groinStroke}" stroke-width="2.4"/>`,
    `<line x1="${cx}" y1="${y0}" x2="${cx}" y2="${y1}" stroke="${spineStroke}" stroke-width="1.2" stroke-dasharray="6 5"/>`,
    `<line x1="${x0}" y1="${cy}" x2="${x1}" y2="${cy}" stroke="${spineStroke}" stroke-width="1.2" stroke-dasharray="6 5"/>`,
    `<circle cx="${cx}" cy="${cy}" r="7" fill="rgba(72,255,184,0.92)" stroke="rgba(4,16,18,0.7)" stroke-width="1"/>`,
    `<text x="${(x0 + 12).toFixed(2)}" y="${(cy - barrelBand * 0.62).toFixed(2)}" fill="rgba(111,211,255,0.95)" font-size="12">Barrel A</text>`,
    `<text x="${(cx + barrelBand * 0.58).toFixed(2)}" y="${(y0 + 20).toFixed(2)}" fill="rgba(255,205,122,0.95)" font-size="12">Barrel B</text>`,
    `<text x="${cx.toFixed(2)}" y="${(y0 + 22).toFixed(2)}" fill="rgba(214,255,238,0.95)" font-size="13" text-anchor="middle">Barrel A + Barrel B = Groin Vault</text>`,
    `<text x="${cx.toFixed(2)}" y="${(y1 - 16).toFixed(2)}" fill="rgba(214,255,238,0.78)" font-size="12" text-anchor="middle">Courses follow groin lines, not simple barrel rings</text>`,
    `</g>`,
  ];
};

const buildBarrelPlanReferenceOverlay2d = (x0, y0, w, h) => {
  if (!state.view2dOptions.showReferenceGeometry || !state.view2dOptions.showGuides) return [];
  if (isCustomHostWorkflow() || !isBarrelLikeVault()) return [];
  const labelOn = state.view2dOptions.showLabels;
  const footprintMarginX = w * 0.08;
  const footprintMarginY = h * 0.18;
  const fx = x0 + footprintMarginX;
  const fy = y0 + footprintMarginY;
  const fw = w - footprintMarginX * 2;
  const fh = h - footprintMarginY * 2;
  const axisX = fx + fw * 0.5;
  const ringCount = Math.max(4, Math.min(14, Math.round(state.params.courseCount * state.params.subdivisionDensity * 0.5)));
  const rings = Array.from({ length: ringCount + 1 }, (_, i) => {
    const x = fx + (i / ringCount) * fw;
    const cls = i === 0 || i === ringCount ? "boundary" : "course";
    return `<line class="trait-line ${cls}" x1="${x.toFixed(2)}" y1="${fy.toFixed(2)}" x2="${x.toFixed(2)}" y2="${(fy + fh).toFixed(2)}"/>`;
  });
  const labels = labelOn ? [
    `<text class="reference-label" x="${axisX.toFixed(2)}" y="${(fy - 12).toFixed(2)}" text-anchor="middle">barrel vault plan footprint</text>`,
    `<text class="dimension-label" x="${axisX.toFixed(2)}" y="${(fy + fh + 18).toFixed(2)}" text-anchor="middle">length ${state.params.length.toFixed(2)} m</text>`,
    `<text class="dimension-label" x="${(fx - 10).toFixed(2)}" y="${(fy + fh * 0.5).toFixed(2)}" text-anchor="end">span ${state.params.span.toFixed(2)} m</text>`,
  ] : [];
  return [
    `<g class="reference-geometry barrel-plan-reference">`,
    `<rect class="reference-frame" x="${x0}" y="${y0}" width="${w}" height="${h}"/>`,
    `<rect class="reference-plan-fill" x="${fx.toFixed(2)}" y="${fy.toFixed(2)}" width="${fw.toFixed(2)}" height="${fh.toFixed(2)}"/>`,
    `<line class="reference-line center" x1="${axisX.toFixed(2)}" y1="${fy.toFixed(2)}" x2="${axisX.toFixed(2)}" y2="${(fy + fh).toFixed(2)}"/>`,
    `<line class="reference-line datum" x1="${fx.toFixed(2)}" y1="${(fy + fh * 0.5).toFixed(2)}" x2="${(fx + fw).toFixed(2)}" y2="${(fy + fh * 0.5).toFixed(2)}"/>`,
    ...rings,
    ...labels,
    `</g>`,
  ];
};

const buildOriginAxes2d = () => {
  if (!state.layers.guides || !state.view2dOptions.showGuides) return [];
  const ox = state.view2d.x + 34;
  const oy = state.view2d.y + state.view2d.h - 34;
  const len = clamp(Math.min(state.view2d.w, state.view2d.h) * 0.12, 38, 82);
  const arrow = (x0, y0, x1, y1, color) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const l = Math.max(0.001, Math.hypot(dx, dy));
    const ux = dx / l;
    const uy = dy / l;
    const px = -uy;
    const py = ux;
    const ah = Math.min(10, len * 0.18);
    const aw = ah * 0.62;
    const bx = x1 - ux * ah;
    const by = y1 - uy * ah;
    return [
      `<line class="axis2d-line" x1="${x0.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}" stroke="${color}"/>`,
      `<polygon class="axis2d-head" points="${x1.toFixed(2)},${y1.toFixed(2)} ${(bx + px * aw).toFixed(2)},${(by + py * aw).toFixed(2)} ${(bx - px * aw).toFixed(2)},${(by - py * aw).toFixed(2)}" fill="${color}"/>`,
    ].join("");
  };
  return [
    `<g class="origin2d" data-origin-triad="xz">`,
    arrow(ox, oy, ox + len, oy, "rgba(255, 100, 86, 0.95)"),
    arrow(ox, oy, ox, oy - len, "rgba(95, 135, 255, 0.95)"),
    `<circle class="axis2d-origin" cx="${ox.toFixed(2)}" cy="${oy.toFixed(2)}" r="${Math.max(4, len * 0.06).toFixed(2)}"/>`,
    `<text class="axis2d-label" x="${(ox + len + 12).toFixed(2)}" y="${(oy + 4).toFixed(2)}">X</text>`,
    `<text class="axis2d-label" x="${(ox - 3).toFixed(2)}" y="${(oy - len - 10).toFixed(2)}">Z</text>`,
    `<text class="axis2d-origin-label" x="${(ox + 9).toFixed(2)}" y="${(oy + 14).toFixed(2)}">Origin</text>`,
    `</g>`,
  ];
};

const buildStereotomicGuideOverlay2d = (margin, iw, ih, originY = margin) => {
  if (isCustomHostWorkflow()) return [];
  if (!state.view2dOptions.showGuides) return [];
  const mode = state.view2dOptions.mode;
  const density = clamp(Math.round(state.view2dOptions.guideDensity || 8), 3, 18);
  const x0 = margin;
  const y0 = originY;
  const x1 = margin + iw;
  const y1 = margin + ih;
  const cx = margin + iw * 0.5;
  const cy = margin + ih * 0.5;
  const guideLines = [];
  const labels = [];
  const labelOn = state.view2dOptions.showLabels;
  const cutOn = state.view2dOptions.showCutLines;
  const guideStroke = mode === "Block / Voussoir Layout" ? "rgba(225,237,255,0.14)" : "rgba(225,237,255,0.28)";
  const cutStroke = mode === "Surface Development" ? "rgba(255,214,127,0.78)" : "rgba(255,214,127,0.54)";

  guideLines.push(`<rect class="construction-frame" x="${x0}" y="${y0}" width="${iw}" height="${ih}"/>`);
  guideLines.push(`<line class="construction-axis" x1="${x0}" y1="${cy}" x2="${x1}" y2="${cy}"/>`);
  guideLines.push(`<line class="construction-axis" x1="${cx}" y1="${y0}" x2="${cx}" y2="${y1}"/>`);

  if (mode === "Surface Development") {
    for (let i = 1; i < density; i++) {
      const t = i / density;
      const x = x0 + iw * t;
      const y = y0 + ih * t;
      guideLines.push(`<line x1="${x.toFixed(2)}" y1="${y0}" x2="${x.toFixed(2)}" y2="${y1}" stroke="${guideStroke}" stroke-width="1"/>`);
      guideLines.push(`<line x1="${x0}" y1="${y.toFixed(2)}" x2="${x1}" y2="${y.toFixed(2)}" stroke="${guideStroke}" stroke-width="1"/>`);
    }
    if (cutOn) {
      for (let i = 0; i <= density; i++) {
        const t = i / density;
        const x = x0 + iw * t;
        guideLines.push(`<line x1="${x.toFixed(2)}" y1="${y0}" x2="${x.toFixed(2)}" y2="${y1}" stroke="${cutStroke}" stroke-width="${i % 2 ? 1 : 1.6}" stroke-dasharray="${i % 2 ? "3 5" : "none"}"/>`);
      }
    }
    if (labelOn) {
      labels.push(`<text class="construction-label small" x="${(x1 - 8).toFixed(2)}" y="${(cy - 8).toFixed(2)}" text-anchor="end">U courses</text>`);
      labels.push(`<text class="construction-label small" x="${(cx + 8).toFixed(2)}" y="${(y0 + 20).toFixed(2)}">V rise</text>`);
    }
  } else if (mode === "Plan") {
    const planInset = Math.min(iw, ih) * 0.08;
    guideLines.push(`<rect class="construction-frame plan-outline" x="${(x0 + planInset).toFixed(2)}" y="${(y0 + planInset).toFixed(2)}" width="${(iw - planInset * 2).toFixed(2)}" height="${(ih - planInset * 2).toFixed(2)}"/>`);
    guideLines.push(`<line class="springing-datum" x1="${(x0 + planInset).toFixed(2)}" y1="${cy.toFixed(2)}" x2="${(x1 - planInset).toFixed(2)}" y2="${cy.toFixed(2)}"/>`);
    if (cutOn) {
      for (let i = 1; i < density; i++) {
        const t = i / density;
        const x = x0 + planInset + (iw - planInset * 2) * t;
        guideLines.push(`<line x1="${x.toFixed(2)}" y1="${(y0 + planInset).toFixed(2)}" x2="${x.toFixed(2)}" y2="${(y1 - planInset).toFixed(2)}" stroke="${cutStroke}" stroke-width="1" stroke-dasharray="4 6"/>`);
      }
    }
    if (labelOn) {
      labels.push(`<text class="construction-label small" x="${x0.toFixed(2)}" y="${(y0 - 8).toFixed(2)}">plan: springing footprint and longitudinal courses</text>`);
    }
  } else if (mode === "Section") {
    const springY = y0 + ih * 0.72;
    const half = iw * 0.22;
    const rise = ih * 0.34;
    guideLines.push(`<line class="springing-datum" x1="${(cx - half).toFixed(2)}" y1="${springY.toFixed(2)}" x2="${(cx + half).toFixed(2)}" y2="${springY.toFixed(2)}"/>`);
    guideLines.push(`<path class="reference-curve intrados" d="M ${(cx - half).toFixed(2)} ${springY.toFixed(2)} Q ${cx.toFixed(2)} ${(springY - rise).toFixed(2)} ${(cx + half).toFixed(2)} ${springY.toFixed(2)}"/>`);
    guideLines.push(`<path class="reference-curve extrados" d="M ${(cx - half * 1.08).toFixed(2)} ${(springY + 2).toFixed(2)} Q ${cx.toFixed(2)} ${(springY - rise - 26).toFixed(2)} ${(cx + half * 1.08).toFixed(2)} ${(springY + 2).toFixed(2)}"/>`);
    if (labelOn) labels.push(`<text class="construction-label small" x="${x0.toFixed(2)}" y="${(y0 - 8).toFixed(2)}">section: profile, rise, springing, thickness</text>`);
  } else if (mode === "Elevation") {
    for (let i = 1; i < density; i++) {
      const t = i / density;
      const y = y0 + ih * t;
      guideLines.push(`<line x1="${x0.toFixed(2)}" y1="${y.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${y.toFixed(2)}" stroke="${guideStroke}" stroke-width="1"/>`);
    }
    if (cutOn) {
      for (let i = 1; i < density; i++) {
        const t = i / density;
        const x = x0 + iw * t;
        guideLines.push(`<line x1="${x.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${(x + Math.sin(t * Math.PI) * 26).toFixed(2)}" y2="${y1.toFixed(2)}" stroke="${cutStroke}" stroke-width="1" stroke-dasharray="4 6"/>`);
      }
    }
    if (labelOn) labels.push(`<text class="construction-label small" x="${x0.toFixed(2)}" y="${(y0 - 8).toFixed(2)}">elevation: projected courses and vertical references</text>`);
  } else {
    for (let i = 1; i < density; i++) {
      const t = i / density;
      const y = y0 + ih * t;
      const wave = mode === "Trait / Epure" ? Math.sin(t * Math.PI) * 24 : 0;
      guideLines.push(`<path d="M ${x0} ${y.toFixed(2)} C ${(x0 + iw * 0.28).toFixed(2)} ${(y - wave).toFixed(2)}, ${(x0 + iw * 0.72).toFixed(2)} ${(y - wave).toFixed(2)}, ${x1} ${y.toFixed(2)}" fill="none" stroke="${guideStroke}" stroke-width="1"/>`);
    }
    if (cutOn) {
      if (state.pattern === "Radial joints" || state.pattern === "Keystone zones" || state.vaultType === "Dome") {
        const rays = Math.max(8, density + 4);
        for (let i = 0; i < rays; i++) {
          const a = (i / rays) * Math.PI * 2;
          const r = Math.max(iw, ih);
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          guideLines.push(`<line x1="${cx.toFixed(2)}" y1="${cy.toFixed(2)}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="${cutStroke}" stroke-width="1.1" stroke-dasharray="4 6"/>`);
        }
      } else {
        for (let i = 1; i < density; i++) {
          const t = i / density;
          const x = x0 + iw * t;
          guideLines.push(`<line x1="${x.toFixed(2)}" y1="${y0}" x2="${x.toFixed(2)}" y2="${y1}" stroke="${cutStroke}" stroke-width="1.1" stroke-dasharray="4 6"/>`);
        }
      }
    }
    if (labelOn) {
      labels.push(`<text class="construction-label small" x="${x0.toFixed(2)}" y="${(y0 - 8).toFixed(2)}">${mode === "Block / Voussoir Layout" ? "block / voussoir layout" : "trait / epure: derived course field"}</text>`);
    }
  }

  return [`<g class="construction-guides" data-drawing-mode="${mode}">`, ...guideLines, ...labels, `</g>`];
};

const buildReferenceGeometryOverlay2d = (x0, y0, w, h) => {
  if (!state.view2dOptions.showReferenceGeometry || !state.view2dOptions.showGuides) return [];
  if (isCustomHostWorkflow()) return [];
  if (isBarrelLikeVault() && state.view2dOptions.mode === "Plan") {
    return buildBarrelPlanReferenceOverlay2d(x0, y0, w, h);
  }
  const entity = state.constructionEntities;
  const entityColor = (key, alpha = 1) => hexToRgba(entity[key]?.color || "#ffffff", alpha);
  const entityShown = (key) => entity[key]?.show !== false;
  const cx = x0 + w * 0.5;
  const springY = y0 + h * 0.78;
  const halfW = clamp(state.params.span * 8.5 * 0.5, 60, w * 0.42);
  const risePx = clamp(state.params.rise * 8.5, 36, h * 0.56);
  const tPx = clamp(state.params.thickness * 14, 5, 34);
  const left = cx - halfW;
  const right = cx + halfW;
  const apexY = springY - risePx;
  const archPts = [];
  const n = 96;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const nx = Math.abs((t - 0.5) * 2);
    const profile = Math.max(0, evalBarrelArchProfile(nx));
    archPts.push(new THREE.Vector2(left + t * halfW * 2, springY - profile * risePx));
  }
  const extradosPts = offsetJoinedPolyline(archPts, tPx, 2).map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  const intradosPts = archPts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  const neutralPts = offsetJoinedPolyline(archPts, tPx * 0.5, 2).map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  const principleX = x0 + w - 190;
  const principleY = y0 + 28;
  const principleIcon = {
    Plane: [
      `<polygon class="surface-icon-fill" points="${principleX},${principleY + 46} ${principleX + 102},${principleY + 30} ${principleX + 144},${principleY + 54} ${principleX + 40},${principleY + 70}"/>`,
      `<line class="surface-icon-line" x1="${principleX + 28}" y1="${principleY + 50}" x2="${principleX + 128}" y2="${principleY + 35}"/>`,
    ],
    Cylinder: [
      `<path class="surface-icon-fill" d="M ${principleX + 30} ${principleY + 18} C ${principleX + 58} ${principleY + 4}, ${principleX + 96} ${principleY + 4}, ${principleX + 124} ${principleY + 18} L ${principleX + 124} ${principleY + 76} C ${principleX + 96} ${principleY + 62}, ${principleX + 58} ${principleY + 62}, ${principleX + 30} ${principleY + 76} Z"/>`,
      `<path class="surface-icon-line" d="M ${principleX + 30} ${principleY + 18} C ${principleX + 58} ${principleY + 4}, ${principleX + 96} ${principleY + 4}, ${principleX + 124} ${principleY + 18}"/>`,
      `<path class="surface-icon-line" d="M ${principleX + 30} ${principleY + 76} C ${principleX + 58} ${principleY + 62}, ${principleX + 96} ${principleY + 62}, ${principleX + 124} ${principleY + 76}"/>`,
      `<line class="surface-icon-line accent" x1="${principleX + 77}" y1="${principleY + 8}" x2="${principleX + 77}" y2="${principleY + 82}"/>`,
    ],
    Cone: [
      `<path class="surface-icon-fill" d="M ${principleX + 8} ${principleY + 66} L ${principleX + 78} ${principleY + 24} L ${principleX + 144} ${principleY + 66} Z"/>`,
      `<line class="surface-icon-line" x1="${principleX + 78}" y1="${principleY + 24}" x2="${principleX + 78}" y2="${principleY + 66}"/>`,
    ],
    Sphere: [
      `<circle class="surface-icon-fill" cx="${principleX + 70}" cy="${principleY + 50}" r="38"/>`,
      `<ellipse class="surface-icon-line" cx="${principleX + 70}" cy="${principleY + 50}" rx="38" ry="12"/>`,
      `<ellipse class="surface-icon-line" cx="${principleX + 70}" cy="${principleY + 50}" rx="14" ry="38"/>`,
    ],
    "Ruled Surface": [
      `<path class="surface-icon-fill" d="M ${principleX + 8} ${principleY + 68} C ${principleX + 48} ${principleY + 22}, ${principleX + 96} ${principleY + 88}, ${principleX + 144} ${principleY + 36} L ${principleX + 144} ${principleY + 62} C ${principleX + 96} ${principleY + 104}, ${principleX + 48} ${principleY + 44}, ${principleX + 8} ${principleY + 82} Z"/>`,
      ...Array.from({ length: 6 }, (_, i) => {
        const t = i / 5;
        const xa = principleX + 12 + t * 126;
        const ya = principleY + 72 - Math.sin(t * Math.PI) * 18;
        const xb = principleX + 20 + t * 118;
        const yb = principleY + 32 + Math.sin(t * Math.PI) * 22;
        return `<line class="surface-icon-line" x1="${xa.toFixed(2)}" y1="${ya.toFixed(2)}" x2="${xb.toFixed(2)}" y2="${yb.toFixed(2)}"/>`;
      }),
    ],
    "Compound / Intersection": [
      `<path class="surface-icon-fill" d="M ${principleX + 4} ${principleY + 62} C ${principleX + 36} ${principleY + 28}, ${principleX + 82} ${principleY + 28}, ${principleX + 114} ${principleY + 62}"/>`,
      `<path class="surface-icon-fill alt" d="M ${principleX + 72} ${principleY + 18} C ${principleX + 38} ${principleY + 50}, ${principleX + 38} ${principleY + 86}, ${principleX + 72} ${principleY + 100}"/>`,
      `<line class="surface-icon-line accent" x1="${principleX + 42}" y1="${principleY + 42}" x2="${principleX + 104}" y2="${principleY + 78}"/>`,
    ],
  }[state.surfacePrinciple] || [];
  const labelOn = state.view2dOptions.showLabels;
  const teachingLabels = isTeachingDrawingPreset() || ["springing", "intrados", "extrados"].includes(state.activeTraitFocus);
  const showRadialCenter = state.jointPrinciple === "radial joints" && entityShown("axis");
  const labels = [];
  const labelLeaders = [];
  const callout = (text, lx, ly, tx, ty, anchor = "middle") => {
    labels.push(`<text class="reference-label callout" x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" text-anchor="${anchor}">${text}</text>`);
    labelLeaders.push(`<line class="reference-leader" x1="${lx.toFixed(2)}" y1="${(ly + 4).toFixed(2)}" x2="${tx.toFixed(2)}" y2="${ty.toFixed(2)}"/>`);
  };
  if (labelOn && teachingLabels) {
    if (entityShown("springing")) callout("springing", left - 12, y0 - 10, left, springY, "end");
    if (entityShown("apex")) callout("apex / crown", cx, y0 - 10, cx, apexY);
    if (entityShown("intrados")) callout("intrados", cx - halfW * 0.72, y0 + h + 18, cx - halfW * 0.36, springY - risePx * 0.64);
    if (entityShown("extrados")) callout("extrados", cx + halfW * 0.72, y0 - 10, cx + halfW * 0.36, apexY - tPx * 0.72);
    if (entityShown("neutral") && isTeachingDrawingPreset()) callout("neutral", cx - halfW * 0.1, y0 + h + 18, cx - halfW * 0.1, apexY - tPx * 0.5, "end");
    if (showRadialCenter) callout("radial center", cx + halfW * 0.22, springY + 18, cx, springY);
  }
  return [
    `<g class="reference-geometry">`,
    `<rect class="reference-frame" x="${x0}" y="${y0}" width="${w}" height="${h}"/>`,
    entityShown("springing") ? `<line class="reference-line datum" x1="${left.toFixed(2)}" y1="${springY.toFixed(2)}" x2="${right.toFixed(2)}" y2="${springY.toFixed(2)}" style="stroke:${entityColor("springing", 0.82)}"/>` : "",
    entityShown("axis") ? `<line class="reference-line center" x1="${cx.toFixed(2)}" y1="${(y0 + 18).toFixed(2)}" x2="${cx.toFixed(2)}" y2="${(springY + 18).toFixed(2)}" style="stroke:${entityColor("axis", 0.68)}"/>` : "",
    entityShown("skewAxis") ? `<line class="reference-line skew-axis" x1="${(left - 22).toFixed(2)}" y1="${(springY + 16).toFixed(2)}" x2="${(right + 24).toFixed(2)}" y2="${(apexY - 18).toFixed(2)}" style="stroke:${entityColor("skewAxis", 0.78)}"/>` : "",
    entityShown("groinLine") && (state.surfacePrinciple === "Compound / Intersection" || state.vaultType === "Groin Vault") ? `<path class="reference-line groin-line" d="M ${(cx - halfW * 0.82).toFixed(2)} ${springY.toFixed(2)} Q ${cx.toFixed(2)} ${(apexY - 12).toFixed(2)} ${(cx + halfW * 0.82).toFixed(2)} ${springY.toFixed(2)}" style="stroke:${entityColor("groinLine", 0.76)}"/>` : "",
    entityShown("extrados") ? `<polyline class="reference-curve extrados" points="${extradosPts.join(" ")}" style="stroke:${entityColor("extrados", 0.78)}"/>` : "",
    entityShown("neutral") ? `<polyline class="reference-curve neutral" points="${neutralPts.join(" ")}" style="stroke:${entityColor("neutral", 0.64)}"/>` : "",
    entityShown("intrados") ? `<polyline class="reference-curve intrados" points="${intradosPts.join(" ")}" style="stroke:${entityColor("intrados", 0.94)}"/>` : "",
    showRadialCenter ? `<g class="radial-center-construction">
      <line class="radial-cut-ray" x1="${cx.toFixed(2)}" y1="${springY.toFixed(2)}" x2="${left.toFixed(2)}" y2="${springY.toFixed(2)}"/>
      <line class="radial-cut-ray" x1="${cx.toFixed(2)}" y1="${springY.toFixed(2)}" x2="${cx.toFixed(2)}" y2="${apexY.toFixed(2)}"/>
      <line class="radial-cut-ray" x1="${cx.toFixed(2)}" y1="${springY.toFixed(2)}" x2="${right.toFixed(2)}" y2="${springY.toFixed(2)}"/>
      <circle class="radial-center-point" cx="${cx.toFixed(2)}" cy="${springY.toFixed(2)}" r="5"/>
    </g>` : "",
    `<g class="surface-principle-icon">${principleIcon.join("")}</g>`,
    entityShown("extrados") && entityShown("intrados") ? `<line class="reference-line thickness" x1="${(cx + halfW * 0.2).toFixed(2)}" y1="${apexY.toFixed(2)}" x2="${(cx + halfW * 0.2).toFixed(2)}" y2="${(apexY - tPx).toFixed(2)}" style="stroke:${entityColor("extrados", 0.9)}"/>` : "",
    entityShown("imposts") ? `<circle class="reference-point" cx="${left.toFixed(2)}" cy="${springY.toFixed(2)}" r="4" style="fill:${entityColor("imposts", 0.92)}"/>` : "",
    entityShown("imposts") ? `<circle class="reference-point" cx="${right.toFixed(2)}" cy="${springY.toFixed(2)}" r="4" style="fill:${entityColor("imposts", 0.92)}"/>` : "",
    entityShown("apex") ? `<circle class="reference-point apex" cx="${cx.toFixed(2)}" cy="${apexY.toFixed(2)}" r="5" style="fill:${entityColor("apex", 0.96)}"/>` : "",
    ...labelLeaders,
    ...labels,
    `</g>`,
  ].filter(Boolean);
};

const traitStepActive = (name) => state.traitStep === "All Trait Lines" || state.traitStep === name;

const sampleIntradosProfileLength = (samples = 96) => {
  let length = 0;
  let prev = null;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const nx = Math.abs((t - 0.5) * 2);
    const x = (t - 0.5) * state.params.span;
    const y = Math.max(0, evalBarrelArchProfile(nx)) * state.params.rise;
    if (prev) length += Math.hypot(x - prev.x, y - prev.y);
    prev = { x, y };
  }
  return Math.max(0.001, length);
};

const buildSurfaceUnrollOverlay2d = (layout, density) => {
  const lines = [];
  const fills = [];
  const labels = [];
  const x = layout.x + layout.w * 0.08;
  const y = layout.y + layout.h * 0.14;
  const w = layout.w * 0.84;
  const h = layout.h * 0.7;
  const courseCount = Math.max(3, Math.round(state.params.courseCount * state.params.subdivisionDensity));
  const blockCount = Math.max(4, Math.round(state.params.blockCount * state.params.subdivisionDensity));
  const archLength = sampleIntradosProfileLength();
  const developedLength = Math.max(0.001, state.params.length);
  const formatM = (v) => `${v.toFixed(v >= 10 ? 1 : 2)} m`;

  if (state.surfacePrinciple === "Cylinder") {
    fills.push(`<rect class="surface-unroll-fill" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}"/>`);
    for (let i = 0; i <= blockCount; i++) {
      const tx = x + (w * i) / blockCount;
      lines.push(`<line class="surface-unroll-line generator" x1="${tx.toFixed(2)}" y1="${y.toFixed(2)}" x2="${tx.toFixed(2)}" y2="${(y + h).toFixed(2)}"/>`);
    }
    for (let i = 0; i <= courseCount; i++) {
      const ty = y + (h * i) / courseCount;
      lines.push(`<line class="surface-unroll-line course" x1="${x.toFixed(2)}" y1="${ty.toFixed(2)}" x2="${(x + w).toFixed(2)}" y2="${ty.toFixed(2)}"/>`);
    }
    if (isTeachingDrawingPreset()) labels.push(`<text class="surface-unroll-title" x="${x.toFixed(2)}" y="${(y - 14).toFixed(2)}">cylindrical unroll: rectangle</text>`);
    labels.push(`<text class="surface-unroll-label" x="${(x + w * 0.5).toFixed(2)}" y="${(y + h + 18).toFixed(2)}" text-anchor="middle">vault length ${formatM(developedLength)}</text>`);
    labels.push(`<text class="surface-unroll-label" x="${(x - 10).toFixed(2)}" y="${(y + h * 0.5).toFixed(2)}" text-anchor="end">arch length ${formatM(archLength)}</text>`);
  } else if (state.surfacePrinciple === "Cone") {
    const cx = layout.x + layout.w * 0.5;
    const cy = layout.y + layout.h * 0.88;
    const outerR = Math.min(layout.w, layout.h) * 0.58;
    const innerR = outerR * clamp((state.params.rise + state.params.thickness) / Math.max(state.params.rise + state.params.thickness * 2.8, 0.001), 0.52, 0.86);
    const start = -Math.PI * 0.82;
    const end = -Math.PI * 0.18;
    const pt = (r, a) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    const [o0x, o0y] = pt(outerR, start);
    const [o1x, o1y] = pt(outerR, end);
    const [i1x, i1y] = pt(innerR, end);
    const [i0x, i0y] = pt(innerR, start);
    fills.push(`<path class="surface-unroll-fill" d="M ${o0x.toFixed(2)} ${o0y.toFixed(2)} A ${outerR.toFixed(2)} ${outerR.toFixed(2)} 0 0 1 ${o1x.toFixed(2)} ${o1y.toFixed(2)} L ${i1x.toFixed(2)} ${i1y.toFixed(2)} A ${innerR.toFixed(2)} ${innerR.toFixed(2)} 0 0 0 ${i0x.toFixed(2)} ${i0y.toFixed(2)} Z"/>`);
    for (let i = 0; i <= blockCount; i++) {
      const a = start + ((end - start) * i) / blockCount;
      const [x0, y0] = pt(innerR, a);
      const [x1, y1] = pt(outerR, a);
      lines.push(`<line class="surface-unroll-line generator" x1="${x0.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}"/>`);
    }
    for (let i = 0; i <= courseCount; i++) {
      const r = innerR + ((outerR - innerR) * i) / courseCount;
      const [a0x, a0y] = pt(r, start);
      const [a1x, a1y] = pt(r, end);
      lines.push(`<path class="surface-unroll-line course" d="M ${a0x.toFixed(2)} ${a0y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${a1x.toFixed(2)} ${a1y.toFixed(2)}"/>`);
    }
    if (isTeachingDrawingPreset()) labels.push(`<text class="surface-unroll-title" x="${(layout.x + 20).toFixed(2)}" y="${(layout.y - 14).toFixed(2)}">conical unroll: annular sector</text>`);
    labels.push(`<text class="surface-unroll-label" x="${cx.toFixed(2)}" y="${(cy - outerR - 12).toFixed(2)}" text-anchor="middle">generators locate true panels</text>`);
  } else if (state.surfacePrinciple === "Sphere") {
    const goreCount = Math.max(6, Math.min(16, Math.round(blockCount / 2)));
    const goreW = w / goreCount;
    const goreH = h;
    for (let i = 0; i < goreCount; i++) {
      const gx = x + i * goreW;
      const mid = gx + goreW * 0.5;
      const d = `M ${mid.toFixed(2)} ${y.toFixed(2)} C ${(gx + goreW * 0.04).toFixed(2)} ${(y + goreH * 0.25).toFixed(2)}, ${(gx + goreW * 0.08).toFixed(2)} ${(y + goreH * 0.75).toFixed(2)}, ${mid.toFixed(2)} ${(y + goreH).toFixed(2)} C ${(gx + goreW * 0.92).toFixed(2)} ${(y + goreH * 0.75).toFixed(2)}, ${(gx + goreW * 0.96).toFixed(2)} ${(y + goreH * 0.25).toFixed(2)}, ${mid.toFixed(2)} ${y.toFixed(2)} Z`;
      fills.push(`<path class="surface-unroll-fill gore" d="${d}"/>`);
      for (let c = 1; c < Math.min(courseCount, 10); c++) {
        const ty = y + (goreH * c) / Math.min(courseCount, 10);
        const pinch = Math.sin((c / Math.min(courseCount, 10)) * Math.PI);
        const half = goreW * 0.45 * pinch;
        lines.push(`<line class="surface-unroll-line course" x1="${(mid - half).toFixed(2)}" y1="${ty.toFixed(2)}" x2="${(mid + half).toFixed(2)}" y2="${ty.toFixed(2)}"/>`);
      }
    }
    if (isTeachingDrawingPreset()) labels.push(`<text class="surface-unroll-title" x="${x.toFixed(2)}" y="${(y - 14).toFixed(2)}">spherical map: meridian gores</text>`);
    labels.push(`<text class="surface-unroll-label" x="${(x + w * 0.5).toFixed(2)}" y="${(y + h + 18).toFixed(2)}" text-anchor="middle">approximate true shape by gores, not a single flat rectangle</text>`);
  } else {
    fills.push(`<rect class="surface-unroll-fill" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}"/>`);
    for (let i = 0; i <= density; i++) {
      const t = i / density;
      const x0 = x + w * t;
      const y0 = y;
      const x1 = x + w * (1 - t * 0.72);
      const y1 = y + h;
      lines.push(`<line class="surface-unroll-line generator" x1="${x0.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}"/>`);
    }
    if (isTeachingDrawingPreset()) labels.push(`<text class="surface-unroll-title" x="${x.toFixed(2)}" y="${(y - 14).toFixed(2)}">ruled / compound development: generator net</text>`);
  }

  return [`<g class="surface-unroll-overlay">`, ...fills, ...lines, ...labels, `</g>`];
};

const buildTraitOverlay2d = (frames) => {
  if (isCustomHostWorkflow()) return [];
  if (!state.view2dOptions.showTraitLines || !state.view2dOptions.showGuides) return [];
  const ref = frames.reference;
  const layout = frames.layout;
  const density = clamp(Math.round(state.view2dOptions.guideDensity || 8), 3, 18);
  const lines = [];
  const labels = [];
  const labelOn = state.view2dOptions.showLabels;
  const refCx = ref.x + ref.w * 0.5;
  const refSpringY = ref.y + ref.h * 0.78;
  const refHalfW = clamp(state.params.span * 8.5 * 0.5, 60, ref.w * 0.42);
  const refRise = clamp(state.params.rise * 8.5, 36, ref.h * 0.56);
  const refLeft = refCx - refHalfW;
  const refRight = refCx + refHalfW;
  const refApexY = refSpringY - refRise;
  const layoutCx = layout.x + layout.w * 0.5;
  const layoutCy = layout.y + layout.h * 0.5;
  const step = state.traitStep;

  const allowProjection = state.view2dOptions.showProjectionRays && traitStepActive("Projection Rays");
  const allowCourses = state.view2dOptions.showCourseDivisions && traitStepActive("Course Divisions");
  const allowNormals = state.view2dOptions.showJointNormals && traitStepActive("Joint Normals");
  const allowDevelopment = state.view2dOptions.showDevelopmentLines && traitStepActive("Surface Development");
  const allowSection = traitStepActive("Section Curves");

  if (allowSection && ref.h > 0) {
    lines.push(`<line class="trait-line section" x1="${refLeft.toFixed(2)}" y1="${refSpringY.toFixed(2)}" x2="${refRight.toFixed(2)}" y2="${refSpringY.toFixed(2)}"/>`);
    lines.push(`<line class="trait-line section dashed" x1="${refCx.toFixed(2)}" y1="${refApexY.toFixed(2)}" x2="${refCx.toFixed(2)}" y2="${refSpringY.toFixed(2)}"/>`);
  }

  if (allowProjection && ref.h > 0) {
    const rayCount = Math.max(5, Math.min(13, density));
    for (let i = 0; i < rayCount; i++) {
      const t = rayCount === 1 ? 0.5 : i / (rayCount - 1);
      const x = refLeft + t * (refRight - refLeft);
      const profile = Math.max(0, evalBarrelArchProfile(Math.abs((t - 0.5) * 2)));
      const y = refSpringY - profile * refRise;
      const lx = layout.x + t * layout.w;
      lines.push(`<line class="trait-line projection" x1="${x.toFixed(2)}" y1="${y.toFixed(2)}" x2="${lx.toFixed(2)}" y2="${layout.y.toFixed(2)}"/>`);
    }
    if (labelOn && isTeachingDrawingPreset()) labels.push(`<text class="trait-label" x="${(layout.x + 10).toFixed(2)}" y="${(layout.y - 22).toFixed(2)}">projection rays</text>`);
  }

  if (allowCourses) {
    for (let i = 1; i < density; i++) {
      const t = i / density;
      const y = layout.y + layout.h * t;
      if (state.surfacePrinciple === "Sphere" || state.surfacePrinciple === "Compound / Intersection") {
        const sag = Math.sin(t * Math.PI) * layout.h * 0.035;
        lines.push(`<path class="trait-line course" d="M ${layout.x.toFixed(2)} ${y.toFixed(2)} Q ${layoutCx.toFixed(2)} ${(y - sag).toFixed(2)} ${(layout.x + layout.w).toFixed(2)} ${y.toFixed(2)}"/>`);
      } else {
        lines.push(`<line class="trait-line course" x1="${layout.x.toFixed(2)}" y1="${y.toFixed(2)}" x2="${(layout.x + layout.w).toFixed(2)}" y2="${y.toFixed(2)}"/>`);
      }
    }
  }

  if (allowNormals) {
    const normalCount = Math.max(5, Math.min(12, density));
    for (let i = 0; i < normalCount; i++) {
      const t = (i + 0.5) / normalCount;
      const x = layout.x + layout.w * t;
      const y = layout.y + layout.h * 0.62;
      let dx = 0;
      let dy = -38;
      if (state.surfacePrinciple === "Cone") dx = (t - 0.5) * -42;
      if (state.surfacePrinciple === "Sphere") {
        dx = (t - 0.5) * -54;
        dy = -34 + Math.abs(t - 0.5) * 18;
      }
      if (state.surfacePrinciple === "Ruled Surface") {
        dx = 34;
        dy = t < 0.5 ? -26 : 26;
      }
      if (state.surfacePrinciple === "Compound / Intersection") {
        dx = t < 0.5 ? 38 : -38;
        dy = -30;
      }
      lines.push(`<line class="trait-line normal" x1="${x.toFixed(2)}" y1="${y.toFixed(2)}" x2="${(x + dx).toFixed(2)}" y2="${(y + dy).toFixed(2)}"/>`);
    }
  }

  if (allowDevelopment) {
    lines.push(...buildSurfaceUnrollOverlay2d(layout, density));
  }

  if (labelOn && isTeachingDrawingPreset()) {
    labels.push(`<text class="trait-label title" x="${(layout.x + layout.w).toFixed(2)}" y="${(layout.y - 8).toFixed(2)}" text-anchor="end">Trait: ${step}</text>`);
  }
  return [`<g class="trait-overlay" data-trait-step="${step}">`, ...lines, ...labels, `</g>`];
};

const stereotomyStepActive = (name) => state.stereotomyStep === "All Stereotomy" || state.stereotomyStep === name;

const buildDerivedStereotomyOverlay2d = (frames) => {
  if (isCustomHostWorkflow()) return [];
  if (!state.view2dOptions.showDerivedStereotomy || !state.view2dOptions.showGuides) return [];
  const layout = frames.layout;
  const lines = [];
  const fills = [];
  const labels = [];
  const labelOn = state.view2dOptions.showLabels;
  const rows = Math.max(4, Math.round(state.params.courseCount * state.params.subdivisionDensity));
  const cols = Math.max(6, Math.round(state.params.blockCount * state.params.subdivisionDensity));
  const cx = layout.x + layout.w * 0.5;
  const cy = layout.y + layout.h * 0.5;
  const showCourses = stereotomyStepActive("Courses");
  const showBed = state.view2dOptions.showBedJoints && stereotomyStepActive("Bed Joints");
  const showHead = state.view2dOptions.showHeadJoints && stereotomyStepActive("Head Joints");
  const showKey = state.view2dOptions.showKeystoneZone && stereotomyStepActive("Keystone Zone");
  const showPanels = state.view2dOptions.showTrueShapePanels && stereotomyStepActive("True-Shape Panels");
  const jointPrinciple = state.jointPrinciple;

  if (showCourses || showBed) {
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      const y = layout.y + layout.h * t;
      const cls = r === 0 || r === rows ? "bed boundary" : "bed";
      if (state.surfacePrinciple === "Sphere" || state.surfacePrinciple === "Compound / Intersection") {
        const sag = Math.sin(t * Math.PI) * layout.h * 0.04;
        lines.push(`<path class="stereotomy-line ${cls}" d="M ${layout.x.toFixed(2)} ${y.toFixed(2)} Q ${cx.toFixed(2)} ${(y - sag).toFixed(2)} ${(layout.x + layout.w).toFixed(2)} ${y.toFixed(2)}"/>`);
      } else {
        lines.push(`<line class="stereotomy-line ${cls}" x1="${layout.x.toFixed(2)}" y1="${y.toFixed(2)}" x2="${(layout.x + layout.w).toFixed(2)}" y2="${y.toFixed(2)}"/>`);
      }
    }
  }

  if (showHead) {
    for (let c = 0; c <= cols; c++) {
      const t = c / cols;
      const stagger = state.pattern === "Running bond" ? ((c % 2) * 0.5) / cols : 0;
      const x = layout.x + layout.w * clamp(t + stagger, 0, 1);
      if (jointPrinciple === "vertical exterior / convergent interior joints") {
        const baseX = layout.x + layout.w * t;
        const crownX = cx + (baseX - cx) * 0.18;
        lines.push(`<line class="stereotomy-line head vertical-face" x1="${baseX.toFixed(2)}" y1="${layout.y.toFixed(2)}" x2="${baseX.toFixed(2)}" y2="${(layout.y + layout.h * 0.34).toFixed(2)}"/>`);
        lines.push(`<line class="stereotomy-line head convergent-face" x1="${baseX.toFixed(2)}" y1="${(layout.y + layout.h * 0.34).toFixed(2)}" x2="${crownX.toFixed(2)}" y2="${(layout.y + layout.h).toFixed(2)}"/>`);
      } else if (jointPrinciple === "helical courses") {
        const drift = layout.w * 0.22;
        lines.push(`<path class="stereotomy-line head helical" d="M ${(x - drift * 0.5).toFixed(2)} ${layout.y.toFixed(2)} C ${(x + drift).toFixed(2)} ${(layout.y + layout.h * 0.32).toFixed(2)}, ${(x - drift).toFixed(2)} ${(layout.y + layout.h * 0.68).toFixed(2)}, ${(x + drift * 0.5).toFixed(2)} ${(layout.y + layout.h).toFixed(2)}"/>`);
      } else if (jointPrinciple === "spherical meridian / parallel joints") {
        lines.push(`<path class="stereotomy-line head meridian" d="M ${x.toFixed(2)} ${layout.y.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${x.toFixed(2)} ${(layout.y + layout.h).toFixed(2)}"/>`);
      } else if (jointPrinciple === "fan ribs") {
        const springX = layout.x + layout.w * 0.5;
        const springY = layout.y + layout.h;
        const endX = layout.x + layout.w * t;
        const endY = layout.y;
        lines.push(`<line class="stereotomy-line head fan-rib" x1="${springX.toFixed(2)}" y1="${springY.toFixed(2)}" x2="${endX.toFixed(2)}" y2="${endY.toFixed(2)}"/>`);
      } else if (jointPrinciple === "conic generatrix joints" || state.surfacePrinciple === "Cone") {
        const topX = cx + (x - cx) * 0.84;
        lines.push(`<line class="stereotomy-line head generator" x1="${topX.toFixed(2)}" y1="${layout.y.toFixed(2)}" x2="${x.toFixed(2)}" y2="${(layout.y + layout.h).toFixed(2)}"/>`);
      } else if (state.surfacePrinciple === "Ruled Surface") {
        const drift = (t - 0.5) * layout.w * 0.12;
        lines.push(`<line class="stereotomy-line head" x1="${(x + drift).toFixed(2)}" y1="${layout.y.toFixed(2)}" x2="${(x - drift).toFixed(2)}" y2="${(layout.y + layout.h).toFixed(2)}"/>`);
      } else if (jointPrinciple === "groin-line courses" || (state.surfacePrinciple === "Compound / Intersection" && state.pattern === "Groin-line courses")) {
        lines.push(`<line class="stereotomy-line head" x1="${x.toFixed(2)}" y1="${layout.y.toFixed(2)}" x2="${cx.toFixed(2)}" y2="${cy.toFixed(2)}"/>`);
        lines.push(`<line class="stereotomy-line head" x1="${x.toFixed(2)}" y1="${(layout.y + layout.h).toFixed(2)}" x2="${cx.toFixed(2)}" y2="${cy.toFixed(2)}"/>`);
      } else if (jointPrinciple === "radial joints") {
        lines.push(`<line class="stereotomy-line head radial" x1="${cx.toFixed(2)}" y1="${cy.toFixed(2)}" x2="${x.toFixed(2)}" y2="${(layout.y + layout.h).toFixed(2)}"/>`);
      } else {
        lines.push(`<line class="stereotomy-line head" x1="${x.toFixed(2)}" y1="${layout.y.toFixed(2)}" x2="${x.toFixed(2)}" y2="${(layout.y + layout.h).toFixed(2)}"/>`);
      }
    }
  }

  if (showHead && jointPrinciple === "radial joints") {
    const detailX = layout.x + layout.w * 0.06;
    const detailY = layout.y + layout.h * 0.08;
    const faceW = Math.min(92, layout.w * 0.12);
    const faceH = Math.min(54, layout.h * 0.12);
    const taper = clamp(state.params.thickness * 12, 8, 20);
    const p1 = `${detailX.toFixed(2)},${(detailY + faceH).toFixed(2)} ${(detailX + faceW).toFixed(2)},${(detailY + faceH - 5).toFixed(2)} ${(detailX + faceW - taper).toFixed(2)},${detailY.toFixed(2)} ${(detailX + taper).toFixed(2)},${(detailY + 5).toFixed(2)}`;
    const p2x = detailX + faceW + 22;
    const p2 = `${p2x.toFixed(2)},${(detailY + faceH).toFixed(2)} ${(p2x + faceW).toFixed(2)},${(detailY + faceH - 2).toFixed(2)} ${(p2x + faceW - taper * 0.55).toFixed(2)},${(detailY + 6).toFixed(2)} ${(p2x + taper * 0.55).toFixed(2)},${detailY.toFixed(2)}`;
    fills.push(`<polygon class="radial-cut-face primary" points="${p1}"/>`);
    fills.push(`<polygon class="radial-cut-face secondary" points="${p2}"/>`);
    lines.push(`<line class="radial-cut-ray detail" x1="${(detailX + faceW * 0.5).toFixed(2)}" y1="${(detailY + faceH + 26).toFixed(2)}" x2="${(detailX + faceW * 0.5).toFixed(2)}" y2="${(detailY + faceH - 2).toFixed(2)}"/>`);
    lines.push(`<line class="radial-cut-ray detail" x1="${(p2x + faceW * 0.5).toFixed(2)}" y1="${(detailY + faceH + 26).toFixed(2)}" x2="${(p2x + faceW * 0.5).toFixed(2)}" y2="${(detailY + faceH - 2).toFixed(2)}"/>`);
    if (labelOn) labels.push(`<text class="stereotomy-label small" x="${detailX.toFixed(2)}" y="${(detailY - 8).toFixed(2)}">radial head-cut faces</text>`);
  }

  if (showKey) {
    const keyW = layout.w * clamp(state.params.keystoneSize || 0.35, 0.12, 0.9) * 0.16;
    const keyH = layout.h * 0.12;
    const keyY = layout.y + layout.h * 0.04;
    if (state.surfacePrinciple === "Sphere" || state.vaultType === "Dome") {
      fills.push(`<ellipse class="stereotomy-zone keystone" cx="${cx.toFixed(2)}" cy="${(layout.y + layout.h * 0.18).toFixed(2)}" rx="${(keyW * 1.7).toFixed(2)}" ry="${keyH.toFixed(2)}"/>`);
    } else if (state.surfacePrinciple === "Cylinder" || state.surfacePrinciple === "Cone" || state.surfacePrinciple === "Ruled Surface") {
      fills.push(`<rect class="stereotomy-zone keystone continuous" x="${(cx - keyW).toFixed(2)}" y="${layout.y.toFixed(2)}" width="${(keyW * 2).toFixed(2)}" height="${layout.h.toFixed(2)}"/>`);
      lines.push(`<line class="stereotomy-line keystone-axis" x1="${cx.toFixed(2)}" y1="${layout.y.toFixed(2)}" x2="${cx.toFixed(2)}" y2="${(layout.y + layout.h).toFixed(2)}"/>`);
    } else {
      fills.push(`<rect class="stereotomy-zone keystone" x="${(cx - keyW).toFixed(2)}" y="${keyY.toFixed(2)}" width="${(keyW * 2).toFixed(2)}" height="${keyH.toFixed(2)}"/>`);
    }
    if (labelOn && isTeachingDrawingPreset()) labels.push(`<text class="stereotomy-label" x="${(cx + keyW + 10).toFixed(2)}" y="${(layout.y - 8).toFixed(2)}">keystone zone</text>`);
  }

  if (showPanels) {
    const panelX = layout.x + layout.w - 174;
    const panelY = layout.y + layout.h - 120;
    const panelW = 45;
    const panelH = 58;
    const skew = state.surfacePrinciple === "Cone" ? 12 : state.surfacePrinciple === "Ruled Surface" ? -14 : 0;
    const panelA = `${panelX},${panelY + panelH} ${panelX + panelW},${panelY + panelH - 6} ${panelX + panelW + skew},${panelY + 6} ${panelX + skew},${panelY}`;
    const panelB = `${panelX + 62},${panelY + panelH} ${panelX + 62 + panelW},${panelY + panelH - 2} ${panelX + 62 + panelW - skew * 0.55},${panelY + 8} ${panelX + 62 - skew * 0.55},${panelY + 2}`;
    fills.push(`<polygon class="true-shape-panel" points="${panelA}"/>`);
    fills.push(`<polygon class="true-shape-panel secondary" points="${panelB}"/>`);
    lines.push(`<line class="stereotomy-line panel-fold" x1="${(panelX + 55).toFixed(2)}" y1="${(panelY + 10).toFixed(2)}" x2="${(panelX + 55).toFixed(2)}" y2="${(panelY + panelH).toFixed(2)}"/>`);
    if (labelOn && isTeachingDrawingPreset()) labels.push(`<text class="stereotomy-label" x="${panelX.toFixed(2)}" y="${(layout.y + layout.h + 18).toFixed(2)}">true-shape panels / panneaux</text>`);
  }

  if (labelOn && isTeachingDrawingPreset()) {
    labels.push(`<text class="stereotomy-label title" x="${layout.x.toFixed(2)}" y="${(layout.y + layout.h + 18).toFixed(2)}">Derived stereotomy: ${state.stereotomyStep}</text>`);
  }
  return [`<g class="derived-stereotomy" data-stereotomy-step="${state.stereotomyStep}">`, ...fills, ...lines, ...labels, `</g>`];
};

const buildDraftingGrid2d = () => {
  if (!state.display.baseGrid) return [];
  const lines = [];
  const xMin = Math.floor(state.view2d.x / 20) * 20;
  const xMax = Math.ceil((state.view2d.x + state.view2d.w) / 20) * 20;
  const yMin = Math.floor(state.view2d.y / 20) * 20;
  const yMax = Math.ceil((state.view2d.y + state.view2d.h) / 20) * 20;
  for (let gx = xMin; gx <= xMax; gx += 20) {
    const major = Math.abs(gx % 100) < 0.001;
    lines.push(`<line x1="${gx}" y1="${yMin}" x2="${gx}" y2="${yMax}" stroke="${major ? "rgba(173,215,255,0.30)" : "rgba(173,215,255,0.11)"}" stroke-width="${major ? 1.2 : 0.7}"/>`);
  }
  for (let gy = yMin; gy <= yMax; gy += 20) {
    const major = Math.abs(gy % 100) < 0.001;
    lines.push(`<line x1="${xMin}" y1="${gy}" x2="${xMax}" y2="${gy}" stroke="${major ? "rgba(173,215,255,0.30)" : "rgba(173,215,255,0.11)"}" stroke-width="${major ? 1.2 : 0.7}"/>`);
  }
  return lines;
};

const activeFabricationFailureKey = () => fabricationCheckByLabel[state.fabricationCheck]?.key || null;

const blockFailsFabricationCheck = (block) => {
  const failures = block.failed || [];
  if (!failures.length) return false;
  const key = activeFabricationFailureKey();
  return key ? failures.includes(key) : true;
};

const summarizeFabricationFailures = () => {
  const key = activeFabricationFailureKey();
  const summary = {};
  let failedBlocks = 0;
  state.blocks.forEach((block) => {
    const failures = block.failed || [];
    const relevant = key ? failures.filter((item) => item === key) : failures;
    if (!relevant.length) return;
    failedBlocks += 1;
    relevant.forEach((item) => {
      summary[item] = (summary[item] || 0) + 1;
    });
  });
  return { failedBlocks, summary };
};

const diagnosticLabel = (key) => ({
  "length": "block length",
  "width": "block width",
  "thickness": "minimum thickness",
  "weight": "block weight",
  "taper": "joint taper",
  "min-edge": "minimum edge",
  "bed-depth": "bed depth",
  "convexity": "cell convexity",
  "non-manifold": "manifold topology",
  "stretched-cell": "stretched cells",
  "twisted-patch": "twisted patches",
  "mapping-distortion": "component mapping distortion",
  "taper-distortion": "taper distortion",
})[key] || String(key || "review item").replace(/-/g, " ");

const diagnosticSuggestion = (key) => ({
  "length": "Reduce block length or increase field divisions.",
  "width": "Reduce block width or change the cell fill mode.",
  "thickness": "Increase block thickness or switch thickness mapping.",
  "weight": "Lower block size, reduce thickness, or split dense zones.",
  "taper": "Reduce taper angle or choose a more local component frame.",
  "min-edge": "Increase minimum bed depth or clean dual boundary cells.",
  "bed-depth": "Increase bed depth or reduce patch subdivision.",
  "convexity": "Switch to primal cells or clean fan/frame boundary cells.",
  "non-manifold": "Use separate blocks or inspect merged fabrication seams.",
  "stretched-cell": "Increase local field divisions or use patch/fan fill only in smaller zones.",
  "twisted-patch": "Lower patch smoothing or split cells across high curvature.",
  "mapping-distortion": "Try local-frame mapping or preserve component scale.",
  "taper-distortion": "Reduce field-driven taper or relax the taper limit.",
})[key] || "Review the highlighted blocks and adjust the active strategy or fabrication limits.";

const renderDiagnosticSummary = ({ invalid, summary, processWarnings, historicalIssues }) => {
  if (!nodes.diagnosticSummary) return;
  const sortedIssues = Object.entries(summary || {}).sort((a, b) => b[1] - a[1]);
  const primary = sortedIssues[0];
  const historicalFails = historicalIssues.filter((item) => item.status === "fail").length;
  const status = invalid.length
    ? "failed"
    : (processWarnings.length || historicalIssues.length ? "warning" : "clean");
  const statusLabel = status === "failed" ? "Failed" : status === "warning" ? "Warning" : "Clean";
  const primaryLabel = primary
    ? `${diagnosticLabel(primary[0])}: ${primary[1]} block${primary[1] === 1 ? "" : "s"}`
    : historicalIssues.length
      ? `historical validation: ${historicalFails} fail, ${historicalIssues.length - historicalFails} warning(s)`
      : processWarnings[0] || "no active issues";
  const suggestion = primary
    ? diagnosticSuggestion(primary[0])
    : historicalIssues.length
      ? historicalIssues[0].detail
      : processWarnings[0]
        ? "Advance the workflow stage or review the relevant operation before export."
        : "Ready for block review and export.";
  nodes.diagnosticSummary.innerHTML = [
    `<div class="diagnostic-status ${status}"><span>${statusLabel}</span><b>${invalid.length} invalid / ${state.blocks.length} blocks</b></div>`,
    `<div class="diagnostic-primary"><span>Primary issue</span><b>${primaryLabel}</b></div>`,
    `<div class="diagnostic-suggestion"><span>Suggested fix</span><b>${suggestion}</b></div>`,
  ].join("");
};

const evaluateHistoricalFamilyValidation = () => {
  const tpl = constructionTemplateCatalog[state.constructionTemplate];
  const blocks = state.blocks || [];
  const total = Math.max(blocks.length, 1);
  const invalidConvex = blocks.filter((b) => (b.failed || []).includes("convexity")).length;
  const narrowFaces = blocks.filter((b) => (b.failed || []).includes("min-edge")).length;
  const courseDivisions = Math.round(state.params.courseCount * state.params.subdivisionDensity);
  const blockDivisions = Math.round(state.params.blockCount * state.params.subdivisionDensity);
  const relevantPattern = tpl?.pattern === state.pattern || jointPrinciples[state.jointPrinciple]?.pattern === state.pattern;
  const continuityOk = blocks.length > 0 && courseDivisions >= 4 && blockDivisions >= 4;
  const expectedJoint = tpl
    ? state.jointPrinciple === inferJointPrincipleFromTemplate(tpl) || relevantPattern
    : Boolean(jointPrinciples[state.jointPrinciple]);
  const developmentOp = projectionDevelopmentOperations[state.projectionOperation];
  const needsDevelopment = ["Cylinder", "Cone", "Sphere", "Ruled Surface"].includes(state.surfacePrinciple);
  const unrollOperations = {
    Cylinder: ["Unfold Cylindrical Surface", "Generate Panel Templates / Panneaux", "Show True Shape Of Face"],
    Cone: ["Unfold Conical Surface", "Generate Panel Templates / Panneaux", "Show True Shape Of Face"],
    Sphere: ["Map Plane Pattern To Sphere", "Generate Panel Templates / Panneaux", "Show True Shape Of Face"],
    "Ruled Surface": ["Generate Panel Templates / Panneaux", "Show True Shape Of Face"],
  };
  const developmentOk = !needsDevelopment
    || state.view2dOptions.mode === "Surface Development"
    || state.view2dOptions.showTrueShapePanels
    || (unrollOperations[state.surfacePrinciple] || []).includes(state.projectionOperation);
  const offsetOk = state.params.thickness > 0
    && state.constructionEntities.intrados.show
    && state.constructionEntities.extrados.show
    && state.constructionEntities.neutral.show;
  const plateMatch = tpl
    ? tpl.vaultType === state.vaultType
      && tpl.surfacePrinciple === state.surfacePrinciple
      && relevantPattern
    : false;
  const sphereApprox = state.surfacePrinciple === "Sphere" && developmentOp?.surfacePrinciple === "Sphere";

  return [
    {
      key: "course-continuity",
      label: "Course continuity",
      status: continuityOk ? "pass" : "warn",
      detail: continuityOk ? `${courseDivisions} courses by ${blockDivisions} head divisions preserve the derived field.` : "Use at least four course divisions and four head divisions.",
    },
    {
      key: "joint-direction",
      label: "Expected normal/radial joints",
      status: expectedJoint ? "pass" : "warn",
      detail: expectedJoint ? `${state.jointPrinciple} matches the active template logic.` : `Template expects ${tpl ? inferJointPrincipleFromTemplate(tpl) : "a defined joint principle"}.`,
    },
    {
      key: "block-convexity",
      label: "Block convexity",
      status: invalidConvex ? "fail" : "pass",
      detail: invalidConvex ? `${invalidConvex} of ${total} blocks fail convexity.` : "All generated block UVs are convex.",
    },
    {
      key: "narrow-faces",
      label: "Too-narrow faces",
      status: narrowFaces ? "fail" : "pass",
      detail: narrowFaces ? `${narrowFaces} of ${total} blocks are below minimum edge length.` : "No generated faces are below the minimum edge length.",
    },
    {
      key: "true-shape-development",
      label: "Surface development / true shape",
      status: developmentOk ? (sphereApprox ? "warn" : "pass") : "warn",
      detail: developmentOk
        ? sphereApprox ? "Spherical development is shown as meridian gores, an approximation rather than one true flat sheet." : `${state.surfacePrinciple} development is active or not required.`
        : "Use a matching unroll/development operation or enable true-shape panels.",
    },
    {
      key: "offset-coherence",
      label: "Intrados/extrados offset coherence",
      status: offsetOk ? "pass" : "warn",
      detail: offsetOk ? `Thickness ${metersToCmInput(state.params.thickness)} cm with intrados, neutral, and extrados visible.` : "Show intrados, neutral curve, and extrados with positive thickness.",
    },
    {
      key: "fallacara-family",
      label: "Fallacara plate-family match",
      status: plateMatch ? "pass" : "warn",
      detail: tpl ? `${state.constructionTemplate}: ${tpl.plateRange}${plateMatch ? " matches current source/pattern." : " differs from current source, surface, or pattern."}` : "Select a 2D construction template.",
    },
  ];
};

const renderHistoricalValidation = () => {
  const el = nodes.historicalValidation;
  if (!el) return;
  const results = state.historicalValidationResults;
  const fails = results.filter((item) => item.status === "fail").length;
  const warns = results.filter((item) => item.status === "warn").length;
  const passes = results.length - fails - warns;
  const status = fails ? "fail" : warns ? "warn" : "pass";
  const label = fails ? "Invalid" : warns ? "Needs review" : "Passing";
  el.innerHTML = [
    `<details class="validation-details">`,
    `<summary class="validation-summary ${status}"><span class="validation-dot"></span><b>${label}</b><span>${passes} pass | ${warns} review | ${fails} invalid</span></summary>`,
    `<div class="validation-head"><b>Historical Family Validation</b><span>${state.constructionTemplate}</span></div>`,
    ...results.map((item) => `<div class="historical-check ${item.status}"><b>${item.label}</b><span>${item.detail}</span></div>`),
    `</details>`,
  ].join("");
};

const edgeKeyFromUv = (a, b) => {
  const pa = `${Number(a[0]).toFixed(5)},${Number(a[1]).toFixed(5)}`;
  const pb = `${Number(b[0]).toFixed(5)},${Number(b[1]).toFixed(5)}`;
  return pa < pb ? `${pa}|${pb}` : `${pb}|${pa}`;
};

const analyzeBlockNgonTopology = (blocks = state.blocks) => {
  const edgeMap = new Map();
  const vertexMap = new Map();
  const addVertex = (p, neighbour) => {
    const key = `${Number(p[0]).toFixed(5)},${Number(p[1]).toFixed(5)}`;
    if (!vertexMap.has(key)) vertexMap.set(key, new Set());
    if (neighbour) vertexMap.get(key).add(neighbour);
    return key;
  };
  blocks.forEach((block) => {
    const uv = block.uv || [];
    uv.forEach((p, i) => {
      const next = uv[(i + 1) % uv.length];
      const prev = uv[(i - 1 + uv.length) % uv.length];
      const key = addVertex(p);
      vertexMap.get(key).add(addVertex(next));
      vertexMap.get(key).add(addVertex(prev));
      const edgeKey = edgeKeyFromUv(p, next);
      if (!edgeMap.has(edgeKey)) edgeMap.set(edgeKey, { blocks: [], length: 0 });
      const entry = edgeMap.get(edgeKey);
      entry.blocks.push(block.id);
      entry.length = Math.hypot(next[0] - p[0], next[1] - p[1]);
    });
  });
  const edges = [...edgeMap.values()];
  const nakedEdges = edges.filter((edge) => edge.blocks.length === 1);
  const sharedEdges = edges.filter((edge) => edge.blocks.length === 2);
  const nonManifoldEdges = edges.filter((edge) => edge.blocks.length > 2);
  const valences = [...vertexMap.values()].map((neighbours) => neighbours.size);
  return {
    faceCount: blocks.length,
    edgeCount: edges.length,
    vertexCount: vertexMap.size,
    nakedEdgeCount: nakedEdges.length,
    sharedEdgeCount: sharedEdges.length,
    nonManifoldEdgeCount: nonManifoldEdges.length,
    averageValence: valences.length ? valences.reduce((sum, v) => sum + v, 0) / valences.length : 0,
    maxValence: valences.length ? Math.max(...valences) : 0,
    averageEdgeLength: edges.length ? edges.reduce((sum, edge) => sum + edge.length, 0) / edges.length : 0,
  };
};

const analyzeBlockPlanarity = (blocks = state.blocks) => {
  const deviations = [];
  const plane = new THREE.Plane();
  blocks.forEach((block) => {
    const q = block.metrics?.q || [];
    if (q.length < 3) return;
    plane.setFromCoplanarPoints(q[0], q[1], q[2]);
    if (plane.normal.lengthSq() < 1e-8) return;
    const maxDeviation = q.reduce((max, point) => Math.max(max, Math.abs(plane.distanceToPoint(point))), 0);
    deviations.push(maxDeviation);
  });
  return {
    checkedFaceCount: deviations.length,
    maxDeviation: deviations.length ? Math.max(...deviations) : 0,
    averageDeviation: deviations.length ? deviations.reduce((sum, v) => sum + v, 0) / deviations.length : 0,
    aboveToleranceCount: deviations.filter((v) => v > state.constraints.fabTolerance).length,
  };
};

const renderNgonDiagnostics = () => {
  const el = nodes.ngonDiagnostics;
  if (!el) return;
  const blockTopology = analyzeBlockNgonTopology();
  const planarity = analyzeBlockPlanarity();
  const source = state.importedTopology;
  const sourceRows = source ? [
    ["Source Meshes", source.meshCount],
    ["Source Triangles", source.triangleCount],
    ["Source Vertices", source.vertexCount],
    ["Source Edges", source.edgeCount],
    ["Boundary Edges", source.boundaryEdgeCount],
    ["Feature Edges", source.featureEdgeCount],
    ["Non-Manifold", source.nonManifoldEdgeCount],
    ["Avg Valence", source.averageValence.toFixed(2)],
  ] : [
    ["Source Meshes", "Built-in"],
    ["Source Triangles", "parametric"],
    ["Source Vertices", "derived"],
    ["Source Edges", "derived"],
  ];
  const blockRows = [
    ["Topology Cells", blockTopology.faceCount],
    ["Cell Edges", blockTopology.edgeCount],
    ["Cell Vertices", blockTopology.vertexCount],
    ["Shared Edges", blockTopology.sharedEdgeCount],
    ["Naked Edges", blockTopology.nakedEdgeCount],
    ["Non-Manifold Cells", blockTopology.nonManifoldEdgeCount],
    ["Cell Avg Valence", blockTopology.averageValence.toFixed(2)],
    ["Avg UV Edge", blockTopology.averageEdgeLength.toFixed(3)],
  ];
  const tolerance = state.constraints.fabTolerance;
  const planarityStatus = planarity.aboveToleranceCount ? "warn" : "ok";
  const manifoldStatus = (source?.nonManifoldEdgeCount || blockTopology.nonManifoldEdgeCount) ? "bad" : "ok";
  const statusRows = [
    ["Planarity Max", `${metersToCmInput(planarity.maxDeviation)} cm`, planarityStatus],
    ["Planarity Avg", `${metersToCmInput(planarity.averageDeviation)} cm`, planarityStatus],
    ["Faces Over Tol.", `${planarity.aboveToleranceCount}/${Math.max(planarity.checkedFaceCount, 1)}`, planarityStatus],
    ["Tolerance", `${metersToCmInput(tolerance)} cm`, "ok"],
    ["Manifold Review", manifoldStatus === "ok" ? "clean" : "check", manifoldStatus],
  ];
  const row = ([k, v, status = ""]) => `<div class="diagnostic-cell ${status}"><b>${k}</b><span>${v}</span></div>`;
  el.innerHTML = [
    `<div class="diagnostic-group"><h3>Source Topology</h3>${sourceRows.map(row).join("")}</div>`,
    `<div class="diagnostic-group"><h3>Generated Cells</h3>${blockRows.map(row).join("")}</div>`,
    `<div class="diagnostic-group"><h3>Planarity + Manifold</h3>${statusRows.map(row).join("")}</div>`,
  ].join("");
};

const buildFabricationCheckOverlay2d = (frames) => {
  if (!state.view2dOptions.showFabricationChecks || !state.view2dOptions.showFabricationLegend) return [];
  const { failedBlocks, summary } = summarizeFabricationFailures();
  const layout = frames.layout;
  const x = layout.x + layout.w + 12;
  const y = layout.y + 16;
  const rows = Object.entries(summary)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);
  const status = failedBlocks
    ? `${failedBlocks} block${failedBlocks === 1 ? "" : "s"} need review`
    : "all blocks pass";
  const title = `Fabrication check: ${state.fabricationCheck}`;
  const rowText = rows.length
    ? rows.map(([key, count], i) => `<text class="fabrication-check-label" x="${x.toFixed(2)}" y="${(y + 50 + i * 16).toFixed(2)}">${fabricationLabelByKey[key] || key}: ${count}</text>`)
    : [`<text class="fabrication-check-label ok" x="${x.toFixed(2)}" y="${(y + 50).toFixed(2)}">No active failures</text>`];
  const toleranceY = y + 50 + Math.max(rows.length, 1) * 16 + 12;
  return [
    `<g class="fabrication-check-overlay">`,
    `<text class="fabrication-check-title" x="${x.toFixed(2)}" y="${y.toFixed(2)}">${title}</text>`,
    `<text class="fabrication-check-label ${failedBlocks ? "bad" : "ok"}" x="${x.toFixed(2)}" y="${(y + 22).toFixed(2)}">${status}</text>`,
    `<text class="fabrication-check-label" x="${x.toFixed(2)}" y="${(y + 36).toFixed(2)}">tolerance ${metersToCmInput(state.constraints.fabTolerance)} cm</text>`,
    ...rowText,
    `<line class="fabrication-tolerance-rule" x1="${x.toFixed(2)}" y1="${toleranceY.toFixed(2)}" x2="${(x + 64).toFixed(2)}" y2="${toleranceY.toFixed(2)}"/>`,
    `<text class="fabrication-check-label small" x="${x.toFixed(2)}" y="${(toleranceY + 14).toFixed(2)}">outside bounding box</text>`,
    `</g>`,
  ];
};

const buildContourFieldOverlay2d = (frames) => {
  if (isCustomHostWorkflow()) return [];
  if (!state.contourField.enabled || !state.contourField.showContours || !state.view2dOptions.showContourField) return [];
  const layout = frames.layout;
  const bands = clamp(Math.round(state.contourField.bands || 8), 2, 24);
  const lines = [];
  for (let i = 1; i < bands; i++) {
    const t = i / bands;
    if (["height", "weight", "reaction"].includes(state.contourField.source)) {
      const y = layout.y + (1 - t) * layout.h;
      lines.push(`<line class="contour-line2d" x1="${layout.x.toFixed(2)}" y1="${y.toFixed(2)}" x2="${(layout.x + layout.w).toFixed(2)}" y2="${y.toFixed(2)}"/>`);
    } else {
      const cx = layout.x + layout.w * 0.5;
      const cy = layout.y + layout.h * 0.5;
      const rx = layout.w * (0.08 + t * 0.44);
      const ry = layout.h * (0.08 + t * 0.44);
      lines.push(`<ellipse class="contour-line2d" cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}"/>`);
    }
  }
  if (state.contourField.showMasks && state.view2dOptions.showContourField && state.contourField.maskMode !== "none") {
    if (state.contourField.maskMode === "opening" || state.contourField.maskMode === "crown") {
      lines.push(`<ellipse class="contour-mask2d" cx="${(layout.x + layout.w * 0.5).toFixed(2)}" cy="${(layout.y + layout.h * 0.5).toFixed(2)}" rx="${(layout.w * 0.105).toFixed(2)}" ry="${(layout.h * 0.105).toFixed(2)}"/>`);
    } else if (state.contourField.maskMode === "boundary") {
      lines.push(`<rect class="contour-mask2d" x="${layout.x.toFixed(2)}" y="${layout.y.toFixed(2)}" width="${layout.w.toFixed(2)}" height="${layout.h.toFixed(2)}" fill="none"/>`);
    } else if (state.contourField.maskMode === "support") {
      [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([u, v]) => {
        lines.push(`<circle class="contour-mask2d" cx="${(layout.x + u * layout.w).toFixed(2)}" cy="${(layout.y + (1 - v) * layout.h).toFixed(2)}" r="26"/>`);
      });
    } else if (state.contourField.maskMode === "low-weight") {
      lines.push(`<text class="contour-label2d" x="${layout.x.toFixed(2)}" y="${(layout.y - 10).toFixed(2)}">mask: low field weight</text>`);
    }
  }
  lines.push(`<text class="contour-label2d" x="${layout.x.toFixed(2)}" y="${(layout.y - 50).toFixed(2)}">contours: ${state.contourField.source}; bands ${bands}</text>`);
  return [`<g class="contour-field-overlay">`, ...lines, `</g>`];
};

const buildStreamlineOverlay2d = (frames) => {
  if (isCustomHostWorkflow()) return [];
  if (!state.contourField.streamlines || !state.view2dOptions.showStreamlines) return [];
  const layout = frames.layout;
  const count = clamp(Math.round(state.contourField.streamlineCount || 9), 2, 24);
  const source = state.contourField.streamlineSource;
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const pts = [];
    for (let s = 0; s <= 24; s++) {
      const p = s / 24;
      let u = p;
      let v = t;
      if (source === "principal-curvature") {
        v = t + Math.sin((p * Math.PI * 2) + t * Math.PI) * 0.055;
      } else if (source === "guide") {
        const angle = (state.contourField.guideDirectionDeg || 0) * Math.PI / 180;
        u = p;
        v = t + (p - 0.5) * Math.tan(angle) * 0.35;
      } else {
        const pull = Math.sin(p * Math.PI) * 0.12;
        v = THREE.MathUtils.lerp(t, 0.5, pull);
      }
      pts.push(uvToLayoutPoint([clamp(u, 0, 1), clamp(v, 0, 1)], layout));
    }
    const d = pts.map(([x, y], idx) => `${idx ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
    out.push(`<path class="streamline2d" d="${d}"/>`);
  }
  out.push(`<text class="contour-label2d" x="${(layout.x + layout.w).toFixed(2)}" y="${(layout.y - 50).toFixed(2)}" text-anchor="end">streamlines: ${source}</text>`);
  return [`<g class="streamline-overlay">`, ...out, `</g>`];
};

const buildTopologyMorphOverlay2d = (frames) => {
  const show =
    state.strategyViewMode === "component-mapping" ||
    state.strategyViewMode === "distortion" ||
    (isPanelQuadSource(state.customPatternSource) && (state.panelMorphStrength || 0) > 0.001);
  if (!show || !isPanelQuadSource(state.customPatternSource) || !state.importedTissueCells?.length) return [];
  const layout = frames.layout;
  const maxCells = 2400;
  const stride = Math.max(1, Math.ceil(state.importedTissueCells.length / maxCells));
  const heat = [];
  const sourceEdges = [];
  const uvToTopologyLayoutPoint = ([u, v]) => [
    layout.x + clamp(u, 0, 1) * layout.w,
    layout.y + clamp(v, 0, 1) * layout.h,
  ];
  const weightColor = (weight) => {
    const w = clamp(weight, 0, 1);
    const stops = [
      [42, 92, 205],
      [56, 190, 220],
      [112, 220, 138],
      [240, 214, 76],
      [235, 112, 64],
      [200, 50, 65],
    ];
    const scaled = w * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(scaled));
    const t = scaled - i;
    const c = stops[i].map((value, channel) => Math.round(THREE.MathUtils.lerp(value, stops[i + 1][channel], t)));
    return `rgba(${c[0]},${c[1]},${c[2]},${THREE.MathUtils.lerp(0.18, 0.5, w).toFixed(2)})`;
  };
  const candidateLoops = state.importedTissueCells
    .map((cell, index) => {
      if (index % stride !== 0 || cell.uv?.length < 3) return null;
      const sourceUv = cell.uv;
      return { cell, index, sourceUv };
    })
    .filter(Boolean);
  const allEdgeLengths = candidateLoops
    .flatMap(({ sourceUv }) => sourceUv.map((point, i) => {
      const next = sourceUv[(i + 1) % sourceUv.length];
      return Math.hypot(next[0] - point[0], next[1] - point[1]);
    }))
    .filter((value) => Number.isFinite(value) && value > 1e-6)
    .sort((a, b) => a - b);
  const typicalEdge = allEdgeLengths[Math.floor(allEdgeLengths.length * 0.5)] || 0.05;
  const maxDrawableEdge = clamp(typicalEdge * 5, 0.08, 0.24);
  const edgeTouchesSurface = (a, b) => {
    if (!state.importedSurface) return true;
    const samples = [0.25, 0.5, 0.75].map((t) => [
      THREE.MathUtils.lerp(a[0], b[0], t),
      THREE.MathUtils.lerp(a[1], b[1], t),
    ]);
    return samples.every(([u, v]) => !!getImportedSurfaceSample(clamp(u, 0, 1), clamp(v, 0, 1)));
  };
  const isDrawableLoop = (uvLoop) => {
    if (!uvLoop?.length || uvLoop.length < 3) return false;
    if (uvLoop.some(([u, v]) => !Number.isFinite(u) || !Number.isFinite(v))) return false;
    const lengths = uvLoop.map((point, i) => {
      const next = uvLoop[(i + 1) % uvLoop.length];
      return Math.hypot(next[0] - point[0], next[1] - point[1]);
    }).filter(Number.isFinite);
    if (!lengths.length) return false;
    const maxEdge = Math.max(...lengths);
    const medianEdge = [...lengths].sort((a, b) => a - b)[Math.floor(lengths.length * 0.5)] || maxEdge;
    const us = uvLoop.map(([u]) => u);
    const vs = uvLoop.map(([, v]) => v);
    const uSpan = Math.max(...us) - Math.min(...us);
    const vSpan = Math.max(...vs) - Math.min(...vs);
    if (uSpan > 0.55 || vSpan > 0.55) return false;
    if (maxEdge > maxDrawableEdge || maxEdge > Math.max(0.08, medianEdge * 4)) return false;
    const screenPts = uvLoop.map(uvToTopologyLayoutPoint);
    const xs = screenPts.map(([x]) => x);
    const ys = screenPts.map(([, y]) => y);
    const screenSpanX = Math.max(...xs) - Math.min(...xs);
    const screenSpanY = Math.max(...ys) - Math.min(...ys);
    const longestScreenSpan = Math.max(screenSpanX / layout.w, screenSpanY / layout.h);
    if (longestScreenSpan > 0.55) return false;
    const screenArea = Math.abs(screenPts.reduce((sum, [x1, y1], i) => {
      const [x2, y2] = screenPts[(i + 1) % screenPts.length];
      return sum + x1 * y2 - x2 * y1;
    }, 0)) * 0.5;
    const bboxArea = Math.max(1, screenSpanX * screenSpanY);
    if (longestScreenSpan > 0.18 && screenArea / bboxArea < 0.04) return false;
    return true;
  };
  candidateLoops.forEach(({ index, sourceUv }) => {
    if (!isDrawableLoop(sourceUv)) return;
    const screenPts = sourceUv.map(uvToTopologyLayoutPoint);
    const points = screenPts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    const weight = getPanelMorphWeight(sourceUv, `topology-weight-${index}`);
    heat.push(`<polygon class="topology-weight2d" points="${points}" style="fill:${weightColor(weight)};"/>`);
    sourceUv.forEach((point, i) => {
      const nextIndex = (i + 1) % sourceUv.length;
      const next = sourceUv[nextIndex];
      const edgeLength = Math.hypot(next[0] - point[0], next[1] - point[1]);
      if (!Number.isFinite(edgeLength) || edgeLength > maxDrawableEdge) return;
      const [x1, y1] = screenPts[i];
      const [x2, y2] = screenPts[nextIndex];
      sourceEdges.push(
        `<line class="topology-source2d" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`,
      );
    });
  });
  if (!heat.length && !sourceEdges.length) return [];
  const labelY = layout.y + 18;
  const rampX = layout.x + 378;
  const ramp = Array.from({ length: 32 }, (_, i) => {
    const w0 = i / 32;
    return `<rect class="topology-ramp-cell2d" x="${(rampX + i * 5).toFixed(2)}" y="${(labelY - 6).toFixed(2)}" width="5.2" height="9" style="fill:${weightColor(w0)};"/>`;
  });
  return [
    `<g class="topology-morph-overlay">`,
    ...heat,
    ...sourceEdges,
    `<line class="topology-morph-key2d" x1="${layout.x.toFixed(2)}" y1="${labelY.toFixed(2)}" x2="${(layout.x + 42).toFixed(2)}" y2="${labelY.toFixed(2)}"/>`,
    `<text class="topology-morph-label2d" x="${(layout.x + 50).toFixed(2)}" y="${(labelY + 4).toFixed(2)}">curvature / field weight</text>`,
    ...ramp,
    `<text class="topology-morph-label2d" x="${(rampX - 24).toFixed(2)}" y="${(labelY + 4).toFixed(2)}">low</text>`,
    `<text class="topology-morph-label2d" x="${(rampX + 170).toFixed(2)}" y="${(labelY + 4).toFixed(2)}">high</text>`,
    `</g>`,
  ];
};

const buildProjectionOperationOverlay2d = (frames) => {
  const op = projectionDevelopmentOperations[state.projectionOperation];
  if (!op || !state.view2dOptions.showLabels || !isTeachingDrawingPreset()) return [];
  const layout = frames.layout;
  const x = layout.x;
  const y = layout.y + layout.h + 38;
  return [
    `<g class="projection-operation-overlay">`,
    `<text class="projection-operation-title" x="${x.toFixed(2)}" y="${y.toFixed(2)}">${state.projectionOperation}</text>`,
    `<text class="projection-operation-label" x="${x.toFixed(2)}" y="${(y + 16).toFixed(2)}">${op.description}</text>`,
    `</g>`,
  ];
};

const buildStrategyViewOverlay2d = (frames) => {
  const mode = state.strategyViewMode || "uv-layout";
  if (mode === "uv-layout") return [];
  const layout = frames.layout;
  const panelName = state.customPanel?.name || "built-in component";
  const text = {
    "component-mapping": `component mapping preview: ${panelName} -> ${labelStrategyValue(state.strategy.scale)}`,
    "assembly-sequence": `assembly sequence: ${state.blocks.length} generated blocks`,
    distortion: "distortion review: stretch, twist, taper, and fabrication checks",
    zones: `zone / weight view: ${labelStrategyValue(state.fieldWeights.source)} field`,
  }[mode] || strategyViewLabels[mode] || "strategy view";
  return [
    `<g class="strategy-view-overlay">`,
    `<rect class="strategy-view-banner" x="${layout.x.toFixed(2)}" y="${(layout.y + layout.h + 14).toFixed(2)}" width="${Math.min(layout.w, 560).toFixed(2)}" height="30"/>`,
    `<text class="strategy-view-label" x="${(layout.x + 12).toFixed(2)}" y="${(layout.y + layout.h + 34).toFixed(2)}">${text}</text>`,
    `</g>`,
  ];
};

const buildMeasurementAnnotationOverlay2d = (frames) => {
  if (!state.view2dOptions.showAnnotations || !state.view2dOptions.showLabels) return [];
  if (isCustomHostWorkflow()) return [];
  const opts = state.view2dOptions;
  const ref = frames.reference;
  const layout = frames.layout;
  const label = [];
  const line = [];
  const tick = (x, y, vertical = false) => vertical
    ? `<line class="dimension-tick" x1="${(x - 4).toFixed(2)}" y1="${y.toFixed(2)}" x2="${(x + 4).toFixed(2)}" y2="${y.toFixed(2)}"/>`
    : `<line class="dimension-tick" x1="${x.toFixed(2)}" y1="${(y - 4).toFixed(2)}" x2="${x.toFixed(2)}" y2="${(y + 4).toFixed(2)}"/>`;
  const dimLine = (x1, y1, x2, y2, text, tx, ty, anchor = "middle") => {
    line.push(`<line class="dimension-line" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`);
    line.push(tick(x1, y1, Math.abs(x1 - x2) < Math.abs(y1 - y2)));
    line.push(tick(x2, y2, Math.abs(x1 - x2) < Math.abs(y1 - y2)));
    label.push(`<text class="dimension-label" x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" text-anchor="${anchor}">${text}</text>`);
  };
  const fmt = (v) => `${v.toFixed(v >= 10 ? 1 : 2)} m`;
  const fmtCm = (v) => `${metersToCmInput(v)} cm`;
  const cx = ref.x + ref.w * 0.5;
  const springY = ref.y + ref.h * 0.78;
  const halfW = clamp(state.params.span * 8.5 * 0.5, 60, ref.w * 0.42);
  const risePx = clamp(state.params.rise * 8.5, 36, ref.h * 0.56);
  const tPx = clamp(state.params.thickness * 14, 5, 34);
  const left = cx - halfW;
  const right = cx + halfW;
  const apexY = springY - risePx;
  const radius = (state.params.span * state.params.span) / Math.max(8 * state.params.rise, 0.001) + state.params.rise * 0.5;
  const archLength = sampleIntradosProfileLength();
  const courses = Math.max(1, Math.round(state.params.courseCount * state.params.subdivisionDensity));
  const blocks = Math.max(1, Math.round(state.params.blockCount * state.params.subdivisionDensity));
  const blockW = state.params.span / blocks;

  if (ref.h > 0) {
    if (opts.showSpanDimension) dimLine(left, springY + 28, right, springY + 28, `span ${fmt(state.params.span)}`, cx, springY + 44);
    if (opts.showRiseDimension) dimLine(right + 22, springY, right + 22, apexY, `rise ${fmt(state.params.rise)}`, right + 30, (springY + apexY) * 0.5, "start");
    if (opts.showThicknessDimension) dimLine(cx + halfW * 0.3, apexY, cx + halfW * 0.3, apexY - tPx, `thickness ${fmtCm(state.params.thickness)}`, cx + halfW * 0.3 + 8, apexY - tPx * 0.5, "start");
    if (opts.showRadiusLabels) {
      line.push(`<path class="dimension-radius" d="M ${cx.toFixed(2)} ${apexY.toFixed(2)} Q ${(cx - halfW * 0.25).toFixed(2)} ${(springY - risePx * 0.42).toFixed(2)} ${left.toFixed(2)} ${springY.toFixed(2)}"/>`);
      label.push(`<text class="dimension-label" x="${(cx - halfW * 0.44).toFixed(2)}" y="${(springY - risePx * 0.58).toFixed(2)}">R ${fmt(radius)}</text>`);
    }
    if (opts.showAngleLabels) {
      const angle = Math.atan2(state.params.rise, Math.max(state.params.span * 0.5, 0.001)) * 180 / Math.PI;
      line.push(`<path class="dimension-angle" d="M ${(left + 18).toFixed(2)} ${springY.toFixed(2)} A 18 18 0 0 1 ${(left + 18 * Math.cos(-angle * Math.PI / 180)).toFixed(2)} ${(springY - 18 * Math.sin(angle * Math.PI / 180)).toFixed(2)}"/>`);
      label.push(`<text class="dimension-label" x="${(left + 24).toFixed(2)}" y="${(springY - 18).toFixed(2)}">${angle.toFixed(1)} deg</text>`);
    }
  }

  if (opts.showCourseCount) {
    label.push(`<text class="dimension-label strong" x="${layout.x.toFixed(2)}" y="${(layout.y - 28).toFixed(2)}">courses ${courses}</text>`);
  }
  if (opts.showBlockWidth) {
    label.push(`<text class="dimension-label strong" x="${(layout.x + 120).toFixed(2)}" y="${(layout.y - 28).toFixed(2)}">block width ${fmtCm(blockW)}</text>`);
  }
  if (opts.showJointGap) {
    label.push(`<text class="dimension-label strong" x="${(layout.x + 280).toFixed(2)}" y="${(layout.y - 28).toFixed(2)}">joint gap ${fmtCm(state.constraints.jointGap)}</text>`);
  }
  if (opts.showTrueLength) {
    label.push(`<text class="dimension-label strong" x="${(layout.x + layout.w).toFixed(2)}" y="${(layout.y + layout.h + 58).toFixed(2)}" text-anchor="end">true length ${fmt(archLength)}</text>`);
  }
  if (opts.showSurfaceFamilyLabel) {
    label.push(`<text class="dimension-surface-label" x="${(layout.x + layout.w).toFixed(2)}" y="${(layout.y - 76).toFixed(2)}" text-anchor="end">surface family: ${state.surfacePrinciple.toLowerCase()}</text>`);
  }

  return [`<g class="measurement-annotations">`, ...line, ...label, `</g>`];
};

const get2dFrames = () => {
  const margin = 24;
  const hasReference = state.view2dOptions.showReferenceGeometry && state.view2dOptions.showGuides && !isCustomHostWorkflow();
  return {
    reference: { x: margin, y: 24, w: 952, h: hasReference ? 160 : 0 },
    layout: { x: margin, y: hasReference ? 210 : 24, w: 952, h: hasReference ? 466 : 652 },
  };
};

const uvToLayoutPoint = ([u, v], frame) => {
  if (isBarrelLikeVault()) {
    return [frame.x + clamp(v, 0, 1) * frame.w, frame.y + (1 - clamp(u, 0, 1)) * frame.h];
  }
  return [frame.x + wrap01(u) * frame.w, frame.y + clamp(v, 0, 1) * frame.h];
};

const layoutPointToUv = (sx, sy, frame) => {
  const a = clamp((sx - frame.x) / frame.w, 0, 1);
  const b = clamp((sy - frame.y) / frame.h, 0, 1);
  if (isBarrelLikeVault()) return [1 - b, a];
  return [a, b];
};

const buildAttractorFieldOverlay2d = (frames) => {
  const field = getAttractorField();
  const frame = frames.layout;
  const pieces = [`<text class="attractor-label" x="${(frame.x + 12).toFixed(2)}" y="${(frame.y + 20).toFixed(2)}">TOP VIEW / FIELD CONTROLS</text>`];
  const toScreen = (uv) => uvToLayoutPoint(uv, frame);
  field.elements.forEach((element, index) => {
    const selected = element.id === field.selectedId ? " selected" : "";
    const points = element.points || [];
    if (!points.length) return;
    const screen = points.map(toScreen);
    if (element.type === "curve" && screen.length > 1) {
      pieces.push(`<polyline class="attractor-curve${selected}" data-attractor-id="${element.id}" points="${screen.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ")}"/>`);
      screen.forEach(([x, y], vertex) => pieces.push(`<circle class="attractor-vertex${selected}" data-attractor-id="${element.id}" data-attractor-vertex="${vertex}" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.5"/>`));
      pieces.push(`<text class="attractor-label" x="${screen[0][0] + 8}" y="${screen[0][1] - 8}">C${index + 1}</text>`);
    } else {
      const [x, y] = screen[0];
      const radius = Math.max(5, element.radius * Math.min(frame.w, frame.h));
      pieces.push(`<circle class="attractor-influence" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}"/>`);
      pieces.push(`<circle class="attractor-point${selected}" data-attractor-id="${element.id}" data-attractor-vertex="0" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="6"/>`);
      pieces.push(`<text class="attractor-label" x="${x + 9}" y="${y - 9}">P${index + 1}</text>`);
    }
  });
  if (field.pendingCurve.length) {
    const points = field.pendingCurve.map(toScreen).map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
    pieces.push(`<polyline class="attractor-pending" points="${points}"/>`);
  }
  return pieces;
};

const draw2d = () => {
  const frames = get2dFrames();
  const margin = frames.layout.x;
  const iw = frames.layout.w;
  const layoutY = frames.layout.y;
  const ih = frames.layout.h;
  const showDraftingGrid = !(
    isCustomHostWorkflow() &&
    isPanelQuadSource(state.customPatternSource) &&
    state.strategyViewMode === "component-mapping"
  );
  const topologyDrawingOnly = (
    isCustomHostWorkflow() &&
    isPanelQuadSource(state.customPatternSource) &&
    state.strategyViewMode === "component-mapping"
  );
  const lines = showDraftingGrid ? buildDraftingGrid2d() : [];
  const baseFill = state.layoutStyle === "Paper" ? "rgba(245,240,228,0.6)" : state.layoutStyle === "High Contrast" ? "rgba(8,8,8,0.5)" : state.layoutStyle === "Rhino Gray" ? "rgba(96,102,112,0.45)" : "rgba(3,10,18,0.35)";
  nodes.layout2d.setAttribute("viewBox", `${state.view2d.x} ${state.view2d.y} ${state.view2d.w} ${state.view2d.h}`);
  nodes.layout2d.setAttribute("data-trait-focus", state.activeTraitFocus || "all");
  nodes.layout2d.setAttribute("data-drawing-preset", state.drawingPreset);
  const render2dBlocks = state.view2dOptions.showBlocks && (
    state.patternAppliedToModel ||
    state.designMode !== "Custom Import" ||
    state.vaultType !== "Custom Imported Rhino Surface"
  );
  const getDrawableUvEdgeLimit = (uvLoop) => {
    const lengths = uvLoop.map((point, i) => {
      const next = uvLoop[(i + 1) % uvLoop.length];
      return Math.hypot(next[0] - point[0], next[1] - point[1]);
    }).filter((value) => Number.isFinite(value) && value > 1e-6);
    if (!lengths.length) return 0;
    const sorted = [...lengths].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length * 0.5)] || sorted[0];
    return Math.max(0.075, median * 3.25);
  };
  const buildCustomBlockEdgeSegments2d = (b, screenPts, stroke) => {
    const limit = getDrawableUvEdgeLimit(b.uv);
    const segments = b.uv.map((point, i) => {
      const nextIndex = (i + 1) % b.uv.length;
      const next = b.uv[nextIndex];
      const len = Math.hypot(next[0] - point[0], next[1] - point[1]);
      if (!Number.isFinite(len) || len > limit) return "";
      const [x1, y1] = screenPts[i];
      const [x2, y2] = screenPts[nextIndex];
      return `<line class="block2d custom-edge" data-id="${b.id}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" style="stroke:${stroke};"/>`;
    }).join("");
    return segments;
  };
  nodes.layout2d.innerHTML = [
    `<rect x="${state.view2d.x}" y="${state.view2d.y}" width="${state.view2d.w}" height="${state.view2d.h}" fill="${baseFill}"/>`,
    ...lines,
    ...(topologyDrawingOnly ? [] : buildReferenceGeometryOverlay2d(frames.reference.x, frames.reference.y, frames.reference.w, frames.reference.h)),
    ...(topologyDrawingOnly ? [] : buildStereotomicGuideOverlay2d(margin, iw, ih, layoutY)),
    ...(topologyDrawingOnly ? [] : buildTraitOverlay2d(frames)),
    ...(topologyDrawingOnly ? [] : buildDerivedStereotomyOverlay2d(frames)),
    ...(topologyDrawingOnly ? [] : buildContourFieldOverlay2d(frames)),
    ...(topologyDrawingOnly ? [] : buildStreamlineOverlay2d(frames)),
    ...buildAttractorFieldOverlay2d(frames),
    ...buildTopologyMorphOverlay2d(frames),
    ...buildOriginAxes2d(),
    ...(topologyDrawingOnly ? [] : state.view2dOptions.showGuides ? buildGroinPlanOverlay2d(margin, iw, ih, layoutY) : []),
    ...(!topologyDrawingOnly && render2dBlocks ? state.blocks.map((b, idx) => {
      if (!isDrawableBlockUvLoop(b.uv)) return "";
      const screenPts = b.uv.map((uv) => uvToLayoutPoint(uv, frames.layout));
      const pts = screenPts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
      const pcx = screenPts.reduce((s, p) => s + p[0], 0) / screenPts.length;
      const pcy = screenPts.reduce((s, p) => s + p[1], 0) / screenPts.length;
      const failsActiveCheck = state.view2dOptions.showFabricationChecks && blockFailsFabricationCheck(b);
      const bad = failsActiveCheck ? " invalid" : "";
      const sel = state.selectedBlockId === b.id ? " selected" : "";
      const stroke = hexToRgba(state.view2dOptions.blockStroke, state.view2dOptions.blockStrokeOpacity);
      const fill = hexToRgba(state.view2dOptions.blockFill, state.view2dOptions.blockFillOpacity);
      const customEdges = isCustomHostWorkflow() ? buildCustomBlockEdgeSegments2d(b, screenPts, stroke) : "";
      const labelStride = Math.max(1, Math.ceil(state.blocks.length / 90));
      const showId = state.view2dOptions.showBlockIds && idx % labelStride === 0;
      const showMetric = state.view2dOptions.showBlockMetrics && (sel || failsActiveCheck || idx % Math.max(labelStride * 2, 1) === 0);
      const idLabel = showId ? `<text class="block-label id" x="${pcx.toFixed(2)}" y="${(pcy + 3).toFixed(2)}" text-anchor="middle">${b.id}</text>` : "";
      const metricLabel = showMetric && b.metrics
        ? `<text class="block-label metric" x="${pcx.toFixed(2)}" y="${(pcy + 12).toFixed(2)}" text-anchor="middle">${metersToCmInput(b.metrics.avgLength)} x ${metersToCmInput(b.metrics.avgWidth)} cm</text>`
        : "";
      const handles = state.view2dOptions.showVertices
        ? b.uv.map((uv, i) => {
          const [hx, hy] = uvToLayoutPoint(uv, frames.layout);
          return `<circle class="uv-handle${sel}" data-id="${b.id}" data-vertex="${i}" cx="${hx.toFixed(2)}" cy="${hy.toFixed(2)}" r="4"/>`;
        }).join("")
        : "";
      const body = isCustomHostWorkflow()
        ? customEdges
        : `<polygon class="block2d${bad}${sel}" data-id="${b.id}" points="${pts}" style="fill:${fill};stroke:${stroke};"/>`;
      return `<g class="generated-block">${body}${idLabel}${metricLabel}${handles}</g>`;
    }) : []),
    ...(!topologyDrawingOnly && render2dBlocks && state.strategy.topology !== "dual" && state.dualPreviewLoops?.length ? state.dualPreviewLoops.map((loop) => {
      const screenPts = loop.uv.map((uv) => uvToLayoutPoint(uv, frames.layout));
      const pts = screenPts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
      const fill = loop.isBoundary ? "rgba(255,214,120,0.08)" : "rgba(91,213,255,0.06)";
      const stroke = loop.isBoundary ? "rgba(255,214,120,0.42)" : "rgba(91,213,255,0.38)";
      return `<polygon class="dual-preview2d" points="${pts}" style="fill:${fill};stroke:${stroke};stroke-dasharray:5 4;stroke-width:1.1;pointer-events:none;"/>`;
    }) : []),
    ...buildStrategyViewOverlay2d(frames),
    ...buildProjectionOperationOverlay2d(frames),
    ...buildMeasurementAnnotationOverlay2d(frames),
    ...buildFabricationCheckOverlay2d(frames),
  ].join("");
};

const renderFormForceDiagrams = () => {
  if (!nodes.formDiagram || !nodes.forceDiagram) return;
  const lockCount = Object.values(state.forceLocks).filter(Boolean).length;
  nodes.diagramMode.textContent = `${state.stereotomyProcess.stageName} | Locks ${lockCount}`;
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
    for (let k = 0; k < uv.length; k++) {
      const a = uv[k];
      const b = uv[(k + 1) % uv.length];
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

const buildTopologyLattice = () => {
  clearGroup(topologyLatticeGroup);
  const settings = state.topologyLattice;
  if (!settings.enabled) return;
  const showU = settings.showU !== false;
  const showV = settings.showV !== false;
  const edges = new Map();
  state.blocks.forEach((block) => {
    const uv = block.uv || [];
    if (uv.length < 3) return;
    const points = block.targetPoints?.length === uv.length ? block.targetPoints : null;
    for (let index = 0; index < uv.length; index++) {
      const next = (index + 1) % uv.length;
      const key = topologyEdgeKey(uv[index], uv[next]);
      if (edges.has(key)) continue;
      const midUv = [(uv[index][0] + uv[next][0]) * 0.5, (uv[index][1] + uv[next][1]) * 0.5];
      const pointAt = (corner) => points?.[corner]?.clone?.() || getHostField().pointAt(clamp(uv[corner][0], 0, 1), clamp(uv[corner][1], 0, 1));
      const a = pointAt(index);
      const b = pointAt(next);
      const normal = points ? (getFaceNormalFromPoints(points) || new THREE.Vector3(0, 1, 0)) : getHostField().normalAt(midUv[0], midUv[1]).clone();
      const direction = new THREE.Vector3().subVectors(b, a);
      const length = direction.length();
      if (length < 1e-5) continue;
      direction.normalize();
      const isU = uv.length === 4
        ? index === 0 || index === 2
        : Math.abs(uv[next][0] - uv[index][0]) >= Math.abs(uv[next][1] - uv[index][1]);
      const field = computeRawSourceWeight({ id: `lattice-${key}`, uv: [midUv] }).sourceWeight;
      // Imported cells do not always preserve identical UV coordinates along a
      // common edge. Join the physical mesh vertices instead (1 mm tolerance).
      const pointKey = (point) => `${point.x.toFixed(3)},${point.y.toFixed(3)},${point.z.toFixed(3)}`;
      edges.set(key, { a, b, aKey: pointKey(a), bKey: pointKey(b), midUv, normal: normal.normalize(), direction, length, isU, field });
    }
  });
  const topLayer = {
    width: Math.max(0.01, settings.railWidth),
    depth: Math.max(0.005, settings.railDepth),
    fillet: Math.max(0, settings.fillet ?? 0),
    opening: clamp(settings.opening, 0, 0.85),
    density: clamp(Math.round(settings.density), 0, 8),
  };
  const bottomLayer = {
    width: Math.max(0.01, settings.bottomWidth ?? settings.railWidth),
    depth: Math.max(0.005, settings.bottomDepth ?? settings.railDepth),
    fillet: Math.max(0, settings.bottomFillet ?? settings.fillet ?? 0),
    opening: clamp(settings.bottomOpening ?? settings.opening, 0, 0.85),
    density: clamp(Math.round(settings.bottomDensity ?? settings.density), 0, 8),
  };
  const getLayer = (isU) => isU ? topLayer : bottomLayer;
  const getRailAnchor = (isU) => isU ? "bottom-edge" : "top-edge";
  const materialU = new THREE.MeshStandardMaterial({ color: 0x8db2d9, roughness: 0.52, metalness: 0.04 });
  const materialV = new THREE.MeshStandardMaterial({ color: 0xd48aa5, roughness: 0.50, metalness: 0.04 });
  const materialBinding = new THREE.MeshStandardMaterial({ color: 0xc54d78, roughness: 0.46, metalness: 0.08 });
  const buildRailChains = (isU) => {
    const groupEdges = [...edges.values()].filter((edge) => edge.isU === isU);
    const adjacency = new Map();
    groupEdges.forEach((edge) => {
      [edge.aKey, edge.bKey].forEach((key) => {
        if (!adjacency.has(key)) adjacency.set(key, []);
        adjacency.get(key).push(edge);
      });
    });
    const used = new Set();
    const trace = (startKey, first) => {
      const keys = [startKey];
      const railEdges = [];
      let currentKey = startKey;
      let current = first;
      let previousDirection = null;
      while (current && !used.has(current)) {
        used.add(current);
        railEdges.push(current);
        const nextKey = current.aKey === currentKey ? current.bKey : current.aKey;
        const nextDirection = (current.aKey === currentKey ? current.direction : current.direction.clone().negate()).clone();
        keys.push(nextKey);
        const candidates = (adjacency.get(nextKey) || []).filter((edge) => !used.has(edge));
        previousDirection = nextDirection;
        current = candidates.sort((a, b) => {
          const dirFor = (edge) => (edge.aKey === nextKey ? edge.direction : edge.direction.clone().negate());
          return dirFor(b).dot(previousDirection) - dirFor(a).dot(previousDirection);
        })[0] || null;
        currentKey = nextKey;
      }
      return { keys, railEdges };
    };
    const starts = [...adjacency.entries()].filter(([, list]) => list.length === 1).map(([key]) => key);
    const chains = [];
    starts.forEach((key) => {
      const edge = (adjacency.get(key) || []).find((item) => !used.has(item));
      if (edge) chains.push(trace(key, edge));
    });
    groupEdges.forEach((edge) => { if (!used.has(edge)) chains.push(trace(edge.aKey, edge)); });
    return chains;
  };
  const filletRailPath = (points, radius) => {
    if (points.length < 3 || radius <= 1e-5) return points;
    const path = [points[0].clone()];
    for (let index = 1; index < points.length - 1; index++) {
      const previous = points[index - 1], corner = points[index], next = points[index + 1];
      const inbound = previous.clone().sub(corner); const outbound = next.clone().sub(corner);
      const inboundLength = inbound.length(), outboundLength = outbound.length();
      if (inboundLength < 1e-5 || outboundLength < 1e-5) continue;
      inbound.multiplyScalar(1 / inboundLength); outbound.multiplyScalar(1 / outboundLength);
      const trim = Math.min(radius, inboundLength * 0.42, outboundLength * 0.42);
      const entry = corner.clone().addScaledVector(inbound, trim);
      const exit = corner.clone().addScaledVector(outbound, trim);
      path.push(entry);
      for (let step = 1; step <= 4; step++) {
        const t = step / 4; const a = entry.clone().lerp(corner, t); const b = corner.clone().lerp(exit, t);
        path.push(a.lerp(b, t));
      }
    }
    path.push(points[points.length - 1].clone());
    return path;
  };
  const offsetRailPathInPlane = (points, normal, distance, miterLimit = 3) => {
    if (!points?.length || Math.abs(distance) < 1e-6) return points.map((point) => point.clone());
    if (points.length < 2) return points.map((point) => point.clone());
    const normalSafe = normal.clone().normalize();
    const segmentLaterals = [];
    for (let index = 0; index < points.length - 1; index++) {
      const tangent = points[index + 1].clone().sub(points[index]);
      if (tangent.lengthSq() < 1e-10) {
        segmentLaterals.push(segmentLaterals.at(-1)?.clone() || new THREE.Vector3(1, 0, 0));
        continue;
      }
      tangent.normalize();
      const lateral = new THREE.Vector3().crossVectors(normalSafe, tangent);
      if (lateral.lengthSq() < 1e-10) segmentLaterals.push(segmentLaterals.at(-1)?.clone() || new THREE.Vector3(1, 0, 0));
      else segmentLaterals.push(lateral.normalize());
    }
    return points.map((point, index) => {
      if (index === 0) return point.clone().addScaledVector(segmentLaterals[0], distance);
      if (index === points.length - 1) return point.clone().addScaledVector(segmentLaterals[segmentLaterals.length - 1], distance);
      const prev = segmentLaterals[index - 1];
      const next = segmentLaterals[index];
      const miter = prev.clone().add(next);
      if (miter.lengthSq() < 1e-10) return point.clone().addScaledVector(next, distance);
      miter.normalize();
      const denom = miter.dot(next);
      const scale = Math.abs(denom) > 1e-5 ? distance / denom : distance;
      const limited = clamp(scale, -Math.abs(distance) * miterLimit, Math.abs(distance) * miterLimit);
      return point.clone().addScaledVector(miter, limited);
    });
  };
  const sweepRectRail = (points, normal, width, railDepth, isU, fillet = 0, materialOverride = null, anchor = "center") => {
    const path = filletRailPath(points, fillet);
    if (path.length < 2) return;
    const ring = [];
    const normalOffsets = anchor === "bottom-edge"
      ? [railDepth, railDepth, 0, 0]
      : anchor === "top-edge"
        ? [0, 0, -railDepth, -railDepth]
        : [railDepth * 0.5, railDepth * 0.5, -railDepth * 0.5, -railDepth * 0.5];
    path.forEach((point, index) => {
      const tangent = path[Math.min(path.length - 1, index + 1)].clone().sub(path[Math.max(0, index - 1)]).normalize();
      const lateral = new THREE.Vector3().crossVectors(normal, tangent).normalize();
      ring.push([
        point.clone().addScaledVector(lateral, width * 0.5).addScaledVector(normal, normalOffsets[0]),
        point.clone().addScaledVector(lateral, -width * 0.5).addScaledVector(normal, normalOffsets[1]),
        point.clone().addScaledVector(lateral, -width * 0.5).addScaledVector(normal, normalOffsets[2]),
        point.clone().addScaledVector(lateral, width * 0.5).addScaledVector(normal, normalOffsets[3]),
      ]);
    });
    const vertices = ring.flat(); const indices = [];
    for (let i = 0; i < ring.length - 1; i++) for (let j = 0; j < 4; j++) { const n = (j + 1) % 4; const a = i * 4 + j, b = i * 4 + n, c = (i + 1) * 4 + n, d = (i + 1) * 4 + j; indices.push(a, b, c, a, c, d); }
    indices.push(0, 2, 1, 0, 3, 2); const end = (ring.length - 1) * 4; indices.push(end, end + 1, end + 2, end, end + 2, end + 3);
    const geometry = new THREE.BufferGeometry().setFromPoints(vertices); geometry.setIndex(indices); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, materialOverride || (isU ? materialU : materialV)); mesh.name = materialOverride ? "topology-lattice-strip-binding" : (isU ? "topology-lattice-u-rail" : "topology-lattice-v-rail"); topologyLatticeGroup.add(mesh);
  };
  const getChainGeometry = ({ keys, railEdges }) => {
    const vertexPoints = new Map();
    railEdges.forEach((edge) => { vertexPoints.set(edge.aKey, edge.a); vertexPoints.set(edge.bKey, edge.b); });
    return {
      normal: railEdges.reduce((sum, edge) => sum.add(edge.normal), new THREE.Vector3()).normalize(),
      field: railEdges.reduce((sum, edge) => sum + edge.field, 0) / railEdges.length,
      points: keys.map((key) => vertexPoints.get(key).clone()),
    };
  };
  const pointChainKey = (point, slot, precision = 3) => `${slot}:${point.x.toFixed(precision)},${point.y.toFixed(precision)},${point.z.toFixed(precision)}`;
  const chainRailSegments = (segments) => {
    const adjacency = new Map();
    segments.forEach((segment) => {
      [segment.aKey, segment.bKey].forEach((key) => {
        if (!adjacency.has(key)) adjacency.set(key, []);
        adjacency.get(key).push(segment);
      });
    });
    const used = new Set();
    const orientPoints = (segment, startKey) => segment.aKey === startKey ? segment.points : segment.points.slice().reverse();
    const trace = (startKey, first) => {
      const pieces = [];
      let currentKey = startKey;
      let current = first;
      let previousDirection = null;
      while (current && !used.has(current.id)) {
        used.add(current.id);
        const pts = orientPoints(current, currentKey);
        pieces.push({ ...current, points: pts });
        const nextKey = current.aKey === currentKey ? current.bKey : current.aKey;
        const nextDirection = pts.at(-1).clone().sub(pts[0]).normalize();
        const candidates = (adjacency.get(nextKey) || []).filter((segment) => !used.has(segment.id));
        previousDirection = nextDirection;
        current = candidates.sort((a, b) => {
          const dirFor = (segment) => {
            const oriented = orientPoints(segment, nextKey);
            return oriented.at(-1).clone().sub(oriented[0]).normalize();
          };
          return dirFor(b).dot(previousDirection) - dirFor(a).dot(previousDirection);
        })[0] || null;
        currentKey = nextKey;
      }
      const points = [];
      pieces.forEach((piece) => {
        piece.points.forEach((point, index) => {
          if (points.length && index === 0 && point.distanceTo(points.at(-1)) < 1e-4) return;
          points.push(point.clone());
        });
      });
      return {
        points,
        normal: pieces.reduce((sum, piece) => sum.add(piece.normal), new THREE.Vector3()).normalize(),
        field: pieces.reduce((sum, piece) => sum + piece.field, 0) / Math.max(1, pieces.length),
      };
    };
    const starts = [...adjacency.entries()].filter(([, list]) => list.length === 1).map(([key]) => key);
    const chains = [];
    starts.forEach((key) => {
      const segment = (adjacency.get(key) || []).find((item) => !used.has(item.id));
      if (segment) chains.push(trace(key, segment));
    });
    segments.forEach((segment) => { if (!used.has(segment.id)) chains.push(trace(segment.aKey, segment)); });
    return chains.filter((chain) => chain.points.length > 1);
  };
  const buildTweenRailChains = (layer, isU) => {
    const count = clamp(Math.round(layer.density || 0), 0, 8);
    if (!count) return [];
    const segments = [];
    let id = 0;
    state.blocks.forEach((block, blockIndex) => {
      if (block.uv?.length !== 4) return;
      const field = computeRawSourceWeight(block).sourceWeight;
      const corners = block.targetPoints?.length === 4 ? block.targetPoints : block.uv.map(([u, v]) => getHostField().pointAt(u, v));
      const normal = getFaceNormalFromPoints(corners) || new THREE.Vector3(0, 1, 0);
      for (let slot = 1; slot <= count; slot++) {
        const t = slot / (count + 1);
        const points = isU
          ? Array.from({ length: 5 }, (_, s) => bilerpVector3(corners, s / 4, t))
          : Array.from({ length: 5 }, (_, s) => bilerpVector3(corners, t, s / 4));
        segments.push({
          id: `tween-${blockIndex}-${slot}-${id++}`,
          slot,
          aKey: pointChainKey(points[0], slot),
          bKey: pointChainKey(points.at(-1), slot),
          points,
          normal,
          field,
        });
      }
    });
    return chainRailSegments(segments);
  };
  let chainCount = 0;
  const chainRecords = [];
  [true, false].filter((isU) => isU ? showU : showV).forEach((isU) => buildRailChains(isU).forEach((chain) => {
    const { keys, railEdges } = chain;
    if (keys.length < 2) return;
    const { normal, field, points: chainPoints } = getChainGeometry(chain);
    const layer = getLayer(isU);
    const width = layer.width * (1 - clamp(field, 0, 1) * layer.opening);
    sweepRectRail(chainPoints, normal, width, layer.depth, isU, layer.fillet, null, getRailAnchor(isU));
    chainRecords.push({ ...chain, isU });
    chainCount += 1;
  }));
  const tweenRecords = [];
  [
    { layer: topLayer, isU: true },
    { layer: bottomLayer, isU: false },
  ].filter(({ isU }) => isU ? showU : showV).forEach(({ layer, isU }) => {
    buildTweenRailChains(layer, isU).forEach((chain) => {
      const width = layer.width * (1 - clamp(chain.field, 0, 1) * layer.opening);
      sweepRectRail(chain.points, chain.normal, width, layer.depth, isU, layer.fillet, null, getRailAnchor(isU));
      tweenRecords.push({ ...chain, isU });
      chainCount += 1;
    });
  });
  const bindings = settings.loopBindings || {};
  let bindingCount = 0;
  if (bindings.enabled) {
    const every = clamp(Math.round(bindings.every || 4), 1, 20);
    const family = bindings.family || "both";
    const candidates = [...chainRecords, ...tweenRecords].filter((record) => {
      if (record.isU && !showU) return false;
      if (!record.isU && !showV) return false;
      return family === "both" || (family === "u" && record.isU) || (family === "v" && !record.isU);
    });
    candidates.forEach((record, index) => {
      if (index % every !== 0) return;
      const bindingDepth = Math.max(0.005, bindings.depth || 0.08);
      const bindingWidth = Math.max(0.01, bindings.width || 0.08);
      const normal = record.normal || getChainGeometry(record).normal;
      const rawPoints = record.points || getChainGeometry(record).points;
      sweepRectRail(rawPoints, normal, bindingWidth, bindingDepth, record.isU, Math.max(0, bindings.fillet || 0), materialBinding, getRailAnchor(record.isU));
      bindingCount += 1;
    });
  }
  if (nodes.topologyLatticeStatus) nodes.topologyLatticeStatus.textContent = `${chainCount} continuous topology paths traced from ${edges.size} shared edges${bindingCount ? `; ${bindingCount} structural strip bindings added` : ""}. Rail paths now anchor rectangle faces: U bottom face and V top face sit on the rail.`;
};

const build3d = () => {
  clearGroup(blockGroup);
  clearGroup(solidVaultGroup);
  clearGroup(supportWallGroup);
  clearGroup(scaffoldGroup);
  clearGroup(topologyLatticeGroup);
  if (!state.patternAppliedToModel) {
    if (state.designMode === "Custom Import" && state.vaultType === "Custom Imported Rhino Surface") {
      buildSupportScaffold();
      applyDisplayPreset();
      return;
    }
    if (state.vaultType === "Groin Vault") buildSupportWalls();
    buildSolidVaultMesh();
    buildSupportScaffold();
    applyDisplayPreset();
    return;
  }
  // Always retain the generated host solid behind its applied blocks.
  // The masonry layer no longer replaces the barrel vault with support panels.
  if (state.designMode !== "Custom Import" || state.vaultType !== "Custom Imported Rhino Surface") {
    buildSolidVaultMesh();
    solidVaultGroup.traverse((obj) => {
      if (!obj.isMesh) return;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach((material) => {
        material.transparent = true;
        material.opacity = Math.min(Number(material.opacity ?? 1), 0.28);
        material.depthWrite = false;
      });
    });
  }
  try {
    buildSupportWalls();
    buildSupportScaffold();
  } catch (err) {
    console.error("build3d/buildSupport failed", err);
    setPipelineStatus(`Support build failed (${err.message}); showing vault blocks only.`);
  }
  let builtCount = 0;
  const buildErrors = [];
  state.blocks.forEach((b) => {
    try {
      const m = buildBlockMesh(b);
      const position = m.geometry?.getAttribute("position");
      if (!position?.count) throw new Error("missing block positions");
      const hasFinitePositions = Array.from(position.array).every((value) => Number.isFinite(value));
      if (!hasFinitePositions) throw new Error("non-finite block geometry");
      b.metrics = m;
      b.failed = validate(m, b);
      const smoothImportedSurface = String(m.jointFaceType || "").includes("sampled imported-surface");
      const mesh = new THREE.Mesh(m.geometry, new THREE.MeshStandardMaterial({ color: b.failed.length ? 0xd15a5a : 0x7ab8df, roughness: 0.48, metalness: 0.08, transparent: true, opacity: 0.92, side: THREE.DoubleSide, flatShading: !(smoothImportedSurface || state.appliedTileSystem) }));
      mesh.userData.blockId = b.id;
      mesh.userData.smoothImportedSurface = smoothImportedSurface;
      if (state.strategy.merge !== "merge-visual" && state.strategy.merge !== "merge-fabrication") {
        if (state.appliedTileSystem) {
          const thickness = getBlockThicknessForComponent(b);
          const headSeams = buildAppliedBlockHeadSeams(b, thickness);
          if (headSeams) mesh.add(headSeams);
          const designedJoint = buildDesignedJointOverlay(b, state.appliedTileSystem, thickness);
          if (designedJoint) mesh.add(designedJoint);
        } else {
          const seam = new THREE.LineSegments(
            new THREE.EdgesGeometry(m.geometry, 16),
            new THREE.LineBasicMaterial({ color: 0xf1eadc, transparent: true, opacity: 0.26 })
          );
          seam.name = "seam";
          seam.visible = !!state.display.seamDebug;
          mesh.add(seam);
        }
      } else {
        mesh.userData.mergeMode = state.strategy.merge;
      }
      b.mesh = mesh;
      blockGroup.add(mesh);
      builtCount += 1;
    } catch (err) {
      b.mesh = null;
      buildErrors.push({ id: b.id, err });
    }
  });
  if (buildErrors.length) console.error("build3d/buildBlockMesh skipped blocks", buildErrors);
  if (!builtCount) {
    clearGroup(blockGroup);
    state.blocks.forEach((b) => {
      try {
        blockGroup.add(buildProxyBlockVisual(b));
        builtCount += 1;
      } catch (err) {
        buildErrors.push({ id: b.id, err });
      }
    });
    const firstError = buildErrors[0]?.err?.message || "unknown error";
    setPipelineStatus(`Applied proxy blocks because refined block geometry failed (${firstError}).`);
    applyDisplayPreset();
    return;
  }
  applyDisplayPreset();
  buildTopologyLattice();
};

const buildSupportWalls = () => {
  if (state.vaultType === "Groin Vault") {
    buildGroinCornerColumns();
    return;
  }
  const def = vaultLibrary[state.vaultType];
  if (!def?.construction3D?.toLowerCase().includes("extrud") && !isBarrelLikeVault()) return;
  if (isBarrelLikeVault()) {
    buildBarrelSupportWallBlocks();
    return;
  }
};

const makeScaffoldRibMesh = (samples, datumForPoint, thickness, material) => {
  if (samples.length < 2) return null;
  const half = Math.max(0.005, thickness * 0.5);
  const verts = [];
  const normals = [];
  const sections = samples.map((point, index) => {
    const prev = samples[Math.max(0, index - 1)];
    const next = samples[Math.min(samples.length - 1, index + 1)];
    const tangent = next.clone().sub(prev);
    tangent.y = 0;
    if (tangent.lengthSq() < 1e-8) tangent.set(1, 0, 0);
    tangent.normalize();
    const lateral = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(half);
    const top = point.clone();
    const bottomY = typeof datumForPoint === "function" ? datumForPoint(point) : datumForPoint;
    const bottom = new THREE.Vector3(point.x, bottomY, point.z);
    return {
      tl: top.clone().add(lateral),
      tr: top.clone().sub(lateral),
      bl: bottom.clone().add(lateral),
      br: bottom.clone().sub(lateral),
    };
  });
  const pushTri = (a, b, c) => {
    const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    [a, b, c].forEach((p) => {
      verts.push(p.x, p.y, p.z);
      normals.push(normal.x, normal.y, normal.z);
    });
  };
  const pushQuad = (a, b, c, d) => {
    pushTri(a, b, c);
    pushTri(a, c, d);
  };
  for (let i = 0; i < sections.length - 1; i++) {
    const a = sections[i];
    const b = sections[i + 1];
    pushQuad(a.tl, b.tl, b.tr, a.tr);
    pushQuad(a.bl, a.br, b.br, b.bl);
    pushQuad(a.tl, a.bl, b.bl, b.tl);
    pushQuad(a.tr, b.tr, b.br, a.br);
  }
  const first = sections[0];
  const last = sections[sections.length - 1];
  pushQuad(first.tl, first.tr, first.br, first.bl);
  pushQuad(last.tl, last.bl, last.br, last.tr);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

const buildSupportScaffold = () => {
  if (!state.supportScaffold?.enabled) {
    if (nodes.supportScaffoldStatus) nodes.supportScaffoldStatus.textContent = "Scaffold hidden.";
    return;
  }
  const usingImportedHost = state.designMode === "Custom Import" || state.vaultType === "Custom Imported Rhino Surface";
  if (usingImportedHost && !state.importedSurface && !state.importedRhinoBrepFaces?.length) {
    if (nodes.supportScaffoldStatus) nodes.supportScaffoldStatus.textContent = "Import a host surface before generating custom falsework.";
    return;
  }
  const settings = state.supportScaffold;
  const host = getHostField();
  const xCount = clamp(Math.round(settings.xCount || 8), 2, 40);
  const yCount = clamp(Math.round(settings.yCount || 10), 2, 40);
  const ribThickness = clamp(settings.ribThickness || 0.08, 0.01, 1);
  const samplesPerRib = 72;
  const scaffoldSampleAt = (u, v) => {
    if (usingImportedHost) {
      const sample = getImportedSurfaceSample(clamp(u, 0, 1), clamp(v, 0, 1));
      return sample?.normal?.y > 0.08 ? sample : null;
    }
    return { point: host.pointAt(u, v), normal: host.normalAt(u, v) };
  };
  const samplePointAt = (u, v) => scaffoldSampleAt(u, v)?.point || null;
  const isFinitePoint = (point) => point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z);
  let minY = Infinity;
  let maxY = -Infinity;
  for (let y = 0; y <= yCount; y++) {
    const v = y / yCount;
    for (let x = 0; x <= xCount; x++) {
      const u = x / xCount;
      const p = samplePointAt(u, v);
      if (!isFinitePoint(p)) continue;
      if (Number.isFinite(p.y)) minY = Math.min(minY, p.y);
      if (Number.isFinite(p.y)) maxY = Math.max(maxY, p.y);
    }
  }
  if (!Number.isFinite(minY)) {
    if (nodes.supportScaffoldStatus) nodes.supportScaffoldStatus.textContent = "Could not sample the active host surface for falsework.";
    return;
  }
  const scaffoldDatumY = 0 <= maxY && 0 <= minY ? 0 : Math.min(0, minY);
  const autoDepth = Math.max(0.1, maxY - scaffoldDatumY);
  state.supportScaffold.ribDepth = autoDepth;
  setInputValue(nodes.supportScaffoldDepth, metersToCmInput(autoDepth), { force: true });
  const ribMaterial = new THREE.MeshStandardMaterial({
    color: 0xd7c39a,
    roughness: 0.72,
    metalness: 0.02,
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
  });
  const hostSize = state.importedSurfaceBbox?.getSize(new THREE.Vector3()) || getBaseSourceDimensions();
  const maxSampleBridge = Math.max(0.25, Math.hypot(hostSize.x || 0, hostSize.z || 0) / Math.max(8, samplesPerRib) * 3.5);
  const addRibSegment = (path, name) => {
    const mesh = makeScaffoldRibMesh(path, () => scaffoldDatumY, ribThickness, ribMaterial.clone());
    if (!mesh) return;
    mesh.name = name;
    scaffoldGroup.add(mesh);
  };
  const addSampledRib = (uvAt, name) => {
    let segment = [];
    let previous = null;
    let segmentIndex = 1;
    const flushSegment = () => {
      if (segment.length >= 2) addRibSegment(segment, `${name}-${segmentIndex++}`);
      segment = [];
      previous = null;
    };
    for (let i = 0; i <= samplesPerRib; i++) {
      const [u, v] = uvAt(i / samplesPerRib);
      const p = samplePointAt(u, v);
      const valid = isFinitePoint(p) && p.y > scaffoldDatumY + 1e-4;
      if (!valid || (previous && p.distanceTo(previous) > maxSampleBridge)) {
        flushSegment();
        continue;
      }
      segment.push(p);
      previous = p;
    }
    flushSegment();
  };
  for (let x = 1; x < xCount; x++) {
    const u = x / xCount;
    addSampledRib((t) => [u, t], `waffle-scaffold-x-${x + 1}`);
  }
  for (let y = 1; y < yCount; y++) {
    const v = y / yCount;
    addSampledRib((t) => [t, v], `waffle-scaffold-y-${y + 1}`);
  }
  if (nodes.supportScaffoldStatus) nodes.supportScaffoldStatus.textContent = `Planar waffle falsework from ${usingImportedHost ? "uploaded host" : "vault surface"}: ${Math.max(0, xCount - 1)} X ribs, ${Math.max(0, yCount - 1)} Y ribs, datum ${scaffoldDatumY.toFixed(2)} m, auto depth ${autoDepth.toFixed(2)} m.`;
};

const buildBarrelSupportWallBlocks = () => {
  if (!state.patternAppliedToModel) return;
  const scale = state.cubeScale;
  const halfW = state.params.span * scale * 0.5;
  const length = state.params.length * scale;
  const springY = getBarrelSpringingY(scale);
  const wallT = Math.max(0.08, getMasonryThickness(scale));
  const courseH = Math.max(0.08, (state.constraints.courseHeight || 0.65) * scale);
  const appliedDimensions = state.blockDimensionMode !== "fit";
  const targetWidth = Math.max(0.1, state.targetBlockWidth || 1.2);
  const lengthCount = appliedDimensions
    ? Math.max(1, Math.min(240, Math.ceil((state.params.length || 1) / targetWidth)))
    : Math.max(2, Math.round(state.params.blockCount || (state.params.length / targetWidth)));
  const wallRows = Math.max(1, Math.ceil(springY / courseH));
  const mat = new THREE.MeshStandardMaterial({ color: 0xb8b2a7, roughness: 0.56, metalness: 0.04, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xf1eadc, transparent: true, opacity: 0.22 });
  [-1, 1].forEach((side) => {
    const x = side * (halfW + wallT * 0.5);
    for (let row = 0; row < wallRows; row++) {
      const y0 = row * courseH;
      const y1 = Math.min(springY, (row + 1) * courseH);
      if (y1 - y0 < 1e-5) continue;
      const lengthSpans = appliedDimensions
        ? getBarrelAppliedLengthSpans(row, targetWidth, wallRows)
        : getBarrelLengthCourseSpans(row, lengthCount, wallRows);
      for (const { bay, v0, v1 } of lengthSpans) {
        const z0 = (v0 - 0.5) * length;
        const z1 = (v1 - 0.5) * length;
        const geo = new THREE.BoxGeometry(wallT, y1 - y0, z1 - z0);
        const block = new THREE.Mesh(geo, mat.clone());
        block.position.set(x, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
        block.name = `barrel-wall-block-${side > 0 ? "right" : "left"}-${row + 1}-${bay + 1}`;
        block.castShadow = true;
        block.receiveShadow = true;
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 18), edgeMat.clone());
        edges.name = "wall-block-edges";
        block.add(edges);
        supportWallGroup.add(block);
      }
    }
  });
};

const buildGroinCornerColumns = () => {
  const scale = state.cubeScale;
  const { halfX, halfZ, springY, pierW, capH, capW, pierH } = getGroinSupportMetrics(scale);
  const pierGeo = new THREE.BoxGeometry(pierW, pierH, pierW);
  const capGeo = new THREE.BoxGeometry(capW, capH, capW);
  const pierMat = new THREE.MeshStandardMaterial({ color: 0xaeb5bd, roughness: 0.52, metalness: 0.06 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xc0c6cd, roughness: 0.48, metalness: 0.08 });
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      const x = sx * halfX;
      const z = sz * halfZ;
      const pier = new THREE.Mesh(pierGeo, pierMat.clone());
      pier.position.set(x, pierH * 0.5, z);
      pier.name = "groin-corner-column";
      const cap = new THREE.Mesh(capGeo, capMat.clone());
      cap.position.set(x, springY - capH * 0.5, z);
      cap.name = "groin-column-capital";
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(pierGeo, 18),
        new THREE.LineBasicMaterial({ color: 0xf4f6f8, transparent: true, opacity: 0.16 })
      );
      pier.add(edges);
      supportWallGroup.add(pier, cap);
    });
  });
};

const buildGroinConstructionSpines3d = () => {
  if (state.vaultType !== "Groin Vault") return;
  const mat = new THREE.LineBasicMaterial({
    color: 0x48ffb8,
    transparent: true,
    opacity: 0.82,
    depthTest: false,
    depthWrite: false,
  });
  const mkLine = (points, name) => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, mat.clone());
    line.name = name;
    line.renderOrder = 8500;
    solidVaultGroup.add(line);
  };
  const diagA = [];
  const diagB = [];
  const n = 96;
  const { halfX, halfZ, springY, rise } = getGroinSupportMetrics();
  const barrelY = (coord, halfSpan) => {
    const nx = clamp(Math.abs(coord) / Math.max(0.001, halfSpan), 0, 1);
    return springY + rise * evalBarrelArchProfile(nx);
  };
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = THREE.MathUtils.lerp(-halfX, halfX, t);
    const z = THREE.MathUtils.lerp(-halfZ, halfZ, t);
    const yAxisX = barrelY(x, halfX);
    const yAxisZ = barrelY(z, halfZ);
    const yGroin = Math.max(yAxisX, yAxisZ);
    if (i > 6 && i < n - 6) {
      diagA.push(new THREE.Vector3(x, yGroin + 0.035, z));
      diagB.push(new THREE.Vector3(x, yGroin + 0.035, -z));
    }
  }
  mkLine(diagA, "groin-spine-a");
  mkLine(diagB, "groin-spine-b");
  const label = makeTextSprite("Groin structural spines", "#d6ffee");
  if (label) {
    const p = getVaultPoint(0.5, 0.5);
    label.position.set(p.x, p.y + state.params.rise * 0.12, p.z);
    label.renderOrder = 8600;
    solidVaultGroup.add(label);
  }
};

const getVaultSurfaceNormal = (u, v, cyclicU = false) => {
  const du = 1 / 160;
  const dv = 1 / 160;
  const u0 = cyclicU ? wrap01(u - du) : clamp(u - du, 0, 1);
  const u1 = cyclicU ? wrap01(u + du) : clamp(u + du, 0, 1);
  const v0 = clamp(v - dv, 0, 1);
  const v1 = clamp(v + dv, 0, 1);
  const pu0 = getVaultPoint(u0, v);
  const pu1 = getVaultPoint(u1, v);
  const pv0 = getVaultPoint(cyclicU ? wrap01(u) : clamp(u, 0, 1), v0);
  const pv1 = getVaultPoint(cyclicU ? wrap01(u) : clamp(u, 0, 1), v1);
  const tu = pu1.sub(pu0);
  const tv = pv1.sub(pv0);
  const normal = tu.cross(tv);
  if (normal.lengthSq() < 1e-8) return new THREE.Vector3(0, 1, 0);
  return normal.normalize();
};

const isRenderableGeometry = (geometry) => {
  const pos = geometry?.getAttribute?.("position");
  return Boolean(pos && pos.count >= 3 && geometry.index && geometry.index.count >= 3);
};

const createGroinSourceBarrelShellGeometry = (axis = "z") => {
  const scale = state.cubeScale;
  const { halfX, halfZ } = getGroinSupportMetrics(scale);
  const axisHalf = axis === "z" ? halfZ : halfX;
  const { pts: insidePts } = buildBarrelSectionPolyline(scale, false);
  const shellT = Math.max(0.1 * scale, state.params.thickness * scale);
  const outsidePts = offsetJoinedPolyline(insidePts, shellT, 2.2);
  const useInsideRef = state.barrelOffsetSide !== "Outside";
  const intrados = useInsideRef ? insidePts : outsidePts;
  const extrados = useInsideRef ? outsidePts : insidePts;
  const profileN = intrados.length - 1;
  const axisN = Math.max(18, Math.floor((state.params.courseCount || 18) * 1.4));
  const to3 = (p, axisCoord) => axis === "z"
    ? new THREE.Vector3(p.x, p.y, axisCoord)
    : new THREE.Vector3(axisCoord, p.y, p.x);
  const top = [];
  const bot = [];
  for (let r = 0; r <= axisN; r++) {
    const axisCoord = THREE.MathUtils.lerp(-axisHalf, axisHalf, r / axisN);
    for (let c = 0; c < intrados.length; c++) {
      top.push(to3(extrados[c], axisCoord));
      bot.push(to3(intrados[c], axisCoord));
    }
  }
  const vertices = [...top, ...bot];
  const stride = profileN + 1;
  const botBase = top.length;
  const idx = [];
  const quad = (a, b, c, d) => { idx.push(a, b, c, a, c, d); };
  for (let r = 0; r < axisN; r++) {
    for (let c = 0; c < profileN; c++) {
      const a = r * stride + c;
      const b = a + 1;
      const d = a + stride;
      const c2 = d + 1;
      quad(a, b, c2, d);
      quad(botBase + d, botBase + c2, botBase + b, botBase + a);
    }
  }
  for (let r = 0; r < axisN; r++) {
    const a = r * stride;
    const b = a + stride;
    quad(botBase + a, a, b, botBase + b);
    const ar = r * stride + profileN;
    const br = ar + stride;
    quad(ar, botBase + ar, botBase + br, br);
  }
  for (let c = 0; c < profileN; c++) {
    const a = c;
    const b = c + 1;
    quad(a, b, botBase + b, botBase + a);
    const ar = axisN * stride + c;
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
  geometry.computeBoundingBox();
  return geometry;
};

const addGroinSourceBarrelPreview = (geometryA, geometryB) => {
  const sourceMats = [
    new THREE.MeshStandardMaterial({
      color: 0xbec6cf,
      roughness: 0.5,
      metalness: 0.04,
      transparent: true,
      opacity: 0.54,
      side: THREE.DoubleSide,
    }),
    new THREE.MeshStandardMaterial({
      color: 0xaeb8c4,
      roughness: 0.52,
      metalness: 0.04,
      transparent: true,
      opacity: 0.44,
      side: THREE.DoubleSide,
    }),
  ];
  [
    [geometryA, sourceMats[0], "groin-source-barrel-a"],
    [geometryB, sourceMats[1], "groin-source-barrel-b"],
  ].forEach(([geometry, material, name]) => {
    if (!isRenderableGeometry(geometry)) return;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.userData.formOnly = true;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 18),
      new THREE.LineBasicMaterial({ color: 0xeff4ff, transparent: true, opacity: 0.18 })
    );
    edges.name = `${name}-edges`;
    mesh.add(edges);
    solidVaultGroup.add(mesh);
  });
  buildGroinConstructionSpines3d();
};

const buildGroinBooleanBarrelMesh = () => {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xbec6cf,
    roughness: 0.46,
    metalness: 0.05,
    transparent: true,
    opacity: 0.86,
    side: THREE.DoubleSide,
  });
  const geometryA = createGroinSourceBarrelShellGeometry("z");
  const geometryB = createGroinSourceBarrelShellGeometry("x");
  if (!isRenderableGeometry(geometryA) || !isRenderableGeometry(geometryB)) {
    addGroinSourceBarrelPreview(geometryA, geometryB);
    return;
  }
  try {
    const barrelA = new Brush(geometryA, mat);
    const barrelB = new Brush(geometryB, mat);
    barrelA.updateMatrixWorld();
    barrelB.updateMatrixWorld();
    const evaluator = new Evaluator();
    evaluator.useGroups = false;
    evaluator.consolidateGroups = true;
    const result = evaluator.evaluate(barrelA, barrelB, INTERSECTION);
    if (!isRenderableGeometry(result.geometry)) throw new Error("Groin boolean result was empty.");
    result.name = "groin-boolean-intersection-vault";
    result.material = mat;
    result.userData.formOnly = true;
    result.geometry.computeVertexNormals();
    result.geometry.normalizeNormals();
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(result.geometry, 22),
      new THREE.LineBasicMaterial({ color: 0xeff4ff, transparent: true, opacity: 0.16 })
    );
    edges.name = "solid-edges";
    result.add(edges);
    solidVaultGroup.add(result);
    buildGroinConstructionSpines3d();
  } catch (err) {
    console.warn("Groin boolean barrel construction failed; showing source barrel extrusions.", err);
    addGroinSourceBarrelPreview(geometryA, geometryB);
  }
};

const buildGroinPieredSolidMesh = () => {
  buildGroinBooleanBarrelMesh();
};

const buildSolidVaultMesh = () => {
  if (state.vaultType === "Custom Imported Rhino Surface") {
    return;
  }
  if (state.vaultType === "Barrel Vault") {
    buildBarrelSolidExtrusionMesh();
    return;
  }
  if (state.vaultType === "Tapered Barrel Vault") {
    buildTaperedBarrelSolidLoftMesh();
    return;
  }
  if (state.vaultType === "Groin Vault") {
    buildGroinPieredSolidMesh();
    return;
  }
  const cyclicU = state.vaultType === "Dome";
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
      const normal = getVaultSurfaceNormal(uu, clamp(v, 0, 1), cyclicU);
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
  buildGroinConstructionSpines3d();
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

const createStoneMaterial = (color, options = {}) => new THREE.MeshPhysicalMaterial({
  color,
  metalness: 0,
  roughness: options.roughness ?? 0.68,
  clearcoat: options.clearcoat ?? 0.08,
  clearcoatRoughness: options.clearcoatRoughness ?? 0.82,
  sheen: options.sheen ?? 0.22,
  sheenRoughness: options.sheenRoughness ?? 0.76,
  sheenColor: new THREE.Color(options.sheenColor ?? 0xf1eadf),
  transparent: !!options.transparent,
  opacity: options.opacity ?? 1,
  side: options.side ?? THREE.DoubleSide,
});

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
  mk(copiedGeometryGroup, 0xd7b4ff);
  mk(supportWallGroup, 0xa0a7b3);
  mk(scaffoldGroup, 0xd7c39a);
  mk(importedSurfaceGroup, 0x78cfff);
};

const refreshImportedSurfaceBbox = () => {
  if (!state.importedSurface) return;
  state.importedSurface.updateMatrixWorld(true);
  state.importedSurfaceBbox = new THREE.Box3().setFromObject(state.importedSurface);
  state.importedTopology = analyzeImportedMeshTopology(state.importedSurface, state.importedSurfaceBbox);
};

const applySourceTransform = () => {
  const t = state.sourceTransform;
  importedSurfaceGroup.position.set(t.tx, t.ty, t.tz);
  importedSurfaceGroup.rotation.set(
    THREE.MathUtils.degToRad(t.rx),
    THREE.MathUtils.degToRad(t.ry),
    THREE.MathUtils.degToRad(t.rz)
  );
  importedSurfaceGroup.scale.setScalar(Math.max(0.001, t.scale));
  importedSurfaceGroup.updateMatrixWorld(true);
  refreshImportedSurfaceBbox();
  refreshBboxHelpers();
  renderSourceGeometryDimensions();
};

const getOriginalVaultSurfaceVisibility = () => {
  const hasImportedHost = !!state.importedSurface || state.designMode === "Custom Import" || state.vaultType === "Custom Imported Rhino Surface";
  const hasBuiltInHost = state.vaultType !== "Custom Imported Rhino Surface";
  const relevant = [];
  if (hasImportedHost) relevant.push("sourceModel");
  if (hasBuiltInHost) relevant.push("builtInForm");
  if (!relevant.length) relevant.push("sourceModel", "builtInForm");
  return relevant.some((key) => !!state.layers[key]);
};

const setOriginalVaultSurfaceVisibility = (visible) => {
  const hasImportedHost = !!state.importedSurface || state.designMode === "Custom Import" || state.vaultType === "Custom Imported Rhino Surface";
  const hasBuiltInHost = state.vaultType !== "Custom Imported Rhino Surface";
  if (hasImportedHost || !hasBuiltInHost) state.layers.sourceModel = visible;
  if (hasBuiltInHost || !hasImportedHost) state.layers.builtInForm = visible;
  if (byId("layerSourceModel")) byId("layerSourceModel").checked = state.layers.sourceModel;
  if (byId("layerBuiltInForm")) byId("layerBuiltInForm").checked = state.layers.builtInForm;
};

const syncImportedSurfaceToggle = () => {
  const button = byId("toggleImportedSurface");
  if (!button) return;
  const visible = getOriginalVaultSurfaceVisibility();
  button.textContent = visible ? "Hide Original Vault Surface" : "Show Original Vault Surface";
  button.classList.toggle("active", !visible);
  button.setAttribute("aria-pressed", String(!visible));
};

const applyLayerVisibility = () => {
  importedSurfaceGroup.visible = !!state.layers.sourceModel;
  solidVaultGroup.visible = !!state.layers.builtInForm;
  blockGroup.visible = !!state.layers.blocks && !state.topologyLattice.enabled;
  topologyLatticeGroup.visible = !!state.topologyLattice.enabled;
  copiedGeometryGroup.visible = !!state.layers.copies;
  supportWallGroup.visible = !!state.layers.supports;
  scaffoldGroup.visible = !!state.supportScaffold?.enabled && !!state.layers.supports;
  gridHelper.visible = !!state.display.baseGrid && !!state.layers.guides;
  shadowPlane.visible = !!state.layers.guides && state.displayPreset !== "Wireframe";
  axesHelper.visible = false;
  originAxesGroup.visible = !!state.layers.guides;
  lightRigHelpers.visible = !!state.display.latticeControls && !!state.layers.guides;
  sectionGizmoGroup.visible = !!state.layers.guides;
  sectionActiveGizmoGroup.visible = !!state.layers.guides;
  bboxHelpersGroup.visible = !!state.layers.guides;
  syncImportedSurfaceToggle();
};

const cloneMaterialsForCopy = (obj) => {
  obj.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    if (Array.isArray(child.material)) child.material = child.material.map((mat) => mat.clone());
    else child.material = child.material.clone();
    child.castShadow = true;
    child.receiveShadow = true;
  });
};

const getCopySourceObject = () => {
  if (state.selectedBlockId) {
    const selected = state.blocks.find((b) => b.id === state.selectedBlockId)?.mesh;
    if (selected) return { object: selected, name: `copy-${state.selectedBlockId}` };
  }
  if (state.importedSurface && importedSurfaceGroup.children.length) {
    return { object: importedSurfaceGroup, name: state.importedModelName ? `copy-${state.importedModelName}` : "copy-source-model" };
  }
  if (solidVaultGroup.children.length) return { object: solidVaultGroup, name: `copy-${state.vaultType}` };
  if (blockGroup.children.length) return { object: blockGroup, name: "copy-blocks" };
  return null;
};

const copyActiveGeometry = () => {
  const source = getCopySourceObject();
  if (!source) {
    setPipelineStatus("No geometry available to copy.");
    return;
  }
  const copy = source.object.clone(true);
  cloneMaterialsForCopy(copy);
  state.copiedGeometryCount += 1;
  copy.name = `${source.name}-${state.copiedGeometryCount}`;
  copy.userData.copiedGeometry = true;
  const box = new THREE.Box3().setFromObject(source.object);
  const size = box.getSize(new THREE.Vector3());
  const offset = Math.max(1, size.x * 0.16, size.z * 0.16);
  copy.position.x += offset * state.copiedGeometryCount;
  copiedGeometryGroup.add(copy);
  state.layers.copies = true;
  if (byId("layerCopies")) byId("layerCopies").checked = true;
  applyLayerVisibility();
  refreshBboxHelpers();
  setPipelineStatus(`Copied geometry: ${copy.name}.`);
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
  const masonryColor = 0xc9c1b5;
  const keystoneColor = 0xd9bd7e;
  state.blocks.forEach((b, i) => {
    if (!b.mesh) return;
    const failed = b.failed.length > 0;
    const blockColor = b.isKeystone ? keystoneColor : masonryColor;
    const seam = b.mesh.getObjectByName("seam");
    if (b.mesh.material) b.mesh.material.dispose();
    b.mesh.castShadow = true;
    b.mesh.receiveShadow = true;
    const sideMode = THREE.DoubleSide;
    if (state.displayPreset === "Rendered") {
      b.mesh.material = state.display.foilMaterial ? createFoilMaterial(foilBase) : createStoneMaterial(blockColor, { roughness: 0.64, clearcoat: 0.1 });
      b.mesh.material.side = sideMode;
      if (seam) seam.visible = true;
    } else if (state.displayPreset === "Shaded") {
      b.mesh.material = createStoneMaterial(blockColor, { roughness: 0.72, clearcoat: 0.04 });
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
      b.mesh.material = state.display.foilMaterial ? createFoilMaterial(foilBase) : createStoneMaterial(blockColor, { roughness: 0.88, clearcoat: 0.02, sheen: 0.12 });
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
      b.mesh.material = state.display.foilMaterial ? createFoilMaterial(foilBase) : createStoneMaterial(blockColor, { roughness: 0.64, clearcoat: 0.1 });
      b.mesh.material.side = sideMode;
      if (seam) seam.visible = state.display.seamDebug;
    }
    b.mesh.material.flatShading = !(b.mesh.userData.smoothImportedSurface || state.appliedTileSystem);
    b.mesh.material.side = sideMode;
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
      obj.material.side = THREE.DoubleSide;
    } else if (state.displayPreset === "XRay") {
      obj.material.wireframe = false;
      obj.material.transparent = true;
      obj.material.opacity = 0.22;
      obj.material.side = THREE.DoubleSide;
    } else if (state.displayPreset === "Ghosted") {
      obj.material.wireframe = false;
      obj.material.transparent = true;
      obj.material.opacity = 0.45;
      obj.material.side = THREE.DoubleSide;
    } else {
      obj.material.wireframe = false;
      obj.material.transparent = false;
      obj.material.opacity = 1;
      obj.material.side = THREE.DoubleSide;
    }
    obj.material.flatShading = false;
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
      obj.material = createStoneMaterial(0xd0d4d8, { roughness: 0.7, clearcoat: 0.04 });
    } else if (state.displayPreset === "XRay") {
      obj.material = new THREE.MeshStandardMaterial({ color: 0xcfd6e0, roughness: 0.55, metalness: 0.02, transparent: true, opacity: 0.24 });
    } else if (state.displayPreset === "Wireframe") {
      obj.material = new THREE.MeshStandardMaterial({ color: 0xb9c5d4, roughness: 0.3, metalness: 0.05, wireframe: true, transparent: false, opacity: 1 });
    } else if (state.displayPreset === "Ghosted") {
      obj.material = new THREE.MeshStandardMaterial({ color: 0xc8cfd8, roughness: 0.5, metalness: 0.03, transparent: true, opacity: 0.55 });
    } else {
      obj.material = state.display.foilMaterial
        ? createFoilMaterial(c)
        : createStoneMaterial(0xd3d6da, { roughness: 0.62, clearcoat: 0.1, sheen: 0.18 });
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
    if (obj.userData.formOnly) {
      obj.material.transparent = true;
      obj.material.opacity = state.displayPreset === "XRay" ? 0.22 : state.displayPreset === "Ghosted" ? 0.45 : 0.82;
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
      obj.material.transparent = false;
      obj.material.opacity = 1;
    }
    obj.material.needsUpdate = true;
  });
  refreshBboxHelpers();
  applyLayerVisibility();
};

const fitCameraToBlocks = () => {
  const box = new THREE.Box3();
  const a = new THREE.Box3().setFromObject(blockGroup);
  const s = new THREE.Box3().setFromObject(solidVaultGroup);
  const c = new THREE.Box3().setFromObject(copiedGeometryGroup);
  const w = new THREE.Box3().setFromObject(supportWallGroup);
  const f = new THREE.Box3().setFromObject(scaffoldGroup);
  if (!a.isEmpty()) box.union(a);
  if (!s.isEmpty()) box.union(s);
  if (!c.isEmpty()) box.union(c);
  if (!w.isEmpty()) box.union(w);
  if (!f.isEmpty()) box.union(f);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maxDim) || maxDim <= 0 || maxDim > 5000) {
    fitCameraToPreviewSource();
    return;
  }
  if (isBarrelLikeVault() && state.designMode !== "Custom Import") {
    fitCameraToBarrelProfile(box);
    return;
  }
  const center = box.getCenter(new THREE.Vector3());
  const dist = Math.max(maxDim, 1) * 1.9;
  camera.position.set(center.x + dist * 0.9, center.y + dist * 0.7, center.z + dist * 0.9);
  controls.target.copy(center);
  controls.update();
};

const fitCameraToBarrelProfile = (box) => {
  if (!box || box.isEmpty()) return false;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const profileDim = Math.max(size.x, size.y, 1);
  const dist = Math.max(profileDim * 1.85, size.z * 1.2, 6);
  camera.position.set(center.x, center.y + profileDim * 0.06, center.z + dist);
  controls.target.copy(center);
  controls.update();
  return true;
};

const fitCameraToObject = (obj) => {
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return;
  if (isBarrelLikeVault() && state.designMode !== "Custom Import") {
    fitCameraToBarrelProfile(box);
    return;
  }
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const dist = maxDim * 1.9;
  camera.position.set(center.x + dist * 0.9, center.y + dist * 0.7, center.z + dist * 0.9);
  controls.target.copy(center);
  controls.update();
};

const fitCameraToPreviewSource = () => {
  if (state.designMode === "Custom Import" && state.vaultType === "Custom Imported Rhino Surface") {
    fitCameraToObject(importedSurfaceGroup);
    return;
  }
  if (solidVaultGroup.children.length || supportWallGroup.children.length || scaffoldGroup.children.length) {
    const box = new THREE.Box3();
    const solid = new THREE.Box3().setFromObject(solidVaultGroup);
    const supports = new THREE.Box3().setFromObject(supportWallGroup);
    const scaffold = new THREE.Box3().setFromObject(scaffoldGroup);
    if (!solid.isEmpty()) box.union(solid);
    if (!supports.isEmpty()) box.union(supports);
    if (!scaffold.isEmpty()) box.union(scaffold);
    if (!box.isEmpty()) {
      if (isBarrelLikeVault() && fitCameraToBarrelProfile(box)) return;
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 1);
      const dist = maxDim * 1.9;
      camera.position.set(center.x + dist * 0.9, center.y + dist * 0.7, center.z + dist * 0.9);
      controls.target.copy(center);
      controls.update();
      return;
    }
  }
  fitCameraToBlocks();
};

const getImportedModelStats = (obj) => {
  let meshCount = 0;
  let vertexCount = 0;
  let triangleCount = 0;
  obj.traverse((c) => {
    if (!c.isMesh || !c.geometry) return;
    meshCount += 1;
    const pos = c.geometry.getAttribute("position");
    const vertices = pos?.count || 0;
    vertexCount += vertices;
    triangleCount += c.geometry.index ? Math.floor(c.geometry.index.count / 3) : Math.floor(vertices / 3);
  });
  return { meshCount, vertexCount, triangleCount };
};

const pointToImportedUv = (point, bbox = state.importedSurfaceBbox) => {
  if (!bbox || bbox.isEmpty()) return null;
  const size = bbox.getSize(new THREE.Vector3());
  return [
    clamp((point.x - bbox.min.x) / Math.max(1e-9, size.x), 0, 1),
    clamp((point.z - bbox.min.z) / Math.max(1e-9, size.z), 0, 1),
  ];
};

const compactTopologyHints = (values, minGap = 0.018, limit = 80) => {
  const sorted = values
    .filter((v) => Number.isFinite(v) && v > 0.015 && v < 0.985)
    .sort((a, b) => a - b);
  const out = [];
  sorted.forEach((v) => {
    if (!out.length || Math.abs(v - out[out.length - 1]) >= minGap) out.push(v);
    else out[out.length - 1] = (out[out.length - 1] + v) * 0.5;
  });
  if (out.length <= limit) return out;
  const stride = out.length / limit;
  return Array.from({ length: limit }, (_, i) => out[Math.floor(i * stride)]);
};

const analyzeImportedMeshTopology = (obj, bbox) => {
  if (!obj || !bbox || bbox.isEmpty()) return null;
  const edgeMap = new Map();
  const vertexMap = new Map();
  let triangleCount = 0;
  let meshCount = 0;
  const keyForPoint = (p) => `${p.x.toFixed(5)},${p.y.toFixed(5)},${p.z.toFixed(5)}`;
  const ensureVertex = (p) => {
    const key = keyForPoint(p);
    if (!vertexMap.has(key)) vertexMap.set(key, { point: p.clone(), neighbours: new Set(), edgeCount: 0 });
    return key;
  };
  const addEdge = (a, b, normal) => {
    const ka = keyForPoint(a);
    const kb = keyForPoint(b);
    const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
    ensureVertex(a);
    ensureVertex(b);
    vertexMap.get(ka).neighbours.add(kb);
    vertexMap.get(kb).neighbours.add(ka);
    vertexMap.get(ka).edgeCount += 1;
    vertexMap.get(kb).edgeCount += 1;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, {
        a: a.clone(),
        b: b.clone(),
        center: a.clone().add(b).multiplyScalar(0.5),
        normals: [],
        count: 0,
      });
    }
    const edge = edgeMap.get(key);
    edge.normals.push(normal.clone());
    edge.count += 1;
  };

  obj.updateMatrixWorld(true);
  obj.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.geometry) return;
    const pos = mesh.geometry.getAttribute("position");
    if (!pos) return;
    meshCount += 1;
    const index = mesh.geometry.index;
    const readVertex = (i) => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    const tri = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const addTriangle = (ia, ib, ic) => {
      tri[0].copy(readVertex(ia));
      tri[1].copy(readVertex(ib));
      tri[2].copy(readVertex(ic));
      const normal = new THREE.Triangle(tri[0], tri[1], tri[2]).getNormal(new THREE.Vector3()).normalize();
      if (normal.lengthSq() < 1e-8) return;
      addEdge(tri[0], tri[1], normal);
      addEdge(tri[1], tri[2], normal);
      addEdge(tri[2], tri[0], normal);
      triangleCount += 1;
    };
    if (index) {
      for (let i = 0; i < index.count; i += 3) addTriangle(index.getX(i), index.getX(i + 1), index.getX(i + 2));
    } else {
      for (let i = 0; i < pos.count; i += 3) addTriangle(i, i + 1, i + 2);
    }
  });

  const boundaryEdges = [];
  const nonManifoldEdges = [];
  const featureEdges = [];
  const rawCurvatureSamples = [];
  const courseHints = [];
  const spanHints = [];
  const sharpCos = Math.cos(THREE.MathUtils.degToRad(38));
  edgeMap.forEach((edge) => {
    const dx = Math.abs(edge.b.x - edge.a.x);
    const dz = Math.abs(edge.b.z - edge.a.z);
    const uv = pointToImportedUv(edge.center, bbox);
    if (!uv) return;
    if (edge.normals.length >= 2) {
      const angle = edge.normals[0].angleTo(edge.normals[1]);
      const length = Math.max(1e-6, edge.a.distanceTo(edge.b));
      if (Number.isFinite(angle) && angle > 1e-5) {
        rawCurvatureSamples.push({ uv, raw: angle / length });
      }
    }
    let kind = null;
    if (edge.count === 1) {
      boundaryEdges.push(edge);
      kind = "boundary";
    } else if (edge.count > 2) {
      nonManifoldEdges.push(edge);
      kind = "non-manifold";
    } else if (edge.normals.length >= 2 && edge.normals[0].dot(edge.normals[1]) < sharpCos) {
      featureEdges.push(edge);
      kind = "feature";
    }
    if (!kind) return;
    if (dz >= dx * 0.75) courseHints.push(uv[0]);
    if (dx >= dz * 0.75) spanHints.push(uv[1]);
  });
  const valences = [...vertexMap.values()].map((v) => v.neighbours.size);
  const boundaryVertexKeys = new Set();
  boundaryEdges.forEach((edge) => {
    boundaryVertexKeys.add(keyForPoint(edge.a));
    boundaryVertexKeys.add(keyForPoint(edge.b));
  });
  const sortedCurvature = rawCurvatureSamples.map((sample) => sample.raw).sort((a, b) => a - b);
  const curvatureScale = sortedCurvature.length
    ? Math.max(1e-6, sortedCurvature[Math.floor((sortedCurvature.length - 1) * 0.9)])
    : 1;
  const maxCurvatureSamples = 2400;
  const curvatureStride = Math.max(1, Math.ceil(rawCurvatureSamples.length / maxCurvatureSamples));
  const curvatureSamples = rawCurvatureSamples
    .filter((_, index) => index % curvatureStride === 0)
    .map((sample) => ({
      uv: sample.uv,
      value: clamp(sample.raw / curvatureScale, 0, 1),
    }));

  return {
    meshCount,
    triangleCount,
    vertexCount: vertexMap.size,
    edgeCount: edgeMap.size,
    boundaryEdgeCount: boundaryEdges.length,
    boundaryVertexCount: boundaryVertexKeys.size,
    featureEdgeCount: featureEdges.length,
    nonManifoldEdgeCount: nonManifoldEdges.length,
    averageValence: valences.length ? valences.reduce((sum, v) => sum + v, 0) / valences.length : 0,
    maxValence: valences.length ? Math.max(...valences) : 0,
    courseHints: compactTopologyHints(courseHints),
    spanHints: compactTopologyHints(spanHints),
    curvatureSamples,
    curvatureScale,
  };
};

const getImportedMeshCurvatureIntensity = (u, v) => {
  const samples = state.importedTopology?.curvatureSamples || [];
  if (!samples.length) return null;
  let weighted = 0;
  let total = 0;
  let nearest = { d2: Infinity, value: 0 };
  samples.forEach((sample) => {
    const du = sample.uv[0] - u;
    const dv = sample.uv[1] - v;
    const d2 = du * du + dv * dv;
    if (d2 < nearest.d2) nearest = { d2, value: sample.value };
    const w = 1 / Math.max(0.0006, d2);
    weighted += sample.value * w;
    total += w;
  });
  const blended = total > 0 ? weighted / total : nearest.value;
  return clamp(Math.max(blended, nearest.d2 < 0.004 ? nearest.value : 0), 0, 1);
};

const normalizeImportedObjectToWorkspace = (obj) => {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return { normalized: false, scale: 1 };
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1e-9);
  const targetDim = clamp(Math.max(state.params.span || 18, state.params.length || 28) * 1.15, 18, 42);
  const scale = targetDim / maxDim;
  obj.scale.multiplyScalar(scale);
  obj.position.sub(center.multiplyScalar(scale));
  obj.updateMatrixWorld(true);
  const normalizedBox = new THREE.Box3().setFromObject(obj);
  if (!normalizedBox.isEmpty()) obj.position.y -= normalizedBox.min.y;
  obj.updateMatrixWorld(true);
  return { normalized: Math.abs(scale - 1) > 0.001, scale };
};

const prepareImportedGeometry = (obj) => {
  let acceleratedMeshes = 0;
  obj.updateMatrixWorld(true);
  obj.traverse((c) => {
    if (!c.isMesh || !c.geometry) return;
    const geometry = c.geometry;
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.disposeBoundsTree?.();
    geometry.computeBoundsTree?.();
    c.castShadow = true;
    c.receiveShadow = true;
    acceleratedMeshes += 1;
  });
  return acceleratedMeshes;
};

const zoomExtents = () => {
  const combined = new THREE.Box3();
  const a = new THREE.Box3().setFromObject(blockGroup);
  const s = new THREE.Box3().setFromObject(solidVaultGroup);
  const c = new THREE.Box3().setFromObject(copiedGeometryGroup);
  const w = new THREE.Box3().setFromObject(supportWallGroup);
  const f = new THREE.Box3().setFromObject(scaffoldGroup);
  const b = new THREE.Box3().setFromObject(importedSurfaceGroup);
  if (!a.isEmpty()) combined.union(a);
  if (!s.isEmpty()) combined.union(s);
  if (!c.isEmpty()) combined.union(c);
  if (!w.isEmpty()) combined.union(w);
  if (!f.isEmpty()) combined.union(f);
  if (!b.isEmpty()) combined.union(b);
  if (combined.isEmpty()) return;
  if (isBarrelLikeVault() && state.designMode !== "Custom Import" && fitCameraToBarrelProfile(combined)) return;
  const size = combined.getSize(new THREE.Vector3());
  const center = combined.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const dist = maxDim * 2.1;
  camera.position.set(center.x + dist, center.y + dist * 0.75, center.z + dist);
  controls.target.copy(center);
  controls.update();
};

const zoom2dExtents = () => {
  state.view2d = { x: -95, y: -75, w: 1190, h: 850 };
  draw2d();
};

const zoomAllExtents = () => {
  zoomExtents();
  zoom2dExtents();
  state.userDefinedCamera = true;
};

const renderInspector = () => {
  if (!state.patternAppliedToModel) {
    nodes.inspector.innerHTML = state.vaultType === "Custom Imported Rhino Surface"
      ? `<b>Inspector</b><p>${state.importedModelName || "Uploaded source model"} active. Click Apply To Model to project the current block strategy onto the mesh.</p>`
      : state.vaultType === "Groin Vault"
        ? "<b>Inspector</b><p>Groin form surface active. Click Apply To Model to add masonry thickness and map blocks onto the vault.</p>"
        : "<b>Inspector</b><p>Solid preview active. Click Apply To Model to map blocks onto the vault.</p>";
    return;
  }
  const b = state.blocks.find((x) => x.id === state.selectedBlockId);
  if (!b) {
    nodes.inspector.innerHTML = "<b>Inspector</b><p>Select a block in 2D or 3D.</p>";
    return;
  }
  const strategy = b.strategy || getActiveStrategy();
  const weights = b.fieldWeights || {};
  const zoneLine = b.zone
    ? `<p>Zone: ${labelStrategyValue(b.zone)}; Weight ${(weights.smoothedWeight ?? weights.sourceWeight ?? 0).toFixed(2)}; Compression ${(weights.compressionIntensity ?? 0).toFixed(2)}</p>`
    : "";
  const materialLine = b.materialTag ? `<p>Material: ${b.materialTag}; Band ${b.weightBand || "n/a"}</p>` : "";
  const contourLine = b.contourBand != null ? `<p>Contour: band ${b.contourBand}; value ${(b.contourValue ?? 0).toFixed(2)}${b.reactionValue != null ? `; reaction ${b.reactionValue.toFixed(2)}` : ""}</p>` : "";
  const def = b.metrics?.deformation;
  const deformationLine = def ? `<p>Deformation: stretch ${def.stretchRatio}; twist ${def.twistAngle} deg; map ${def.mappingDistortion}</p>` : "";
  const subdivisionLine = b.subdivisionCounts
    ? `<p>Panel Subdivision: ${b.subdivisionCounts.u} x ${b.subdivisionCounts.v}${b.morphWeight != null ? `; Morph weight ${b.morphWeight.toFixed(2)}` : ""}</p>`
    : "";
  const editLine = [b.pinnedBoundary ? "pinned boundary" : "", b.supportMarked ? "support" : ""].filter(Boolean).join(", ");
  const panelVariantLine = b.panelVariantRole ? `<p>Panel Variant: ${getPanelVariantLabel(b.panelVariantRole)}</p>` : "";
  nodes.inspector.innerHTML = `<b>Inspector</b><p>ID: ${b.id}</p><p>Generator: ${b.generatorStrategyLabel || labelStrategyValue(strategy.field)}</p><p>Component: ${labelStrategyValue(b.componentVariant || strategy.component)} / ${labelStrategyValue(strategy.componentMode)}</p>${panelVariantLine}<p>Field: ${labelStrategyValue(strategy.field)}; ${labelStrategyValue(strategy.topology)}</p><p>Fill: ${labelStrategyValue(b.fillCellType || strategy.fill)}; ${labelStrategyValue(strategy.merge)}</p><p>Mapping: ${labelStrategyValue(strategy.scale)} / ${labelStrategyValue(strategy.rotation)} / ${labelStrategyValue(strategy.rotationVariation)} / ${labelStrategyValue(strategy.thickness)}</p>${zoneLine}${materialLine}${contourLine}${deformationLine}${subdivisionLine}${editLine ? `<p>Editor: ${editLine}</p>` : ""}<p>Length: ${metersToCmInput(b.metrics.avgLength)} cm</p><p>Width: ${metersToCmInput(b.metrics.avgWidth)} cm</p><p>Weight: ${b.metrics.weight.toFixed(1)} kg</p><p>Status: ${b.failed.length ? `Invalid (${b.failed.join(", ")})` : "Valid"}</p>`;
};

const classifyBlockZone = (weights = {}) => {
  if (weights.supportZone >= 0.72) return "support";
  if (weights.boundaryZone >= 0.72) return "boundary";
  if (weights.crownZone >= 0.72) return "crown";
  if (weights.compressionIntensity >= 0.72) return "compression";
  return "field";
};

const getBlockWeightBasis = (block) => {
  const uv = block.uv?.length ? block.uv : [[0.5, 0.5]];
  const anchor = block.anchorUv || polygonCentroidUv(uv);
  const [u, v] = anchor;
  const host = getHostField();
  const edgeDistance = Math.min(u, 1 - u, v, 1 - v);
  const crown = isBarrelLikeVault()
    ? clamp(1 - Math.abs(u - 0.5) * 2, 0, 1)
    : clamp(1 - Math.hypot(u - 0.5, v - 0.5) * 2.2, 0, 1);
  const support = block.supportMarked ? 1 : clamp(1 - edgeDistance / 0.14, 0, 1);
  const boundary = block.pinnedBoundary ? 1 : clamp(1 - edgeDistance / 0.1, 0, 1);
  const curvature = host.curvatureAt(u, v);
  const curvatureIntensity = curvature.intensity != null
    ? clamp(curvature.intensity, 0, 1)
    : clamp((Math.abs(curvature.ku || 0) + Math.abs(curvature.kv || 0)) * 0.12, 0, 1);
  const area = clamp(Math.sqrt(Math.abs(signedUvArea(uv))) * 3, 0, 1);
  const compression = clamp(0.28 + crown * 0.32 + support * 0.22 + curvatureIntensity * 0.2, 0, 1);
  const edgeBending = curvatureIntensity;
  const edgeDeformation = clamp(curvatureIntensity * 0.68 + support * 0.2 + boundary * 0.12, 0, 1);
  const harmonic = clamp((Math.sin((curvatureIntensity * 10 + u * 3 + v * 5) * Math.PI) + 1) * 0.5, 0, 1);
  const attractor = normalizedAttractorWeightAt([u, v]);
  const importedGroup = block.importedMaterialGroup || block.importedFaceGroup || block.topologyGroup || block.parentCellId || block.generatorStrategy || "default";
  return {
    u,
    v,
    area,
    curvature: curvatureIntensity,
    distance: clamp(edgeDistance / 0.5, 0, 1),
    boundary,
    crown,
    support,
    compression,
    edgeBending,
    edgeDeformation,
    harmonic,
    attractor,
    random: (deterministicHash(`${state.fieldWeights.randomSeed}:${block.id}`) % 10000) / 9999,
    material: importedGroup === "default" ? 0.5 : (deterministicHash(importedGroup) % 10000) / 9999,
    importedGroup,
    curvatureRaw: curvature,
  };
};

const evaluateWeightFormula = (formula, basis) => {
  const text = String(formula || "").trim();
  if (!text) return 0;
  if (!/^[\d\s+\-*/().,_a-zA-Z]+$/.test(text)) return 0;
  const allowed = ["u", "v", "area", "curvature", "distance", "boundary", "crown", "support", "compression", "edgeBending", "edgeDeformation", "harmonic", "attractor", "random", "material"];
  const names = Array.from(new Set(text.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || []));
  if (names.some((name) => !allowed.includes(name))) return 0;
  try {
    const fn = new Function(...allowed, `"use strict"; return (${text});`);
    return clamp(Number(fn(...allowed.map((key) => basis[key]))) || 0, 0, 1);
  } catch {
    return 0;
  }
};

const computeRawSourceWeight = (block) => {
  const basis = getBlockWeightBasis(block);
  const source = state.fieldWeights.source || "curvature";
  const sourceWeight = source === "formula"
    ? evaluateWeightFormula(state.fieldWeights.formula, basis)
    : source === "attractorCurvature"
      ? THREE.MathUtils.lerp(basis.attractor, basis.curvature, state.attractorField.curvatureMix)
    : clamp(Number(basis[source] ?? basis.curvature) || 0, 0, 1);
  return { basis, sourceWeight };
};

const getWeightBand = (weight = 0) => {
  if (weight >= 0.78) return { id: "high", materialTag: "compression-heavy", component: "keyedVoussoir" };
  if (weight >= 0.56) return { id: "upper", materialTag: "interlock-transition", component: "interlock" };
  if (weight >= 0.34) return { id: "middle", materialTag: "voussoir-standard", component: "voussoir" };
  return { id: "low", materialTag: "ashlar-light", component: "ashlar" };
};

const computeReactionPatternValue = (u, v, seed = state.fieldWeights.randomSeed) => {
  const scale = THREE.MathUtils.lerp(4, 18, state.contourField.reactionScale || 0);
  const a = Math.sin((u * scale + seed * 0.013) * Math.PI * 2);
  const b = Math.cos((v * (scale * 0.74) - seed * 0.017) * Math.PI * 2);
  const c = Math.sin(((u + v) * scale * 0.38 + seed * 0.007) * Math.PI * 2);
  return clamp((a + b + c + 3) / 6, 0, 1);
};

const computeContourFieldValue = (block) => {
  const basis = block.fieldWeights?.basis || getBlockWeightBasis(block);
  const source = state.contourField.source || "height";
  if (source === "height") return clamp(basis.v, 0, 1);
  if (source === "curvature") return basis.curvature;
  if (source === "compression") return basis.compression;
  if (source === "weight") return block.fieldWeights?.smoothedWeight ?? block.fieldWeights?.sourceWeight ?? computeRawSourceWeight(block).sourceWeight;
  if (source === "reaction") return computeReactionPatternValue(basis.u, basis.v);
  return clamp(basis.v, 0, 1);
};

const contourMaskRejectsBlock = (block) => {
  if (!state.contourField.enabled) return false;
  const mode = state.contourField.maskMode || "none";
  if (mode === "none") return false;
  const basis = block.fieldWeights?.basis || getBlockWeightBasis(block);
  const weight = block.fieldWeights?.smoothedWeight ?? block.fieldWeights?.sourceWeight ?? 0;
  if (mode === "boundary") return basis.boundary > 0.78;
  if (mode === "support") return basis.support > 0.78;
  if (mode === "crown") return basis.crown > 0.82;
  if (mode === "opening") return Math.hypot(basis.u - 0.5, basis.v - 0.5) < 0.105;
  if (mode === "low-weight") return weight < 0.16;
  return false;
};

const applyContourBandsAndMasks = (blocks) => {
  if (!state.contourField.enabled) return blocks;
  const bands = clamp(Math.round(state.contourField.bands || 8), 2, 24);
  const kept = [];
  blocks.forEach((block) => {
    const value = computeContourFieldValue(block);
    const band = clamp(Math.floor(value * bands), 0, bands - 1);
    block.contourValue = Number(value.toFixed(4));
    block.contourBand = band;
    block.reactionValue = state.contourField.reactionDiffusion
      ? Number(computeReactionPatternValue(block.fieldWeights?.basis?.u ?? polygonCentroidUv(block.uv)[0], block.fieldWeights?.basis?.v ?? polygonCentroidUv(block.uv)[1]).toFixed(4))
      : null;
    block.maskedByContour = contourMaskRejectsBlock(block);
    if (!block.maskedByContour) kept.push(block);
  });
  return kept.length ? kept : blocks;
};

const buildBlockAdjacency = (blocks) => {
  const edgeMap = new Map();
  blocks.forEach((block, blockIndex) => {
    (block.uv || []).forEach((point, i) => {
      const next = block.uv[(i + 1) % block.uv.length];
      if (!next) return;
      const key = topologyEdgeKey(point, next);
      if (!edgeMap.has(key)) edgeMap.set(key, []);
      edgeMap.get(key).push(blockIndex);
    });
  });
  const neighbors = blocks.map(() => new Set());
  edgeMap.forEach((owners) => {
    owners.forEach((a) => owners.forEach((b) => {
      if (a !== b) neighbors[a].add(b);
    }));
  });
  return neighbors;
};

const applyFieldWeightSmoothingToBlocks = (blocks) => {
  blocks.forEach((block) => {
    const raw = computeRawSourceWeight(block);
    block.fieldWeights = {
      ...(block.fieldWeights || {}),
      basis: raw.basis,
      source: state.fieldWeights.source,
      sourceWeight: Number(raw.sourceWeight.toFixed(4)),
      smoothedWeight: Number(raw.sourceWeight.toFixed(4)),
    };
  });
  const mode = state.fieldWeights.smoothing || "none";
  const iterations = mode === "none" ? 0 : clamp(Math.round(state.fieldWeights.smoothingIterations || 0), 0, 8);
  if (!iterations || blocks.length < 2) return blocks;
  const neighbors = buildBlockAdjacency(blocks);
  let values = blocks.map((block) => block.fieldWeights.sourceWeight || 0);
  for (let iter = 0; iter < iterations; iter++) {
    values = values.map((value, index) => {
      const ns = Array.from(neighbors[index]);
      if (!ns.length) return value;
      const fixed = mode === "harmonic" && (
        blocks[index].fieldWeights.basis.boundary > 0.82 ||
        blocks[index].fieldWeights.basis.support > 0.82 ||
        blocks[index].fieldWeights.basis.crown > 0.82
      );
      if (fixed) return value;
      const avg = ns.reduce((sum, n) => sum + values[n], 0) / ns.length;
      return mode === "harmonic" ? avg : THREE.MathUtils.lerp(value, avg, 0.5);
    });
  }
  blocks.forEach((block, index) => {
    block.fieldWeights.smoothedWeight = Number(clamp(values[index], 0, 1).toFixed(4));
  });
  return blocks;
};

const applyFieldDrivenBlockProperties = (blocks, activeStrategy = getActiveStrategy()) => {
  const canUsePanelVariants = activeStrategy.component === "custom" && !!state.customPanel?.geometryData;
  const shouldDriveComponent =
    state.fieldWeights.driveComponent &&
    activeStrategy.componentMode !== "single" &&
    !(activeStrategy.component === "custom" && state.customPanel);
  blocks.forEach((block) => {
    const weight = block.fieldWeights?.smoothedWeight ?? block.fieldWeights?.sourceWeight ?? 0;
    const basis = block.fieldWeights?.basis || {};
    const band = getWeightBand(weight);
    block.weightBand = band.id;
    block.materialTag = state.fieldWeights.materialStrategy === "imported-groups"
      ? `group-${basis.importedGroup || "default"}`
      : state.fieldWeights.materialStrategy === "zones"
        ? `zone-${classifyBlockZone(block.fieldWeights)}`
        : band.materialTag;
    if (shouldDriveComponent) {
      block.componentVariant = band.component;
      block.componentType = band.component;
      block.fieldDrivenComponent = true;
    } else {
      if (block.fieldDrivenComponent) {
        block.componentVariant = activeStrategy.component;
        block.fieldDrivenComponent = false;
      }
      block.componentType = block.componentVariant || activeStrategy.component;
    }
    if (state.fieldWeights.driveRotation && !(activeStrategy.component === "custom" && state.customPanel && block.targetPoints?.length)) {
      block.rotationShift = Math.round(weight * Math.max(1, (block.uv?.length || 1) - 1));
      block.uv = block.rotationShift ? rotateUvLoop(block.uv, block.rotationShift) : block.uv;
    }
    if (state.fieldWeights.driveTaper) block.taperBias = Number((weight * 1.2).toFixed(3));
    if (state.fieldWeights.driveZones) block.zone = classifyBlockZone(block.fieldWeights);
    block.panelVariantRole = canUsePanelVariants ? resolvePanelVariantRoleForBlock(block) : null;
  });
  return blocks;
};

const computeBlockFieldWeights = (block) => {
  const basis = getBlockWeightBasis(block);
  const u = basis.u;
  const v = basis.v;
  const host = getHostField();
  const boundaryInfo = host.boundaryAt(u, v);
  const groinBoost = state.vaultType === "Groin Vault" ? clamp(1 - Math.abs(u - v) * 2.2, 0, 1) * 0.18 : 0;
  const raw = computeRawSourceWeight(block);
  const sourceWeight = raw.sourceWeight;
  const smoothedWeight = block.fieldWeights?.smoothedWeight ?? sourceWeight;
  return {
    anchorUv: [Number(u.toFixed(5)), Number(v.toFixed(5))],
    boundaryZone: Number(basis.boundary.toFixed(4)),
    crownZone: Number(basis.crown.toFixed(4)),
    supportZone: Number(basis.support.toFixed(4)),
    compressionIntensity: Number(clamp(basis.compression + groinBoost, 0, 1).toFixed(4)),
    source: state.fieldWeights.source,
    sourceWeight: Number(sourceWeight.toFixed(4)),
    smoothedWeight: Number(smoothedWeight.toFixed(4)),
    basis,
    curvature: basis.curvatureRaw,
    importedGroup: basis.importedGroup,
    weightBand: getWeightBand(smoothedWeight).id,
    boundary: boundaryInfo,
  };
};

const annotateBlockForStrategy = (block, activeStrategy = getActiveStrategy()) => {
  const canUsePanelVariants = activeStrategy.component === "custom" && !!state.customPanel?.geometryData;
  block.strategy = { ...activeStrategy };
  block.strategyField = activeStrategy.field;
  block.componentType = block.componentVariant || activeStrategy.component;
  block.mapping = {
    rotation: activeStrategy.rotation,
    rotationVariation: activeStrategy.rotationVariation,
    scale: activeStrategy.scale,
    thickness: activeStrategy.thickness,
    patchSubdivision: activeStrategy.patchSubdivision,
    patchSmoothing: activeStrategy.patchSmoothing,
    topology: activeStrategy.topology,
    dualBoundaryCleanup: activeStrategy.dualBoundaryCleanup,
    fill: activeStrategy.fill,
    merge: activeStrategy.merge,
    boundary: activeStrategy.boundary,
  };
  block.fieldWeights = computeBlockFieldWeights(block);
  block.zone = classifyBlockZone(block.fieldWeights);
  block.panelVariantRole = canUsePanelVariants ? resolvePanelVariantRoleForBlock(block) : null;
  return block;
};

const refreshEditedBlocks = () => {
  const activeStrategy = refreshStrategyDescriptor();
  const validBlocks = [];
  state.blocks.forEach((block) => annotateBlockForStrategy(block, activeStrategy));
  applyFieldWeightSmoothingToBlocks(state.blocks);
  applyFieldDrivenBlockProperties(state.blocks, activeStrategy);
  state.blocks = applyContourBandsAndMasks(state.blocks);
  state.blocks.forEach((block) => {
    try {
      const m = buildBlockMesh(block);
      block.metrics = m;
      block.failed = validate(m, block);
      if (m.geometry) m.geometry.dispose();
      validBlocks.push(block);
    } catch (err) {
      console.warn("2D editor skipped block refresh", block.id, err);
    }
  });
  if (validBlocks.length) state.blocks = validBlocks;
  state.patternAppliedToModel = true;
  build3d();
  draw2d();
  renderFormForceDiagrams();
  renderMetrics();
  renderActiveVaultTools();
  applySelection();
  renderBlockPreview();
};

const disposePreviewObject = (object) => {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (Array.isArray(child.material)) child.material.forEach((mat) => {
      if (mat.map) mat.map.dispose();
      mat.dispose();
    });
    else if (child.material) {
      if (child.material.map) child.material.map.dispose();
      child.material.dispose();
    }
  });
};

const clearBlockPreview = () => {
  while (blockPreviewGroup.children.length) {
    const child = blockPreviewGroup.children.pop();
    disposePreviewObject(child);
  }
};

const getPreviewBlocks = () => {
  if (!state.blocks.length) return [];
  const requestedCount = clamp(Math.round(state.blockPreviewCount || 1), 1, 6);
  const selectedIndex = state.blocks.findIndex((b) => b.id === state.selectedBlockId);
  const fallbackIndex = Math.max(0, state.blocks.findIndex((b) => b.isKeystone));
  const anchor = selectedIndex >= 0 ? selectedIndex : fallbackIndex;
  const start = Math.min(anchor, Math.max(0, state.blocks.length - requestedCount));
  return state.blocks.slice(start, start + requestedCount);
};

const addPreviewDimensionLine = (group, label, start, end, color, textColor) => {
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.92, depthTest: false });
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([start, end]), mat);
  line.renderOrder = 9000;
  group.add(line);
  const dir = end.clone().sub(start);
  const len = dir.length();
  if (len > 1e-6) {
    const unit = dir.clone().normalize();
    const headLen = Math.min(0.12, len * 0.18);
    const arrowA = new THREE.ArrowHelper(unit, start, headLen, color, headLen * 0.55, headLen * 0.34);
    const arrowB = new THREE.ArrowHelper(unit.clone().multiplyScalar(-1), end, headLen, color, headLen * 0.55, headLen * 0.34);
    arrowA.renderOrder = 9000;
    arrowB.renderOrder = 9000;
    group.add(arrowA, arrowB);
  }
  const labelSprite = makePreviewTextSprite(label, textColor);
  if (labelSprite) {
    labelSprite.position.copy(start).add(end).multiplyScalar(0.5);
    labelSprite.position.y += 0.08;
    group.add(labelSprite);
  }
};

const addPreviewDimensionAnnotations = (size, dimensions = {}) => {
  const group = new THREE.Group();
  group.name = "block-preview-dimensions";
  const sx = size.x * 0.5;
  const sy = size.y * 0.5;
  const sz = size.z * 0.5;
  const pad = Math.max(0.18, Math.max(size.x, size.y, size.z) * 0.1);
  addPreviewDimensionLine(
    group,
    `Run ${dimensions.lengthCm || "--"} cm`,
    new THREE.Vector3(-sx - pad, -sy - pad, -sz),
    new THREE.Vector3(-sx - pad, -sy - pad, sz),
    0x7db7ff,
    "#b9d8ff"
  );
  addPreviewDimensionLine(
    group,
    `Course ${dimensions.widthCm || "--"} cm`,
    new THREE.Vector3(-sx, -sy - pad * 0.2, sz + pad),
    new THREE.Vector3(sx, -sy - pad * 0.2, sz + pad),
    0xffd27a,
    "#ffe2a0"
  );
  addPreviewDimensionLine(
    group,
    `Height ${dimensions.heightCm || "--"} cm`,
    new THREE.Vector3(-sx - pad, -sy, -sz - pad),
    new THREE.Vector3(-sx - pad, sy, -sz - pad),
    0x96e6a5,
    "#c8ffd1"
  );
  blockPreviewGroup.add(group);
};

const renderBlockPreview = () => {
  if (!blockPreviewRenderer || !nodes.blockPreviewInfo || !nodes.blockPreviewTitle) return;
  clearBlockPreview();
  if (!state.patternAppliedToModel) {
    nodes.blockPreviewTitle.textContent = "source preview";
    nodes.blockPreviewInfo.innerHTML = "<span><b>Status</b> Apply to model to preview blocks</span>";
    return;
  }
  const previewBlocks = getPreviewBlocks();
  if (!previewBlocks.length) {
    nodes.blockPreviewTitle.textContent = "no block";
    nodes.blockPreviewInfo.innerHTML = "<span><b>Status</b> Generate blocks</span>";
    return;
  }
  const previewRoot = new THREE.Group();
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32 });
  const selectedId = state.selectedBlockId || previewBlocks[0].id;
  let anchorMetrics = null;
  const useDesignedPreview = !!state.appliedTileSystem;
  previewBlocks.forEach((block) => {
    try {
      const metrics = buildBlockMesh(block);
      if (!anchorMetrics && block.id === selectedId) anchorMetrics = metrics;
      if (!anchorMetrics) anchorMetrics = metrics;
      const isSelected = block.id === selectedId;
      const color = block.isKeystone ? 0xc09a4a : isSelected ? 0x90aee0 : 0xb8b2a7;
      const smoothImportedSurface = String(metrics.jointFaceType || "").includes("sampled imported-surface");
      const mesh = new THREE.Mesh(metrics.geometry, new THREE.MeshStandardMaterial({
        color,
        roughness: 0.55,
        metalness: 0.04,
        transparent: false,
        opacity: 1,
        side: THREE.DoubleSide,
        flatShading: !(smoothImportedSurface || useDesignedPreview),
      }));
      mesh.userData.blockId = block.id;
      mesh.userData.smoothImportedSurface = smoothImportedSurface;
      if (useDesignedPreview) {
        const thickness = getBlockThicknessForComponent(block);
        const headSeams = buildAppliedBlockHeadSeams(block, thickness);
        if (headSeams) mesh.add(headSeams);
        const designedJoint = buildDesignedJointOverlay(block, state.appliedTileSystem, thickness);
        if (designedJoint) mesh.add(designedJoint);
      } else {
        const seams = new THREE.LineSegments(new THREE.EdgesGeometry(metrics.geometry, 24), edgeMat.clone());
        seams.name = "preview-seams";
        mesh.add(seams);
      }
      previewRoot.add(mesh);
    } catch (err) {
      console.error("renderBlockPreview skipped block", block.id, err);
    }
  });
  if (!previewRoot.children.length) {
    nodes.blockPreviewTitle.textContent = "preview unavailable";
    nodes.blockPreviewInfo.innerHTML = "<span><b>Status</b> Block geometry failed</span>";
    return;
  }
  const box = new THREE.Box3().setFromObject(previewRoot);
  const center = box.getCenter(new THREE.Vector3());
  previewRoot.position.sub(center);
  blockPreviewGroup.add(previewRoot);
  const size = box.getSize(new THREE.Vector3());
  const previewLengthCm = state.appliedTileSystem
    ? metersToCmInput(state.targetBlockWidth)
    : anchorMetrics ? metersToCmInput(anchorMetrics.avgLength) : "--";
  const previewWidthCm = state.appliedTileSystem
    ? metersToCmInput(state.constraints.courseHeight)
    : anchorMetrics ? metersToCmInput(anchorMetrics.avgWidth) : "--";
  const previewHeightCm = metersToCmInput(state.params.thickness);
  addPreviewDimensionAnnotations(size, {
    lengthCm: previewLengthCm,
    widthCm: previewWidthCm,
    heightCm: previewHeightCm,
  });
  const maxSize = Math.max(0.25, size.x, size.y, size.z);
  const distance = maxSize * 2.35;
  blockPreviewCamera.position.set(distance, distance * 0.72, distance * 0.95);
  blockPreviewCamera.near = Math.max(0.01, distance / 100);
  blockPreviewCamera.far = Math.max(100, distance * 10);
  blockPreviewCamera.updateProjectionMatrix();
  if (blockPreviewControls) {
    blockPreviewControls.target.set(0, 0, 0);
    blockPreviewControls.update();
  }
  nodes.blockPreviewTitle.textContent = `${previewBlocks.length} block${previewBlocks.length === 1 ? "" : "s"}`;
  const targetLabel = `${metersToCmInput(state.targetBlockWidth)} x ${metersToCmInput(state.constraints.courseHeight)} x ${metersToCmInput(state.params.thickness)} cm`;
  nodes.blockPreviewInfo.innerHTML = [
    `<span><b>ID</b> ${previewBlocks[0].id}</span>`,
    `<span><b>Run length</b> ${previewLengthCm} cm</span>`,
    `<span><b>Course height</b> ${previewWidthCm} cm</span>`,
    `<span><b>Block depth</b> ${previewHeightCm} cm</span>`,
    `<span><b>Joint</b> ${metersToCmInput(state.constraints.jointGap)} cm</span>`,
    `<span><b>L/W/H</b> ${targetLabel}</span>`,
  ].join("");
};

const renderMetrics = () => {
  const invalid = state.blocks.filter((b) => (b.failed || []).length);
  const vol = state.blocks.reduce((s, b) => s + (b.metrics?.volume || 0), 0);
  const wt = state.blocks.reduce((s, b) => s + (b.metrics?.weight || 0), 0);
  const processWarnings = [];
  if (state.pipelineStage < 2) processWarnings.push("force-flow diagram not reviewed");
  if (state.pipelineStage < 4) processWarnings.push("masonry tessellation not finalized");
  if (state.pipelineStage < 5 || !state.patternAppliedToModel) processWarnings.push("voussoir solids not applied to model");
  if (state.pipelineStage >= 6 && state.jointMode !== "Physical cut") processWarnings.push("physical cut mode not enabled");
  if (state.vaultType === "Groin Vault" && state.pipelineStage >= 7 && state.pattern !== "Groin-line courses") processWarnings.push("compare current layout against groin-line course default");
  state.historicalValidationResults = evaluateHistoricalFamilyValidation();
  const historicalIssues = state.historicalValidationResults.filter((item) => item.status !== "pass");
  const summary = {};
  invalid.forEach((b) => b.failed.forEach((f) => { summary[f] = (summary[f] || 0) + 1; }));
  renderDiagnosticSummary({ invalid, summary, processWarnings, historicalIssues });
  nodes.metrics.innerHTML = [
    ["Stage", `${state.pipelineStage || 0} ${state.stereotomyProcess.stageName}`],
    ["Block Count", state.blocks.length],
    ["Invalid Blocks", invalid.length],
    ["Total Volume", `${vol.toFixed(2)} m^3`],
    ["Total Weight", `${(wt / 1000).toFixed(2)} t`],
    ["Source Mode", state.vaultType === "Custom Imported Rhino Surface" ? "Uploaded Host" : "Built-In"],
    ["Pattern Mesh", state.importedTopologyMeshStats ? `${state.importedTopologyMeshStats.faceCount} faces` : "None"],
    ["Force Flow", state.stereotomyProcess.forceFlowDiagram],
    ["Registration", state.registrationMode],
    ["Cube Scale", state.cubeScale.toFixed(2)],
    ["Array UxV", `${state.arrayU}x${state.arrayV}`],
    ["Tile Layers", state.tileLayers],
  ].map(([k, v]) => `<div class="metric"><b>${k}</b><span>${v}</span></div>`).join("");
  renderHistoricalValidation();
  renderNgonDiagnostics();
  const warningItems = [];
  if (!invalid.length) warningItems.push('<li class="ok">All blocks satisfy current constraints.</li>');
  else warningItems.push(...Object.entries(summary).map(([k, v]) => `<li class="bad">${diagnosticLabel(k)}: ${v} block(s)</li>`));
  if (!historicalIssues.length) {
    warningItems.push('<li class="ok">Historical family validation passes.</li>');
  } else {
    const historicalFails = historicalIssues.filter((item) => item.status === "fail").length;
    const historicalWarns = historicalIssues.length - historicalFails;
    warningItems.push(`<li class="${historicalFails ? "bad" : "warn"}">Historical validation: ${historicalFails} fail, ${historicalWarns} warning(s)</li>`);
  }
  warningItems.push(...processWarnings.map((item) => `<li>${item}</li>`));
  nodes.warnings.innerHTML = warningItems.join("");
};

const renderPrecedent = () => {
  const def = vaultLibrary[state.vaultType];
  const p = precedentDb[state.vaultType];
  const validation = stereotomyValidationCatalog[state.vaultType];
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
    validation ? "<div><b>Fallacara validation checks:</b></div>" : "",
    renderValidationChecklist(validation),
  ].join("");
};

const syncInputsFromState = () => {
  ["span", "rise", "length", "courseCount", "blockCount", "subdivisionDensity", "keystoneSize"].forEach((id) => {
    syncInputPair(id, state.params[id]);
  });
  syncCmInputPair("thickness", state.params.thickness);
  syncCmInput("blockHeight", state.params.thickness);
  setInputValue(nodes.blockPreviewHeight, metersToCmInput(state.params.thickness));
  syncInputPair("panelSubdivisionU", state.panelSubdivisionU);
  syncInputPair("panelSubdivisionV", state.panelSubdivisionV);
  syncInputPair("panelMorphStrength", state.panelMorphStrength);
  if (nodes.panelWeightSubdivision) nodes.panelWeightSubdivision.checked = !!state.panelWeightSubdivision;
  if (byId("vaultType")) byId("vaultType").value = state.vaultType;
  if (byId("vaultDesignerType")) byId("vaultDesignerType").value = state.vaultType;
  if (byId("constructionTemplate")) byId("constructionTemplate").value = state.constructionTemplate;
  if (byId("surfacePrinciple")) byId("surfacePrinciple").value = state.surfacePrinciple;
  if (byId("traitStep")) byId("traitStep").value = state.traitStep;
  if (byId("stereotomyStep")) byId("stereotomyStep").value = state.stereotomyStep;
  if (byId("jointPrinciple")) byId("jointPrinciple").value = state.jointPrinciple;
  if (byId("blockStep")) byId("blockStep").value = state.blockStep;
  if (byId("fabricationCheck")) byId("fabricationCheck").value = state.fabricationCheck;
  if (byId("projectionOperation")) byId("projectionOperation").value = state.projectionOperation;
  if (byId("subdivision")) byId("subdivision").value = state.pattern;
  if (byId("jointMode")) byId("jointMode").value = state.jointMode;
  syncInputPair("cubeScale", state.cubeScale);
  if (byId("arrayUV")) byId("arrayUV").value = `${state.arrayU}x${state.arrayV}`;
  syncInputPair("springingAngle", state.springingAngle);
  syncInputPair("taperScale", state.taperScale);
  if (byId("archType")) byId("archType").value = state.archType;
  syncCmInputPair("targetBlockWidth", state.targetBlockWidth);
  setInputValue(nodes.blockPreviewLength, metersToCmInput(state.targetBlockWidth));
  if (byId("blockDimensionMode")) byId("blockDimensionMode").value = state.blockDimensionMode;
  if (byId("blockPreviewCount")) byId("blockPreviewCount").value = String(state.blockPreviewCount);
  const appliedDims = state.blockDimensionMode !== "fit";
  const importedCellLayout = state.designMode === "Custom Import" && state.vaultType === "Custom Imported Rhino Surface";
  ["courseCount", "courseCountNum", "blockCount", "blockCountNum", "subdivisionDensity", "subdivisionDensityNum"].forEach((id) => {
    const el = byId(id);
    if (!el) return;
    el.disabled = appliedDims && !importedCellLayout;
    el.title = appliedDims && !importedCellLayout
      ? "Derived from block length, block width, and the active topology strategy."
      : "";
  });
  if (nodes.ngonCellType) nodes.ngonCellType.value = state.ngonCellType;
  setInputValue(nodes.ngonShape, state.ngonShape);
  setInputValue(nodes.ngonShapeNum, state.ngonShape);
  if (nodes.strategyPreset && !nodes.strategyPreset.value) nodes.strategyPreset.value = "custom";
  setInputValue(nodes.strategyComponent, state.strategy.component, { force: true });
  setInputValue(nodes.strategyComponentMode, state.strategy.componentMode, { force: true });
  setInputValue(nodes.strategyFill, state.strategy.fill, { force: true });
  setInputValue(nodes.strategyRotation, state.strategy.rotation, { force: true });
  setInputValue(nodes.strategyRotationVariation, state.strategy.rotationVariation, { force: true });
  setInputValue(nodes.strategyComponentMapping, state.strategy.scale, { force: true });
  setInputValue(nodes.strategyThickness, state.strategy.thickness, { force: true });
  setInputValue(nodes.strategyPatchSubdivision, state.strategy.patchSubdivision, { force: true });
  setInputValue(nodes.strategyPatchSubdivisionNum, state.strategy.patchSubdivision, { force: true });
  setInputValue(nodes.strategyPatchSmoothing, state.strategy.patchSmoothing, { force: true });
  setInputValue(nodes.strategyPatchSmoothingNum, state.strategy.patchSmoothing, { force: true });
  setInputValue(nodes.strategyTopology, state.strategy.topology, { force: true });
  if (nodes.strategyDualBoundaryCleanup) nodes.strategyDualBoundaryCleanup.checked = state.strategy.dualBoundaryCleanup !== false;
  setInputValue(nodes.strategyMerge, state.strategy.merge, { force: true });
  syncFieldWeightControls();
  syncContourFieldControls();
  syncCustomPatternSourceInputs();
  if (byId("barrelBondMode")) byId("barrelBondMode").value = state.barrelBondMode;
  if (byId("dragSensitivity")) byId("dragSensitivity").value = state.dragSensitivity;
  if (byId("barrelOffsetSide")) byId("barrelOffsetSide").value = state.barrelOffsetSide;
  syncCmInputPair("wallThickness", state.wallThickness);
  syncInputPair("wallHeightOffset", state.wallHeightOffset);
  if (byId("bayRatio")) byId("bayRatio").value = `${state.bayRatioX}:${state.bayRatioY}`;
  syncInputPair("ribCount", state.ribCount);
  syncInputPair("lierneDensity", state.lierneDensity);
  syncInputPair("netFrequency", state.netFrequency);
  syncInputPair("tileLayers", state.tileLayers);
  syncInputPair("extradosOffset", state.extradosOffset);
  syncCmInput("courseHeight", state.constraints.courseHeight);
  setInputValue(nodes.blockPreviewWidth, metersToCmInput(state.constraints.courseHeight));
  syncCmInput("bedDepth", state.constraints.bedDepth);
  syncCmInput("jointGap", state.constraints.jointGap);
  setInputValue(nodes.customPanelSeamAllowance, metersToCmInput(state.customPanelSeamAllowance));
  setInputValue(nodes.customPanelThicknessScale, state.customPanelThicknessScale);
  setInputValue(nodes.customPanelThicknessOffset, metersToCmInput(state.customPanelThicknessOffset));
  renderPanelVariantControls();
  renderPanelAttractorResponseControls();
  syncSupportScaffoldControls();
  syncTopologyLatticeControls();
  if (byId("supportTopology")) byId("supportTopology").value = state.supportTopology;
  syncInputPair("groinMorph", state.groinMorph);
  syncInputPair("lInterlockBias", state.lInterlockBias);
  if (byId("lightingPreset")) byId("lightingPreset").value = state.lightingPreset;
  if (byId("displayPreset")) byId("displayPreset").value = state.displayPreset;
  if (byId("layoutStyle")) byId("layoutStyle").value = state.layoutStyle;
  if (byId("foilColorA")) byId("foilColorA").value = state.foilGradient.a;
  if (byId("foilColorB")) byId("foilColorB").value = state.foilGradient.b;
  setInputValue(byId("foilMix"), state.foilGradient.mix);
  setInputValue(byId("foilMixNum"), state.foilGradient.mix);
  const sourceSizeMode = usesSourceSizeInputs();
  const sourceDims = getBaseSourceDimensions();
  const sourceScale = Math.max(0.001, Number(state.sourceTransform.scale) || 1);
  if (byId("sourceXLabel")) byId("sourceXLabel").textContent = sourceSizeMode ? "X Size" : "X Position";
  if (byId("sourceYLabel")) byId("sourceYLabel").textContent = sourceSizeMode ? "Y Size" : "Y Position";
  if (byId("sourceZLabel")) byId("sourceZLabel").textContent = sourceSizeMode ? "Z Size" : "Z Position";
  setInputValue(byId("sourceTx"), sourceSizeMode ? (sourceDims.outsideSpan * sourceScale).toFixed(2) : state.sourceTransform.tx);
  setInputValue(byId("sourceTy"), sourceSizeMode ? (sourceDims.length * sourceScale).toFixed(2) : state.sourceTransform.tz);
  setInputValue(byId("sourceTz"), sourceSizeMode ? (sourceDims.outsideHeight * sourceScale).toFixed(2) : state.sourceTransform.ty);
  setInputValue(byId("sourceRx"), state.sourceTransform.rx);
  setInputValue(byId("sourceRy"), state.sourceTransform.ry);
  setInputValue(byId("sourceRz"), state.sourceTransform.rz);
  setInputValue(byId("sourceScale"), state.sourceTransform.scale);
  renderSourceGeometryDimensions();
  if (byId("drawingMode2d")) byId("drawingMode2d").value = state.view2dOptions.mode;
  if (byId("show2dReference")) byId("show2dReference").checked = state.view2dOptions.showReferenceGeometry;
  if (byId("show2dTraitLines")) byId("show2dTraitLines").checked = state.view2dOptions.showTraitLines;
  if (byId("show2dProjectionRays")) byId("show2dProjectionRays").checked = state.view2dOptions.showProjectionRays;
  if (byId("show2dCourseDivisions")) byId("show2dCourseDivisions").checked = state.view2dOptions.showCourseDivisions;
  if (byId("show2dJointNormals")) byId("show2dJointNormals").checked = state.view2dOptions.showJointNormals;
  if (byId("show2dDevelopmentLines")) byId("show2dDevelopmentLines").checked = state.view2dOptions.showDevelopmentLines;
  if (byId("show2dDerivedStereotomy")) byId("show2dDerivedStereotomy").checked = state.view2dOptions.showDerivedStereotomy;
  if (byId("show2dBedJoints")) byId("show2dBedJoints").checked = state.view2dOptions.showBedJoints;
  if (byId("show2dHeadJoints")) byId("show2dHeadJoints").checked = state.view2dOptions.showHeadJoints;
  if (byId("show2dKeystoneZone")) byId("show2dKeystoneZone").checked = state.view2dOptions.showKeystoneZone;
  if (byId("show2dTrueShapePanels")) byId("show2dTrueShapePanels").checked = state.view2dOptions.showTrueShapePanels;
  if (byId("show2dBlocks")) byId("show2dBlocks").checked = state.view2dOptions.showBlocks;
  if (byId("show2dBlockIds")) byId("show2dBlockIds").checked = state.view2dOptions.showBlockIds;
  if (byId("show2dBlockMetrics")) byId("show2dBlockMetrics").checked = state.view2dOptions.showBlockMetrics;
  if (byId("show2dFabricationChecks")) byId("show2dFabricationChecks").checked = state.view2dOptions.showFabricationChecks;
  if (byId("show2dFabricationLegend")) byId("show2dFabricationLegend").checked = state.view2dOptions.showFabricationLegend;
  if (byId("show2dAnnotations")) byId("show2dAnnotations").checked = state.view2dOptions.showAnnotations;
  if (byId("show2dSpanDimension")) byId("show2dSpanDimension").checked = state.view2dOptions.showSpanDimension;
  if (byId("show2dRiseDimension")) byId("show2dRiseDimension").checked = state.view2dOptions.showRiseDimension;
  if (byId("show2dThicknessDimension")) byId("show2dThicknessDimension").checked = state.view2dOptions.showThicknessDimension;
  if (byId("show2dAngleLabels")) byId("show2dAngleLabels").checked = state.view2dOptions.showAngleLabels;
  if (byId("show2dRadiusLabels")) byId("show2dRadiusLabels").checked = state.view2dOptions.showRadiusLabels;
  if (byId("show2dCourseCount")) byId("show2dCourseCount").checked = state.view2dOptions.showCourseCount;
  if (byId("show2dBlockWidth")) byId("show2dBlockWidth").checked = state.view2dOptions.showBlockWidth;
  if (byId("show2dJointGap")) byId("show2dJointGap").checked = state.view2dOptions.showJointGap;
  if (byId("show2dTrueLength")) byId("show2dTrueLength").checked = state.view2dOptions.showTrueLength;
  if (byId("show2dSurfaceFamilyLabel")) byId("show2dSurfaceFamilyLabel").checked = state.view2dOptions.showSurfaceFamilyLabel;
  if (byId("show2dVertices")) byId("show2dVertices").checked = state.view2dOptions.showVertices;
  if (byId("show2dGuides")) byId("show2dGuides").checked = state.view2dOptions.showGuides;
  if (byId("show2dLabels")) byId("show2dLabels").checked = state.view2dOptions.showLabels;
  if (byId("show2dCutLines")) byId("show2dCutLines").checked = state.view2dOptions.showCutLines;
  setInputValue(byId("guideDensity2d"), state.view2dOptions.guideDensity);
  setInputValue(byId("guideDensity2dNum"), state.view2dOptions.guideDensity);
  if (byId("blockLineColor2d")) byId("blockLineColor2d").value = state.view2dOptions.blockStroke;
  if (byId("blockFillColor2d")) byId("blockFillColor2d").value = state.view2dOptions.blockFill;
  setInputValue(byId("blockFillOpacity2d"), state.view2dOptions.blockFillOpacity);
  setInputValue(byId("blockFillOpacity2dNum"), state.view2dOptions.blockFillOpacity);
  [
    ["springing", "entitySpringing"],
    ["axis", "entityAxis"],
    ["apex", "entityApex"],
    ["intrados", "entityIntrados"],
    ["extrados", "entityExtrados"],
    ["neutral", "entityNeutral"],
    ["imposts", "entityImposts"],
    ["skewAxis", "entitySkewAxis"],
    ["groinLine", "entityGroinLine"],
  ].forEach(([key, id]) => {
    const item = state.constructionEntities[key];
    if (byId(id)) byId(id).checked = item.show;
    if (byId(`${id}Color`)) byId(`${id}Color`).value = item.color;
  });
  ["maxLength", "maxWidth", "minThickness", "minEdgeLength", "fabTolerance"].forEach((k) => {
    setInputValue(byId(k), metersToCmInput(state.constraints[k]));
    setInputValue(byId(`${k}Slider`), metersToCmInput(state.constraints[k]));
  });
  ["maxWeight", "maxTaper"].forEach((k) => {
    setInputValue(byId(k), state.constraints[k]);
    setInputValue(byId(`${k}Slider`), state.constraints[k]);
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
  if (byId("layerSourceModel")) byId("layerSourceModel").checked = state.layers.sourceModel;
  if (byId("layerBuiltInForm")) byId("layerBuiltInForm").checked = state.layers.builtInForm;
  if (byId("layerBlocks")) byId("layerBlocks").checked = state.layers.blocks;
  if (byId("layerCopies")) byId("layerCopies").checked = state.layers.copies;
  if (byId("layerSupports")) byId("layerSupports").checked = state.layers.supports;
  if (byId("layerGuides")) byId("layerGuides").checked = state.layers.guides;
  syncImportedSurfaceToggle();
  syncTransformToolbar();
  renderDrawingPresetButtons();
  renderCurrentTraitState();
  renderTraitFocusControls();
  renderActiveAssetStrip();
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

const applyConstructionTemplate = (name) => {
  const tpl = constructionTemplateCatalog[name];
  if (!tpl) return;
  state.constructionTemplate = name;
  state.activeTraitConstructionStep = null;
  state.vaultType = tpl.vaultType;
  state.jointPrinciple = inferJointPrincipleFromTemplate(tpl);
  state.surfacePrinciple = tpl.surfacePrinciple;
  state.pattern = tpl.pattern;
  state.params = { ...state.params, ...tpl.params };
  state.structuralDirection = vaultStructuralDefault[state.vaultType] || state.structuralDirection;
  state.designMode = "Generated";
  state.customPatternSource = "UV Form Grid";
  state.patternAppliedToModel = false;
  state.blocksGeneratedFromTrait = false;
  apply2dDrawingMode(tpl.drawingMode);
  state.traitStep = tpl.traitStep;
  state.stereotomyStep = tpl.stereotomyStep;
  state.blockStep = "Generated Voussoirs";
  if (tpl.surfacePrinciple === "Compound / Intersection" || tpl.vaultType === "Groin Vault") {
    state.constructionEntities.groinLine.show = true;
  }
  if (tpl.jointLogic.includes("skew") || tpl.jointLogic.includes("oblique")) {
    state.constructionEntities.skewAxis.show = true;
  }
  if (byId("designMode")) byId("designMode").value = "Generated";
  if (byId("vaultType")) byId("vaultType").value = state.vaultType;
  if (byId("subdivision")) byId("subdivision").value = state.pattern;
  if (byId("customPatternSource")) byId("customPatternSource").value = state.customPatternSource;
  applyVaultParamRules();
  syncWallThicknessWithVault();
  updateStereotomyProcess(Math.max(state.pipelineStage || 0, 3));
  syncInputsFromState();
  renderConstructionTemplateDetails();
  setPipelineStatus(`Loaded 2D construction template: ${name}.`);
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
  if (isBarrelLikeVault(vaultType)) {
    state.barrelOffsetSide = "Inside";
    state.barrelBondMode = "5";
  }
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
    const archLen = estimateBarrelArchLength();
    state.params.blockCount = clamp(Math.round(state.params.length / w), 2, 160);
    state.params.courseCount = clamp(Math.round(archLen / h), 4, 120);
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
  const tpl = constructionTemplateCatalog[state.constructionTemplate];
  const joint = jointPrinciples[state.jointPrinciple];
  const allowedPatterns = Array.from(new Set([...(vaultPatternAllowed[state.vaultType] || patterns), tpl?.pattern, joint?.pattern].filter(Boolean)));
  const subEl = byId("subdivision");
  if (subEl) {
    [...subEl.options].forEach((opt) => { opt.disabled = !allowedPatterns.includes(opt.value); });
    if (!allowedPatterns.includes(state.pattern)) state.pattern = allowedPatterns[0];
    subEl.value = state.pattern;
  }
  const supportTopologyEl = byId("supportTopology");
  if (supportTopologyEl) {
    const lockedToCorners = state.vaultType === "Groin Vault";
    if (lockedToCorners) {
      state.supportTopology = "4 corners";
      supportTopologyEl.value = "4 corners";
    }
    supportTopologyEl.disabled = lockedToCorners;
    const label = supportTopologyEl.closest("label");
    if (label) {
      label.style.opacity = lockedToCorners ? "0.65" : "1";
      label.title = lockedToCorners ? "Groin Vault is currently constrained to four corner columns." : "";
    }
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
  renderTraitConstructionSteps();
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
  renderBlockPreview();
};

const rebuild = () => {
  const activeStrategy = refreshStrategyDescriptor();
  const sourcePreviewOnly =
    state.vaultDesignerPreview ||
    !state.patternAppliedToModel &&
    state.designMode === "Custom Import" &&
    state.vaultType === "Custom Imported Rhino Surface" &&
    state.importedSurface;
  if (sourcePreviewOnly) {
    state.blocks = [];
    state.selectedBlockId = null;
    build3d();
    syncInputsFromState();
    applySourceTransform();
    applyLayerVisibility();
    applySelection();
    renderMetrics();
    renderPrecedent();
    renderActiveVaultTools();
    renderTraitConstructionSteps();
    renderConstructionTemplateDetails();
    renderProjectionOperationDetails();
    renderJointPrincipleDetails();
    renderBlockPreview();
    if (!state.userDefinedCamera) {
      if (state.vaultDesignerPreview) fitCameraToPreviewSource();
      else fitCameraToObject(importedSurfaceGroup);
    }
    draw2d();
    renderFormForceDiagrams();
    return;
  }
  if (!state.patternAppliedToModel) {
    build3d();
  }
  try {
    state.blocks = generatePatternBlocks();
  } catch (err) {
    console.error("rebuild/generatePatternBlocks failed", err);
    state.blocks = [];
  }
  const explicitCustomNgon =
    state.designMode === "Custom Import" &&
    state.vaultType === "Custom Imported Rhino Surface" &&
    ["NGon Cells", "NGon Adaptive"].includes(state.customPatternSource);
  const explicitTopology =
    state.designMode === "Custom Import" &&
    state.vaultType === "Custom Imported Rhino Surface" &&
    state.importedTopologyPolys?.length &&
    (state.customPatternSource === "Imported Topology Mesh" || state.pattern === "Hex / NGon");
  if (!state.blocks.length && !explicitCustomNgon && !explicitTopology) {
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
  state.blocks.forEach((block) => annotateBlockForStrategy(block, activeStrategy));
  applyFieldWeightSmoothingToBlocks(state.blocks);
  applyFieldDrivenBlockProperties(state.blocks, activeStrategy);
  state.blocks = applyContourBandsAndMasks(state.blocks);
  const validBlocks = [];
  const validationErrors = [];
  state.blocks.forEach((b) => {
    try {
      const m = buildBlockMesh(b);
      b.metrics = m;
      b.failed = validate(m, b);
      if (m.geometry) m.geometry.dispose();
      validBlocks.push(b);
    } catch (err) {
      validationErrors.push({ id: b.id, err });
    }
  });
  if (validationErrors.length) console.error("rebuild/prevalidation skipped blocks", validationErrors);
  if (validBlocks.length) state.blocks = validBlocks;
  syncInputsFromState();
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
  applySourceTransform();
  applyLayerVisibility();
  applySelection();
  if (!state.suspendViewportFit && !state.userDefinedCamera) {
    if (state.patternAppliedToModel) {
      if (state.appliedTileSystem) {
        const box = new THREE.Box3();
        const blockBox = new THREE.Box3().setFromObject(blockGroup);
        const solidBox = new THREE.Box3().setFromObject(solidVaultGroup);
        if (!blockBox.isEmpty()) box.union(blockBox);
        if (!solidBox.isEmpty()) box.union(solidBox);
        if (!box.isEmpty()) {
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const span = Math.max(size.x, size.y, size.z, 8);
          camera.position.set(center.x + span * 1.15, center.y + span * 0.72, center.z + span * 1.35);
          controls.target.set(center.x, center.y * 0.55, center.z);
          controls.update();
        } else {
          fitCameraToBlocks();
        }
      } else {
        fitCameraToBlocks();
      }
    } else {
      fitCameraToPreviewSource();
    }
  }
  try {
    draw2d();
  } catch (err) {
    console.error("rebuild/draw2d failed", err);
  }
  renderFormForceDiagrams();
  renderMetrics();
  renderPrecedent();
  renderActiveVaultTools();
  renderTraitConstructionSteps();
  renderConstructionTemplateDetails();
  renderProjectionOperationDetails();
  renderJointPrincipleDetails();
  if (!state.blocks.some((b) => b.id === state.selectedBlockId)) state.selectedBlockId = null;
  renderBlockPreview();
};

const loadObjectFromFile = async (file) => {
  const url = URL.createObjectURL(file);
  const lower = file.name.toLowerCase();
  let obj = null;
  try {
    if (lower.endsWith(".obj")) {
      const txt = await file.text();
      obj = objLoader.parse(txt);
    } else if (lower.endsWith(".stl")) {
      const arr = await file.arrayBuffer();
      const geometry = stlLoader.parse(arr);
      const pos = geometry.getAttribute("position");
      if (pos) {
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          const z = pos.getZ(i);
          pos.setY(i, z);
          pos.setZ(i, y);
        }
        pos.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
      }
      obj = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x8eb8d4, roughness: 0.52, metalness: 0.04, side: THREE.DoubleSide }));
    } else if (lower.endsWith(".glb") || lower.endsWith(".gltf")) {
      const gltf = await new Promise((resolve, reject) => gltfLoader.load(url, resolve, undefined, reject));
      obj = gltf.scene;
    } else if (lower.endsWith(".3dm")) {
      obj = await rhinoLoader.loadAsync(url);
    }
  } finally {
    URL.revokeObjectURL(url);
  }
  return obj;
};

const disposeImportedRhinoDoc = () => {
  try {
    (state.importedRhinoBrepFaces || []).forEach((item) => {
      item.surface?.delete?.();
      item.face?.delete?.();
    });
    state.importedRhinoDoc?.delete?.();
  } catch {}
  state.importedRhinoDoc = null;
  state.importedRhinoBrepFaces = null;
};

const loadRhinoBrepData = async (file) => {
  disposeImportedRhinoDoc();
  if (!file.name.toLowerCase().endsWith(".3dm")) return [];
  const rhino = await getRhinoModule();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = rhino.File3dm.fromByteArray(bytes);
  const objects = doc.objects();
  const facesOut = [];
  for (let objectIndex = 0; objectIndex < objects.count; objectIndex++) {
    const object = objects.get(objectIndex);
    const geometry = object?.geometry?.();
    const objectType = geometry?.objectType;
    if (objectType === rhino.ObjectType.Brep && geometry.faces) {
      const faces = geometry.faces();
      for (let faceIndex = 0; faceIndex < faces.count; faceIndex++) {
        const face = faces.get(faceIndex);
        const surface = face.duplicateSurface?.() || face.underlyingSurface?.();
        if (!surface?.pointAt || !surface?.normalAt) {
          face?.delete?.();
          continue;
        }
        const du = rhinoDomain(surface, 0);
        const dv = rhinoDomain(surface, 1);
        const reversed = typeof face.orientationIsReversed === "function" ? !!face.orientationIsReversed() : !!face.orientationIsReversed;
        facesOut.push({
          objectIndex,
          faceIndex,
          surface,
          reversed,
          rhinoDomain: { u0: du[0], u1: du[1], v0: dv[0], v1: dv[1] },
        });
        face?.delete?.();
      }
      faces?.delete?.();
    }
    object?.delete?.();
  }
  const count = facesOut.length;
  facesOut.forEach((item, index) => {
    const u0 = index / Math.max(1, count);
    const u1 = (index + 1) / Math.max(1, count);
    item.patch = {
      id: `brep-face-${item.objectIndex + 1}-${item.faceIndex + 1}`,
      uv: [[u0, 0], [u1, 0], [u1, 1], [u0, 1]],
      domain: { u0, u1, v0: 0, v1: 1 },
      rhinoDomain: item.rhinoDomain,
      source: "rhino-brep-face-domain",
    };
  });
  state.importedRhinoDoc = doc;
  state.importedRhinoBrepFaces = facesOut;
  state.importedBrepPatches = facesOut.map((item) => item.patch);
  return facesOut;
};

const objectHasRenderableMesh = (obj) => {
  let hasMesh = false;
  obj?.traverse?.((child) => {
    if (!child.isMesh || !child.geometry) return;
    const pos = child.geometry.getAttribute("position");
    if (pos?.count) hasMesh = true;
  });
  return hasMesh;
};

const disposeObject = (object) => {
  object?.traverse?.((child) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      child.material.forEach((mat) => {
        mat.map?.dispose?.();
        mat.dispose?.();
      });
    } else {
      child.material?.map?.dispose?.();
      child.material?.dispose?.();
    }
  });
};

const buildRhinoBrepPreviewObject = (brepFaces) => {
  const group = new THREE.Group();
  group.name = "rhino-brep-preview";
  const material = new THREE.MeshStandardMaterial({
    color: 0x8eb8d4,
    roughness: 0.52,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  brepFaces.forEach((item) => {
    const surface = item.surface;
    const d = item.rhinoDomain;
    if (!surface?.pointAt || !d) return;
    const uSteps = 28;
    const vSteps = 28;
    const vertices = [];
    const indices = [];
    for (let y = 0; y <= vSteps; y++) {
      for (let x = 0; x <= uSteps; x++) {
        const u = THREE.MathUtils.lerp(d.u0, d.u1, x / uSteps);
        const v = THREE.MathUtils.lerp(d.v0, d.v1, y / vSteps);
        const point = rhinoPointToVector3(surface.pointAt(u, v));
        if (!point || !Number.isFinite(point.x + point.y + point.z)) return;
        vertices.push(point.x, point.y, point.z);
      }
    }
    const row = uSteps + 1;
    for (let y = 0; y < vSteps; y++) {
      for (let x = 0; x < uSteps; x++) {
        const a = y * row + x;
        const b = a + 1;
        const c = a + row + 1;
        const e = a + row;
        if (item.reversed) indices.push(a, c, b, a, e, c);
        else indices.push(a, b, c, a, c, e);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    if (!geometry.boundingBox?.isEmpty()) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.name = item.patch?.id || "rhino-brep-face";
      group.add(mesh);
    } else {
      geometry.dispose();
    }
  });
  return group.children.length ? group : null;
};

const getDominantPlanarAxes = (points) => {
  const ranges = ["x", "y", "z"].map((axis) => {
    const values = points.map((p) => p[axis]);
    return { axis, range: Math.max(...values) - Math.min(...values) };
  }).sort((a, b) => b.range - a.range);
  return [ranges[0]?.axis || "x", ranges[1]?.axis || "z"];
};

const normalizePointFacesToUv = (faces) => {
  const allPoints = faces.flat();
  if (!allPoints.length) return [];
  const ranges = ["x", "y", "z"].map((axis) => {
    const values = allPoints.map((p) => p[axis]);
    return { axis, range: Math.max(...values) - Math.min(...values) };
  }).sort((a, b) => b.range - a.range);
  const [axisU, axisV] = [ranges[0]?.axis || "x", ranges[1]?.axis || "z"];
  const outOfPlane = ranges[2]?.range || 0;
  const inPlane = Math.max(ranges[0]?.range || 0, ranges[1]?.range || 0, 1e-9);
  if (outOfPlane > Math.max(0.001, inPlane * 0.025)) return [];
  const minU = Math.min(...allPoints.map((p) => p[axisU]));
  const maxU = Math.max(...allPoints.map((p) => p[axisU]));
  const minV = Math.min(...allPoints.map((p) => p[axisV]));
  const maxV = Math.max(...allPoints.map((p) => p[axisV]));
  const scaleU = Math.max(1e-9, maxU - minU);
  const scaleV = Math.max(1e-9, maxV - minV);
  return faces
    .map((face) => face.map((p) => [
      clamp((p[axisU] - minU) / scaleU, 0, 1),
      clamp((p[axisV] - minV) / scaleV, 0, 1),
    ]))
    .map((uv) => cellHasUsableArea(uv, 0.000001))
    .filter(Boolean);
};

const parseObjTopologyPolygons = (text) => {
  return normalizePointFacesToUv(parseObjPointFaces(text));
};

const parseObjPointFaces = (text) => {
  const vertices = [];
  const faces = [];
  const logicalLines = text
    .replace(/\\\r?\n/g, " ")
    .split(/\r?\n/);
  logicalLines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const parts = trimmed.split(/\s+/);
    if (parts[0] === "v" && parts.length >= 4) {
      vertices.push(new THREE.Vector3(Number(parts[1]), Number(parts[2]), Number(parts[3])));
    } else if (parts[0] === "f" && parts.length >= 4) {
      const face = parts.slice(1)
        .map((token) => Number(token.split("/")[0]))
        .map((index) => vertices[index < 0 ? vertices.length + index : index - 1])
        .filter(Boolean)
        .map((p) => p.clone());
      const first = face[0];
      const last = face[face.length - 1];
      if (face.length > 3 && first && last && first.distanceTo(last) < 1e-8) face.pop();
      if (face.length >= 3) faces.push(face);
    }
  });
  return faces;
};

const buildTissueCellsFromPointFaces = (faces, obj) => {
  if (!faces?.length || !obj) return [];
  obj.updateMatrixWorld(true);
  const mappedFaces = faces
    .map((face) => face.map((point) => point.clone().multiply(obj.scale).add(obj.position)))
    .filter((face) => face.length >= 3);
  const allPoints = mappedFaces.flat();
  if (!allPoints.length) return [];
  const bbox = new THREE.Box3().setFromPoints(allPoints);
  const size = bbox.getSize(new THREE.Vector3());
  const axisRanges = ["x", "y", "z"].map((axis) => ({ axis, range: size[axis] })).sort((a, b) => b.range - a.range);
  const axisU = axisRanges[0]?.axis || "x";
  const axisV = axisRanges[1]?.axis || "z";
  const rangeU = Math.max(1e-9, bbox.max[axisU] - bbox.min[axisU]);
  const rangeV = Math.max(1e-9, bbox.max[axisV] - bbox.min[axisV]);
  const cells = mappedFaces
    .map((points, faceIndex) => {
      const uv = points.map((p) => [
        clamp((p[axisU] - bbox.min[axisU]) / rangeU, 0, 1),
        clamp((p[axisV] - bbox.min[axisV]) / rangeV, 0, 1),
      ]);
      const cleaned = cleanPairedUvPoints(uv, points, 0.000001);
      if (!cleaned) return null;
      return {
        faceIndex,
        points: cleaned.points,
        uv: cleaned.uv,
        sourceCarrierUv: cleaned.uv.map((coord) => [...coord]),
        faceNormal: getFaceNormalFromPoints(cleaned.points),
      };
    })
    .filter(Boolean);
  const normalMap = new Map();
  cells.forEach((cell) => {
    const normal = cell.faceNormal || new THREE.Vector3(0, 1, 0);
    cell.points.forEach((point) => {
      const key = tissuePointKey(point);
      if (!normalMap.has(key)) normalMap.set(key, new THREE.Vector3());
      normalMap.get(key).add(normal);
    });
  });
  normalMap.forEach((normal) => {
    if (normal.lengthSq() > 1e-10) normal.normalize();
    else normal.set(0, 1, 0);
  });
  cells.forEach((cell) => {
    cell.targetNormals = cell.points.map((point) => normalMap.get(tissuePointKey(point))?.clone() || cell.faceNormal?.clone() || new THREE.Vector3(0, 1, 0));
  });
  return cells;
};

const extractObjectTopologyPolygons = (obj) => {
  const faces = [];
  obj.updateMatrixWorld(true);
  obj.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.geometry) return;
    const pos = mesh.geometry.getAttribute("position");
    if (!pos) return;
    const index = mesh.geometry.index;
    const readVertex = (i) => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        faces.push([readVertex(index.getX(i)), readVertex(index.getX(i + 1)), readVertex(index.getX(i + 2))]);
      }
    } else {
      for (let i = 0; i < pos.count; i += 3) {
        faces.push([readVertex(i), readVertex(i + 1), readVertex(i + 2)]);
      }
    }
  });
  return normalizePointFacesToUv(faces);
};

const loadTopologyMesh = async (file) => {
  const lower = file.name.toLowerCase();
  let polys = [];
  if (lower.endsWith(".obj")) {
    polys = parseObjTopologyPolygons(await file.text());
  } else if (lower.endsWith(".3dm")) {
    const obj = await loadObjectFromFile(file);
    if (obj) polys = extractObjectTopologyPolygons(obj);
  }
  if (!polys.length) return false;
  state.importedTopologyPolys = polys;
  state.importedTissueCells = null;
  state.importedTopologyMeshName = file.name;
  state.importedTopologyMeshStats = {
    faceCount: polys.length,
    vertexCount: polys.reduce((sum, poly) => sum + poly.length, 0),
    minVertices: Math.min(...polys.map((poly) => poly.length)),
    maxVertices: Math.max(...polys.map((poly) => poly.length)),
  };
  return true;
};

const load3DObject = async (file) => {
  let brepFaces = [];
  let objCarrierFaces = [];
  if (file.name.toLowerCase().endsWith(".3dm")) {
    try {
      brepFaces = await loadRhinoBrepData(file);
    } catch (err) {
      console.error("load3DObject/loadRhinoBrepData failed", err);
      disposeImportedRhinoDoc();
    }
  } else {
    disposeImportedRhinoDoc();
    if (file.name.toLowerCase().endsWith(".obj")) {
      try {
        objCarrierFaces = parseObjPointFaces(await file.text());
      } catch (err) {
        console.warn("load3DObject/parseObjPointFaces failed", err);
      }
    }
  }
  let obj = await loadObjectFromFile(file);
  if (obj && brepFaces.length) {
    const box = new THREE.Box3().setFromObject(obj);
    const meshStats = getImportedModelStats(obj);
    if (!objectHasRenderableMesh(obj) || box.isEmpty() || meshStats.triangleCount < 4) {
      disposeObject(obj);
      obj = buildRhinoBrepPreviewObject(brepFaces);
    }
  }
  if (!obj) return false;
  clearGroup(importedSurfaceGroup);
  importedSurfaceGroup.add(obj);
  const normalization = normalizeImportedObjectToWorkspace(obj);
  obj.traverse((c) => {
    if (c.isMesh) {
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((mat) => mat.dispose?.());
        else c.material.dispose?.();
      }
      c.material = new THREE.MeshStandardMaterial({ color: 0x8eb8d4, roughness: 0.52, metalness: 0.04, side: THREE.DoubleSide, flatShading: false });
    }
  });
  const acceleratedMeshes = prepareImportedGeometry(obj);
  const tissueCells = objCarrierFaces.length ? buildTissueCellsFromPointFaces(objCarrierFaces, obj) : [];
  const bbox = new THREE.Box3().setFromObject(obj);
  state.importedSurface = obj;
  state.importedSurfaceBbox = bbox;
  state.importedBrepPatches = brepFaces.length ? brepFaces.map((item) => item.patch) : null;
  state.importedTopology = analyzeImportedMeshTopology(obj, bbox);
  state.importedTopologyPolys = null;
  state.importedTissueCells = tissueCells.length ? tissueCells : null;
  state.importedTopologyMeshName = tissueCells.length
    ? `${file.name} Panel carrier faces`
    : brepFaces.length ? `${file.name} Rhino BREP faces` : "";
  state.importedTopologyMeshStats = tissueCells.length ? {
    faceCount: tissueCells.length,
    vertexCount: tissueCells.reduce((sum, cell) => sum + cell.points.length, 0),
    minVertices: Math.min(...tissueCells.map((cell) => cell.points.length)),
    maxVertices: Math.max(...tissueCells.map((cell) => cell.points.length)),
    source: "panel host mesh",
  } : brepFaces.length ? {
    faceCount: brepFaces.length,
    vertexCount: brepFaces.length * 4,
    minVertices: 4,
    maxVertices: 4,
  } : null;
  state.importedModelName = file.name;
  state.importedModelStats = { ...getImportedModelStats(obj), acceleratedMeshes, normalizedScale: normalization.scale };
  state.importedModelStats.rhinoBrepFaceCount = brepFaces.length;
  state.sourceTransform = { tx: 0, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, scale: 1 };
  applySourceTransform();
  syncInputsFromState();
  applyDisplayPreset();
  fitCameraToObject(obj);
  return true;
};

const extractCustomPanelGeometryData = (obj, bbox = new THREE.Box3().setFromObject(obj)) => {
  obj.updateMatrixWorld(true);
  const positions = [];
  const indices = [];
  obj.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.geometry) return;
    const pos = mesh.geometry.getAttribute("position");
    if (!pos?.count) return;
    const index = mesh.geometry.getIndex();
    const base = positions.length;
    for (let i = 0; i < pos.count; i++) {
      positions.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
    }
    if (index?.count) {
      for (let i = 0; i < index.count; i += 3) {
        indices.push(base + index.getX(i), base + index.getX(i + 1), base + index.getX(i + 2));
      }
    } else {
      for (let i = 0; i < pos.count - 2; i += 3) {
        indices.push(base + i, base + i + 1, base + i + 2);
      }
    }
  });
  if (!positions.length || !indices.length) return null;
  const size = bbox.getSize(new THREE.Vector3());
  const ranges = [
    { axis: "x", min: bbox.min.x, max: bbox.max.x, range: size.x },
    { axis: "y", min: bbox.min.y, max: bbox.max.y, range: size.y },
    { axis: "z", min: bbox.min.z, max: bbox.max.z, range: size.z },
  ].sort((a, b) => b.range - a.range);
  return {
    positions,
    indices,
    axes: {
      u: ranges[0],
      v: ranges[1],
      n: ranges[2],
    },
  };
};

const interpolateComponentCellUv = (sourceUv, u, v) => {
  if (sourceUv.length === 4) {
    const bottom = [
      THREE.MathUtils.lerp(sourceUv[0][0], sourceUv[1][0], u),
      THREE.MathUtils.lerp(sourceUv[0][1], sourceUv[1][1], u),
    ];
    const top = [
      THREE.MathUtils.lerp(sourceUv[3][0], sourceUv[2][0], u),
      THREE.MathUtils.lerp(sourceUv[3][1], sourceUv[2][1], u),
    ];
    return [
      THREE.MathUtils.lerp(bottom[0], top[0], v),
      THREE.MathUtils.lerp(bottom[1], top[1], v),
    ];
  }
  const box = buildUvBoundingRect(sourceUv);
  return [
    THREE.MathUtils.lerp(box.minU, box.maxU, u),
    THREE.MathUtils.lerp(box.minV, box.maxV, v),
  ];
};

const getFaceNormalFromPoints = (points) => {
  if (!points?.length || points.length < 3) return null;
  const base = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const normal = new THREE.Vector3()
      .crossVectors(points[i].clone().sub(base), points[i + 1].clone().sub(base));
    if (normal.lengthSq() > 1e-10) return normal.normalize();
  }
  return new THREE.Vector3(0, 1, 0);
};

const interpolateTargetCellPoint = (points, u, v, sourceUv = null, clampCoordinates = true) => {
  if (!points?.length) return new THREE.Vector3();
  let uu = clampCoordinates ? clamp(u, 0, 1) : u;
  let vv = clampCoordinates ? clamp(v, 0, 1) : v;
  if (sourceUv?.length) {
    const bounds = polygonBoundsUv(sourceUv);
    const remappedU = (u - bounds.minU) / Math.max(1e-9, bounds.maxU - bounds.minU);
    const remappedV = (v - bounds.minV) / Math.max(1e-9, bounds.maxV - bounds.minV);
    uu = clampCoordinates ? clamp(remappedU, 0, 1) : remappedU;
    vv = clampCoordinates ? clamp(remappedV, 0, 1) : remappedV;
  }
  if (points.length === 4) {
    const bottom = points[0].clone().lerp(points[1], uu);
    const top = points[3].clone().lerp(points[2], uu);
    return bottom.lerp(top, vv);
  }
  if (points.length === 3) {
    const a = points[0].clone().multiplyScalar(Math.max(0, 1 - uu - vv));
    const b = points[1].clone().multiplyScalar(uu);
    const c = points[2].clone().multiplyScalar(vv);
    return a.add(b).add(c);
  }
  const center = points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / points.length);
  const angle = uu * Math.PI * 2;
  const scaled = center.clone();
  let closest = points[0];
  let closestDot = -Infinity;
  const normal = getFaceNormalFromPoints(points) || new THREE.Vector3(0, 1, 0);
  const ref = points[0].clone().sub(center).normalize();
  const bitangent = new THREE.Vector3().crossVectors(normal, ref).normalize();
  points.forEach((point) => {
    const dir = point.clone().sub(center).normalize();
    const dot = dir.dot(ref) * Math.cos(angle) + dir.dot(bitangent) * Math.sin(angle);
    if (dot > closestDot) {
      closestDot = dot;
      closest = point;
    }
  });
  return scaled.lerp(closest, vv);
};

const interpolateTargetCellNormal = (normals, u, v, fallback = null) => {
  if (!normals?.length) return fallback?.clone?.() || new THREE.Vector3(0, 1, 0);
  const uu = clamp(u, 0, 1);
  const vv = clamp(v, 0, 1);
  if (normals.length === 4) {
    const bottom = normals[0].clone().lerp(normals[1], uu);
    const top = normals[3].clone().lerp(normals[2], uu);
    const normal = bottom.lerp(top, vv);
    return normal.lengthSq() > 1e-10 ? normal.normalize() : (fallback?.clone?.() || new THREE.Vector3(0, 1, 0));
  }
  const normal = normals.reduce((sum, n) => sum.add(n), new THREE.Vector3()).multiplyScalar(1 / normals.length);
  return normal.lengthSq() > 1e-10 ? normal.normalize() : (fallback?.clone?.() || new THREE.Vector3(0, 1, 0));
};

const getTargetCellSeamExpansion = (points, allowance) => {
  if (!points?.length || points.length !== 4 || Math.abs(allowance) < 1e-6) return { u: 0, v: 0 };
  const bottom = points[0].distanceTo(points[1]);
  const top = points[3].distanceTo(points[2]);
  const left = points[0].distanceTo(points[3]);
  const right = points[1].distanceTo(points[2]);
  return {
    u: clamp(allowance / Math.max(0.001, (bottom + top) * 0.5), -0.25, 0.25),
    v: clamp(allowance / Math.max(0.001, (left + right) * 0.5), -0.25, 0.25),
  };
};

const expandPanelCoordinateForSeam = (value, expansion) => {
  if (Math.abs(expansion) < 1e-6) return value;
  return 0.5 + (value - 0.5) * (1 + expansion * 2);
};

const getTargetCellDimensions = (points) => {
  if (!points?.length || points.length < 3) return { u: 0, v: 0, average: 0 };
  if (points.length === 4) {
    const u = (points[0].distanceTo(points[1]) + points[3].distanceTo(points[2])) * 0.5;
    const v = (points[0].distanceTo(points[3]) + points[1].distanceTo(points[2])) * 0.5;
    return { u, v, average: (u + v) * 0.5 };
  }
  const edges = points.map((point, index) => point.distanceTo(points[(index + 1) % points.length]));
  const average = edges.reduce((sum, edge) => sum + edge, 0) / edges.length;
  return { u: average, v: average, average };
};

const getCustomPanelThicknessSettings = (data, targetPoints, baseThickness) => {
  const mode = state.strategy.thickness === "relative-cell" ? "relative" : state.strategy.thickness || "constant";
  const sourceThickness = Math.max(0.001, data.axes.n.range || baseThickness || 0.001);
  const sourcePlan = Math.max(0.001, Math.max(data.axes.u.range || 0, data.axes.v.range || 0));
  const targetDims = getTargetCellDimensions(targetPoints);
  const targetPlan = Math.max(0.001, targetDims.average || baseThickness || sourcePlan);
  const userScale = clamp(Number(state.customPanelThicknessScale) || 1, 0.05, 20);
  const offset = Number(state.customPanelThicknessOffset) || 0;
  if (mode === "relative") {
    return {
      thickness: clamp(targetPlan * (sourceThickness / sourcePlan) * userScale, 0.001, 20),
      offset,
      align: 0,
    };
  }
  if (mode === "scale") {
    return {
      thickness: clamp(sourceThickness * userScale, 0.001, 20),
      offset,
      align: 0,
    };
  }
  if (mode === "offset") {
    return {
      thickness: clamp(sourceThickness * userScale, 0.001, 20),
      offset,
      align: -0.5,
    };
  }
  return {
    thickness: Math.max(0.001, baseThickness),
    offset,
    align: 0,
  };
};

const getNormalizedAxisValue = (point, axis) => clamp((point[axis.axis] - axis.min) / Math.max(axis.range, 1e-9), 0, 1);

const getPanelBoundaryEdges = (indices) => {
  const edges = new Map();
  for (let i = 0; i < indices.length; i += 3) {
    const tri = [indices[i], indices[i + 1], indices[i + 2]];
    for (let j = 0; j < 3; j++) {
      const a = tri[j];
      const b = tri[(j + 1) % 3];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const existing = edges.get(key);
      if (existing) existing.count += 1;
      else edges.set(key, { a, b, count: 1 });
    }
  }
  return [...edges.values()].filter((edge) => edge.count === 1);
};

const getCustomPanelMorphCompatibility = (basisData, morphData) => {
  if (!basisData?.positions?.length || !morphData?.positions?.length) return { compatible: false, reason: "missing mesh positions" };
  if (basisData.positions.length !== morphData.positions.length) return { compatible: false, reason: "vertex count differs" };
  if (basisData.indices?.length !== morphData.indices?.length) return { compatible: false, reason: "triangle count differs" };
  if (!basisData.indices.every((value, index) => value === morphData.indices[index])) return { compatible: false, reason: "triangle indexing differs" };
  const edgeTolerance = 0.024;
  const boundaryTolerance = 0.003;
  for (let index = 0; index < basisData.positions.length; index++) {
    const base = basisData.positions[index];
    const baseU = getNormalizedAxisValue(base, basisData.axes.u);
    const baseV = getNormalizedAxisValue(base, basisData.axes.v);
    if (Math.min(baseU, 1 - baseU, baseV, 1 - baseV) > edgeTolerance) continue;
    const morph = morphData.positions[index];
    const morphU = getNormalizedAxisValue(morph, morphData.axes.u);
    const morphV = getNormalizedAxisValue(morph, morphData.axes.v);
    if (Math.hypot(baseU - morphU, baseV - morphV) > boundaryTolerance) {
      return { compatible: false, reason: "outer boundary vertices moved" };
    }
  }
  return { compatible: true, reason: "matched topology and boundary" };
};
const customPanelMorphIsCompatible = (basisData, morphData) => getCustomPanelMorphCompatibility(basisData, morphData).compatible;

const buildCustomPanelMappedGeometry = (block, sourceUv, thickness, useImportedSurface = false) => {
  const panel = state.customPanel;
  const data = panel?.geometryData;
  if (!data?.positions?.length || !data?.indices?.length) return null;
  const panelVariantRole = block.panelVariantRole || resolvePanelVariantRoleForBlock(block);
  const panelTransform = getPanelVariantTransform(panelVariantRole);
  const alignmentMode = panelTransform.align && panelTransform.align !== "strategy" ? panelTransform.align : state.strategy.rotation;
  if (alignmentMode && alignmentMode !== state.strategy.rotation) block.mapping = { ...(block.mapping || {}), rotation: alignmentMode };
  const morphData = panel?.morph?.compatible ? panel.morph.geometryData : null;
  const host = getHostField();
  const axisValue = (point, axis) => point[axis.axis];
  const targetPoints = block.targetPoints?.length >= 3 ? block.targetPoints : null;
  const targetNormal = targetPoints ? getFaceNormalFromPoints(targetPoints) : null;
  const targetNormals = block.targetNormals?.length === targetPoints?.length ? block.targetNormals : null;
  const seamExpansion = getTargetCellSeamExpansion(targetPoints, state.customPanelSeamAllowance || 0);
  const thicknessSettings = getCustomPanelThicknessSettings(data, targetPoints, thickness);
  const sourcePlan = Math.max(data.axes.u.range || 0, data.axes.v.range || 0, 0.001);
  const sourceIsFlatPanel = data.axes.n.range <= Math.max(1e-6, sourcePlan * 0.0001);
  const morphStrength = clamp(state.panelMorphStrength || 0, 0, 1);
  const morphWeight = clamp(block.morphWeight ?? getPanelMorphWeight(sourceUv, block.id || "custom-panel-morph"), 0, 1);
  const fieldWeight = clamp(block.fieldWeights?.smoothedWeight ?? block.fieldWeights?.sourceWeight ?? 0, 0, 1);
  const response = state.panelAttractorResponse || { mode: "apertureMorph", amount: 1 };
  const responseAmount = clamp(Number(response.amount) || 0, 0, 1);
  const responseWeight = state.fieldWeights.driveDensity ? fieldWeight : 0;
  const responseThickness = response.mode === "thickness"
    ? thicknessSettings.thickness * (1 + responseWeight * responseAmount)
    : thicknessSettings.thickness;
  const responseOffset = response.mode === "offset"
    ? thicknessSettings.thickness * responseWeight * responseAmount
    : 0;
  const targetPointAt = targetPoints ? (u, v) => interpolateTargetCellPoint(targetPoints, u, v, null, false) : null;
  const targetNormalAt = targetNormals ? (u, v) => interpolateTargetCellNormal(targetNormals, u, v, targetNormal) : null;
  const out = [];
  const surfacePoints = [];
  for (let i = 0; i < data.positions.length; i++) {
    const point = data.positions[i];
    const u = getNormalizedAxisValue(point, data.axes.u);
    const v = getNormalizedAxisValue(point, data.axes.v);
    const interiorShape = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
    const cellMorphBlend = response.mode === "apertureMorph"
      ? (morphData ? responseWeight * responseAmount : 0)
      : morphStrength * morphWeight;
    const shapeKeyBlend = morphData ? cellMorphBlend : cellMorphBlend * Math.max(0, interiorShape);
    const morphPoint = morphData?.positions?.[i];
    const morphU = morphPoint ? getNormalizedAxisValue(morphPoint, morphData.axes.u) : u;
    const morphV = morphPoint ? getNormalizedAxisValue(morphPoint, morphData.axes.v) : v;
    const h = data.axes.n.range > 1e-9 ? (axisValue(point, data.axes.n) - data.axes.n.min) / data.axes.n.range : 1;
    const morphH = morphPoint && morphData.axes.n.range > 1e-9
      ? (axisValue(morphPoint, morphData.axes.n) - morphData.axes.n.min) / morphData.axes.n.range
      : h;
    const [baseMappedU, baseMappedV] = applyPanelTransformToUv(u, v, panelTransform);
    const [morphMappedU, morphMappedV] = applyPanelTransformToUv(morphU, morphV, panelTransform);
    const mappedU = THREE.MathUtils.lerp(baseMappedU, morphMappedU, shapeKeyBlend);
    const mappedV = THREE.MathUtils.lerp(baseMappedV, morphMappedV, shapeKeyBlend);
    const sourceThickness = Math.max(data.axes.n.range, 1e-9);
    const morphDepthDelta = morphPoint
      ? clamp((axisValue(morphPoint, morphData.axes.n) - axisValue(point, data.axes.n)) / sourceThickness, -0.28, 0.28)
      : 0;
    const blendedH = THREE.MathUtils.lerp(h, morphH, shapeKeyBlend);
    const mappedH = panelTransform.flipNormal ? 1 - blendedH : blendedH;
    const scaledU = mappedU;
    const scaledV = mappedV;
    const targetU = expandPanelCoordinateForSeam(scaledU, seamExpansion.u);
    const targetV = expandPanelCoordinateForSeam(scaledV, seamExpansion.v);
    const morphNormalOffset = morphData ? morphDepthDelta * shapeKeyBlend * responseThickness : 0;
    const syntheticOffset = morphData ? 0 : shapeKeyBlend * responseThickness * 2.2 * (0.35 + 0.65 * clamp(h, 0, 1));
    const variantScaleZ = clamp(Number(panelTransform.scaleZ) || 1, 0.05, 8);
    const variantOffset = Number(panelTransform.surfaceOffset) || 0;
    const normalSign = panelTransform.flipNormal ? -1 : 1;
    const normalOffset = (
      thicknessSettings.offset +
      (mappedH + thicknessSettings.align) * responseThickness * variantScaleZ +
      morphNormalOffset +
      syntheticOffset +
      variantOffset + responseOffset
    ) * normalSign;
    const [su, sv] = interpolateComponentCellUv(sourceUv, mappedU, mappedV);
    let base;
    let normal;
    if (targetPointAt && targetNormal) {
      base = targetPointAt(targetU, targetV);
      normal = targetNormalAt ? targetNormalAt(clamp(targetU, 0, 1), clamp(targetV, 0, 1)) : targetNormal;
    } else if (useImportedSurface) {
      const anchor = block.anchorUv || polygonCentroidUv(sourceUv);
      const sample = getImportedSurfaceSampleNear(clamp(su, 0, 1), clamp(sv, 0, 1), clamp(anchor[0], 0, 1), clamp(anchor[1], 0, 1));
      if (!sample) return null;
      base = sample.point;
      normal = sample.normal;
    } else {
      const cu = state.vaultType === "Dome" ? wrap01(su) : clamp(su, 0, 1);
      const cv = clamp(sv, 0, 1);
      base = host.pointAt(cu, cv);
      normal = host.normalAt(cu, cv).clone();
      if (normal.y < 0) normal.multiplyScalar(-1);
    }
    surfacePoints.push(base);
    out.push(base.clone().addScaledVector(normal, normalOffset));
  }
  const pos = new Float32Array(out.length * 3);
  out.forEach((p, i) => {
    pos[i * 3] = p.x;
    pos[i * 3 + 1] = p.y;
    pos[i * 3 + 2] = p.z;
  });
  const geometry = new THREE.BufferGeometry();
  if (sourceIsFlatPanel) {
    const solidPositions = new Float32Array(out.length * 6);
    out.forEach((p, i) => {
      solidPositions[i * 3] = p.x;
      solidPositions[i * 3 + 1] = p.y;
      solidPositions[i * 3 + 2] = p.z;
    });
    surfacePoints.forEach((p, i) => {
      const offset = (out.length + i) * 3;
      solidPositions[offset] = p.x;
      solidPositions[offset + 1] = p.y;
      solidPositions[offset + 2] = p.z;
    });
    const solidIndices = [...data.indices];
    for (let i = 0; i < data.indices.length; i += 3) {
      solidIndices.push(
        out.length + data.indices[i + 2],
        out.length + data.indices[i + 1],
        out.length + data.indices[i]
      );
    }
    getPanelBoundaryEdges(data.indices).forEach(({ a, b }) => {
      solidIndices.push(a, b, out.length + b, a, out.length + b, out.length + a);
    });
    geometry.setAttribute("position", new THREE.BufferAttribute(solidPositions, 3));
    geometry.setIndex(solidIndices);
  } else {
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setIndex(data.indices);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return {
    geometry,
    q: targetPoints ? targetPoints.map((point) => point.clone()) : sourceUv.map(([u, v]) => {
      if (useImportedSurface) {
        const anchor = block.anchorUv || polygonCentroidUv(sourceUv);
        const sample = getImportedSurfaceSampleNear(clamp(u, 0, 1), clamp(v, 0, 1), clamp(anchor[0], 0, 1), clamp(anchor[1], 0, 1));
        return sample?.point?.clone() || new THREE.Vector3();
      }
      return host.pointAt(state.vaultType === "Dome" ? wrap01(u) : clamp(u, 0, 1), clamp(v, 0, 1));
    }),
    sourcePointCount: out.length,
    sourceTriangleCount: Math.floor(data.indices.length / 3),
  };
};

const extractPanelComponentFromFile = async (file) => {
  const obj = await loadObjectFromFile(file);
  if (!obj || !objectHasRenderableMesh(obj)) return false;
  obj.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(obj);
  if (bbox.isEmpty()) {
    disposeObject(obj);
    return null;
  }
  const size = bbox.getSize(new THREE.Vector3());
  const stats = getImportedModelStats(obj);
  const geometryData = extractCustomPanelGeometryData(obj, bbox);
  if (!geometryData?.positions?.length || !geometryData?.indices?.length) {
    disposeObject(obj);
    return null;
  }
  return { obj, size, stats, geometryData };
};

const loadCustomPanelComponent = async (file) => {
  const extracted = await extractPanelComponentFromFile(file);
  if (!extracted) return false;
  const { obj, size, stats, geometryData } = extracted;
  if (state.customPanelObject) disposeObject(state.customPanelObject);
  if (state.customPanelMorphObject) disposeObject(state.customPanelMorphObject);
  state.customPanelMorphObject = null;
  if (nodes.importCustomPanelMorph) nodes.importCustomPanelMorph.value = "";
  state.customPanelObject = obj;
  state.customPanelVariantTransforms = {};
  ensurePanelVariantTransforms();
  state.activePanelVariantRole = "base";
  state.panelVariantAssignmentMode = "auto";
  state.customPanel = {
    name: file.name,
    meshCount: stats.meshCount,
    vertexCount: stats.vertexCount,
    triangleCount: stats.triangleCount,
    size: { x: size.x, y: size.y, z: size.z },
    geometryData,
    mappingMode: state.strategy.scale,
    loadedAt: new Date().toISOString(),
  };
  state.strategy.component = "custom";
  state.strategy.componentMode = "family";
  setInputValue(nodes.strategyComponent, "custom", { force: true });
  setInputValue(nodes.strategyComponentMode, "family", { force: true });
  renderCustomPanelStatus();
  return true;
};

const loadCustomPanelMorphComponent = async (file) => {
  if (!state.customPanel?.geometryData) return false;
  const extracted = await extractPanelComponentFromFile(file);
  if (!extracted) return false;
  const { obj, size, stats, geometryData } = extracted;
  if (state.customPanelMorphObject) disposeObject(state.customPanelMorphObject);
  state.customPanelMorphObject = obj;
  const compatibility = getCustomPanelMorphCompatibility(state.customPanel.geometryData, geometryData);
  const compatible = compatibility.compatible;
  state.customPanel.morph = {
    name: file.name,
    meshCount: stats.meshCount,
    vertexCount: stats.vertexCount,
    triangleCount: stats.triangleCount,
    size: { x: size.x, y: size.y, z: size.z },
    compatible,
    compatibilityReason: compatibility.reason,
    geometryData,
    loadedAt: new Date().toISOString(),
  };
  renderCustomPanelStatus();
  return true;
};

const resetCustomTiles = () => {
  if (state.customPanelObject) disposeObject(state.customPanelObject);
  if (state.customPanelMorphObject) disposeObject(state.customPanelMorphObject);
  state.customPanel = null;
  state.customPanelObject = null;
  state.customPanelMorphObject = null;
  state.customPanelVariantTransforms = {};
  state.activePanelVariantRole = "base";
  state.panelVariantAssignmentMode = "auto";
  state.imported2DPolys = null;
  state.importedTopologyPolys = null;
  state.importedTissueCells = null;
  state.importedTopologyMeshName = "";
  state.importedTopologyMeshStats = null;
  state.dualPreviewLoops = [];
  state.blocks = [];
  state.selectedBlockId = null;
  state.patternAppliedToModel = false;
  state.customPatternSource = state.importedSurface ? "Freeform Courses" : "UV Form Grid";
  state.surfacePrinciple = vaultSurfacePrincipleDefault["Custom Imported Rhino Surface"] || state.surfacePrinciple;
  syncCustomPatternSourceInputs();
  ["importCustomPanel", "importCustomPanelMorph", "importTopologyMesh", "import2d"].forEach((id) => {
    const el = byId(id);
    if (el) el.value = "";
  });
  renderCustomPanelStatus();
  setStrategyViewMode("uv-layout");
  setPipelineStatus("Custom tiles reset. Load a new panel or topology mesh to test another tile.");
  rebuild();
};

const on2dImport = async (file) => {
  const lower = file.name.toLowerCase();
  const text = await file.text();
  let polys = [];
  if (lower.endsWith(".svg")) polys = parseSvgPolys(text);
  if (lower.endsWith(".dxf")) polys = parseDxfPolys(text);
  if (polys.length) state.imported2DPolys = normalizePolysToUv(polys);
  return polys.length > 0;
};

const assetLibraryDbName = "lithic-lab-user-library";
const assetLibraryStore = "assets";
const assetKindLabels = {
  "2d-layout": "2D tile layout",
  "topology-mesh": "Topology tile mesh",
  "custom-panel": "Custom tile panel",
  "morph-panel": "Morph tile panel",
  "edited-panel": "Edited panel variant",
  "tile-system": "Designed block system",
  "host-3d": "3D host",
};

const getFileExtension = (name = "") => {
  const ext = String(name).split(".").pop();
  return ext && ext !== name ? ext.toUpperCase() : "FILE";
};

const formatAssetDate = (dateValue) => {
  if (!dateValue) return "n/a";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "n/a";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const formatAssetCount = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "n/a";

const getActivePanelName = () => {
  if (state.appliedTileSystem?.name) return state.appliedTileSystem.name;
  if (state.customPanel?.name) return state.customPanel.name;
  if (state.importedTopologyMeshName) return state.importedTopologyMeshName.replace(/\s+Panel carrier faces$/i, "");
  if (state.libraryCandidates.tile?.file?.name) return state.libraryCandidates.tile.file.name;
  if (state.imported2DPolys?.length) return "Imported 2D layout";
  return "Default blocks";
};

const renderActiveAssetStrip = () => {
  if (nodes.activeHostName) nodes.activeHostName.textContent = state.importedModelName || "Generated vault";
  if (nodes.activePanelName) nodes.activePanelName.textContent = getActivePanelName();
  if (nodes.activeMappingName) {
    const strategy = getActiveStrategy();
    nodes.activeMappingName.textContent = `${labelStrategyValue(strategy.rotation)} / ${labelStrategyValue(strategy.scale)}`;
  }
  if (nodes.activeMorphName) {
    const morph = state.customPanel?.morph;
    const strength = Number(state.panelMorphStrength || 0);
    nodes.activeMorphName.textContent = morph
      ? `${morph.name}${morph.compatible === false ? " (fallback)" : ""}`
      : strength > 0.001 ? `Blend ${Math.round(strength * 100)}%` : "None";
  }
  renderAssetLibraryPreview?.("host");
  renderAssetLibraryPreview?.("panel");
};

const getCurrentAssetMetadata = (kind, file) => {
  const ext = getFileExtension(file?.name);
  if (kind === "host-3d") {
    return {
      ext,
      meshCount: state.importedModelStats?.meshCount,
      triangleCount: state.importedModelStats?.triangleCount,
      vertexCount: state.importedModelStats?.vertexCount,
      previewLabel: "3D",
    };
  }
  if (kind === "custom-panel") {
    return {
      ext,
      meshCount: state.customPanel?.meshCount,
      triangleCount: state.customPanel?.triangleCount,
      vertexCount: state.customPanel?.vertexCount,
      previewLabel: "PNL",
    };
  }
  if (kind === "morph-panel") {
    return {
      ext,
      meshCount: state.customPanel?.morph?.meshCount,
      triangleCount: state.customPanel?.morph?.triangleCount,
      vertexCount: state.customPanel?.morph?.vertexCount,
      previewLabel: "MRP",
    };
  }
  if (kind === "edited-panel") {
    return {
      ext: "PANEL",
      meshCount: state.customPanel?.meshCount,
      triangleCount: state.customPanel?.triangleCount,
      vertexCount: state.customPanel?.vertexCount,
      previewLabel: "VAR",
    };
  }
  if (kind === "topology-mesh") {
    return {
      ext,
      faceCount: state.importedTopologyMeshStats?.faceCount,
      vertexCount: state.importedTopologyMeshStats?.vertexCount,
      previewLabel: "TOP",
    };
  }
  return {
    ext,
    faceCount: state.imported2DPolys?.length,
    previewLabel: "2D",
  };
};

const serializeVector3 = (point) => [point.x, point.y, point.z];
const deserializeVector3 = (point) => new THREE.Vector3(point?.[0] || 0, point?.[1] || 0, point?.[2] || 0);

const serializePanelGeometryData = (data) => data ? ({
  positions: (data.positions || []).map(serializeVector3),
  indices: [...(data.indices || [])],
  axes: data.axes ? {
    u: { ...data.axes.u },
    v: { ...data.axes.v },
    n: { ...data.axes.n },
  } : null,
}) : null;

const deserializePanelGeometryData = (data) => data ? ({
  positions: (data.positions || []).map(deserializeVector3),
  indices: [...(data.indices || [])],
  axes: data.axes ? {
    u: { ...data.axes.u },
    v: { ...data.axes.v },
    n: { ...data.axes.n },
  } : null,
}) : null;

const makePanelVariantName = (mode = "edited") => {
  const base = (state.customPanel?.name || "custom-panel")
    .replace(/\.[^.]+$/, "")
    .replace(/\s+\((edited|variant \d+)\)$/i, "");
  if (mode === "duplicate") {
    const variantCount = state.assetLibraryEntries.filter((entry) => entry.kind === "edited-panel" && entry.name.startsWith(`${base} Variant`)).length + 1;
    return `${base} Variant ${variantCount}.panel.json`;
  }
  return `${base} Edited.panel.json`;
};

const buildCurrentPanelVariantPayload = (name) => {
  const panel = state.customPanel;
  if (!panel?.geometryData) return null;
  return {
    version: 1,
    type: "lithic-lab-edited-panel",
    name,
    savedAt: new Date().toISOString(),
    panel: {
      name,
      meshCount: panel.meshCount || 1,
      vertexCount: panel.vertexCount || panel.geometryData.positions?.length || 0,
      triangleCount: panel.triangleCount || Math.floor((panel.geometryData.indices?.length || 0) / 3),
      size: panel.size || null,
      geometryData: serializePanelGeometryData(panel.geometryData),
      mappingMode: state.strategy.scale,
      loadedAt: new Date().toISOString(),
      sourceName: panel.name,
      variantSettings: {
        seamAllowance: state.customPanelSeamAllowance,
        thicknessScale: state.customPanelThicknessScale,
        thicknessOffset: state.customPanelThicknessOffset,
        panelSubdivisionU: state.panelSubdivisionU,
        panelSubdivisionV: state.panelSubdivisionV,
        panelMorphStrength: state.panelMorphStrength,
        panelWeightSubdivision: state.panelWeightSubdivision,
        activePanelVariantRole: state.activePanelVariantRole,
        panelVariantAssignmentMode: state.panelVariantAssignmentMode,
        customPanelVariantTransforms: ensurePanelVariantTransforms(),
        strategy: { ...state.strategy },
      },
      morph: panel.morph ? {
        name: panel.morph.name,
        meshCount: panel.morph.meshCount,
        vertexCount: panel.morph.vertexCount,
        triangleCount: panel.morph.triangleCount,
        size: panel.morph.size || null,
        compatible: !!panel.morph.compatible,
        geometryData: serializePanelGeometryData(panel.morph.geometryData),
        loadedAt: panel.morph.loadedAt,
      } : null,
    },
  };
};

const applyPanelVariantPayload = (payload) => {
  const panel = payload?.panel;
  if (!panel?.geometryData) return false;
  if (state.customPanelObject) disposeObject(state.customPanelObject);
  if (state.customPanelMorphObject) disposeObject(state.customPanelMorphObject);
  state.customPanelObject = null;
  state.customPanelMorphObject = null;
  state.customPanel = {
    name: panel.name || payload.name || "Edited panel variant",
    meshCount: panel.meshCount || 1,
    vertexCount: panel.vertexCount || panel.geometryData.positions?.length || 0,
    triangleCount: panel.triangleCount || Math.floor((panel.geometryData.indices?.length || 0) / 3),
    size: panel.size || null,
    geometryData: deserializePanelGeometryData(panel.geometryData),
    mappingMode: panel.mappingMode || state.strategy.scale,
    loadedAt: new Date().toISOString(),
    sourceName: panel.sourceName || panel.name,
    variantSettings: panel.variantSettings || null,
  };
  if (panel.morph?.geometryData) {
    state.customPanel.morph = {
      ...panel.morph,
      geometryData: deserializePanelGeometryData(panel.morph.geometryData),
    };
  }
  const settings = panel.variantSettings || {};
  state.customPanelSeamAllowance = Number(settings.seamAllowance ?? state.customPanelSeamAllowance) || 0;
  state.customPanelThicknessScale = Number(settings.thicknessScale ?? state.customPanelThicknessScale) || 1;
  state.customPanelThicknessOffset = Number(settings.thicknessOffset ?? state.customPanelThicknessOffset) || 0;
  state.panelSubdivisionU = clamp(Math.round(settings.panelSubdivisionU ?? state.panelSubdivisionU), 1, 8);
  state.panelSubdivisionV = clamp(Math.round(settings.panelSubdivisionV ?? state.panelSubdivisionV), 1, 8);
  state.panelMorphStrength = clamp(Number(settings.panelMorphStrength ?? state.panelMorphStrength) || 0, 0, 1);
  state.panelWeightSubdivision = !!(settings.panelWeightSubdivision ?? state.panelWeightSubdivision);
  state.activePanelVariantRole = settings.activePanelVariantRole || state.activePanelVariantRole || "base";
  state.panelVariantAssignmentMode = settings.panelVariantAssignmentMode || state.panelVariantAssignmentMode || "auto";
  state.customPanelVariantTransforms = settings.customPanelVariantTransforms || state.customPanelVariantTransforms || {};
  ensurePanelVariantTransforms();
  if (settings.strategy) state.strategy = { ...state.strategy, ...settings.strategy };
  state.strategy.component = "custom";
  state.strategy.componentMode = state.strategy.componentMode || "family";
  setInputValue(nodes.strategyComponent, "custom", { force: true });
  setInputValue(nodes.strategyComponentMode, state.strategy.componentMode, { force: true });
  renderCustomPanelStatus();
  return true;
};

const openAssetLibraryDb = () => new Promise((resolve, reject) => {
  if (!("indexedDB" in window)) {
    reject(new Error("IndexedDB is not available in this browser."));
    return;
  }
  const request = indexedDB.open(assetLibraryDbName, 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(assetLibraryStore)) {
      const store = db.createObjectStore(assetLibraryStore, { keyPath: "id" });
      store.createIndex("kind", "kind", { unique: false });
      store.createIndex("addedAt", "addedAt", { unique: false });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error("Could not open the asset library."));
});

const runAssetLibraryStore = async (mode, action) => {
  const db = await openAssetLibraryDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(assetLibraryStore, mode);
      const store = tx.objectStore(assetLibraryStore);
      const request = action(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
};

const assetLibraryViews = {
  host: {
    select: () => nodes.hostLibrarySelect,
    status: () => nodes.hostLibraryStatus,
    preview: () => nodes.hostLibraryPreview,
    kinds: ["host-3d"],
    emptyLabel: "No saved hosts",
  },
  panel: {
    select: () => nodes.panelLibrarySelect,
    status: () => nodes.panelLibraryStatus,
    preview: () => nodes.panelLibraryPreview,
    kinds: ["2d-layout", "topology-mesh", "custom-panel", "morph-panel", "edited-panel"],
    emptyLabel: "No saved panels",
  },
  tile: {
    select: () => nodes.tileLibrarySelect,
    status: () => nodes.tileLibraryStatus,
    preview: () => nodes.tileLibraryPreview,
    kinds: ["tile-system"],
    emptyLabel: "No designed blocks",
  },
};

const getAssetLibraryViewForKind = (kind) => {
  if (kind === "host-3d") return "host";
  if (kind === "tile-system") return "tile";
  return "panel";
};

const libraryViewLabel = (viewKey) => {
  if (viewKey === "host") return "host";
  if (viewKey === "tile") return "designed block";
  return "panel";
};

const setAssetLibraryStatus = (viewKey, message) => {
  const status = assetLibraryViews[viewKey]?.status?.();
  if (status) status.textContent = message;
};

const populateAssetLibrarySelect = (viewKey) => {
  const view = assetLibraryViews[viewKey];
  const select = view?.select?.();
  if (!view || !select) return;
  const previousValue = select.value;
  const entries = state.assetLibraryEntries.filter((entry) => view.kinds.includes(entry.kind));
  select.innerHTML = "";
  if (!entries.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = view.emptyLabel;
    select.append(option);
    renderAssetLibraryPreview(viewKey);
    return;
  }
  entries.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = `${assetKindLabels[entry.kind] || "Asset"} - ${entry.name}`;
    select.append(option);
  });
  if (entries.some((entry) => entry.id === previousValue)) {
    select.value = previousValue;
  }
  renderAssetLibraryPreview(viewKey);
};

const getSelectedAssetEntry = (viewKey) => {
  const id = assetLibraryViews[viewKey]?.select?.()?.value;
  if (!id) return null;
  return state.assetLibraryEntries.find((entry) => entry.id === id) || null;
};

const isAssetEntryActive = (entry) => {
  if (!entry) return false;
  if (entry.id === state.activeLibraryAssetIds?.[getAssetLibraryViewForKind(entry.kind)]) return true;
  if (entry.kind === "host-3d") return !!state.importedModelName && state.importedModelName === entry.name;
  if (entry.kind === "tile-system") return entry.id === state.blockDesigner.activeTileId;
  if (entry.kind === "custom-panel") return state.customPanel?.name === entry.name;
  if (entry.kind === "morph-panel") return state.customPanel?.morph?.name === entry.name;
  if (entry.kind === "edited-panel") return state.customPanel?.name === entry.name;
  if (entry.kind === "topology-mesh") return !!state.importedTopologyMeshName && state.importedTopologyMeshName.includes(entry.name);
  return state.libraryCandidates.tile?.file?.name === entry.name;
};

const renderAssetLibraryPreview = (viewKey) => {
  const preview = assetLibraryViews[viewKey]?.preview?.();
  if (!preview) return;
  const entry = getSelectedAssetEntry(viewKey);
  const thumb = preview.querySelector(".asset-thumb");
  const title = preview.querySelector(".asset-preview-main b");
  const description = preview.querySelector(".asset-preview-main > span");
  const meta = preview.querySelector(".asset-meta");
  const active = preview.querySelector("em");
  if (!entry) {
    if (thumb) thumb.textContent = viewKey === "host" ? "3D" : viewKey === "tile" ? "TIL" : "PNL";
    if (title) title.textContent = viewKey === "host"
      ? "No saved host selected"
      : viewKey === "tile"
        ? "No designed block selected"
        : "No saved panel selected";
    if (description) description.textContent = viewKey === "host"
      ? "Save or select a host surface to see file details."
      : viewKey === "tile"
        ? "Save a custom block from Block Designer to store it here."
        : "Save or select a panel asset to see file details.";
    if (meta) meta.innerHTML = viewKey === "host"
      ? "<span>Type: n/a</span><span>Triangles: n/a</span><span>Last used: n/a</span>"
      : viewKey === "tile"
        ? "<span>Type: n/a</span><span>Joint: n/a</span><span>Last used: n/a</span>"
        : "<span>Type: n/a</span><span>Faces: n/a</span><span>Last used: n/a</span>";
    if (active) {
      active.textContent = "Inactive";
      active.classList.remove("active");
    }
    return;
  }
  const metadata = entry.metadata || {};
  const ext = metadata.ext || getFileExtension(entry.name);
  const primaryCount = entry.kind === "tile-system"
    ? `Joint: ${metadata.jointType || "n/a"}`
    : entry.kind === "host-3d" || entry.kind === "custom-panel" || entry.kind === "morph-panel" || entry.kind === "edited-panel"
      ? `Triangles: ${formatAssetCount(metadata.triangleCount)}`
      : `Faces: ${formatAssetCount(metadata.faceCount)}`;
  if (thumb) thumb.textContent = metadata.previewLabel || (viewKey === "host" ? "3D" : viewKey === "tile" ? "TIL" : ext.slice(0, 3));
  if (title) title.textContent = entry.name;
  if (description) description.textContent = assetKindLabels[entry.kind] || "Saved asset";
  if (meta) {
    meta.innerHTML = [
      `<span>Type: ${entry.kind === "tile-system" ? "JSON" : ext}</span>`,
      `<span>${primaryCount}</span>`,
      `<span>Last used: ${formatAssetDate(entry.lastUsedAt || entry.addedAt)}</span>`,
    ].join("");
  }
  if (active) {
    const isActive = isAssetEntryActive(entry);
    active.textContent = isActive ? "Active" : "Inactive";
    active.classList.toggle("active", isActive);
  }
};

const renderAssetLibrary = async () => {
  if (!nodes.hostLibrarySelect && !nodes.panelLibrarySelect && !nodes.tileLibrarySelect && !byId("bdTileList")) return;
  try {
    const entries = await runAssetLibraryStore("readonly", (store) => store.getAll());
    state.assetLibraryEntries = entries
      .map(({ blob, ...entry }) => entry)
      .sort((a, b) => String(b.addedAt).localeCompare(String(a.addedAt)));
    populateAssetLibrarySelect("host");
    populateAssetLibrarySelect("panel");
    populateAssetLibrarySelect("tile");
    renderBlockDesignerLibrary();
    renderActiveAssetStrip();
  } catch (err) {
    console.error("renderAssetLibrary failed", err);
    setAssetLibraryStatus("host", "The host library could not be opened in this browser.");
    setAssetLibraryStatus("panel", "The panel library could not be opened in this browser.");
    setAssetLibraryStatus("tile", "The designed block library could not be opened in this browser.");
  }
};

const getBlockDesignerData = () => state.blockDesigner;
const bdPath = (w, h, d) => {
  const b = getBlockDesignerData(); const waves = Math.max(1, b.frequency); const amp = Math.min(h * .3, b.amplitude / Math.max(1, b.height) * h); const phase = b.phase / 100 * Math.PI * 2;
  let p = `M ${w / 2} 0`; for (let i = 0; i <= 48; i++) { const y = h * i / 48; const x = w / 2 + Math.sin((i / 48) * Math.PI * 2 * waves + phase) * amp * (0.35 + b.morph / 150); p += ` L ${x.toFixed(1)} ${y.toFixed(1)}`; } return p;
};
const renderBlockDesignerLegacy = () => {
  const b = getBlockDesignerData(); const pair = byId("bdPairCanvas"), swatch = byId("bdSwatchCanvas"); if (!pair || !swatch) return;
  const W = 800, H = 360, gap = b.view === "exploded" ? 70 : b.clearance * .8; const x = 400; const p = bdPath(W, H - 50, b.depth); const left = `M 80 25 H ${x} ${p.replace(/^M/, "L")} L ${x} ${H - 25} H 80 Z`; const rightPath = p.replace(/^M [^ ]+ 0/, `M ${x + gap} 0`).replace(/ L ([^ ]+) /g, (_, v) => ` L ${(Number(v) + gap).toFixed(1)} `); const right = `${rightPath} L ${W - 80} ${H - 25} H ${x + gap} Z`;
  const profile = b.view === "profile"; const contact = b.view === "contact"; const tol = b.view === "tolerance";
  pair.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="bdA" x1="0" x2="1"><stop stop-color="#d9c5a7"/><stop offset="1" stop-color="#9f8568"/></linearGradient><linearGradient id="bdB" x1="0" x2="1"><stop stop-color="#a9bdd0"/><stop offset="1" stop-color="#6f8499"/></linearGradient></defs><path d="${left}" fill="${profile ? "none" : "url(#bdA)"}" stroke="#f8ead7" stroke-width="2"/><path d="${right}" fill="${profile ? "none" : "url(#bdB)"}" stroke="#d9ecff" stroke-width="2"/>${contact ? `<path d="${p}" fill="none" stroke="#79e4a7" stroke-width="8" opacity=".75"/>` : ""}${tol ? `<path d="${p}" fill="none" stroke="#ffd26e" stroke-width="${Math.max(2, b.clearance * 2)}" stroke-dasharray="4 5"/>` : ""}<text x="80" y="18" fill="#9eb4ce" font-size="14">BLOCK A</text><text x="${W - 150}" y="18" fill="#9eb4ce" font-size="14">BLOCK B</text><text x="400" y="${H - 5}" text-anchor="middle" fill="#79b8ff" font-size="13">${b.jointType} · ${b.frequency} waves · ${b.clearance} mm clearance</text></svg>`;
  const n = b.swatch, cols = Math.min(n, 10), rows = Math.min(n, 10), cells = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const cw = 100 / cols, ch = 100 / rows, offset = b.tileMode === "Running Bond" && r % 2 ? cw / 2 : 0; const hue = (r + c) % 2 ? "#7891a8" : "#b99c7c"; cells.push(`<path d="M ${c * cw + offset} ${r * ch} h ${cw} v ${ch} h -${cw}z" fill="${hue}" stroke="#dce8f4" stroke-opacity=".45"/><path d="M ${c * cw + offset + cw / 2} ${r * ch} q ${cw / 8} ${ch / 4} 0 ${ch / 2} q -${cw / 8} ${ch / 4} 0 ${ch / 2}" fill="none" stroke="#172435" stroke-width=".7"/>`); } swatch.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${cells.join("")}</svg>`;
  byId("bdSwatchLabel").textContent = `${b.swatch} × ${b.swatch} • ${b.tileMode}`;
  renderBlockDesignerAnalysis(); renderBlockDesignerLibrary();
};
const getBdJointOffset = (t, data = getBlockDesignerData()) => {
  const b = data || getBlockDesignerData();
  const a = (b.amplitude || 0) / 100;
  if (b.jointType === "Flat Joint") return 0;
  if (b.jointType === "Zig Zag Joint") return (Math.abs(((t * b.frequency) % 1) - .5) * 4 - 1) * a;
  if (b.jointType === "Topological Interlocking") return (Math.sin(t * Math.PI * b.frequency) >= 0 ? 1 : -1) * a * .82;
  if (b.jointType === "Geological Joint") return (Math.sin(t * 18.7 + 1.1) * .6 + Math.sin(t * 43.1) * .28) * a;
  if (b.jointType === "Field Driven Joint") return (Math.sin(t * 23 + b.phase / 6) + Math.sin(t * 57)) * a * .48;
  if (b.jointType === "Custom Drawn Joint") return (t < .33 ? t * 2.8 : t < .66 ? 1 - (t - .33) * 4.6 : (t - .66) * 2.8 - .5) * a;
  return Math.sin(t * Math.PI * 2 * b.frequency + b.phase / 100 * Math.PI * 2) * a;
};
const renderBlockDesignerModel = () => {
  if (!bdModelRenderer) return; clearGroup(bdModelGroup);
  const b = getBlockDesignerData(), L = b.length / 100, H = b.height / 100, T = Math.max(.08, b.thickness / 100), gap = b.view === "exploded" ? .48 : b.clearance / 1000;
  // Bed joints run along the course (X), not vertically as head joints.
  const joint = Array.from({ length: 49 }, (_, i) => new THREE.Vector2(-L / 2 + L * i / 48, getBdJointOffset(i / 48)));
  const outer = b.baseGeometry === "Hexagonal" ? H * .18 : b.baseGeometry === "Polyhedral" ? H * .11 : ["Custom Mesh", "TPMS Block", "Wedge"].includes(b.baseGeometry) ? H * .15 : 0;
  const left = new THREE.Shape(); left.moveTo(-L / 2 + outer, -H / 2); left.lineTo(L / 2 - outer, -H / 2); joint.slice().reverse().forEach(p => left.lineTo(p.x, p.y - gap * .5)); left.closePath();
  const right = new THREE.Shape(); right.moveTo(joint[0].x, joint[0].y + gap * .5); right.lineTo(-L / 2 + outer, H / 2); right.lineTo(L / 2 - outer, H / 2); right.lineTo(joint[joint.length - 1].x, joint[joint.length - 1].y + gap * .5); joint.slice(0, -1).reverse().forEach(p => right.lineTo(p.x, p.y + gap * .5)); right.closePath();
  const make = (shape, color) => { const geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: b.fillet > 0, bevelSegments: 3, bevelSize: Math.min(.018, b.fillet / 1200), bevelThickness: Math.min(.012, b.fillet / 1600) }); geo.translate(0, 0, -T / 2); if (b.baseGeometry === "TPMS Block") geo.scale(1, 1, .74); const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: .78, metalness: 0, transparent: true, opacity: .62, side: THREE.DoubleSide })); mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 16), new THREE.LineBasicMaterial({ color: 0x617266, transparent: true, opacity: .3 }))); return mesh; };
  const templateA = make(left, 0xaeb9a8), templateB = make(right, 0xc5c9c0);
  if (b.view === "tile3d") {
    const cols = Math.min(5, b.swatch), rows = Math.min(5, b.swatch), pitchX = L + gap, pitchY = H;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const pair = new THREE.Group(), dx = (col - (cols - 1) * .5) * pitchX + (row % 2 && b.tileMode === "Running Bond" ? pitchX * .5 : 0), dy = (row - (rows - 1) * .5) * pitchY;
      const a = templateA.clone(), bb = templateB.clone(); a.position.set(dx, dy, 0); bb.position.set(dx, dy, 0); pair.add(a, bb); bdModelGroup.add(pair);
    }
  } else { bdModelGroup.add(templateA, templateB); }
  if (b.view === "contact" || b.view === "tolerance") bdModelGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(joint.map(p => new THREE.Vector3(p.x, p.y, T * .52))), new THREE.LineBasicMaterial({ color: b.view === "contact" ? 0x5de4a0 : 0xffd36b })));
  const size = new THREE.Box3().setFromObject(bdModelGroup).getSize(new THREE.Vector3()), distance = Math.max(size.x, size.y, size.z) * 1.7; if (!b.userCamera) { bdModelCamera.position.set(distance, distance * .56, distance * .92); bdModelControls?.target.set(0, 0, 0); bdModelControls?.update(); } if (byId("bdModelCaption")) byId("bdModelCaption").textContent = `${b.baseGeometry} · ${b.jointType} · orbit / pan / zoom`;
};
const blockDesignerDraftJoint = (x, y, w, h) => {
  const b = getBlockDesignerData(), cx = x + w * .5, a = Math.min(w * .2, (b.amplitude / 100) * w);
  if (b.jointType === "Flat Joint") return `M ${cx} ${y} V ${y + h}`;
  if (b.jointType === "Zig Zag Joint") return `M ${cx} ${y} L ${cx + a} ${y + h * .25} L ${cx - a} ${y + h * .5} L ${cx + a} ${y + h * .75} L ${cx} ${y + h}`;
  if (b.jointType === "Topological Interlocking") return `M ${cx} ${y} H ${cx + a} V ${y + h * .25} H ${cx - a} V ${y + h * .5} H ${cx + a} V ${y + h * .75} H ${cx} V ${y + h}`;
  if (b.jointType === "Geological Joint" || b.jointType === "Field Driven Joint") return `M ${cx} ${y} q ${a} ${h * .15} -${a * .3} ${h * .31} q -${a * 1.4} ${h * .17} ${a * .45} ${h * .32} q ${a} ${h * .13} -${a * .15} ${h * .37}`;
  const pts = Array.from({ length: 25 }, (_, i) => { const t = i / 24; return [cx + Math.sin(t * Math.PI * 2 * b.frequency + b.phase / 100 * Math.PI * 2) * a, y + t * h]; });
  return `M ${pts.map(([px, py]) => `${px.toFixed(3)} ${py.toFixed(3)}`).join(" L ")}`;
};
const blockDesignerDraftOutline = (x, y, w, h) => {
  const b = getBlockDesignerData(), c = Math.min(w, h) * .12;
  if (b.baseGeometry === "Wedge") return `M ${x + c} ${y} H ${x + w} L ${x + w - c} ${y + h} H ${x} Z`;
  if (b.baseGeometry === "Hexagonal" || b.baseGeometry === "Polyhedral") return `M ${x + c} ${y} H ${x + w - c} L ${x + w} ${y + c} V ${y + h - c} L ${x + w - c} ${y + h} H ${x + c} L ${x} ${y + h - c} V ${y + c} Z`;
  if (b.baseGeometry === "TPMS Block") return `M ${x} ${y + c} Q ${x + w * .25} ${y - c} ${x + w * .5} ${y + c} Q ${x + w * .75} ${y - c} ${x + w} ${y + c} V ${y + h - c} Q ${x + w * .75} ${y + h + c} ${x + w * .5} ${y + h - c} Q ${x + w * .25} ${y + h + c} ${x} ${y + h - c} Z`;
  return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
};
const renderBlockDesignerCourseElevation = (b, swatch) => {
  const W = 1200, H = 480, left = 88, right = 1132, top = 76, bottom = 412;
  const cols = Math.min(Math.max(3, b.swatch), 7), rows = Math.min(Math.max(3, b.swatch), 5);
  const usableW = right - left, usableH = bottom - top, cellW = usableW / cols, rowH = usableH / rows;
  const phase = b.phase / 100 * Math.PI * 2;
  const jointY = (row, x) => top + row * rowH + Math.sin(((x - left) / usableW) * Math.PI * 2 * b.frequency * cols + phase + row * .28) * Math.min(rowH * .105, b.amplitude / 100 * rowH);
  const cells = [], joints = [], heads = [], ticks = [];
  for (let i = 0; i <= 40; i++) { const x = left + usableW * i / 40; ticks.push(`<path d="M ${x.toFixed(1)} ${top - (i % 5 === 0 ? 13 : 7)} V ${top - 2}"/>`); }
  for (let r = 0; r < rows; r++) {
    const offset = b.tileMode === "Running Bond" && r % 2 ? cellW * .5 : 0;
    for (let c = -1; c <= cols; c++) {
      const x1 = left + c * cellW + offset, x2 = x1 + cellW;
      if (x2 <= left || x1 >= right) continue;
      const cx1 = Math.max(left, x1), cx2 = Math.min(right, x2);
      const y1 = r === 0 ? top : jointY(r, (cx1 + cx2) * .5), y2 = r === rows - 1 ? bottom : jointY(r + 1, (cx1 + cx2) * .5);
      cells.push(`<path d="M ${cx1.toFixed(1)} ${y1.toFixed(1)} L ${cx2.toFixed(1)} ${y1.toFixed(1)} L ${cx2.toFixed(1)} ${y2.toFixed(1)} L ${cx1.toFixed(1)} ${y2.toFixed(1)} Z"/>`);
      if (r > 0) heads.push(`<path d="M ${cx1.toFixed(1)} ${jointY(r, cx1).toFixed(1)} L ${cx1.toFixed(1)} ${jointY(r + 1, cx1).toFixed(1)}"/>`);
    }
  }
  for (let r = 1; r < rows; r++) {
    const points = Array.from({ length: 241 }, (_, i) => { const x = left + usableW * i / 240; return `${x.toFixed(1)} ${jointY(r, x).toFixed(1)}`; });
    joints.push(`<path d="M ${points.join(" L ")}"/>`);
  }
  const rowLabels = Array.from({ length: rows }, (_, r) => `<text x="${left - 19}" y="${(top + rowH * (r + .54)).toFixed(1)}">${String(r + 1).padStart(2, "0")}</text>`).join("");
  swatch.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-label="Course elevation drawing"><rect width="${W}" height="${H}" fill="#e8ebe5"/><g class="bd-drawing-grid">${ticks.join("")}</g><path class="bd-drawing-frame" d="M ${left} ${top} H ${right} V ${bottom} H ${left} Z"/><g class="bd-drawing-cells">${cells.join("")}</g><g class="bd-drawing-heads">${heads.join("")}</g><g class="bd-drawing-joints">${joints.join("")}</g><g class="bd-drawing-notations"><text x="${left}" y="31" class="bd-drawing-title">COURSE ELEVATION / ${b.baseGeometry.toUpperCase()}</text><text x="${right}" y="31" text-anchor="end">${b.tileMode.toUpperCase()} · ${b.jointType.toUpperCase()}</text><text x="${left}" y="${H - 23}">MODULE ${b.length} × ${b.height} MM</text><text x="${right}" y="${H - 23}" text-anchor="end">JOINT ${b.frequency.toString().padStart(2, "0")} · CLR ${b.clearance.toFixed(1)} MM</text>${rowLabels}</g></svg>`;
};
const renderBlockDesigner = () => {
  const b = getBlockDesignerData(), swatch = byId("bdSwatchCanvas"); if (!swatch) return; renderBlockDesignerModel(); if (byId("bdJointSectionTitle")) byId("bdJointSectionTitle").textContent = b.jointType; renderBlockDesignerCourseElevation(b, swatch); byId("bdSwatchLabel").textContent = `${b.swatch} × ${b.swatch} · ${b.tileMode} · module ${b.length} mm × ${b.height} mm · joint ${b.frequency} cycles`; renderBlockDesignerAnalysis(); renderBlockDesignerLibrary(); return;
  const n = b.swatch, cols = Math.min(n, 10), rows = Math.min(n, 10), cells = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const cw = 100 / cols, ch = 100 / rows, offset = b.tileMode === "Running Bond" && r % 2 ? cw / 2 : 0, x = c * cw + offset, y = r * ch; cells.push(`<path d="${blockDesignerDraftOutline(x, y, cw, ch)}" fill="rgba(14,27,42,.2)" stroke="rgba(220,233,245,.72)" stroke-width=".14"/><path d="${blockDesignerDraftJoint(x, y, cw, ch)}" fill="none" stroke="rgba(127,214,255,.84)" stroke-width=".19"/>`); } swatch.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" fill="#1d2a38"/>${cells.join("")}<text x="2" y="97" fill="#dce9f5" font-size="2.2">COURSE ELEVATION · ${b.baseGeometry.toUpperCase()} · ${b.jointType.toUpperCase()}</text></svg>`;
  byId("bdSwatchLabel").textContent = `${b.swatch} × ${b.swatch} · ${b.tileMode} · module ${b.length} mm × ${b.height} mm · joint ${b.frequency} cycles`; renderBlockDesignerAnalysis(); renderBlockDesignerLibrary();
};
const renderBlockDesignerAnalysis = () => { const b = getBlockDesignerData(), el = byId("bdAnalysis"); if (!el) return; const vol = b.length * b.width * b.height / 1e6, weight = vol * b.density; const neck = b.width / 2 - b.amplitude; const items = [["Block volume", `${vol.toFixed(3)} m³`, "ok"], ["Block weight", `${weight.toFixed(1)} kg`, weight > 520 ? "warn" : "ok"], ["Contact area", `${(b.height * b.thickness / 100).toFixed(0)} cm²`, "ok"], ["Min neck", `${neck.toFixed(1)} mm`, neck < 8 ? "bad" : neck < 18 ? "warn" : "ok"], ["Undercut", b.depth > b.thickness * .85 ? "Review" : "Clear", b.depth > b.thickness * .85 ? "warn" : "ok"], ["Tolerance", `${b.clearance} mm`, b.clearance < .4 ? "warn" : "ok"]]; el.innerHTML = items.map(([k,v,c]) => `<div class="${c}"><b>${k}</b>${v}</div>`).join(""); };
const blockDesignerInputs = { bdBaseGeometry: "baseGeometry", bdJointPreset: "jointType", bdLength: "length", bdWidth: "width", bdHeight: "height", bdThickness: "thickness", bdDraft: "draft", bdFillet: "fillet", bdClearance: "clearance", bdDensity: "density", bdFrequency: "frequency", bdAmplitude: "amplitude", bdDepth: "depth", bdPhase: "phase", bdMorph: "morph", bdTileMode: "tileMode", bdSwatch: "swatch" };

const syncBlockDesignerInputs = () => {
  const b = state.blockDesigner;
  Object.entries(blockDesignerInputs).forEach(([id, key]) => {
    const el = byId(id);
    if (!el || b[key] == null) return;
    el.value = b[key];
  });
  if (byId("bdJointSectionTitle")) byId("bdJointSectionTitle").textContent = b.jointType;
};

const renderBlockDesignerLibrary = () => {
  const el = byId("bdTileList");
  if (!el) return;
  const tiles = state.assetLibraryEntries.filter((e) => e.kind === "tile-system");
  el.innerHTML = tiles.length
    ? tiles.map((t) => `<div class="bd-tile-card ${t.id === state.blockDesigner.activeTileId ? "active" : ""}" data-tile-id="${t.id}"><b>${t.name}</b><span>${t.metadata?.jointType || "Joint"} · ${t.metadata?.tags?.join(" · ") || "Experimental"}</span></div>`).join("")
    : `<div class="hint">No saved systems yet. Shape a pair, then save it to Panel Library → Designed Blocks.</div>`;
  el.querySelectorAll("[data-tile-id]").forEach((card) => card.addEventListener("click", async () => {
    state.activeLibraryAssetIds.tile = card.dataset.tileId;
    renderBlockDesignerLibrary();
    const select = nodes.tileLibrarySelect;
    if (select) select.value = card.dataset.tileId;
    renderAssetLibraryPreview("tile");
    await loadSelectedLibraryAsset("tile");
  }));
};

const saveBlockDesignerTile = async () => {
  const b = getBlockDesignerData();
  const now = new Date().toISOString();
  const name = `${b.jointType.replace(" Joint", "")} ${b.baseGeometry} ${new Date().toLocaleDateString()}`;
  const payload = {
    name,
    previewImage: "procedural",
    baseGeometry: b.baseGeometry,
    jointType: b.jointType,
    jointParameters: { ...b },
    tileRules: { mode: b.tileMode, swatch: b.swatch },
    fabricationRules: { clearance: b.clearance, fillet: b.fillet, draft: b.draft },
    material: { density: b.density },
    tags: [b.jointType.replace(" Joint", ""), b.baseGeometry, "Experimental"],
    favorite: false,
    createdAt: now,
    updatedAt: now,
  };
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const entry = {
    id: crypto.randomUUID?.() || `${Date.now()}-tile`,
    kind: "tile-system",
    name,
    mimeType: "application/json",
    size: blob.size,
    addedAt: now,
    lastUsedAt: now,
    metadata: {
      jointType: b.jointType,
      baseGeometry: b.baseGeometry,
      tags: payload.tags,
      previewLabel: "TIL",
      ext: "JSON",
    },
    blob,
  };
  try {
    await runAssetLibraryStore("readwrite", (store) => store.put(entry));
    state.blockDesigner.activeTileId = entry.id;
    state.activeLibraryAssetIds.tile = entry.id;
    await renderAssetLibrary();
    const select = nodes.tileLibrarySelect;
    if (select) select.value = entry.id;
    renderAssetLibraryPreview("tile");
    setAssetLibraryStatus("tile", `Saved designed block: ${name}.`);
    setPipelineStatus(`Saved “${name}” to Panel Library → Designed Blocks.`);
    renderActiveAssetStrip();
  } catch (err) {
    console.error("saveBlockDesignerTile failed", err);
    setAssetLibraryStatus("tile", "Could not save that designed block. Browser storage may be full or unavailable.");
    setPipelineStatus("Could not save the designed block to Panel Library.");
  }
};

const applyTileSystemFile = async (file, { remember = false } = {}) => {
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    const params = payload.jointParameters && typeof payload.jointParameters === "object"
      ? payload.jointParameters
      : payload;
    const next = {
      ...state.blockDesigner,
      baseGeometry: params.baseGeometry || payload.baseGeometry || state.blockDesigner.baseGeometry,
      jointType: params.jointType || payload.jointType || state.blockDesigner.jointType,
      length: Number(params.length ?? state.blockDesigner.length),
      width: Number(params.width ?? state.blockDesigner.width),
      height: Number(params.height ?? state.blockDesigner.height),
      thickness: Number(params.thickness ?? state.blockDesigner.thickness),
      draft: Number(params.draft ?? state.blockDesigner.draft),
      fillet: Number(params.fillet ?? state.blockDesigner.fillet),
      clearance: Number(params.clearance ?? state.blockDesigner.clearance),
      density: Number(params.density ?? state.blockDesigner.density),
      frequency: Number(params.frequency ?? state.blockDesigner.frequency),
      amplitude: Number(params.amplitude ?? state.blockDesigner.amplitude),
      depth: Number(params.depth ?? state.blockDesigner.depth),
      phase: Number(params.phase ?? state.blockDesigner.phase),
      morph: Number(params.morph ?? state.blockDesigner.morph),
      tileMode: params.tileMode || payload.tileRules?.mode || state.blockDesigner.tileMode,
      swatch: Number(params.swatch ?? payload.tileRules?.swatch ?? state.blockDesigner.swatch),
      userCamera: false,
    };
    state.blockDesigner = next;
    syncBlockDesignerInputs();
    renderBlockDesigner();
    setPipelineStatus(`Loaded designed block “${payload.name || file.name}” into Block Designer.`);
    return true;
  } catch (err) {
    console.error("applyTileSystemFile failed", err);
    setPipelineStatus(`Could not load designed block from ${file.name}.`);
    return false;
  }
};

const mapBlockDesignerTileModeToVault = (tileMode = "") => {
  const mode = String(tileMode || "");
  if (mode === "Running Bond") return { pattern: "Running bond", barrelBondMode: "2" };
  if (mode === "Stacked Bond") return { pattern: "Courses", barrelBondMode: "1" };
  if (mode.includes("Mirrored")) return { pattern: "Running bond", barrelBondMode: "3" };
  if (mode.includes("Radial") || mode.includes("Circular")) return { pattern: "Radial joints", barrelBondMode: "4" };
  if (mode.includes("Vault") || mode.includes("Curved")) return { pattern: "Courses", barrelBondMode: "5" };
  return { pattern: "Courses", barrelBondMode: state.barrelBondMode || "1" };
};

const mapBlockDesignerJointToComponent = (jointType = "") => {
  if (jointType === "Flat Joint") return "ashlar";
  return "voussoir";
};

const applySelectedBlockDesignerTile = async () => {
  const selectedId = nodes.tileLibrarySelect?.value || state.blockDesigner.activeTileId;
  if (!selectedId || selectedId === state.blockDesigner.activeTileId) return true;
  const entry = state.assetLibraryEntries.find((item) => item.id === selectedId && item.kind === "tile-system");
  if (!entry) return true;
  try {
    const stored = await runAssetLibraryStore("readonly", (store) => store.get(selectedId));
    if (!stored?.blob) return true;
    const file = new File([stored.blob], stored.name, {
      type: stored.mimeType || stored.blob.type || "application/json",
      lastModified: Date.parse(stored.addedAt) || Date.now(),
    });
    const ok = await applyTileSystemFile(file, { remember: false });
    if (ok) {
      state.blockDesigner.activeTileId = selectedId;
      state.activeLibraryAssetIds.tile = selectedId;
    }
    return ok;
  } catch (err) {
    console.error("applySelectedBlockDesignerTile failed", err);
    setPipelineStatus("Could not load the selected designed block before applying it.");
    return false;
  }
};

const applyBlockDesignerToVault = async () => {
  try {
    if (!(await applySelectedBlockDesignerTile())) return false;
    const b = getBlockDesignerData();
    if (!b) {
      setPipelineStatus("Block Designer has no active definition to apply.");
      return false;
    }

    // Leave the Block Designer overlay immediately so the perspective vault is visible.
    state.vaultDesignerPreview = false;
    state.patternAppliedToModel = true;
    state.userDefinedCamera = false;
    state.suspendViewportFit = false;
    if (state.topologyLattice) state.topologyLattice.enabled = false;
    setToolTab("strategy");

    const saved = state.assetLibraryEntries.find((entry) => entry.id === b.activeTileId && entry.kind === "tile-system");
    const name = saved?.name || `${String(b.jointType || "Joint").replace(" Joint", "")} ${b.baseGeometry || "Block"}`;
    const lengthM = clamp(Number(b.length) / 100, 0.1, 5);
    const heightM = clamp(Number(b.height) / 100, 0.1, 5);
    const thicknessM = clamp(Number(b.thickness) / 100, 0.08, 0.6);
    const clearanceM = clamp(Number(b.clearance) / 1000, 0, 0.08);
    const bond = mapBlockDesignerTileModeToVault(b.tileMode);
    const component = mapBlockDesignerJointToComponent(b.jointType);

    state.targetBlockWidth = lengthM;
    state.constraints.courseHeight = heightM;
    state.params.courseHeight = heightM;
    state.params.targetBlockWidth = lengthM;
    // Keep shell thickness in a vault-safe range so blocks stay visible and within weight limits.
    state.params.thickness = thicknessM;
    state.constraints.maxWeight = Math.max(state.constraints.maxWeight || 520, 2500);
    state.constraints.jointGap = Math.max(0.001, clearanceM || state.constraints.jointGap || 0.02);
    state.constraints.fabTolerance = Math.max(state.constraints.fabTolerance || 0.008, clearanceM || 0);
    state.pattern = bond.pattern;
    state.barrelBondMode = bond.barrelBondMode;
    state.blockDimensionMode = "applied";
    state.strategy = {
      ...state.strategy,
      component,
      componentMode: "single",
      fill: "quad",
      rotationVariation: "none",
      scale: state.strategy.scale === "cell-bounds" ? "fit-to-cell" : (state.strategy.scale || "fit-to-cell"),
      topology: "primal",
      dualBoundaryCleanup: true,
      merge: "separate-blocks",
    };
    state.appliedTileSystem = {
      id: b.activeTileId || null,
      name,
      baseGeometry: b.baseGeometry,
      jointType: b.jointType,
      length: b.length,
      width: b.width,
      height: b.height,
      thickness: b.thickness,
      draft: b.draft,
      fillet: b.fillet,
      clearance: b.clearance,
      density: b.density,
      frequency: b.frequency,
      amplitude: b.amplitude,
      depth: b.depth,
      phase: b.phase,
      morph: b.morph,
      tileMode: b.tileMode,
      swatch: b.swatch,
    };

    state.blocksGeneratedFromTrait = true;
    state.blockStep = "Generated Voussoirs";
    state.layers.blocks = true;
    // Keep host form as a light ghost under the applied blocks.
    state.layers.builtInForm = true;
    state.layers.sourceModel = true;
    state.display.seamDebug = true;
    state.view2dOptions.showBlocks = true;
    state.pipelineStage = Math.max(state.pipelineStage || 0, 5);
    updateStereotomyProcess(5);

    if (byId("layerBlocks")) byId("layerBlocks").checked = true;
    if (byId("layerBuiltInForm")) byId("layerBuiltInForm").checked = true;
    if (byId("layerSourceModel")) byId("layerSourceModel").checked = true;
    if (byId("subdivision")) byId("subdivision").value = state.pattern;
    if (nodes.strategyComponent) nodes.strategyComponent.value = component;
    if (nodes.topologyLatticeEnabled) nodes.topologyLatticeEnabled.checked = false;

    setStrategyViewMode("component-mapping");
    syncInputsFromState();
    renderActiveAssetStrip();
    setPipelineStatus(`Applying “${name}” to ${state.vaultType}…`);
    rebuild();
    // Re-assert visibility after display presets run inside rebuild/build3d.
    state.layers.blocks = true;
    state.layers.builtInForm = true;
    state.display.seamDebug = true;
    if (byId("layerBlocks")) byId("layerBlocks").checked = true;
    if (byId("layerBuiltInForm")) byId("layerBuiltInForm").checked = true;
    // Readable 3D presentation for designed blocks.
    state.displayPreset = "Shaded";
    state.display.seamDebug = true;
    if (byId("displayPreset")) byId("displayPreset").value = "Shaded";
    applyDisplayPreset();
    solidVaultGroup?.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach((material) => {
        material.transparent = true;
        material.opacity = Math.min(Number(material.opacity ?? 1), 0.12);
        material.depthWrite = false;
        material.needsUpdate = true;
      });
    });
    blockGroup?.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      if (obj.material.color) obj.material.color.set(0xb7c0b0);
      obj.material.transparent = false;
      obj.material.opacity = 1;
      obj.material.needsUpdate = true;
      const seam = obj.getObjectByName("seam");
      if (seam) {
        seam.visible = true;
        if (seam.material) {
          seam.material.color?.set?.(0x243028);
          seam.material.transparent = true;
          seam.material.opacity = 0.92;
          seam.material.needsUpdate = true;
        }
      }
    });
    applyLayerVisibility();
    {
      const box = new THREE.Box3();
      const blockBox = new THREE.Box3().setFromObject(blockGroup);
      const solidBox = new THREE.Box3().setFromObject(solidVaultGroup);
      if (!blockBox.isEmpty()) box.union(blockBox);
      if (!solidBox.isEmpty()) box.union(solidBox);
      if (!box.isEmpty()) {
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const span = Math.max(size.x, size.y, size.z, 8);
        camera.position.set(center.x + span * 1.35, center.y + span * 0.85, center.z + span * 1.55);
        controls.target.copy(center);
        controls.update();
      } else {
        camera.position.set(22, 16, 28);
        controls.target.set(0, 8, 0);
        controls.update();
      }
    }
    if (typeof resize === "function") resize();
    renderer.toneMappingExposure = 1.05;
    scene.background = new THREE.Color(0x334153);
    renderer.render(scene, camera);
    const count = state.blocks?.length || 0;
    const invalid = state.blocks?.filter((block) => block.failed?.length)?.length || 0;
    const meshCount = blockGroup?.children?.length || 0;
    setPipelineStatus(`Applied “${name}” to ${state.vaultType}: ${count} block${count === 1 ? "" : "s"} (${meshCount} meshes) on the vault surface (${b.tileMode}, ${b.jointType})${invalid ? ` · ${invalid} need review` : ""}.`);
    return true;
  } catch (err) {
    console.error("applyBlockDesignerToVault failed", err);
    setPipelineStatus(`Apply to Vault failed: ${err?.message || err}`);
    return false;
  }
};

const rememberLibraryCandidate = (slot, kind, file) => {
  state.libraryCandidates[slot] = { kind, file, capturedAt: new Date().toISOString() };
};

const saveLibraryCandidate = async (slot) => {
  const candidate = state.libraryCandidates[slot];
  const viewKey = slot === "host" ? "host" : "panel";
  if (!candidate?.file) {
    setAssetLibraryStatus(viewKey, slot === "host" ? "Import a 3D host before saving it." : "Import a panel or tile design before saving it.");
    return;
  }
  const file = candidate.file;
  const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const entry = {
    id,
    kind: candidate.kind,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    addedAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    metadata: getCurrentAssetMetadata(candidate.kind, file),
    blob: file,
  };
  try {
    await runAssetLibraryStore("readwrite", (store) => store.put(entry));
    await renderAssetLibrary();
    const select = assetLibraryViews[viewKey]?.select?.();
    if (select) select.value = id;
    state.activeLibraryAssetIds[viewKey] = id;
    renderAssetLibraryPreview(viewKey);
    setAssetLibraryStatus(viewKey, `Saved ${assetKindLabels[candidate.kind] || "asset"}: ${file.name}.`);
    renderActiveAssetStrip();
  } catch (err) {
    console.error("saveLibraryCandidate failed", err);
    setAssetLibraryStatus(viewKey, "Could not save that file. Very large assets may exceed browser storage limits.");
  }
};

const saveCurrentEditedPanelVariant = async ({ duplicate = false } = {}) => {
  if (!state.customPanel?.geometryData) {
    setAssetLibraryStatus("panel", "Load or create a custom panel before saving an edited variant.");
    return;
  }
  const name = makePanelVariantName(duplicate ? "duplicate" : "edited");
  const payload = buildCurrentPanelVariantPayload(name);
  if (!payload) {
    setAssetLibraryStatus("panel", "Could not capture the current panel variant.");
    return;
  }
  const json = JSON.stringify(payload);
  const blob = new Blob([json], { type: "application/json" });
  const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const entry = {
    id,
    kind: "edited-panel",
    name,
    mimeType: "application/json",
    size: blob.size,
    addedAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    metadata: getCurrentAssetMetadata("edited-panel", { name }),
    blob,
  };
  try {
    await runAssetLibraryStore("readwrite", (store) => store.put(entry));
    state.customPanel.name = name;
    state.customPanel.variantSettings = payload.panel.variantSettings;
    state.activeLibraryAssetIds.panel = id;
    await renderAssetLibrary();
    const select = assetLibraryViews.panel?.select?.();
    if (select) select.value = id;
    renderAssetLibraryPreview("panel");
    renderCustomPanelStatus();
    renderActiveAssetStrip();
    setAssetLibraryStatus("panel", duplicate ? `Duplicated current panel to variant: ${name}.` : `Saved current edited panel: ${name}.`);
  } catch (err) {
    console.error("saveCurrentEditedPanelVariant failed", err);
    setAssetLibraryStatus("panel", "Could not save the edited panel variant.");
  }
};

const apply2dImportFile = async (file, { remember = true } = {}) => {
  const ok = await on2dImport(file);
  if (!ok) {
    setPipelineStatus(`Could not read 2D pattern layout from ${file.name}. Try SVG polygons/polylines or DXF polylines.`);
    return false;
  }
  if (remember) rememberLibraryCandidate("tile", "2d-layout", file);
  state.designMode = "Custom Import";
  byId("designMode").value = "Custom Import";
  state.vaultType = "Custom Imported Rhino Surface";
  if (byId("vaultType")) byId("vaultType").value = state.vaultType;
  state.surfacePrinciple = vaultSurfacePrincipleDefault[state.vaultType] || state.surfacePrinciple;
  state.customPatternSource = "Imported 2D Layout";
  syncCustomPatternSourceInputs();
  state.patternAppliedToModel = false;
  state.pipelineStage = Math.max(state.pipelineStage, 3);
  updateStereotomyProcess(state.pipelineStage);
  setPipelineStatus(`2D pattern layout loaded from ${file.name}.`);
  applyVaultParamRules();
  applyRightPanelToolVisibility();
  rebuild();
  return true;
};

const applyTopologyMeshFile = async (file, { remember = true } = {}) => {
  const ok = await loadTopologyMesh(file);
  if (!ok) {
    setPipelineStatus(`Could not read topology faces from ${file.name}. Try OBJ with polygon faces or a Rhino mesh in 3DM.`);
    return false;
  }
  if (remember) rememberLibraryCandidate("tile", "topology-mesh", file);
  const hasUploadedSurface = !!state.importedSurface;
  if (hasUploadedSurface) {
    state.designMode = "Custom Import";
    byId("designMode").value = "Custom Import";
    state.vaultType = "Custom Imported Rhino Surface";
    if (byId("vaultType")) byId("vaultType").value = state.vaultType;
    state.surfacePrinciple = vaultSurfacePrincipleDefault[state.vaultType] || state.surfacePrinciple;
  } else {
    state.designMode = "Generated";
    byId("designMode").value = "Generated";
  }
  state.customPatternSource = "Imported Topology Mesh";
  syncCustomPatternSourceInputs();
  state.patternAppliedToModel = true;
  state.layers.blocks = true;
  if (byId("layerBlocks")) byId("layerBlocks").checked = true;
  state.pipelineStage = Math.max(state.pipelineStage, 3);
  updateStereotomyProcess(state.pipelineStage);
  setPipelineStatus(hasUploadedSurface
    ? `Flat topology mesh loaded: ${file.name}. It will drive the block layout over the uploaded vault surface.`
    : `Flat topology mesh loaded: ${file.name}. It will drive blocks over the current generated vault surface; uploaded host geometry is optional for this workflow.`
  );
  applyVaultParamRules();
  applyRightPanelToolVisibility();
  rebuild();
  return true;
};

const applyCustomPanelFile = async (file, { remember = true } = {}) => {
  const ok = await loadCustomPanelComponent(file);
  if (!ok) {
    setPipelineStatus(`Could not load custom panel from ${file.name}. Try OBJ, STL, GLB, or a Rhino 3DM mesh/BREP.`);
    return false;
  }
  if (remember) rememberLibraryCandidate("tile", "custom-panel", file);
  if (nodes.strategyPreset) nodes.strategyPreset.value = "custom";
  if (state.importedTissueCells?.length) {
    state.customPatternSource = panelQuadSource;
    syncCustomPatternSourceInputs();
  }
  // Loading a panel asset is an intent to map it onto the active host, not merely stage it in the library.
  state.vaultDesignerPreview = false;
  state.patternAppliedToModel = true;
  state.layers.blocks = true;
  state.view2dOptions.showBlocks = true;
  setPipelineStatus(`Custom panel loaded and applied: ${file.name}. Component mapping mode is ${labelStrategyValue(state.strategy.scale)}.`);
  setToolTab("strategy");
  setStrategyViewMode("component-mapping");
  renderCurrentTraitState();
  rebuild();
  return true;
};

const applyMorphPanelFile = async (file, { remember = true } = {}) => {
  if (!state.customPanel?.geometryData) {
    setPipelineStatus("Load a basis custom panel before loading a morph panel.");
    return false;
  }
  const ok = await loadCustomPanelMorphComponent(file);
  if (!ok) {
    setPipelineStatus(`Could not load morph panel from ${file.name}. Use the same file type and topology as the basis panel.`);
    return false;
  }
  if (remember) rememberLibraryCandidate("tile", "morph-panel", file);
  const compatible = state.customPanel?.morph?.compatible;
  setPipelineStatus(compatible
    ? `Morph panel loaded: ${file.name}. Shape-key blending is active from basis to morph.`
    : `Morph panel loaded: ${file.name}, but it is not a safe aperture morph (${state.customPanel?.morph?.compatibilityReason || "topology mismatch"}). No aperture blending will be applied.`
  );
  setStrategyViewMode("component-mapping");
  rebuild();
  return true;
};

const applyEditedPanelVariantFile = async (file, { remember = true } = {}) => {
  let payload = null;
  try {
    payload = JSON.parse(await file.text());
  } catch (err) {
    console.error("applyEditedPanelVariantFile/parse failed", err);
    setPipelineStatus(`Could not read edited panel variant from ${file.name}.`);
    return false;
  }
  const ok = applyPanelVariantPayload(payload);
  if (!ok) {
    setPipelineStatus(`Could not load edited panel variant from ${file.name}.`);
    return false;
  }
  if (remember) rememberLibraryCandidate("tile", "edited-panel", file);
  if (nodes.strategyPreset) nodes.strategyPreset.value = "custom";
  state.customPatternSource = panelQuadSource;
  syncCustomPatternSourceInputs();
  setToolTab("panel-library");
  setStrategyViewMode("component-mapping");
  setPipelineStatus(`Edited panel variant loaded: ${state.customPanel.name}.`);
  renderCurrentTraitState();
  rebuild();
  return true;
};

const applyHost3dFile = async (file, { remember = true } = {}) => {
  const ok = await load3DObject(file);
  if (!ok) {
    setPipelineStatus(`Could not load host model from ${file.name}. Keep the generated vault active and load a flat topology OBJ to drive the block layout.`);
    return false;
  }
  if (remember) rememberLibraryCandidate("host", "host-3d", file);
  state.designMode = "Custom Import";
  byId("designMode").value = "Custom Import";
  state.vaultType = "Custom Imported Rhino Surface";
  if (byId("vaultType")) byId("vaultType").value = state.vaultType;
  state.surfacePrinciple = vaultSurfacePrincipleDefault[state.vaultType] || state.surfacePrinciple;
  state.customPatternSource = state.imported2DPolys?.length
    ? "Imported 2D Layout"
    : state.importedTissueCells?.length
      ? panelQuadSource
      : (state.importedBrepPatches?.length || state.importedTopologyPolys?.length)
      ? "Imported Topology Mesh"
      : "Freeform Courses";
  syncCustomPatternSourceInputs();
  if (["Freeform Courses", "NGon Cells", "NGon Adaptive"].includes(state.customPatternSource)) updateFreeformCountsFromBlockDimensions();
  state.pattern = vaultPatternPreset[state.vaultType] || state.pattern;
  if (byId("subdivision")) byId("subdivision").value = state.pattern;
  state.patternAppliedToModel = false;
  state.pipelineStage = 1;
  updateStereotomyProcess(1);
  const carrier = getTissueCarrierSummary();
  setPipelineStatus(`Uploaded host geometry loaded: ${file.name}. ${carrier.title}. ${carrier.lines[0] || ""} Display triangles: ${state.importedModelStats?.triangleCount || 0}.`);
  applyVaultParamRules();
  applyRightPanelToolVisibility();
  rebuild();
  return true;
};

const loadSelectedLibraryAsset = async (viewKey) => {
  const id = assetLibraryViews[viewKey]?.select?.()?.value;
  if (!id) {
    setAssetLibraryStatus(viewKey, `Choose a saved ${libraryViewLabel(viewKey)} to load.`);
    return;
  }
  try {
    const entry = await runAssetLibraryStore("readonly", (store) => store.get(id));
    if (!entry?.blob) {
      setAssetLibraryStatus(viewKey, "That library asset is no longer available.");
      await renderAssetLibrary();
      return;
    }
    if (!assetLibraryViews[viewKey]?.kinds.includes(entry.kind)) {
      setAssetLibraryStatus(viewKey, "That asset belongs in the other library repository.");
      await renderAssetLibrary();
      return;
    }
    const file = new File([entry.blob], entry.name, { type: entry.mimeType || entry.blob.type || "", lastModified: Date.parse(entry.addedAt) || Date.now() });
    const loaders = {
      "2d-layout": apply2dImportFile,
      "topology-mesh": applyTopologyMeshFile,
      "custom-panel": applyCustomPanelFile,
      "morph-panel": applyMorphPanelFile,
      "edited-panel": applyEditedPanelVariantFile,
      "host-3d": applyHost3dFile,
      "tile-system": applyTileSystemFile,
    };
    const ok = await loaders[entry.kind]?.(file, { remember: false });
    if (ok) {
      await runAssetLibraryStore("readwrite", (store) => store.put({ ...entry, lastUsedAt: new Date().toISOString(), blob: entry.blob }));
      if (entry.kind === "tile-system") state.blockDesigner.activeTileId = id;
      await renderAssetLibrary();
      const select = assetLibraryViews[viewKey]?.select?.();
      if (select) select.value = id;
      state.activeLibraryAssetIds[viewKey] = id;
      renderAssetLibraryPreview(viewKey);
      setAssetLibraryStatus(viewKey, `Loaded ${assetKindLabels[entry.kind] || "asset"}: ${entry.name}.`);
      renderActiveAssetStrip();
    }
  } catch (err) {
    console.error("loadSelectedLibraryAsset failed", err);
    setAssetLibraryStatus(viewKey, "Could not load that saved asset.");
  }
};

const deleteSelectedLibraryAsset = async (viewKey) => {
  const id = assetLibraryViews[viewKey]?.select?.()?.value;
  if (!id) {
    setAssetLibraryStatus(viewKey, `Choose a saved ${libraryViewLabel(viewKey)} to delete.`);
    return;
  }
  const entry = state.assetLibraryEntries.find((item) => item.id === id);
  if (entry && !assetLibraryViews[viewKey]?.kinds.includes(entry.kind)) {
    setAssetLibraryStatus(viewKey, "That asset belongs in the other library repository.");
    await renderAssetLibrary();
    return;
  }
  try {
    await runAssetLibraryStore("readwrite", (store) => store.delete(id));
    if (entry?.kind === "tile-system" && state.blockDesigner.activeTileId === id) {
      state.blockDesigner.activeTileId = null;
    }
    if (state.activeLibraryAssetIds[viewKey] === id) state.activeLibraryAssetIds[viewKey] = null;
    await renderAssetLibrary();
    setAssetLibraryStatus(viewKey, entry ? `Deleted ${entry.name} from the ${libraryViewLabel(viewKey)} repository.` : "Deleted saved asset.");
  } catch (err) {
    console.error("deleteSelectedLibraryAsset failed", err);
    setAssetLibraryStatus(viewKey, "Could not delete that saved asset.");
  }
};

const resize = () => {
  const box = byId("viewport").getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return;
  renderer.setSize(box.width, box.height, false);
  camera.aspect = box.width / box.height;
  camera.updateProjectionMatrix();
  applyBlockPreviewWindowState();
  if (blockPreviewRenderer && nodes.blockPreview) {
    const previewBox = nodes.blockPreview.getBoundingClientRect();
    if (previewBox.width > 0 && previewBox.height > 0) {
      blockPreviewRenderer.setSize(previewBox.width, previewBox.height, false);
      blockPreviewCamera.aspect = previewBox.width / previewBox.height;
      blockPreviewCamera.updateProjectionMatrix();
    }
  }
  if (bdModelRenderer && bdModelCanvas) {
    const modelBox = bdModelCanvas.getBoundingClientRect();
    if (modelBox.width > 0 && modelBox.height > 0) {
      bdModelRenderer.setSize(modelBox.width, modelBox.height, false);
      bdModelCamera.aspect = modelBox.width / modelBox.height;
      bdModelCamera.updateProjectionMatrix();
    }
  }
};

const getBlockPreviewBounds = () => {
  const panel = nodes.blockPreviewPanel;
  const parent = panel?.parentElement;
  if (!panel || !parent) return null;
  const parentRect = parent.getBoundingClientRect();
  return {
    parent,
    width: parentRect.width,
    height: parentRect.height,
  };
};

const applyBlockPreviewWindowState = () => {
  const panel = nodes.blockPreviewPanel;
  const bounds = getBlockPreviewBounds();
  if (!panel || !bounds) return;
  const minW = 260;
  const minH = 210;
  const maxW = Math.max(minW, bounds.width - 24);
  const maxH = Math.max(minH, bounds.height - 24);
  const w = clamp(state.blockPreviewWindow.w || 360, minW, maxW);
  const h = clamp(state.blockPreviewWindow.h || 260, minH, maxH);
  const defaultX = Math.max(12, bounds.width - w - 12);
  const defaultY = Math.max(12, bounds.height - h - 12);
  const x = clamp(state.blockPreviewWindow.x ?? defaultX, 12, Math.max(12, bounds.width - w - 12));
  const y = clamp(state.blockPreviewWindow.y ?? defaultY, 12, Math.max(12, bounds.height - h - 12));
  Object.assign(state.blockPreviewWindow, { x, y, w, h });
  panel.style.left = `${x}px`;
  panel.style.top = `${y}px`;
  panel.style.right = "auto";
  panel.style.bottom = "auto";
  panel.style.width = `${w}px`;
  panel.style.height = `${h}px`;
};

let blockPreviewDrag = null;
const beginBlockPreviewWindowAction = (event, mode) => {
  const panel = nodes.blockPreviewPanel;
  const bounds = getBlockPreviewBounds();
  if (!panel || !bounds) return;
  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
  const rect = panel.getBoundingClientRect();
  const parentRect = bounds.parent.getBoundingClientRect();
  blockPreviewDrag = {
    mode,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    x: rect.left - parentRect.left,
    y: rect.top - parentRect.top,
    w: rect.width,
    h: rect.height,
  };
  Object.assign(state.blockPreviewWindow, {
    x: blockPreviewDrag.x,
    y: blockPreviewDrag.y,
    w: blockPreviewDrag.w,
    h: blockPreviewDrag.h,
  });
  panel.classList.add("dragging");
  panel.setPointerCapture?.(event.pointerId);
  document.body.style.userSelect = "none";
};

nodes.blockPreviewPanel?.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

nodes.blockPreviewPanel?.querySelector(".block-preview-head")?.addEventListener("pointerdown", (event) => {
  beginBlockPreviewWindowAction(event, "move");
});

nodes.blockPreviewResize?.addEventListener("pointerdown", (event) => {
  beginBlockPreviewWindowAction(event, "resize");
});

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

const getSelectedBlockIndex = () => state.blocks.findIndex((b) => b.id === state.selectedBlockId);

const copyEditableBlockMeta = (block) => ({
  isKeystone: !!block.isKeystone,
  componentVariant: block.componentVariant,
  panelVariantRole: block.panelVariantRole,
  manualPanelVariantRole: block.manualPanelVariantRole,
  fillCellType: block.fillCellType || "quad",
  parentCellId: block.parentCellId || block.id,
  rotationShift: block.rotationShift || 0,
  generatorStrategy: block.generatorStrategy || "manual-edit",
  generatorStrategyLabel: block.generatorStrategyLabel || "2D strategy editor",
  pinnedBoundary: !!block.pinnedBoundary,
  supportMarked: !!block.supportMarked,
  importedMaterialGroup: block.importedMaterialGroup || null,
  importedFaceGroup: block.importedFaceGroup || null,
  topologyGroup: block.topologyGroup || null,
});

const splitUvCell = (uv) => {
  if (!uv?.length) return [];
  if (uv.length === 3) {
    const center = polygonCentroidUv(uv);
    return uv.map((p, i) => [p, uv[(i + 1) % uv.length], center]);
  }
  const xs = uv.map((p) => p[0]);
  const ys = uv.map((p) => p[1]);
  const splitU = Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys);
  const a = uv[0];
  const b = uv[1];
  const c = uv[2];
  const d = uv[3] || uv[0];
  if (splitU) {
    const ab = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const dc = [(d[0] + c[0]) / 2, (d[1] + c[1]) / 2];
    return [[a, ab, dc, d], [ab, b, c, dc]];
  }
  const bc = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
  const ad = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2];
  return [[a, b, bc, ad], [ad, bc, c, d]];
};

const splitSelectedCell = () => {
  const index = getSelectedBlockIndex();
  if (index < 0) return setPipelineStatus("Select a 2D block before splitting.");
  const block = state.blocks[index];
  const parts = splitUvCell(block.uv).map((uv, partIndex) => ({
    id: `${block.id}-${partIndex + 1}`,
    uv: uv.map((p) => [p[0], p[1]]),
    ...copyEditableBlockMeta(block),
    parentCellId: block.parentCellId || block.id,
    editorOperation: "split",
  }));
  if (parts.length < 2) return setPipelineStatus("Selected cell could not be split.");
  state.blocks.splice(index, 1, ...parts);
  state.selectedBlockId = parts[0].id;
  setPipelineStatus(`Split ${block.id} into ${parts.length} editable cells.`);
  refreshEditedBlocks();
};

const mergeSelectedCellWithNext = () => {
  const index = getSelectedBlockIndex();
  if (index < 0) return setPipelineStatus("Select a 2D block before merging.");
  if (state.blocks.length < 2) return setPipelineStatus("Need at least two cells to merge.");
  const a = state.blocks[index];
  const b = state.blocks[(index + 1) % state.blocks.length];
  const pts = [...a.uv, ...b.uv];
  const minU = Math.min(...pts.map((p) => p[0]));
  const maxU = Math.max(...pts.map((p) => p[0]));
  const minV = Math.min(...pts.map((p) => p[1]));
  const maxV = Math.max(...pts.map((p) => p[1]));
  const merged = {
    id: `${a.id}+${b.id}`,
    uv: [[minU, minV], [maxU, minV], [maxU, maxV], [minU, maxV]],
    ...copyEditableBlockMeta(a),
    componentVariant: a.componentVariant || b.componentVariant,
    pinnedBoundary: !!(a.pinnedBoundary || b.pinnedBoundary),
    supportMarked: !!(a.supportMarked || b.supportMarked),
    parentCellId: `${a.parentCellId || a.id}|${b.parentCellId || b.id}`,
    editorOperation: "merge",
  };
  const removeIndex = (index + 1) % state.blocks.length;
  state.blocks.splice(Math.max(index, removeIndex), 1);
  state.blocks.splice(Math.min(index, removeIndex), 1, merged);
  state.selectedBlockId = merged.id;
  setPipelineStatus(`Merged ${a.id} with ${b.id}.`);
  refreshEditedBlocks();
};

const rotateSelectedComponent = () => {
  const index = getSelectedBlockIndex();
  if (index < 0) return setPipelineStatus("Select a 2D block before rotating.");
  const block = state.blocks[index];
  if (block.uv?.length > 2) block.uv = [...block.uv.slice(1), block.uv[0]];
  block.rotationShift = ((block.rotationShift || 0) + 1) % Math.max(1, block.uv?.length || 1);
  block.editorOperation = "rotate";
  setPipelineStatus(`Rotated component frame for ${block.id}.`);
  refreshEditedBlocks();
};

const pinSelectedBoundary = () => {
  const index = getSelectedBlockIndex();
  if (index < 0) return setPipelineStatus("Select a 2D block before pinning.");
  state.blocks[index].pinnedBoundary = !state.blocks[index].pinnedBoundary;
  state.blocks[index].editorOperation = "pin-boundary";
  setPipelineStatus(`${state.blocks[index].pinnedBoundary ? "Pinned" : "Unpinned"} boundary condition for ${state.blocks[index].id}.`);
  refreshEditedBlocks();
};

const markSelectedSupport = () => {
  const index = getSelectedBlockIndex();
  if (index < 0) return setPipelineStatus("Select a 2D block before marking support.");
  state.blocks[index].supportMarked = !state.blocks[index].supportMarked;
  state.blocks[index].editorOperation = "mark-support";
  setPipelineStatus(`${state.blocks[index].supportMarked ? "Marked" : "Cleared"} support zone for ${state.blocks[index].id}.`);
  refreshEditedBlocks();
};

const assignSelectedComponentVariant = () => {
  const index = getSelectedBlockIndex();
  if (index < 0) return setPipelineStatus("Select a 2D block before assigning a component.");
  const variant = nodes.editComponentVariant?.value || state.strategy.component;
  if (panelVariantRoles.some((role) => role.id === variant)) {
    if (!state.customPanel?.geometryData) {
      return setPipelineStatus("Load a custom panel before assigning panel variants.");
    }
    state.blocks[index].manualPanelVariantRole = variant;
    state.blocks[index].panelVariantRole = variant;
    state.blocks[index].componentVariant = "custom";
    state.blocks[index].componentType = "custom";
    state.blocks[index].editorOperation = `assign-panel-variant-${variant}`;
    setPipelineStatus(`Assigned panel variant ${getPanelVariantLabel(variant)} to ${state.blocks[index].id}.`);
  } else {
    state.blocks[index].componentVariant = variant;
    state.blocks[index].componentType = variant;
    state.blocks[index].editorOperation = "assign-component";
    setPipelineStatus(`Assigned ${labelStrategyValue(variant)} to ${state.blocks[index].id}.`);
  }
  refreshEditedBlocks();
};

nodes.editSplitCell?.addEventListener("click", splitSelectedCell);
nodes.editMergeCell?.addEventListener("click", mergeSelectedCellWithNext);
nodes.editRotateComponent?.addEventListener("click", rotateSelectedComponent);
nodes.editPinBoundary?.addEventListener("click", pinSelectedBoundary);
nodes.editMarkSupport?.addEventListener("click", markSelectedSupport);
nodes.editAssignVariant?.addEventListener("click", assignSelectedComponentVariant);

const getLayoutPointerUv = (event) => {
  const rect = nodes.layout2d.getBoundingClientRect();
  const sx = ((event.clientX - rect.left) / rect.width) * state.view2d.w + state.view2d.x;
  const sy = ((event.clientY - rect.top) / rect.height) * state.view2d.h + state.view2d.y;
  return layoutPointToUv(sx, sy, get2dFrames().layout);
};
const setAttractorMode = (mode) => {
  const field = getAttractorField();
  if (mode !== "curve") field.pendingCurve = [];
  field.mode = mode;
  syncAttractorControls();
  draw2d();
};
const deleteSelectedAttractor = () => {
  const field = getAttractorField();
  if (!field.selectedId) return;
  field.elements = field.elements.filter((element) => element.id !== field.selectedId);
  field.selectedId = null;
  refreshAttractorField();
};
nodes.attractorSelect?.addEventListener("click", () => setAttractorMode("select"));
nodes.attractorAddPoint?.addEventListener("click", () => setAttractorMode("point"));
nodes.attractorDrawCurve?.addEventListener("click", () => setAttractorMode("curve"));
nodes.attractorFinishCurve?.addEventListener("click", () => {
  if (!finishPendingAttractorCurve()) setPipelineStatus("A curve needs at least two points.");
});
nodes.attractorDelete?.addEventListener("click", deleteSelectedAttractor);
nodes.attractorClear?.addEventListener("click", () => {
  const field = getAttractorField();
  if (!field.elements.length && !field.pendingCurve.length) return;
  field.elements = [];
  field.pendingCurve = [];
  field.selectedId = null;
  field.mode = "select";
  refreshAttractorField();
});
nodes.attractorApplyDensity?.addEventListener("click", () => {
  const field = getAttractorField();
  if (!field.elements.length) {
    setPipelineStatus("Add at least one attractor point or curve before applying panel density.");
    return;
  }
  state.fieldWeights.source = "attractor";
  state.fieldWeights.driveDensity = true;
  state.vaultDesignerPreview = false;
  state.patternAppliedToModel = true;
  state.layers.blocks = true;
  state.view2dOptions.showBlocks = true;
  setInputValue(nodes.fieldWeightSource, "attractor", { force: true });
  setInputValue(nodes.panelMorphWeightSource, "attractor", { force: true });
  if (nodes.fieldWeightDriveDensity) nodes.fieldWeightDriveDensity.checked = true;
  syncFieldWeightControls();
  setPipelineStatus(`Attractor field applied: ${labelStrategyValue(state.panelAttractorResponse.mode)} response is mapped across the active panel family.`);
  rebuild();
});
[nodes.attractorRadius, nodes.attractorStrength, nodes.attractorCurvatureMix].forEach((node) => node?.addEventListener("input", () => {
  updateSelectedAttractorParameters();
  refreshAttractorField();
}));

nodes.layout2d.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  const field = getAttractorField();
  const handle = event.target.closest("[data-attractor-id]");
  if (handle) {
    event.preventDefault();
    const id = handle.dataset.attractorId;
    field.selectedId = id;
    if (field.mode === "select" && handle.dataset.attractorVertex != null) {
      state.draggingAttractor = { id, vertex: Number(handle.dataset.attractorVertex) };
      nodes.layout2d.setPointerCapture?.(event.pointerId);
    }
    syncAttractorControls();
    draw2d();
    return;
  }
  const uv = getLayoutPointerUv(event);
  if (field.mode === "point") {
    event.preventDefault();
    const element = { id: attractorId(), type: "point", points: [uv], radius: field.radius, strength: field.strength };
    field.elements.push(element);
    field.selectedId = element.id;
    field.mode = "select";
    refreshAttractorField();
  } else if (field.mode === "curve") {
    event.preventDefault();
    field.pendingCurve.push(uv);
    syncAttractorControls();
    draw2d();
  }
});
window.addEventListener("pointermove", (event) => {
  if (!state.draggingAttractor) return;
  const element = getAttractorField().elements.find((item) => item.id === state.draggingAttractor.id);
  if (!element?.points?.[state.draggingAttractor.vertex]) return;
  element.points[state.draggingAttractor.vertex] = getLayoutPointerUv(event);
  draw2d();
});
window.addEventListener("pointerup", () => {
  if (!state.draggingAttractor) return;
  state.draggingAttractor = null;
  refreshAttractorField();
});
window.addEventListener("keydown", (event) => {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if (event.key === "Enter" && getAttractorField().mode === "curve") {
    event.preventDefault();
    finishPendingAttractorCurve();
  }
  if ((event.key === "Delete" || event.key === "Backspace") && getAttractorField().selectedId) {
    event.preventDefault();
    deleteSelectedAttractor();
  }
});

nodes.layout2d.addEventListener("click", (e) => {
  const poly = e.target.closest(".block2d");
  if (!poly) return;
  state.selectedBlockId = poly.dataset.id;
  applySelection();
});
nodes.layout2d.addEventListener("pointerdown", (e) => {
  if (!state.view2dOptions.showVertices) return;
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
  const sx = ((e.clientX - rect.left) / rect.width) * state.view2d.w + state.view2d.x;
  const sy = ((e.clientY - rect.top) / rect.height) * state.view2d.h + state.view2d.y;
  const frame = get2dFrames().layout;
  const [u, v] = layoutPointToUv(sx, sy, frame);
  const b = state.blocks.find((x) => x.id === state.dragging.id);
  if (!b) return;
  b.uv[state.dragging.vertex] = [u, v];
  annotateBlockForStrategy(b);
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

["span", "rise", "length", "courseCount", "blockCount", "subdivisionDensity", "keystoneSize"].forEach((id) => {
  linkRangeAndNumber(id, `${id}Num`, (value) => {
    state.params[id] = value;
    if (["courseCount", "blockCount", "subdivisionDensity"].includes(id)) ensureImportedFreeformApplied();
    rebuild();
  });
});
linkCmRangeAndNumber("thickness", "thicknessNum", (value) => {
  state.params.thickness = clamp(value, 0.2, 4);
  state.wallThickness = clamp(state.params.thickness, 0.1, 4);
  ensureImportedFreeformApplied();
  syncCmInputPair("thickness", state.params.thickness);
  syncCmInput("blockHeight", state.params.thickness);
  setInputValue(nodes.blockPreviewHeight, metersToCmInput(state.params.thickness));
  syncCmInputPair("wallThickness", state.wallThickness);
  rebuild();
});
linkRangeAndNumber("springingAngle", "springingAngleNum", (value) => { state.springingAngle = value; rebuild(); });
linkRangeAndNumber("taperScale", "taperScaleNum", (value) => {
  state.taperScale = clamp(value, 0.25, 1.5);
  syncInputPair("taperScale", state.taperScale);
  rebuild();
});
linkCmRangeAndNumber("targetBlockWidth", "targetBlockWidthNum", (value) => {
  applyBlockLengthCm(value * 100);
});
if (byId("blockDimensionMode")) byId("blockDimensionMode").addEventListener("change", (e) => {
  state.blockDimensionMode = e.target.value === "fit" ? "fit" : "applied";
  if (state.blockDimensionMode !== "fit") updateFreeformCountsFromBlockDimensions();
  syncInputsFromState();
  rebuild();
});
if (byId("blockPreviewCount")) byId("blockPreviewCount").addEventListener("input", (e) => {
  state.blockPreviewCount = clamp(Math.round(Number(e.target.value) || 1), 1, 6);
  syncInputsFromState();
  renderBlockPreview();
});
linkCmRangeAndNumber("wallThickness", "wallThicknessNum", (value) => {
  state.wallThickness = clamp(value, 0.1, 4);
  syncCmInputPair("wallThickness", state.wallThickness);
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
  state.wallThickness = clamp(state.params.thickness, 0.1, 4);
  syncInputsFromState();
  rebuild();
});
linkRangeAndNumber("extradosOffset", "extradosOffsetNum", (value) => { state.extradosOffset = Math.max(0, value); syncInputPair("extradosOffset", state.extradosOffset); rebuild(); });
linkRangeAndNumber("groinMorph", "groinMorphNum", (value) => { state.groinMorph = clamp(value, 0, 1); syncInputPair("groinMorph", state.groinMorph); rebuild(); });
linkRangeAndNumber("lInterlockBias", "lInterlockBiasNum", (value) => { state.lInterlockBias = clamp(value, 0, 1); syncInputPair("lInterlockBias", state.lInterlockBias); rebuild(); });
linkRangeAndNumber("cubeScale", "cubeScaleNum", (value) => { state.cubeScale = Math.max(0.1, value); syncInputPair("cubeScale", state.cubeScale); rebuild(); });
["maxWeight", "taperAngle", "maxTaper"].forEach((id) => {
  const el = byId(id);
  if (el) el.addEventListener("input", (e) => { state.constraints[id] = Number(e.target.value); rebuild(); });
});
["jointGap", "bedDepth"].forEach((id) => {
  linkCmNumber(id, (value) => {
    state.constraints[id] = value;
    rebuild();
  });
});
nodes.customPanelSeamAllowance?.addEventListener("input", (e) => {
  const value = cmInputToMeters(e.target.value);
  if (!Number.isFinite(value)) return;
  state.customPanelSeamAllowance = clamp(value, -0.1, 0.2);
  rebuild();
});
nodes.customPanelThicknessScale?.addEventListener("input", (e) => {
  const value = Number(e.target.value);
  if (!Number.isFinite(value)) return;
  state.customPanelThicknessScale = clamp(value, 0.05, 20);
  rebuild();
});
nodes.customPanelThicknessOffset?.addEventListener("input", (e) => {
  const value = cmInputToMeters(e.target.value);
  if (!Number.isFinite(value)) return;
  state.customPanelThicknessOffset = clamp(value, -2, 2);
  rebuild();
});
linkRangeAndNumber("panelSubdivisionU", "panelSubdivisionUNum", (value) => {
  state.panelSubdivisionU = clamp(Math.round(value), 1, 8);
  syncInputPair("panelSubdivisionU", state.panelSubdivisionU);
  rebuild();
});
linkRangeAndNumber("panelSubdivisionV", "panelSubdivisionVNum", (value) => {
  state.panelSubdivisionV = clamp(Math.round(value), 1, 8);
  syncInputPair("panelSubdivisionV", state.panelSubdivisionV);
  rebuild();
});
linkRangeAndNumber("panelMorphStrength", "panelMorphStrengthNum", (value) => {
  state.panelMorphStrength = clamp(value, 0, 1);
  syncInputPair("panelMorphStrength", state.panelMorphStrength);
  rebuild();
});
nodes.panelWeightSubdivision?.addEventListener("change", (e) => {
  state.panelWeightSubdivision = !!e.target.checked;
  rebuild();
});
nodes.panelVariantRole?.addEventListener("change", (e) => {
  state.activePanelVariantRole = e.target.value || "base";
  renderPanelVariantControls();
  rebuild();
});
nodes.panelVariantAssignmentMode?.addEventListener("change", (e) => {
  state.panelVariantAssignmentMode = e.target.value === "single" ? "single" : "auto";
  renderPanelVariantControls();
  rebuild();
});
nodes.panelAttractorResponseMode?.addEventListener("change", (e) => {
  state.panelAttractorResponse.mode = e.target.value || "none";
  renderPanelAttractorResponseControls();
  rebuild();
});
nodes.panelAttractorResponseAmount?.addEventListener("input", (e) => {
  const value = Number(e.target.value);
  state.panelAttractorResponse.amount = clamp(Number.isFinite(value) ? value : 0, 0, 1);
  renderPanelAttractorResponseControls();
  rebuild();
});
const syncSupportScaffoldControls = () => {
  const scaffold = state.supportScaffold || {};
  if (nodes.supportScaffoldEnabled) nodes.supportScaffoldEnabled.checked = !!scaffold.enabled;
  setInputValue(nodes.supportScaffoldXCount, scaffold.xCount ?? 8, { force: true });
  setInputValue(nodes.supportScaffoldYCount, scaffold.yCount ?? 10, { force: true });
  setInputValue(nodes.supportScaffoldDepth, metersToCmInput(scaffold.ribDepth ?? 1.8), { force: true });
  setInputValue(nodes.supportScaffoldThickness, metersToCmInput(scaffold.ribThickness ?? 0.08), { force: true });
};
const updateSupportScaffoldFromControls = () => {
  state.supportScaffold = {
    ...state.supportScaffold,
    enabled: !!nodes.supportScaffoldEnabled?.checked,
    xCount: clamp(Math.round(Number(nodes.supportScaffoldXCount?.value || 8)), 2, 40),
    yCount: clamp(Math.round(Number(nodes.supportScaffoldYCount?.value || 10)), 2, 40),
    ribDepth: state.supportScaffold.ribDepth || 1.8,
    ribThickness: clamp(cmInputToMeters(nodes.supportScaffoldThickness?.value || 8), 0.01, 1),
  };
  syncSupportScaffoldControls();
};
[nodes.supportScaffoldEnabled, nodes.supportScaffoldXCount, nodes.supportScaffoldYCount, nodes.supportScaffoldDepth, nodes.supportScaffoldThickness].forEach((node) => {
  const event = node?.type === "checkbox" ? "change" : "input";
  node?.addEventListener(event, () => {
    updateSupportScaffoldFromControls();
    state.vaultDesignerPreview = true;
    rebuild();
  });
});
const syncTopologyLatticeControls = () => {
  const lattice = state.topologyLattice;
  if (nodes.topologyLatticeEnabled) nodes.topologyLatticeEnabled.checked = !!lattice.enabled;
  if (nodes.topologyLatticeShowU) nodes.topologyLatticeShowU.checked = lattice.showU !== false;
  if (nodes.topologyLatticeShowV) nodes.topologyLatticeShowV.checked = lattice.showV !== false;
  setInputValue(nodes.topologyLatticeRailWidth, metersToCmInput(lattice.railWidth), { force: true });
  setInputValue(nodes.topologyLatticeRailDepth, metersToCmInput(lattice.railDepth), { force: true });
  setInputValue(nodes.topologyLatticeFillet, metersToCmInput(lattice.fillet ?? 0), { force: true });
  setInputValue(nodes.topologyLatticeLayerGap, metersToCmInput(lattice.layerGap ?? 0), { force: true });
  setInputValue(nodes.topologyLatticeOpening, lattice.opening, { force: true });
  setInputValue(nodes.topologyLatticeDensity, lattice.density, { force: true });
  setInputValue(nodes.topologyLatticeBottomWidth, metersToCmInput(lattice.bottomWidth ?? lattice.railWidth), { force: true });
  setInputValue(nodes.topologyLatticeBottomDepth, metersToCmInput(lattice.bottomDepth ?? lattice.railDepth), { force: true });
  setInputValue(nodes.topologyLatticeBottomFillet, metersToCmInput(lattice.bottomFillet ?? lattice.fillet ?? 0), { force: true });
  setInputValue(nodes.topologyLatticeBottomOpening, lattice.bottomOpening ?? lattice.opening, { force: true });
  setInputValue(nodes.topologyLatticeBottomDensity, lattice.bottomDensity ?? lattice.density, { force: true });
  const bindings = lattice.loopBindings || {};
  if (nodes.topologyLoopBindingsEnabled) nodes.topologyLoopBindingsEnabled.checked = !!bindings.enabled;
  if (nodes.topologyLoopBindingsFamily) nodes.topologyLoopBindingsFamily.value = bindings.family || "both";
  setInputValue(nodes.topologyLoopBindingsEvery, bindings.every ?? 4, { force: true });
  setInputValue(nodes.topologyLoopBindingsWidth, metersToCmInput(bindings.width ?? 0.08), { force: true });
  setInputValue(nodes.topologyLoopBindingsDepth, metersToCmInput(bindings.depth ?? 0.08), { force: true });
  setInputValue(nodes.topologyLoopBindingsOffset, metersToCmInput(bindings.offset ?? 0), { force: true });
  setInputValue(nodes.topologyLoopBindingsFillet, metersToCmInput(bindings.fillet ?? 0.12), { force: true });
};
const updateTopologyLatticeFromControls = () => {
  state.topologyLattice = {
    ...state.topologyLattice,
    enabled: !!nodes.topologyLatticeEnabled?.checked,
    showU: nodes.topologyLatticeShowU ? !!nodes.topologyLatticeShowU.checked : state.topologyLattice.showU !== false,
    showV: nodes.topologyLatticeShowV ? !!nodes.topologyLatticeShowV.checked : state.topologyLattice.showV !== false,
    railWidth: clamp(cmInputToMeters(nodes.topologyLatticeRailWidth?.value || 12), 0.01, 2),
    railDepth: clamp(cmInputToMeters(nodes.topologyLatticeRailDepth?.value || 6), 0.005, 2),
    fillet: clamp(cmInputToMeters(nodes.topologyLatticeFillet?.value || 0), 0, 2),
    layerGap: clamp(cmInputToMeters(nodes.topologyLatticeLayerGap?.value || 0), 0, 2),
    opening: clamp(Number(nodes.topologyLatticeOpening?.value || 0.55), 0, 0.85),
    density: clamp(Math.round(Number(nodes.topologyLatticeDensity?.value || 3)), 0, 8),
    bottomWidth: clamp(cmInputToMeters(nodes.topologyLatticeBottomWidth?.value || 12), 0.01, 2),
    bottomDepth: clamp(cmInputToMeters(nodes.topologyLatticeBottomDepth?.value || 6), 0.005, 2),
    bottomFillet: clamp(cmInputToMeters(nodes.topologyLatticeBottomFillet?.value || 0), 0, 2),
    bottomOpening: clamp(Number(nodes.topologyLatticeBottomOpening?.value || 0.55), 0, 0.85),
    bottomDensity: clamp(Math.round(Number(nodes.topologyLatticeBottomDensity?.value || 3)), 0, 8),
    loopBindings: {
      enabled: !!nodes.topologyLoopBindingsEnabled?.checked,
      family: ["both", "u", "v"].includes(nodes.topologyLoopBindingsFamily?.value) ? nodes.topologyLoopBindingsFamily.value : "both",
      every: clamp(Math.round(Number(nodes.topologyLoopBindingsEvery?.value || 4)), 1, 20),
      width: clamp(cmInputToMeters(nodes.topologyLoopBindingsWidth?.value || 8), 0.01, 2),
      depth: clamp(cmInputToMeters(nodes.topologyLoopBindingsDepth?.value || 8), 0.005, 2),
      offset: clamp(cmInputToMeters(nodes.topologyLoopBindingsOffset?.value || 0), 0, 2),
      fillet: clamp(cmInputToMeters(nodes.topologyLoopBindingsFillet?.value || 12), 0, 2),
    },
  };
  syncTopologyLatticeControls();
};
[nodes.topologyLatticeEnabled, nodes.topologyLatticeShowU, nodes.topologyLatticeShowV, nodes.topologyLatticeRailWidth, nodes.topologyLatticeRailDepth, nodes.topologyLatticeFillet, nodes.topologyLatticeLayerGap, nodes.topologyLatticeOpening, nodes.topologyLatticeDensity, nodes.topologyLatticeBottomWidth, nodes.topologyLatticeBottomDepth, nodes.topologyLatticeBottomFillet, nodes.topologyLatticeBottomOpening, nodes.topologyLatticeBottomDensity, nodes.topologyLoopBindingsEnabled, nodes.topologyLoopBindingsFamily, nodes.topologyLoopBindingsEvery, nodes.topologyLoopBindingsWidth, nodes.topologyLoopBindingsDepth, nodes.topologyLoopBindingsOffset, nodes.topologyLoopBindingsFillet].forEach((node) => {
  const event = node?.type === "checkbox" || node?.tagName === "SELECT" ? "change" : "input";
  node?.addEventListener(event, () => { updateTopologyLatticeFromControls(); rebuild(); });
});
nodes.topologyLatticeGenerate?.addEventListener("click", () => {
  if (!state.blocks.length) {
    setPipelineStatus("Generate or apply the mesh topology before building a topology lattice.");
    return;
  }
  if (!state.importedTissueCells?.length && !state.blocks.some((block) => block.targetPoints?.length)) {
    setPipelineStatus("Topology Lattice needs an active quad carrier with mapped surface points.");
    return;
  }
  if (nodes.topologyLatticeEnabled) nodes.topologyLatticeEnabled.checked = true;
  updateTopologyLatticeFromControls();
  state.patternAppliedToModel = true;
  setPipelineStatus("Topology Lattice generated from shared quad-carrier edges.");
  rebuild();
});
[
  ["panelScaleX", "scaleX", (value) => clamp(Number(value) || 1, 0.05, 8)],
  ["panelScaleY", "scaleY", (value) => clamp(Number(value) || 1, 0.05, 8)],
  ["panelScaleZ", "scaleZ", (value) => clamp(Number(value) || 1, 0.05, 8)],
  ["panelRotateDeg", "rotateDeg", (value) => clamp(Number(value) || 0, -180, 180)],
].forEach(([nodeKey, transformKey, parse]) => {
  nodes[nodeKey]?.addEventListener("input", (e) => {
    setActivePanelVariantTransformValue(transformKey, parse(e.target.value));
    renderPanelVariantControls();
    rebuild();
  });
});
nodes.panelSurfaceOffset?.addEventListener("input", (e) => {
  setActivePanelVariantTransformValue("surfaceOffset", clamp(cmInputToMeters(e.target.value), -2, 2));
  renderPanelVariantControls();
  rebuild();
});
nodes.panelLongAxisAlign?.addEventListener("change", (e) => {
  const value = e.target.value || "strategy";
  setActivePanelVariantTransformValue("align", value);
  if (value !== "strategy") {
    state.strategy.rotation = value;
    setInputValue(nodes.strategyRotation, value, { force: true });
  }
  renderPanelVariantControls();
  rebuild();
});
[
  ["panelMirrorU", "mirrorU"],
  ["panelMirrorV", "mirrorV"],
  ["panelFlipNormal", "flipNormal"],
].forEach(([nodeKey, transformKey]) => {
  nodes[nodeKey]?.addEventListener("change", (e) => {
    setActivePanelVariantTransformValue(transformKey, !!e.target.checked);
    renderPanelVariantControls();
    rebuild();
  });
});

const ensureImportedFreeformApplied = () => {
  if (
    state.designMode === "Custom Import" &&
    state.vaultType === "Custom Imported Rhino Surface" &&
    state.importedSurface &&
    ["Freeform Courses", "NGon Cells", "NGon Adaptive"].includes(state.customPatternSource)
  ) {
    state.patternAppliedToModel = true;
    state.layers.blocks = true;
    if (byId("layerBlocks")) byId("layerBlocks").checked = true;
  }
};

const updateFreeformCountsFromBlockDimensions = () => {
  const bbox = state.importedSurfaceBbox;
  if (
    state.designMode !== "Custom Import" ||
    state.vaultType !== "Custom Imported Rhino Surface" ||
    !state.importedSurface ||
    !bbox ||
    bbox.isEmpty()
  ) return;
  const size = bbox.getSize(new THREE.Vector3());
  const targetCourseHeight = clamp(state.constraints.courseHeight || 0.65, 0.15, 8);
  const targetBlockLength = clamp(state.targetBlockWidth || 1.2, 0.15, 10);
  const uExtent = Math.max(0.15, size.x);
  const vExtent = Math.max(0.15, Math.max(size.z, size.y * 0.35));
  state.params.courseCount = Math.max(2, Math.min(240, Math.ceil(uExtent / targetCourseHeight)));
  state.params.blockCount = Math.max(2, Math.min(240, Math.ceil(vExtent / targetBlockLength)));
};

const applyBlockLengthCm = (valueCm) => {
  if (String(valueCm).trim() === "") return;
  const value = cmInputToMeters(valueCm);
  if (!Number.isFinite(value)) return;
  state.targetBlockWidth = Math.max(0.1, value);
  if (isBarrelLikeVault()) fitStartupParamsToConstraints(state.vaultType);
  ensureImportedFreeformApplied();
  updateFreeformCountsFromBlockDimensions();
  syncInputsFromState();
  rebuild();
};

const applyBlockWidthCm = (valueCm) => {
  if (String(valueCm).trim() === "") return;
  const value = cmInputToMeters(valueCm);
  if (!Number.isFinite(value)) return;
  state.constraints.courseHeight = clamp(value, 0.1, 5);
  if (isBarrelLikeVault()) fitStartupParamsToConstraints(state.vaultType);
  ensureImportedFreeformApplied();
  updateFreeformCountsFromBlockDimensions();
  syncInputsFromState();
  rebuild();
};

const applyBlockHeightCm = (valueCm) => {
  if (String(valueCm).trim() === "") return;
  const value = cmInputToMeters(valueCm);
  if (!Number.isFinite(value)) return;
  state.params.thickness = clamp(value, 0.2, 4);
  state.wallThickness = clamp(state.params.thickness, 0.1, 4);
  ensureImportedFreeformApplied();
  syncInputsFromState();
  rebuild();
};
[
  ["maxWeightSlider", "maxWeight"],
  ["maxTaperSlider", "maxTaper"],
].forEach(([sliderId, numberId]) => linkRangeAndNumber(sliderId, numberId));
[
  ["maxLengthSlider", "maxLength", "maxLength"],
  ["maxWidthSlider", "maxWidth", "maxWidth"],
  ["minThicknessSlider", "minThickness", "minThickness"],
  ["minEdgeLengthSlider", "minEdgeLength", "minEdgeLength"],
  ["fabToleranceSlider", "fabTolerance", "fabTolerance"],
].forEach(([sliderId, numberId, key]) => linkCmRangeAndNumber(sliderId, numberId, (value) => {
  state.constraints[key] = value;
  rebuild();
}));
if (byId("courseHeight")) byId("courseHeight").addEventListener("input", () => {
  applyBlockWidthCm(byId("courseHeight").value);
});
if (byId("blockHeight")) byId("blockHeight").addEventListener("input", () => {
  applyBlockHeightCm(byId("blockHeight").value);
});
nodes.blockPreviewLength?.addEventListener("input", (e) => applyBlockLengthCm(e.target.value));
nodes.blockPreviewWidth?.addEventListener("input", (e) => applyBlockWidthCm(e.target.value));
nodes.blockPreviewHeight?.addEventListener("input", (e) => applyBlockHeightCm(e.target.value));
nodes.ngonCellType?.addEventListener("change", (e) => {
  state.ngonCellType = ["Hex", "Diamond", "Quad", "Chebychev", "Triangle"].includes(e.target.value) ? e.target.value : "Hex";
  activateNgonPatternSource();
  rebuild();
});
linkRangeAndNumber("ngonShape", "ngonShapeNum", (value) => {
  state.ngonShape = clamp(value, 0, 1);
  activateNgonPatternSource();
  rebuild();
});
[
  nodes.strategyComponent,
  nodes.strategyComponentMode,
  nodes.strategyFill,
  nodes.strategyRotation,
  nodes.strategyRotationVariation,
  nodes.strategyComponentMapping,
  nodes.strategyThickness,
  nodes.strategyTopology,
  nodes.strategyDualBoundaryCleanup,
  nodes.strategyMerge,
].forEach((el) => {
  el?.addEventListener("change", () => {
    if (nodes.strategyPreset) nodes.strategyPreset.value = "custom";
    updateStrategyFromControls();
    setPipelineStatus(`Strategy updated: ${labelStrategyValue(state.strategy.field)} mapped as ${labelStrategyValue(state.strategy.component)}.`);
    rebuild();
  });
});
linkRangeAndNumber("strategyPatchSubdivision", "strategyPatchSubdivisionNum", (value) => {
  if (nodes.strategyPreset) nodes.strategyPreset.value = "custom";
  state.strategy.patchSubdivision = clamp(Math.round(value), 2, 12);
  syncInputPair("strategyPatchSubdivision", state.strategy.patchSubdivision);
  rebuild();
});
linkRangeAndNumber("strategyPatchSmoothing", "strategyPatchSmoothingNum", (value) => {
  if (nodes.strategyPreset) nodes.strategyPreset.value = "custom";
  state.strategy.patchSmoothing = clamp(Math.round(value), 0, 4);
  syncInputPair("strategyPatchSmoothing", state.strategy.patchSmoothing);
  rebuild();
});
nodes.strategyPreset?.addEventListener("change", (e) => {
  applyStrategyPreset(e.target.value);
});
[
  nodes.fieldWeightSource,
  nodes.fieldWeightFormula,
  nodes.fieldWeightSmoothing,
  nodes.fieldWeightSmoothingIterations,
  nodes.fieldWeightRandomSeed,
  nodes.fieldWeightMaterialStrategy,
  nodes.fieldWeightDriveDensity,
  nodes.fieldWeightDriveComponent,
  nodes.fieldWeightDriveThickness,
  nodes.fieldWeightDriveRotation,
  nodes.fieldWeightDriveTaper,
  nodes.fieldWeightDriveZones,
].forEach((el) => {
  const eventName = el?.type === "checkbox" || el?.tagName === "SELECT" ? "change" : "input";
  el?.addEventListener(eventName, () => {
    updateFieldWeightsFromControls();
    setInputValue(nodes.panelMorphWeightSource, state.fieldWeights.source, { force: true });
    setPipelineStatus(`Field weights updated: ${labelStrategyValue(state.fieldWeights.source)} driving strategy outputs.`);
    rebuild();
  });
});
nodes.panelMorphWeightSource?.addEventListener("change", (e) => {
  state.fieldWeights.source = e.target.value || state.fieldWeights.source;
  setInputValue(nodes.fieldWeightSource, state.fieldWeights.source, { force: true });
  setPipelineStatus(`Morph weight source: ${labelStrategyValue(state.fieldWeights.source)}.`);
  rebuild();
});
[
  nodes.contourFieldEnabled,
  nodes.contourFieldSource,
  nodes.contourFieldBands,
  nodes.contourMaskMode,
  nodes.showContourField,
  nodes.showContourMasks,
  nodes.showStreamlines,
  nodes.streamlineSource,
  nodes.streamlineCount,
  nodes.guideDirectionDeg,
  nodes.reactionDiffusion,
  nodes.reactionScale,
].forEach((el) => {
  const eventName = el?.type === "checkbox" || el?.tagName === "SELECT" ? "change" : "input";
  el?.addEventListener(eventName, () => {
    updateContourFieldFromControls();
    state.view2dOptions.showContourField = state.contourField.showContours;
    state.view2dOptions.showStreamlines = state.contourField.streamlines;
    setPipelineStatus(`Contour field updated: ${state.contourField.source}; mask ${state.contourField.maskMode}.`);
    rebuild();
  });
});
["alignScale", "alignOffsetU", "alignOffsetV", "alignRotation"].forEach((id) => {
  byId(id).addEventListener("input", (e) => {
    const key = id === "alignScale" ? "scale" : id === "alignOffsetU" ? "offsetU" : id === "alignOffsetV" ? "offsetV" : "rotationDeg";
    state.align[key] = Number(e.target.value);
    rebuild();
  });
});
[
  ["sourceTx", "tx"],
  ["sourceTy", "ty"],
  ["sourceTz", "tz"],
  ["sourceRx", "rx"],
  ["sourceRy", "ry"],
  ["sourceRz", "rz"],
  ["sourceScale", "scale"],
].forEach(([id, key]) => {
  const el = byId(id);
  if (!el) return;
  el.addEventListener("input", (e) => {
    if (String(e.target.value).trim() === "") return;
    const value = Number(e.target.value);
    if (!Number.isFinite(value)) return;
    if (usesSourceSizeInputs() && ["tx", "ty", "tz"].includes(key)) {
      const scale = Math.max(0.001, Number(state.sourceTransform.scale) || 1);
      const localValue = value / scale;
      if (key === "tx") {
        state.params.span = clamp(localValue - (state.params.thickness || 0) * 2, 4, 80);
      } else if (key === "ty") {
        state.params.length = clamp(localValue, 4, 120);
      } else if (key === "tz") {
        state.params.rise = clamp((localValue - (state.wallHeightOffset || 0) - (state.params.thickness || 0)) * 0.5, 2, 40);
      }
      fitStartupParamsToConstraints(state.vaultType);
      syncInputsFromState();
      rebuild();
      return;
    }
    const transformKey = key === "ty" ? "tz" : key === "tz" ? "ty" : key;
    state.sourceTransform[transformKey] = key === "scale" ? Math.max(0.001, value) : value;
    applySourceTransform();
    if (key === "scale" && usesSourceSizeInputs()) syncInputsFromState();
    if (state.patternAppliedToModel) rebuild();
  });
});
if (byId("resetSourceTransform")) byId("resetSourceTransform").addEventListener("click", () => {
  state.sourceTransform = { tx: 0, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, scale: 1 };
  syncInputsFromState();
  applySourceTransform();
  if (state.patternAppliedToModel) rebuild();
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
Object.entries(blockDesignerInputs).forEach(([id, key]) => {
  const update = (e) => { const el = e.target; state.blockDesigner[key] = el.tagName === "SELECT" ? el.value : Number(el.value); renderBlockDesigner(); };
  byId(id)?.addEventListener("input", update);
  byId(id)?.addEventListener("change", update);
});
byId("bdSaveTile")?.addEventListener("click", () => saveBlockDesignerTile());
document.addEventListener("click", (e) => {
  if (!e.target?.closest?.("#bdApplyTile")) return;
  e.preventDefault();
  applyBlockDesignerToVault();
});
byId("bdViews")?.addEventListener("click", (e) => { const btn = e.target.closest("button[data-bd-view]"); if (!btn) return; state.blockDesigner.view = btn.dataset.bdView; state.blockDesigner.userCamera = false; byId("bdViews").querySelectorAll("button").forEach(b => b.classList.toggle("active", b === btn)); renderBlockDesigner(); });
let blockDesignerSplitter = null;
byId("bdRowSplitter")?.addEventListener("pointerdown", (e) => { blockDesignerSplitter = "row"; e.currentTarget.setPointerCapture(e.pointerId); document.body.style.userSelect = "none"; });
byId("bdColumnSplitter")?.addEventListener("pointerdown", (e) => { blockDesignerSplitter = "column"; e.currentTarget.setPointerCapture(e.pointerId); document.body.style.userSelect = "none"; });
window.addEventListener("pointermove", (e) => {
  if (!blockDesignerSplitter) return;
  const workbench = byId("blockDesignerWorkbench"), center = workbench?.querySelector(".bd-center");
  if (!workbench || !center) return;
  if (blockDesignerSplitter === "row") {
    const rect = center.getBoundingClientRect();
    workbench.style.setProperty("--bd-pair-pane", `${clamp(e.clientY - rect.top - 38, 170, rect.height - 180)}px`);
  } else {
    const rect = workbench.getBoundingClientRect();
    workbench.style.setProperty("--bd-library-width", `${clamp(rect.right - e.clientX, 220, Math.max(220, rect.width * .45))}px`);
  }
  resize();
});
window.addEventListener("pointerup", () => { if (blockDesignerSplitter) { blockDesignerSplitter = null; document.body.style.userSelect = ""; } });
byId("vaultDesignerType")?.addEventListener("change", (e) => {
  state.imported2DPolys = null;
  vaultStartupSeen.add(e.target.value);
  if (byId("referencePreset")) byId("referencePreset").value = "Custom";
  runVaultSelectionPipeline(e.target.value);
});
byId("regenerateVaultDesign")?.addEventListener("click", () => {
  runVaultSelectionPipeline(state.vaultType);
});
byId("exportSurfaceToBlocks")?.addEventListener("click", () => {
  state.vaultDesignerPreview = true;
  state.blocksGeneratedFromTrait = false;
  state.view2dOptions.showBlocks = false;
  setPipelineStatus("Vault surface exported to Block Designer. Choose and apply a block strategy when ready.");
  renderVaultDesigner();
  setToolTab("block-designer");
  rebuild();
});
byId("openCustomImportTools")?.addEventListener("click", () => {
  state.designMode = "Custom Import";
  state.vaultType = "Custom Imported Rhino Surface";
  if (byId("designMode")) byId("designMode").value = "Custom Import";
  if (byId("vaultType")) byId("vaultType").value = state.vaultType;
  if (byId("vaultDesignerType")) byId("vaultDesignerType").value = state.vaultType;
  state.vaultDesignerPreview = true;
  renderVaultDesigner();
  syncInputsFromState();
  setToolTab("source");
  setPipelineStatus("Custom host tools are open. Import a 3DM, OBJ, STL, GLB, or saved host surface here.");
  rebuild();
});
if (byId("constructionTemplate")) byId("constructionTemplate").addEventListener("change", (e) => {
  applyConstructionTemplate(e.target.value);
});
byId("subdivision").addEventListener("change", (e) => { state.pattern = e.target.value; rebuild(); });
nodes.customPatternSource?.addEventListener("change", (e) => {
  setCustomPatternSource(e.target.value);
});
nodes.workflowPatternSource?.addEventListener("change", (e) => {
  setCustomPatternSource(e.target.value);
});
if (byId("surfacePrinciple")) byId("surfacePrinciple").addEventListener("change", (e) => {
  state.surfacePrinciple = e.target.value;
  state.activeTraitConstructionStep = null;
  updateStereotomyProcess(state.pipelineStage || 1);
  draw2d();
  renderPrecedent();
  renderTraitConstructionSteps();
});
if (byId("traitStep")) byId("traitStep").addEventListener("change", (e) => {
  state.traitStep = e.target.value;
  state.activeTraitConstructionStep = null;
  draw2d();
  renderTraitConstructionSteps();
});
if (byId("stereotomyStep")) byId("stereotomyStep").addEventListener("change", (e) => {
  state.stereotomyStep = e.target.value;
  state.activeTraitConstructionStep = null;
  draw2d();
  renderTraitConstructionSteps();
});
const applyBlockGenerationStep = (step) => {
  state.blockStep = step;
  state.blocksGeneratedFromTrait = true;
  state.view2dOptions.showBlocks = true;
  state.view2dOptions.showVertices = step === "Editable Blocks";
  state.view2dOptions.showBlockIds = step === "Numbered Blocks" || step === "Fabrication Preview";
  state.view2dOptions.showBlockMetrics = step === "Fabrication Preview";
  state.view2dOptions.showFabricationChecks = step === "Fabrication Preview";
  state.view2dOptions.showFabricationLegend = step === "Fabrication Preview" || state.view2dOptions.showFabricationLegend;
  syncInputsFromState();
  draw2d();
  renderTraitConstructionSteps();
};
if (byId("blockStep")) byId("blockStep").addEventListener("change", (e) => {
  applyBlockGenerationStep(e.target.value);
});
if (byId("fabricationCheck")) byId("fabricationCheck").addEventListener("change", (e) => {
  state.fabricationCheck = e.target.value;
  state.view2dOptions.showFabricationChecks = true;
  state.view2dOptions.showFabricationLegend = true;
  syncInputsFromState();
  draw2d();
  renderTraitConstructionSteps();
});
if (byId("projectionOperation")) byId("projectionOperation").addEventListener("change", (e) => {
  state.projectionOperation = e.target.value;
  renderProjectionOperationDetails();
});
if (byId("applyProjectionOperation")) byId("applyProjectionOperation").addEventListener("click", () => {
  applyProjectionDevelopmentOperation(state.projectionOperation);
});
if (byId("jointPrinciple")) byId("jointPrinciple").addEventListener("change", (e) => {
  state.jointPrinciple = e.target.value;
  renderJointPrincipleDetails();
});
if (byId("applyJointPrinciple")) byId("applyJointPrinciple").addEventListener("click", () => {
  applyJointPrinciple(state.jointPrinciple);
});
if (byId("drawingMode2d")) byId("drawingMode2d").addEventListener("change", (e) => {
  state.activeTraitConstructionStep = null;
  apply2dDrawingMode(e.target.value);
  syncInputsFromState();
  draw2d();
  renderTraitConstructionSteps();
});
[
  ["show2dReference", "showReferenceGeometry"],
  ["show2dTraitLines", "showTraitLines"],
  ["show2dProjectionRays", "showProjectionRays"],
  ["show2dCourseDivisions", "showCourseDivisions"],
  ["show2dJointNormals", "showJointNormals"],
  ["show2dDevelopmentLines", "showDevelopmentLines"],
  ["show2dDerivedStereotomy", "showDerivedStereotomy"],
  ["show2dBedJoints", "showBedJoints"],
  ["show2dHeadJoints", "showHeadJoints"],
  ["show2dKeystoneZone", "showKeystoneZone"],
  ["show2dTrueShapePanels", "showTrueShapePanels"],
  ["show2dBlocks", "showBlocks"],
  ["show2dBlockIds", "showBlockIds"],
  ["show2dBlockMetrics", "showBlockMetrics"],
  ["show2dFabricationChecks", "showFabricationChecks"],
  ["show2dFabricationLegend", "showFabricationLegend"],
  ["show2dAnnotations", "showAnnotations"],
  ["show2dSpanDimension", "showSpanDimension"],
  ["show2dRiseDimension", "showRiseDimension"],
  ["show2dThicknessDimension", "showThicknessDimension"],
  ["show2dAngleLabels", "showAngleLabels"],
  ["show2dRadiusLabels", "showRadiusLabels"],
  ["show2dCourseCount", "showCourseCount"],
  ["show2dBlockWidth", "showBlockWidth"],
  ["show2dJointGap", "showJointGap"],
  ["show2dTrueLength", "showTrueLength"],
  ["show2dSurfaceFamilyLabel", "showSurfaceFamilyLabel"],
  ["show2dVertices", "showVertices"],
  ["show2dGuides", "showGuides"],
  ["show2dLabels", "showLabels"],
  ["show2dCutLines", "showCutLines"],
].forEach(([id, key]) => {
  const el = byId(id);
  if (!el) return;
  el.addEventListener("change", (e) => {
    state.view2dOptions[key] = e.target.checked;
    if (!state.view2dOptions.showVertices) state.dragging = null;
    draw2d();
  });
});
if (byId("generateBlocksFromTrait")) byId("generateBlocksFromTrait").addEventListener("click", () => {
  state.vaultDesignerPreview = false;
  state.blockStep = "Generated Voussoirs";
  state.blocksGeneratedFromTrait = true;
  state.pipelineStage = Math.max(state.pipelineStage || 0, 5);
  if (
    state.designMode === "Custom Import" &&
    state.vaultType === "Custom Imported Rhino Surface" &&
    ["NGon Cells", "NGon Adaptive"].includes(state.customPatternSource)
  ) {
    activateNgonPatternSource();
  }
  updateStereotomyProcess(5);
  state.view2dOptions.showBlocks = true;
  state.view2dOptions.showVertices = false;
  state.view2dOptions.showBlockIds = false;
  state.view2dOptions.showBlockMetrics = false;
  syncInputsFromState();
  setPipelineStatus("Generated editable voussoir blocks from the current trait and derived stereotomy.");
  rebuild();
});
linkRangeAndNumber("guideDensity2d", "guideDensity2dNum", (value) => {
  state.view2dOptions.guideDensity = clamp(Math.round(value), 3, 18);
  syncInputsFromState();
  draw2d();
});
[
  ["blockLineColor2d", "blockStroke"],
  ["blockFillColor2d", "blockFill"],
].forEach(([id, key]) => {
  const el = byId(id);
  if (!el) return;
  el.addEventListener("input", (e) => {
    state.view2dOptions[key] = e.target.value;
    draw2d();
  });
});
linkRangeAndNumber("blockFillOpacity2d", "blockFillOpacity2dNum", (value) => {
  state.view2dOptions.blockFillOpacity = clamp(value, 0, 0.6);
  syncInputsFromState();
  draw2d();
});
[
  ["springing", "entitySpringing"],
  ["axis", "entityAxis"],
  ["apex", "entityApex"],
  ["intrados", "entityIntrados"],
  ["extrados", "entityExtrados"],
  ["neutral", "entityNeutral"],
  ["imposts", "entityImposts"],
  ["skewAxis", "entitySkewAxis"],
  ["groinLine", "entityGroinLine"],
].forEach(([key, id]) => {
  const toggle = byId(id);
  const color = byId(`${id}Color`);
  if (toggle) toggle.addEventListener("change", (e) => {
    state.constructionEntities[key].show = e.target.checked;
    draw2d();
  });
  if (color) color.addEventListener("input", (e) => {
    state.constructionEntities[key].color = e.target.value;
    draw2d();
  });
});
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
[
  ["layerSourceModel", "sourceModel"],
  ["layerBuiltInForm", "builtInForm"],
  ["layerBlocks", "blocks"],
  ["layerCopies", "copies"],
  ["layerSupports", "supports"],
  ["layerGuides", "guides"],
].forEach(([id, key]) => {
  const el = byId(id);
  if (!el) return;
  el.addEventListener("change", (e) => {
    state.layers[key] = !!e.target.checked;
    applyLayerVisibility();
    if (key === "guides") draw2d();
  });
});
if (byId("toggleImportedSurface")) {
  byId("toggleImportedSurface").addEventListener("click", () => {
    const nextVisible = !getOriginalVaultSurfaceVisibility();
    setOriginalVaultSurfaceVisibility(nextVisible);
    applyLayerVisibility();
    setPipelineStatus(nextVisible ? "Original vault/source surface visible." : "Original vault/source surface hidden; block panels remain visible.");
  });
}
document.querySelectorAll("[data-transform-tool]").forEach((button) => {
  button.addEventListener("click", () => {
    state.transformTool = button.dataset.transformTool || "select";
    syncTransformToolbar();
    setPipelineStatus(`Transform tool active: ${state.transformTool}.`);
  });
});
document.querySelectorAll("[data-snap]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.snap;
    state.snaps[key] = !state.snaps[key];
    syncTransformToolbar();
    const enabled = Object.entries(state.snaps).filter(([, on]) => on).map(([name]) => name).join(", ") || "none";
    setPipelineStatus(`Snaps enabled: ${enabled}.`);
  });
});
if (byId("copyGeometry")) byId("copyGeometry").addEventListener("click", copyActiveGeometry);
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
byId("zoomExtents").addEventListener("click", () => zoomAllExtents());
if (byId("zoomExtentsTop")) byId("zoomExtentsTop").addEventListener("click", () => zoomAllExtents());
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
const isBlockDesignerApplyContext = () => {
  const activeTab = document.querySelector(".tool-scroll")?.getAttribute("data-active-tab");
  const workbench = byId("blockDesignerWorkbench");
  return activeTab === "block-designer" ||
    document.body.classList.contains("block-designer-active") ||
    (workbench && !workbench.classList.contains("hidden"));
};

if (byId("applyPatternToModel")) byId("applyPatternToModel").addEventListener("click", async () => {
  if (isBlockDesignerApplyContext()) {
    await applyBlockDesignerToVault();
    return;
  }
  state.vaultDesignerPreview = false;
  state.patternAppliedToModel = true;
  state.layers.blocks = true;
  state.layers.supports = true;
  if (byId("layerBlocks")) byId("layerBlocks").checked = true;
  if (byId("layerSupports")) byId("layerSupports").checked = true;
  state.view2dOptions.showReferenceGeometry = true;
  state.view2dOptions.showGuides = true;
  state.view2dOptions.mode = "Trait / Epure";
  setPipelineStatus("Blocks applied to vault model.");
  rebuild();
});
if (byId("showSolidOnly")) byId("showSolidOnly").addEventListener("click", () => {
  state.vaultDesignerPreview = true;
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
if (nodes.traitConstructionSteps) {
  nodes.traitConstructionSteps.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-trait-construction-step]");
    if (!btn) return;
    applyTraitConstructionStep(Number(btn.dataset.traitConstructionStep));
  });
}
byId("runChecks").addEventListener("click", () => {
  state.pipelineStage = Math.max(state.pipelineStage || 0, 6);
  updateStereotomyProcess(6);
  runChecksAndAssemblyPreview();
  syncInputsFromState();
  setPipelineStatus("Fabrication checks active: highlighting blocks against the selected tolerance and constraint criteria.");
  rebuild();
});
byId("resetCustomTiles")?.addEventListener("click", resetCustomTiles);
nodes.saveTileAsset?.addEventListener("click", () => saveLibraryCandidate("tile"));
nodes.saveHostAsset?.addEventListener("click", () => saveLibraryCandidate("host"));
nodes.saveEditedPanelAsset?.addEventListener("click", () => saveCurrentEditedPanelVariant({ duplicate: false }));
nodes.duplicatePanelVariant?.addEventListener("click", () => saveCurrentEditedPanelVariant({ duplicate: true }));
nodes.hostLibrarySelect?.addEventListener("change", () => renderAssetLibraryPreview("host"));
nodes.panelLibrarySelect?.addEventListener("change", () => renderAssetLibraryPreview("panel"));
nodes.tileLibrarySelect?.addEventListener("change", () => renderAssetLibraryPreview("tile"));
nodes.loadHostAsset?.addEventListener("click", () => loadSelectedLibraryAsset("host"));
nodes.deleteHostAsset?.addEventListener("click", () => deleteSelectedLibraryAsset("host"));
nodes.loadPanelAsset?.addEventListener("click", () => loadSelectedLibraryAsset("panel"));
nodes.deletePanelAsset?.addEventListener("click", () => deleteSelectedLibraryAsset("panel"));
nodes.loadTileAsset?.addEventListener("click", () => loadSelectedLibraryAsset("tile"));
nodes.deleteTileAsset?.addEventListener("click", () => deleteSelectedLibraryAsset("tile"));
byId("import2d").addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  await apply2dImportFile(f);
});
byId("importTopologyMesh")?.addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  await applyTopologyMeshFile(f);
});
nodes.importCustomPanel?.addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  await applyCustomPanelFile(f);
});
nodes.importCustomPanelMorph?.addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const ok = await applyMorphPanelFile(f);
  if (!ok) e.target.value = "";
});
byId("import3d").addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  await applyHost3dFile(f);
});

const buildMergedFabricationMeshPayload = () => {
  const vertices = [];
  const faces = [];
  const blockRanges = [];
  state.blocks.forEach((block) => {
    try {
      const metrics = buildBlockMesh(block);
      const position = metrics.geometry.getAttribute("position");
      if (!position?.count) return;
      const startVertex = vertices.length;
      for (let i = 0; i < position.count; i++) {
        vertices.push([
          Number(position.getX(i).toFixed(6)),
          Number(position.getY(i).toFixed(6)),
          Number(position.getZ(i).toFixed(6)),
        ]);
      }
      const index = metrics.geometry.getIndex();
      const startFace = faces.length;
      if (index) {
        for (let i = 0; i < index.count; i += 3) {
          faces.push([
            startVertex + index.getX(i),
            startVertex + index.getX(i + 1),
            startVertex + index.getX(i + 2),
          ]);
        }
      } else {
        for (let i = 0; i < position.count; i += 3) {
          faces.push([startVertex + i, startVertex + i + 1, startVertex + i + 2]);
        }
      }
      blockRanges.push({
        id: block.id,
        component: block.componentVariant || block.componentType,
        panelVariantRole: block.panelVariantRole || null,
        startVertex,
        vertexCount: position.count,
        startFace,
        faceCount: faces.length - startFace,
      });
      metrics.geometry.dispose();
    } catch (err) {
      console.warn("merged fabrication export skipped block", block.id, err);
    }
  });
  return {
    type: "merged-fabrication-mesh",
    mergeMode: state.strategy.merge,
    vertices,
    faces,
    blockRanges,
  };
};

const downloadTextFile = (filename, content, type = "text/plain") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const sanitizeExportName = (value) => String(value || "block").replace(/[^a-z0-9_-]+/gi, "_");

const collectBlockExportTriangles = () => {
  const out = [];
  state.blocks.forEach((block) => {
    let metrics = null;
    try {
      metrics = buildBlockMesh(block);
      const geometry = metrics.geometry;
      const position = geometry?.getAttribute("position");
      if (!position?.count) return;
      const vertices = [];
      for (let i = 0; i < position.count; i++) {
        vertices.push(new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i)));
      }
      const index = geometry.getIndex();
      const triangles = [];
      if (index?.count) {
        for (let i = 0; i < index.count; i += 3) triangles.push([index.getX(i), index.getX(i + 1), index.getX(i + 2)]);
      } else {
        for (let i = 0; i < vertices.length - 2; i += 3) triangles.push([i, i + 1, i + 2]);
      }
      if (triangles.length) out.push({ id: block.id, vertices, triangles });
    } catch (err) {
      console.warn("Block export skipped", block.id, err);
    } finally {
      metrics?.geometry?.dispose?.();
    }
  });
  return out;
};

const serializeBlocksObj = (parts) => {
  const lines = ["# Lithic Lab block export", `# blocks ${parts.length}`];
  let vertexOffset = 1;
  parts.forEach((part) => {
    lines.push(`o ${sanitizeExportName(part.id)}`);
    part.vertices.forEach((v) => lines.push(`v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}`));
    part.triangles.forEach(([a, b, c]) => lines.push(`f ${a + vertexOffset} ${b + vertexOffset} ${c + vertexOffset}`));
    vertexOffset += part.vertices.length;
  });
  return `${lines.join("\n")}\n`;
};

const serializeBlocksStl = (parts) => {
  const lines = ["solid lithic_lab_blocks"];
  parts.forEach((part) => {
    lines.push(`  solid ${sanitizeExportName(part.id)}`);
    part.triangles.forEach(([a, b, c]) => {
      const va = part.vertices[a];
      const vb = part.vertices[b];
      const vc = part.vertices[c];
      const normal = new THREE.Vector3().crossVectors(vb.clone().sub(va), vc.clone().sub(va)).normalize();
      lines.push(`    facet normal ${normal.x.toFixed(6)} ${normal.y.toFixed(6)} ${normal.z.toFixed(6)}`);
      lines.push("      outer loop");
      [va, vb, vc].forEach((v) => lines.push(`        vertex ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}`));
      lines.push("      endloop");
      lines.push("    endfacet");
    });
    lines.push(`  endsolid ${sanitizeExportName(part.id)}`);
  });
  lines.push("endsolid lithic_lab_blocks");
  return `${lines.join("\n")}\n`;
};

const exportBlocksMesh = (format) => {
  if (!state.blocks.length) {
    setPipelineStatus("No blocks to export. Generate or apply blocks first.");
    return;
  }
  const parts = collectBlockExportTriangles();
  if (!parts.length) {
    setPipelineStatus("No block mesh geometry could be exported.");
    return;
  }
  if (format === "stl") downloadTextFile("lithic-lab-blocks.stl", serializeBlocksStl(parts), "model/stl");
  else downloadTextFile("lithic-lab-blocks.obj", serializeBlocksObj(parts), "text/plain");
  setPipelineStatus(`Exported ${parts.length} block solids as ${format.toUpperCase()}.`);
};

const buildTopologyGraphPayload = () => {
  const nodesPayload = state.blocks.map((block) => ({
    id: block.id,
    component: block.componentVariant || block.componentType || state.strategy.component,
    panelVariantRole: block.panelVariantRole || null,
    zone: block.zone || "field",
    anchorUv: block.fieldWeights?.anchorUv || block.anchorUv || polygonCentroidUv(block.uv),
    failed: block.failed || [],
  }));
  const edgeMap = new Map();
  state.blocks.forEach((block) => {
    (block.uv || []).forEach((point, i) => {
      const next = block.uv[(i + 1) % block.uv.length];
      if (!next) return;
      const key = topologyEdgeKey(point, next);
      if (!edgeMap.has(key)) edgeMap.set(key, []);
      edgeMap.get(key).push(block.id);
    });
  });
  const edges = [];
  edgeMap.forEach((owners, edgeKey) => {
    if (owners.length < 2) return;
    for (let i = 0; i < owners.length - 1; i++) {
      for (let j = i + 1; j < owners.length; j++) {
        edges.push({
          source: owners[i],
          target: owners[j],
          seam: edgeKey,
          type: owners.length > 2 ? "non-manifold-adjacency" : "shared-edge",
        });
      }
    }
  });
  return {
    nodeCount: nodesPayload.length,
    edgeCount: edges.length,
    nodes: nodesPayload,
    edges,
  };
};

const buildPerFaceLabelsPayload = () => state.blocks.map((block) => ({
  blockId: block.id,
  component: block.componentVariant || block.componentType || state.strategy.component,
  panelVariantRole: block.panelVariantRole || null,
  materialTag: block.materialTag || null,
  faces: [
    { label: "intrados-bed", role: "bed", side: state.barrelOffsetSide === "Outside" ? "inner" : "source" },
    { label: "extrados-bed", role: "extrados", side: state.barrelOffsetSide === "Outside" ? "source" : "outer" },
    ...(block.uv || []).map((_, index) => ({
      label: `joint-${index + 1}`,
      role: "joint",
      edgeIndex: index,
      seamPolicy: state.strategy.merge,
    })),
  ],
}));

const buildAssemblyOrderPayload = () => state.blocks
  .map((block) => ({
    id: block.id,
    zone: block.zone || "field",
    component: block.componentVariant || block.componentType || state.strategy.component,
    panelVariantRole: block.panelVariantRole || null,
    anchorUv: block.fieldWeights?.anchorUv || block.anchorUv || polygonCentroidUv(block.uv),
    supportWeight: block.fieldWeights?.supportZone || 0,
    compressionWeight: block.fieldWeights?.compressionIntensity || 0,
    boundaryWeight: block.fieldWeights?.boundaryZone || 0,
  }))
  .sort((a, b) => (
    b.supportWeight - a.supportWeight ||
    b.boundaryWeight - a.boundaryWeight ||
    b.compressionWeight - a.compressionWeight ||
    a.anchorUv[1] - b.anchorUv[1] ||
    a.anchorUv[0] - b.anchorUv[0]
  ))
  .map((item, index) => ({ ...item, step: index + 1 }));

const buildBlockSolidIndexPayload = () => state.blocks.map((block) => ({
  id: block.id,
  component: block.componentVariant || block.componentType || state.strategy.component,
  panelVariantRole: block.panelVariantRole || null,
  materialTag: block.materialTag || null,
  weightBand: block.weightBand || null,
  fillCellType: block.fillCellType || state.strategy.fill,
  contourBand: block.contourBand ?? null,
  contourValue: block.contourValue ?? null,
  reactionValue: block.reactionValue ?? null,
  editorOperation: block.editorOperation || null,
  manualPanelVariantRole: block.manualPanelVariantRole || null,
  orientationShift: block.orientationShift || 0,
  orientationReversed: !!block.orientationReversed,
  geometryType: block.metrics?.geometryType || "offset-prism",
  uv: block.uv,
  topFace: block.metrics?.q?.map((p) => [Number(p.x.toFixed(6)), Number(p.y.toFixed(6)), Number(p.z.toFixed(6))]) || [],
  metrics: block.metrics ? {
    length: block.metrics.avgLength,
    width: block.metrics.avgWidth,
    volume: block.metrics.volume,
    weight: block.metrics.weight,
    minEdge: block.metrics.minEdge,
    uvArea: block.metrics.uvArea,
    jointFaceType: block.metrics.jointFaceType,
    deformation: block.metrics.deformation || null,
  } : null,
}));

const buildFabricationPackagePayload = (mergedMesh = null) => {
  const hostField = getHostField();
  const carrierSummary = getTissueCarrierSummary();
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    strategySettings: getActiveStrategy(),
    customPanelComponent: state.customPanel,
    customPanelMapping: {
      seamAllowance: state.customPanelSeamAllowance,
      thicknessMode: state.strategy.thickness,
      thicknessScale: state.customPanelThicknessScale,
      thicknessOffset: state.customPanelThicknessOffset,
      panelSubdivisionU: state.panelSubdivisionU,
      panelSubdivisionV: state.panelSubdivisionV,
      fieldWeightedMorph: state.panelWeightSubdivision,
      morphStrength: state.panelMorphStrength,
      activePanelVariantRole: state.activePanelVariantRole,
      panelVariantAssignmentMode: state.panelVariantAssignmentMode,
      panelVariantTransforms: ensurePanelVariantTransforms(),
    },
    fieldWeightSettings: state.fieldWeights,
    contourFieldSettings: state.contourField,
    streamlines: {
      source: state.contourField.streamlineSource,
      count: state.contourField.streamlineCount,
      guideDirectionDeg: state.contourField.guideDirectionDeg,
    },
    materialStrategy: {
      mode: state.fieldWeights.materialStrategy,
      bands: [
        { id: "low", range: [0, 0.34], materialTag: "ashlar-light", component: "ashlar" },
        { id: "middle", range: [0.34, 0.56], materialTag: "voussoir-standard", component: "voussoir" },
        { id: "upper", range: [0.56, 0.78], materialTag: "interlock-transition", component: "interlock" },
        { id: "high", range: [0.78, 1], materialTag: "compression-heavy", component: "keyedVoussoir" },
      ],
    },
    hostDimensions: {
      ...getBaseSourceDimensions(),
      fieldType: hostField.type,
      boundary: hostField.boundaryAt(0.5, 0.5),
      centerCurvature: hostField.curvatureAt(0.5, 0.5),
    },
    panelCarrier: {
      status: carrierSummary.title,
      lines: carrierSummary.lines,
      faceCount: state.importedTissueCells?.length || 0,
      stats: state.importedTopologyMeshStats,
    },
    fieldWeights: state.blocks.map((block) => ({
      blockId: block.id,
      zone: block.zone || "field",
      panelVariantRole: block.panelVariantRole || null,
      pinnedBoundary: !!block.pinnedBoundary,
      supportMarked: !!block.supportMarked,
      weights: block.fieldWeights || computeBlockFieldWeights(block),
    })),
    topologyGraph: buildTopologyGraphPayload(),
    blockSolids: buildBlockSolidIndexPayload(),
    perFaceLabels: buildPerFaceLabelsPayload(),
    assemblyOrder: buildAssemblyOrderPayload(),
    tolerances: {
      fabrication: state.constraints.fabTolerance,
      jointGap: state.constraints.jointGap,
      minEdgeLength: state.constraints.minEdgeLength,
      maxTaper: state.constraints.maxTaper,
      maxWeight: state.constraints.maxWeight,
    },
    outputs: {
      jsonPerBlock: true,
      mergedFabricationMesh: !!mergedMesh,
      objPerBlock: false,
      glbPerBlock: false,
    },
    mergedFabricationMesh: mergedMesh,
  };
};

byId("exportJson").addEventListener("click", () => {
  state.historicalValidationResults = evaluateHistoricalFamilyValidation();
  const blockNgonTopology = analyzeBlockNgonTopology();
  const blockPlanarity = analyzeBlockPlanarity();
  const hostField = getHostField();
  const mergedFabricationMesh = state.strategy.merge === "merge-fabrication" ? buildMergedFabricationMeshPayload() : null;
  const fabricationPackage = buildFabricationPackagePayload(mergedFabricationMesh);
  const payload = {
    designMode: state.designMode,
    vaultType: state.vaultType,
    sourceModel: {
      name: state.importedModelName,
      stats: state.importedModelStats,
      topology: state.importedTopology ? {
        edgeCount: state.importedTopology.edgeCount,
        boundaryEdgeCount: state.importedTopology.boundaryEdgeCount,
        featureEdgeCount: state.importedTopology.featureEdgeCount,
        nonManifoldEdgeCount: state.importedTopology.nonManifoldEdgeCount,
        courseHintCount: state.importedTopology.courseHints?.length || 0,
        spanHintCount: state.importedTopology.spanHints?.length || 0,
      } : null,
      transform: state.sourceTransform,
    },
    topologyMesh: state.importedTopologyMeshStats ? {
      name: state.importedTopologyMeshName,
      stats: state.importedTopologyMeshStats,
      faceCount: state.importedTopologyPolys?.length || 0,
    } : null,
    surfacePrinciple: state.surfacePrinciple,
    constructionTemplate: state.constructionTemplate,
    constructionTemplateMeta: constructionTemplateCatalog[state.constructionTemplate] || null,
    projectionOperation: state.projectionOperation,
    projectionOperationMeta: projectionDevelopmentOperations[state.projectionOperation] || null,
    jointPrinciple: state.jointPrinciple,
    jointPrincipleMeta: jointPrinciples[state.jointPrinciple] || null,
    drawingPreset: state.drawingPreset,
    activeTraitFocus: state.activeTraitFocus,
    traitStep: state.traitStep,
    stereotomyStep: state.stereotomyStep,
    blockStep: state.blockStep,
    fabricationCheck: state.fabricationCheck,
    historicalValidationResults: state.historicalValidationResults,
    ngonDiagnostics: {
      blockTopology: blockNgonTopology,
      blockPlanarity: {
        ...blockPlanarity,
        tolerance: state.constraints.fabTolerance,
      },
      sourceTopology: state.importedTopology ? {
        meshCount: state.importedTopology.meshCount,
        triangleCount: state.importedTopology.triangleCount,
        vertexCount: state.importedTopology.vertexCount,
        edgeCount: state.importedTopology.edgeCount,
        boundaryEdgeCount: state.importedTopology.boundaryEdgeCount,
        boundaryVertexCount: state.importedTopology.boundaryVertexCount,
        featureEdgeCount: state.importedTopology.featureEdgeCount,
        nonManifoldEdgeCount: state.importedTopology.nonManifoldEdgeCount,
        averageValence: state.importedTopology.averageValence,
        maxValence: state.importedTopology.maxValence,
      } : null,
    },
    traitConstructionSteps: traitConstructionTemplates[state.vaultType] || defaultTraitConstructionSteps,
    activeTraitConstructionStep: state.activeTraitConstructionStep,
    blocksGeneratedFromTrait: state.blocksGeneratedFromTrait,
    constructionEntities: state.constructionEntities,
    layers: state.layers,
    strategyViewMode: state.strategyViewMode,
    view2dOptions: state.view2dOptions,
    transformTool: state.transformTool,
    snaps: state.snaps,
    copiedGeometryCount: state.copiedGeometryCount,
    registrationMode: state.registrationMode,
    structuralDirection: state.structuralDirection,
    strategy: getActiveStrategy(),
    customPanelComponent: state.customPanel,
    customPanelMapping: {
      seamAllowance: state.customPanelSeamAllowance,
      thicknessMode: state.strategy.thickness,
      thicknessScale: state.customPanelThicknessScale,
      thicknessOffset: state.customPanelThicknessOffset,
      panelSubdivisionU: state.panelSubdivisionU,
      panelSubdivisionV: state.panelSubdivisionV,
      fieldWeightedMorph: state.panelWeightSubdivision,
      morphStrength: state.panelMorphStrength,
      activePanelVariantRole: state.activePanelVariantRole,
      panelVariantAssignmentMode: state.panelVariantAssignmentMode,
      panelVariantTransforms: ensurePanelVariantTransforms(),
    },
    fieldWeightSettings: state.fieldWeights,
    contourFieldSettings: state.contourField,
    hostField: {
      type: hostField.type,
      boundary: hostField.boundaryAt(0.5, 0.5),
      centerCurvature: hostField.curvatureAt(0.5, 0.5),
    },
    mergedFabricationMesh,
    fabricationPackage,
    customPatternSource: state.customPatternSource,
    supportCount: state.supportCount,
    forceLmin: state.forceLmin,
    forceLmax: state.forceLmax,
    stereotomyProcess: {
      pipelineStage: state.pipelineStage,
      ...state.stereotomyProcess,
    },
    params: state.params,
    align: state.align,
    constraints: state.constraints,
    blocks: state.blocks.map((b) => ({
      id: b.id,
      isKeystone: !!b.isKeystone,
      strategy: b.strategy || getActiveStrategy(),
      componentType: b.componentType || state.strategy.component,
      componentVariant: b.componentVariant || b.componentType || state.strategy.component,
      panelVariantRole: b.panelVariantRole || null,
      manualPanelVariantRole: b.manualPanelVariantRole || null,
      mapping: b.mapping || null,
      zone: b.zone || null,
      fieldWeights: b.fieldWeights || null,
      weightBand: b.weightBand || null,
      materialTag: b.materialTag || null,
      densityDriven: !!b.densityDriven,
      taperBias: b.taperBias || 0,
      contourBand: b.contourBand ?? null,
      contourValue: b.contourValue ?? null,
      reactionValue: b.reactionValue ?? null,
      maskedByContour: !!b.maskedByContour,
      pinnedBoundary: !!b.pinnedBoundary,
      supportMarked: !!b.supportMarked,
      editorOperation: b.editorOperation || null,
      fillCellType: b.fillCellType || null,
      parentCellId: b.parentCellId || null,
      rotationShift: b.rotationShift || 0,
      generatorStrategy: b.generatorStrategy || null,
      generatorStrategyLabel: b.generatorStrategyLabel || null,
      uv: b.uv,
      failed: b.failed,
      metrics: {
        length: b.metrics.avgLength,
        width: b.metrics.avgWidth,
        volume: b.metrics.volume,
        weight: b.metrics.weight,
        minEdge: b.metrics.minEdge,
        uvArea: b.metrics.uvArea,
        isConvex: b.metrics.isConvex,
        jointFaceType: b.metrics.jointFaceType,
        deformation: b.metrics.deformation || null,
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
  if (state.strategy.merge === "merge-fabrication") {
    const merged = buildMergedFabricationMeshPayload();
    const blob = new Blob([JSON.stringify(merged, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lithic-lab-merged-fabrication-mesh.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  state.blocks.forEach((b) => {
    const payload = {
      id: b.id,
      isKeystone: !!b.isKeystone,
      strategy: b.strategy || getActiveStrategy(),
      componentType: b.componentType || state.strategy.component,
      componentVariant: b.componentVariant || b.componentType || state.strategy.component,
      mapping: b.mapping || null,
      zone: b.zone || null,
      fieldWeights: b.fieldWeights || null,
      weightBand: b.weightBand || null,
      materialTag: b.materialTag || null,
      densityDriven: !!b.densityDriven,
      taperBias: b.taperBias || 0,
      contourBand: b.contourBand ?? null,
      contourValue: b.contourValue ?? null,
      reactionValue: b.reactionValue ?? null,
      maskedByContour: !!b.maskedByContour,
      pinnedBoundary: !!b.pinnedBoundary,
      supportMarked: !!b.supportMarked,
      editorOperation: b.editorOperation || null,
      fillCellType: b.fillCellType || null,
      parentCellId: b.parentCellId || null,
      rotationShift: b.rotationShift || 0,
      generatorStrategy: b.generatorStrategy || null,
      generatorStrategyLabel: b.generatorStrategyLabel || null,
      uv: b.uv,
      failed: b.failed,
      metrics: {
        length: b.metrics.avgLength,
        width: b.metrics.avgWidth,
        volume: b.metrics.volume,
        weight: b.metrics.weight,
        minEdge: b.metrics.minEdge,
        uvArea: b.metrics.uvArea,
        isConvex: b.metrics.isConvex,
        jointFaceType: b.metrics.jointFaceType,
        deformation: b.metrics.deformation || null,
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
byId("exportBlocksObj")?.addEventListener("click", () => exportBlocksMesh("obj"));
byId("exportBlocksStl")?.addEventListener("click", () => exportBlocksMesh("stl"));

if (nodes.toolTabs) {
  nodes.toolTabs.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (!b) return;
    setToolTab(b.dataset.tab);
  });
}
document.querySelectorAll("[data-drawing-preset]").forEach((button) => {
  button.addEventListener("click", () => applyDrawingPreset(button.dataset.drawingPreset));
});
document.querySelectorAll("[data-view-layout]").forEach((button) => {
  button.addEventListener("click", () => applyViewportLayout(button.dataset.viewLayout));
});
document.querySelectorAll("[data-strategy-view]").forEach((button) => {
  button.addEventListener("click", () => setStrategyViewMode(button.dataset.strategyView));
});
document.querySelectorAll("[data-dock-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const dock = button.dataset.dockToggle;
    document.body.classList.toggle(`${dock}-collapsed`);
    requestAnimationFrame(resize);
  });
});

// The tools palette is intentionally an overlay. Give it direct-manipulation
// behavior instead of pretending it is a dock with a different coat of paint.
const floatingToolsPalette = document.querySelector(".controls.dock-panel");
let floatingToolsAction = null;
if (floatingToolsPalette) {
  const resizeHandle = document.createElement("div");
  resizeHandle.className = "floating-palette-resize";
  resizeHandle.title = "Resize tools palette";
  floatingToolsPalette.append(resizeHandle);
  const beginFloatingToolsAction = (event, mode) => {
    if (!window.matchMedia("(min-width: 901px)").matches) return;
    if (mode === "move" && event.target.closest("button, input, select, textarea, label, summary")) return;
    const rect = floatingToolsPalette.getBoundingClientRect();
    floatingToolsAction = { mode, startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    floatingToolsPalette.classList.add("is-dragging");
    event.preventDefault();
  };
  floatingToolsPalette.querySelector(".dock-head")?.addEventListener("pointerdown", event => beginFloatingToolsAction(event, "move"));
  resizeHandle.addEventListener("pointerdown", event => beginFloatingToolsAction(event, "resize"));
  window.addEventListener("pointermove", event => {
    if (!floatingToolsAction) return;
    const dx = event.clientX - floatingToolsAction.startX, dy = event.clientY - floatingToolsAction.startY;
    if (floatingToolsAction.mode === "move") {
      floatingToolsPalette.style.left = `${Math.max(12, Math.min(window.innerWidth - 170, floatingToolsAction.left + dx))}px`;
      floatingToolsPalette.style.top = `${Math.max(72, Math.min(window.innerHeight - 120, floatingToolsAction.top + dy))}px`;
    } else {
      floatingToolsPalette.style.width = `${Math.max(196, Math.min(420, floatingToolsAction.width + dx))}px`;
      floatingToolsPalette.style.height = `${Math.max(300, Math.min(window.innerHeight - floatingToolsAction.top - 24, floatingToolsAction.height + dy))}px`;
    }
  });
  window.addEventListener("pointerup", () => { if (floatingToolsAction) floatingToolsPalette.classList.remove("is-dragging"); floatingToolsAction = null; });
}

const transformToolbarElement = byId("transformToolbar");
let transformToolbarDrag = null;
if (transformToolbarElement) {
  const dragHandle = document.createElement("div");
  dragHandle.className = "transform-drag-handle";
  dragHandle.title = "Drag toolbar";
  transformToolbarElement.prepend(dragHandle);
  dragHandle.addEventListener("pointerdown", event => {
    const rect = transformToolbarElement.getBoundingClientRect();
    transformToolbarDrag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    event.preventDefault();
  });
  window.addEventListener("pointermove", event => {
    if (!transformToolbarDrag) return;
    transformToolbarElement.style.left = `${Math.max(12, Math.min(window.innerWidth - 58, transformToolbarDrag.left + event.clientX - transformToolbarDrag.x))}px`;
    transformToolbarElement.style.top = `${Math.max(64, Math.min(window.innerHeight - 58, transformToolbarDrag.top + event.clientY - transformToolbarDrag.y))}px`;
    transformToolbarElement.style.right = "auto";
    transformToolbarElement.style.transform = "none";
  });
  window.addEventListener("pointerup", () => { transformToolbarDrag = null; });
}

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
  if (blockPreviewDrag) {
    const bounds = getBlockPreviewBounds();
    if (!bounds) return;
    const dx = e.clientX - blockPreviewDrag.startX;
    const dy = e.clientY - blockPreviewDrag.startY;
    if (blockPreviewDrag.mode === "move") {
      state.blockPreviewWindow.x = blockPreviewDrag.x + dx;
      state.blockPreviewWindow.y = blockPreviewDrag.y + dy;
    } else if (blockPreviewDrag.mode === "resize") {
      state.blockPreviewWindow.w = blockPreviewDrag.w + dx;
      state.blockPreviewWindow.h = blockPreviewDrag.h + dy;
    }
    applyBlockPreviewWindowState();
    resize();
    return;
  }
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
  if (blockPreviewDrag) {
    try { nodes.blockPreviewPanel?.releasePointerCapture?.(blockPreviewDrag.pointerId); } catch {}
    nodes.blockPreviewPanel?.classList.remove("dragging");
    blockPreviewDrag = null;
  }
  activeSplitter = null;
  activeViewportSplitter = false;
  document.body.style.userSelect = "";
});
if (byId("pipeTrace")) byId("pipeTrace").addEventListener("click", () => runPipelineStage(1));
if (byId("pipeIntrados")) byId("pipeIntrados").addEventListener("click", () => runPipelineStage(2));
if (byId("pipeProject")) byId("pipeProject").addEventListener("click", () => runPipelineStage(3));
if (byId("pipeCleanup")) byId("pipeCleanup").addEventListener("click", () => runPipelineStage(4));
if (byId("pipeAssembly")) byId("pipeAssembly").addEventListener("click", () => runPipelineStage(5));
if (byId("pipeFabrication")) byId("pipeFabrication").addEventListener("click", () => runPipelineStage(6));
if (byId("pipeStability")) byId("pipeStability").addEventListener("click", () => runPipelineStage(7));

window.addEventListener("resize", resize);
renderer.domElement.addEventListener("wheel", (e) => {
  e.preventDefault();
  e.stopPropagation();
  state.userDefinedCamera = true;
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
  if (blockPreviewRenderer) {
    if (blockPreviewControls) blockPreviewControls.update();
    blockPreviewRenderer.render(blockPreviewScene, blockPreviewCamera);
  }
  if (bdModelRenderer) {
    bdModelControls?.update();
    bdModelRenderer.render(bdModelScene, bdModelCamera);
  }
  requestAnimationFrame(tick);
};

applyWorkflowStep(1);
setToolTab("vault-designer");
syncInputsFromState();
renderAssetLibrary();
applyLayoutStyle();
applyViewportLayout(state.viewportLayout);
setStrategyViewMode(state.strategyViewMode);
applyLightingPreset(state.lightingPreset);
buildOriginAxes3d();
resize();
tick();
runVaultSelectionPipeline(state.vaultType);
