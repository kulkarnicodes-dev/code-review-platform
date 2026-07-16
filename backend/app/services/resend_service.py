import resend

from app.core.config import settings

resend.api_key = settings.RESEND_API_KEY


def send_email(to, subject, html):

    resend.Emails.send({
        "from": settings.EMAIL_FROM,
        "to": [to],
        "subject": subject,
        "html": html,
    })
