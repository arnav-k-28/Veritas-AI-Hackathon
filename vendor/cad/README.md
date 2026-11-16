# Local CAD viewer dependencies

* Three.js 0.167.1, MIT: https://github.com/mrdoob/three.js/tree/r167
  (`three.module.js`, `OrbitControls.js`, `three-LICENSE.txt`). The controls
  import path is changed to reference the bundled module.
* occt-import-js 0.0.23, LGPL-2.1: https://github.com/kovacsv/occt-import-js/tree/0.0.23
  (`occt-import-js.js`, `occt-import-js.wasm`, `occt-LICENSE.md`). Its source
  and build instructions are available at that URL. The small STEP test model
  in `tests/fixtures/cad-cube.stp` comes from the same project and release.
* fflate 0.8.2, MIT: https://github.com/101arrowz/fflate/tree/v0.8.2
  (`fflate.js`, `fflate-LICENSE.txt`), for packaging an explicitly selected
  local assembly folder.
