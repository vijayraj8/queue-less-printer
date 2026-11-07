
from flask import (
    Flask, request, render_template_string,
    send_file, abort, redirect, url_for, flash
)
import fitz
import os
import uuid
import math
import time
import threading

# ==========================================
# QUEUE-LESS PRINTER
# ==========================================

app = Flask(__name__)
app.secret_key = "queue-less-prototype-secret-change-before-deployment"
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "print_output"

CLEANUP_AFTER_SECONDS = 10 * 60

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

JOBS = {}
JOBS_LOCK = threading.Lock()


# ==========================================
# WEBSITE DESIGN
# ==========================================

STYLE = """
<style>
* { box-sizing: border-box; }

body {
    font-family: Arial, sans-serif;
    background: #f2f6fc;
    margin: 0;
    padding: 25px 15px;
    color: #253047;
}

.container {
    background: white;
    max-width: 650px;
    margin: 20px auto;
    padding: 28px;
    border-radius: 15px;
    box-shadow: 0 4px 18px #00000012;
}

h1 { color: #1769e0; }

label {
    display: block;
    font-weight: bold;
    margin: 15px 0 7px;
}

input, select {
    width: 100%;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 7px;
    font-size: 15px;
}

button, .button {
    display: block;
    width: 100%;
    padding: 14px;
    margin-top: 18px;
    border: none;
    border-radius: 8px;
    background: #1769e0;
    color: white;
    font-size: 16px;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
}

.secondary { background: #475569; }

.notice {
    background: #fff3cd;
    color: #856404;
    padding: 13px;
    border-radius: 8px;
    margin: 18px 0;
}

.success {
    background: #e7f7ed;
    color: #176534;
    padding: 13px;
    border-radius: 8px;
    margin: 18px 0;
}

.error {
    background: #fdecec;
    color: #9b1c1c;
    padding: 13px;
    border-radius: 8px;
}

.price {
    font-size: 38px;
    color: #1769e0;
    font-weight: bold;
}

.small {
    color: #64748b;
    font-size: 13px;
}

.row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

@media(max-width: 500px) {
    .container { padding: 20px 15px; }
    .row { grid-template-columns: 1fr; }
}
</style>
"""


# ==========================================
# HTML PAGES
# ==========================================

HOME_HTML = """
<!DOCTYPE html>
<html>
<head>
<title>Queue-Less Printer</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
""" + STYLE + """
</head>
<body>
<div class="container">

<h1>Queue-Less Printer</h1>

<p>No Queue. No Waiting. Print Anytime.</p>

<div class="notice">
Prototype Mode: Payment is simulated.
No real money will be deducted.
Printing generates a PDF, not physical paper.
</div>

{% with messages = get_flashed_messages() %}
{% for message in messages %}
<div class="error">{{ message }}</div>
{% endfor %}
{% endwith %}

<form action="/upload" method="POST" enctype="multipart/form-data">

<label>Select Your PDF</label>

<input type="file"
       name="pdf_file"
       accept=".pdf,application/pdf"
       required>

<button type="submit">Upload PDF</button>

</form>

<p class="small">
Maximum PDF size: 10 MB.
Documents are scheduled for automatic deletion
after 10 minutes of inactivity.
</p>

</div>
</body>
</html>
"""


CONFIGURE_HTML = """
<!DOCTYPE html>
<html>
<head>
<title>Printing Options</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
""" + STYLE + """
</head>
<body>
<div class="container">

<h1>Queue-Less Printer</h1>

<h2>Printing Options</h2>

<div class="success">
PDF uploaded successfully!<br>
Total pages: <b>{{ page_count }}</b>
</div>

<form action="/configure" method="POST">

<input type="hidden" name="job_id" value="{{ job_id }}">

<label>Print Type</label>

<select name="print_type">
<option value="bw">Black & White - ₹2/page</option>
<option value="colour">Colour - ₹10/page</option>
</select>

<div class="row">

<div>
<label>Number of Copies</label>
<input type="number"
       name="copies"
       min="1"
       max="20"
       value="1"
       required>
</div>

<div>
<label>Pages to Print</label>
<input type="text"
       name="page_selection"
       value="all"
       required>
</div>

</div>

<label>Printing Sides</label>

<select name="sides">
<option value="single">Single-sided</option>
<option value="double">Double-sided</option>
</select>

<button type="submit">Calculate Price</button>

</form>

<p class="small">
Examples: all, 1-3, 1,3,5, 1-3,5
</p>

</div>
</body>
</html>
"""


