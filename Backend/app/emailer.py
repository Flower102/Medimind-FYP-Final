# /Backend/app/emailer.py

import json
import urllib.error
import urllib.request

from .settings import settings


def build_email_text(code: str) -> str:
    return (
        f"Your MediMind verification code is: {code}\n\n"
        f"This code expires in {settings.VERIFY_CODE_EXPIRE_MINUTES} minutes.\n\n"
        "Enter this code in MediMind to continue.\n\n"
        "If you did not request this code, you can safely ignore this email."
    )


def build_email_html(code: str) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Your MediMind verification code</h2>
      <p>Your MediMind verification code is:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">{code}</p>
      <p>This code expires in {settings.VERIFY_CODE_EXPIRE_MINUTES} minutes.</p>
      <p>Enter this code in MediMind to continue.</p>
      <p>If you did not request this code, you can safely ignore this email.</p>
    </div>
    """


def send_verification_email(to_email: str, code: str) -> None:
    """
    Sends a MediMind verification or password-reset code using Brevo.

    This function is used for:
    - email verification
    - resend verification code
    - forgot-password reset code
    """

    payload = {
        "sender": {
            "name": settings.MAIL_FROM_NAME,
            "email": settings.MAIL_FROM,
        },
        "to": [
            {
                "email": to_email,
            }
        ],
        "subject": "Your MediMind verification code",
        "textContent": build_email_text(code),
        "htmlContent": build_email_html(code),
    }

    request = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-key": settings.BREVO_API_KEY or "",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            if response.status < 200 or response.status >= 300:
                raise RuntimeError(f"Brevo returned status {response.status}.")

    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"Brevo email failed. Status: {exc.code}. Response: {error_body}"
        ) from exc

    except urllib.error.URLError as exc:
        raise RuntimeError(
            "Brevo email failed because the backend could not connect to Brevo."
        ) from exc