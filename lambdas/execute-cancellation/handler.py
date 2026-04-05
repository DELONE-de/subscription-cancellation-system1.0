import json

from cancellation_service import cancel_subscription
from utils import log


def lambda_handler(event: dict, context) -> dict:
    """
    Triggered by EventBridge Scheduler.
    The scheduler passes {"subscriptionId": "..."} as the target input.
    """
    try:
        subscription_id = event.get("subscriptionId")
        if not subscription_id:
            raise ValueError("subscriptionId missing from scheduler event")

        log("INFO", "ExecuteCancellation triggered", subscriptionId=subscription_id)
        result = cancel_subscription(subscription_id)

        status = "already-canceled" if result.get("alreadyCanceled") else "auto-canceled"
        log("INFO", "ExecuteCancellation complete", status=status, subscriptionId=subscription_id)

        return {"status": status, "subscriptionId": subscription_id}

    except Exception as e:
        log("ERROR", "ExecuteCancellation failed", error=str(e))
        raise  # Re-raise so EventBridge Scheduler retry policy kicks in
