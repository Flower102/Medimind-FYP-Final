# backend/app/emailer.py

# backend/app/emailer.py

"""
Email sending helper.

Development:
- MAIL_TRANSPORT=console
- Code prints in the backend terminal

Production:
- MAIL_TRANSPORT=smtp
- Code is sent through SMTP settings
"""

import smtplib
from email.message import EmailMessage

from .settings import settings


def send_verification_email(to_email: str, code: str) -> None:
    """
    Sends a verification/reset code.

    Your current backend uses this function for:
    - email verification
    - forgot password reset code

    The email text is written in plain English so users understand:
    - what the code is
    - when it expires
    - what to do if they did not request it
    """

    if settings.MAIL_TRANSPORT == "console":
        print(
            "\n=== MEDIMIND EMAIL CODE ===\n"
            f"To: {to_email}\n"
            f"Code: {code}\n"
            f"Expires in: {settings.VERIFY_CODE_EXPIRE_MINUTES} minutes\n"
            "===========================\n"
        )
        return

    if settings.MAIL_TRANSPORT != "smtp":
        raise RuntimeError(
            "MAIL_TRANSPORT must be either 'console' for development or 'smtp' for real email sending."
        )

    msg = EmailMessage()
    msg["Subject"] = "Your MediMind verification code"
    msg["From"] = settings.MAIL_FROM
    msg["To"] = to_email

    msg.set_content(
        f"Your MediMind verification code is: {code}\n\n"
        f"This code expires in {settings.VERIFY_CODE_EXPIRE_MINUTES} minutes.\n\n"
        "Enter this code in MediMind to continue.\n\n"
        "If you did not request this code, you can safely ignore this email."
    )

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls()

            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASS)

            server.send_message(msg)

    except smtplib.SMTPException as exc:
        raise RuntimeError(
            "Email could not be sent. Please check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, and SMTP_TLS in your backend .env file."
        ) from exc