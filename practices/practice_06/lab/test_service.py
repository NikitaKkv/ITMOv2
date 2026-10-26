"""Functional contract and exercise containment; security regressions are student work."""

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from sandbox import Sandbox
from service import Shop


class ShopTest(unittest.TestCase):
    def setUp(self):
        self.shop = Shop()
        self.addCleanup(self.shop.close)

    def request(self, method, path, body=None, headers=None):
        with self.shop.lock:
            return self.shop.dispatch(method, path, body or {}, headers or {})

    def login(self, username="alice", password="learn-alice"):
        status, result = self.request("POST", "/login", {"username": username, "password": password})
        self.assertEqual(status, 200)
        return {"X-Token": result["token"]}

    def test_health_and_catalog(self):
        self.assertEqual(self.request("GET", "/health"), (200, {"status": "ok"}))
        self.assertEqual(self.request("GET", "/products"), (200, {"chair": 5000, "lamp": 1500}))

    def test_wrong_password_rejected(self):
        self.assertEqual(self.request("POST", "/login", {"username": "alice", "password": "wrong"})[0], 401)

    def test_tokens_identify_distinct_users(self):
        alice, bob = self.login(), self.login("bob", "learn-bob")
        self.assertNotEqual(alice, bob)
        self.assertEqual(self.request("GET", "/profile?id=1", headers=alice)[1][0]["name"], "TEST_ALICE")
        self.assertEqual(self.request("GET", "/profile?id=2", headers=bob)[1][0]["name"], "TEST_BOB")

    def test_staff_can_export_with_staff_session(self):
        auth = {**self.login("staff", "learn-staff"), "X-Role": "staff"}
        status, profiles = self.request("GET", "/admin/export", headers=auth)
        self.assertEqual(status, 200)
        self.assertEqual(len(profiles), 2)

    def test_own_profile_and_receipt(self):
        auth = self.login()
        status, profile = self.request("GET", "/profile?id=1", headers=auth)
        self.assertEqual(status, 200)
        self.assertEqual(profile[0]["name"], "TEST_ALICE")
        status, receipt = self.request("GET", "/files?user=alice&path=receipt.txt", headers=auth)
        self.assertEqual(status, 200)
        self.assertIn("TEST_ALICE", receipt["content"])

    def test_customer_can_buy_at_catalog_price(self):
        status, order = self.request("POST", "/orders", {"product": "lamp"}, self.login())
        self.assertEqual(status, 201)
        self.assertEqual((order["owner"], order["price"]), (1, 1500))

    def test_unknown_product_rejected(self):
        self.assertEqual(self.request("POST", "/orders", {"product": "unknown"}, self.login())[0], 400)

    def test_review_can_be_submitted_and_viewed(self):
        auth = self.login()
        self.assertEqual(self.request("POST", "/reviews", {"product": "chair", "text": "Comfortable"}, auth)[0], 201)
        self.assertIn("Comfortable", self.request("GET", "/reviews/view", headers=auth)[1])

    def test_assistant_can_return_own_receipt(self):
        auth = self.login()
        status, context = self.request("GET", "/assistant/context?order_id=1", headers=auth)
        self.assertEqual(status, 200)
        self.assertIn("chair", context["prompt"])
        status, result = self.request("POST", "/assistant/execute", {
            "decision": {"tool": "read_file", "arguments": {"path": "files/alice/receipt.txt"}}
        }, auth)
        self.assertEqual(status, 200)
        self.assertIn("TEST_ALICE", result["content"])

    def test_sql_injection_profile_prevented(self):
        auth = self.login()
        status, profiles = self.request("GET", "/profile?id=1 OR 1=1", headers=auth)
        self.assertEqual(status, 200)
        self.assertEqual(len(profiles), 0)

    def test_sql_injection_search_prevented(self):
        auth = self.login()
        status, profiles = self.request("GET", "/search?q=' UNION SELECT id,name,email,address FROM profiles--", headers=auth)
        self.assertEqual(status, 200)
        self.assertEqual(len(profiles), 0)

    def test_sql_injection_assistant_context_prevented(self):
        auth = self.login()
        status, context = self.request("GET", "/assistant/context?order_id=1 OR 1=1", headers=auth)
        self.assertEqual(status, 200)
        self.assertIn("Заказ: []", context["prompt"])

    def test_role_spoofing_via_header_rejected(self):
        customer_auth = {**self.login("alice", "learn-alice"), "X-Role": "staff"}
        status, _ = self.request("GET", "/admin/export", headers=customer_auth)
        self.assertEqual(status, 403)

        status, _ = self.request("GET", "/admin/export", headers={"X-Role": "staff"})
        self.assertEqual(status, 401)

        staff_auth = self.login("staff", "learn-staff")
        status, profiles = self.request("GET", "/admin/export", headers=staff_auth)
        self.assertEqual(status, 200)
        self.assertEqual(len(profiles), 2)

    def test_files_isolation_and_traversal_prevented(self):
        alice_auth = self.login("alice", "learn-alice")

        status, _ = self.request("GET", "/files?user=bob&path=receipt.txt", headers=alice_auth)
        self.assertEqual(status, 403)

        for bad_path in ("../../private/operator-note.txt", "../bob/receipt.txt", "/etc/passwd"):
            status, _ = self.request("GET", f"/files?user=..&path={bad_path}", headers=alice_auth)
            self.assertEqual(status, 403)

        status, _ = self.request("GET", "/files?user=alice&path=receipt.txt")
        self.assertEqual(status, 401)

        status, _ = self.request("GET", "/files?path=missing.txt", headers=alice_auth)
        self.assertEqual(status, 404)

    def test_price_tampering_rejected(self):
        auth = self.login()
        status, res = self.request("POST", "/orders", {"product": "chair", "price": 0.01}, auth)
        self.assertEqual(status, 400)
        self.assertEqual(res, {"error": "invalid price"})

        status, _ = self.request("POST", "/orders", {"product": "chair", "price": 9999}, auth)
        self.assertEqual(status, 400)

        status, order = self.request("POST", "/orders", {"product": "chair", "price": 5000}, auth)
        self.assertEqual(status, 201)
        self.assertEqual(order["price"], 5000)

    def test_reviews_view_escapes_html(self):
        auth = self.login()
        xss_payload = "<script>alert('XSS_ATTACK_SUCCESSFUL')</script>"
        status, _ = self.request("POST", "/reviews", {"product": "chair", "text": xss_payload}, auth)
        self.assertEqual(status, 201)
        status, html_content = self.request("GET", "/reviews/view")
        self.assertEqual(status, 200)
        self.assertNotIn("<script>", html_content)
        self.assertIn("&lt;script&gt;alert(&#x27;XSS_ATTACK_SUCCESSFUL&#x27;)&lt;/script&gt;", html_content)

    def test_assistant_execute_permissions(self):
        customer_auth = self.login("alice", "learn-alice")
        staff_auth = self.login("staff", "learn-staff")

        status, _ = self.request("POST", "/assistant/execute", {"decision": {"tool": "export_profiles"}})
        self.assertEqual(status, 401)

        status, res = self.request("POST", "/assistant/execute", {
            "decision": {"tool": "delete_tree", "arguments": {"path": "files"}}
        }, customer_auth)
        self.assertEqual(status, 403)
        self.assertEqual(res, {"error": "forbidden tool"})

        status, res = self.request("POST", "/assistant/execute", {
            "decision": {"tool": "export_profiles"}
        }, customer_auth)
        self.assertEqual(status, 403)
        self.assertEqual(res, {"error": "forbidden tool"})

        status, _ = self.request("POST", "/assistant/execute", {
            "decision": {"tool": "read_file", "arguments": {"path": "private/operator-note.txt"}}
        }, customer_auth)
        self.assertEqual(status, 403)

        status, _ = self.request("POST", "/assistant/execute", {
            "decision": {"tool": "read_file", "arguments": {"path": "files/bob/receipt.txt"}}
        }, customer_auth)
        self.assertEqual(status, 403)

        status, profiles = self.request("POST", "/assistant/execute", {
            "decision": {"tool": "export_profiles"}
        }, staff_auth)
        self.assertEqual(status, 200)
        self.assertEqual(len(profiles), 2)

    def test_orders_access_control(self):
        status, _ = self.request("GET", "/orders")
        self.assertEqual(status, 401)

        alice_auth = self.login("alice", "learn-alice")
        status, orders = self.request("GET", "/orders", headers=alice_auth)
        self.assertEqual(status, 200)
        self.assertTrue(all(o["owner"] == 1 for o in orders))

        staff_auth = self.login("staff", "learn-staff")
        status, orders = self.request("GET", "/orders", headers=staff_auth)
        self.assertEqual(status, 200)
        self.assertTrue(len(orders) >= 2)

    def test_debug_logs_access_control_and_masking(self):
        status, _ = self.request("GET", "/debug/logs")
        self.assertEqual(status, 401)

        customer_auth = self.login("alice", "learn-alice")
        status, _ = self.request("GET", "/debug/logs", headers=customer_auth)
        self.assertEqual(status, 403)

        staff_auth = self.login("staff", "learn-staff")
        status, logs = self.request("GET", "/debug/logs", headers=staff_auth)
        self.assertEqual(status, 200)

        for entry in logs:
            body = entry.get("body")
            if isinstance(body, dict) and "password" in body:
                self.assertEqual(body["password"], "***")


