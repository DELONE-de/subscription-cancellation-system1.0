import os
import json
import boto3

scheduler = boto3.client("scheduler")

SCHEDULER_GROUP_NAME = os.environ["SCHEDULER_GROUP_NAME"]
SCHEDULER_ROLE_ARN = os.environ["SCHEDULER_ROLE_ARN"]
EXECUTE_LAMBDA_ARN = os.environ["EXECUTE_LAMBDA_ARN"]


def create_schedule(subscription_id: str, end_date: str) -> str:
    """
    Create an EventBridge Scheduler one-time schedule that fires at end_date.
    Returns the schedule name.
    """
    from utils import generate_schedule_name
    name = generate_schedule_name(subscription_id)

    scheduler.create_schedule(
        Name=name,
        GroupName=SCHEDULER_GROUP_NAME,
        ScheduleExpression=f"at({end_date})",
        FlexibleTimeWindow={"Mode": "OFF"},
        Target={
            "Arn": EXECUTE_LAMBDA_ARN,
            "RoleArn": SCHEDULER_ROLE_ARN,
            "Input": json.dumps({"subscriptionId": subscription_id}),
            "RetryPolicy": {
                "MaximumRetryAttempts": 3,
                "MaximumEventAgeInSeconds": 3600,
            },
        },
    )
    return name


def delete_schedule(schedule_name: str) -> None:
    """Delete an EventBridge schedule; silently ignore if it no longer exists."""
    try:
        scheduler.delete_schedule(
            Name=schedule_name,
            GroupName=SCHEDULER_GROUP_NAME,
        )
    except scheduler.exceptions.ResourceNotFoundException:
        pass
