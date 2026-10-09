# AI-Truss-Design-Studio
Designing structural roof trusses can often be a repetitive and time-consuming process. To bridge the gap between architectural layouts and structural framing, I’ve built an open-source project: AI-Truss-Design!  This tool is designed to help draftspeople, structural engineers, and designers streamline layout generation and geometry processing.

## EWP Coordinated Floor Engine v3
The EWP Floor Framing PRO module now regenerates joist geometry around floor openings, creates paired opening headers and doubled trimmers, stores explicit perimeter rim members, and exports coordinated framing geometry. Existing roof/truss and whole-building functions are retained. Manufacturer-specific capacities remain DESIGN REQUIRED.

V9.5 REFERENCE CONNECTION CORRECTION
- Ridge/top-chord apex: both top chords terminate at a shared apex envelope; no member edge extends past the peak.
- Heel: bottom chord remains the lower envelope and terminates at the analytical heel; no L-shaped return/notch is generated.
- Top chord alone continues as the eave overhang.
- Webs are secondary infill members and are face-fitted between TC/BC. Signed edge offsets are allowed so a diagonal web keeps its full rectangular section up to the oblique saw cut instead of collapsing into a triangular wedge.
- Analytical panel points are unchanged.

## V9.6 exact reference joint correction
- Ridge miter now straddles the analytical apex so both top-chord solids share one zero-gap seam. V9.5 incorrectly shifted both cut edges inward and created a V-notch.
- Bottom chords at true heels are now physically face-cut to the sloping top chord while the analytical heel node remains fixed; this removes the square/hooked BC end.
- Webs continue to be fitted between chord faces with constant section depth and oblique end faces.
- Free top-chord eave tails remain untouched.


The workflow in short:

install Python 3.xx version, 
Then double-click Start_CadTech.bat (Windows) The app opens in your browser. Keep the terminal window open.
Import: load a DXF, IFC or OBJ roof. For DXF, put the roof lines on one layer and the truss center lines on a layer named exactly TRUSSES. Try the files in examples/ first.
Set parameters: choose the layers, CAD units and roof angle, plus the heel drop, panel length and overhang. Click Rebuild CAD roof after any change.
Generate: click Generate complete roof to build the trusses.
Inspect: switch between Plan, Front, Side, Split and 3D views, and use Find truss and Isolate to look at individual trusses.
Analyze: enter your loads, click Analyze all trusses, then run auto-design. Review every PASS or FAIL and every DESIGN REQUIRED item.
Export: use CadTech truss design PDF to Truss Report and Wood take-off
