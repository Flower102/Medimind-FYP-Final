"""
Email sending helper.

Development:
- MAIL_TRANSPORT=console
- Code prints in backend terminal / Render logs

Production free option:
- MAIL_TRANSPORT=brevo
- Sends through Brevo Email API over HTTPS

Do not use SMTP on Render free services.
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

    if transport == "brevo":
        send_email_with_brevo(to_email, code)
        return

    if transport == "smtp":
        send_email_with_smtp(to_email, code)
        return

    raise RuntimeError("MAIL_TRANSPORT must be 'console', 'brevo', or 'smtp'.")


def send_email_with_brevo(to_email: str, code: str) -> None:
    if not settings.BREVO_API_KEY:
        raise RuntimeError("BREVO_API_KEY is missing.")

    if not settings.MAIL_FROM:
        raise RuntimeError("MAIL_FROM is missing.")

    payload = {
        "sender": {
            "name": getattr(settings, "MAIL_FROM_NAME", "MediMind Lite"),
            "email": settings.MAIL_FROM,
        },
        "to": [
            {
                "email": to_email,
            }
        ],
        "subject": "Your MediMind verification code",
        "textContent": _email_text(code),
    }

    headers = {
        "accept": "application/json",
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json",
    }

    try:
        with httpx.Client(timeout=20) as client:
            response = client.post(
                "https://api.brevo.com/v3/smtp/email",
                json=payload,
                headers=headers,
            )

        if response.status_code >= 400:
            print("BREVO_EMAIL_ERROR_STATUS:", response.status_code)
            print("BREVO_EMAIL_ERROR_BODY:", response.text)
            raise RuntimeError("Email could not be sent through Brevo.")

        print("BREVO_EMAIL_SENT:", response.status_code, response.text)

    except Exception as exc:
        print("BREVO_EMAIL_FAILED:", repr(exc))
        raise RuntimeError("Email could not be sent through Brevo.") from exc


def _extract_email_from_mail_from(mail_from: str) -> str:
    """
    Accepts:
    - no-reply@example.com
    - MediMind <no-reply@example.com>

    Returns:
    - no-reply@example.com
    """

    value = mail_from.strip()

    if "<" in value and ">" in value:
        return value.split("<", 1)[1].split(">", 1)[0].strip()

    return value


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
            "Email could not be sent. Please check SMTP settings."
        ) from exc