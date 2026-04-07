"""
Email HTML templates for RAVETURE.
All templates use inline CSS for email client compatibility.
"""

# Base template with common styling
BASE_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Helvetica Neue', Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border: 1px solid #333;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px 40px; border-bottom: 1px solid #333;">
                            <table width="100%">
                                <tr>
                                    <td>
                                        <div style="width: 32px; height: 32px; background-color: #da7858; display: inline-block;"></div>
                                        <span style="color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: -1px; margin-left: 12px; vertical-align: middle;">RAVETURE</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            {content}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; border-top: 1px solid #333; background-color: #141414;">
                            <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">
                                &copy; 2026 RAVETURE. All rights reserved.
                            </p>
                            <p style="color: #666; font-size: 12px; margin: 10px 0 0; text-align: center;">
                                <a href="https://raveture.cz" style="color: #da7858; text-decoration: none;">raveture.cz</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def render_template(content: str) -> str:
    """Wrap content in base template."""
    return BASE_TEMPLATE.format(content=content)


def registration_confirmation(username: str, verification_url: str = None) -> tuple[str, str]:
    """
    Registration confirmation email.

    Returns:
        Tuple of (subject, html_body)
    """
    subject = "Welcome to RAVETURE"

    verification_section = ""
    if verification_url:
        verification_section = f"""
            <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                Please verify your email by clicking the button below:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                    <td align="center">
                        <a href="{verification_url}" style="display: inline-block; padding: 16px 40px; background-color: #da7858; color: #000; text-decoration: none; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                            Verify Email
                        </a>
                    </td>
                </tr>
            </table>
        """

    content = f"""
        <h1 style="color: #da7858; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 20px;">
            [ Welcome ]
        </h1>
        <h2 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0 0 20px;">
            Welcome to RAVETURE, {username}
        </h2>
        <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 0;">
            Your account has been created successfully. You're now part of the underground electronic music community.
        </p>
        {verification_section}
        <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
            Start exploring events, connect with artists, and discover new music.
        </p>
    """

    return subject, render_template(content)


def password_reset(username: str, reset_url: str, expiry_hours: int = 24) -> tuple[str, str]:
    """
    Password reset email.

    Returns:
        Tuple of (subject, html_body)
    """
    subject = "Reset Your RAVETURE Password"

    content = f"""
        <h1 style="color: #da7858; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 20px;">
            [ Password Reset ]
        </h1>
        <h2 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0 0 20px;">
            Reset Your Password
        </h2>
        <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 0;">
            Hi {username}, we received a request to reset your password.
        </p>
        <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 20px 0;">
            Click the button below to create a new password:
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
                <td align="center">
                    <a href="{reset_url}" style="display: inline-block; padding: 16px 40px; background-color: #da7858; color: #000; text-decoration: none; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                        Reset Password
                    </a>
                </td>
            </tr>
        </table>
        <p style="color: #666; font-size: 12px; line-height: 1.6; margin: 0;">
            This link will expire in {expiry_hours} hours.
        </p>
        <p style="color: #666; font-size: 12px; line-height: 1.6; margin: 20px 0 0;">
            If you didn't request this, you can safely ignore this email.
        </p>
    """

    return subject, render_template(content)


