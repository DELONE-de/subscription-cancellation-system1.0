import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { SchedulerStack } from '../lib/stacks/scheduler-stack';
import { LambdaStack } from '../lib/stacks/lambda-stack';
import { ApiStack } from '../lib/stacks/api-stack';

function buildTemplate() {
  const app = new App();
  const dbStack = new DatabaseStack(app, 'TestDb');
  const schedulerStack = new SchedulerStack(app, 'TestScheduler');
  const lambdaStack = new LambdaStack(app, 'TestLambda', {
    subscriptionsTable: dbStack.subscriptionsTable,
    usersTable: dbStack.usersTable,
    schedulerRoleArn: schedulerStack.schedulerRoleArn,
    schedulerGroupName: schedulerStack.schedulerGroupName,
    sesSenderEmail: 'noreply@example.com',
  });
  const apiStack = new ApiStack(app, 'TestApiStack', {
    createSubscriptionFn: lambdaStack.createSubscriptionLambda.lambdaFunction,
    cancelNowFn: lambdaStack.cancelNowLambda.lambdaFunction,
  });
  return Template.fromStack(apiStack);
}

const template = buildTemplate();

test('creates an HTTP API', () => {
  template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
});

test('has POST /subscriptions and DELETE /subscriptions/{subscriptionId} routes', () => {
  template.hasResourceProperties('AWS::ApiGatewayV2::Route', { RouteKey: 'POST /subscriptions' });
  template.hasResourceProperties('AWS::ApiGatewayV2::Route', { RouteKey: 'DELETE /subscriptions/{subscriptionId}' });
});

test('outputs ApiUrl', () => {
  template.hasOutput('ApiUrl', {});
});
