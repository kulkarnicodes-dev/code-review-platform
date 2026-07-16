from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings
from app.utils.email import _send_message


def send_welcome_email(to_email: str, name: str):
    """Send welcome email to a newly registered user."""

    msg = MIMEMultipart("alternative")

    msg["Subject"] = "🎉 Welcome to CodeReview AI"
    msg["From"] = settings.EMAIL_USER
    msg["To"] = to_email

    text = f"""
Hi {name},

Welcome to CodeReview AI!

Your account has been created successfully.

Happy Coding!

— CodeReview AI Team
"""

    html = f"""
<html>
<body>
    <h2>Welcome {name}! 🎉</h2>

    <p>Your account has been created successfully.</p>

    <p>You can now:</p>

    <ul>
        <li>✅ Review code with AI</li>
        <li>✅ Track your progress</li>
        <li>✅ Earn badges</li>
        <li>✅ Improve your coding skills</li>
    </ul>

    <p>Happy Coding 🚀</p>

    <br>

    <strong>CodeReview AI Team</strong>
</body>
</html>
"""

    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    _send_message(msg)
