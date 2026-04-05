import json
import uuid
from datetime import datetime, timezone, timedelta

from db import create_subscription, update_subscription
from scheduler import create_schedule
from utils import get_current_time_iso, validate_input, log, init_context


def lambda_handler(event: dict, context) -> dict:
    init_context(context)
    try:
        body = json.loads(event.get("body") or "{}")
        validate_input(body, ["userId", "plan"])

        if not body.get("durationDays") and not body.get("endDate"):
            raise ValueError("Either durationDays or endDate must be provided")

        user_id = body["userId"]
        plan = body["plan"]
        subscription_id = str(uuid.uuid4())
        now = get_current_time_iso()

        # ── Compute endDate ────────────────────────────────────────────────
        if body.get("durationDays"):
            start_dt = datetime.now(timezone.utc)
            end_dt = start_dt + timedelta(days=int(body["durationDays"]))
            end_date = end_dt.strftime("%Y-%m-%dT%H:%M:%S")
        else:
            end_date = body["endDate"]

        # ── Persist subscription ───────────────────────────────────────────
        item = {
            "subscriptionId": subscription_id,
            "userId": user_id,
            "status": "active",
            "plan": plan,
            "startDate": now,
            "endDate": end_date,
            "createdAt": now,
            "updatedAt": now,
        }
        create_subscription(item)
        log("INFO", "Subscription created", subscriptionId=subscription_id)

        # ── Create EventBridge schedule ────────────────────────────────────
        schedule_name = create_schedule(subscription_id, end_date)
        update_subscription(subscription_id, {"scheduleName": schedule_name, "updatedAt": get_current_time_iso()})
        log("INFO", "Schedule created", scheduleName=schedule_name)

        return {
            "statusCode": 201,
            "body": json.dumps({
                "subscriptionId": subscription_id,
                "status": "active",
                "endDate": end_date,
            }),
        }

    except ValueError as e:
        log("WARN", "Validation error", error=str(e))
        return {"statusCode": 400, "body": json.dumps({"error": str(e)})}
    except Exception as e:
        log("ERROR", "Unexpected error", error=str(e))
        return {"statusCode": 500, "body": json.dumps({"error": "Internal server error"})}
