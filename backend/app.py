from datetime import datetime, timedelta
import json
import os
import requests
import secrets
import smtplib
import traceback

import psycopg2
from dotenv import load_dotenv
from flask import Flask, jsonify, request, session
from flask_mail import Mail, Message
from werkzeug.security import check_password_hash, generate_password_hash


load_dotenv(override=True)

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret")
app.config.update(
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
    MAIL_USE_TLS=os.getenv("MAIL_USE_TLS", "True").lower() == "true",
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_DEFAULT_SENDER=os.getenv("MAIL_DEFAULT_SENDER"),
    SESSION_COOKIE_SAMESITE="Lax",
)

mail = Mail(app)

DB_CONFIG = json.loads(os.getenv("DB_CONFIG"))
ADMIN_MAIL = os.getenv("ADMIN_MAIL")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

verification_codes = {}
password_reset_tokens = {}


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = FRONTEND_ORIGIN
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response


@app.route("/api/<path:_path>", methods=["OPTIONS"])
def api_options(_path):
    return ("", 204)


def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)


def connect_hrms():
    return psycopg2.connect(
        dbname="HRMS",
        user="postgres",
        password=os.getenv("POSTGRES_PASSWORD", "Arithwise@010124"),
        host="localhost",
    )


def connect_trueday():
    return psycopg2.connect(
        dbname="TRUEDAY",
        user="postgres",
        password=os.getenv("POSTGRES_PASSWORD", "Arithwise@010124"),
        host="localhost",
        port="5432",
    )


def send_email(recipient_email, subject, html_body):
    try:
        msg = Message(subject, recipients=[recipient_email])
        msg.html = html_body
        mail.send(msg)
        return True
    except (smtplib.SMTPException, ConnectionError, ValueError) as exc:
        print(f"Failed to send email: {exc}")
        return False


def require_login():
    if "user_id" not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    return None


