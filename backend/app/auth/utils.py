from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import SecretStr

from app.core.settings import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def _to_str(password) -> str:
    if isinstance(password, SecretStr):
        return password.get_secret_value()
    return password


def hash_password(password) -> str:
    """
    Hashes a plaintext password using bcrypt.
    """
    return pwd_context.hash(_to_str(password))


def verify_password(plain_password, hashed_password: str) -> bool:
    """
    Verifies a plaintext password against a hashed password.
    """
    return pwd_context.verify(_to_str(plain_password), hashed_password)