def purchase_confirmation(
    username: str,
    event_name: str,
    event_date: str,
    venue_name: str,
    tickets: list,
    total_amount: str,
    order_id: str,
) -> tuple[str, str]:
    """
    Purchase confirmation email.

    Args:
        tickets: List of dicts with 'name', 'quantity', 'price'

    Returns:
        Tuple of (subject, html_body)
    """
    subject = f"Your tickets for {event_name}"

    # Build ticket list
    ticket_rows = ""
    for ticket in tickets:
        ticket_rows += f"""
            <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #333;">
                    <span style="color: #fff; font-size: 14px;">{ticket['name']}</span>
                    <span style="color: #666; font-size: 12px;"> x{ticket['quantity']}</span>
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #333; text-align: right;">
                    <span style="color: #da7858; font-size: 14px; font-weight: bold;">{ticket['price']}</span>
                </td>
            </tr>
        """

    content = f"""
        <h1 style="color: #da7858; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 20px;">
            [ Confirmed ]
        </h1>
        <h2 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0 0 20px;">
            You're going to {event_name}!
        </h2>
        <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 0 0 30px;">
            Hi {username}, your purchase has been confirmed.
        </p>

        <!-- Event Details -->
        <table width="100%" style="background-color: #141414; border: 1px solid #333; margin-bottom: 20px;">
            <tr>
                <td style="padding: 20px;">
                    <p style="color: #666; font-size: 12px; text-transform: uppercase; margin: 0 0 8px;">Event</p>
                    <p style="color: #fff; font-size: 18px; font-weight: bold; margin: 0;">{event_name}</p>
                </td>
            </tr>
            <tr>
                <td style="padding: 0 20px 20px;">
                    <table width="100%">
                        <tr>
                            <td width="50%">
                                <p style="color: #666; font-size: 12px; text-transform: uppercase; margin: 0 0 8px;">Date</p>
                                <p style="color: #999; font-size: 14px; margin: 0;">{event_date}</p>
                            </td>
                            <td width="50%">
                                <p style="color: #666; font-size: 12px; text-transform: uppercase; margin: 0 0 8px;">Venue</p>
                                <p style="color: #999; font-size: 14px; margin: 0;">{venue_name}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Order Details -->
        <table width="100%" style="margin-bottom: 20px;">
            {ticket_rows}
            <tr>
                <td style="padding: 16px 0 0;">
                    <span style="color: #666; font-size: 12px; text-transform: uppercase;">Total</span>
                </td>
                <td style="padding: 16px 0 0; text-align: right;">
                    <span style="color: #fff; font-size: 24px; font-weight: bold;">{total_amount}</span>
                </td>
            </tr>
        </table>

        <p style="color: #666; font-size: 12px; margin: 20px 0;">
            Order ID: {order_id}
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
                <td align="center">
                    <a href="https://raveture.cz/my-tickets" style="display: inline-block; padding: 16px 40px; background-color: #da7858; color: #000; text-decoration: none; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                        View My Tickets
                    </a>
                </td>
            </tr>
        </table>
    """

    return subject, render_template(content)


def event_reminder(
    username: str,
    event_name: str,
    event_date: str,
    venue_name: str,
    venue_address: str,
    hours_until: int,
) -> tuple[str, str]:
    """
    Event reminder email.

    Returns:
        Tuple of (subject, html_body)
    """
    subject = f"Reminder: {event_name} is in {hours_until} hours"

    content = f"""
        <h1 style="color: #da7858; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 20px;">
            [ Reminder ]
        </h1>
        <h2 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0 0 20px;">
            See you at {event_name}!
        </h2>
        <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 0 0 30px;">
            Hi {username}, the event is starting in {hours_until} hours.
        </p>

        <table width="100%" style="background-color: #141414; border: 1px solid #333; margin-bottom: 20px;">
            <tr>
                <td style="padding: 20px;">
                    <p style="color: #666; font-size: 12px; text-transform: uppercase; margin: 0 0 8px;">When</p>
                    <p style="color: #fff; font-size: 18px; font-weight: bold; margin: 0;">{event_date}</p>
                </td>
            </tr>
            <tr>
                <td style="padding: 0 20px 20px;">
                    <p style="color: #666; font-size: 12px; text-transform: uppercase; margin: 0 0 8px;">Where</p>
                    <p style="color: #fff; font-size: 16px; margin: 0;">{venue_name}</p>
                    <p style="color: #999; font-size: 14px; margin: 4px 0 0;">{venue_address}</p>
                </td>
            </tr>
        </table>

        <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 20px 0;">
            Don't forget your tickets! Have a great time.
        </p>
    """

    return subject, render_template(content)
