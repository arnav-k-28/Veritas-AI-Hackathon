# Render preview

The Render service uses `backend/render_server.py`, a separate, restricted
server. It serves the website and supports read-only SVN browsing and STEP
viewing. It does not run the chat models, local conversion, Inventor conversion,
or the original local server's other APIs. Keep `translator_server.py` local;
it is not designed as a public multi-user service.

After committing and pushing the updated repository to the Render-linked
branch, set these commands in the Python web service:

* Build: `python -c "print('No build required')"`
* Start: `python backend/render_server.py`

Render supplies `PORT` and `RENDER_EXTERNAL_HOSTNAME`; no manual environment
variables are required. The server accepts CAD requests only from its own
`https://<service>.onrender.com` origin. Do not use a custom domain without
updating the origin policy. The SVN password and session identifier are kept
in server memory, not persisted. Sessions expire after 30 minutes of inactivity
or on service restart; free services may stop after inactivity.

The team's SVN currently uses HTTP when the user explicitly opts in. Although
the browser-to-Render connection uses HTTPS, the Render-to-SVN connection is
unencrypted and transmits the SVN password and CAD files over the network.
The HTTP opt-in remains required. The proxy handles read-only SVN operations
and never commits changes. A separate Inventor-capable or Autodesk conversion
service is needed for `.ipt` and `.iam`, and a separate model host is needed
for AI answers.

The preview has basic request bounds and origin checks, but is not a complete
production authentication system. Review hosting and network security before
using it for sensitive team material. Real SVN credentials and a deployment
must be tested separately; mocked tests alone do not establish connectivity.
