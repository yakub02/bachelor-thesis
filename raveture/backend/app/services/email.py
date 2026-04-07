"""
Email service for RAVETURE.
Handles sending emails via SMTP with async support using threading.
"""

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from threading import Thread
from typing import Optional, List
from flask import current_app, Flask

from app.services.email_templates import (
    registration_confirmation,
    password_reset,
    purchase_confirmation,
    event_reminder,
)


class EmailService:
    """
    SMTP email service with async sending capability.

    Usage:
        email_service = EmailService()
        email_service.send_password_reset(email, username, reset_url)
    """

    def __init__(self, app: Optional[Flask] = None):
        self.app = app

    def _get_config(self) -> dict:
        """Get email configuration from Flask app."""
        app = self.app or current_app
        return {
            'server': app.config.get('MAIL_SERVER', 'smtp.gmail.com'),
            'port': app.config.get('MAIL_PORT', 587),
            'use_tls': app.config.get('MAIL_USE_TLS', True),
            'use_ssl': app.config.get('MAIL_USE_SSL', False),
            'username': app.config.get('MAIL_USERNAME'),
            'password': app.config.get('MAIL_PASSWORD'),
            'default_sender': app.config.get('MAIL_DEFAULT_SENDER', 'noreply@raveture.com'),
        }

    def _send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        sender: Optional[str] = None,
    ) -> bool:
        """
        Send an email synchronously.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML content
            text_body: Plain text fallback (optional)
            sender: Sender email (uses default if not provided)

        Returns:
            True if sent successfully, False otherwise
        """
        config = self._get_config()

        # Check if credentials are configured
        if not config['username'] or not config['password']:
            current_app.logger.warning(
                f"Email not sent (no credentials configured): {subject} -> {to_email}"
            )
            # In development, log the email content
            if current_app.debug:
                current_app.logger.info(f"Email subject: {subject}")
                current_app.logger.info(f"Email recipient: {to_email}")
            return False

        # Create message
        message = MIMEMultipart('alternative')
        message['Subject'] = subject
        message['From'] = sender or config['default_sender']
        message['To'] = to_email

        # Add text and HTML parts
        if text_body:
            message.attach(MIMEText(text_body, 'plain'))
        message.attach(MIMEText(html_body, 'html'))

        try:
            # Create secure connection
            if config['use_ssl']:
                context = ssl.create_default_context()
                server = smtplib.SMTP_SSL(
                    config['server'],
                    config['port'],
                    context=context
                )
            else:
                server = smtplib.SMTP(config['server'], config['port'])
                if config['use_tls']:
                    server.starttls()

            # Login and send
            server.login(config['username'], config['password'])
            server.sendmail(
                sender or config['default_sender'],
                to_email,
                message.as_string()
            )
            server.quit()

            current_app.logger.info(f"Email sent: {subject} -> {to_email}")
            return True

        except smtplib.SMTPAuthenticationError:
            current_app.logger.error("SMTP authentication failed")
            return False
        except smtplib.SMTPException as e:
            current_app.logger.error(f"SMTP error: {e}")
            return False
        except Exception as e:
            current_app.logger.error(f"Email error: {e}")
            return False

    def send_async(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
    ) -> None:
        """
        Send email asynchronously in a background thread.

        This doesn't block the main request and is ideal for
        non-critical emails like confirmations.
        """
        app = current_app._get_current_object()

        def send_email_task():
            with app.app_context():
                self._send_email(to_email, subject, html_body, text_body)

        thread = Thread(target=send_email_task)
        thread.start()

    # =========================================================================
    # HIGH-LEVEL EMAIL METHODS
    # =========================================================================

    def send_registration_confirmation(
        self,
        email: str,
        username: str,
        verification_url: Optional[str] = None,
        async_send: bool = True,
    ) -> bool:
        """Send registration confirmation email."""
        subject, html_body = registration_confirmation(username, verification_url)

        if async_send:
            self.send_async(email, subject, html_body)
            return True
        return self._send_email(email, subject, html_body)

    def send_password_reset(
        self,
        email: str,
        username: str,
        reset_url: str,
        expiry_hours: int = 24,
        async_send: bool = True,
    ) -> bool:
        """Send password reset email."""
        subject, html_body = password_reset(username, reset_url, expiry_hours)

        if async_send:
            self.send_async(email, subject, html_body)
            return True
        return self._send_email(email, subject, html_body)

    def send_purchase_confirmation(
        self,
        email: str,
        username: str,
        event_name: str,
        event_date: str,
        venue_name: str,
        tickets: List[dict],
        total_amount: str,
        order_id: str,
        async_send: bool = True,
    ) -> bool:
        """Send purchase confirmation email."""
        subject, html_body = purchase_confirmation(
            username=username,
            event_name=event_name,
            event_date=event_date,
            venue_name=venue_name,
            tickets=tickets,
            total_amount=total_amount,
            order_id=order_id,
        )

        if async_send:
            self.send_async(email, subject, html_body)
            return True
        return self._send_email(email, subject, html_body)

    def send_event_reminder(
        self,
        email: str,
        username: str,
        event_name: str,
        event_date: str,
        venue_name: str,
        venue_address: str,
        hours_until: int,
        async_send: bool = True,
    ) -> bool:
        """Send event reminder email."""
        subject, html_body = event_reminder(
            username=username,
            event_name=event_name,
            event_date=event_date,
            venue_name=venue_name,
            venue_address=venue_address,
            hours_until=hours_until,
        )

        if async_send:
            self.send_async(email, subject, html_body)
            return True
        return self._send_email(email, subject, html_body)


# Global instance
email_service = EmailService()