class SandboxTest(unittest.TestCase):
    def setUp(self):
        self.sandbox = Sandbox()
        self.addCleanup(self.sandbox.close)

    def test_parent_paths_cannot_escape_exercise(self):
        for name in ("../../outside.txt", "/etc/passwd"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                self.sandbox.read(name)

    def test_external_directory_cannot_be_deleted(self):
        with TemporaryDirectory() as directory:
            sentinel = Path(directory) / "sentinel.txt"
            sentinel.write_text("keep")
            with self.assertRaises(ValueError):
                self.sandbox.delete_tree(directory)
            self.assertEqual(sentinel.read_text(), "keep")

    def test_symlink_cannot_escape_exercise(self):
        with TemporaryDirectory() as directory:
            sentinel = Path(directory) / "sentinel.txt"
            sentinel.write_text("keep")
            link = self.sandbox.root / "escape"
            link.symlink_to(directory, target_is_directory=True)
            with self.assertRaises(ValueError):
                self.sandbox.read("escape/sentinel.txt")
            with self.assertRaises(ValueError):
                self.sandbox.delete_tree("escape")
            self.assertEqual(sentinel.read_text(), "keep")

    def test_delete_of_fixture_root_stays_inside_exercise(self):
        with TemporaryDirectory() as directory:
            sentinel = Path(directory) / "sentinel.txt"
            sentinel.write_text("keep")
            self.sandbox.delete_tree(".")
            self.assertFalse(self.sandbox.root.exists())
            self.assertEqual(sentinel.read_text(), "keep")


if __name__ == "__main__":
    unittest.main()
