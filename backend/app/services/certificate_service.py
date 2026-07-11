"""
app/services/certificate_service.py

Generates a beautiful PDF completion certificate for users who reach Level 10.
Uses reportlab with canvas-level drawing for full design control.
"""

import io
import logging
from datetime import datetime
from typing import Optional

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

logger = logging.getLogger(__name__)

# ── Colour palette ────────────────────────────────────────────────────────────
GOLD_DARK   = colors.HexColor("#B8860B")
GOLD_MID    = colors.HexColor("#DAA520")
GOLD_LIGHT  = colors.HexColor("#FFD700")
GOLD_PALE   = colors.HexColor("#FFF8DC")
NAVY        = colors.HexColor("#0A1628")
NAVY_MID    = colors.HexColor("#1A2E4A")
NAVY_LIGHT  = colors.HexColor("#2C4A6E")
WHITE       = colors.white
SILVER      = colors.HexColor("#C0C0C0")
CREAM       = colors.HexColor("#FFFEF7")

PAGE_W, PAGE_H = landscape(A4)   # 297 × 210 mm


# ── Public API ────────────────────────────────────────────────────────────────

def generate_completion_certificate(
    user_name: str,
    user_email: str,
    total_reviews: int,
    badges_count: int,
    total_xp: int,
    completion_date: Optional[datetime] = None,
) -> bytes:
    """
    Generate a PDF certificate for a user who completed all 10 levels.

    Returns the raw PDF bytes so callers can attach it to an email
    without touching the filesystem.
    """
    if completion_date is None:
        completion_date = datetime.utcnow()

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(A4))
    c.setTitle("Code Excellence Certificate — Level 10 Master")
    c.setAuthor("CodeReview Platform")

    _draw_certificate(c, user_name, user_email, total_reviews, badges_count, total_xp, completion_date)

    c.save()
    buffer.seek(0)
    return buffer.read()


# ── Internal drawing helpers ──────────────────────────────────────────────────

def _draw_certificate(
    c: canvas.Canvas,
    user_name: str,
    user_email: str,
    total_reviews: int,
    badges_count: int,
    total_xp: int,
    completion_date: datetime,
) -> None:

    # 1. Background gradient simulation (layered rectangles)
    _draw_background(c)

    # 2. Decorative border system
    _draw_borders(c)

    # 3. Corner ornaments
    _draw_corner_ornaments(c)

    # 4. Header section
    _draw_header(c)

    # 5. Main body — recipient name + body text
    _draw_body(c, user_name)

    # 6. Stats row
    _draw_stats(c, total_reviews, badges_count, total_xp)

    # 7. Footer — date, ID, signature line
    _draw_footer(c, user_email, completion_date)

    # 8. Decorative stars / sparkle elements
    _draw_decorative_stars(c)


def _draw_background(c: canvas.Canvas) -> None:
    """Deep navy gradient background using stacked rectangles."""
    # Base
    c.setFillColor(NAVY)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # Subtle radial glow in centre (light layers)
    for i, alpha in enumerate([0.03, 0.05, 0.07, 0.05, 0.03]):
        r = 180 - i * 28
        glow = colors.Color(0.85, 0.78, 0.3, alpha=alpha)
        c.setFillColor(glow)
        cx, cy = PAGE_W / 2, PAGE_H / 2
        c.ellipse(cx - r * 2, cy - r, cx + r * 2, cy + r, fill=1, stroke=0)

    # Inner cream panel
    margin = 18 * mm
    c.setFillColor(colors.Color(1, 0.996, 0.965, alpha=0.06))
    c.roundRect(margin, margin, PAGE_W - 2 * margin, PAGE_H - 2 * margin,
                radius=8 * mm, fill=1, stroke=0)


