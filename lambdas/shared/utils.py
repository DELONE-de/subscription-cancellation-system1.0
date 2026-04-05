import uuid
import json
from datetime import datetime, timezone


def generate_schedule_name(subscription_id: str) -> str:
    return f"cancel-subscription-{subscription_id}"


def get_current_time_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")


def validate_input(data: dict, required_fields: list[str]) -> None:
    """Raise ValueError if any required field is missing or empty."""
    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        raise ValueError(f"Missing required fields: {missing}")


def log(level: str, message: str, **kwargs) -> None:
    print(json.dumps({"level": level, "message": message, **kwargs}))
