"""Convert a local Inventor file to STEP using an isolated Inventor instance."""
import os
import subprocess
import sys
from pathlib import Path


def main(source, output):
    package_dir = 'cad-python' if sys.version_info[:2] == (3, 10) else 'cad-python-' + sys.implementation.cache_tag
    packages = Path(__file__).resolve().parent.parent / '.runtime' / package_dir
    for path in (packages, packages / 'win32', packages / 'win32' / 'lib'):
        sys.path.insert(0, str(path))
    dlls = packages / 'pywin32_system32'
    if dlls.is_dir():
        os.add_dll_directory(str(dlls))
    try:
        import pythoncom
        import win32com.client.dynamic
    except ImportError as exc:
        raise RuntimeError('Windows COM support is not installed for local Inventor conversion.') from exc
    processes = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq Inventor.exe', '/NH'],
                               capture_output=True, text=True, timeout=10, check=True,
                               creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    if 'inventor.exe' in processes.stdout.lower():
        raise RuntimeError('Close Inventor before opening a native file in Nova, so your open work is not disturbed.')
    pythoncom.CoInitialize()
    app = doc = None
    try:
        clsid = pythoncom.MakeIID('Inventor.Application')
        dispatch = pythoncom.CoCreateInstanceEx(clsid, None, pythoncom.CLSCTX_LOCAL_SERVER, None, (pythoncom.IID_IDispatch,))[0]
        app = win32com.client.dynamic.Dispatch(dispatch)
        app.Visible = False
        app.SilentOperation = True
        logic = app.ApplicationAddIns.ItemById('{3BDD8D79-2179-4B11-8A5A-257B1C0263AC}')
        if not logic.Activated:
            logic.Activate()
        automation = logic.Automation
        if not automation:
            raise RuntimeError('Could not safely disable automatic iLogic rules.')
        automation.RulesEnabled = False
        automation.RulesOnEventsEnabled = False
        if automation.RulesEnabled or automation.RulesOnEventsEnabled:
            raise RuntimeError('Could not safely disable automatic iLogic rules.')
        doc = app.Documents.Open(str(source), False)
        docs = [doc] + list(doc.AllReferencedDocuments)
        for item in docs:
            for reference in item.File.ReferencedFileDescriptors:
                if reference.ReferenceMissing:
                    raise RuntimeError('An Inventor reference is missing or suppressed. Include all assembly dependencies.')
        translator = app.ApplicationAddIns.ItemById('{90AF7F40-0C01-11D5-8E83-0010B541CD80}')
        if not translator.Activated:
            translator.Activate()
        context = app.TransientObjects.CreateTranslationContext()
        context.Type = 13059
        options = app.TransientObjects.CreateNameValueMap()
        medium = app.TransientObjects.CreateDataMedium()
        medium.FileName = str(output)
        translator.SaveCopyAs(doc, context, options, medium)
        if not Path(output).is_file():
            raise RuntimeError('Inventor did not produce a STEP file.')
    finally:
        if doc:
            try:
                doc.Close(True)
            except Exception:
                pass
        if app:
            try:
                app.Quit()
            except Exception:
                pass
        pythoncom.CoUninitialize()


if __name__ == '__main__':
    try:
        main(sys.argv[1], sys.argv[2])
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
