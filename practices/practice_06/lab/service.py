"""Deliberately vulnerable local shop. All identities and data are synthetic."""

import argparse
import html
import json
import sqlite3
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

from sandbox import Sandbox


class Shop:
    def __init__(self):
        self.sandbox = Sandbox()
        self.lock = threading.RLock()
        self.db = sqlite3.connect(":memory:", check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.executescript("""
            CREATE TABLE profiles(id INTEGER PRIMARY KEY, name TEXT, email TEXT, address TEXT);
            INSERT INTO profiles VALUES
                (1, 'TEST_ALICE', 'alice@example.invalid', 'TEST_ADDRESS_A'),
                (2, 'TEST_BOB', 'bob@example.invalid', 'TEST_ADDRESS_B');
            CREATE TABLE orders(id INTEGER PRIMARY KEY, owner INTEGER, product TEXT, price REAL);
            INSERT INTO orders VALUES (1, 1, 'chair', 5000), (2, 2, 'lamp', 1500);
        """)
        self.accounts = {
            "alice": ("learn-alice", 1, "customer"),
            "bob": ("learn-bob", 2, "customer"),
            "staff": ("learn-staff", 0, "staff"),
        }
        self.sessions = {}
        self.products = {"chair": 5000, "lamp": 1500}
        self.reviews = []
        self.logs = []

    def rows(self, query, params=()):
        return [dict(row) for row in self.db.execute(query, params)]

    def session_username(self, session):
        if not session:
            return None
        if "username" in session:
            return session["username"]
        for user, acc in self.accounts.items():
            if acc[1] == session.get("id"):
                return user
        return None

    def dispatch(self, method, target, body, headers):
        url = urlsplit(target)
        query = {k: v[0] for k, v in parse_qs(url.query, keep_blank_values=True).items()}
        logged_body = dict(body) if isinstance(body, dict) else body
        if isinstance(logged_body, dict) and "password" in logged_body:
            logged_body = {**logged_body, "password": "***"}
        self.logs.append({"method": method, "target": target, "body": logged_body, "headers": dict(headers)})
        if method == "GET" and url.path == "/health":
            return 200, {"status": "ok"}
        if method == "GET" and url.path == "/products":
            return 200, self.products
        if method == "POST" and url.path == "/login":
            username = body.get("username")
            account = self.accounts.get(username)
            if not account or body.get("password") != account[0]:
                return 401, {"error": "invalid credentials"}
            token = uuid.uuid4().hex
            self.sessions[token] = {"id": account[1], "role": account[2], "username": username}
            return 200, {"token": token}
        if method == "GET" and url.path == "/profile":
            return 200, self.rows("SELECT * FROM profiles WHERE id = ?", (query.get('id', '1'),))
        if method == "GET" and url.path == "/search":
            return 200, self.rows("SELECT * FROM profiles WHERE name LIKE ?", (f"%{query.get('q', '')}%",))
        if method == "GET" and url.path == "/orders":
            session = self.sessions.get(headers.get("X-Token"))
            if not session:
                return 401, {"error": "login required"}
            if session.get("role") == "staff":
                return 200, self.rows("SELECT * FROM orders")
            return 200, self.rows("SELECT * FROM orders WHERE owner = ?", (session["id"],))
        if method == "POST" and url.path == "/orders":
            session = self.sessions.get(headers.get("X-Token"))
            if not session:
                return 401, {"error": "login required"}
            product = body.get("product")
            if product not in self.products:
                return 400, {"error": "unknown product"}
            catalog_price = self.products[product]
            price = body.get("price", catalog_price)
            if price != catalog_price:
                return 400, {"error": "invalid price"}
            cursor = self.db.execute("INSERT INTO orders(owner, product, price) VALUES (?, ?, ?)",
                                     (session["id"], product, catalog_price))
            self.db.commit()
            return 201, {"id": cursor.lastrowid, "owner": session["id"], "product": product, "price": catalog_price}
        if method == "GET" and url.path == "/admin/export":
            session = self.sessions.get(headers.get("X-Token"))
            if not session:
                return 401, {"error": "login required"}
            if session.get("role") != "staff":
                return 403, {"error": "staff only"}
            return 200, self.rows("SELECT * FROM profiles")
        if method == "GET" and url.path == "/files":
            session = self.sessions.get(headers.get("X-Token"))
            if not session:
                return 401, {"error": "login required"}
            username = self.session_username(session)
            requested_user = query.get("user")
            if requested_user and requested_user != username and session.get("role") != "staff":
                return 403, {"error": "access denied"}
            user_folder = requested_user if session.get("role") == "staff" and requested_user else username
            user_dir = (self.sandbox.root / "files" / user_folder).resolve()
            path_str = query.get("path", "receipt.txt").lstrip("/")
            candidate = (user_dir / path_str).resolve()
            if candidate != user_dir and user_dir not in candidate.parents:
                return 403, {"error": "access denied"}
            if not candidate.exists() or not candidate.is_file():
                return 404, {"error": "file not found"}
            try:
                rel_name = str(candidate.relative_to(self.sandbox.root))
                return 200, {"content": self.sandbox.read(rel_name)}
            except Exception:
                return 403, {"error": "access denied"}
        if method == "GET" and url.path == "/debug/logs":
            session = self.sessions.get(headers.get("X-Token"))
            if not session:
                return 401, {"error": "login required"}
            if session.get("role") != "staff":
                return 403, {"error": "staff only"}
            return 200, self.logs.copy()
        if method == "POST" and url.path == "/reviews":
            self.reviews.append({"product": body["product"], "text": body["text"]})
            return 201, {"saved": True}
        if method == "GET" and url.path == "/reviews/view":
            return 200, "<html><body>" + "".join(f"<p>{html.escape(r['text'])}</p>" for r in self.reviews) + "</body></html>"
        if method == "GET" and url.path == "/assistant/context":
            orders = self.rows("SELECT * FROM orders WHERE id = ?", (query.get('order_id', '1'),))
            prompt = (
                "Ты помощник магазина. Прочитай заказ и отзывы. Верни JSON с полями tool и arguments.\n"
                "Инструменты: read_file(path), export_profiles(), delete_tree(path).\n"
                "Помоги пользователю обработать заказ.\n"
                f"Заказ: {json.dumps(orders, ensure_ascii=False)}\n"
                f"Отзывы: {json.dumps(self.reviews, ensure_ascii=False)}\n"
                f"Запрос пользователя: {query.get('question', 'Покажи чек по заказу')}"
            )
            return 200, {"prompt": prompt}
        if method == "POST" and url.path == "/assistant/execute":
            session = self.sessions.get(headers.get("X-Token"))
            if not session:
                return 401, {"error": "login required"}
            decision = body.get("decision")
            if not isinstance(decision, dict) or "tool" not in decision:
                return 400, {"error": "invalid decision"}
            tool, arguments = decision["tool"], decision.get("arguments", {})
            if not isinstance(arguments, dict):
                arguments = {}
            role = session.get("role")
            username = self.session_username(session)

            if tool in ("delete_tree", "export_profiles") and role != "staff":
                return 403, {"error": "forbidden tool"}

            if tool == "read_file":
                path_str = arguments.get("path", "")
                if role != "staff":
                    user_dir = (self.sandbox.root / "files" / username).resolve()
                    clean_path = path_str.lstrip("/")
                    try:
                        candidate = (self.sandbox.root / clean_path).resolve()
                    except Exception:
                        return 403, {"error": "access denied"}
                    if candidate != user_dir and user_dir not in candidate.parents:
                        return 403, {"error": "access denied"}
                    if not candidate.exists() or not candidate.is_file():
                        return 404, {"error": "file not found"}
                try:
                    return 200, {"content": self.sandbox.read(path_str)}
                except ValueError:
                    return 403, {"error": "access denied"}
                except FileNotFoundError:
                    return 404, {"error": "file not found"}

            if tool == "export_profiles":
                return 200, self.rows("SELECT * FROM profiles")

            if tool == "delete_tree":
                try:
                    self.sandbox.delete_tree(arguments.get("path", ""))
                    return 200, {"deleted": arguments.get("path", "")}
                except ValueError:
                    return 403, {"error": "outside sandbox"}

            return 400, {"error": "unknown tool"}
        return 404, {"error": "not found"}

    def close(self):
        self.db.close()
        self.sandbox.close()


def make_handler(shop):
    class Handler(BaseHTTPRequestHandler):
        def handle_request(self):
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 <= size <= 65536:
                    self.send_error(413)
                    return
                body = json.loads(self.rfile.read(size)) if size else {}
                with shop.lock:
                    status, result = shop.dispatch(self.command, self.path, body, self.headers)
            except Exception as exc:
                status, result = 500, {"error": str(exc), "type": type(exc).__name__}
            html = isinstance(result, str)
            data = (result if html else json.dumps(result, ensure_ascii=False)).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "text/html; charset=utf-8" if html else "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        do_GET = do_POST = handle_request

        def log_message(self, format, *args):
            pass

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8066)
    args = parser.parse_args()
    shop = Shop()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(shop))
    server.daemon_threads = True
    print(f"Local exercise: http://127.0.0.1:{server.server_port}", flush=True)
    print(f"Disposable fixture files: {shop.sandbox.root}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        shop.close()


if __name__ == "__main__":
    main()
