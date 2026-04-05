import json

from cancellation_service import cancel_subscription
from db import get_active_subscription_by_user_id
from utils import log


def lambda_handler(event: dict, context) -> dict:
    try:
        # userId injected by API Gateway authorizer
        user_id = (event.get("requestContext") or {}).get("authorizer", {}).get("userId")
        if not user_id:
            raise ValueError("Unauthorized: userId missing from request context")

        log("INFO", "CancelNow invoked", userId=user_id)

        subscription = get_active_subscription_by_user_id(user_id)
        if not subscription:
            return {"statusCode": 404, "body": json.dumps({"error": "No active subscription found"})}

        subscription_id = subscription["subscriptionId"]
        result = cancel_subscription(subscription_id)

        if not result["success"]:
            return {"statusCode": 404, "body": json.dumps({"error": result["error"]})}

        message = "already canceled" if result["alreadyCanceled"] else "canceled"
        return {
            "statusCode": 200,
            "body": json.dumps({"status": message, "subscriptionId": subscription_id}),
        }

    except ValueError as e:
        log("WARN", "Validation error", error=str(e))
        return {"statusCode": 400, "body": json.dumps({"error": str(e)})}
    except Exception as e:
        log("ERROR", "Unexpected error", error=str(e))
        return {"statusCode": 500, "body": json.dumps({"error": "Internal server error"})}
