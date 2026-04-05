
import { Stack, StackProps, CfnOutput, RemovalPolicy, Tags } from 'aws-cdk-lib';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { DynamoTable } from '../constructs/dynamodb-table';
import { envConfig, currentEnv } from '../config/env';
import { PROJECT_NAME } from '../config/constants';

export class DatabaseStack extends Stack {
  public readonly usersTable: Table;
  public readonly subscriptionsTable: Table;
  public readonly notificationsTable: Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Use RETAIN in prod to prevent accidental data loss
    const removalPolicy = currentEnv === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;

    // ── Users ──────────────────────────────────────────────────────────────
    // Attributes: email, name, createdAt, updatedAt
    const users = new DynamoTable(this, 'Users', {
      tableName: envConfig.tableNames.users,
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      removalPolicy,
    });
    this.usersTable = users.table;

    // ── Subscriptions ──────────────────────────────────────────────────────
    // Attributes: userId, status, plan, startDate, endDate, scheduleName,
    //             createdAt, updatedAt, canceledAt
    const subscriptions = new DynamoTable(this, 'Subscriptions', {
      tableName: envConfig.tableNames.subscriptions,
      partitionKey: { name: 'subscriptionId', type: AttributeType.STRING },
      gsis: [
        // GSI1: list all subscriptions for a user, newest first
        {
          indexName: 'GSI1-userId-createdAt',
          partitionKey: { name: 'userId', type: AttributeType.STRING },
          sortKey: { name: 'createdAt', type: AttributeType.STRING },
        },
        // GSI2: find subscriptions by status (e.g. expiring soon)
        {
          indexName: 'GSI2-status-endDate',
          partitionKey: { name: 'status', type: AttributeType.STRING },
          sortKey: { name: 'endDate', type: AttributeType.STRING },
        },
      ],
      removalPolicy,
    });
    this.subscriptionsTable = subscriptions.table;

    // ── Notifications ──────────────────────────────────────────────────────
    // Attributes: userId, subscriptionId, type, status, createdAt
    // TTL: stale notifications are auto-expired via the `ttl` attribute
    const notifications = new DynamoTable(this, 'Notifications', {
      tableName: envConfig.tableNames.notifications,
      partitionKey: { name: 'notificationId', type: AttributeType.STRING },
      ttlAttribute: 'ttl',
      gsis: [
        // GSI: list all notifications for a user, newest first
        {
          indexName: 'GSI-userId-createdAt',
          partitionKey: { name: 'userId', type: AttributeType.STRING },
          sortKey: { name: 'createdAt', type: AttributeType.STRING },
        },
      ],
      removalPolicy,
    });
    this.notificationsTable = notifications.table;

    // ── Tags ───────────────────────────────────────────────────────────────
    Tags.of(this).add('Project', PROJECT_NAME);
    Tags.of(this).add('Environment', currentEnv);

    // ── CloudFormation Outputs ─────────────────────────────────────────────
    new CfnOutput(this, 'UsersTableName', {
      value: this.usersTable.tableName,
      exportName: `${id}-UsersTableName`,
    });
    new CfnOutput(this, 'UsersTableArn', {
      value: this.usersTable.tableArn,
      exportName: `${id}-UsersTableArn`,
    });
    new CfnOutput(this, 'SubscriptionsTableName', {
      value: this.subscriptionsTable.tableName,
      exportName: `${id}-SubscriptionsTableName`,
    });
    new CfnOutput(this, 'SubscriptionsTableArn', {
      value: this.subscriptionsTable.tableArn,
      exportName: `${id}-SubscriptionsTableArn`,
    });
    new CfnOutput(this, 'NotificationsTableName', {
      value: this.notificationsTable.tableName,
      exportName: `${id}-NotificationsTableName`,
    });
  }
}
