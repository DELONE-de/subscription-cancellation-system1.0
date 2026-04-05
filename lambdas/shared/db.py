import os
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb")

SUBSCRIPTIONS_TABLE = os.environ["SUBSCRIPTIONS_TABLE_NAME"]
USERS_TABLE = os.environ["USERS_TABLE_NAME"]


def get_subscription(subscription_id: str) -> dict | None:
    table = dynamodb.Table(SUBSCRIPTIONS_TABLE)
    resp = table.get_item(Key={"subscriptionId": subscription_id})
    return resp.get("Item")


def create_subscription(item: dict) -> None:
    dynamodb.Table(SUBSCRIPTIONS_TABLE).put_item(Item=item)


def update_subscription(subscription_id: str, updates: dict) -> None:
    """Build a dynamic UpdateExpression from the updates dict."""
    table = dynamodb.Table(SUBSCRIPTIONS_TABLE)
    expr_parts = []
    attr_names = {}
    attr_values = {}

    for i, (key, value) in enumerate(updates.items()):
        placeholder = f"#k{i}"
        value_key = f":v{i}"
        expr_parts.append(f"{placeholder} = {value_key}")
        attr_names[placeholder] = key
        attr_values[value_key] = value

    table.update_item(
        Key={"subscriptionId": subscription_id},
        UpdateExpression="SET " + ", ".join(expr_parts),
        ExpressionAttributeNames=attr_names,
        ExpressionAttributeValues=attr_values,
    )


def get_user(user_id: str) -> dict | None:
    table = dynamodb.Table(USERS_TABLE)
    resp = table.get_item(Key={"userId": user_id})
    return resp.get("Item")


def get_active_subscription_by_user_id(user_id: str) -> dict | None:
    table = dynamodb.Table(SUBSCRIPTIONS_TABLE)
    resp = table.query(
        IndexName="GSI1-userId-createdAt",
        KeyConditionExpression=Key("userId").eq(user_id),
        FilterExpression="#s <> :canceled",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":canceled": "canceled"},
        ScanIndexForward=False,
        Limit=1,
    )
    items = resp.get("Items", [])
    return items[0] if items else None
