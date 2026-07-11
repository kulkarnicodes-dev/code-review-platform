"""
Fully standalone certificate test - zero app imports needed.
Copy certificate_service.py content directly here for testing.
"""
import io
import asyncio
import smtplib
import logging
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Optional
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas

logging.basicConfig(level=logging.INFO)

# ── CONFIG ─────────────────────────────────────────────────────
TEST_EMAIL      = "yashkulkarni051@gmail.com"   # <- your real email
SMTP_HOST       = "smtp.gmail.com"
SMTP_PORT       = 587
SMTP_USERNAME   = "yashkulkarni051@gmail.com"   # <- gmail login
SMTP_PASSWORD   = "iqoo ydup omih ijzq"    # <- 16-char App Password
SMTP_FROM_EMAIL = "yashkulkarni052@gmail.com"
# ───────────────────────────────────────────────────────────────

GOLD_DARK  = colors.HexColor("#B8860B")
GOLD_MID   = colors.HexColor("#DAA520")
GOLD_LIGHT = colors.HexColor("#FFD700")
GOLD_PALE  = colors.HexColor("#FFF8DC")
NAVY       = colors.HexColor("#0A1628")
WHITE      = colors.white
PAGE_W, PAGE_H = landscape(A4)

def generate_certificate(user_name, user_email, total_reviews, badges_count, total_xp, completion_date=None):
    if not completion_date:
        completion_date = datetime.utcnow()
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))
    c.setTitle("Code Excellence Certificate")

    # Background
    c.setFillColor(NAVY)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    for i, alpha in enumerate([0.03, 0.05, 0.07, 0.05, 0.03]):
        r = 180 - i * 28
        c.setFillColor(colors.Color(0.85, 0.78, 0.3, alpha=alpha))
        c.ellipse(PAGE_W/2 - r*2, PAGE_H/2 - r, PAGE_W/2 + r*2, PAGE_H/2 + r, fill=1, stroke=0)

    # Triple border
    for lw, col, m in [(3, GOLD_MID, 10), (0.75, GOLD_LIGHT, 13), (0.5, GOLD_DARK, 16)]:
        c.setStrokeColor(col); c.setLineWidth(lw)
        if lw == 0.5: c.setDash([2,4], 0)
        c.roundRect(m*mm, m*mm, PAGE_W-2*m*mm, PAGE_H-2*m*mm, radius=6*mm, fill=0, stroke=1)
        c.setDash([], 0)

    # Corner diamonds
    for ox, oy in [(22*mm,22*mm),(PAGE_W-22*mm,22*mm),(22*mm,PAGE_H-22*mm),(PAGE_W-22*mm,PAGE_H-22*mm)]:
        sz = 6*mm
        c.setFillColor(GOLD_MID); c.setStrokeColor(GOLD_LIGHT); c.setLineWidth(0.5)
        p = c.beginPath()
        p.moveTo(ox, oy+sz); p.lineTo(ox+sz*0.6, oy); p.lineTo(ox, oy-sz); p.lineTo(ox-sz*0.6, oy); p.close()
        c.drawPath(p, fill=1, stroke=1)
        c.setFillColor(GOLD_LIGHT); c.circle(ox, oy, sz*0.2, fill=1, stroke=0)

    cx = PAGE_W / 2

    # Header
    c.setFont("Helvetica-Bold", 9); c.setFillColor(GOLD_MID)
    c.drawCentredString(cx, PAGE_H-28*mm, "CODE REVIEW PLATFORM")
    c.setStrokeColor(GOLD_MID); c.setLineWidth(0.6)
    c.line(cx-55*mm, PAGE_H-30.5*mm, cx+55*mm, PAGE_H-30.5*mm)
    c.setFont("Helvetica-Bold", 26); c.setFillColor(GOLD_LIGHT)
    c.drawCentredString(cx, PAGE_H-55*mm, "CERTIFICATE OF EXCELLENCE")
    c.setFont("Helvetica", 11); c.setFillColor(GOLD_PALE)
    c.drawCentredString(cx, PAGE_H-63*mm, "Level 10 Grand Master — Complete Mastery Achieved")
    c.setStrokeColor(GOLD_MID); c.setLineWidth(0.8)
    c.line(cx-90*mm, PAGE_H-68*mm, cx-12*mm, PAGE_H-68*mm)
    c.line(cx+12*mm, PAGE_H-68*mm, cx+90*mm, PAGE_H-68*mm)

    # Body
    c.setFont("Helvetica-Oblique", 11); c.setFillColor(colors.HexColor("#D4C5A0"))
    c.drawCentredString(cx, PAGE_H-78*mm, "This is to certify that")
    display_name = user_name.upper() if len(user_name) <= 30 else user_name
    fs = 28 if len(display_name) <= 25 else 22 if len(display_name) <= 35 else 17
    c.setFont("Helvetica-Bold", fs); c.setFillColor(WHITE)
    c.drawCentredString(cx, PAGE_H-90*mm, display_name)
    nw = c.stringWidth(display_name, "Helvetica-Bold", fs)
    c.setStrokeColor(GOLD_MID); c.setLineWidth(1.2)
    c.line(cx-nw/2-6*mm, PAGE_H-92.5*mm, cx+nw/2+6*mm, PAGE_H-92.5*mm)
    c.setFont("Helvetica", 10); c.setFillColor(colors.HexColor("#CBBF9A"))
    c.drawCentredString(cx, PAGE_H-102*mm, "has successfully completed all 10 levels of the Code Review Mastery Program,")
    c.drawCentredString(cx, PAGE_H-107*mm, "demonstrating exceptional skill, dedication, and commitment to software excellence.")

    # Quote panel
    pw, ph = 180*mm, 14*mm
    py = PAGE_H-126*mm
    c.setFillColor(colors.Color(0.85,0.7,0.2,alpha=0.12)); c.setStrokeColor(GOLD_DARK); c.setLineWidth(0.6)
    c.roundRect(cx-pw/2, py, pw, ph, radius=3*mm, fill=1, stroke=1)
    c.setFont("Helvetica-BoldOblique", 9); c.setFillColor(GOLD_LIGHT)
    c.drawCentredString(cx, py+8.5*mm, '"Great code is not written by accident — crafted with patience, curiosity, and mastery."')
    c.setFont("Helvetica-Oblique", 8); c.setFillColor(GOLD_MID)
    c.drawCentredString(cx, py+3.5*mm, "— CodeReview Platform")

    # Stats
    bw, bh, gap = 46*mm, 18*mm, 7*mm
    sx = cx - (3*bw+2*gap)/2
    by = PAGE_H-157*mm
    for i, (ico, val, lbl) in enumerate([("Reviews", str(total_reviews), "Completed"),
                                          ("Badges",  str(badges_count),  "Earned"),
                                          ("XP",      f"{total_xp:,}",    "Total XP")]):
        bx = sx + i*(bw+gap)
        c.setFillColor(colors.Color(0.85,0.7,0.2,alpha=0.10)); c.setStrokeColor(GOLD_MID); c.setLineWidth(0.8)
        c.roundRect(bx, by, bw, bh, radius=3*mm, fill=1, stroke=1)
        c.setFont("Helvetica-Bold", 7); c.setFillColor(GOLD_LIGHT)
        c.drawCentredString(bx+bw/2, by+12.5*mm, ico)
        c.setFont("Helvetica-Bold", 13); c.setFillColor(WHITE)
        c.drawCentredString(bx+bw/2, by+7*mm, val)
        c.setFont("Helvetica", 6.5); c.setFillColor(GOLD_MID)
        c.drawCentredString(bx+bw/2, by+2.5*mm, lbl)

    # Footer
    fy = 18*mm
    c.setStrokeColor(GOLD_DARK); c.setLineWidth(0.5)
    c.line(22*mm, fy+9*mm, PAGE_W-22*mm, fy+9*mm)
    cert_id = f"CERT-{completion_date.strftime('%Y%m%d')}-{abs(hash(user_email))%99999:05d}"
    c.setFont("Helvetica", 7); c.setFillColor(GOLD_DARK)
    c.drawString(25*mm, fy+4*mm, f"Certificate ID: {cert_id}")
    c.drawString(25*mm, fy+0.5*mm, f"Issued to: {user_email}")
    c.setFont("Helvetica-Bold", 8); c.setFillColor(GOLD_MID)
    c.drawCentredString(cx, fy+4*mm, f"Issued on  {completion_date.strftime('%B %d, %Y')}")
    # Seal
    sr, scx, scy = 10*mm, PAGE_W-35*mm, fy+5*mm
    c.setStrokeColor(GOLD_MID); c.setLineWidth(1); c.circle(scx, scy, sr, fill=0, stroke=1)
    c.setStrokeColor(GOLD_LIGHT); c.setLineWidth(0.4); c.circle(scx, scy, sr*0.82, fill=0, stroke=1)
    c.setFillColor(GOLD_LIGHT)
    c.setFont("Helvetica-Bold", 5.5); c.drawCentredString(scx, scy+1.5*mm, "VERIFIED")
    c.setFont("Helvetica", 4.5)
    c.drawCentredString(scx, scy-2*mm, "LEVEL 10")
    c.drawCentredString(scx, scy-4.5*mm, "MASTER")
    c.setFillColor(GOLD_MID); c.setFont("Helvetica", 7)
    c.drawCentredString(scx, scy+5*mm, "★"); c.drawCentredString(scx, scy-6.5*mm, "★")

    c.save(); buf.seek(0)
    return buf.read()


