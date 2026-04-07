"""
PDF Ticket Generation Service - RAVETURE Design.

Generates brutalist-style concert tickets with QR codes.
Uses reportlab canvas API for pixel-perfect control.
"""

import io
import qrcode
from datetime import datetime
from typing import Optional

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A5, landscape
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader


# RAVETURE Design Tokens
COLOR_BACKGROUND = colors.HexColor('#0b0b0b')
COLOR_ACCENT = colors.HexColor('#da7858')
COLOR_TEXT_PRIMARY = colors.HexColor('#ffffff')
COLOR_TEXT_SECONDARY = colors.HexColor('#6b7280')
COLOR_BORDER = colors.HexColor('#252525')

# A5 landscape dimensions: 210mm x 148mm
PAGE_WIDTH = 210 * mm
PAGE_HEIGHT = 148 * mm

# Layout constants
LEFT_SECTION_WIDTH = PAGE_WIDTH * 0.60
RIGHT_SECTION_WIDTH = PAGE_WIDTH * 0.40
SEPARATOR_X = LEFT_SECTION_WIDTH

MARGIN = 8 * mm
ORANGE_BAR_HEIGHT = 8
QR_SIZE = 70 * mm
CIRCLE_RADIUS = 8 * mm


def generate_qr_code_image(data: str, size: int = 150) -> io.BytesIO:
    """
    Generate a QR code as an image buffer.

    Args:
        data: Data to encode in QR code
        size: Size of the QR code in pixels

    Returns:
        BytesIO buffer containing PNG image
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)

    # Black modules on white background for scanning
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)

    return buffer


def draw_half_circle(c: canvas.Canvas, x: float, y: float, radius: float,
                     side: str = 'left', fill_color=None):
    """
    Draw a half circle for the perforated tear line effect.

    Args:
        c: Canvas object
        x: X coordinate of the center
        y: Y coordinate of the center
        radius: Radius of the circle
        side: 'left' or 'right' - which half to draw
        fill_color: Fill color for the half circle
    """
    if fill_color:
        c.setFillColor(fill_color)

    p = c.beginPath()
    if side == 'left':
        # Left half circle (270° to 90°)
        p.moveTo(x, y)
        p.arc(x - radius, y - radius, x + radius, y + radius,
              startAng=270, extent=180)
    else:
        # Right half circle (90° to 270°)
        p.moveTo(x, y)
        p.arc(x - radius, y - radius, x + radius, y + radius,
              startAng=90, extent=180)

    p.close()
    c.drawPath(p, fill=1, stroke=0)


def draw_dashed_line(c: canvas.Canvas, x1: float, y1: float,
                     x2: float, y2: float, dash_length: float = 3,
                     gap_length: float = 3):
    """
    Draw a dashed line.

    Args:
        c: Canvas object
        x1, y1: Start coordinates
        x2, y2: End coordinates
        dash_length: Length of each dash
        gap_length: Length of gap between dashes
    """
    c.setDash([dash_length, gap_length])
    c.line(x1, y1, x2, y2)
    c.setDash([])  # Reset to solid line


def draw_text_with_tracking(c: canvas.Canvas, text: str, x: float, y: float,
                           tracking: float = 0):
    """
    Draw text with letter spacing (tracking).

    Args:
        c: Canvas object
        text: Text to draw
        x: X coordinate
        y: Y coordinate
        tracking: Additional space between characters in points
    """
    if tracking == 0:
        c.drawString(x, y, text)
    else:
        # Draw each character with spacing
        current_x = x
        for char in text:
            c.drawString(current_x, y, char)
            char_width = c.stringWidth(char, c._fontname, c._fontsize)
            current_x += char_width + tracking


def wrap_text(text: str, max_width: float, font_name: str,
             font_size: float, canvas_obj: canvas.Canvas) -> list:
    """
    Wrap text to fit within a maximum width.

    Args:
        text: Text to wrap
        max_width: Maximum width in points
        font_name: Font name
        font_size: Font size
        canvas_obj: Canvas object for measuring text

    Returns:
        List of text lines
    """
    words = text.split()
    lines = []
    current_line = []

    for word in words:
        test_line = ' '.join(current_line + [word])
        width = canvas_obj.stringWidth(test_line, font_name, font_size)

        if width <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
                current_line = [word]
            else:
                # Single word is too long, add it anyway
                lines.append(word)

    if current_line:
        lines.append(' '.join(current_line))

    return lines


def generate_ticket_pdf(
    ticket_id: str,
    ticket_type_name: str,
    order_reference: str,
    event_name: str,
    event_date: datetime,
    event_venue: str,
    qr_data: str,
    holder_name: Optional[str] = None,
    event_description: Optional[str] = None,
    organizer_name: Optional[str] = None,
    additional_info: Optional[str] = None
) -> io.BytesIO:
    """
    Generate a PDF ticket in RAVETURE brutalist design style.

    Args:
        ticket_id: Unique ticket identifier
        ticket_type_name: Type of ticket (e.g., "VIP", "Regular")
        order_reference: Human-readable order reference
        event_name: Name of the event
        event_date: Date and time of the event
        event_venue: Venue name/location
        qr_data: Data to encode in QR code
        holder_name: Optional ticket holder name
        event_description: Optional event description
        organizer_name: Optional organizer name
        additional_info: Optional additional information

    Returns:
        BytesIO buffer containing PDF
    """
    buffer = io.BytesIO()

    # Create canvas with A5 landscape page
    c = canvas.Canvas(buffer, pagesize=landscape(A5))
    c.setTitle(f"Ticket-{order_reference}")

    # --- LEFT SECTION: Black background with event details ---

    # Fill entire left section with black background
    c.setFillColor(COLOR_BACKGROUND)
    c.rect(0, 0, LEFT_SECTION_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    # Orange accent bar at the top
    c.setFillColor(COLOR_ACCENT)
    c.rect(0, PAGE_HEIGHT - ORANGE_BAR_HEIGHT, LEFT_SECTION_WIDTH,
           ORANGE_BAR_HEIGHT, fill=1, stroke=0)

    # RAVETURE logo text (top-left)
    c.setFillColor(COLOR_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 10)
    logo_y = PAGE_HEIGHT - MARGIN - 12
    draw_text_with_tracking(c, "RAVETURE", MARGIN, logo_y, tracking=2)

    # Event name (large, bold, uppercase)
    event_y_start = PAGE_HEIGHT - MARGIN - 35
    c.setFont("Helvetica-Bold", 20)
    c.setFillColor(COLOR_TEXT_PRIMARY)

    # Wrap event name to max 2 lines
    max_event_width = LEFT_SECTION_WIDTH - (2 * MARGIN)
    event_lines = wrap_text(event_name.upper(), max_event_width,
                           "Helvetica-Bold", 20, c)
    event_lines = event_lines[:2]  # Max 2 lines

    current_y = event_y_start
    for line in event_lines:
        c.drawString(MARGIN, current_y, line)
        current_y -= 24

    # Ticket type (orange, uppercase, monospace-style)
    current_y -= 8
    c.setFont("Courier-Bold", 11)
    c.setFillColor(COLOR_ACCENT)
    c.drawString(MARGIN, current_y, ticket_type_name.upper())

    # Divider: thin orange dashed line
    current_y -= 12
    c.setStrokeColor(COLOR_ACCENT)
    c.setLineWidth(0.5)
    draw_dashed_line(c, MARGIN, current_y, LEFT_SECTION_WIDTH - MARGIN,
                    current_y, dash_length=4, gap_length=4)

    # Details grid (grey label / white value pairs)
    current_y -= 18
    label_x = MARGIN
    value_x = MARGIN + 40 * mm
    line_spacing = 16

    c.setFont("Helvetica-Bold", 9)

    # DATE
    c.setFillColor(COLOR_TEXT_SECONDARY)
    c.drawString(label_x, current_y, "DATE:")
    c.setFillColor(COLOR_TEXT_PRIMARY)
    c.setFont("Helvetica", 9)
    c.drawString(value_x, current_y, event_date.strftime('%A, %B %d, %Y'))
    current_y -= line_spacing

    # TIME
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(COLOR_TEXT_SECONDARY)
    c.drawString(label_x, current_y, "TIME:")
    c.setFillColor(COLOR_TEXT_PRIMARY)
    c.setFont("Helvetica", 9)
    c.drawString(value_x, current_y, event_date.strftime('%H:%M'))
    current_y -= line_spacing

    # VENUE
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(COLOR_TEXT_SECONDARY)
    c.drawString(label_x, current_y, "VENUE:")
    c.setFillColor(COLOR_TEXT_PRIMARY)
    c.setFont("Helvetica", 9)
    # Wrap venue name if too long
    max_venue_width = LEFT_SECTION_WIDTH - value_x - MARGIN
    venue_lines = wrap_text(event_venue, max_venue_width, "Helvetica", 9, c)
    for venue_line in venue_lines[:2]:  # Max 2 lines
        c.drawString(value_x, current_y, venue_line)
        current_y -= line_spacing
    if len(venue_lines) == 1:
        current_y -= line_spacing

    # ORDER
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(COLOR_TEXT_SECONDARY)
    c.drawString(label_x, current_y, "ORDER:")
    c.setFillColor(COLOR_TEXT_PRIMARY)
    c.setFont("Courier", 9)
    c.drawString(value_x, current_y, order_reference)

    # Diamond decorative element
    diamond_y = MARGIN + 20
    c.setFont("Helvetica", 8)
    c.setFillColor(COLOR_ACCENT)
    c.drawString(MARGIN, diamond_y, "◆")

    # Ticket ID at bottom (small, monospace, grey)
    ticket_id_y = MARGIN + 8
    c.setFont("Courier", 7)
    c.setFillColor(COLOR_TEXT_SECONDARY)
    c.drawString(MARGIN + 12, ticket_id_y, f"ID: {ticket_id}")

    # --- RIGHT SECTION: White background with QR code ---

    # Fill right section with white background
    c.setFillColor(colors.white)
    c.rect(SEPARATOR_X, 0, RIGHT_SECTION_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    # Generate and place QR code (centered)
    qr_buffer = generate_qr_code_image(qr_data, 300)
    qr_x = SEPARATOR_X + (RIGHT_SECTION_WIDTH - QR_SIZE) / 2
    qr_y = PAGE_HEIGHT / 2 - QR_SIZE / 2 + 10 * mm
    c.drawImage(ImageReader(qr_buffer), qr_x, qr_y, width=QR_SIZE, height=QR_SIZE)

    # "SCAN AT ENTRANCE" text below QR
    scan_y = qr_y - 12
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(COLOR_TEXT_SECONDARY)
    scan_text = "SCAN AT ENTRANCE"
    scan_text_width = c.stringWidth(scan_text, "Helvetica-Bold", 8)
    scan_x = SEPARATOR_X + (RIGHT_SECTION_WIDTH - scan_text_width) / 2
    c.drawString(scan_x, scan_y, scan_text)

    # Short ticket code (last 12 chars, monospace)
    code_y = scan_y - 14
    c.setFont("Courier-Bold", 9)
    c.setFillColor(colors.black)
    short_code = ticket_id[-12:].upper()
    code_width = c.stringWidth(short_code, "Courier-Bold", 9)
    code_x = SEPARATOR_X + (RIGHT_SECTION_WIDTH - code_width) / 2
    c.drawString(code_x, code_y, short_code)

    # "VALID FOR ONE ENTRY" at bottom
    valid_y = MARGIN + 8
    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(COLOR_TEXT_SECONDARY)
    valid_text = "VALID FOR ONE ENTRY"
    valid_text_width = c.stringWidth(valid_text, "Helvetica-Bold", 7)
    valid_x = SEPARATOR_X + (RIGHT_SECTION_WIDTH - valid_text_width) / 2
    c.drawString(valid_x, valid_y, valid_text)

    # --- SEPARATOR LINE: Perforated dashed line with half circles ---

    # Draw dashed line
    c.setStrokeColor(COLOR_TEXT_SECONDARY)
    c.setLineWidth(1)
    c.setLineCap(1)  # Round caps

    # Top half circle (cut from white side)
    top_circle_y = PAGE_HEIGHT - CIRCLE_RADIUS
    draw_half_circle(c, SEPARATOR_X, top_circle_y, CIRCLE_RADIUS,
                    side='left', fill_color=colors.white)

    # Bottom half circle (cut from white side)
    bottom_circle_y = CIRCLE_RADIUS
    draw_half_circle(c, SEPARATOR_X, bottom_circle_y, CIRCLE_RADIUS,
                    side='left', fill_color=colors.white)

    # Draw dashed line segments (avoiding the circles)
    dash_start_y = PAGE_HEIGHT - (2 * CIRCLE_RADIUS)
    dash_end_y = 2 * CIRCLE_RADIUS

    c.setStrokeColor(COLOR_TEXT_SECONDARY)
    c.setLineWidth(0.8)
    draw_dashed_line(c, SEPARATOR_X, dash_start_y, SEPARATOR_X,
                    dash_end_y, dash_length=5, gap_length=5)

    # Redraw half circles with border for clean look
    c.setStrokeColor(COLOR_TEXT_SECONDARY)
    c.setLineWidth(0.8)
    c.setFillColor(colors.white)

    # Top circle
    c.circle(SEPARATOR_X, top_circle_y, CIRCLE_RADIUS, fill=0, stroke=1)

    # Bottom circle
    c.circle(SEPARATOR_X, bottom_circle_y, CIRCLE_RADIUS, fill=0, stroke=1)

    # Save the PDF
    c.showPage()
    c.save()

    buffer.seek(0)
    return buffer
