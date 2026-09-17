"""Database-backed cache for static UI copy stored in PostgreSQL in separate User & Admin tables."""
import hashlib
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect

from database.models import UserWebsiteContent, AdminWebsiteContent, Language, Translation
from services.sarvam_service import (
    translate_text,
    normalize_language_name,
    normalize_language_code,
)

logger = logging.getLogger("arogya.website_content")

LANGUAGE_CODES_BY_NAME = {
    "English": "en-IN", "Hindi": "hi-IN", "Kannada": "kn-IN", "Tamil": "ta-IN",
    "Telugu": "te-IN", "Malayalam": "ml-IN", "Marathi": "mr-IN", "Bengali": "bn-IN",
    "Gujarati": "gu-IN", "Punjabi": "pa-IN", "Odia": "od-IN", "Assamese": "as-IN",
}

# ── 1. USER PORTAL DEFAULT CONTENT ────────────────────────────────────────────

USER_ENGLISH_CONTENT = {
    "app.name": "ArogyaRoute",
    "app.tagline": "Healthier choices for every journey",
    "dashboard.greeting": "Good to see you",
    "dashboard.subtext": "Here's your environmental summary for today.",
    "dashboard.safe_route": "✈️ Safe Route",
    "dashboard.health_advice": "❤️ Health Advice",
    "nav.home": "Home",
    "nav.dashboard": "Smart Routes",
    "nav.plan_route": "Smart Routes",
    "nav.my_journeys": "Route History",
    "nav.profile": "Settings",
    "nav.smart_routes": "Smart Routes",
    "nav.route_history": "Route History",
    "nav.settings": "Settings",
    "nav.sign_out": "Sign out",
    "nav.sign_in": "Sign in",
    "hero.eyebrow": "PREDICTIVE AIR QUALITY FOR EVERYDAY TRAVEL",
    "hero.title": "Breathe easier, wherever you are headed.",
    "hero.description": "ArogyaRoute compares pollution exposure across real routes and turns data into practical health guidance for you.",
    "form.from": "Starting point",
    "form.to": "Destination",
    "form.departure": "Departure time",
    "form.use_location": "Use my location",
    "form.find_routes": "Find healthier routes",
    "form.loading": "Analysing route air quality...",
    "form.location_unavailable": "We could not access your location. Please enter a starting point.",
    "route.recommended": "Recommended",
    "route.average_aqi": "Average AQI",
    "route.travel_time": "Travel time",
    "route.distance": "Distance",
    "route.exposure": "Pollution exposure",
    "route.health_risk": "Health risk score",
    "route.view_on_map": "Show on map",
    "route.all_routes": "All routes",
    "route.no_result": "Enter a journey to compare route air quality.",
    "route.error": "We could not find a route right now. Please check the locations and try again.",
    "map.title": "Route air quality map",
    "map.caption": "Tap a route to focus it on the map.",
    "map.start": "Start",
    "map.destination": "Destination",
    "map.checkpoint": "AQI checkpoint",
    "advice.title": "Personalised health guidance",
    "advice.default": "Your route guidance will appear here after you plan a journey.",
    "history.title": "Route History",
    "history.empty": "No journeys saved yet.",
    "aqi.good": "Good",
    "aqi.moderate": "Moderate",
    "aqi.unhealthy": "Unhealthy",
    "auth.title": "Welcome back",
    "auth.email": "Email address",
    "auth.password": "Password",
    "auth.submit": "Sign in",
    "auth.cancel": "Cancel",
    "auth.create_account": "Create account",
    "auth.new_here": "New here? Create an account",
    "auth.welcome": "Welcome back",
    "planner.eyebrow": "Smart route planner",
    "planner.title": "Find the cleaner way forward.",
    "planner.find_routes": "Find routes",
    "planner.panel": "Route planner",
    "planner.from_label": "From",
    "planner.to_label": "To",
    "planner.leave_label": "Leave",
    "planner.start": "Start",
    "planner.destination": "Destination",
    "planner.recommended_route": "Recommended route",
    "planner.alternative_route": "Alternative route",
    "recommendations.eyebrow": "Route comparison",
    "recommendations.title": "Choose your best journey.",
    "recommendations.options": "Route options",
    "recommendations.click_route": "Click a route to focus it on the map.",
    "recommendations.no_routes": "No route comparison yet.",
    "history.eyebrow": "Journey history",
    "history.heading": "Your recent route searches.",
    "profile.eyebrow": "Your profile",
    "profile.heading": "Personalisation settings.",
    "profile.name": "Name",
    "profile.email": "Email",
    "profile.language": "Language",
    "profile.health": "Health settings",
    "theme.dark": "Dark",
    "theme.light": "Light",
    "settings.title": "Settings",
    "settings.subtitle": "Manage your preferences and account",
    "settings.subtext": "Manage your display name, language localization, and health profile stored in PostgreSQL database.",
    "account.title": "Account",
    "account.edit_profile": "Edit Profile",
    "account.username": "Username",
    "account.email": "Email Address",
    "account.password": "Password",
    "account.password_hint": "Last changed 30 days ago",
    "appearance.title": "Appearance",
    "appearance.theme": "Theme",
    "appearance.light_active": "Light mode active",
    "appearance.dark_active": "Dark mode active",
    "language.title": "Language",
    "language.display_lang": "Display Language",
    "language.display_hint": "Used for notifications and recommendations",
    "health.title": "Health Profile",
    "health.conditions": "Health Conditions",
    "health.conditions_hint": "Affects your personalized recommendations",
    "ai.tip_title": "AI Tip",
    "ai.tip_desc": "Best commute window today: 6–8 AM (AQI 52)",
    "welcome.hi": "Hi",
    "welcome.greeting_suffix": "start your safe & healthy travel plan today!",
    "welcome.subtext": "Real-time AI pollution signals & route recommendations calibrated for your health profile.",
    "search.placeholder": "Search locations, routes, pollutants...",
    "router.title": "AI-Powered Smart Router", "router.subtitle": "Find the healthiest route for you",
    "router.desc": "Our AI compares air quality across every route option and recommends the cleanest path for your health conditions.",
    "router.map_label": "Route Air Quality Map", "feedback.voice": "Your Voice Matters",
    "feedback.title": "How are we doing?", "feedback.subtitle": "Help us improve ArogyaRoute's air quality routing, health guidance, and overall experience.",
    "feedback.rate": "Rate your overall experience", "feedback.topic": "What's your feedback about?",
    "feedback.optional": "optional", "feedback.more": "Tell us more",
    "feedback.placeholder": "What did you love? What can we improve? Any bugs or suggestions?",
    "feedback.email": "Email address", "feedback.email_hint": "We'll only use this to follow up on your feedback.",
    "feedback.reset": "Reset", "feedback.submit": "Submit Feedback", "feedback.sending": "Sending?",
    "feedback.route_accuracy": "Route Accuracy", "feedback.aqi_data": "AQI Data Quality",
    "feedback.design": "Design & Usability", "feedback.performance": "Performance",
    "feedback.health": "Health Guidance", "feedback.other": "Other",
    "feedback.thank_you": "Thank you, your feedback matters!",
    "feedback.success": "Your input helps us make ArogyaRoute smarter and healthier for everyone.",
    "feedback.another": "Submit Another"
}

