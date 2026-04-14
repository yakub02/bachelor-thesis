"""
Email notification service for RAVETURE Ticketing.

Sends order confirmation emails with PDF ticket attachments.
Uses Flask-Mail with Gmail SMTP (configurable via env vars).

Failures are logged but never propagate — the order confirmation
flow must not depend on email delivery.
"""

import io
from flask import current_app
from flask_mail import Message

from app import mail
from app.services.pdf_service import generate_ticket_pdf


def send_order_confirmation(order, tickets: list, recipient_email: str) -> bool:
    """
    Send order confirmation email with one PDF per ticket attached.

    Args:
        order:           Confirmed Order model instance
        tickets:         List of Ticket model instances from the order
        recipient_email: User's email address

    Returns:
        True if sent successfully, False otherwise
    """
    if not recipient_email:
        current_app.logger.warning(
            f"[email] No recipient email for order {order.reference} — skipping"
        )
        return False

    if not current_app.config.get('MAIL_USERNAME'):
        current_app.logger.warning(
            "[email] MAIL_USERNAME not configured — skipping confirmation email"
        )
        return False

    try:
        subject = _build_subject(order)
        html_body = _build_html_body(order, tickets)

        msg = Message(
            subject=subject,
            recipients=[recipient_email],
            html=html_body,
        )

        # Attach one PDF per ticket
        for i, ticket in enumerate(tickets, start=1):
            pdf_buffer = _generate_pdf_for_ticket(ticket, order)
            if pdf_buffer:
                msg.attach(
                    filename=f"vstupenka_{i}.pdf",
                    content_type="application/pdf",
                    data=pdf_buffer.read(),
                )

        mail.send(msg)
        current_app.logger.info(
            f"[email] Confirmation sent for order {order.reference} to {recipient_email}"
        )
        return True

    except Exception as e:
        current_app.logger.error(
            f"[email] Failed to send confirmation for order {order.reference}: {e}",
            exc_info=True,
        )
        return False


# =============================================================================
# INTERNAL HELPERS
# =============================================================================

def _build_subject(order) -> str:
    event_part = order.event_name or "Vaše objednávka"
    return f"Potvrzení objednávky {order.reference} — {event_part}"


def _generate_pdf_for_ticket(ticket, order) -> io.BytesIO | None:
    """Generate PDF for a single ticket. Returns None on failure."""
    try:
        ticket_type = ticket.ticket_type
        event_name = order.event_name or f"Event {str(ticket_type.event_id)[:8]}"
        event_date = order.event_date
        event_venue = order.event_venue or "Venue TBD"

        from datetime import datetime
        if event_date is None:
            event_date = datetime.utcnow()

        qr_data = f"RAVETURE:{ticket.id}:{ticket_type.event_id}"

        return generate_ticket_pdf(
            ticket_id=str(ticket.id),
            ticket_type_name=ticket_type.name if ticket_type else "Ticket",
            order_reference=order.reference,
            event_name=event_name,
            event_date=event_date,
            event_venue=event_venue,
            qr_data=qr_data,
        )
    except Exception as e:
        current_app.logger.error(
            f"[email] PDF generation failed for ticket {ticket.id}: {e}",
            exc_info=True,
        )
        return None


def _build_html_body(order, tickets: list) -> str:
    from datetime import timezone

    # Format event date
    event_date_str = "—"
    if order.event_date:
        dt = order.event_date
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        event_date_str = dt.strftime("%-d. %-m. %Y, %H:%M")

    total_formatted = f"{order.total_cents / 100:.0f} {order.currency}"
    ticket_count = len(tickets)

    return f"""<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Potvrzení objednávky</title>
</head>
<body style="margin:0;padding:0;background:#0b0b0b;font-family:Helvetica,Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0b;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#da7858;padding:4px 0;"></td>
          </tr>
          <tr>
            <td style="background:#111111;padding:32px 40px 24px;">
              <p style="margin:0 0 8px;font-size:10px;letter-spacing:3px;color:#da7858;text-transform:uppercase;">RAVETURE</p>
              <h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-1px;color:#ffffff;">
                Objednávka potvrzena
              </h1>
            </td>
          </tr>

          <!-- Order info -->
          <tr>
            <td style="background:#111111;padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #252525;padding-top:24px;">
                <tr>
                  <td style="padding:6px 0;">
                    <span style="font-size:10px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;">Reference</span><br>
                    <span style="font-family:Courier,monospace;font-size:14px;color:#da7858;font-weight:bold;">{order.reference}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;">
                    <span style="font-size:10px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;">Event</span><br>
                    <span style="font-size:16px;font-weight:900;color:#ffffff;text-transform:uppercase;">{order.event_name or '—'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;">
                    <span style="font-size:10px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;">Datum</span><br>
                    <span style="font-size:14px;color:#ffffff;">{event_date_str}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;">
                    <span style="font-size:10px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;">Venue</span><br>
                    <span style="font-size:14px;color:#ffffff;">{order.event_venue or '—'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;">
                    <span style="font-size:10px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;">Vstupenky</span><br>
                    <span style="font-size:14px;color:#ffffff;">{ticket_count}×</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0 0;">
                    <span style="font-size:10px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;">Celková cena</span><br>
                    <span style="font-size:18px;font-weight:900;color:#da7858;">{total_formatted}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PDF notice -->
          <tr>
            <td style="background:#0b0b0b;border:1px solid #252525;padding:20px 40px;margin:0 0 0;">
              <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
                Vstupenky jsou přiloženy jako PDF soubory k tomuto emailu.
                Při vstupu na akci použij QR kód v aplikaci — PDF slouží jako záloha.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="background:#111111;padding:24px 40px 32px;">
              <a href="https://raveture.cz/my-tickets"
                 style="display:inline-block;background:#da7858;color:#000000;font-weight:900;font-size:11px;
                        letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:12px 28px;">
                MÉ VSTUPENKY
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #252525;">
              <p style="margin:0;font-size:10px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">
                RAVETURE · noreply@raveture.cz
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
