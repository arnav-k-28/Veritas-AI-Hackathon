# CAD viewer

## Open a local STEP file without APS

Open Nova at `http://127.0.0.1:8787/`, choose **CAD viewer**, then choose
**Open local file** on the sign-in screen. Select a `.step`, `.stp`, `.ipt`,
or `.iam` file. STEP files are processed inside the browser with the bundled
OpenCascade-based reader. Inventor files are sent only to the Nova server on
the same computer, converted to a temporary STEP copy with locally installed
Inventor, and then rendered in the browser. They are not sent to SVN or
Autodesk's cloud. Orbit by dragging, zoom
with the wheel, pan with right-drag, and select a component in the view or list.
The local viewer can fit, focus and isolate components. The importer provides
triangulated geometry for display, not a measurement API, so measurement and
section tools are disabled for local models. Component properties are limited
to names returned by the importer. This is not a replacement for Inventor's
precise geometry tools.

Local Inventor conversion requires Windows, an installed and activated Inventor
version that can open the source files, and Python's Windows COM helper. Nova
installs that helper into `.runtime/cad-python` from PyPI on first use, so that
first use requires internet access. Close Inventor before opening an Inventor
file in Nova: the converter avoids attaching to an existing Inventor session.
It disables automatic iLogic rules before opening the file and does not save or
commit the source file. The conversion can take several minutes to start.
If asked to open an assembly, select the folder containing it and all of its
referenced parts and subassemblies. Nova copies only `.iam`, `.ipt`, and `.ipj`
files from that folder to temporary local storage. It cannot access references
outside the selected folder; missing or suppressed references cause an error.
Linked parts may require a complete project folder. Local viewing has no SVN
or APS credentials requirement.

The local viewer bundles Three.js 0.167.1 (MIT), fflate 0.8.2 (MIT), and
occt-import-js 0.0.23 (LGPL-2.1); source and license notices are in `vendor/cad/`.

## Open a file from SVN

The SVN browser uses a server running on the same computer as the browser.
Opening a hosted website alone does not start it. On a Mac, download the Nova
folder, install Python 3.10 or newer, open Terminal in the folder, and run
`bash "Start Nova.command"`. Open the local address that the launcher shows.
Mac users can browse SVN and view STEP files; Inventor `.ipt` and `.iam`
conversion requires Windows with Inventor installed.

Nova's CAD viewer signs users in to the Team 846 SVN server and lets them select
an Inventor part (`.ipt`), assembly (`.iam`), or STEP file (`.step` / `.stp`).
There is no separate CAD access key or approved-model selector. Nova uses
read-only SVN requests; it does not commit to SVN.

1. Open Nova at `http://127.0.0.1:8787/`, open **CAD viewer**, and sign in to
   SVN. A checkbox permits HTTP for the team's existing server. HTTP transmits
   passwords and CAD data unencrypted; the user must explicitly opt in each
   time. HTTPS is preferred, but the server's certificate did not match the
   hostname when checked.
2. Browse the SVN folders and select a `.ipt`, `.iam`, `.step`, or `.stp`.
   Nova reads the file from SVN, converts Inventor files using local Inventor,
   and displays the result inside Nova. This path does not use APS. Inventor
   must be installed and closed, as described above. No source files are
   modified or committed. Conversion can take several minutes.
3. For an assembly, Nova copies `.iam`, `.ipt`, and `.ipj` files from its
   folder and descendants, preserving their paths. References outside this
   folder may be missing. If Inventor reports a missing reference for an
   assembly or linked part, use **Choose Inventor project folder** to specify
   an ancestor SVN folder containing the shared parts. The traversal is limited
   to 200 CAD files and directories and 100 MB of source data. This is not
   automatic dependency discovery and cannot guarantee every file will resolve.

The download uses the current SVN file contents; it is not pinned to an atomic
SVN revision. If files change while being copied, the assembled result can differ
from the source. Temporary local copies are removed after conversion.

## Access and security

SVN passwords and temporary session identifiers are kept in server memory,
not saved to Git or disk. Close the CAD panel to end the session. The session
expires after 30 minutes of inactivity, and the server clears expired entries
on later session operations. Nova serves the CAD APIs only on its local
loopback address and checks the browser origin. This is a local prototype, not
a production multi-user authorization system. Do not expose it on a public
network. Real authenticated team SVN browsing and conversion have not been
end-to-end tested by the developer without the user's credentials.
`.ips` is not accepted: Autodesk documents `.ipt` as the Inventor part format.
The AI receives selected component properties but cannot control the viewer or
read measurement results.