# ── 2. ADMIN PORTAL DEFAULT CONTENT ───────────────────────────────────────────

ADMIN_ENGLISH_CONTENT = {
    "appTitle": "ArogyaRoute Admin",
    "subTitle": "Real-time statistics & operations control room",
    "signInTitle": "Admin Portal Sign-In",
    "signInDesc": "Access system analytics, user management, and route logs",
    "emailLabel": "Admin Email",
    "passwordLabel": "Password",
    "signInBtn": "Sign In to Admin Portal",
    "signingIn": "Authenticating...",
    "dashboardTab": "Dashboard Overview",
    "usersTab": "Manage Users",
    "predictionsTab": "Route Predictions Log",
    "analyticsTab": "System Analytics",
    "feedbackTab": "Feedback & Reviews",
    "languagesTab": "Languages",
    "settingsTab": "Settings",
    "darkToggle": "Dark Mode",
    "lightToggle": "Light Mode",
    "signOut": "Sign Out",
    "superAdminBadge": "SUPER ADMIN",
    "refreshBtn": "Refresh Data",
    "totalUsers": "Total Users",
    "registeredProfiles": "Registered profiles in DB",
    "activeUsers": "Active Users",
    "activeSubtext": "Last 30 days active",
    "googleSignins": "Google Sign-ins",
    "whitelistedAdmins": "OAuth authenticated",
    "totalPredictions": "Total Predictions",
    "calculatedPaths": "Calculated route paths",
    "predictionsToday": "Predictions Today",
    "generatedToday": "Generated today",
    "feedbackCount": "Feedback Count",
    "commentsReceived": "Comments received",
    "avgRating": "Average Rating",
    "userSatisfaction": "User review satisfaction",
    "mostUsedLang": "Most Used Language",
    "preferredLocalization": "Preferred localization",
    "topActiveCities": "Top Active Cities",
    "peakUsageHours": "Peak Usage Hours",
    "searchUsersPlaceholder": "Search by name or email...",
    "allLanguages": "All Languages",
    "allProfiles": "All Conditions",
    "applySearch": "Apply Filter",
    "exportCsv": "Export CSV",
    "colName": "NAME",
    "colEmail": "EMAIL",
    "colAgePhone": "AGE",
    "colHealth": "HEALTH CONDITION",
    "colLang": "LANGUAGE",
    "colRegOn": "REGISTERED ON",
    "colLastActive": "LAST ACTIVE",
    "colJourneys": "JOURNEYS",
    "reqTime": "REQUEST TIME",
    "user": "USER",
    "source": "SOURCE",
    "destination": "DESTINATION",
    "predictedAqi": "PREDICTED AQI",
    "distDuration": "DISTANCE & DURATION",
    "newSignupsChart": "New Signups (Last 14 Days)",
    "routePredictionsChart": "Route Predictions (Last 14 Days)",
    "predictionsByRegionChart": "Predictions by Region",
    "languageShareChart": "Preferred Language Share",
    "createNewAdmin": "Create New Admin",
    "changePassword": "Change Password",
    "usernameLabel": "Username",
    "roleLabel": "Role",
    "createAdminBtn": "Create Admin Account",
    "updatePasswordBtn": "Update Password",
    "oldPasswordLabel": "Current Password",
    "newPasswordLabel": "New Password",
    "systemStatus": "System Status & Storage",
    "realtimeData": "Real-time data stream direct from PostgreSQL & MongoDB",
    "addLanguageTitle": "Add New Language & Auto-Translate Static Data",
    "addLanguageDescription": "Add a new language and automatically translate all static copy into the User and Admin content tables.",
    "languageNameLabel": "Language Name", "languageCodeLabel": "Language Code (Optional)",
    "languageNamePlaceholder": "e.g. Kannada, Bengali, Marathi", "languageCodePlaceholder": "e.g. kn, bn, mr, gu",
    "addLanguageButton": "Add Language & Translate", "generatingTranslations": "Generating translations in database?",
    "registeredLanguages": "Registered Platform Languages", "languageId": "Language ID",
    "languageName": "Language Name", "statusInDb": "Status in Database",
    "userContentTable": "User Content Table", "adminContentTable": "Admin Content Table",
    "activeProfiles": "Active Profiles", "active": "Active", "profiles": "profiles",
    "sendInvitationTitle": "Send Admin Portal Invitation (SMTP)",
    "sendInvitationDescription": "Send a role-based invitation link directly to a team member's Gmail ID via SMTP. The user creates their own account password upon clicking the link.",
    "targetEmail": "Target Gmail / Email ID", "assignedRole": "Assigned Access Role",
    "adminRole": "ADMIN (Full Portal Access)", "userRole": "USER / MODERATOR (Standard Access)",
    "invitationLink": "Invitation Link", "copyInvitationLink": "Copy Invitation Link",
    "sendInvite": "Send Role-Based Invite Link", "sendingInvite": "Sending SMTP Invitation?",
    "postgresStatus": "PostgreSQL/SQLite", "mongoStatus": "MongoDB Storage",
    "smtpStatus": "SMTP Mail Gateway", "jwtStatus": "JWT Admin Auth", "backendApi": "Backend API",
    "connected": "Connected", "statusActive": "Active",
    "sentInvitationsTitle": "Sent Invitations & Database Real-Time Status",
    "sentInvitationsDescription": "Monitor status of role-based invitations sent to user Gmail IDs.",
    "refreshStatus": "Refresh Status", "recipientEmail": "Recipient Email",
    "role": "Role", "status": "Status", "sentDate": "Sent Date", "acceptedDate": "Accepted Date",
    "invitedBy": "Invited By", "actions": "Actions", "pending": "Pending",
    "accepted": "Accepted", "copyLink": "Copy Link", "resend": "Resend", "revoke": "Revoke",
    "noInvitations": "No invitations sent yet. Use the form above to invite team members."
}

