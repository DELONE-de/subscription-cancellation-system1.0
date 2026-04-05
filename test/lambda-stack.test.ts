import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { SchedulerStack } from '../lib/stacks/scheduler-stack';
import { LambdaStack } from '../lib/stacks/lambda-stack';

function buildTemplate() {
  const app = new App();
  const dbStack = new DatabaseStack(app, 'TestDb');
  const schedulerStack = new SchedulerStack(app, 'TestScheduler');
  const lambdaStack = new LambdaStack(app, 'TestLambdaStack', {
    subscriptionsTable: dbStack.subscriptionsTable,
    usersTable: dbStack.usersTable,
    schedulerRoleArn: schedulerStack.schedulerRoleArn,
    schedulerGroupName: schedulerStack.schedulerGroupName,
    sesSenderEmail: 'noreply@example.com',
  });
  return Template.fromStack(lambdaStack);
}

const template = buildTemplate();

test('creates 3 Lambda functions', () => {
  template.resourceCountIs('AWS::Lambda::Function', 3);
});

test('creates a shared Lambda layer', () => {
  template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
});

test('each Lambda role trusts lambda.amazonaws.com', () => {
  template.resourceCountIs('AWS::IAM::Role', 3);
  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [{ Principal: { Service: 'lambda.amazonaws.com' } }],
    },
  });
});

test('exports CreateSubscription and CancelNow Lambda ARNs', () => {
  template.hasOutput('CreateSubscriptionLambdaArn', {});
  template.hasOutput('CancelNowLambdaArn', {});
});
