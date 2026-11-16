import io
import json
import os
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import cad


class CadTests(unittest.TestCase):
    def zipfile(self, members):
        file = tempfile.NamedTemporaryFile(suffix='.zip', delete=False)
        file.close()
        self.addCleanup(lambda: os.path.exists(file.name) and os.unlink(file.name))
        with zipfile.ZipFile(file.name, 'w') as archive:
            for name, data in members.items():
                archive.writestr(name, data)
        return file.name

    def test_validate_assembly_package_and_root(self):
        path = self.zipfile({'robot/Robot.iam': b'assembly', 'robot/Part.ipt': b'part'})
        self.assertEqual(cad.validate_file(path, 'robot.zip', 'robot/Robot.iam'), 'robot/Robot.iam')
        with self.assertRaises(cad.CadError):
            cad.validate_file(path, 'robot.zip', 'Wrong.iam')
        with self.assertRaises(cad.CadError):
            cad.validate_file(path, 'robot.iam')

    def test_rejects_unsafe_zip_and_unverified_ips(self):
        path = self.zipfile({'Robot.iam': b'assembly', '../Part.ipt': b'part'})
        with self.assertRaises(cad.CadError):
            cad.validate_file(path, 'robot.zip', 'Robot.iam')
        with self.assertRaises(cad.CadError):
            cad.validate_file(path, 'robot.ips')

    def test_access_keys_are_required_and_admin_is_separate(self):
        with mock.patch.dict(os.environ, {'NOVA_CAD_VIEW_KEY': 'viewer', 'NOVA_CAD_ADMIN_KEY': 'admin'}):
            self.assertTrue(cad.authorized('viewer'))
            self.assertFalse(cad.authorized('viewer', admin=True))
            self.assertTrue(cad.authorized('admin', admin=True))
            self.assertFalse(cad.authorized(''))

    def test_svn_revision_reads_only_configured_working_copy(self):
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / '.svn').mkdir()
            result = mock.Mock(stdout=b'<info><entry revision="42" /></info>')
            with mock.patch.dict(os.environ, {'NOVA_SVN_WORKING_COPY': directory}), \
                 mock.patch.object(cad.subprocess, 'run', return_value=result) as run:
                self.assertEqual(cad.svn_revision(), {'revision': '42'})
            args = run.call_args.args[0]
            self.assertEqual(args[:3], ['svn', 'info', '--xml'])
            self.assertEqual(args[-1], directory)

    def test_svn_list_uses_verified_https_and_only_lists_cad(self):
        body = b'''<D:multistatus xmlns:D="DAV:">
          <D:response><D:href>/</D:href><D:propstat><D:prop><D:resourcetype><D:collection/></D:resourcetype></D:prop></D:propstat></D:response>
          <D:response><D:href>/Robot/</D:href><D:propstat><D:prop><D:resourcetype><D:collection/></D:resourcetype></D:prop></D:propstat></D:response>
          <D:response><D:href>/Part.ipt</D:href><D:propstat><D:prop><D:resourcetype/><D:version-name>42</D:version-name></D:prop></D:propstat></D:response>
          <D:response><D:href>/script.exe</D:href><D:propstat><D:prop><D:resourcetype/></D:prop></D:propstat></D:response>
        </D:multistatus>'''
        class Response:
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def read(self, *args): return body
        opener = mock.Mock()
        opener.open.return_value = Response()
        with mock.patch.object(cad.urllib.request, 'build_opener', return_value=opener):
            data = cad.svn_list('user', 'secret')
        request = opener.open.call_args.args[0]
        self.assertEqual(request.full_url, 'https://svn.lynbrookrobotics.com/')
        self.assertEqual(request.get_method(), 'PROPFIND')
        self.assertEqual([entry['name'] for entry in data['entries']], ['Robot', 'Part.ipt'])
        self.assertEqual(data['entries'][1]['revision'], '42')
        self.assertNotIn('secret', request.full_url)

    def test_svn_rejects_path_traversal_before_network(self):
        with mock.patch.object(cad.urllib.request, 'build_opener') as opener:
            with self.assertRaises(cad.CadError):
                cad.svn_list('user', 'secret', '../private')
            opener.assert_not_called()

    def test_svn_http_requires_explicit_boolean_opt_in(self):
        class Response:
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def read(self, *args): return b'<D:multistatus xmlns:D="DAV:"/>'
        opener = mock.Mock()
        opener.open.return_value = Response()
        with mock.patch.object(cad.urllib.request, 'build_opener', return_value=opener):
            cad.svn_list('user', 'password', allow_http=True)
            self.assertTrue(opener.open.call_args.args[0].full_url.startswith('http://svn.lynbrookrobotics.com/'))
            cad.svn_list('user', 'password', allow_http='true')
            self.assertTrue(opener.open.call_args.args[0].full_url.startswith('https://svn.lynbrookrobotics.com/'))

    def test_svn_uses_read_only_html_index_if_propfind_fails(self):
        import urllib.error
        class Response:
            headers = {'Content-Type': 'text/html; charset=utf-8'}
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def read(self, *args):
                return b'<a href="robots/">Robots</a><a href="part.ipt">Part</a><a href="https://evil.example/secret/">Other</a>'
        opener = mock.Mock()
        opener.open.side_effect = [urllib.error.HTTPError('http://svn.lynbrookrobotics.com/', 500, 'error', {}, None), Response()]
        with mock.patch.object(cad.urllib.request, 'build_opener', return_value=opener):
            result = cad.svn_list('user', 'secret', allow_http=True)
        self.assertEqual([x['name'] for x in result['entries']], ['robots', 'part.ipt'])
        self.assertEqual([call.args[0].get_method() for call in opener.open.call_args_list], ['PROPFIND', 'GET'])
        self.assertEqual(opener.open.call_args_list[1].args[0].full_url, 'http://svn.lynbrookrobotics.com/')

    def test_svn_certificate_failure_is_reported_without_credentials(self):
        opener = mock.Mock()
        opener.open.side_effect = OSError('TLS verification failed')
        with mock.patch.object(cad.urllib.request, 'build_opener', return_value=opener):
            with self.assertRaises(cad.CadError) as error:
                cad.svn_list('user', 'secret')
        self.assertIn('verified HTTPS', str(error.exception))
        self.assertNotIn('secret', str(error.exception))

    def test_svn_assembly_plan_contains_only_cad_files_in_folder(self):
        session = {'username': 'user', 'password': 'secret', 'allow_http': True, 'models': set()}
        entries = {'robot': [{'name': 'robot.iam', 'path': 'robot/robot.iam', 'type': 'file', 'revision': '4'},
                             {'name': 'parts', 'path': 'robot/parts', 'type': 'directory'}],
                   'robot/parts': [{'name': 'wheel.ipt', 'path': 'robot/parts/wheel.ipt', 'type': 'file'}]}
        def listing(_user, _password, path, allow_http=False):
            return {'entries': entries[path], 'truncated': False}
        with mock.patch.object(cad, 'svn_list', side_effect=listing):
            plan = cad.svn_plan(session, 'robot/robot.iam')
        self.assertEqual(plan['files'], ['robot/parts/wheel.ipt', 'robot/robot.iam'])
        self.assertEqual(plan['revision'], '4')
        self.assertTrue(plan['assembly'])

    def test_svn_assembly_can_include_a_parent_project_folder(self):
        session = {'username': 'user', 'password': 'secret', 'allow_http': True, 'models': set()}
        entries = {
            'project/assembly': [{'name': 'robot.iam', 'path': 'project/assembly/robot.iam', 'type': 'file', 'revision': '4'}],
            'project': [{'name': 'assembly', 'path': 'project/assembly', 'type': 'directory'},
                        {'name': 'shared', 'path': 'project/shared', 'type': 'directory'}],
            'project/shared': [{'name': 'wheel.ipt', 'path': 'project/shared/wheel.ipt', 'type': 'file'}],
        }
        def listing(_user, _password, path, allow_http=False):
            return {'entries': entries[path], 'truncated': False}
        with mock.patch.object(cad, 'svn_list', side_effect=listing):
            plan = cad.svn_plan(session, 'project/assembly/robot.iam', 'project')
            self.assertEqual(plan['files'], ['project/assembly/robot.iam', 'project/shared/wheel.ipt'])
            with self.assertRaises(cad.CadError):
                cad.svn_plan(session, 'project/assembly/robot.iam', 'other')

    def test_linked_svn_part_can_include_its_project_folder(self):
        session = {'username': 'user', 'password': 'secret', 'allow_http': True, 'models': set()}
        entries = {'project/parts': [{'name': 'part.ipt', 'path': 'project/parts/part.ipt', 'type': 'file'}],
                   'project': [{'name': 'parts', 'path': 'project/parts', 'type': 'directory'},
                               {'name': 'base.ipt', 'path': 'project/base.ipt', 'type': 'file'}]}
        def listing(_user, _password, path, allow_http=False):
            return {'entries': entries[path], 'truncated': False}
        with mock.patch.object(cad, 'svn_list', side_effect=listing):
            plan = cad.svn_plan(session, 'project/parts/part.ipt', 'project')
        self.assertTrue(plan['packaged'])
        self.assertFalse(plan['assembly'])
        self.assertEqual(plan['files'], ['project/base.ipt', 'project/parts/part.ipt'])

    def test_svn_assembly_is_converted_locally_without_aps(self):
        import local_cad
        session = {'username': 'user', 'password': 'secret', 'allow_http': True, 'models': set()}
        plan = {'selected': 'project/assembly/robot.iam', 'scope': 'project', 'assembly': True,
                'files': ['project/assembly/robot.iam', 'project/shared/wheel.ipt']}
        def convert(path, filename, root):
            with zipfile.ZipFile(path) as archive:
                self.assertEqual(sorted(archive.namelist()), ['assembly/robot.iam', 'shared/wheel.ipt'])
            self.assertEqual((filename, root), ('assembly.zip', 'assembly/robot.iam'))
            return b'STEP geometry'
        with tempfile.TemporaryDirectory() as directory, \
             mock.patch.object(local_cad, 'WORK', Path(directory)), \
             mock.patch.object(cad, 'svn_download', return_value=b'CAD'), \
             mock.patch.object(local_cad, 'convert', side_effect=convert), \
             mock.patch.object(cad, 'aps') as aps:
            self.assertEqual(cad.open_svn_local(session, plan), b'STEP geometry')
            aps.assert_not_called()

    def test_assembly_packaging_uses_approved_list(self):
        session = {'username': 'user', 'password': 'secret', 'allow_http': True, 'models': set()}
        plan = {'selected': 'robot/robot.iam', 'files': ['robot/robot.iam', 'robot/parts/wheel.ipt'],
                'assembly': True, 'revision': '4'}
        def import_model(path, filename, root='', metadata=None):
            with zipfile.ZipFile(path) as archive:
                self.assertEqual(sorted(archive.namelist()), ['parts/wheel.ipt', 'robot.iam'])
            self.assertEqual(root, 'robot.iam')
            return {'id': 'model-id'}
        with tempfile.TemporaryDirectory() as directory, \
             mock.patch.object(cad, 'LIBRARY', Path(directory) / 'library.json'), \
             mock.patch.object(cad, 'svn_download', return_value=b'CAD'), \
             mock.patch.object(cad, 'import_model', side_effect=import_model):
            result = cad.open_svn_model(session, plan)
        self.assertEqual(result['id'], 'model-id')
        self.assertEqual(session['models'], {'model-id'})

    def test_import_submits_signed_upload_and_composite_job(self):
        path = self.zipfile({'Robot.iam': b'assembly', 'Part.ipt': b'part'})
        calls = []
        def aps(path, method='GET', body=None):
            calls.append((path, method, body))
            if '?parts=' in path: return {'urls': ['https://s3.example/upload'], 'uploadKey': 'temporary'}
            if path.endswith('/signeds3upload'): return {'objectId': 'urn:adsk.objects:os.object:bucket/test.zip'}
            return {'result': 'success'}
        class Response:
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def read(self): return b''
        with tempfile.TemporaryDirectory() as directory, \
             mock.patch.object(cad, 'LIBRARY', Path(directory) / 'library.json'), \
             mock.patch.object(cad, 'aps', side_effect=aps), \
             mock.patch.object(cad.urllib.request, 'urlopen', return_value=Response()), \
             mock.patch.dict(os.environ, {'APS_CLIENT_ID': 'id', 'APS_CLIENT_SECRET': 'secret', 'APS_BUCKET': 'bucket',
                                         'NOVA_CAD_VIEW_KEY': 'view', 'NOVA_CAD_ADMIN_KEY': 'admin'}):
            model = cad.import_model(path, 'Robot.zip', 'Robot.iam', {'revision': '123'})
            self.assertEqual(cad.library()[0]['revision'], '123')
            self.assertEqual(model['status'], 'submitted')
        job = calls[-1][2]
        self.assertEqual(job['input']['rootFilename'], 'Robot.iam')
        self.assertTrue(job['input']['compressedUrn'])
        self.assertEqual(job['output']['formats'][0]['type'], 'svf2')


if __name__ == '__main__':
    unittest.main()