def _draw_borders(c: canvas.Canvas) -> None:
    """Triple-line gold border system."""
    # Outer thick line
    c.setStrokeColor(GOLD_MID)
    c.setLineWidth(3)
    m = 10 * mm
    c.roundRect(m, m, PAGE_W - 2 * m, PAGE_H - 2 * m, radius=6 * mm, fill=0, stroke=1)

    # Middle thin line
    c.setStrokeColor(GOLD_LIGHT)
    c.setLineWidth(0.75)
    m2 = 13 * mm
    c.roundRect(m2, m2, PAGE_W - 2 * m2, PAGE_H - 2 * m2, radius=5 * mm, fill=0, stroke=1)

    # Inner dotted accent line
    c.setStrokeColor(GOLD_DARK)
    c.setLineWidth(0.5)
    c.setDash([2, 4], 0)
    m3 = 16 * mm
    c.roundRect(m3, m3, PAGE_W - 2 * m3, PAGE_H - 2 * m3, radius=4 * mm, fill=0, stroke=1)
    c.setDash([], 0)  # reset dash


def _draw_corner_ornaments(c: canvas.Canvas) -> None:
    """Draw a diamond + cross ornament at each corner."""
    positions = [
        (22 * mm, 22 * mm),
        (PAGE_W - 22 * mm, 22 * mm),
        (22 * mm, PAGE_H - 22 * mm),
        (PAGE_W - 22 * mm, PAGE_H - 22 * mm),
    ]
    for (ox, oy) in positions:
        _draw_diamond_ornament(c, ox, oy, 6 * mm)


def _draw_diamond_ornament(c: canvas.Canvas, cx: float, cy: float, size: float) -> None:
    c.setFillColor(GOLD_MID)
    c.setStrokeColor(GOLD_LIGHT)
    c.setLineWidth(0.5)
    # Diamond
    p = c.beginPath()
    p.moveTo(cx, cy + size)
    p.lineTo(cx + size * 0.6, cy)
    p.lineTo(cx, cy - size)
    p.lineTo(cx - size * 0.6, cy)
    p.close()
    c.drawPath(p, fill=1, stroke=1)
    # Centre dot
    c.setFillColor(GOLD_LIGHT)
    c.circle(cx, cy, size * 0.2, fill=1, stroke=0)


def _draw_header(c: canvas.Canvas) -> None:
    """Platform name, trophy icon (text-based), and certificate title."""
    centre_x = PAGE_W / 2

    # Platform name
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(GOLD_MID)
    platform = "✦  CODE REVIEW PLATFORM  ✦"
    c.drawCentredString(centre_x, PAGE_H - 28 * mm, platform)

    # Decorative separator line
    line_half = 55 * mm
    c.setStrokeColor(GOLD_MID)
    c.setLineWidth(0.6)
    c.line(centre_x - line_half, PAGE_H - 30.5 * mm,
           centre_x + line_half, PAGE_H - 30.5 * mm)

    # Large trophy symbol
    c.setFont("Helvetica-Bold", 34)
    c.setFillColor(GOLD_LIGHT)
    c.drawCentredString(centre_x, PAGE_H - 50 * mm, "🏆")

    # Main title
    c.setFont("Helvetica-Bold", 26)
    c.setFillColor(GOLD_LIGHT)
    c.drawCentredString(centre_x, PAGE_H - 64 * mm, "CERTIFICATE OF EXCELLENCE")

    # Sub-title
    c.setFont("Helvetica", 11)
    c.setFillColor(GOLD_PALE)
    c.drawCentredString(centre_x, PAGE_H - 71 * mm, "Level 10 Grand Master — Complete Mastery Achieved")

    # Ornamental divider
    _draw_ornamental_divider(c, centre_x, PAGE_H - 75 * mm, 90 * mm)


def _draw_ornamental_divider(c: canvas.Canvas, cx: float, y: float, half_w: float) -> None:
    c.setStrokeColor(GOLD_MID)
    c.setLineWidth(0.8)
    c.line(cx - half_w, y, cx - 12 * mm, y)
    c.line(cx + 12 * mm, y, cx + half_w, y)
    c.setFillColor(GOLD_LIGHT)
    c.setFont("Helvetica", 10)
    c.drawCentredString(cx, y - 2 * mm, "✦")


