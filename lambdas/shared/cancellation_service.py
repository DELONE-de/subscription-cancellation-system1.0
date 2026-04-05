from db import get_subscription, update_subscription, get_user
from scheduler import delete_schedule
from email import send_cancellation_email
from utils import get_current_time_iso, log


def cancel_subscription(subscription_id: str) -> dict:
    """
    Shared cancellation logic used by both CancelNow and ExecuteCancellation.
    Idempotent: if already canceled, cleans up the schedule and returns early.
    """
    subscription = get_subscription(subscription_id)

    if not subscription:
        log("ERROR", "Subscription not found", subscriptionId=subscription_id)
        return {"success": False, "error": "Subscription not found"}

    # ── Idempotency guard ──────────────────────────────────────────────────
    if subscription.get("status") == "canceled":
        log("INFO", "Already canceled — cleaning up schedule if present", subscriptionId=subscription_id)
        if schedule_name := subscription.get("scheduleName"):
            delete_schedule(schedule_name)
        return {"success": True, "alreadyCanceled": True}

    now = get_current_time_iso()

    # ── Update subscription record ─────────────────────────────────────────
    update_subscription(subscription_id, {
        "status": "canceled",
        "canceledAt": now,
        "updatedAt": now,
    })
    log("INFO", "Subscription marked canceled", subscriptionId=subscription_id)

    # ── Delete EventBridge schedule ────────────────────────────────────────
    if schedule_name := subscription.get("scheduleName"):
        delete_schedule(schedule_name)
        log("INFO", "Schedule deleted", scheduleName=schedule_name)

    # ── Send email notification ────────────────────────────────────────────
    user = get_user(subscription["userId"])
    if user and (email := user.get("email")):
        send_cancellation_email(email, subscription_id)
        log("INFO", "Cancellation email sent", email=email)
    else:
        log("WARN", "User email not found — skipping email", userId=subscription.get("userId"))

    return {"success": True, "alreadyCanceled": False}
