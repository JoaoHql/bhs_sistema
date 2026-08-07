from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import secrets
import string

from app.core.config import Settings
from app.core.security import hash_password


SPECIAL_CHARACTERS = "!@#$%^&*()-_=+[]{}:,.?"


@dataclass(frozen=True, slots=True)
class TemporaryCredential:
    plaintext: str
    password_hash: str
    expires_at: datetime


class CredentialService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def validate_password(self, password: str) -> None:
        failures: list[str] = []
        if len(password) < self.settings.password_min_length:
            failures.append(f"minimo de {self.settings.password_min_length} caracteres")
        if self.settings.password_require_uppercase and not any(char.isupper() for char in password):
            failures.append("letra maiuscula")
        if self.settings.password_require_lowercase and not any(char.islower() for char in password):
            failures.append("letra minuscula")
        if self.settings.password_require_number and not any(char.isdigit() for char in password):
            failures.append("numero")
        if self.settings.password_require_special and not any(char in SPECIAL_CHARACTERS for char in password):
            failures.append("caractere especial")
        if failures:
            raise ValueError("Senha invalida: " + ", ".join(failures) + ".")

    def generate_password(self) -> str:
        required = [
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.ascii_lowercase),
            secrets.choice(string.digits),
            secrets.choice(SPECIAL_CHARACTERS),
        ]
        alphabet = string.ascii_letters + string.digits + SPECIAL_CHARACTERS
        required.extend(
            secrets.choice(alphabet)
            for _ in range(self.settings.generated_password_length - len(required))
        )
        secrets.SystemRandom().shuffle(required)
        password = "".join(required)
        self.validate_password(password)
        return password

    def issue_temporary(
        self,
        defined_password: str | None = None,
        *,
        now: datetime | None = None,
    ) -> TemporaryCredential:
        plaintext = defined_password if defined_password is not None else self.generate_password()
        self.validate_password(plaintext)
        issued_at = now or datetime.now(timezone.utc)
        if issued_at.tzinfo is None:
            raise ValueError("now deve possuir timezone.")
        return TemporaryCredential(
            plaintext=plaintext,
            password_hash=hash_password(plaintext),
            expires_at=issued_at + timedelta(hours=self.settings.temporary_password_ttl_hours),
        )
