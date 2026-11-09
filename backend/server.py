"""ASGI bridge for the existing Queue-Less Printer Flask application.

This file does NOT contain any application logic. It imports the untouched
Flask instance from /app/app.py and exposes it as an ASGI callable so the
platform's backend program (`uvicorn server:app --host 0.0.0.0 --port 8001`)
can serve the original routes.

app.py stays byte-for-byte unchanged: every route, helper, the in-memory JOBS
store, the demo payment flow, PDF building and the 10-minute cleanup thread all
run exactly as written. Flask's WSGI features used by app.py (form parsing,
session cookies, flash messages, redirects and send_file streaming) are
transparently handled by the WSGI->ASGI adapter below.
"""

import os
import sys

from a2wsgi import WSGIMiddleware

# /app is the repository root that contains the original app.py.
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

# Run with the same CWD the app is normally started from (`python app.py` inside
# /app), BEFORE app.py is imported so its module-level directory setup lands next
# to the app itself. app.py stores uploads in the relative folder "uploads" and
# output PDFs in "print_output"; Werkzeug's send_file resolves a relative path
# against the app's root_path (/app, where app.py lives) rather than the CWD, so
# if the process CWD differs from root_path the /download/<job_id> route looks in
# the wrong folder and raises FileNotFoundError. Keeping CWD == root_path keeps
# the unmodified app.py working exactly as it does when run directly.
os.chdir(REPO_ROOT)

from app import app as flask_app  # noqa: E402  (existing, unmodified Flask app)

app = WSGIMiddleware(flask_app)
