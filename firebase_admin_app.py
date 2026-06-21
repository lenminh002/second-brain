from __future__ import annotations

import os
import threading
from pathlib import Path
from typing import Any

_LOCK = threading.RLock()
_ENV_LOADED = False


def _load_local_env() -> None:
    global _ENV_LOADED
    if _ENV_LOADED:
        return
    _ENV_LOADED = True
    env_path = Path.cwd() / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def get_firebase_admin_app(*, require_credentials: bool = False) -> Any:
    _load_local_env()
    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError as exc:
        raise RuntimeError("firebase-admin is required. Run `uv sync` first.") from exc

    with _LOCK:
        try:
            return firebase_admin.get_app()
        except ValueError:
            credentials_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_FILE") or os.getenv(
                "GOOGLE_APPLICATION_CREDENTIALS"
            )
            if credentials_path:
                if not Path(credentials_path).expanduser().exists():
                    raise RuntimeError(
                        "Firebase service account file was not found at "
                        f"{credentials_path}."
                    )
                return firebase_admin.initialize_app(credentials.Certificate(credentials_path))
            if require_credentials:
                raise RuntimeError(
                    "Firebase credentials are required. Set FIREBASE_SERVICE_ACCOUNT_FILE "
                    "or GOOGLE_APPLICATION_CREDENTIALS to a Firebase service account JSON file."
                )
            return firebase_admin.initialize_app()
