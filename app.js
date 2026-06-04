import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
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
  activeTraitConstructionStep: null,
  activeTraitFocus: "all",
  drawingPreset: "Full Epure",
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
  customPatternSource: "Imported 2D Layout",
  supportCount: 4,
  forceLmin: 0.15,
  forceLmax: 0.75,
  forceLocks: {},
  patternAppliedToModel: false,
  barrelBondMode: "1",
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
  draggingSectionHandle: null,
  suspendViewportFit: false,
  draggingPointerId: null,
  hoveredSectionHandle: null,
  imported2DPolys: null,
  importedSurface: null,
  importedSurfaceBbox: null,
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
    foilMaterial: true,
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
    construction2D: "Plan diagram: two intersecting barrel axes with diagonal groin lines.",
    construction3D: "Two orthogonal barrel extrusions intersect to form the Groin Vault; thickness is applied after the form surface is resolved.",
    forceFlowType: "Compression converges into groins; groins act as structural spines.",
    stereotomyType: "Groin-line courses",
    parameters: ["span", "length", "rise", "thickness", "springingAngle", "groinMorph", "courseHeight", "targetBlockWidth"].map((key) => ({ key })),
    allowedPatterns: ["Groin-line courses", "Diagonal joints", "Rib-aligned", "Keystone zones"],
    startup: { params: { span: 22, rise: 11, length: 22, thickness: 0.88, courseCount: 22, blockCount: 20, subdivisionDensity: 1.2, keystoneSize: 0.42 }, bayRatioX: 1, bayRatioY: 1, groinMorph: 0.35 },
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
  { value: "Custom Imported Rhino Surface", label: "Uploaded Model Source" },
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
    pattern: "Groin-line courses",
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
    params: { span: 18, rise: 3.5, length: 10, thickness: 0.85, courseCount: 7, blockCount: 13, subdivisionDensity: 1, keystoneSize: 0.18 },
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
    params: { span: 22, rise: 5, length: 22, thickness: 0.55, courseCount: 14, blockCount: 14, subdivisionDensity: 1.15, keystoneSize: 0.35 },
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
    params: { span: 22, rise: 10, length: 26, thickness: 0.85, courseCount: 16, blockCount: 14, subdivisionDensity: 1.05, keystoneSize: 0.28 },
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
    params: { span: 20, rise: 11, length: 24, thickness: 0.75, courseCount: 15, blockCount: 16, subdivisionDensity: 1.1, keystoneSize: 0.32 },
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
    params: { span: 26, rise: 12, length: 30, thickness: 1.1, courseCount: 16, blockCount: 18, subdivisionDensity: 1.05, keystoneSize: 0.35 },
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
    params: { span: 20, rise: 8, length: 18, thickness: 0.8, courseCount: 12, blockCount: 14, subdivisionDensity: 1.05, keystoneSize: 0.25 },
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
    params: { span: 18, rise: 10, length: 18, thickness: 0.75, courseCount: 14, blockCount: 18, subdivisionDensity: 1.1, keystoneSize: 0.28 },
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
    params: { span: 22, rise: 18, length: 22, thickness: 0.9, courseCount: 24, blockCount: 22, subdivisionDensity: 1.2, keystoneSize: 0.5 },
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
    params: { span: 24, rise: 12, length: 24, thickness: 0.9, courseCount: 18, blockCount: 24, subdivisionDensity: 1.1, keystoneSize: 0.45 },
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
    params: { span: 24, rise: 12, length: 24, thickness: 1.05, courseCount: 20, blockCount: 18, subdivisionDensity: 1.15, keystoneSize: 0.45 },
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
  warnings: byId("warnings"),
  inspector: byId("inspector"),
  precedentDetails: byId("precedentDetails"),
  historicalValidation: byId("historicalValidation"),
  currentTraitState: byId("currentTraitState"),
  constructionTemplateDetails: byId("constructionTemplateDetails"),
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
};

byId("vaultType").innerHTML = sourceLibraryTypes.map((v) => `<option value="${v.value}">${v.label}</option>`).join("");
byId("subdivision").innerHTML = patterns.map((v) => `<option>${v}</option>`).join("");
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
  [...nodes.toolTabs.querySelectorAll("button[data-tab]")].forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll("[data-tool-group]").forEach((section) => {
    section.classList.toggle("tab-hidden", section.getAttribute("data-tool-group") !== tab);
  });
};

