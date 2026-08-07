from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import binascii
from jose import JWTError, jwt
from app.schemas.user import User


def can_access_screen(user: User, screen_id: str) -> bool:
    if "admin" in user.roles:
        return True
    if "*" in user.allowed_screen_ids:
        return True
    return screen_id in user.allowed_screen_ids


def create_jwt_token(
    data: dict,
    secret_key: str,
    algorithm: str,
    expires_delta: timedelta | None = None,
    issuer: str | None = None,
    audience: str | None = None,
) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=60)
    to_encode.update({"exp": expire, "iat": now})
    if issuer:
        to_encode["iss"] = issuer
    if audience:
        to_encode["aud"] = audience
    return jwt.encode(to_encode, secret_key, algorithm=algorithm)


def verify_jwt_token(
    token: str,
    secret_key: str,
    algorithm: str,
    issuer: str | None = None,
    audience: str | None = None,
) -> dict | None:
    try:
        return jwt.decode(
            token,
            secret_key,
            algorithms=[algorithm],
            issuer=issuer,
            audience=audience,
        )
    except JWTError:
        return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    if hashed_password.startswith("pbkdf2_sha256$"):
        try:
            parts = hashed_password.split("$")
            if len(parts) == 4:
                _, iterations_str, salt_str, hex_hash = parts
                iterations = int(iterations_str)
                dk = hashlib.pbkdf2_hmac(
                    'sha256',
                    plain_password.encode('utf-8'),
                    salt_str.encode('utf-8'),
                    iterations
                )
                computed_hex = binascii.hexlify(dk).decode('utf-8')
                return hmac.compare_digest(computed_hex, hex_hash)
        except Exception:
            return False
    return False


def hash_password(password: str, *, iterations: int = 600_000, salt: str | None = None) -> str:
    if not password:
        raise ValueError("Senha vazia nao pode ser armazenada.")
    if salt is None:
        salt = binascii.hexlify(__import__("secrets").token_bytes(16)).decode("ascii")
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    )
    return f"pbkdf2_sha256${iterations}${salt}${binascii.hexlify(digest).decode('ascii')}"
