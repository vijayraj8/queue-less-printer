"""UPI Gateway payment adapter for Queue-Less Printer.

Integrates the self-hosted UPI Gateway (github.com/mynkdev-21/upi-gateway,
Laravel 12) with the existing Flask app. This blueprint is registered onto the
unmodified Flask instance by backend/server.py, so app.py stays byte-for-byte
unchanged.

DORMANT UNTIL CONFIGURED: when any of the three environment variables below is
missing, the gateway is never contacted, no orders are created and no payment
is simulated — the prototype's clearly-labelled demo flow keeps working.

    GATEWAY_BASE_URL         e.g. https://pay.your-domain.com
    GATEWAY_API_KEY          admin panel -> API & Webhooks -> API key
    GATEWAY_WEBHOOK_SECRET   admin panel -> API & Webhooks -> webhook secret

Payment safety model (no fake verification):
  * Orders are created server-to-server:  POST {base}/api/v1/orders
  * Status is polled server-to-server:    GET  {base}/api/v1/orders/{id}
  * Webhooks are trusted only after the
    signed-header check:                  X-Signature: t=<unix>,v1=<hex-hmac>
    HMAC-SHA256(secret, "{t}.{raw_body}") with a 5-minute timestamp tolerance,
    and even then the order is re-fetched from the API before it unlocks.
  * POST /print (the step that produces the downloadable PDF) is blocked by a
    before_app_request hook for any job whose gateway order is not PAID.
"""

import hashlib
import hmac
import os
import threading
import time
import uuid

import httpx
from flask import Blueprint, jsonify, render_template_string, request

payments_bp = Blueprint("payments", __name__)

GATEWAY_BASE_URL = os.environ.get("GATEWAY_BASE_URL", "").rstrip("/")
GATEWAY_API_KEY = os.environ.get("GATEWAY_API_KEY", "")
GATEWAY_WEBHOOK_SECRET = os.environ.get("GATEWAY_WEBHOOK_SECRET", "")
WEBHOOK_TOLERANCE_SECONDS = 300

# client_order_id -> {"job_id", "gateway_order_id", "amount", "status", "payment_url"}
GATEWAY_ORDERS = {}
GATEWAY_ORDERS_LOCK = threading.Lock()


def gateway_configured():
    return bool(GATEWAY_BASE_URL and GATEWAY_API_KEY and GATEWAY_WEBHOOK_SECRET)


def _job_store():
    from app import JOBS, JOBS_LOCK

    return JOBS, JOBS_LOCK


def _error_page(message, status):
    from app import ERROR_HTML

    return render_template_string(ERROR_HTML, message=message), status


def _mark_job_paid(job_id):
    """Unlock the job's printing once the gateway confirms payment."""
    JOBS, JOBS_LOCK = _job_store()
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if job:
            job["gateway_status"] = "PAID"
            job["last_activity"] = time.time()
    return bool(job)


def _fetch_gateway_order(gateway_order_id):
    """Server-to-server status lookup; returns (data_dict, error_response)."""
    try:
        response = httpx.get(
            f"{GATEWAY_BASE_URL}/api/v1/orders/{gateway_order_id}",
            headers={"X-Api-Key": GATEWAY_API_KEY, "accept": "application/json"},
            timeout=20,
        )
    except httpx.HTTPError:
        return None, ("Gateway unreachable. Please check again shortly.", 502)

    if response.status_code >= 400:
        return None, ("Gateway rejected the status lookup. Please try again.", 502)

    return response.json(), None


def _normalize_status(raw_status):
    value = str(raw_status or "").strip().lower()
    if value == "paid":
        return "PAID"
    if value in ("failed", "expired", "cancelled", "canceled"):
        return "FAILED"
    return "PENDING"


@payments_bp.before_app_request
def _block_unpaid_printing():
    """Only let verified payments produce the downloadable PDF."""
    if request.path != "/print" or request.method != "POST":
        return None

    job_id = request.form.get("job_id", "")
    JOBS, JOBS_LOCK = _job_store()
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if job and job.get("gateway_order_id") and job.get("gateway_status") != "PAID":
            return _error_page(
                "Payment not verified yet. Complete the payment to unlock your PDF.",
                402,
            )
    return None


@payments_bp.route("/api/payments/config", methods=["GET"])
def payment_config():
    """Frontend asks whether online payment is active before showing its UI."""
    return jsonify(
        {
            "configured": gateway_configured(),
            "provider": "upi-gateway" if gateway_configured() else "none",
        }
    )