PRICE_HTML = """
<!DOCTYPE html>
<html>
<head>
<title>Price Summary</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
""" + STYLE + """
</head>
<body>
<div class="container">

<h1>Queue-Less Printer</h1>

<h2>Price Summary</h2>

<p>Selected pages: {{ selected_count }}</p>
<p>Copies: {{ copies }}</p>
<p>Printing type: {{ print_type }}</p>
<p>Printing sides: {{ sides }}</p>
<p>Estimated sheets: {{ sheets }}</p>

<div class="price">₹{{ amount }}</div>

<form action="/payment" method="POST">
<input type="hidden" name="job_id" value="{{ job_id }}">
<button type="submit">Proceed to Demo Payment</button>
</form>

</div>
</body>
</html>
"""


PAYMENT_HTML = """
<!DOCTYPE html>
<html>
<head>
<title>Demo Payment</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
""" + STYLE + """
</head>
<body>
<div class="container">

<h1>Queue-Less Printer</h1>

<h2>Demo Payment</h2>

<div class="notice">
<b>TEST MODE ONLY</b><br>
No real money will be deducted.
No actual UPI payment is being processed.
</div>

<p>Your printing amount:</p>

<div class="price">₹{{ amount }}</div>

<p>Click below to simulate successful payment.</p>

<form action="/print" method="POST">
<input type="hidden" name="job_id" value="{{ job_id }}">
<button type="submit">Confirm Demo Payment</button>
</form>

</div>
</body>
</html>
"""


COMPLETE_HTML = """
<!DOCTYPE html>
<html>
<head>
<title>Print Complete</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
""" + STYLE + """
</head>
<body>
<div class="container">

<h1>Queue-Less Printer</h1>

<div class="success">
<b>Simulated Printing Completed!</b>
</div>

<p>Your output PDF is ready.</p>

<a class="button" href="/download/{{ job_id }}">
Download Output PDF
</a>

<a class="button secondary" href="/">
Print Another Document
</a>

<p class="small">
Uploaded and output PDFs are scheduled for deletion
after 10 minutes of inactivity.
</p>

</div>
</body>
</html>
"""


ERROR_HTML = """
<!DOCTYPE html>
<html>
<head>
<title>Queue-Less Printer</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
""" + STYLE + """
</head>
<body>
<div class="container">

<h1>Queue-Less Printer</h1>

<div class="error">{{ message }}</div>

<a class="button" href="/">Return Home</a>

</div>
</body>
</html>
"""


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def show_error(message, status=400):
    return render_template_string(
        ERROR_HTML,
        message=message
    ), status


def update_activity(job):
    job["last_activity"] = time.time()


def parse_page_selection(selection, total_pages):

    selection = (selection or "").strip().lower()

    if selection == "all":
        return list(range(total_pages))

    if not selection:
        raise ValueError("Please select pages.")

    selected = set()

    try:

        for part in selection.split(","):

            part = part.strip()

            if "-" in part:

                bounds = part.split("-")

                if len(bounds) != 2:
                    raise ValueError

                start = int(bounds[0].strip())
                end = int(bounds[1].strip())

                if start < 1 or end < start or end > total_pages:
                    raise ValueError

                for page in range(start, end + 1):
                    selected.add(page - 1)

            else:

                page = int(part)

                if page < 1 or page > total_pages:
                    raise ValueError

                selected.add(page - 1)

    except ValueError:
        raise ValueError(
            f"Invalid page selection. Select pages between 1 and {total_pages}."
        )

    return sorted(selected)