def require_superadmin():
    if not session.get("superadmin"):
        return jsonify({"success": False, "message": "Only super admin is allowed"}), 401
    return None


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or request.form
    email = data.get("email")
    password = data.get("password")

    session.clear()
    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, email, password FROM users WHERE email = %s", (email,))
            user = cur.fetchone()
            if not user or not check_password_hash(user[2], password):
                return jsonify({"success": False, "message": "Invalid credentials"}), 401

            session["user_id"] = user[0]
            session["email"] = user[1]
            if user[1] in {
                "vishvesh@arithwise.com",
                "hitesh@arithwise.com",
                "bhushan.datey@arithwise.com",
            }:
                session["superadmin"] = True

            cur.execute(
                """
                SELECT t.name, a.access_type
                FROM tools t
                JOIN accesses a ON t.tool_id = a.tool_id
                WHERE a.user_id = %s
                """,
                (user[0],),
            )
            tools = [{"tool_name": row[0], "access_type": row[1]} for row in cur.fetchall()]
            session["user_tools"] = tools

        return jsonify(
            {
                "success": True,
                "user_id": session["user_id"],
                "email": session["email"],
                "superadmin": bool(session.get("superadmin")),
                "tools": tools,
            }
        )
    except Exception as exc:
        print(f"Login error: {exc}")
        return jsonify({"success": False, "message": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@app.post("/api/admin-login")
def admin_login():
    data = request.get_json(silent=True) or {}
    if data.get("email") == ADMIN_MAIL and data.get("password") == ADMIN_PASSWORD:
        session["superadmin"] = True
        session["email"] = ADMIN_MAIL
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Invalid admin credentials"}), 401


@app.get("/api/me")
def me():
    return jsonify(
        {
            "authenticated": "user_id" in session,
            "user_id": session.get("user_id"),
            "email": session.get("email"),
            "superadmin": bool(session.get("superadmin")),
            "tools": session.get("user_tools", []),
        }
    )


@app.get("/api/tools")
def tools():
    auth_error = require_login()
    if auth_error:
        return auth_error

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT t.name, a.access_type, t.description, t.href, t.logo_name, t.color_gradient
                FROM tools t
                JOIN accesses a ON t.tool_id = a.tool_id
                WHERE a.user_id = %s
                ORDER BY t.name;
                """,
                (session["user_id"],)
            )
            user_tools = [
                {
                    "tool_name": row[0],
                    "access_type": row[1],
                    "description": row[2],
                    "href": row[3],
                    "logo_name": row[4],
                    "color_gradient": row[5]
                }
                for row in cur.fetchall()
            ]
        return jsonify(
            {
                "success": True,
                "user_id": session["user_id"],
                "superadmin": bool(session.get("superadmin")),
                "tools": user_tools,
            }
        )
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500
    finally:
        conn.close()


@app.get("/api/tools/health")
def tools_health():
    auth_error = require_login()
    if auth_error:
        return auth_error

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT name, href FROM tools;")
            tools_rows = cur.fetchall()
            
        health_status = {}
        for name, href in tools_rows:
            if not href:
                health_status[name] = "offline"
                continue
            
            base_url = href.split('?')[0]
            try:
                response = requests.head(base_url, timeout=1.5, allow_redirects=True)
                if response.status_code < 500:
                    health_status[name] = "online"
                else:
                    health_status[name] = "offline"
            except Exception:
                try:
                    response = requests.get(base_url, timeout=1.5, allow_redirects=True)
                    if response.status_code < 500:
                        health_status[name] = "online"
                    else:
                        health_status[name] = "offline"
                except Exception:
                    health_status[name] = "offline"
                    
        return jsonify({"success": True, "health": health_status})
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500
    finally:
        if conn:
            conn.close()


def update_dashboard_stats():
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM users;")
            total_employees = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM tools;")
            total_tools = cur.fetchone()[0]

            cur.execute(
                """
                SELECT
                    SUM(CASE WHEN access_type = 'User' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN access_type = 'Developer' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN access_type = 'Admin' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN access_type = 'Superuser' THEN 1 ELSE 0 END)
                FROM accesses;
                """
            )
            total_users, total_developers, total_admins, total_super_users = cur.fetchone()

        return {
            "TOTAL_EMPLOYEES": total_employees or 0,
            "TOTAL_USERS": total_users or 0,
            "TOTAL_DEVELOPERS": total_developers or 0,
            "TOTAL_ADMINS": total_admins or 0,
            "TOTAL_SUPER_USERS": total_super_users or 0,
            "TOTAL_TOOLS": total_tools or 0,
        }
    finally:
        if conn:
            conn.close()


@app.get("/api/dashboard")
def dashboard():
    auth_error = require_superadmin()
    if auth_error:
        return auth_error
    return jsonify({"success": True, "stats": update_dashboard_stats()})


@app.get("/api/stats")
def get_stats():
    auth_error = require_superadmin()
    if auth_error:
        return auth_error

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM tools;")
            total_tools = cur.fetchone()[0]
            cur.execute(
                """
                SELECT t.name, COUNT(a.user_id)
                FROM accesses a
                JOIN tools t ON a.tool_id = t.tool_id
                GROUP BY t.name;
                """
            )
            rows = cur.fetchall()
        return jsonify(
            {
                "total_tools": total_tools,
                "tool_access_counts": {
                    "labels": [row[0] for row in rows],
                    "data": [row[1] for row in rows],
                },
            }
        )
    finally:
        conn.close()


@app.get("/api/employees")
def get_employees():
    auth_error = require_superadmin()
    if auth_error:
        return auth_error

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT first_name, last_name FROM users;")
            employees = cur.fetchall()
            cur.execute("SELECT name FROM tools;")
            tools_rows = cur.fetchall()
        return jsonify(
            {
                "names": [f"{first} {last}" for first, last in employees],
                "tools": [row[0] for row in tools_rows],
            }
        )
    finally:
        conn.close()


@app.get("/api/available-tools")
def get_available_tools():
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT tool_id, name, description, href, logo_name, color_gradient FROM tools ORDER BY name;")
            tools = [
                {
                    "tool_id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "href": row[3],
                    "logo_name": row[4],
                    "color_gradient": row[5]
                }
                for row in cur.fetchall()
            ]
        return jsonify({"success": True, "tools": tools})
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500
    finally:
        conn.close()


@app.post("/api/admin/tools/create")
def admin_create_tool():
    auth_error = require_superadmin()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip().upper()
    description = data.get("description", "").strip()
    href = data.get("href", "").strip()
    logo_name = data.get("logo_name", "").strip() or "Globe"
    color_gradient = data.get("color_gradient", "").strip() or "from-slate-500 to-slate-600"

    if not name or not description or not href:
        return jsonify({"success": False, "message": "Missing name, description, or redirect URL"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT tool_id FROM tools WHERE name = %s", (name,))
            if cur.fetchone():
                return jsonify({"success": False, "message": f"Tool '{name}' already exists"}), 400

            cur.execute(
                """
                INSERT INTO tools (name, description, href, logo_name, color_gradient)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING tool_id
                """,
                (name, description, href, logo_name, color_gradient),
            )
            tool_id = cur.fetchone()[0]
        conn.commit()
        return jsonify({"success": True, "tool_id": tool_id})
    except Exception as exc:
        conn.rollback()
        return jsonify({"success": False, "message": str(exc)}), 500
    finally:
        conn.close()


@app.post("/api/admin/tools/update")
def admin_update_tool():
    auth_error = require_superadmin()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    tool_id = data.get("tool_id")
    name = data.get("name", "").strip().upper()
    description = data.get("description", "").strip()
    href = data.get("href", "").strip()
    logo_name = data.get("logo_name", "").strip() or "Globe"
    color_gradient = data.get("color_gradient", "").strip() or "from-slate-500 to-slate-600"

    if not tool_id or not name or not description or not href:
        return jsonify({"success": False, "message": "Missing tool ID, name, description, or redirect URL"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT tool_id FROM tools WHERE tool_id = %s", (tool_id,))
            if not cur.fetchone():
                return jsonify({"success": False, "message": "Tool not found"}), 404

            cur.execute(
                """
                UPDATE tools
                SET name = %s, description = %s, href = %s, logo_name = %s, color_gradient = %s
                WHERE tool_id = %s
                """,
                (name, description, href, logo_name, color_gradient, tool_id),
            )
        conn.commit()
        return jsonify({"success": True})
    except Exception as exc:
        conn.rollback()
        return jsonify({"success": False, "message": str(exc)}), 500
    finally:
        conn.close()


@app.post("/api/admin/tools/delete")
def admin_delete_tool():
    auth_error = require_superadmin()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    tool_id = data.get("tool_id")

    if not tool_id:
        return jsonify({"success": False, "message": "Missing tool ID"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # First delete associated accesses
            cur.execute("DELETE FROM accesses WHERE tool_id = %s", (tool_id,))
            cur.execute("DELETE FROM tools WHERE tool_id = %s", (tool_id,))
        conn.commit()
        return jsonify({"success": True})
    except Exception as exc:
        conn.rollback()
        return jsonify({"success": False, "message": str(exc)}), 500
    finally:
        conn.close()


@app.get("/api/employees/details")
def get_employees_details():
    auth_error = require_superadmin()
    if auth_error:
        return auth_error

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    u.first_name || ' ' || u.last_name AS full_name,
                    t.name AS tool_name,
                    a.access_type
                FROM accesses a
                JOIN users u ON a.user_id = u.user_id
                JOIN tools t ON a.tool_id = t.tool_id
                """
            )
            rows = cur.fetchall()

        result = {}
        for full_name, tool_name, access_type in rows:
            key = full_name.lower()
            result.setdefault(key, {})[tool_name] = access_type
        return jsonify(result)
    finally:
        conn.close()


@app.post("/api/save_access")
def save_access():
    auth_error = require_superadmin()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid input"}), 400

    conn = get_db_connection()
    hrms_conn = None
    trueday_conn = None
    try:
        with conn.cursor() as cur:
            for full_name, tool_access_dict in data.items():
                full_name = full_name.strip().lower()
                cur.execute(
                    """
                    SELECT user_id, first_name, last_name, email, password FROM users
                    WHERE LOWER(first_name || ' ' || last_name) = %s
                    """,
                    (full_name,),
                )
                user_row = cur.fetchone()
                if not user_row:
                    return jsonify({"error": f"User '{full_name}' not found"}), 400

                user_id, first_name, last_name, email, hashed_password = user_row

                for tool_name, access_type in tool_access_dict.items():
                    tool_name = tool_name.strip().upper()
                    access_type = access_type.strip().capitalize()

                    cur.execute("SELECT tool_id FROM tools WHERE name ILIKE %s", (tool_name,))
                    tool_row = cur.fetchone()
                    if not tool_row:
                        return jsonify({"error": f"Tool '{tool_name}' not found"}), 400

                    tool_id = int(tool_row[0])
                    cur.execute(
                        "SELECT access_id FROM accesses WHERE user_id = %s AND tool_id = %s",
                        (user_id, tool_id),
                    )
                    if cur.fetchone():
                        cur.execute(
                            "UPDATE accesses SET access_type = %s WHERE user_id = %s AND tool_id = %s",
                            (access_type, user_id, tool_id),
                        )
                    else:
                        cur.execute(
                            "INSERT INTO accesses (user_id, tool_id, access_type) VALUES (%s, %s, %s)",
                            (user_id, tool_id, access_type),
                        )

                    if tool_name == "ARITHSHIVE":
                        if not hrms_conn:
                            hrms_conn = connect_hrms()
                        with hrms_conn.cursor() as hrms_cur:
                            hrms_cur.execute("SELECT emp_id FROM employee WHERE emp_id = %s", (user_id,))
                            if not hrms_cur.fetchone():
                                hrms_cur.execute(
                                    """
                                    INSERT INTO employee (emp_id, first_name, last_name, email, password, category)
                                    VALUES (%s, %s, %s, %s, %s, %s)
                                    """,
                                    (user_id, first_name, last_name, email, hashed_password, access_type),
                                )
                            else:
                                hrms_cur.execute(
                                    "UPDATE employee SET category = %s WHERE emp_id = %s",
                                    (access_type, user_id),
                                )
                        hrms_conn.commit()

                    if tool_name == "TRUEDAY":
                        if not trueday_conn:
                            trueday_conn = connect_trueday()
                        with trueday_conn.cursor() as trueday_cur:
                            trueday_cur.execute("SELECT id FROM trueday.users WHERE id = %s", (user_id,))
                            if not trueday_cur.fetchone():
                                trueday_cur.execute(
                                    """
                                    INSERT INTO trueday.users (id, username, email, password, role)
                                    VALUES (%s, %s, %s, %s, %s)
                                    """,
                                    (user_id, f"{first_name} {last_name}", email, hashed_password, access_type),
                                )
                            else:
                                trueday_cur.execute(
                                    "UPDATE trueday.users SET role = %s WHERE id = %s",
                                    (access_type, user_id),
                                )
                        trueday_conn.commit()

        conn.commit()
        return jsonify({"status": "success"})
    except Exception as exc:
        conn.rollback()
        if hrms_conn:
            hrms_conn.rollback()
        if trueday_conn:
            trueday_conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()
        if hrms_conn:
            hrms_conn.close()
        if trueday_conn:
            trueday_conn.close()


@app.post("/api/delete_access")
def delete_access():
    auth_error = require_superadmin()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    full_name = data.get("employee", "").strip().lower()
    tool_name = data.get("tool", "").strip().upper()
    if not full_name or not tool_name:
        return jsonify({"error": "Invalid input"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_id FROM users WHERE LOWER(first_name || ' ' || last_name) = %s",
                (full_name,),
            )
            user_row = cur.fetchone()
            if not user_row:
                return jsonify({"error": f"User '{full_name}' not found"}), 400

            cur.execute("SELECT tool_id FROM tools WHERE name ILIKE %s", (tool_name,))
            tool_row = cur.fetchone()
            if not tool_row:
                return jsonify({"error": f"Tool '{tool_name}' not found"}), 400

            cur.execute(
                "DELETE FROM accesses WHERE user_id = %s AND tool_id = %s",
                (user_row[0], tool_row[0]),
            )
        conn.commit()
        return jsonify({"status": "success"})
    except Exception as exc:
        conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()


@app.post("/api/admin/bulk_update_access")
def bulk_update_access():
    auth_error = require_superadmin()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    employees = data.get("employees", [])
    tool_name = data.get("tool", "").strip().upper()
    action = data.get("action", "").strip().lower()
    access_type = data.get("access_type", "User").strip().capitalize()

    if not employees or not tool_name or action not in ["grant", "revoke"]:
        return jsonify({"error": "Invalid input parameters"}), 400

    conn = get_db_connection()
    hrms_conn = None
    trueday_conn = None
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT tool_id FROM tools WHERE name ILIKE %s", (tool_name,))
            tool_row = cur.fetchone()
            if not tool_row:
                return jsonify({"error": f"Tool '{tool_name}' not found"}), 400
            tool_id = int(tool_row[0])

            for full_name in employees:
                full_name = full_name.strip().lower()
                cur.execute(
                    """
                    SELECT user_id, first_name, last_name, email, password FROM users
                    WHERE LOWER(first_name || ' ' || last_name) = %s
                    """,
                    (full_name,),
                )
                user_row = cur.fetchone()
                if not user_row:
                    continue
                
                user_id, first_name, last_name, email, hashed_password = user_row

                if action == "revoke":
                    cur.execute(
                        "DELETE FROM accesses WHERE user_id = %s AND tool_id = %s",
                        (user_id, tool_id),
                    )
                else:
                    cur.execute(
                        "SELECT access_id FROM accesses WHERE user_id = %s AND tool_id = %s",
                        (user_id, tool_id),
                    )
                    if cur.fetchone():
                        cur.execute(
                            "UPDATE accesses SET access_type = %s WHERE user_id = %s AND tool_id = %s",
                            (access_type, user_id, tool_id),
                        )
                    else:
                        cur.execute(
                            "INSERT INTO accesses (user_id, tool_id, access_type) VALUES (%s, %s, %s)",
                            (user_id, tool_id, access_type),
                        )

                    if tool_name == "ARITHSHIVE":
                        if not hrms_conn:
                            hrms_conn = connect_hrms()
                        with hrms_conn.cursor() as hrms_cur:
                            hrms_cur.execute("SELECT emp_id FROM employee WHERE emp_id = %s", (user_id,))
                            if not hrms_cur.fetchone():
                                hrms_cur.execute(
                                    """
                                    INSERT INTO employee (emp_id, first_name, last_name, email, password, category)
                                    VALUES (%s, %s, %s, %s, %s, %s)
                                    """,
                                    (user_id, first_name, last_name, email, hashed_password, access_type),
                                )
                            else:
                                hrms_cur.execute(
                                    "UPDATE employee SET category = %s WHERE emp_id = %s",
                                    (access_type, user_id),
                                )
                        hrms_conn.commit()

                    if tool_name == "TRUEDAY":
                        if not trueday_conn:
                            trueday_conn = connect_trueday()
                        with trueday_conn.cursor() as trueday_cur:
                            trueday_cur.execute("SELECT id FROM trueday.users WHERE id = %s", (user_id,))
                            if not trueday_cur.fetchone():
                                trueday_cur.execute(
                                    """
                                    INSERT INTO trueday.users (id, username, email, password, role)
                                    VALUES (%s, %s, %s, %s, %s)
                                    """,
                                    (user_id, f"{first_name} {last_name}", email, hashed_password, access_type),
                                )
                            else:
                                trueday_cur.execute(
                                    "UPDATE trueday.users SET role = %s WHERE id = %s",
                                    (access_type, user_id),
                                )
                        trueday_conn.commit()

        conn.commit()
        return jsonify({"success": True})
    except Exception as exc:
        conn.rollback()
        if hrms_conn:
            hrms_conn.rollback()
        if trueday_conn:
            trueday_conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()
        if hrms_conn:
            hrms_conn.close()
        if trueday_conn:
            trueday_conn.close()


@app.post("/api/create_user")
def create_user():
    auth_error = require_superadmin()
    if auth_error:
        return auth_error

    arith_conn = None
    hrms_conn = None
    trueday_conn = None
    try:
        data = request.get_json(silent=True) or request.form
        first_name = data.get("firstName")
        last_name = data.get("lastName")
        email = data.get("userEmail")
        password = data.get("userPassword")
        tools_value = data.get("tools", [])
        tools = json.loads(tools_value) if isinstance(tools_value, str) else tools_value

        if not all([first_name, last_name, email, password]):
            return jsonify({"success": False, "message": "Missing required fields"}), 400
        if len(password) < 6:
            return jsonify({"success": False, "message": "Password must be at least 6 characters"}), 400
        if not tools:
            return jsonify({"success": False, "message": "Assign at least one tool"}), 400

        full_name = f"{first_name} {last_name}"
        hashed_password = generate_password_hash(password)

        arith_conn = get_db_connection()

        with arith_conn.cursor() as arith_cur:
            arith_cur.execute(
                """
                INSERT INTO users (first_name, last_name, email, password)
                VALUES (%s, %s, %s, %s)
                RETURNING user_id
                """,
                (first_name, last_name, email, hashed_password),
            )
            user_id = arith_cur.fetchone()[0]

            for item in tools:
                tool_name = item.get("tool_name")
                access_type = item.get("access_type")
                arith_cur.execute("SELECT tool_id FROM tools WHERE name = %s", (tool_name,))
                tool_row = arith_cur.fetchone()
                if not tool_row:
                    raise ValueError(f"Tool '{tool_name}' not found")

                arith_cur.execute(
                    "INSERT INTO accesses (user_id, tool_id, access_type) VALUES (%s, %s, %s)",
                    (user_id, tool_row[0], access_type),
                )

                if tool_name == "TRUEDAY":
                    if not trueday_conn:
                        trueday_conn = connect_trueday()
                    with trueday_conn.cursor() as trueday_cur:
                        trueday_cur.execute(
                            """
                            INSERT INTO trueday.users (id, username, email, password, role)
                            VALUES (%s, %s, %s, %s, %s)
                            """,
                            (user_id, full_name, email, hashed_password, access_type),
                        )

                if tool_name == "ARITHSHIVE":
                    if not hrms_conn:
                        hrms_conn = connect_hrms()
                    with hrms_conn.cursor() as hrms_cur:
                        hrms_cur.execute(
                            """
                            INSERT INTO employee (emp_id, first_name, last_name, email, password, category)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            """,
                            (user_id, first_name, last_name, email, hashed_password, access_type),
                        )

        arith_conn.commit()
        if trueday_conn:
            trueday_conn.commit()
        if hrms_conn:
            hrms_conn.commit()

        send_email(
            email,
            "New user credentials",
            f"""
            <h1>Welcome to Arithwise!</h1>
            <p>Your credentials for Ariths Platform are ready.</p>
            <p>Website: <a href="https://ariths.com">Ariths</a></p>
            <p>Email: {email}</p>
            <p>Password: {password}</p>
            """,
        )

        return jsonify(
            {
                "success": True,
                "message": "User created and synced to all databases successfully",
                "user_id": user_id,
                "user": {"email": email, "fullName": full_name, "profilePic": ""},
            }
        ), 201
    except Exception as exc:
        error_info = traceback.extract_tb(exc.__traceback__)[-1]
        if arith_conn:
            arith_conn.rollback()
        if hrms_conn:
            hrms_conn.rollback()
        if trueday_conn:
            trueday_conn.rollback()
        return jsonify(
            {
                "success": False,
                "message": f"Error on line {error_info.lineno}: {str(exc)}",
            }
        ), 500
    finally:
        if arith_conn:
            arith_conn.close()
        if hrms_conn:
            hrms_conn.close()
        if trueday_conn:
            trueday_conn.close()


@app.post("/api/send_reset_password_email")
def send_reset_password_email():
    email = (request.get_json(silent=True) or {}).get("email")
    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400
    if not email.lower().endswith("@arithwise.com"):
        return jsonify({"success": False, "message": "Only @arithwise.com emails are allowed."}), 400

    recipient_first_name = ""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT first_name FROM users WHERE email = %s", (email,))
            user_row = cur.fetchone()
            if user_row:
                recipient_first_name = user_row[0]
    finally:
        if conn:
            conn.close()

    code = "".join(secrets.choice("0123456789") for _ in range(6))
    verification_codes[email] = {"code": code, "expiry": datetime.now() + timedelta(minutes=10)}

    html_body = f"""
    <div style="background-color: #f8fafc; padding: 40px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; width: 100%;">
      <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
        
        <!-- Top Accent Bar -->
        <div style="background-color: #1e40af; height: 6px;"></div>
        
        <div style="padding: 36px 32px;">
          <!-- Header Logo / Brand -->
          <div style="margin-bottom: 28px;">
            <span style="font-size: 24px; font-weight: 850; letter-spacing: -0.03em; color: #1e40af;">ARITHS</span>
          </div>
          
          <!-- Content Heading -->
          <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.01em;">Reset Your Password</h2>
          
          <!-- Message Body -->
          <p style="font-size: 15px; line-height: 24px; color: #334155; margin: 0 0 16px 0;">Hello {recipient_first_name},</p>
          <p style="font-size: 15px; line-height: 24px; color: #334155; margin: 0 0 24px 0;">We received a request to reset the password for your Ariths account. Please use the 6-digit verification code below to authorize this change:</p>
          
          <!-- OTP Code Box -->
          <div style="background-color: #f1f5f9; border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 24px; border: 1px solid #e2e8f0;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 750; letter-spacing: 0.15em; color: #1e40af; display: inline-block; padding-left: 0.15em;">{code}</span>
          </div>
          
          <!-- Timer Expiry Info -->
          <p style="font-size: 13.5px; line-height: 22px; color: #475569; margin: 0 0 24px 0;">
            ⏱️ This verification code is valid for <strong style="color: #0f172a;">10 minutes</strong>. After expiration, you will need to request a new one.
          </p>
          
          <!-- Divider Line -->
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
          
          <!-- Caution Note -->
          <p style="font-size: 12px; line-height: 18px; color: #94a3b8; margin: 0;">
            If you did not request a password reset, you can safely ignore this email. Your account remains secure.
          </p>
        </div>
        
        <!-- Bottom Banner / Footer -->
        <div style="background-color: #f8fafc; padding: 18px; text-align: center; border-top: 1px solid #f1f5f9;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">&copy; {datetime.now().year} Arithwise. All rights reserved.</p>
        </div>
      </div>
    </div>
    """

    if send_email(email, "Reset Your Password - Ariths", html_body):
        return jsonify({"success": True, "message": "Verification code sent to your email."})
    return jsonify({"success": False, "message": "Failed to send verification email."}), 500


@app.post("/api/verify_reset_code")
def verify_reset_code():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    code = data.get("code")
    stored_data = verification_codes.get(email)

    if not email or not code:
        return jsonify({"success": False, "message": "Email and code are required."}), 400
    if not stored_data:
        return jsonify({"success": False, "message": "No verification request found for this email."}), 400
    if datetime.now() > stored_data["expiry"]:
        del verification_codes[email]
        return jsonify({"success": False, "message": "Verification code has expired."}), 400
    if stored_data["code"] != code:
        return jsonify({"success": False, "message": "Invalid verification code."}), 400

    del verification_codes[email]
    reset_token = secrets.token_urlsafe(32)
    password_reset_tokens[reset_token] = {
        "email": email,
        "expiry": datetime.now() + timedelta(hours=1),
    }
    return jsonify({"success": True, "message": "Email verified.", "token": reset_token})


@app.post("/api/reset_password")
def reset_password():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    new_password = data.get("password")
    if not email or not new_password:
        return jsonify({"success": False, "message": "Email and new password are required."}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET password = %s WHERE email = %s",
                (generate_password_hash(new_password), email),
            )
        conn.commit()
        return jsonify({"success": True, "message": "Password reset successful!"})
    except Exception as exc:
        conn.rollback()
        print(f"Error resetting password: {exc}")
        return jsonify({"success": False, "message": "Failed to reset password."}), 500
    finally:
        conn.close()


@app.get("/api/logout")
def logout():
    session.clear()
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(port=5550, debug=True)
