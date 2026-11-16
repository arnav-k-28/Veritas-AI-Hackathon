/* Parse local STEP in a worker so it never leaves the browser. */
importScripts('../vendor/cad/occt-import-js.js');
let importer;
self.onmessage = async event => {
  try {
    importer ||= await occtimportjs({ locateFile: name => new URL('../vendor/cad/' + name, self.location.href).href });
    const result = importer.ReadStepFile(new Uint8Array(event.data), null);
    if (!result || !result.success || !Array.isArray(result.meshes) || !result.meshes.length) {
      throw new Error('Could not read 3D geometry from this STEP file.');
    }
    self.postMessage({ result });
  } catch (error) {
    self.postMessage({ error: error && error.message ? error.message : 'Could not read the STEP file.' });
  }
};
