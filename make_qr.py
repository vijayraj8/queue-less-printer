
import qrcode

# Queue-Less Printer mobile website
url = "http://10.106.12.243:5000"

# Generate QR code
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_M,
    box_size=10,
    border=4
)

qr.add_data(url)
qr.make(fit=True)

# Create QR image
image = qr.make_image(
    fill_color="black",
    back_color="white"
)

# Save QR code
image.save("queue_less_printer_qr.png")

print("Queue-Less Printer QR Code Generated Successfully!")
print("File: queue_less_printer_qr.png")