# ── 3. SERVICE FUNCTIONS ───────────────────────────────────────────────────────

def drop_legacy_website_content_table(engine):
    """Drop legacy single website_content table if it exists."""
    try:
        if inspect(engine).has_table("website_content"):
            statement = "DROP TABLE IF EXISTS website_content CASCADE"
            if engine.dialect.name != "postgresql":
                statement = "DROP TABLE IF EXISTS website_content"
            with engine.begin() as conn:
                conn.execute(text(statement))
            logger.info("🗑 Dropped legacy website_content table from database.")
    except Exception as e:
        logger.warning(f"Note dropping legacy table: {e}")


def ensure_language_code_column(engine):
    """Add and backfill the stable language code on databases created before it existed."""
    inspector = inspect(engine)
    if not inspector.has_table("language"):
        return
    if "language_code" not in {column["name"] for column in inspector.get_columns("language")}:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE language ADD COLUMN language_code VARCHAR(20)"))
    with engine.begin() as conn:
        for name, code in LANGUAGE_CODES_BY_NAME.items():
            conn.execute(
                text("UPDATE language SET language_code = :code WHERE language_name = :name AND language_code IS NULL"),
                {"name": name, "code": code},
            )


def _content_from_records(records, defaults: dict[str, str]) -> dict[str, str]:
    """Return persisted content only, filling absent keys with the English UI default."""
    content = {row.content_key: row.content_value for row in records}
    return {key: content.get(key, value) for key, value in defaults.items()}


