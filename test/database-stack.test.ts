import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DatabaseStack } from '../lib/stacks/database-stack';

const template = Template.fromStack(new DatabaseStack(new App(), 'TestDatabaseStack'));

test('creates 3 DynamoDB tables', () => {
  template.resourceCountIs('AWS::DynamoDB::Table', 3);
});

test('subscriptions table has 2 GSIs', () => {
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    TableName: 'Subscriptions-dev',
    GlobalSecondaryIndexes: [
      { IndexName: 'GSI1-userId-createdAt' },
      { IndexName: 'GSI2-status-endDate' },
    ],
  });
});

test('notifications table has TTL enabled', () => {
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    TableName: 'Notifications-dev',
    TimeToLiveSpecification: { AttributeName: 'ttl', Enabled: true },
  });
});

test('exports UsersTableName and SubscriptionsTableName outputs', () => {
  template.hasOutput('UsersTableName', {});
  template.hasOutput('SubscriptionsTableName', {});
});