const setPipelineStatus = (txt) => {
  if (nodes.pipelineStatus) nodes.pipelineStatus.textContent = txt;
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
  groinMorph: "Groin Curve Type",
  lInterlockBias: "L-Interlock Bias",
};

const renderActiveVaultTools = () => {
  if (!nodes.activeVaultTools) return;
  const def = vaultLibrary[state.vaultType];
  const params = (def?.parameters || []).map((p) => parameterLabelMap[p.key] || p.key);
  const patternsAllowed = vaultPatternAllowed[state.vaultType] || patterns;
  const process = state.stereotomyProcess;
  const sourceLabel = state.vaultType === "Custom Imported Rhino Surface"
    ? `Uploaded model${state.importedModelName ? `: ${state.importedModelName}` : ""}`
    : `Built-in procedural source: ${state.vaultType}`;
  const stats = state.importedModelStats
    ? `<div><b>Model Meshes:</b> ${state.importedModelStats.meshCount}; <b>Triangles:</b> ${state.importedModelStats.triangleCount}</div>`
    : "";
  nodes.activeVaultTools.innerHTML = [
    `<div><b>Source:</b> ${sourceLabel}</div>`,
    `<div><b>Stage:</b> ${state.pipelineStage || 0} ${process.stageName}</div>`,
    `<div><b>2D Logic:</b> ${def?.construction2D || "n/a"}</div>`,
    `<div><b>3D Logic:</b> ${def?.construction3D || "n/a"}</div>`,
    stats,
    `<div><b>Force Flow:</b> ${process.forceFlowDiagram}</div>`,
    `<div><b>Tessellation:</b> ${process.tessellationMethod}</div>`,
    `<div><b>Voussoir:</b> ${process.voussoirMethod}</div>`,
    `<div><b>Fabrication:</b> ${process.fabricationFocus}</div>`,
    `<div><b>Active Parameters:</b> ${params.length ? params.join(", ") : "n/a"}</div>`,
    `<div><b>Allowed Patterns:</b> ${patternsAllowed.join(", ")}</div>`,
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
  "Fabrication Check": {
    mode: "Block / Voussoir Layout",
    focus: "validation",
    traitStep: "Course Divisions",
    stereotomyStep: "All Stereotomy",
    blockStep: "Fabrication Preview",
    layers: { showGuides: true, showLabels: false, showDerivedStereotomy: true, showBlocks: true, showBlockIds: true, showBlockMetrics: true, showFabricationChecks: true, showFabricationLegend: true, showAnnotations: true, showBlockWidth: true, showJointGap: true, showSurfaceFamilyLabel: true },
  },
  "Teaching View": {
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
  });
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
  nodes.currentTraitState.textContent = `${state.vaultType} | ${state.surfacePrinciple} | ${state.view2dOptions.mode} | ${state.jointPrinciple} | ${state.drawingPreset}${focus}`;
};

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
    if (byId("forceLmin")) byId("forceLmin").value = state.forceLmin.toFixed(2);
    if (byId("forceLmax")) byId("forceLmax").value = state.forceLmax.toFixed(2);
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
  state.selectedBlockId = null;
  if (state.vaultType !== "Custom Imported Rhino Surface") {
    state.designMode = "Generated";
    if (byId("designMode")) byId("designMode").value = "Generated";
  } else {
    state.designMode = "Custom Import";
    if (byId("designMode")) byId("designMode").value = "Custom Import";
    state.customPatternSource = state.imported2DPolys?.length ? "Imported 2D Layout" : "UV Form Grid";
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
const gridHelper = new THREE.GridHelper(240, 120, 0x3e5f7d, 0x203342);
const axesHelper = new THREE.AxesHelper(6);
scene.add(gridHelper);
scene.add(axesHelper);
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
const copiedGeometryGroup = new THREE.Group();
const sectionGizmoGroup = new THREE.Group();
const sectionActiveGizmoGroup = new THREE.Group();
scene.add(blockGroup);
scene.add(solidVaultGroup);
scene.add(supportWallGroup);
scene.add(importedSurfaceGroup);
scene.add(copiedGeometryGroup);
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

const buildOriginAxes3d = () => {
  clearGroup(originAxesGroup);
  const origin = new THREE.Vector3(0, 0, 0);
  const axisLen = 8;
  const headLen = 0.7;
  const headWidth = 0.34;
  [
    { label: "X", dir: new THREE.Vector3(1, 0, 0), color: 0xff5a4f, text: "#ff8f8f" },
    { label: "Y", dir: new THREE.Vector3(0, 1, 0), color: 0x56e56a, text: "#a7ffad" },
    { label: "Z", dir: new THREE.Vector3(0, 0, 1), color: 0x4a79ff, text: "#9bb7ff" },
  ].forEach(({ label, dir, color, text }) => {
    const arrow = new THREE.ArrowHelper(dir, origin, axisLen, color, headLen, headWidth);
    arrow.name = `origin-axis-${label.toLowerCase()}`;
    originAxesGroup.add(arrow);
    const sprite = makeTextSprite(label, text);
    if (sprite) {
      sprite.position.copy(dir.clone().multiplyScalar(axisLen + 0.85));
      sprite.name = `origin-axis-label-${label.toLowerCase()}`;
      sprite.renderOrder = 9000;
      originAxesGroup.add(sprite);
    }
  });
  const originMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 18, 18),
    new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false })
  );
  originMarker.name = "world-origin-marker";
  originMarker.renderOrder = 9000;
  originAxesGroup.add(originMarker);
  const originLabel = makeTextSprite("Origin", "#ffffff");
  if (originLabel) {
    originLabel.position.set(0.8, 0.55, 0.8);
    originLabel.scale.set(3.0, 0.62, 1);
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

const buildBlockMesh = (block) => {
  const t = state.params.thickness;
  const cyclicU = state.vaultType === "Dome";
  const q = block.uv.map(([u, v]) => getVaultPoint(cyclicU ? wrap01(u) : clamp(u, 0, 1), clamp(v, 0, 1)));
  let top;
  let bot;
  let jointFaceType = "ruled";
  if (state.vaultType === "Groin Vault") {
    top = block.uv.map(([u, v]) => {
      return getGroinSupportAdjustedPoint(clamp(u, 0, 1), clamp(v, 0, 1), { surface: "extrados" });
    });
    bot = block.uv.map(([u, v]) => {
      return getGroinSupportAdjustedPoint(clamp(u, 0, 1), clamp(v, 0, 1), { surface: "intrados" });
    });
    jointFaceType = "custom intrados/extrados";
  } else {
    const normal = q[1].clone().sub(q[0]).cross(q[3].clone().sub(q[0])).normalize();
    // Keep plan edges aligned between neighboring blocks; only offset along local normal.
    top = q.map((p) => p.clone().addScaledVector(normal, t * 0.5));
    bot = q.map((p) => p.clone().addScaledVector(normal, -(t * 0.5 + state.extradosOffset)));
  }
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
  return {
    geometry,
    q,
    avgLength,
    avgWidth,
    volume,
    weight,
    minEdge: Math.min(...edges),
    uvArea: Math.abs(signedUvArea(block.uv)),
    isConvex: isConvexUv(block.uv),
    jointFaceType,
  };
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
  if (!m.isConvex) failed.push("convexity");
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
      `<path class="surface-icon-fill" d="M ${principleX} ${principleY + 60} C ${principleX + 28} ${principleY + 30}, ${principleX + 78} ${principleY + 30}, ${principleX + 106} ${principleY + 60} L ${principleX + 144} ${principleY + 60} C ${principleX + 116} ${principleY + 30}, ${principleX + 66} ${principleY + 30}, ${principleX + 38} ${principleY + 60} Z"/>`,
      `<path class="surface-icon-line" d="M ${principleX} ${principleY + 60} C ${principleX + 28} ${principleY + 30}, ${principleX + 78} ${principleY + 30}, ${principleX + 106} ${principleY + 60}"/>`,
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
  const teachingLabels = state.drawingPreset === "Teaching View" || ["springing", "intrados", "extrados"].includes(state.activeTraitFocus);
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
    if (entityShown("neutral") && state.drawingPreset === "Teaching View") callout("neutral", cx - halfW * 0.1, y0 + h + 18, cx - halfW * 0.1, apexY - tPx * 0.5, "end");
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
    if (state.drawingPreset === "Teaching View") labels.push(`<text class="surface-unroll-title" x="${x.toFixed(2)}" y="${(y - 14).toFixed(2)}">cylindrical unroll: rectangle</text>`);
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
    if (state.drawingPreset === "Teaching View") labels.push(`<text class="surface-unroll-title" x="${(layout.x + 20).toFixed(2)}" y="${(layout.y - 14).toFixed(2)}">conical unroll: annular sector</text>`);
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
    if (state.drawingPreset === "Teaching View") labels.push(`<text class="surface-unroll-title" x="${x.toFixed(2)}" y="${(y - 14).toFixed(2)}">spherical map: meridian gores</text>`);
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
    if (state.drawingPreset === "Teaching View") labels.push(`<text class="surface-unroll-title" x="${x.toFixed(2)}" y="${(y - 14).toFixed(2)}">ruled / compound development: generator net</text>`);
  }

  return [`<g class="surface-unroll-overlay">`, ...fills, ...lines, ...labels, `</g>`];
};

