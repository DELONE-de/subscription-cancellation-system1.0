import json

from cancellation_service import cancel_subscription
from db import get_subscription
from utils import log, init_context


def lambda_handler(event: dict, context) -> dict:
    init_context(context)
    try:
        # subscriptionId from path parameter
        subscription_id = (event.get("pathParameters") or {}).get("subscriptionId")
        if not subscription_id:
            raise ValueError("subscriptionId path parameter is required")

        # userId from authorizer context or request body
        authorizer_user_id = (event.get("requestContext") or {}).get("authorizer", {}).get("userId")
        body = json.loads(event.get("body") or "{}")
        user_id = authorizer_user_id or body.get("userId")

        log("INFO", "CancelNow invoked", subscriptionId=subscription_id)

        # Ownership check
        if user_id:
            subscription = get_subscription(subscription_id)
            if not subscription:
                return {"statusCode": 404, "body": json.dumps({"error": "Subscription not found"})}
            if subscription.get("userId") != user_id:
                return {"statusCode": 403, "body": json.dumps({"error": "Forbidden"})}

        result = cancel_subscription(subscription_id)

        if not result["success"]:
            return {"statusCode": 404, "body": json.dumps({"error": result["error"]})}

        status = "canceled"
        return {
            "statusCode": 200,
            "body": json.dumps({"subscriptionId": subscription_id, "status": status}),
        }

    except ValueError as e:
        log("WARN", "Validation error", error=str(e))
        return {"statusCode": 400, "body": json.dumps({"error": str(e)})}
    except Exception as e:
        log("ERROR", "Unexpected error", error=str(e))
        return {"statusCode": 500, "body": json.dumps({"error": "Internal server error"})}
