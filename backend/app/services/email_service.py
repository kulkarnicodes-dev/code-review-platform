from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.utils.email import _send_message


def send_welcome_email(to_email: str, name: str):
    subject = "🎉 Welcome to AI Code Review Platform"

    html = f"""
    <html>
    <body style="font-family:Arial,sans-serif">
        <h2>Welcome {name}! 👋</h2>

        <p>Thank you for registering on <b>AI Code Review Platform</b>.</p>

        <ul>
            <li>✅ Practice coding</li>
            <li>✅ Get AI code reviews</li>
            <li>✅ Improve your coding skills</li>
            <li>✅ Earn XP and badges</li>
        </ul>

        <p>Happy Coding 🚀</p>

        <p>
            <strong>— AI Code Review Team</strong>
        </p>
    </body>
    </html>
    """

    plain = f"""
Welcome {name}!

Thank you for registering on AI Code Review Platform.

Happy Coding!

- AI Code Review Team
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"CodeReview Platform <{settings.EMAIL_FROM}>"
    msg["To"] = to_email

    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    _send_message(msg)