const buildTraitOverlay2d = (frames) => {
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
    if (labelOn && state.drawingPreset === "Teaching View") labels.push(`<text class="trait-label" x="${(layout.x + 10).toFixed(2)}" y="${(layout.y - 22).toFixed(2)}">projection rays</text>`);
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

  if (labelOn && state.drawingPreset === "Teaching View") {
    labels.push(`<text class="trait-label title" x="${(layout.x + layout.w).toFixed(2)}" y="${(layout.y - 8).toFixed(2)}" text-anchor="end">Trait: ${step}</text>`);
  }
  return [`<g class="trait-overlay" data-trait-step="${step}">`, ...lines, ...labels, `</g>`];
};

const stereotomyStepActive = (name) => state.stereotomyStep === "All Stereotomy" || state.stereotomyStep === name;

const buildDerivedStereotomyOverlay2d = (frames) => {
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
    if (labelOn && state.drawingPreset === "Teaching View") labels.push(`<text class="stereotomy-label" x="${(cx + keyW + 10).toFixed(2)}" y="${(layout.y - 8).toFixed(2)}">keystone zone</text>`);
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
    if (labelOn && state.drawingPreset === "Teaching View") labels.push(`<text class="stereotomy-label" x="${panelX.toFixed(2)}" y="${(layout.y + layout.h + 18).toFixed(2)}">true-shape panels / panneaux</text>`);
  }

  if (labelOn && state.drawingPreset === "Teaching View") {
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
      detail: offsetOk ? `Thickness ${state.params.thickness.toFixed(2)} m with intrados, neutral, and extrados visible.` : "Show intrados, neutral curve, and extrados with positive thickness.",
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
    `<text class="fabrication-check-label" x="${x.toFixed(2)}" y="${(y + 36).toFixed(2)}">tolerance ${state.constraints.fabTolerance.toFixed(3)} m</text>`,
    ...rowText,
    `<line class="fabrication-tolerance-rule" x1="${x.toFixed(2)}" y1="${toleranceY.toFixed(2)}" x2="${(x + 64).toFixed(2)}" y2="${toleranceY.toFixed(2)}"/>`,
    `<text class="fabrication-check-label small" x="${x.toFixed(2)}" y="${(toleranceY + 14).toFixed(2)}">outside bounding box</text>`,
    `</g>`,
  ];
};

