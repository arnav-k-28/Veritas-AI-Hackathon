/* Package only the local Inventor files selected by the user. */
importScripts('../vendor/cad/fflate.js');
self.onmessage = async event => {
  try {
    const files = event.data.files;
    if (!files.length || files.length > 200) throw new Error('The assembly folder must contain at most 200 Inventor files.');
    const total = files.reduce((n, entry) => n + entry.file.size, 0);
    if (total > 100 * 1024 * 1024) throw new Error('The assembly folder exceeds the 100 MB limit.');
    const entries = Object.create(null);
    for (const entry of files) entries[entry.path] = new Uint8Array(await entry.file.arrayBuffer());
    const zip = fflate.zipSync(entries, { level: 0 });
    if (zip.byteLength > 100 * 1024 * 1024) throw new Error('The assembly package exceeds the 100 MB limit.');
    const bytes = zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength);
    self.postMessage({ bytes }, [bytes]);
  } catch (error) {
    self.postMessage({ error: error && error.message ? error.message : 'Could not read the assembly folder.' });
  }
};
