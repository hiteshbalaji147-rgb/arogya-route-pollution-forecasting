from sqlalchemy.orm import Session

from .models import (
    Profile,
    ProfileHealth,
    Language,
    HealthCondition
    , ProfileCompletion
)

from auth.security import hash_password


def get_user_by_email(db: Session, email: str):
    return (
        db.query(Profile)
        .filter(Profile.email == email)
        .first()
    )


def create_user(db: Session, user):

    if not db.query(Language).filter(Language.language_id == user.language_id).first():
        raise ValueError("Invalid language_id")
    if user.condition_ids:
        count = db.query(HealthCondition).filter(HealthCondition.condition_id.in_(user.condition_ids)).count()
        if count != len(set(user.condition_ids)):
            raise ValueError("One or more condition_ids are invalid")

    hashed_password = hash_password(user.password)

    db_user = Profile(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        age=user.age,
        language_id=user.language_id,
        has_health_condition=user.has_health_condition,
        profile_completed=True
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    db.add(ProfileCompletion(profile_id=db_user.profile_id))

    if user.has_health_condition:

        for condition in set(user.condition_ids):

            db.add(
                ProfileHealth(
                    profile_id=db_user.profile_id,
                    condition_id=condition
                )
            )

        db.commit()

    return db_user

def authenticate_user(db: Session, email: str, password: str):

    user = get_user_by_email(db, email)

    if not user:
        return None

    from auth.security import verify_password

    if not verify_password(
        password,
        user.password_hash
    ):
        return None

    return user