const buildProjectionOperationOverlay2d = (frames) => {
  const op = projectionDevelopmentOperations[state.projectionOperation];
  if (!op || !state.view2dOptions.showLabels || state.drawingPreset !== "Teaching View") return [];
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

const buildMeasurementAnnotationOverlay2d = (frames) => {
  if (!state.view2dOptions.showAnnotations || !state.view2dOptions.showLabels) return [];
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
    if (opts.showThicknessDimension) dimLine(cx + halfW * 0.3, apexY, cx + halfW * 0.3, apexY - tPx, `thickness ${fmt(state.params.thickness)}`, cx + halfW * 0.3 + 8, apexY - tPx * 0.5, "start");
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
    label.push(`<text class="dimension-label strong" x="${(layout.x + 120).toFixed(2)}" y="${(layout.y - 28).toFixed(2)}">block width ${fmt(blockW)}</text>`);
  }
  if (opts.showJointGap) {
    label.push(`<text class="dimension-label strong" x="${(layout.x + 280).toFixed(2)}" y="${(layout.y - 28).toFixed(2)}">joint gap ${fmt(state.constraints.jointGap)}</text>`);
  }
  if (opts.showTrueLength) {
    label.push(`<text class="dimension-label strong" x="${(layout.x + layout.w).toFixed(2)}" y="${(layout.y + layout.h + 58).toFixed(2)}" text-anchor="end">true length ${fmt(archLength)}</text>`);
  }
  if (opts.showSurfaceFamilyLabel) {
    label.push(`<text class="dimension-surface-label" x="${(layout.x + layout.w).toFixed(2)}" y="${(layout.y - 28).toFixed(2)}" text-anchor="end">surface family: ${state.surfacePrinciple.toLowerCase()}</text>`);
  }

  return [`<g class="measurement-annotations">`, ...line, ...label, `</g>`];
};

