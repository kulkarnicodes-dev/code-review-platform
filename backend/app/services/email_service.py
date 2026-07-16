import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from email import message_from_string
from app.core.config import settings


def _send_message(msg):
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = settings.BREVO_API_KEY

    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

    parsed = message_from_string(msg.as_string())

    subject = parsed["Subject"]
    sender = {
        "email": settings.EMAIL_USER,
        "name": "CodeReview AI",
    }

    receiver = [
        {
            "email": parsed["To"]
        }
    ]

    html = parsed.get_payload()

    send_email = sib_api_v3_sdk.SendSmtpEmail(
        to=receiver,
        sender=sender,
        subject=subject,
        html_content=f"<pre>{html}</pre>"
    )

    try:
        api_instance.send_transac_email(send_email)
        print("✅ Email sent successfully!")

    except ApiException as e:
        print("❌ Brevo Error:", e)
        raise
