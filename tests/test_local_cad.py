import tempfile
import unittest
import zipfile
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import local_cad


class LocalCadTests(unittest.TestCase):
    def test_extract_preserves_assembly_references(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            archive = base / 'assembly.zip'
            out = base / 'out'
            out.mkdir()
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr('robot/robot.iam', b'assembly')
                z.writestr('robot/parts/wheel.ipt', b'part')
            result = local_cad.extract_assembly(archive, 'robot/robot.iam', out)
            self.assertEqual(result.read_bytes(), b'assembly')
            self.assertEqual((out / 'robot/parts/wheel.ipt').read_bytes(), b'part')

    def test_extract_accepts_a_linked_part_as_root(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            archive = base / 'parts.zip'
            out = base / 'out'
            out.mkdir()
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr('parts/wheel.ipt', b'part')
                z.writestr('base.ipt', b'base')
            self.assertEqual(local_cad.extract_assembly(archive, 'parts/wheel.ipt', out).read_bytes(), b'part')

    def test_rejects_traversal_and_non_cad_files(self):
        for bad in ('../escape.ipt', 'robot/run.exe', 'C:/outside.ipt'):
            with self.subTest(name=bad), tempfile.TemporaryDirectory() as directory:
                base = Path(directory)
                archive = base / 'assembly.zip'
                out = base / 'out'
                out.mkdir()
                with zipfile.ZipFile(archive, 'w') as z:
                    z.writestr('robot.iam', b'assembly')
                    z.writestr(bad, b'bad')
                with self.assertRaises(local_cad.LocalCadError):
                    local_cad.extract_assembly(archive, 'robot.iam', out)
                self.assertFalse((base / 'escape.ipt').exists())


if __name__ == '__main__':
    unittest.main()