def _draw_body(c: canvas.Canvas, user_name: str) -> None:
    """'This certifies that' block + recipient name + achievement text."""
    centre_x = PAGE_W / 2

    # "This is to certify that"
    c.setFont("Helvetica-Oblique", 11)
    c.setFillColor(colors.HexColor("#D4C5A0"))
    c.drawCentredString(centre_x, PAGE_H - 86 * mm, "This is to certify that")

    # Recipient name — hero element
    display_name = user_name.upper() if len(user_name) <= 30 else user_name
    font_size = 28 if len(display_name) <= 25 else 22 if len(display_name) <= 35 else 17
    c.setFont("Helvetica-Bold", font_size)
    c.setFillColor(WHITE)
    c.drawCentredString(centre_x, PAGE_H - 98 * mm, display_name)

    # Gold underline beneath name
    name_w = c.stringWidth(display_name, "Helvetica-Bold", font_size)
    ul_pad = 6 * mm
    c.setStrokeColor(GOLD_MID)
    c.setLineWidth(1.2)
    c.line(centre_x - name_w / 2 - ul_pad, PAGE_H - 100.5 * mm,
           centre_x + name_w / 2 + ul_pad, PAGE_H - 100.5 * mm)

    # Achievement description
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#CBBF9A"))
    line1 = "has successfully completed all 10 levels of the Code Review Mastery Program,"
    line2 = "demonstrating exceptional skill, dedication, and commitment to software excellence."
    c.drawCentredString(centre_x, PAGE_H - 110 * mm, line1)
    c.drawCentredString(centre_x, PAGE_H - 115 * mm, line2)

    # Motivational message panel
    _draw_motivational_panel(c, centre_x)


def _draw_motivational_panel(c: canvas.Canvas, centre_x: float) -> None:
    """Highlighted quote panel with a motivational message."""
    panel_w = 180 * mm
    panel_h = 14 * mm
    px = centre_x - panel_w / 2
    py = PAGE_H - 138 * mm

    # Panel background
    c.setFillColor(colors.Color(0.85, 0.7, 0.2, alpha=0.12))
    c.setStrokeColor(GOLD_DARK)
    c.setLineWidth(0.6)
    c.roundRect(px, py, panel_w, panel_h, radius=3 * mm, fill=1, stroke=1)

    # Quote text
    c.setFont("Helvetica-BoldOblique", 9.5)
    c.setFillColor(GOLD_LIGHT)
    quote = (
        '"Great code is not written by accident — it is crafted with patience, '
        'curiosity, and the relentless pursuit of mastery."'
    )
    c.drawCentredString(centre_x, py + 8.5 * mm, quote)
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(GOLD_MID)
    c.drawCentredString(centre_x, py + 3.5 * mm, "— CodeReview Platform")


def _draw_stats(c: canvas.Canvas, total_reviews: int, badges_count: int, total_xp: int) -> None:
    """Three stat boxes in a row: Reviews · Badges · XP."""
    centre_x = PAGE_W / 2
    box_w    = 46 * mm
    box_h    = 18 * mm
    gap      = 7 * mm
    total_row_w = 3 * box_w + 2 * gap
    start_x  = centre_x - total_row_w / 2
    box_y    = PAGE_H - 165 * mm

    stats = [
        ("📝", str(total_reviews), "Reviews Completed"),
        ("🏅", str(badges_count),  "Badges Earned"),
        ("⚡", f"{total_xp:,}",    "Total XP"),
    ]

    for i, (icon, value, label) in enumerate(stats):
        bx = start_x + i * (box_w + gap)

        # Box background
        c.setFillColor(colors.Color(0.85, 0.7, 0.2, alpha=0.10))
        c.setStrokeColor(GOLD_MID)
        c.setLineWidth(0.8)
        c.roundRect(bx, box_y, box_w, box_h, radius=3 * mm, fill=1, stroke=1)

        # Icon
        c.setFont("Helvetica", 12)
        c.setFillColor(GOLD_LIGHT)
        c.drawCentredString(bx + box_w / 2, box_y + 12.5 * mm, icon)

        # Value
        c.setFont("Helvetica-Bold", 13)
        c.setFillColor(WHITE)
        c.drawCentredString(bx + box_w / 2, box_y + 7 * mm, value)

        # Label
        c.setFont("Helvetica", 6.5)
        c.setFillColor(GOLD_MID)
        c.drawCentredString(bx + box_w / 2, box_y + 2.5 * mm, label)