async def send_certificate_email(to_email, name, level_name, pdf_bytes):
    filename = f"CodeExcellence_Certificate_{name.replace(' ','_')}.pdf"
    subject  = "Your Code Excellence Certificate — Level 10 Grand Master!"

    html = f"""
    <html><body style="font-family:Arial,sans-serif;background:#0a1628;padding:20px;">
    <div style="max-width:580px;margin:auto;">
      <div style="background:linear-gradient(135deg,#0a1628,#1a2e4a);border:2px solid #daa520;
                  border-radius:14px;padding:44px 36px;text-align:center;">
        <div style="font-size:18px;letter-spacing:8px;color:#daa520;margin-bottom:16px;">✦ ✦ ✦ ✦ ✦</div>
        <div style="font-size:64px;margin-bottom:12px;">🏆</div>
        <h1 style="color:#ffd700;font-size:26px;margin:0 0 6px;letter-spacing:2px;">
          CERTIFICATE OF EXCELLENCE
        </h1>
        <div style="display:inline-block;background:rgba(218,165,32,.2);border:1px solid #daa520;
                    color:#ffd700;font-size:13px;font-weight:700;padding:5px 20px;
                    border-radius:50px;margin-top:8px;">✦ {level_name} ✦</div>
      </div>
      <div style="background:#fff;border-radius:0 0 14px 14px;padding:36px;">
        <p style="font-size:17px;color:#1a2e4a;">Dear <strong>{name}</strong>,</p>
        <p style="font-size:15px;color:#444;line-height:1.8;">
          You have completed <strong>all 10 levels</strong> of the Code Review Mastery Program.
          This is an extraordinary achievement earned through genuine dedication and skill.
        </p>
        <div style="background:linear-gradient(135deg,#fff8dc,#fef9e7);border:2px solid #daa520;
                    border-radius:10px;padding:24px;text-align:center;margin:20px 0;">
          <div style="font-size:28px;font-weight:900;color:#0a1628;">Level 10</div>
          <div style="font-size:18px;color:#b8860b;font-weight:700;">{level_name}</div>
          <div style="font-size:12px;color:#8a7040;letter-spacing:1px;margin-top:4px;">
            HIGHEST RANK · ALL 10 LEVELS COMPLETE
          </div>
        </div>
        <blockquote style="border-left:4px solid #daa520;margin:20px 0;padding:12px 18px;background:#fffef7;border-radius:0 8px 8px 0;">
          <p style="font-style:italic;color:#555;margin:0;line-height:1.8;">
            "Great code is not written by accident — it is crafted with patience,
            curiosity, and the relentless pursuit of mastery. You have embodied all three."
          </p>
        </blockquote>
        <div style="background:#f0f7ff;border:2px dashed #2c4a6e;border-radius:8px;
                    padding:20px;text-align:center;margin:20px 0;">
          <div style="font-size:32px;margin-bottom:6px;">📜</div>
          <p style="color:#1a2e4a;font-weight:700;margin:0 0 4px;">
            Your certificate is attached to this email
          </p>
          <p style="color:#666;font-size:13px;margin:0;">
            Save it, print it, frame it — you've earned every pixel.
          </p>
        </div>
        <p style="color:#1a2e4a;font-weight:600;">— The CodeReview Platform Team</p>
      </div>
      <p style="text-align:center;color:#4a6080;font-size:12px;margin-top:12px;">
        ✦ ✦ ✦
      </p>
    </div>
    </body></html>"""

    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"]    = f"CodeReview Platform <{SMTP_FROM_EMAIL}>"
    msg["To"]      = to_email

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(f"Congratulations {name}! Your Level 10 certificate is attached.", "plain"))
    alt.attach(MIMEText(html, "html"))
    msg.attach(alt)

    pdf_part = MIMEApplication(pdf_bytes, _subtype="pdf")
    pdf_part.add_header("Content-Disposition", "attachment", filename=filename)
    msg.attach(pdf_part)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM_EMAIL, to_email, msg.as_string())


