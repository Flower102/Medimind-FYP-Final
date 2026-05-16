"""
Email sending helper.

Development/testing:
- MAIL_TRANSPORT=console
- Code prints in backend terminal / Render logs

Production recommended:
- MAIL_TRANSPORT=resend
- Email is sent through Resend HTTP API

SMTP:
- MAIL_TRANSPORT=smtp
- Works locally or on hosts that allow SMTP
- Render free services block common SMTP ports
"""

import smtplib
from email.message import EmailMessage

import httpx

from .settings import settings


def _email_text(code: str) -> str:
    return (
        f"Your MediMind verification code is: {code}\n\n"
        f"This code expires in {settings.VERIFY_CODE_EXPIRE_MINUTES} minutes.\n\n"
        "Enter this code in MediMind to continue.\n\n"
        "If you did not request this code, you can safely ignore this email."
    )


def send_verification_email(to_email: str, code: str) -> None:
    """
    Sends a verification/reset code.

    Used for:
    - email verification
    - forgot password reset code
    """

    transport = (settings.MAIL_TRANSPORT or "console").lower().strip()

    if transport == "console":
        print(
            "\n=== MEDIMIND EMAIL CODE ===\n"
            f"To: {to_email}\n"
            f"Code: {code}\n"
            f"Expires in: {settings.VERIFY_CODE_EXPIRE_MINUTES} minutes\n"
            "===========================\n"
        )
        return

    if transport == "resend":
        send_email_with_resend(to_email, code)
        return

    if transport == "smtp":
        send_email_with_smtp(to_email, code)
        return

    raise RuntimeError(
        "MAIL_TRANSPORT must be 'console', 'resend', or 'smtp'."
    )


def send_email_with_resend(to_email: str, code: str) -> None:
    if not settings.RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is missing.")

    if not settings.MAIL_FROM:
        raise RuntimeError("MAIL_FROM is missing.")

    payload = {
        "from": settings.MAIL_FROM,
        "to": [to_email],
        "subject": "Your MediMind verification code",
        "text": _email_text(code),
    }

    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=20) as client:
            response = client.post(
                "https://api.resend.com/emails",
                json=payload,
                headers=headers,
            )

        if response.status_code >= 400:
            print("RESEND_EMAIL_ERROR:", response.status_code, response.text)
            raise RuntimeError("Email could not be sent through Resend.")

    except Exception as exc:
        print("RESEND_EMAIL_FAILED:", repr(exc))
        raise RuntimeError("Email could not be sent through Resend.") from exc


def send_email_with_smtp(to_email: str, code: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = "Your MediMind verification code"
    msg["From"] = settings.MAIL_FROM
    msg["To"] = to_email
    msg.set_content(_email_text(code))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
            if settings.SMTP_TLS:
                server.starttls()

            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASS)

            server.send_message(msg)

    except Exception as exc:
        print("SMTP_EMAIL_FAILED:", repr(exc))
        raise RuntimeError(
            "Email could not be sent. Please check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, and SMTP_TLS."
        ) from exc