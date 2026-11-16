"""Read local Inventor files using the installed desktop Inventor application."""
import importlib.util
import os
from pathlib import Path, PurePosixPath
import stat
import subprocess
import sys
import tempfile
import threading
import zipfile

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / '.runtime' / 'cad-local'
PACKAGES = ROOT / '.runtime' / ('cad-python' if sys.version_info[:2] == (3, 10) else 'cad-python-' + sys.implementation.cache_tag)
LIMIT = 100 * 1024 * 1024
LOCK = threading.Lock()


class LocalCadError(Exception):
    pass


def extract_assembly(archive_path, root, destination):
    """Extract only a bounded, explicitly selected Inventor folder package."""
    if not isinstance(root, str) or not root.lower().endswith(('.iam', '.ipt')):
        raise LocalCadError('Select the top-level Inventor assembly or part.')
    names = set()
    total = 0
    try:
        with zipfile.ZipFile(archive_path) as archive:
            for item in archive.infolist():
                if item.is_dir():
                    continue
                name = item.filename
                p = PurePosixPath(name)
                if (not name or len(name) > 1000 or '\\' in name or ':' in name or '\x00' in name
                        or p.is_absolute() or any(part in ('.', '..') for part in p.parts)
                        or stat.S_ISLNK(item.external_attr >> 16) or item.flag_bits & 1
                        or p.suffix.lower() not in ('.iam', '.ipt', '.ipj')
                        or name.casefold() in names):
                    raise LocalCadError('The assembly package contains an unsafe or unsupported path.')
                names.add(name.casefold())
                total += item.file_size
                if len(names) > 200 or total > LIMIT:
                    raise LocalCadError('The assembly folder exceeds the 200-file or 100 MB limit.')
                target = destination.joinpath(*p.parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(item) as source, open(target, 'wb') as out:
                    while True:
                        block = source.read(1024 * 1024)
                        if not block:
                            break
                        out.write(block)
        if root.casefold() not in names or not destination.joinpath(*PurePosixPath(root).parts).is_file():
            raise LocalCadError('The selected assembly was not found in that folder.')
        return destination.joinpath(*PurePosixPath(root).parts)
    except (OSError, zipfile.BadZipFile) as exc:
        raise LocalCadError('Could not read the local assembly folder.') from exc


def _ensure_windows_com():
    if (PACKAGES / 'pythoncom.py').is_file() or importlib.util.find_spec('win32com'):
        return
    try:
        result = subprocess.run([sys.executable, '-m', 'pip', 'install', '--disable-pip-version-check',
                                 '--target', str(PACKAGES), 'pywin32>=306,<313'],
                                capture_output=True, timeout=240, check=False,
                                creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise LocalCadError('Could not install the Windows helper. Check your internet connection and Python installation.') from exc
    if result.returncode != 0:
        raise LocalCadError('Could not install the Windows helper. Check your internet connection and Python installation.')


def convert(input_path, filename, root=''):
    if os.name != 'nt':
        raise LocalCadError('Opening Inventor files locally requires Inventor on Windows.')
    ext = Path(filename).suffix.lower()
    if Path(filename).name != filename or ext not in ('.ipt', '.zip'):
        raise LocalCadError('Choose an Inventor part or an assembly folder.')
    if not 0 < os.path.getsize(input_path) <= LIMIT:
        raise LocalCadError('The selected files exceed the 100 MB limit or are empty.')
    if not LOCK.acquire(blocking=False):
        raise LocalCadError('Another Inventor file is already opening. Please wait.')
    try:
        _ensure_windows_com()
        WORK.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=WORK) as tmp:
            directory = Path(tmp)
            if ext == '.zip':
                source = extract_assembly(input_path, root, directory)
            else:
                source = directory / 'part.ipt'
                source.write_bytes(Path(input_path).read_bytes())
            output = directory / 'model.step'
            try:
                result = subprocess.run([sys.executable, str(ROOT / 'backend' / 'inventor_to_step.py'), str(source), str(output)],
                                        capture_output=True, timeout=300, check=False,
                                        creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            except (OSError, subprocess.TimeoutExpired) as exc:
                raise LocalCadError('Inventor did not finish the local conversion. Check that Inventor is installed and activated.') from exc
            if result.returncode != 0 or not output.is_file():
                message = result.stderr.decode('utf-8', 'replace').strip()
                raise LocalCadError(message[:500] or 'Inventor could not open the selected file.')
            if output.stat().st_size > LIMIT:
                raise LocalCadError('The converted model exceeds the 100 MB limit.')
            return output.read_bytes()
    finally:
        LOCK.release()
