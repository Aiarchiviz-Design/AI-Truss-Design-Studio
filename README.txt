CADTECH RAFTER TRUSS STUDIO - LAPTOP EDITION
============================================

Windows start:
1. Install Python 3 if it is not already installed.
2. Extract this ZIP to a normal folder.
3. Double-click Start_CadTech.bat.
4. CadTech opens automatically in your default browser as a LOCAL app.
5. Keep the small launcher window open while using the app.

No npm install and no internet connection are required for the bundled application.
Three.js and web-ifc runtime files are included locally.

MAIN WORKSPACE
- Import OBJ / IFC rafter models
- Generate full roof truss assembly
- Common / Stepdown / Girder / Front Jack / Side Jack / proposed Hip Carrier
- 3D orbit, pan and zoom
- Plan / Front / Side / Split views
- Truss schedule and family filters
- Original rafter display
- Member selection and isolation
- Truss shape intents and web configurations
- Preliminary automatic member sizing / optimization
- Project/export functions already supplied by the source application

IMPORTANT ENGINEERING SCOPE
This software is a preliminary/concept structural screening and geometry tool.
It is not a replacement for code-compliant engineering, connection/plate design,
bracing design, load-path verification or engineer certification.

CAD / DXF ROOF PLAN WORKFLOW
============================
The app now accepts ASCII DXF roof plans in addition to OBJ and IFC.

Recommended CAD setup:
1. Put the exterior eave/perimeter and ridge/hip/valley roof lines on one layer (for example ROOF).
2. Put the truss layout/center lines on another layer (for example TRUSS or WALL).
3. Import the DXF.
4. Choose Roof layer and Truss lines layer.
5. Enter the roof angle in degrees.
6. Confirm CAD units (Auto reads $INSUNITS when available).
7. Click Rebuild CAD roof if settings change.
8. Click Generate complete roof.

CadTech reconstructs 3D top-chord profiles from the 2D layout and roof pitch, then sends them into the same roof assembly engine used by OBJ/IFC imports. This allows Common, Stepdown, Girder, Front Jack, Side Jack and Hip Carrier classification/generation from CAD plan geometry.

Included regression sample: app/sample-roof-plan.dxf
Default sample layers: ROOF for roof geometry and WALL for truss layout lines. The sample DXF declares inches.

IMPORTANT: CAD-derived roof heights and structural classification are automated conceptual reconstruction. Review roof-line semantics, bearings, loads, member sizing, connections and engineering before construction use.


ADVANCED WOOD STRUCTURAL ANALYSIS UPDATE
- Load inputs: dead, roof live, snow, wind/uplift, bottom-chord live, construction, special/solar allowance.
- Multiple strength/service combinations; member axial tension/compression, Euler buckling screening, reactions/uplift and deflection.
- Automatic web comparison: Fink, Howe, Pratt, Fan, Warren, Queen, Kingpost.
- Timber sizing: 2x4, 2x6, 2x8, 2x10, 2x12; then 2-ply and 3-ply; then valid additional-bearing search.
- Preliminary engineering only: connector/nail-plate design, full bending/shear interaction, bracing, load transfer and jurisdiction-specific certification are not implemented.

CADTECH DESIGN DOCUMENT UPDATE
- Heel / bottom-chord drop is user-adjustable from 50 to 1200 mm before roof generation.
- 3D dimensional-lumber solids extend through panel-point centerlines to eliminate visible corner gaps.
- CadTech truss design PDF follows a professional truss-calculation layout: design information, truss elevation, load cases, member schedule, reactions, takeoff and issue notes.
- No CadTech/fabricator/client-company branding is reproduced.
- Construction issue still requires project-specific engineering verification of connector plates/fasteners, bracing, load transfer, bearings/tie-downs, foundations and applicable-code certification.

