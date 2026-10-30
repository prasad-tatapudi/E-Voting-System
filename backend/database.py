import os

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Boolean,
    Text,
    Date,
    ForeignKey,
)
from sqlalchemy.orm import declarative_base, sessionmaker


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:Prasad@localhost:5432/voting_system",
)

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


class Voter(Base):
    __tablename__ = "voters"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)

    voter_number = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    dob = Column(Date, nullable=True)

    # Email and password are optional during registration.
    email = Column(
        String(150),
        unique=True,
        nullable=True,
        index=True,
    )

    password_hash = Column(String(255), nullable=True)

    is_eligible = Column(Boolean, default=True, nullable=False)
    has_voted = Column(Boolean, default=False, nullable=False)

    face_embedding = Column(Text, nullable=True)


class Vote(Base):
    __tablename__ = "votes"

    id = Column(Integer, primary_key=True, index=True)

    voter_id = Column(
        Integer,
        ForeignKey("voters.id"),
        unique=True,
        nullable=False,
        index=True,
    )

    candidate_id = Column(Integer, nullable=False)


class PasskeyCredential(Base):
    __tablename__ = "passkey_credentials"

    id = Column(Integer, primary_key=True, index=True)

    voter_id = Column(
        Integer,
        ForeignKey("voters.id"),
        nullable=False,
        index=True,
    )

    credential_id = Column(
        String(1024),
        unique=True,
        nullable=False,
    )

    public_key = Column(Text, nullable=False)

    sign_count = Column(
        Integer,
        default=0,
        nullable=False,
    )


Base.metadata.create_all(bind=engine)
