"""
File upload utilities for RAVETURE Backend.
Handles image upload, validation, and storage.
"""

import os
import uuid
import hashlib
from datetime import datetime
from typing import Tuple, Optional
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
from PIL import Image
from flask import current_app


# Allowed image extensions
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}

# Maximum file size (10 MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

# Image dimensions constraints
MAX_IMAGE_WIDTH = 4096
MAX_IMAGE_HEIGHT = 4096


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_file_extension(filename: str) -> str:
    """Extract file extension from filename."""
    return filename.rsplit('.', 1)[1].lower() if '.' in filename else ''


def generate_unique_filename(original_filename: str) -> str:
    """
    Generate a unique filename using UUID and timestamp.
    Preserves the original extension.
    """
    ext = get_file_extension(original_filename)
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    unique_id = uuid.uuid4().hex[:8]
    return f"{timestamp}_{unique_id}.{ext}"


def validate_image(file: FileStorage) -> Tuple[bool, Optional[str]]:
    """
    Validate uploaded image file.

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check if file exists
    if not file or not file.filename:
        return False, "No file provided"

    # Check filename
    if not allowed_file(file.filename):
        return False, f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

    # Check file size
    file.seek(0, 2)  # Seek to end
    size = file.tell()
    file.seek(0)  # Reset to beginning

    if size > MAX_FILE_SIZE:
        return False, f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)} MB"

    if size == 0:
        return False, "File is empty"

    # Validate it's actually an image using PIL
    try:
        img = Image.open(file)
        img.verify()  # Verify it's a valid image
        file.seek(0)  # Reset after verify

        # Check dimensions
        img = Image.open(file)
        width, height = img.size
        file.seek(0)

        if width > MAX_IMAGE_WIDTH or height > MAX_IMAGE_HEIGHT:
            return False, f"Image too large. Maximum: {MAX_IMAGE_WIDTH}x{MAX_IMAGE_HEIGHT}"

    except Exception as e:
        return False, f"Invalid image file: {str(e)}"

    return True, None


def get_upload_folder() -> str:
    """Get the upload folder path, creating it if needed."""
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')

    # Make absolute if relative
    if not os.path.isabs(upload_folder):
        upload_folder = os.path.join(current_app.root_path, '..', upload_folder)

    # Ensure folder exists
    os.makedirs(upload_folder, exist_ok=True)

    return upload_folder


def save_image(file: FileStorage, subfolder: str = 'images') -> Tuple[str, str]:
    """
    Save uploaded image to local storage.

    Args:
        file: The uploaded file
        subfolder: Subfolder within uploads directory

    Returns:
        Tuple of (filename, relative_path)
    """
    # Generate unique filename
    filename = generate_unique_filename(file.filename)

    # Get upload folder
    upload_folder = get_upload_folder()
    target_folder = os.path.join(upload_folder, subfolder)
    os.makedirs(target_folder, exist_ok=True)

    # Save file
    filepath = os.path.join(target_folder, filename)
    file.save(filepath)

    # Return relative path for URL
    relative_path = f"{subfolder}/{filename}"

    return filename, relative_path


def delete_image(relative_path: str) -> bool:
    """
    Delete an image from storage.

    Args:
        relative_path: Path relative to upload folder

    Returns:
        True if deleted, False otherwise
    """
    try:
        upload_folder = get_upload_folder()
        filepath = os.path.join(upload_folder, relative_path)

        if os.path.exists(filepath):
            os.remove(filepath)
            return True
        return False
    except Exception:
        return False


def get_file_hash(file: FileStorage) -> str:
    """
    Generate SHA256 hash of file content.
    Useful for duplicate detection.
    """
    file.seek(0)
    file_hash = hashlib.sha256(file.read()).hexdigest()
    file.seek(0)
    return file_hash


def optimize_image(file: FileStorage, max_width: int = 1920, quality: int = 85) -> FileStorage:
    """
    Optimize image by resizing and compressing.

    Args:
        file: Original image file
        max_width: Maximum width (height scales proportionally)
        quality: JPEG quality (1-100)

    Returns:
        Optimized image as FileStorage
    """
    from io import BytesIO

    img = Image.open(file)

    # Convert RGBA to RGB for JPEG
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')

    # Resize if needed
    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

    # Save to bytes
    output = BytesIO()
    img.save(output, format='JPEG', quality=quality, optimize=True)
    output.seek(0)

    # Create new FileStorage
    from werkzeug.datastructures import FileStorage as FS
    return FS(output, filename=file.filename.rsplit('.', 1)[0] + '.jpg')
