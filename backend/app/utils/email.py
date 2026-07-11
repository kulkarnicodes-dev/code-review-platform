"""
app/utils/email.py

Handles all transactional emails for the gamification system.
  - send_level_up_email    : rich HTML level-up notifications (levels 1–9)
  - send_certificate_email : Level 10 completion email with PDF certificate attached
"""

import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import List, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# LEVEL METADATA
# ═══════════════════════════════════════════════════════════════════════════════

LEVEL_META = {
    1: {
        "title": "Welcome, Beginner! 🌱",
        "emoji": "🌱",
        "color": "#6c757d",
        "gradient": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "message": (
            "Every expert was once a beginner. You've taken the very first step "
            "on your coding journey — and that already puts you ahead of everyone "
            "who never started. Keep reviewing, keep learning, and watch yourself grow!"
        ),
        "tip": "💡 Pro tip: Review at least one piece of code every day to build an unstoppable habit.",
    },
    2: {
        "title": "You're a Code Apprentice! ⚒️",
        "emoji": "⚒️",
        "color": "#28a745",
        "gradient": "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
        "message": (
            "Look at you go! Reaching Level 2 means you're no longer just dipping "
            "your toes in — you're diving in head first. Your eye for code quality "
            "is sharpening with every review. The best developers are the ones who "
            "never stop questioning and improving."
        ),
        "tip": "💡 Pro tip: Pay close attention to variable naming — clean names make code self-documenting.",
    },
    3: {
        "title": "Rising Developer — Level 3! 🚀",
        "emoji": "🚀",
        "color": "#17a2b8",
        "gradient": "linear-gradient(135deg, #1CB5E0 0%, #000851 100%)",
        "message": (
            "You're officially on a roll! Level 3 is where good habits start turning "
            "into real skills. You've reviewed enough code to know that quality isn't "
            "an accident — it's a practice. The community is taking notice of your "
            "dedication. Keep that momentum going!"
        ),
        "tip": "💡 Pro tip: Start looking for security vulnerabilities — they're often hiding in plain sight.",
    },
    4: {
        "title": "Competent Coder — Level 4! 🔥",
        "emoji": "🔥",
        "color": "#fd7e14",
        "gradient": "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        "message": (
            "You're not just reviewing code — you're thinking like an engineer. "
            "Level 4 is a serious milestone that fewer people reach than you'd think. "
            "Your pattern recognition is growing, your feedback is getting sharper, "
            "and your reviews are genuinely making code better. Be proud of that!"
        ),
        "tip": "💡 Pro tip: Review code in languages you're less familiar with — it broadens your architectural thinking.",
    },
    5: {
        "title": "Halfway to the Top — Level 5! ⭐",
        "emoji": "⭐",
        "color": "#ffc107",
        "gradient": "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
        "message": (
            "HALFWAY THERE! Level 5 is the mark of a truly dedicated reviewer. "
            "You've built real consistency, real skills, and a real impact on the "
            "codebases you've touched. Half the mountain is climbed — and from here, "
            "the view only gets better. The top is closer than you think!"
        ),
        "tip": "💡 Pro tip: At this level, start focusing on architecture and design patterns — not just syntax.",
    },
    6: {
        "title": "Skilled Engineer — Level 6! 🛠️",
        "emoji": "🛠️",
        "color": "#6f42c1",
        "gradient": "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
        "message": (
            "Level 6 — this is where good developers become great ones. You have "
            "the kind of experience now that lets you spot problems before they "
            "become bugs, and patterns before they become technical debt. "
            "Your reviews are an asset to every team. You should be genuinely proud."
        ),
        "tip": "💡 Pro tip: Great engineers write review comments that teach, not just criticise. You're already doing this.",
    },
    7: {
        "title": "Senior Reviewer — Level 7! 💎",
        "emoji": "💎",
        "color": "#20c997",
        "gradient": "linear-gradient(135deg, #0fd850 0%, #f9f047 100%)",
        "message": (
            "Level 7. You're in rare company now. Most people never make it this far — "
            "but you did, through consistency, curiosity, and care. Your instincts for "
            "clean, secure, maintainable code are finely tuned. Junior developers "
            "aspire to reach where you are right now. Don't stop!"
        ),
        "tip": "💡 Pro tip: Share your knowledge — mentor others and watch your own understanding deepen even further.",
    },
    8: {
        "title": "Code Master — Level 8! 🏆",
        "emoji": "🏆",
        "color": "#e83e8c",
        "gradient": "linear-gradient(135deg, #f77062 0%, #fe5196 100%)",
        "message": (
            "CODE MASTER. That's what Level 8 means. You've put in the hours, the "
            "reviews, and the focus that most developers never commit to. Your "
            "feedback is gold. Your consistency is legendary. Two levels stand "
            "between you and the absolute pinnacle. You've got this."
        ),
        "tip": "💡 Pro tip: At your level, focus on the 'why' behind every design decision — not just the 'what'.",
    },
    9: {
        "title": "Elite Developer — Level 9! 👑",
        "emoji": "👑",
        "color": "#fd7e14",
        "gradient": "linear-gradient(135deg, #FC466B 0%, #3F5EFB 100%)",
        "message": (
            "Level 9. E L I T E. You are one step away from the highest honour "
            "in this platform. Your journey from Level 1 to here is a testament "
            "to what consistent effort and genuine passion for quality can achieve. "
            "One more push. The summit is RIGHT THERE. Finish what you started!"
        ),
        "tip": "💡 Pro tip: Review your own older reviews — seeing your growth is powerful motivation to reach Level 10.",
    },
    10: {
        "title": "GRANDMASTER — Level 10! 🌟",
        "emoji": "🌟",
        "color": "#ffd700",
        "gradient": "linear-gradient(135deg, #f6d365 0%, #fda085 50%, #f093fb 100%)",
        "message": (
            "YOU DID IT. LEVEL 10. GRANDMASTER. 🎉🎊🏆\n\n"
            "You have reached the absolute pinnacle of this platform. From your very "
            "first review to this moment, you have demonstrated an extraordinary "
            "commitment to code quality that sets you apart from the crowd. "
            "You are an inspiration to every developer in this community.\n\n"
            "This isn't the end — it's the beginning of your legacy. Thank you for "
            "making the code world a better place, one review at a time."
        ),
        "tip": "💡 Your legacy tip: Pay it forward. Teach, guide, and inspire the next generation of developers.",
    },
}

