import os
import sys
import json
import psycopg2
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

load_dotenv(override=True)
DB_CONFIG = json.loads(os.getenv("DB_CONFIG"))

def main():
    if len(sys.argv) < 5:
        print("Usage: python create_account.py <email> <password> <first_name> <last_name> [access_type]")
        sys.exit(1)
        
    email, password, first, last = sys.argv[1:5]
    access_type = sys.argv[5] if len(sys.argv) > 5 else "User"
    hashed = generate_password_hash(password)
    
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (first_name, last_name, email, password) VALUES (%s, %s, %s, %s) RETURNING user_id",
                (first, last, email, hashed)
            )
            uid = cur.fetchone()[0]
            
            # Grant default access to all existing tools
            cur.execute("SELECT tool_id FROM tools")
            for (tool_id,) in cur.fetchall():
                cur.execute(
                    "INSERT INTO accesses (user_id, tool_id, access_type) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                    (uid, tool_id, access_type)
                )
        conn.commit()
        print(f"Account {email} created successfully as {access_type}.")

    except Exception as e:
        conn.rollback()
        print(f"Failed to create account: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