def get_user_website_content(db: Session, target_lang: str) -> tuple[dict[str, str], bool]:
    """Read User Portal content from PostgreSQL; this path never calls a translation provider."""
    clean_lang = normalize_language_name(target_lang)
    records = db.query(UserWebsiteContent).filter(UserWebsiteContent.language_name.ilike(clean_lang)).all()
    return _content_from_records(records, USER_ENGLISH_CONTENT), bool(records)


def get_admin_website_content(db: Session, target_lang: str) -> tuple[dict[str, str], bool]:
    """Read Admin Portal content from PostgreSQL; this path never calls a translation provider."""
    clean_lang = normalize_language_name(target_lang)
    records = db.query(AdminWebsiteContent).filter(AdminWebsiteContent.language_name.ilike(clean_lang)).all()
    return _content_from_records(records, ADMIN_ENGLISH_CONTENT), bool(records)


def seed_user_content_for_lang(db: Session, language_name: str, refresh_fallback: bool = False) -> dict[str, str]:
    """Create missing User Portal copy and optionally replace stale English fallback rows."""
    clean_lang = normalize_language_name(language_name)
    logger.info(f"🌐 Seeding User Portal static content in PostgreSQL for language: {clean_lang}")

    result_dict = {}

    for key, english_text in USER_ENGLISH_CONTENT.items():
        existing = db.query(UserWebsiteContent).filter(
            UserWebsiteContent.content_key == key,
            UserWebsiteContent.language_name == clean_lang
        ).first()

        should_refresh = refresh_fallback and clean_lang != "English" and existing is not None and existing.content_value == existing.source_content
        if existing and not should_refresh:
            result_dict[key] = existing.content_value
            continue

        if clean_lang == "English":
            translated = english_text
            is_machine = False
        else:
            translated = translate_text(english_text, clean_lang)
            # Do not mark an English outage fallback as a completed translation.
            is_machine = translated != english_text

        if existing:
            existing.content_value = translated
            existing.source_content = english_text
            existing.is_machine_translated = is_machine
        else:
            db.add(UserWebsiteContent(content_key=key, language_name=clean_lang, content_value=translated, source_content=english_text, is_machine_translated=is_machine))
        result_dict[key] = translated

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving user_website_content for {clean_lang}: {e}")

    return result_dict