async def main():
    print("=" * 55)
    print("  Certificate Test — Fully Standalone")
    print("=" * 55)

    # ── Step 1: Generate PDF ──────────────────────────────────
    print("\n📄 Step 1: Generating certificate PDF...")
    pdf = generate_certificate(
        user_name      = "Rajesh Kumar",
        user_email     = TEST_EMAIL,
        total_reviews  = 247,
        badges_count   = 10,
        total_xp       = 12_450,
    )
    assert pdf[:4] == b"%PDF", "Not a valid PDF!"
    print(f"   ✅ PDF generated — {len(pdf)//1024} KB")

    with open("test_certificate_output.pdf", "wb") as f:
        f.write(pdf)
    print("   💾 Saved → test_certificate_output.pdf")
    print("   👁  Open that file NOW to check the design looks correct.")

    # ── Step 2: Send email ────────────────────────────────────
    if TEST_EMAIL == "your_email@gmail.com":
        print("\n📧 Step 2: Skipped — set TEST_EMAIL at the top of this file first.")
    else:
        print(f"\n📧 Step 2: Sending email to {TEST_EMAIL}...")
        try:
            await send_certificate_email(
                to_email   = TEST_EMAIL,
                name       = "Rajesh Kumar",
                level_name = "Grand Master",
                pdf_bytes  = pdf,
            )
            print("   ✅ Email sent! Check your inbox (and spam folder).")
            print(f"   📎 Attachment: CodeExcellence_Certificate_Rajesh_Kumar.pdf")
        except smtplib.SMTPAuthenticationError:
            print("   ❌ SMTP Authentication failed.")
            print("   → Make sure you're using a Gmail App Password, not your real password.")
            print("   → Guide: myaccount.google.com → Security → 2-Step → App Passwords")
        except Exception as e:
            print(f"   ❌ Email error: {e}")

    print("\n" + "=" * 55)
    print("  Done!")
    print("=" * 55)

if __name__ == "__main__":
    asyncio.run(main())