def delete_job_files(job):

    upload_name = job.get("upload_name")
    output_name = job.get("output_name")

    if upload_name:

        path = os.path.join(UPLOAD_FOLDER, upload_name)

        if os.path.isfile(path):
            try:
                os.remove(path)
            except OSError as error:
                print("Upload deletion error:", error)

    if output_name:

        path = os.path.join(OUTPUT_FOLDER, output_name)

        if os.path.isfile(path):
            try:
                os.remove(path)
            except OSError as error:
                print("Output deletion error:", error)


# ==========================================
# AUTOMATIC PDF DELETION
# ==========================================

def cleanup_worker():

    while True:

        time.sleep(15)

        current_time = time.time()

        with JOBS_LOCK:

            for job_id, job in list(JOBS.items()):

                if job.get("status") == "EXPIRED":
                    continue

                last_activity = job.get(
                    "last_activity",
                    job.get("created_at", current_time)
                )

                if current_time - last_activity >= CLEANUP_AFTER_SECONDS:

                    delete_job_files(job)

                    job["status"] = "EXPIRED"

                    job.pop("upload_name", None)
                    job.pop("output_name", None)

                    job["expired_at"] = current_time

                    print(
                        "PDF files automatically deleted for job:",
                        job_id
                    )


cleanup_thread = threading.Thread(
    target=cleanup_worker,
    daemon=True
)

cleanup_thread.start()


# ==========================================
# ROUTE 1: HOME PAGE
# ==========================================

@app.route("/")
def home():

    return render_template_string(HOME_HTML)


# ==========================================
# ROUTE 2: PDF UPLOAD
# ==========================================

@app.route("/upload", methods=["POST"])
def upload_pdf():

    uploaded_file = request.files.get("pdf_file")

    if not uploaded_file or not uploaded_file.filename:
        flash("Please select a PDF file.")
        return redirect("/")

    if not uploaded_file.filename.lower().endswith(".pdf"):
        return show_error("Only PDF files are accepted.")

    job_id = str(uuid.uuid4())

    upload_name = job_id + ".pdf"

    upload_path = os.path.join(
        UPLOAD_FOLDER,
        upload_name
    )

    try:

        uploaded_file.save(upload_path)

        with fitz.open(upload_path) as document:

            if document.is_encrypted:
                raise ValueError("Password-protected PDFs are not supported.")

            page_count = document.page_count

            if page_count < 1:
                raise ValueError("PDF contains no pages.")

    except Exception as error:

        if os.path.isfile(upload_path):
            os.remove(upload_path)

        return show_error("PDF validation failed: " + str(error))

    current_time = time.time()

    with JOBS_LOCK:

        JOBS[job_id] = {
            "job_id": job_id,
            "upload_name": upload_name,
            "page_count": page_count,
            "status": "UPLOADED",
            "created_at": current_time,
            "last_activity": current_time
        }

    return render_template_string(
        CONFIGURE_HTML,
        job_id=job_id,
        page_count=page_count
    )


# ==========================================
# ROUTE 3: CONFIGURE PRINTING
# ==========================================

@app.route("/configure", methods=["POST"])
def configure_job():

    job_id = request.form.get("job_id", "")

    with JOBS_LOCK:

        job = JOBS.get(job_id)

        if (
            not job
            or job.get("status") == "EXPIRED"
            or not job.get("upload_name")
        ):
            return show_error("Job not found. Please upload again.", 404)

        try:
            copies = int(request.form.get("copies", "1"))
        except ValueError:
            return show_error("Enter a valid number of copies.")

        if copies < 1 or copies > 20:
            return show_error("Copies must be between 1 and 20.")

        print_type = request.form.get("print_type", "bw")

        if print_type not in ("bw", "colour"):
            return show_error("Invalid print type.")

        sides = request.form.get("sides", "single")

        if sides not in ("single", "double"):
            return show_error("Invalid printing sides.")

        try:

            selected_pages = parse_page_selection(
                request.form.get("page_selection", "all"),
                job["page_count"]
            )

        except ValueError as error:
            return show_error(str(error))

        if not selected_pages:
            return show_error("Select at least one page.")

        rate = 2 if print_type == "bw" else 10

        printed_pages = len(selected_pages) * copies

        price = printed_pages * rate

        if sides == "double":
            sheets = math.ceil(len(selected_pages) / 2) * copies
        else:
            sheets = printed_pages

        job["configuration"] = {
            "print_type": print_type,
            "copies": copies,
            "selected_pages": selected_pages,
            "sides": sides,
            "price": price,
            "printed_pages": printed_pages,
            "estimated_sheets": sheets
        }

        job["status"] = "CONFIGURED"

        update_activity(job)

    return render_template_string(
        PRICE_HTML,
        job_id=job_id,
        amount=price,
        selected_count=len(selected_pages),
        copies=copies,
        sheets=sheets,
        print_type="Black & White" if print_type == "bw" else "Colour",
        sides="Single-sided" if sides == "single" else "Double-sided"
    )