const get2dFrames = () => {
  const margin = 24;
  const hasReference = state.view2dOptions.showReferenceGeometry && state.view2dOptions.showGuides;
  return {
    reference: { x: margin, y: 24, w: 952, h: hasReference ? 160 : 0 },
    layout: { x: margin, y: hasReference ? 210 : 24, w: 952, h: hasReference ? 466 : 652 },
  };
};

const draw2d = () => {
  const frames = get2dFrames();
  const margin = frames.layout.x;
  const iw = frames.layout.w;
  const layoutY = frames.layout.y;
  const ih = frames.layout.h;
  const lines = buildDraftingGrid2d();
  const baseFill = state.layoutStyle === "Paper" ? "rgba(245,240,228,0.6)" : state.layoutStyle === "High Contrast" ? "rgba(8,8,8,0.5)" : state.layoutStyle === "Rhino Gray" ? "rgba(96,102,112,0.45)" : "rgba(3,10,18,0.35)";
  nodes.layout2d.setAttribute("viewBox", `${state.view2d.x} ${state.view2d.y} ${state.view2d.w} ${state.view2d.h}`);
  nodes.layout2d.setAttribute("data-trait-focus", state.activeTraitFocus || "all");
  nodes.layout2d.innerHTML = [
    `<rect x="${state.view2d.x}" y="${state.view2d.y}" width="${state.view2d.w}" height="${state.view2d.h}" fill="${baseFill}"/>`,
    ...lines,
    ...buildReferenceGeometryOverlay2d(frames.reference.x, frames.reference.y, frames.reference.w, frames.reference.h),
    ...buildStereotomicGuideOverlay2d(margin, iw, ih, layoutY),
    ...buildTraitOverlay2d(frames),
    ...buildDerivedStereotomyOverlay2d(frames),
    ...buildOriginAxes2d(),
    ...(state.view2dOptions.showGuides ? buildGroinPlanOverlay2d(margin, iw, ih, layoutY) : []),
    ...(state.view2dOptions.showBlocks ? state.blocks.map((b, idx) => {
      const screenPts = b.uv.map(([u, v]) => [margin + wrap01(u) * iw, layoutY + v * ih]);
      const pts = screenPts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
      const pcx = screenPts.reduce((s, p) => s + p[0], 0) / screenPts.length;
      const pcy = screenPts.reduce((s, p) => s + p[1], 0) / screenPts.length;
      const failsActiveCheck = state.view2dOptions.showFabricationChecks && blockFailsFabricationCheck(b);
      const bad = failsActiveCheck ? " invalid" : "";
      const sel = state.selectedBlockId === b.id ? " selected" : "";
      const stroke = hexToRgba(state.view2dOptions.blockStroke, state.view2dOptions.blockStrokeOpacity);
      const fill = hexToRgba(state.view2dOptions.blockFill, state.view2dOptions.blockFillOpacity);
      const labelStride = Math.max(1, Math.ceil(state.blocks.length / 90));
      const showId = state.view2dOptions.showBlockIds && idx % labelStride === 0;
      const showMetric = state.view2dOptions.showBlockMetrics && (sel || failsActiveCheck || idx % Math.max(labelStride * 2, 1) === 0);
      const idLabel = showId ? `<text class="block-label id" x="${pcx.toFixed(2)}" y="${(pcy + 3).toFixed(2)}" text-anchor="middle">${b.id}</text>` : "";
      const metricLabel = showMetric && b.metrics
        ? `<text class="block-label metric" x="${pcx.toFixed(2)}" y="${(pcy + 12).toFixed(2)}" text-anchor="middle">${b.metrics.avgLength.toFixed(1)} x ${b.metrics.avgWidth.toFixed(1)}m</text>`
        : "";
      const handles = state.view2dOptions.showVertices
        ? b.uv.map(([u, v], i) => `<circle class="uv-handle${sel}" data-id="${b.id}" data-vertex="${i}" cx="${(margin + wrap01(u) * iw).toFixed(2)}" cy="${(layoutY + v * ih).toFixed(2)}" r="4"/>`).join("")
        : "";
      return `<g class="generated-block"><polygon class="block2d${bad}${sel}" data-id="${b.id}" points="${pts}" style="fill:${fill};stroke:${stroke};"/>${idLabel}${metricLabel}${handles}</g>`;
    }) : []),
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
  if (state.vaultType === "Groin Vault") {
    buildGroinCornerColumns();
    return;
  }
  const def = vaultLibrary[state.vaultType];
  if (!def?.construction3D?.toLowerCase().includes("extrud") && !isBarrelLikeVault()) return;
  if (isBarrelLikeVault()) {
    // Barrel now derives wall continuity from the joined section profile itself.
    // Do not add separate support-wall boxes here, or we get duplicate/offset walls.
    return;
  }
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
  mk(importedSurfaceGroup, 0x78cfff);
};

const refreshImportedSurfaceBbox = () => {
  if (!state.importedSurface) return;
  state.importedSurface.updateMatrixWorld(true);
  state.importedSurfaceBbox = new THREE.Box3().setFromObject(state.importedSurface);
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
};

const applyLayerVisibility = () => {
  importedSurfaceGroup.visible = !!state.layers.sourceModel;
  solidVaultGroup.visible = !!state.layers.builtInForm;
  blockGroup.visible = !!state.layers.blocks;
  copiedGeometryGroup.visible = !!state.layers.copies;
  supportWallGroup.visible = !!state.layers.supports;
  gridHelper.visible = !!state.display.baseGrid && !!state.layers.guides;
  axesHelper.visible = !!state.display.baseGrid && !!state.layers.guides;
  originAxesGroup.visible = !!state.layers.guides;
  lightRigHelpers.visible = !!state.display.latticeControls && !!state.layers.guides;
  sectionGizmoGroup.visible = !!state.layers.guides;
  sectionActiveGizmoGroup.visible = !!state.layers.guides;
  bboxHelpersGroup.visible = !!state.layers.guides;
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
      obj.material.transparent = true;
      obj.material.opacity = 0.92;
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
  if (!a.isEmpty()) box.union(a);
  if (!s.isEmpty()) box.union(s);
  if (!c.isEmpty()) box.union(c);
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

const zoomExtents = () => {
  const combined = new THREE.Box3();
  const a = new THREE.Box3().setFromObject(blockGroup);
  const s = new THREE.Box3().setFromObject(solidVaultGroup);
  const c = new THREE.Box3().setFromObject(copiedGeometryGroup);
  const w = new THREE.Box3().setFromObject(supportWallGroup);
  const b = new THREE.Box3().setFromObject(importedSurfaceGroup);
  if (!a.isEmpty()) combined.union(a);
  if (!s.isEmpty()) combined.union(s);
  if (!c.isEmpty()) combined.union(c);
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

const zoom2dExtents = () => {
  state.view2d = { x: -95, y: -75, w: 1190, h: 850 };
  draw2d();
};

const zoomAllExtents = () => {
  zoomExtents();
  zoom2dExtents();
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
  nodes.inspector.innerHTML = `<b>Inspector</b><p>ID: ${b.id}</p><p>Length: ${b.metrics.avgLength.toFixed(2)} m</p><p>Width: ${b.metrics.avgWidth.toFixed(2)} m</p><p>Weight: ${b.metrics.weight.toFixed(1)} kg</p><p>Status: ${b.failed.length ? `Invalid (${b.failed.join(", ")})` : "Valid"}</p>`;
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
  nodes.metrics.innerHTML = [
    ["Stage", `${state.pipelineStage || 0} ${state.stereotomyProcess.stageName}`],
    ["Block Count", state.blocks.length],
    ["Invalid Blocks", invalid.length],
    ["Total Volume", `${vol.toFixed(2)} m^3`],
    ["Total Weight", `${(wt / 1000).toFixed(2)} t`],
    ["Source Mode", state.vaultType === "Custom Imported Rhino Surface" ? "Uploaded Model" : "Built-In"],
    ["Force Flow", state.stereotomyProcess.forceFlowDiagram],
    ["Registration", state.registrationMode],
    ["Cube Scale", state.cubeScale.toFixed(2)],
    ["Array UxV", `${state.arrayU}x${state.arrayV}`],
    ["Tile Layers", state.tileLayers],
  ].map(([k, v]) => `<div class="metric"><b>${k}</b><span>${v}</span></div>`).join("");
  state.historicalValidationResults = evaluateHistoricalFamilyValidation();
  renderHistoricalValidation();
  const warningItems = [];
  if (!invalid.length) warningItems.push('<li class="ok">All blocks satisfy current constraints.</li>');
  else {
    const summary = {};
    invalid.forEach((b) => b.failed.forEach((f) => { summary[f] = (summary[f] || 0) + 1; }));
    warningItems.push(...Object.entries(summary).map(([k, v]) => `<li class="bad">${k}: ${v} block(s)</li>`));
  }
  const historicalIssues = state.historicalValidationResults.filter((item) => item.status !== "pass");
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
  ["span", "rise", "length", "thickness", "courseCount", "blockCount", "subdivisionDensity", "keystoneSize"].forEach((id) => {
    syncInputPair(id, state.params[id]);
  });
  if (byId("vaultType")) byId("vaultType").value = state.vaultType;
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
  if (byId("sourceTx")) byId("sourceTx").value = String(state.sourceTransform.tx);
  if (byId("sourceTy")) byId("sourceTy").value = String(state.sourceTransform.ty);
  if (byId("sourceTz")) byId("sourceTz").value = String(state.sourceTransform.tz);
  if (byId("sourceRx")) byId("sourceRx").value = String(state.sourceTransform.rx);
  if (byId("sourceRy")) byId("sourceRy").value = String(state.sourceTransform.ry);
  if (byId("sourceRz")) byId("sourceRz").value = String(state.sourceTransform.rz);
  if (byId("sourceScale")) byId("sourceScale").value = String(state.sourceTransform.scale);
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
  if (byId("guideDensity2d")) byId("guideDensity2d").value = String(state.view2dOptions.guideDensity);
  if (byId("guideDensity2dNum")) byId("guideDensity2dNum").value = String(state.view2dOptions.guideDensity);
  if (byId("blockLineColor2d")) byId("blockLineColor2d").value = state.view2dOptions.blockStroke;
  if (byId("blockFillColor2d")) byId("blockFillColor2d").value = state.view2dOptions.blockFill;
  if (byId("blockFillOpacity2d")) byId("blockFillOpacity2d").value = String(state.view2dOptions.blockFillOpacity);
  if (byId("blockFillOpacity2dNum")) byId("blockFillOpacity2dNum").value = String(state.view2dOptions.blockFillOpacity);
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
  if (byId("layerSourceModel")) byId("layerSourceModel").checked = state.layers.sourceModel;
  if (byId("layerBuiltInForm")) byId("layerBuiltInForm").checked = state.layers.builtInForm;
  if (byId("layerBlocks")) byId("layerBlocks").checked = state.layers.blocks;
  if (byId("layerCopies")) byId("layerCopies").checked = state.layers.copies;
  if (byId("layerSupports")) byId("layerSupports").checked = state.layers.supports;
  if (byId("layerGuides")) byId("layerGuides").checked = state.layers.guides;
  syncTransformToolbar();
  renderDrawingPresetButtons();
  renderCurrentTraitState();
  renderTraitFocusControls();
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
};

const rebuild = () => {
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
  renderActiveVaultTools();
  renderTraitConstructionSteps();
  renderConstructionTemplateDetails();
  renderProjectionOperationDetails();
  renderJointPrincipleDetails();
  if (!state.blocks.some((b) => b.id === state.selectedBlockId)) state.selectedBlockId = null;
  applySourceTransform();
  applyLayerVisibility();
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
    obj = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x6ea2c7, wireframe: false, transparent: true, opacity: 0.35 }));
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
  state.importedModelName = file.name;
  state.importedModelStats = getImportedModelStats(obj);
  state.sourceTransform = { tx: 0, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, scale: 1 };
  applySourceTransform();
  syncInputsFromState();
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
  const u = clamp((sx - frame.x) / frame.w, 0, 1);
  const v = clamp((sy - frame.y) / frame.h, 0, 1);
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
  state.wallThickness = clamp(value, 0.1, 4);
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
    const value = Number(e.target.value);
    if (!Number.isFinite(value)) return;
    state.sourceTransform[key] = key === "scale" ? Math.max(0.001, value) : value;
    applySourceTransform();
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
if (byId("constructionTemplate")) byId("constructionTemplate").addEventListener("change", (e) => {
  applyConstructionTemplate(e.target.value);
});
byId("subdivision").addEventListener("change", (e) => { state.pattern = e.target.value; rebuild(); });
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
  state.blockStep = "Generated Voussoirs";
  state.blocksGeneratedFromTrait = true;
  state.pipelineStage = Math.max(state.pipelineStage || 0, 5);
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
byId("import2d").addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  await on2dImport(f);
  state.designMode = "Custom Import";
  byId("designMode").value = "Custom Import";
  state.vaultType = "Custom Imported Rhino Surface";
  if (byId("vaultType")) byId("vaultType").value = state.vaultType;
  state.customPatternSource = "Imported 2D Layout";
  if (byId("customPatternSource")) byId("customPatternSource").value = state.customPatternSource;
  state.patternAppliedToModel = false;
  state.pipelineStage = Math.max(state.pipelineStage, 3);
  updateStereotomyProcess(state.pipelineStage);
  setPipelineStatus(`2D pattern layout loaded from ${f.name}.`);
  applyVaultParamRules();
  applyRightPanelToolVisibility();
  rebuild();
});
byId("import3d").addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  await load3DObject(f);
  state.designMode = "Custom Import";
  byId("designMode").value = "Custom Import";
  state.vaultType = "Custom Imported Rhino Surface";
  if (byId("vaultType")) byId("vaultType").value = state.vaultType;
  state.customPatternSource = state.imported2DPolys?.length ? "Imported 2D Layout" : "UV Form Grid";
  if (byId("customPatternSource")) byId("customPatternSource").value = state.customPatternSource;
  state.pattern = vaultPatternPreset[state.vaultType] || state.pattern;
  if (byId("subdivision")) byId("subdivision").value = state.pattern;
  state.patternAppliedToModel = false;
  state.pipelineStage = 1;
  updateStereotomyProcess(1);
  setPipelineStatus(`Uploaded model source loaded: ${f.name}.`);
  applyVaultParamRules();
  applyRightPanelToolVisibility();
  rebuild();
});

