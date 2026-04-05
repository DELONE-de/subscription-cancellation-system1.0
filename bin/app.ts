#!/usr/bin/env node
import 'source-map-support/register';
import { App, Tags } from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { SchedulerStack } from '../lib/stacks/scheduler-stack';
import { LambdaStack } from '../lib/stacks/lambda-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { envConfig, currentEnv } from '../lib/config/env';
import { PROJECT_NAME } from '../lib/config/constants';

const app = new App();

const env = {
  account: envConfig.account,
  region: envConfig.region,
};

const dbStack = new DatabaseStack(app, `${PROJECT_NAME}-database-${currentEnv}`, { env });

const schedulerStack = new SchedulerStack(app, `${PROJECT_NAME}-scheduler-${currentEnv}`, { env });

const lambdaStack = new LambdaStack(app, `${PROJECT_NAME}-lambda-${currentEnv}`, {
  env,
  subscriptionsTable: dbStack.subscriptionsTable,
  usersTable: dbStack.usersTable,
  schedulerRoleArn: schedulerStack.schedulerRoleArn,
  schedulerGroupName: schedulerStack.schedulerGroupName,
  sesSenderEmail: process.env.SES_SENDER_EMAIL ?? 'noreply@example.com',
});

const apiStack = new ApiStack(app, `${PROJECT_NAME}-api-${currentEnv}`, {
  env,
  createSubscriptionFn: lambdaStack.createSubscriptionLambda.lambdaFunction,
  cancelNowFn: lambdaStack.cancelNowLambda.lambdaFunction,
});

lambdaStack.addDependency(dbStack);
lambdaStack.addDependency(schedulerStack);
apiStack.addDependency(lambdaStack);

Tags.of(app).add('Project', PROJECT_NAME);
Tags.of(app).add('Environment', currentEnv);
