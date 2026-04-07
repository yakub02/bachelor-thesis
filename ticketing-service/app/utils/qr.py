"""
QR Code utilities for RAVETURE Ticketing Service.

This module provides QR code generation functionality for tickets.
QR signing and verification is handled in security.py.
"""

import io
import base64
from typing import Optional

import qrcode
from qrcode.constants import ERROR_CORRECT_M
from PIL import Image


def generate_qr_image(
    data: str,
    size: int = 300,
    border: int = 2,
    fill_color: str = "black",
    back_color: str = "white"
) -> Image.Image:
    """
    Generate a QR code image from data.

    Args:
        data: The data to encode in the QR code
        size: Size of the QR code in pixels
        border: Border size in boxes
        fill_color: Color of the QR code modules
        back_color: Background color

    Returns:
        PIL Image object containing the QR code
    """
    qr = qrcode.QRCode(
        version=None,  # Auto-detect
        error_correction=ERROR_CORRECT_M,  # ~15% error correction
        box_size=10,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color=fill_color, back_color=back_color)

    # Resize to requested size
    img = img.resize((size, size), Image.Resampling.LANCZOS)

    return img


def generate_qr_base64(
    data: str,
    size: int = 300,
    format: str = "PNG"
) -> str:
    """
    Generate a QR code and return as base64-encoded string.

    Args:
        data: The data to encode in the QR code
        size: Size of the QR code in pixels
        format: Image format (PNG, JPEG)

    Returns:
        Base64-encoded image string with data URI prefix
    """
    img = generate_qr_image(data, size=size)

    buffer = io.BytesIO()
    img.save(buffer, format=format)
    buffer.seek(0)

    b64_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
    mime_type = f"image/{format.lower()}"

    return f"data:{mime_type};base64,{b64_data}"


def generate_ticket_qr(
    ticket_id: str,
    event_id: str,
    signature: str,
    timestamp: int,
    size: int = 300
) -> str:
    """
    Generate a QR code for a ticket with all required data.

    Args:
        ticket_id: UUID of the ticket
        event_id: UUID of the event
        signature: HMAC signature from security.generate_qr_payload()
        timestamp: Unix timestamp of the time window
        size: Size of the QR code in pixels

    Returns:
        Base64-encoded QR code image
    """
    # QR payload format: ticket_id:event_id:timestamp:signature
    qr_data = f"{ticket_id}:{event_id}:{timestamp}:{signature}"

    return generate_qr_base64(qr_data, size=size)
