# Lithic-Lab

Lithic-Lab is a computational stereotomy and vault-design workspace that combines 2D stereotomic pattern editing, synchronized 3D vault/block visualization, fabrication constraints, precedent-informed vault presets, and custom geometry import workflows for stone and tile vault studies.

## Features
- Split 2D/3D modeling workspace with synchronized edits
- Vault library (barrel, groin, cloister, sail, dome, rib, fan, lierne, net, Catalan, Guastavino)
- Custom import mode for SVG/DXF patterns and OBJ/STL/GLB surfaces
- Conforming 2D-first stereotomic tiling mapped to 3D vaults
- Joint workflow modes: `Visual seams` (tight fit) and `Physical cut` (mitered geometric offsets)
- Form/Force mini-diagrams with lockable edges and deviation heatmap
- Fabrication checks (size, thickness, weight, taper, tolerance)
- Export full mesh JSON and per-block JSON

## Getting Started
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build production bundle: `npm run build`

## Controls
- 3D viewport: Left drag rotate, Right drag pan, Mouse wheel zoom
- 2D viewport: Mouse wheel zoom, Right/Middle drag pan, Drag handles to edit UV block corners
- Parameter sliders and vault selectors update geometry live
- Use `Reset To Recommended` to reapply vault-specific startup presets and `Zoom Extents` to reframe