def seed_admin_content_for_lang(db: Session, language_name: str, refresh_fallback: bool = False) -> dict[str, str]:
    """Create missing Admin Portal copy and optionally replace stale English fallback rows."""
    clean_lang = normalize_language_name(language_name)
    logger.info(f"⚙️ Seeding Admin Portal static content in PostgreSQL for language: {clean_lang}")

    result_dict = {}

    for key, english_text in ADMIN_ENGLISH_CONTENT.items():
        existing = db.query(AdminWebsiteContent).filter(
            AdminWebsiteContent.content_key == key,
            AdminWebsiteContent.language_name == clean_lang
        ).first()

        should_refresh = refresh_fallback and clean_lang != "English" and existing is not None and existing.content_value == existing.source_content
        if existing and not should_refresh:
            result_dict[key] = existing.content_value
            continue

        if clean_lang == "English":
            translated = english_text
            is_machine = False
        else:
            translated = translate_text(english_text, clean_lang)
            # Do not mark an English outage fallback as a completed translation.
            is_machine = translated != english_text

        if existing:
            existing.content_value = translated
            existing.source_content = english_text
            existing.is_machine_translated = is_machine
        else:
            db.add(AdminWebsiteContent(content_key=key, language_name=clean_lang, content_value=translated, source_content=english_text, is_machine_translated=is_machine))
        result_dict[key] = translated

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving admin_website_content for {clean_lang}: {e}")

    return result_dict


def add_new_language(db: Session, language_name: str, code: str = None) -> dict:
    """Add new language and populate static translations in both User and Admin database tables."""
    clean_name = normalize_language_name(language_name)
    language_code = normalize_language_code(code or LANGUAGE_CODES_BY_NAME.get(clean_name, clean_name))
    if clean_name != "English" and language_code == "en-IN":
        raise ValueError("Provide a valid language code for this language (for example, Marathi uses mr-IN).")

    # 1. Register language in PostgreSQL language table
    existing_lang = db.query(Language).filter(Language.language_name.ilike(clean_name)).first()
    if not existing_lang:
        existing_lang = Language(language_name=clean_name, language_code=language_code)
        db.add(existing_lang)
        db.commit()
        db.refresh(existing_lang)
    elif not existing_lang.language_code:
        existing_lang.language_code = language_code
        db.commit()

    # 2. Seed UserWebsiteContent in PostgreSQL
    user_dict = seed_user_content_for_lang(db, clean_name, refresh_fallback=True)

    # 3. Seed AdminWebsiteContent in PostgreSQL
    admin_dict = seed_admin_content_for_lang(db, clean_name, refresh_fallback=True)

    return {
        "message": f"Language '{clean_name}' successfully added to platform and translated in PostgreSQL DB!",
        "language_id": existing_lang.language_id,
        "language_name": clean_name,
        "language_code": existing_lang.language_code,
        "user_keys_translated": len(user_dict),
        "admin_keys_translated": len(admin_dict)
    }


DEFAULT_PRESEEDED_LANGUAGES = [
    "English", "Hindi", "Kannada", "Telugu", "Malayalam", "Tamil", "Marathi"
]


def seed_english_content(db: Session):
    """Deprecated compatibility hook. Content is provisioned explicitly, never during startup."""
    return None


# ── Backward-compat helpers used by recommendation_routes & localization_service ───

def get_website_content(db: Session, target_lang: str) -> tuple[dict[str, str], bool]:
    """Alias for get_user_website_content — kept for backward compatibility."""
    return get_user_website_content(db, target_lang)


def get_or_create_cached_translation(db: Session, source_text: str, target_language: str) -> str:
    """Translate and cache arbitrary dynamic text (health advice, route labels, etc.) using the translations table in PostgreSQL.
    Falls back to the source text if translation fails.
    """
    if not source_text or not source_text.strip():
        return source_text

    lang_code = normalize_language_code(target_language)

    if lang_code in ("en-IN", "English", "en"):
        return source_text

    # Build stable cache key from text hash
    text_hash = hashlib.md5(source_text.encode("utf-8")).hexdigest()[:16]
    cache_key = f"dynamic_{text_hash}"

    existing = db.query(Translation).filter(
        Translation.translation_key == cache_key,
        Translation.language_code == lang_code
    ).first()

    if existing:
        return existing.translated_text

    # Translate using Sarvam AI
    translated = translate_text(source_text, target_language)
    if not translated or translated == source_text:
        return source_text

    try:
        row = Translation(
            translation_key=cache_key,
            language_code=lang_code,
            source_text=source_text,
            translated_text=translated
        )
        db.add(row)
        db.commit()
    except Exception:
        db.rollback()

    return translated
