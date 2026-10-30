import base64
import copy
import importlib.machinery
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pipeline/skills"))
import auth
import validation as v

loader = importlib.machinery.SourceFileLoader("gh_sync", str(ROOT / "pipeline/skills/github/bin/gh-sync"))
spec = importlib.util.spec_from_loader(loader.name, loader)
sync = importlib.util.module_from_spec(spec)
loader.exec_module(sync)


class SecurityTests(unittest.TestCase):
    def setUp(self):
        self.files = sync.collect_files(ROOT)
        self.proposal_path = "proposals/monk-rogue-class-tweaks.json"
        self.proposal = json.loads(self.files[self.proposal_path])

    def snapshot(self, directory):
        for p, raw in self.files.items():
            target = Path(directory) / p
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(raw)

    def test_current_data_validates(self):
        self.assertEqual(len(v.validate_snapshot(self.files)), 14)

    def test_secrets_and_code_are_not_selected(self):
        with tempfile.TemporaryDirectory() as d:
            self.snapshot(d)
            (Path(d) / ".env").write_text("FAKE_SECRET=not-a-real-credential")
            (Path(d) / "private.pem").write_text("fake private material")
            (Path(d) / "proposals" / "notes.txt").write_text("private notes")
            self.assertEqual(sync.collect_files(d), self.files)

    def test_selected_symlink_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            self.snapshot(d)
            p = Path(d) / self.proposal_path
            outside = Path(d) / "private.txt"
            outside.write_text("FAKE_PRIVATE_DATA")
            p.unlink()
            try:
                p.symlink_to(outside)
            except OSError:
                self.skipTest("OS does not allow creating test symlinks")
            with self.assertRaises(ValueError):
                sync.collect_files(d)

    def test_oversized_data_is_rejected(self):
        with self.assertRaises(ValueError):
            v.parse_data(b" " * (v.MAX_FILE_BYTES + 1))

    def test_duplicate_json_keys_are_rejected(self):
        with self.assertRaises(ValueError):
            v.parse_data(b'{"status":"To Present","status":"Withdraw/Fail"}')

    def test_malformed_proposal_fields(self):
        for field, value in (("status", "constructor"), ("status", "__proto__"),
                             ("summary", "not-an-array"), ("hidden", "true"),
                             ("presented_at_senate", "2026-02-30"),
                             ("name", "x" * 301)):
            with self.subTest(field=field, value=value):
                p = {**self.proposal, field: value}
                with self.assertRaises(ValueError):
                    v.validate_proposal(p, p["id"] + ".json")

    def test_unsafe_links_are_rejected(self):
        for url in ("javascript:alert(1)", "data:text/html,test", "https://evil.example/login",
                    "https://docs.google.com.evil.example/document/d/id/edit",
                    "https://user@docs.google.com/document/d/id/edit",
                    "https://docs.google.com:444/document/d/id/edit",
                    "https://docs.google.com/document/d/id/edit\n"):
            self.assertFalse(v.safe_url(url, "doc"), url)
        self.assertTrue(v.safe_url(self.proposal["doc_url"], "doc"))

    def test_automation_protects_outcomes_and_terminal_records(self):
        old = copy.deepcopy(self.proposal)
        for status in v.STATUSES[2:]:
            old["status"] = status
            with self.assertRaises(ValueError):
                v.validate_automation_change(old, {**old, "notes": "changed"})
        with self.assertRaises(ValueError):
            v.validate_automation_change(self.proposal, {**self.proposal, "vote_result": ["passed_senate"]})
        with self.assertRaises(ValueError):
            v.validate_automation_change(self.proposal, {**self.proposal, "status": "Passed BOD"})

    def test_document_refresh_and_presentation_are_allowed(self):
        v.validate_automation_change(self.proposal, {**self.proposal, "summary": ["Updated wording"]})
        v.validate_automation_change(self.proposal, {**self.proposal, "status": "Up for Vote",
                                                   "presented_at_senate": "2026-11-14"})
        v.validate_automation_change(None, self.proposal)
        v.validate_automation_change(None, {**self.proposal, "status": "Up for Vote",
                                          "presented_at_senate": "2026-11-14"})
        with self.assertRaises(ValueError):
            v.validate_automation_change(None, {**self.proposal, "status": "Up for Vote"})

    def test_main_branch_is_rejected_before_network(self):
        with mock.patch.object(sync, "api_request") as api:
            with self.assertRaises(ValueError):
                sync.publish("owner/repo", "main", "main", self.files, "Update")
            api.assert_not_called()

    def fake_api(self, calls):
        blobs = {str(i): raw for i, raw in enumerate(self.files.values())}
        tree = [{"path": p, "mode": "100644", "type": "blob", "sha": str(i)}
                for i, p in enumerate(self.files)]
        def api(method, path, payload=None):
            calls.append((method, path, payload))
            if method == "POST":
                if path.endswith("/pulls"):
                    return {"html_url": "https://github.com/owner/repo/pull/1"}
                return {"sha": "new-object"}
            if "/git/ref/" in path:
                return {"object": {"sha": "base-commit"}}
            if "/git/commits/" in path:
                return {"tree": {"sha": "base-tree"}}
            if "/git/trees/" in path:
                return {"tree": tree, "truncated": False}
            return {"content": base64.b64encode(blobs[path.rsplit("/", 1)[1]]).decode()}
        return api

    def test_invalid_changes_make_no_remote_writes(self):
        calls = []
        changed = {**self.files, self.proposal_path: json.dumps({**self.proposal, "status": "Passed BOD"}).encode()}
        with mock.patch.object(sync, "api_request", side_effect=self.fake_api(calls)):
            with self.assertRaises(ValueError):
                sync.publish("owner/repo", "automation/test", "main", changed, "Update")
        self.assertTrue(all(method == "GET" for method, _, _ in calls))

    def test_publish_uses_one_commit_new_branch_and_pr(self):
        calls = []
        changed = {**self.files, self.proposal_path: json.dumps({**self.proposal, "summary": ["Updated"]}).encode()}
        with mock.patch.object(sync, "api_request", side_effect=self.fake_api(calls)):
            sync.publish("owner/repo", "automation/test", "main", changed, "Update")
        writes = [(path, payload) for method, path, payload in calls if method == "POST"]
        self.assertEqual(sum(path.endswith("/git/commits") for path, _ in writes), 1)
        ref = next(payload for path, payload in writes if path.endswith("/git/refs"))
        self.assertEqual(ref["ref"], "refs/heads/automation/test")
        pr = next(payload for path, payload in writes if path.endswith("/pulls"))
        self.assertEqual(pr["base"], "main")

    def test_environment_auth_checks_origin(self):
        with mock.patch.dict(auth.os.environ, {"GITHUB_TOKEN": "fake-test-token"}), \
                mock.patch.object(auth, "_muse_attach", return_value=False):
            for url in ("https://evil.example/", "http://api.github.com/", "https://api.github.com:444/",
                        "https://user@api.github.com/"):
                with self.assertRaises(ValueError):
                    auth.attach_auth(urllib.request.Request(url), "github")
            req = urllib.request.Request("https://api.github.com/repos/owner/repo")
            auth.attach_auth(req, "github")
            self.assertEqual(req.get_header("Authorization"), "Bearer fake-test-token")
            self.assertNotIn("Authorization", req.headers)

    def test_redirects_are_not_followed(self):
        handler = auth.NoAuthRedirects()
        with self.assertRaises(urllib.error.HTTPError) as captured:
            handler.redirect_request(urllib.request.Request("https://api.github.com/"), io.BytesIO(),
                                     302, "Found", {}, "https://evil.example/")
        captured.exception.close()


if __name__ == "__main__":
    unittest.main()