def _draw_footer(c: canvas.Canvas, user_email: str, completion_date: datetime) -> None:
    """Date, certificate ID, and signature/seal area."""
    centre_x = PAGE_W / 2
    footer_y = 18 * mm

    # Thin separator
    c.setStrokeColor(GOLD_DARK)
    c.setLineWidth(0.5)
    c.line(22 * mm, footer_y + 9 * mm, PAGE_W - 22 * mm, footer_y + 9 * mm)

    # Certificate ID (left)
    cert_id = f"CERT-{completion_date.strftime('%Y%m%d')}-{abs(hash(user_email)) % 99999:05d}"
    c.setFont("Helvetica", 7)
    c.setFillColor(GOLD_DARK)
    c.drawString(25 * mm, footer_y + 4 * mm, f"Certificate ID: {cert_id}")
    c.drawString(25 * mm, footer_y + 0.5 * mm, f"Issued to: {user_email}")

    # Date (centre)
    date_str = completion_date.strftime("%B %d, %Y")
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(GOLD_MID)
    c.drawCentredString(centre_x, footer_y + 4 * mm, f"Issued on  {date_str}")

    # Seal (right) — text-based circular seal
    _draw_seal(c, PAGE_W - 35 * mm, footer_y + 5 * mm, 10 * mm)


def _draw_seal(c: canvas.Canvas, cx: float, cy: float, r: float) -> None:
    """Draw a circular 'VERIFIED' seal."""
    c.setStrokeColor(GOLD_MID)
    c.setLineWidth(1)
    c.circle(cx, cy, r, fill=0, stroke=1)
    c.setStrokeColor(GOLD_LIGHT)
    c.setLineWidth(0.4)
    c.circle(cx, cy, r * 0.82, fill=0, stroke=1)

    c.setFillColor(GOLD_LIGHT)
    c.setFont("Helvetica-Bold", 5.5)
    c.drawCentredString(cx, cy + 1.5 * mm, "VERIFIED")
    c.setFont("Helvetica", 4.5)
    c.drawCentredString(cx, cy - 2 * mm, "LEVEL 10")
    c.drawCentredString(cx, cy - 4.5 * mm, "MASTER")

    c.setFillColor(GOLD_MID)
    c.setFont("Helvetica", 7)
    c.drawCentredString(cx, cy + 5 * mm, "★")
    c.drawCentredString(cx, cy - 6.5 * mm, "★")


def _draw_decorative_stars(c: canvas.Canvas) -> None:
    """Small scattered star/sparkle elements for visual richness."""
    sparkle_positions = [
        (40 * mm, PAGE_H / 2 + 20 * mm, 4),
        (40 * mm, PAGE_H / 2 - 20 * mm, 3),
        (PAGE_W - 40 * mm, PAGE_H / 2 + 20 * mm, 4),
        (PAGE_W - 40 * mm, PAGE_H / 2 - 20 * mm, 3),
        (PAGE_W / 2 - 100 * mm, PAGE_H - 80 * mm, 3),
        (PAGE_W / 2 + 100 * mm, PAGE_H - 80 * mm, 3),
    ]
    c.setFillColor(GOLD_LIGHT)
    for (sx, sy, sz) in sparkle_positions:
        c.setFont("Helvetica", sz * 2)
        c.drawCentredString(sx, sy, "✦")