# ==========================================
# ROUTE 4: DEMO PAYMENT
# ==========================================

@app.route("/payment", methods=["POST"])
def payment():

    job_id = request.form.get("job_id", "")

    with JOBS_LOCK:

        job = JOBS.get(job_id)

        if (
            not job
            or "configuration" not in job
            or job.get("status") != "CONFIGURED"
        ):
            return show_error("Payment job not found. Please start again.", 404)

        update_activity(job)

        config = job["configuration"]

    return render_template_string(
        PAYMENT_HTML,
        job_id=job_id,
        amount=config["price"]
    )


# ==========================================
# ROUTE 5: VIRTUAL PRINTING
# ==========================================

@app.route("/print", methods=["POST"])
def print_job():

    job_id = request.form.get("job_id", "")

    with JOBS_LOCK:

        job = JOBS.get(job_id)

        if (
            not job
            or job.get("status") != "CONFIGURED"
            or not job.get("upload_name")
        ):
            return show_error("Job not found or expired. Please upload again.", 404)

        upload_path = os.path.join(
            UPLOAD_FOLDER,
            job["upload_name"]
        )

        if not os.path.isfile(upload_path):
            return show_error("Uploaded PDF is unavailable.", 404)

        config = job["configuration"]

        output_name = job_id + "_output.pdf"

        output_path = os.path.join(
            OUTPUT_FOLDER,
            output_name
        )

        try:

            with fitz.open(upload_path) as source:

                output = fitz.open()

                for copy_number in range(config["copies"]):

                    for page_index in config["selected_pages"]:

                        output.insert_pdf(
                            source,
                            from_page=page_index,
                            to_page=page_index
                        )

                output.save(output_path)

                output.close()

        except Exception as error:

            return show_error(
                "Virtual printing failed: " + str(error),
                500
            )

        job["output_name"] = output_name

        job["status"] = "DEMO_PRINT_COMPLETED"

        job["demo_payment_status"] = "DEMO_CONFIRMED"

        update_activity(job)

    return render_template_string(
        COMPLETE_HTML,
        job_id=job_id
    )


# ==========================================
# ROUTE 6: DOWNLOAD OUTPUT PDF
# ==========================================

@app.route("/download/<job_id>")
def download_output(job_id):

    with JOBS_LOCK:

        job = JOBS.get(job_id)

        if (
            not job
            or job.get("status") == "EXPIRED"
            or not job.get("output_name")
        ):
            abort(404)

        output_path = os.path.join(
            OUTPUT_FOLDER,
            job["output_name"]
        )

        if not os.path.isfile(output_path):
            abort(404)

        update_activity(job)

    return send_file(
        output_path,
        as_attachment=True,
        download_name="Queue-Less_Printer_Output.pdf"
    )


# ==========================================
# FILE SIZE ERROR
# ==========================================

@app.errorhandler(413)
def file_too_large(error):

    return show_error(
        "File too large. Maximum allowed size is 10 MB.",
        413
    )


# ==========================================
# START SERVER
# ==========================================

if __name__ == "__main__":

    print("Queue-Less Printer Server Started!")

    print("Local website: http://127.0.0.1:5000")

    print("Mobile access: Use your laptop's current Wi-Fi IP.")

    print("Automatic PDF deletion: 10 minutes of inactivity.")

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )

