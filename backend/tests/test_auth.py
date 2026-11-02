import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.auth_service import hash_password, verify_password, create_access_token
from jose import jwt
from app.config import get_settings

settings = get_settings()


def test_password_hashing():
    raw_pwd = "SecretPassword123"
    hashed = hash_password(raw_pwd)

    # Must not store plaintext
    assert hashed != raw_pwd
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")

    # Verification must succeed
    assert verify_password(raw_pwd, hashed) is True
    # Wrong password must fail
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_generation_and_decoding():
    payload = {"sub": "user_123", "role": "agent", "email": "agent@test.com"}
    token = create_access_token(payload)

    assert isinstance(token, str)
    assert len(token) > 20

    # Decode and check claims
    decoded = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert decoded["sub"] == "user_123"
    assert decoded["role"] == "agent"
    assert "exp" in decoded