BADGE_ICONS = {
    "first_review":       "🎯",
    "bug_hunter":         "🐛",
    "clean_code_master":  "✨",
    "refactoring_pro":    "🔧",
    "polyglot":           "🌍",
    "streak_master":      "🔥",
    "security_expert":    "🛡️",
    "speed_reviewer":     "⚡",
    "high_scorer":        "💯",
    "centurion":          "💪",
}


# ═══════════════════════════════════════════════════════════════════════════════
# SHARED SMTP TRANSPORT
# ═══════════════════════════════════════════════════════════════════════════════

def _send_message(msg: MIMEMultipart) -> None:
    """Deliver a pre-built MIME message via the configured SMTP server."""
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        if getattr(settings, "SMTP_USE_TLS", True):
            server.starttls()
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.sendmail(msg["From"], msg["To"], msg.as_string())


# ═══════════════════════════════════════════════════════════════════════════════
# LEVEL-UP EMAIL BUILDERS
# ═══════════════════════════════════════════════════════════════════════════════

def _build_badge_cards_html(badges: List[dict]) -> str:
    if not badges:
        return ""
    cards = ""
    for badge in badges:
        badge_id = badge.get("id", "")
        icon = BADGE_ICONS.get(badge_id, "🏅")
        name = badge.get("name", "Badge")
        description = badge.get("description", "")
        cards += f"""
        <div style="display:inline-block;background:#ffffff;border:2px solid #e9ecef;
                    border-radius:12px;padding:16px 12px;margin:8px;text-align:center;
                    width:130px;vertical-align:top;box-shadow:0 2px 8px rgba(0,0,0,.08);">
            <div style="font-size:36px;margin-bottom:8px;">{icon}</div>
            <div style="font-weight:700;font-size:13px;color:#343a40;margin-bottom:4px;">{name}</div>
            <div style="font-size:11px;color:#868e96;line-height:1.4;">{description}</div>
        </div>"""
    return f"""
    <div style="margin:24px 0;text-align:center;">
        <h3 style="color:#343a40;font-size:18px;margin-bottom:16px;">🏅 Your Badges</h3>
        <div style="text-align:center;">{cards}</div>
    </div>"""


