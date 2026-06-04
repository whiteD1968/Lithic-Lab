# Stereotomy Validation Map

Source set:
- Giuseppe Fallacara, `volume II tavole.pdf`, VOLUME II. Tavole, 377 pages.
- Giuseppe Fallacara, `volume III apparati.pdf`, VOLUME III. Apparati, 557 pages.

Use this map before expanding the vault model library. Volume II is the practical plate checklist; Volume III supplies the treatise lineage and historical context.

## Historical Lineage

Volume III organizes the source tradition in roughly chronological order:

| Author / Treatise Source | PDF Start Page | Role For Tool Validation |
| --- | ---: | --- |
| Villard de Honnencourt | 23 | Early geometric drawing culture and medieval trait precedent. |
| Philibert Delorme | 35 | Flat arches, Anet, trompes, small-piece construction, Renaissance stereotomic method. |
| Jean Chereau | 185 | Barrel vault and spherical trompe examples with decorated intrados logic. |
| Mathurin Jousse | 221 | Construction craft and geometric trait for stone cutting. |
| Abraham Bosse / Desargues | 267 | Projective trait, oblique/anular/helicoidal barrels, developable working planes. |
| Francois Derand | 351 | Vault trait and trompe construction taxonomy. |
| Guarino Guarini | 385 | Spatial arches, conoids, interlaced arch and dome geometries. |
| Claude Francois Milliet De Chales | 435 | Mathematical stereotomy and lapidary sectioning. |
| Jean Baptiste De La Rue | 447 | Stairs, helicoidal systems, De La Rue stair lineage. |
| Amedee-Francois Frezier | 471 | Full theoretical framework for cutting stone/wood and compound vaults. |
| Gaspard Monge | 479 | Descriptive geometry foundation for 2D-to-3D projection tooling. |
| Charles-Felix-Augustin Leroy | 515 | Descriptive geometry pedagogy and projection rigor. |
| Enry Sergent | 521 | Later stereotomic survey material. |
| Louis Monduit / Alexandre Denis | 537 | Late craft and fabrication precedent. |

## Plate Categories

| Category | Volume II Pages | Plate Range | Construction Families | Tool Checks |
| --- | ---: | --- | --- | --- |
| Architraves and piattabande | 21 | 3-13 | Flat lintel arches, wall batter, round tower, helicoidal/horizontal courses. | 2D joint fan generation, vertical-to-convergent joint modes, wall surface projection. |
| Plane vaults | 33 | 14-26 | Abeille flat vaults, circular/square plans, plane-to-cylinder and plane-to-sphere deformation. | UV deformation, square/concentric topology, cylindrical/spherical remapping, block identity preservation. |
| Arches | 47 | 27-59 | Fake bifora, conic intrados, oblique skew arches, spatial cylindrical/conoidal arches, Delorme timber assembly. | Arch profile editor, skew projection, intrados/hypography views, conic/conoidal surface evaluation. |
| Barrel vaults | 77 | 60-82 | Delorme and Chereau decorated barrels, Bosse oblique descent, annular/parabolic Halle au Ble. | Barrel courses, running bond, oblique barrel axis, annular directrix, block development. |
| Arriere-voussure | 105 | 83-95 | St. Antoine, Marseille, Montpellier, cylindrical rear vaults, lunettes. | Opening-behind-vault geometry, convergence point controls, lunette penetration, localized panelization. |
| Trompes and projecting vaults | 119 | 96-226 | Conical, spherical, cylindrical, rotational, and ruled trompes; Anet and Bullioud studies; panels and CNC sequence. | Conic/spherical/ruled surfaces, corner support transition, panel development, false-square cut checks. |
| Fan vaults | 251 | 227-237 | Decorated and smooth fan vaults, fan concio generation, impost terminal pieces. | Rib fan field, conoid surface families, equal-curve rib layout, springer block segmentation. |
| Domes | 263 | 238-260 | Cassettonated Anet dome, helical ribs, equilateral-triangle spherical courses, elliptical dome Roman/modern bonds. | Polar radial joints, hoop courses, helical rib controls, elliptical dome rings and bed faces. |
| Compound vaults | 287 | 261-293 | Vertical interlaced arches, SS. Sindone/San Lorenzo, spheroidal domes, Arles/Valbonne horizontal spaces. | Rib/vault intersection, compound arch layering, horizontal and vertical development modes. |
| Stairs | 321 | 294-344 | Vis de Saint-Gilles, central/perimeter cores, double helices, conical ramps, free stairs with interlocking treads. | Helicoid generator, tread/soffit cutting, core tangency, double-ramp collision and assembly checks. |
| Parametric stereotomy | 373 | 345-347 | Boolean variations of cylinders, cone/sphere intersections. | CSG robustness, intersection curve extraction, parametric variation sweeps. |

## First Validation Targets

1. Barrel Vault: plates 60-82.
   Validate arch profile, course grid, block development, running bond, oblique barrel, annular barrel, and directrix variation.

2. Groin Vault: use as the built-in compound intersection baseline.
   Validate two-barrel intersection, groin-line courses, diagonal arrises, block mapping, and solid-first workflow.

3. Plane Vault / Abeille: plates 14-26.
   Validate 2D topology deformation from plane to cylinder/sphere. This is the cleanest test for whether the 2D editor preserves construction logic under surface remapping.

4. Arches: plates 27-59.
   Validate semicircular, segmental, pointed/elliptical, conic, skew, and spatial arch families before adding more vault types.

5. Trompes: plates 96-226.
   Defer full library implementation, but use these as stress tests for conic, spherical, cylindrical, and ruled corner-transition surfaces.

6. Domes: plates 238-260.
   Validate radial/hoop layout, helical ribs, equilateral triangular rib patterns, and elliptical dome course logic.

## Acceptance Criteria

For each candidate plate family, the tool should prove:

- The 2D construction can be drawn or parameterized.
- The intended surface can be generated or imported.
- The 2D pattern maps to the 3D surface without flipped, collapsed, or overlapping blocks.
- Voussoir solids have usable intrados, extrados, bed, and head faces.
- Fabrication checks report length, width, thickness, taper, edge length, and weight.
- The visual seam mode and physical cut mode produce understandable differences.
- Exported block JSON preserves the stereotomic source family, plate range, geometry type, and construction operation.
