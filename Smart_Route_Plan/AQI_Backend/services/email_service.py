import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
import os
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

def send_admin_invitation_email(recipient_email: str, role: str, invite_token: str) -> tuple[bool, str]:
    """
    Sends a role-based admin portal invitation email via SMTP.
    Returns (success: bool, status_message: str).
    """
    # Reload environment to ensure freshly saved .env changes are picked up
    load_dotenv(override=True)

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    try:
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
    except ValueError:
        smtp_port = 587

    smtp_user = os.getenv("SMTP_USER", "").strip()
    # Strip spaces from 16-character Google App Passwords (e.g., 'cwao irxj nnep aruc' -> 'cwaoirxjnneparuc')
    smtp_password = os.getenv("SMTP_PASSWORD", "").replace(" ", "").strip()
    from_email = os.getenv("SMTP_FROM_EMAIL", smtp_user).strip() or smtp_user
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5174").strip()

    invite_link = f"{frontend_url}/admin?invite={invite_token}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #1e293b; }}
            .email-card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }}
            .logo-header {{ display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #10b981; }}
            .logo-header h2 {{ margin: 0; color: #0f172a; font-size: 20px; font-weight: 800; }}
            .badge-role {{ display: inline-block; background: rgba(16,185,129,0.15); color: #059669; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; }}
            .btn-invite {{ display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 20px 0; box-shadow: 0 4px 14px rgba(16,185,129,0.35); }}
            .footer-note {{ font-size: 12px; color: #64748b; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; }}
            .link-box {{ background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; word-break: break-all; color: #3b82f6; }}
        </style>
    </head>
    <body>
        <div class="email-card">
            <div class="logo-header">
                <h2>🍃 ArogyaRoute Admin Portal</h2>
            </div>
            
            <h3>Invitation to Join Admin Control Room</h3>
            <p>You have been officially invited to join the <strong>ArogyaRoute Operations & Admin Portal</strong> as a team member with the role:</p>
            <p><span class="badge-role">{role}</span></p>
            
            <p>Click the button below to accept your invitation and create your account password:</p>
            
            <p style="text-align: center;">
                <a href="{invite_link}" class="btn-invite">Accept Invitation & Create Account →</a>
            </p>
            
            <p style="font-size: 13px; color: #475569;">If the button above does not work, copy and paste this link into your web browser:</p>
            <div class="link-box">{invite_link}</div>
            
            <div class="footer-note">
                <p>• This invitation link is valid for <strong>7 days</strong>.<br>
                • If you did not request this invitation, you can safely ignore this email.</p>
                <p style="margin-top: 8px;">ArogyaRoute Operations Team · Real-Time Air Quality & Route Intelligence</p>
            </div>
        </div>
    </body>
    </html>
    """

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"ArogyaRoute Admin Portal Invitation ({role})"
    msg['From'] = from_email
    msg['To'] = recipient_email

    msg.attach(MIMEText(html_content, 'html'))

    # Check if SMTP configuration is present
    if not smtp_user or not smtp_password:
        warning_msg = f"SMTP credentials unconfigured in .env. Invite token active in DB. Access link: {invite_link}"
        logger.warning(warning_msg)
        print(f"\n[SMTP INVITE SIMULATOR]\nSent to: {recipient_email}\nRole: {role}\nInvite Link: {invite_link}\n")
        return (False, "SMTP email skipped (SMTP_USER or SMTP_PASSWORD empty in .env). Invitation link generated & active in DB.")

    try:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(from_email, [recipient_email], msg.as_string())
        server.quit()
        logger.info(f"Invitation email successfully sent via SMTP to {recipient_email}")
        return (True, f"Invitation email sent directly to {recipient_email} via SMTP!")
    except Exception as e:
        err_msg = f"SMTP Error sending to {recipient_email}: {str(e)}"
        logger.error(err_msg)
        print(f"\n[SMTP ERROR - INVITE CREATED IN DB]\nLink: {invite_link}\nError: {e}\n")
        
        hint = ""
        if "535" in str(e) or "Username and Password not accepted" in str(e):
            hint = f" (Gmail Authentication Error: Ensure SMTP_USER matches the exact Gmail account ('{smtp_user}') that generated the App Password, and that 2-Factor Authentication is enabled on that Google Account)."
            
        return (False, f"Invitation saved in DB, but Gmail SMTP authentication failed: {str(e)}{hint}")

