import os
import boto3

ses = boto3.client("ses")

SES_SENDER_EMAIL = os.environ["SES_SENDER_EMAIL"]


def send_cancellation_email(email: str, subscription_id: str) -> None:
    ses.send_email(
        Source=SES_SENDER_EMAIL,
        Destination={"ToAddresses": [email]},
        Message={
            "Subject": {"Data": "Your subscription has been canceled"},
            "Body": {
                "Text": {
                    "Data": (
                        f"Your subscription (ID: {subscription_id}) has been deleted.\n"
                        "If you have questions, please contact support."
                    )
                }
            },
        },
    )