CADTECH ENGINEERING WORKFLOW UPGRADE
------------------------------------
Added independent CadTech workflow features inspired by common component-design workflows:
- US / Canada / Australia / Custom workflow profiles (metadata + review gating; not certification)
- Timber grade presets with editable allowable axial value
- Bearing-length and bearing-capacity screening
- Uplift / hold-down screening
- Generic user-defined joint/plate capacity screening (0 = unverified)
- Compression-member bracing flags
- Jack-to-girder / hip-carrier reaction-transfer identification and DESIGN REQUIRED gating
- Relative timber + plate + labor cost model
- Fabrication CSV member schedule
- QA / revision JSON snapshot
- Engineering/QA tables in the CadTech truss PDF

IMPORTANT: Generic connection capacity must come from validated project/manufacturer engineering data. CadTech does not contain or claim proprietary CadTech connector-plate engineering. Identified transfer loads still require receiving-truss nodal reanalysis. Full code-specific timber interaction equations, permanent/temporary bracing design, connection certification and foundation design require qualified engineering verification.

WHOLE-BUILDING FRAMING EDITION
- Floor framing generator: floor trusses, I-joists and LVL joist schedules.
- EWP/LVL section selector and optional center LVL beam with ply count.
- Multi-storey perimeter wall-panel generator with stud size/spacing schedules.
- Gravity load-path ledger: analyzed roof reactions + floor area loads + wall self-weight, accumulated by storey to foundation.
- Whole-building take-off CSV, load-path CSV and JSON building-model export.
- Product-specific I-joist/LVL capacities, openings/headers, shear walls, diaphragm/lateral transfer, connectors and foundations remain DESIGN REQUIRED until validated data/calculation modules are supplied.

WALL + FLOOR PRO EXTENSION
- Automatic wall opening framing schedules: king studs, jack/trimmer studs, cripples and headers.
- Automatic wall panel breaks and sheathing quantities.
- Floor/stair opening schedules with doubled trimmer/header intent, rim board, blocking and subfloor sheathing.
- Vertical roof-reaction point-load tracing through storeys with GREEN/AMBER/RED review semantics (current geometry tracer is approximate; exact XY stiffness distribution remains future solver work).
- Wall panel, floor framing and vertical alignment CSV exports.
- Manufacturer-specific I-joist/LVL capacities, connector hardware, shear walls/diaphragms and certified code design are not invented; these remain REVIEW / DESIGN REQUIRED until validated data engines are connected.

WHOLE-BUILDING IMPORT UPGRADE
- Whole-Building workspace now accepts architectural DXF and OBJ inputs.
- DXF recognition is layer-aware: WALL/A-WALL/PARTITION, DOOR, WINDOW, FLOOR/SLAB/DECK, STAIR/VOID/OPENING/SHAFT, BEAM/LVL/GIRDER, POST/COLUMN, ROOF/TRUSS/RAFTER.
- Imported DXF footprint drives floor/wall extents; recognized perimeter openings are mapped to N/S/E/W walls and regenerate king/jack/header/cripple framing.
- Recognized floor/stair/shaft openings feed the floor opening framing/sheathing workflow.
- OBJ whole-building import uses the geometric envelope only because OBJ does not reliably carry semantic object identities; it is explicitly flagged REVIEW.
- Existing IFC roof/truss import is retained. Whole-building semantic IFC wall/slab/door/window extraction is NOT falsely claimed in this build; use architectural DXF for automatic wall/floor recognition until IFC property mapping is validated.
- Imported recognition is geometry automation, not structural certification. Review wall classifications, levels, openings, bearing lines and load paths before engineering use.

LINKED AUTO-REGENERATION EDITION
- Structural property edits automatically mark linked objects dirty.
- Dependency traversal identifies connected supports/components.
- Affected wall opening/panel framing and floor opening/detail schedules are regenerated while preserving openings.
- Roof support/reaction paths, dependency graph, clash/QA, hardware and service checks are refreshed after edits.
- Regeneration revisions/history can be exported to CSV.
- This is dependency/geometry coordination, not a substitute for validated structural design or manufacturer capacity data.
