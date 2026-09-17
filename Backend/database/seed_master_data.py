from database.postgres import SessionLocal
from database.models import Language, HealthCondition

languages = [
    "English",
    "Hindi",
    "Kannada",
    "Tamil",
    "Telugu",
    "Malayalam"
]

conditions = [
    "Asthma",
    "COPD",
    "Heart Disease",
    "Pregnancy",
    "Senior Citizen",
    "Other Respiratory Issues"
]

def ensure_master_data():
    db = SessionLocal()
    try:
        for language in languages:
            if not db.query(Language).filter(Language.language_name == language).first():
                db.add(Language(language_name=language))
        for condition in conditions:
            if not db.query(HealthCondition).filter(HealthCondition.condition_name == condition).first():
                db.add(HealthCondition(condition_name=condition))
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    ensure_master_data()
    print("Master data inserted successfully.")