def _build_level_progress_html(level: int, color: str) -> str:
    filled = "●" * level
    empty  = "○" * (10 - level)
    return f"""
    <div style="text-align:center;margin:20px 0;">
        <div style="font-size:22px;letter-spacing:4px;color:{color};">
            {filled}<span style="color:#dee2e6;">{empty}</span>
        </div>
        <div style="font-size:12px;color:#868e96;margin-top:6px;">Level {level} of 10</div>
    </div>"""


def _build_level_up_html(name: str, level: int, level_name: str, badges: List[dict]) -> str:
    meta      = LEVEL_META.get(level, LEVEL_META[1])
    gradient  = meta["gradient"]
    color     = meta["color"]
    emoji     = meta["emoji"]
    title     = meta["title"]
    message   = meta["message"].replace("\n\n", "</p><p style='margin:12px 0;'>")
    tip       = meta["tip"]

    badge_section    = _build_badge_cards_html(badges)
    progress_section = _build_level_progress_html(level, color)

    new_badge_note = ""
    if badges:
        badge_names = ", ".join(b.get("name", "") for b in badges)
        plural = "s" if len(badges) > 1 else ""
        new_badge_note = f"""
        <div style="background:#fff3cd;border-left:4px solid #ffc107;border-radius:6px;
                    padding:12px 16px;margin:20px 0;font-size:14px;color:#856404;">
            🎖️ <strong>New badge{plural} unlocked:</strong> {badge_names}
        </div>"""

    next_level_cta = (
        f"Keep Reviewing — Reach Level {min(level + 1, 10)} 🚀"
        if level < 10 else "View Your Grand Master Profile 🌟"
    )
    frontend_url = getattr(settings, "FRONTEND_URL", "#")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
    <title>Level Up — {level_name}!</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <!-- HEADER -->
    <tr>
        <td style="background:{gradient};border-radius:16px 16px 0 0;
                   padding:48px 40px 36px;text-align:center;">
            <div style="font-size:72px;margin-bottom:12px;">{emoji}</div>
            <div style="color:rgba(255,255,255,.85);font-size:13px;font-weight:600;
                        letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">LEVEL UP</div>
            <h1 style="color:#fff;font-size:32px;font-weight:800;margin:0 0 8px;line-height:1.2;">
                {title}
            </h1>
            <div style="display:inline-block;background:rgba(255,255,255,.25);color:#fff;
                        font-size:14px;font-weight:700;padding:6px 20px;border-radius:50px;
                        margin-top:8px;letter-spacing:1px;">✦ {level_name} ✦</div>
        </td>
    </tr>

    <!-- BODY -->
    <tr>
        <td style="background:#fff;padding:36px 40px;border-radius:0 0 16px 16px;
                   box-shadow:0 4px 24px rgba(0,0,0,.10);">

            <p style="font-size:20px;font-weight:700;color:#212529;margin:0 0 8px;">
                Hey {name}! 👋
            </p>
            <p style="font-size:15px;color:#495057;line-height:1.7;margin:0 0 20px;">
                Congratulations — you've reached
                <strong style="color:{color};">Level {level}: {level_name}</strong>!
            </p>

            <hr style="border:none;border-top:2px solid #f1f3f5;margin:24px 0;"/>
            {progress_section}
            <hr style="border:none;border-top:2px solid #f1f3f5;margin:24px 0;"/>

            <div style="background:linear-gradient(135deg,#f8f9fa,#e9ecef);border-radius:12px;
                        padding:24px;margin:20px 0;">
                <p style="font-size:15px;color:#495057;line-height:1.8;margin:0;font-style:italic;">
                    "{message}"
                </p>
            </div>

            {new_badge_note}
            {badge_section}

            <div style="background:linear-gradient(135deg,#e8f4fd,#d1ecf1);
                        border-left:4px solid {color};border-radius:8px;
                        padding:16px 20px;margin:28px 0 8px;">
                <p style="font-size:14px;color:#0c5460;margin:0;line-height:1.6;">{tip}</p>
            </div>

            <div style="text-align:center;margin:32px 0 8px;">
                <a href="{frontend_url}/dashboard"
                   style="display:inline-block;background:{gradient};color:#fff;
                          text-decoration:none;font-size:15px;font-weight:700;
                          padding:14px 40px;border-radius:50px;letter-spacing:.5px;
                          box-shadow:0 4px 15px rgba(0,0,0,.2);">
                    {next_level_cta}
                </a>
            </div>
        </td>
    </tr>

    <!-- FOOTER -->
    <tr>
        <td style="padding:24px 40px;text-align:center;">
            <p style="font-size:12px;color:#adb5bd;margin:0 0 4px;">
                You're receiving this because you levelled up on <strong>CodeReview Platform</strong>.
            </p>
            <p style="font-size:12px;color:#adb5bd;margin:0;">
                Keep up the amazing work, {name}! The community is rooting for you. ❤️
            </p>
        </td>
    </tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def _build_level_up_plain(name: str, level: int, level_name: str, badges: List[dict]) -> str:
    meta    = LEVEL_META.get(level, LEVEL_META[1])
    message = meta["message"]
    tip     = meta["tip"]
    badge_lines = "".join(
        f"  • {b.get('name','Badge')}: {b.get('description','')}\n" for b in badges
    )
    return (
        f"Hey {name}!\n\n"
        f"🎉 LEVEL UP — You've reached Level {level}: {level_name}!\n\n"
        f"{'=' * 50}\n\n{message}\n\n{'=' * 50}\n"
        + (f"\nYOUR BADGES:\n{badge_lines}" if badge_lines else "")
        + f"\n{tip}\n\n{'=' * 50}\n\n"
        f"Keep going — Level {min(level + 1, 10)} is waiting!\n\n"
        f"— The CodeReview Platform Team\n"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# CERTIFICATE EMAIL BUILDERS  (NEW — Level 10 only)
# ═══════════════════════════════════════════════════════════════════════════════

def _build_certificate_html(name: str, level_name: str) -> str:
    frontend_url = getattr(settings, "FRONTEND_URL", "#")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
    <title>Your Code Excellence Certificate 🏆</title>
</head>
<body style="margin:0;padding:0;background:#0a1628;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <!-- HERO BANNER -->
    <tr>
        <td style="background:linear-gradient(135deg,#0a1628 0%,#1a2e4a 50%,#0a1628 100%);
                   border:2px solid #daa520;border-radius:16px 16px 0 0;
                   padding:52px 40px 40px;text-align:center;">
            <div style="font-size:18px;letter-spacing:8px;color:#daa520;margin-bottom:20px;">
                ✦ ✦ ✦ ✦ ✦
            </div>
            <div style="font-size:72px;margin-bottom:16px;">🏆</div>
            <div style="color:#cbbf9a;font-size:11px;font-weight:700;
                        letter-spacing:5px;text-transform:uppercase;margin-bottom:8px;">
                CODE REVIEW PLATFORM
            </div>
            <h1 style="color:#ffd700;font-size:30px;font-weight:900;
                       margin:0 0 6px;letter-spacing:3px;text-transform:uppercase;">
                Certificate of Excellence
            </h1>
            <div style="display:inline-block;background:rgba(218,165,32,.2);
                        border:1px solid #daa520;color:#ffd700;
                        font-size:13px;font-weight:700;padding:6px 24px;
                        border-radius:50px;margin-top:10px;letter-spacing:2px;">
                ✦ {level_name} ✦
            </div>
        </td>
    </tr>

    <!-- MAIN CARD -->
    <tr>
        <td style="background:#fff;padding:40px 44px;border-radius:0 0 16px 16px;
                   box-shadow:0 4px 32px rgba(0,0,0,.3);">

            <p style="font-size:17px;color:#1a2e4a;margin:0 0 8px;">
                Dear <strong>{name}</strong>,
            </p>
            <p style="font-size:15px;color:#444;line-height:1.8;margin:0 0 24px;">
                This email brings with it something you have truly and completely <strong>earned</strong>.
                You have conquered every level of the <strong>Code Review Mastery Program</strong> —
                a journey that demands patience, discipline, and genuine passion for great software.
            </p>

            <!-- Achievement badge -->
            <div style="background:linear-gradient(135deg,#fff8dc,#fef9e7);
                        border:2px solid #daa520;border-radius:12px;
                        padding:28px;text-align:center;margin:24px 0;">
                <div style="font-size:36px;font-weight:900;color:#0a1628;margin-bottom:4px;">
                    Level 10
                </div>
                <div style="font-size:20px;color:#b8860b;font-weight:700;margin-bottom:10px;">
                    {level_name}
                </div>
                <div style="font-size:13px;color:#8a7040;letter-spacing:1px;">
                    HIGHEST RANK · ALL 10 LEVELS COMPLETE
                </div>
            </div>

            <!-- Quote -->
            <blockquote style="border-left:4px solid #daa520;margin:24px 0;
                               padding:14px 20px;background:#fffef7;border-radius:0 8px 8px 0;">
                <p style="font-style:italic;color:#555;margin:0;line-height:1.8;font-size:14px;">
                    "Great code is not written by accident — it is crafted with patience,
                    curiosity, and the relentless pursuit of mastery. You have embodied all three."
                </p>
                <p style="color:#b8860b;font-size:12px;margin:8px 0 0;font-weight:600;">
                    — CodeReview Platform
                </p>
            </blockquote>

            <!-- Certificate attachment callout -->
            <div style="background:#f0f7ff;border:2px dashed #2c4a6e;
                        border-radius:10px;padding:22px;text-align:center;margin:24px 0;">
                <div style="font-size:36px;margin-bottom:8px;">📜</div>
                <p style="color:#1a2e4a;font-weight:700;font-size:15px;margin:0 0 6px;">
                    Your personalised certificate is attached to this email
                </p>
                <p style="color:#666;font-size:13px;margin:0;line-height:1.6;">
                    Save it, print it, frame it — you've earned every pixel of it.
                </p>
            </div>

            <p style="font-size:14px;color:#888;line-height:1.7;margin:20px 0;">
                You stand among the very few developers on this platform who have made it all
                the way. Your dedication to writing better code has made this entire community better.
                Thank you for that.
            </p>

            <!-- Tip from Level 10 meta -->
            <div style="background:linear-gradient(135deg,#fff8dc,#fef9e7);
                        border-left:4px solid #daa520;border-radius:8px;
                        padding:16px 20px;margin:20px 0;">
                <p style="font-size:14px;color:#8a6d00;margin:0;line-height:1.6;">
                    {LEVEL_META[10]["tip"]}
                </p>
            </div>

            <!-- CTA -->
            <div style="text-align:center;margin:32px 0 8px;">
                <a href="{frontend_url}/profile"
                   style="display:inline-block;
                          background:linear-gradient(135deg,#b8860b,#daa520,#ffd700);
                          color:#0a1628;text-decoration:none;font-size:15px;font-weight:800;
                          padding:16px 44px;border-radius:50px;letter-spacing:.5px;
                          box-shadow:0 4px 20px rgba(218,165,32,.4);">
                    View Your Grand Master Profile 🌟
                </a>
            </div>

            <p style="color:#1a2e4a;font-weight:600;font-size:14px;margin-top:28px;">
                With the deepest congratulations,<br/>
                — The CodeReview Platform Team
            </p>
        </td>
    </tr>

    <!-- FOOTER -->
    <tr>
        <td style="padding:24px 40px;text-align:center;">
            <div style="font-size:18px;letter-spacing:6px;color:#4a6080;margin-bottom:8px;">
                ✦ ✦ ✦
            </div>
            <p style="font-size:12px;color:#4a6080;margin:0;">
                CodeReview Platform · You received this because you completed all 10 levels.
            </p>
        </td>
    </tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def _build_certificate_plain(name: str, level_name: str) -> str:
    return (
        f"Congratulations {name}!\n\n"
        f"{'=' * 60}\n"
        f"  CERTIFICATE OF EXCELLENCE — LEVEL 10 {level_name.upper()}\n"
        f"{'=' * 60}\n\n"
        "You have successfully completed ALL 10 LEVELS of the\n"
        "Code Review Mastery Program on the CodeReview Platform.\n\n"
        '"Great code is not written by accident — it is crafted with\n'
        ' patience, curiosity, and the relentless pursuit of mastery."\n\n'
        "Your personalised PDF certificate is attached to this email.\n"
        "Save it, print it, and be proud — you earned it.\n\n"
        f"{LEVEL_META[10]['tip']}\n\n"
        "— The CodeReview Platform Team\n"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ═══════════════════════════════════════════════════════════════════════════════

async def send_level_up_email(
    to_email: str,
    name: str,
    level: int,
    level_name: str,
    badges: Optional[List[dict]] = None,
) -> bool:
    """
    Send a rich HTML level-up congratulations email.

    Covers levels 1–9. For level 10, gamification_service skips this function
    and calls send_certificate_email() instead, which sends a grander email
    with the PDF certificate attached — avoiding duplicate inbox messages.
    """
    badges = badges or []

    subject = (
        f"🌟 YOU'VE REACHED GRANDMASTER — Level {level}! 🏆"
        if level >= 10
        else f"🎉 Level {level} Unlocked — You're now a {level_name}!"
    )

    html_body  = _build_level_up_html(name, level, level_name, badges)
    plain_body = _build_level_up_plain(name, level, level_name, badges)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"CodeReview Platform <{settings.SMTP_FROM_EMAIL}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body,  "html"))

    try:
        _send_message(msg)
        logger.info(
            "Level-up email sent → %s (level=%d, %s, badges=%d)",
            to_email, level, level_name, len(badges),
        )
        return True
    except smtplib.SMTPException as exc:
        logger.error("SMTP error sending level-up email to %s: %s", to_email, exc)
        return False
    except Exception as exc:
        logger.exception("Unexpected error sending level-up email to %s: %s", to_email, exc)
        return False


async def send_certificate_email(
    to_email: str,
    name: str,
    level_name: str,
    certificate_pdf: bytes,
) -> bool:
    """
    Send the Level 10 completion email with the PDF certificate attached.

    This replaces the standard level-up email for level 10. It is richer,
    more celebratory, and delivers the actual certificate as a PDF attachment.

    Parameters
    ----------
    to_email        : recipient's email address
    name            : recipient's display name
    level_name      : human-readable level name (e.g. "Grand Master")
    certificate_pdf : raw PDF bytes from certificate_service.generate_completion_certificate()

    Returns
    -------
    True if sent successfully, False otherwise.
    """
    subject  = "🏆 Your Code Excellence Certificate — Level 10 Grand Master!"
    filename = f"CodeExcellence_Certificate_{name.replace(' ', '_')}.pdf"

    html_body  = _build_certificate_html(name, level_name)
    plain_body = _build_certificate_plain(name, level_name)

    # "mixed" outer wrapper to carry both the HTML body and the PDF attachment
    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"]    = f"CodeReview Platform <{settings.SMTP_FROM_EMAIL}>"
    msg["To"]      = to_email

    # HTML + plain text body
    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(plain_body, "plain"))
    alt.attach(MIMEText(html_body,  "html"))
    msg.attach(alt)

    # PDF attachment
    pdf_part = MIMEApplication(certificate_pdf, _subtype="pdf")
    pdf_part.add_header("Content-Disposition", "attachment", filename=filename)
    msg.attach(pdf_part)

    try:
        _send_message(msg)
        logger.info(
            "Certificate email sent → %s (%s) [%d KB PDF]",
            to_email, level_name, len(certificate_pdf) // 1024,
        )
        return True
    except smtplib.SMTPException as exc:
        logger.error("SMTP error sending certificate email to %s: %s", to_email, exc)
        return False
    except Exception as exc:
        logger.exception("Unexpected error sending certificate email to %s: %s", to_email, exc)
        return False