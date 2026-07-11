import smtplib
from email.mime.text import MIMEText
from app.core.config import settings


def send_welcome_email(to_email: str, name: str):
    subject = "Welcome to AI Code Review 🎉"

    body = f"""
Hi {name} 👋,

Thank you for registering on AI Code Review Platform.

You can now:
✅ Practice coding
✅ Get AI code reviews
✅ Improve skills
✅ Solve code for free

Happy Coding 🚀

— AI Code Review Team
"""

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_USER
    msg["To"] = to_email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(settings.EMAIL_USER, settings.EMAIL_PASS)
        server.send_message(msg)
