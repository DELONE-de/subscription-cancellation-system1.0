import json
import os
from datetime import datetime, timezone

SERVICE_NAME = "subscription-service"

# Lambda context is set once per invocation via init_context()
_request_id: str = "unknown"
_function_name: str = os.environ.get("AWS_LAMBDA_FUNCTION_NAME", "unknown")


def init_context(context) -> None:
    """Call at the top of each lambda_handler to capture request/function metadata."""
    global _request_id, _function_name
    _request_id = getattr(context, "aws_request_id", "unknown")
    _function_name = getattr(context, "function_name", _function_name)


def generate_schedule_name(subscription_id: str) -> str:
    return f"cancel-subscription-{subscription_id}"


def get_current_time_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")


def validate_input(data: dict, required_fields: list[str]) -> None:
    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        raise ValueError(f"Missing required fields: {missing}")


def log(level: str, message: str, **kwargs) -> None:
    entry = {
        "timestamp": get_current_time_iso(),
        "level": level,
        "service": SERVICE_NAME,
        "function": _function_name,
        "requestId": _request_id,
        "message": message,
    }
    entry.update(kwargs)
    print(json.dumps(entry))
