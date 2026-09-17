from datetime import datetime, timedelta, timezone
from database.postgres import SessionLocal, engine
from database.models import Base, Language, HealthCondition, AdminUser, Profile, ProfileHealth, ProfileCompletion, JourneyHistoryRecord, UserFeedback, UserLocation
from auth.security import hash_password

languages = {
    "English": "en-IN", "Hindi": "hi-IN", "Kannada": "kn-IN", "Tamil": "ta-IN",
    "Telugu": "te-IN", "Malayalam": "ml-IN", "Marathi": "mr-IN"
}

conditions = [
    "Asthma",
    "COPD",
    "Heart Disease",
    "Pregnancy",
    "Senior Citizen",
    "Other Respiratory Issues"
]

def ensure_master_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()


    try:
        # Seed Languages
        for language, code in languages.items():
            row = db.query(Language).filter(Language.language_name == language).first()
            if not row:
                db.add(Language(language_name=language, language_code=code))
            elif not row.language_code:
                row.language_code = code
        
        # Seed Health Conditions
        for condition in conditions:
            if not db.query(HealthCondition).filter(HealthCondition.condition_name == condition).first():
                db.add(HealthCondition(condition_name=condition))
        
        db.commit()

        # Seed Default Super Admin Account
        default_admin_email = "admin@arogyaroute.com"
        if not db.query(AdminUser).filter(AdminUser.email == default_admin_email).first():
            admin = AdminUser(
                username="Harshini (Super Admin)",
                email=default_admin_email,
                password_hash=hash_password("admin123"),
                role="SUPER_ADMIN",
                is_active=True
            )
            db.add(admin)
            db.commit()

        # Database update: Rename any existing 'Himaja' records in Profile/AdminUser to 'Harshini'
        db.query(Profile).filter(Profile.username == "Himaja").update({"username": "Harshini", "email": "harshini919@gmail.com"})
        db.query(AdminUser).filter(AdminUser.username.like("%Himaja%")).update({"username": "Harshini (Super Admin)"})
        db.commit()

        # Seed sample data if database has few profiles so dashboard stats show realistic entries
        if db.query(Profile).count() < 3:
            eng_lang = db.query(Language).filter(Language.language_name == "English").first()
            tam_lang = db.query(Language).filter(Language.language_name == "Tamil").first()
            hin_lang = db.query(Language).filter(Language.language_name == "Hindi").first()
            tel_lang = db.query(Language).filter(Language.language_name == "Telugu").first()
            
            copd_cond = db.query(HealthCondition).filter(HealthCondition.condition_name == "COPD").first()
            asthma_cond = db.query(HealthCondition).filter(HealthCondition.condition_name == "Asthma").first()

            now = datetime.now(timezone.utc)
            samples = [
                {"name": "Harshini", "email": "harshini919@gmail.com", "age": 24, "lang": tel_lang, "cond": copd_cond, "days_ago": 7},
                {"name": "Rahul", "email": "rahul@gmail.com", "age": 28, "lang": hin_lang, "cond": None, "days_ago": 6},
                {"name": "Demo User", "email": "demo@example.com", "age": 28, "lang": eng_lang, "cond": None, "days_ago": 5},
                {"name": "Testuser 78681", "email": "test_78681@example.com", "age": 25, "lang": tam_lang, "cond": None, "days_ago": 4},
                {"name": "John Doe", "email": "john@example.com", "age": 32, "lang": tam_lang, "cond": asthma_cond, "days_ago": 2},
            ]

            for s in samples:
                if not db.query(Profile).filter(Profile.email == s["email"]).first():
                    p = Profile(
                        username=s["name"],
                        email=s["email"],
                        password_hash=hash_password("User@123"),
                        age=s["age"],
                        language_id=s["lang"].language_id if s["lang"] else 1,
                        has_health_condition=s["cond"] is not None,
                        profile_completed=True,
                        created_at=now - timedelta(days=s["days_ago"]),
                        last_login=now - timedelta(days=s["days_ago"] - 1)
                    )
                    db.add(p)
                    db.commit()
                    db.refresh(p)
                    db.add(ProfileCompletion(profile_id=p.profile_id))

                    if s["cond"]:
                        db.add(ProfileHealth(profile_id=p.profile_id, condition_id=s["cond"].condition_id))
                    
                    # Add location & sample journey
                    db.add(UserLocation(profile_id=p.profile_id, latitude=15.8281, longitude=78.0373, city="Kurnool", country="India"))
                    db.add(JourneyHistoryRecord(
                        profile_id=p.profile_id,
                        source="Kurnool",
                        destination="Hyderabad",
                        route_count=2,
                        avg_aqi=48.5,
                        created_at=now - timedelta(days=s["days_ago"] - 1)
                    ))
            
            # Add feedback samples
            if db.query(UserFeedback).count() == 0:
                db.add(UserFeedback(
                    user_id="1",
                    feedback_email="harshini919@gmail.com",
                    rating=5,
                    feedback_text="ArogyaRoute helped me choose clean routes with significantly lower AQI pollution exposure!",
                    page_url="/admin/dashboard",
                    created_at=now - timedelta(days=1)
                ))
            db.commit()

    finally:
        db.close()

if __name__ == "__main__":
    ensure_master_data()
    print("Master data & default admin updated successfully.")