@payments_bp.route("/api/payments/create-order", methods=["POST"])
def create_payment_order():
    if not gateway_configured():
        return (
            jsonify(
                {
                    "error": "gateway_not_configured",
                    "message": "Online payment is not configured yet.",
                }
            ),
            503,
        )

    payload = request.get_json(silent=True) or {}
    job_id = str(payload.get("job_id", "")).strip()

    JOBS, JOBS_LOCK = _job_store()
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if not job or "configuration" not in job or job.get("status") != "CONFIGURED":
            return (
                jsonify(
                    {
                        "error": "job_not_found",
                        "message": "Print job not found. Please start again.",
                    }
                ),
                404,
            )
        if job.get("gateway_status") == "PAID":
            return (
                jsonify(
                    {
                        "error": "already_paid",
                        "message": "This print job is already paid.",
                    }
                ),
                409,
            )
        amount = float(job["configuration"]["price"])

    client_order_id = f"qlp_{uuid.uuid4().hex}"
    try:
        response = httpx.post(
            f"{GATEWAY_BASE_URL}/api/v1/orders",
            headers={"X-Api-Key": GATEWAY_API_KEY, "accept": "application/json"},
            json={"amount": round(amount, 2), "client_order_id": client_order_id},
            timeout=20,
        )
    except httpx.HTTPError:
        return (
            jsonify(
                {
                    "error": "gateway_unreachable",
                    "message": "Could not reach the payment gateway. Please try again.",
                }
            ),
            502,
        )

    if response.status_code >= 400:
        return (
            jsonify(
                {
                    "error": "gateway_error",
                    "message": "The payment gateway refused the order. Please try again.",
                }
            ),
            502,
        )

    data = (response.json() or {}).get("data") or {}
    gateway_order_id = str(data.get("order_id") or "").strip()
    payment_url = str(data.get("payment_url") or "").strip()

    if not gateway_order_id or not payment_url:
        return (
            jsonify(
                {
                    "error": "gateway_error",
                    "message": "Unexpected response from the payment gateway.",
                }
            ),
            502,
        )

    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if job:
            job["gateway_order_id"] = gateway_order_id
            job["gateway_status"] = "PENDING"
            job["last_activity"] = time.time()

    with GATEWAY_ORDERS_LOCK:
        GATEWAY_ORDERS[client_order_id] = {
            "job_id": job_id,
            "gateway_order_id": gateway_order_id,
            "amount": amount,
            "status": "PENDING",
            "payment_url": payment_url,
        }

    return jsonify(
        {
            "orderId": gateway_order_id,
            "clientOrderId": client_order_id,
            "paymentUrl": payment_url,
            "amount": amount,
            "expiresAt": data.get("expires_at"),
        }
    )


@payments_bp.route("/api/payments/status/<gateway_order_id>", methods=["GET"])
def payment_status(gateway_order_id):
    if not gateway_configured():
        return jsonify({"error": "gateway_not_configured"}), 503

    with GATEWAY_ORDERS_LOCK:
        record = next(
            (
                entry
                for entry in GATEWAY_ORDERS.values()
                if entry["gateway_order_id"] == gateway_order_id
            ),
            None,
        )

    if not record:
        return jsonify({"error": "order_not_found"}), 404

    data, error = _fetch_gateway_order(gateway_order_id)
    if error:
        message, status = error
        return jsonify({"error": "gateway_unreachable", "message": message}), status

    status = _normalize_status((data or {}).get("status"))

    if status == "PAID" and _mark_job_paid(record["job_id"]):
        with GATEWAY_ORDERS_LOCK:
            record["status"] = "PAID"

    return jsonify({"status": status, "orderId": gateway_order_id})


@payments_bp.route("/api/webhooks/upi-gateway", methods=["POST"])
def upi_gateway_webhook():
    """Signed webhook receiver.

    A valid signature alone does not unlock anything: the order is re-fetched
    from the gateway API before the job is marked PAID.
    """
    if not gateway_configured():
        return jsonify({"received": False, "reason": "gateway_not_configured"}), 503

    raw_body = request.get_data()
    signature_header = request.headers.get("X-Signature", "")

    parts = dict(
        piece.split("=", 1)
        for piece in signature_header.split(",")
        if "=" in piece
    )
    timestamp, provided_signature = parts.get("t", ""), parts.get("v1", "")

    if not timestamp or not provided_signature:
        return jsonify({"error": "invalid_signature"}), 400

    try:
        signed_at = int(timestamp)
    except ValueError:
        return jsonify({"error": "invalid_signature"}), 400

    if abs(time.time() - signed_at) > WEBHOOK_TOLERANCE_SECONDS:
        return jsonify({"error": "stale_signature"}), 400

    expected = hmac.new(
        GATEWAY_WEBHOOK_SECRET.encode(),
        f"{timestamp}.".encode() + raw_body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, provided_signature):
        return jsonify({"error": "invalid_signature"}), 400

    payload = request.get_json(silent=True) or {}
    gateway_order_id = str(payload.get("order_id") or "").strip()

    if payload.get("event") == "order.paid" and gateway_order_id:
        data, error = _fetch_gateway_order(gateway_order_id)
        if data and _normalize_status((data or {}).get("status")) == "PAID":
            with GATEWAY_ORDERS_LOCK:
                record = next(
                    (
                        entry
                        for entry in GATEWAY_ORDERS.values()
                        if entry["gateway_order_id"] == gateway_order_id
                    ),
                    None,
                )
                if record:
                    record["status"] = "PAID"
            with JOBS_LOCK:
                job = JOBS.get(record["job_id"]) if record else None
            if record and job:
                _mark_job_paid(record["job_id"])

    return jsonify({"received": True})