byId("exportJson").addEventListener("click", () => {
  state.historicalValidationResults = evaluateHistoricalFamilyValidation();
  const payload = {
    designMode: state.designMode,
    vaultType: state.vaultType,
    sourceModel: {
      name: state.importedModelName,
      stats: state.importedModelStats,
      transform: state.sourceTransform,
    },
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
    traitConstructionSteps: traitConstructionTemplates[state.vaultType] || defaultTraitConstructionSteps,
    activeTraitConstructionStep: state.activeTraitConstructionStep,
    blocksGeneratedFromTrait: state.blocksGeneratedFromTrait,
    constructionEntities: state.constructionEntities,
    layers: state.layers,
    view2dOptions: state.view2dOptions,
    transformTool: state.transformTool,
    snaps: state.snaps,
    copiedGeometryCount: state.copiedGeometryCount,
    registrationMode: state.registrationMode,
    structuralDirection: state.structuralDirection,
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
        minEdge: b.metrics.minEdge,
        uvArea: b.metrics.uvArea,
        isConvex: b.metrics.isConvex,
        jointFaceType: b.metrics.jointFaceType,
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
document.querySelectorAll("[data-drawing-preset]").forEach((button) => {
  button.addEventListener("click", () => applyDrawingPreset(button.dataset.drawingPreset));
});
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
if (byId("pipeFabrication")) byId("pipeFabrication").addEventListener("click", () => runPipelineStage(6));
if (byId("pipeStability")) byId("pipeStability").addEventListener("click", () => runPipelineStage(7));

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
buildOriginAxes3d();
runVaultSelectionPipeline(state.vaultType);
resize();
tick();
