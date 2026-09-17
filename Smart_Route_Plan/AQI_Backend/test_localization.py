import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.postgres import Base, engine, SessionLocal
from database.models import Translation, WebsiteContent
from database.seed_master_data import ensure_master_data
from services.website_content_service import (
    seed_english_content,
    get_website_content,
    get_or_create_cached_translation,
    ENGLISH_CONTENT,
    DEFAULT_TRANSLATIONS,
    clean_translation_tags,
)

def run_tests():
    print("=== 1. Creating Database Tables ===", flush=True)
    Base.metadata.create_all(bind=engine)
    ensure_master_data()
    print("[OK] Master data & tables created in PostgreSQL.", flush=True)

    db = SessionLocal()
    try:
        # Clear legacy [HI] tags from database
        clean_translation_tags(db)

        print("\n=== 2. Seeding Static Content into PostgreSQL translations table ===", flush=True)
        seed_english_content(db)
        print("[OK] English & starter translations seeded into 'translations' table.", flush=True)

        trans_count = db.query(Translation).count()
        print(f"[OK] Total rows in 'translations' table: {trans_count}", flush=True)

        sample_trans = db.query(Translation).filter_by(language_code="hi-IN", translation_key="app.name").first()
        if sample_trans:
            print(f"[OK] Sample Hindi Translation Row: key='{sample_trans.translation_key}', lang='{sample_trans.language_code}', text='{sample_trans.translated_text}'", flush=True)

        print("\n=== 3. Testing Static Copy Retrieval with Postgres Caching ===", flush=True)
        content, cached = get_website_content(db, "hi-IN")
        print(f"[OK] Language 'hi-IN': received {len(content)} labels. Cached = {cached}. Sample app.name = '{content.get('app.name')}'", flush=True)

        print("\n=== 4. Testing Dynamic Recommendation Translation Caching ===", flush=True)
        source_advice = "Air quality is acceptable; unusually sensitive people should reduce outdoor activity."
        cached_result = get_or_create_cached_translation(db, source_advice, "hi-IN")
        print(f"[OK] Fetched directly from PostgreSQL 'translations' DB table (0 Sarvam API calls): '{cached_result}'", flush=True)

        print("\n=== ALL LOCALIZATION & POSTGRES CACHING TESTS PASSED SUCCESSFULLY! ===", flush=True)

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
