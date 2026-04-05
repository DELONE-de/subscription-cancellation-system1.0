import { Stack, StackProps, CfnOutput, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Role, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { LayerVersion, Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaFunction } from '../constructs/lambda-function';
import { envConfig, currentEnv } from '../config/env';
import { PROJECT_NAME, RESOURCE_PREFIX } from '../config/constants';

export interface LambdaStackProps extends StackProps {
  subscriptionsTable: Table;
  usersTable: Table;
  schedulerRoleArn: string;
  schedulerGroupName: string;
  sesSenderEmail: string;
}

export class LambdaStack extends Stack {
  public readonly createSubscriptionLambda: LambdaFunction;
  public readonly cancelNowLambda: LambdaFunction;
  public readonly executeCancellationLambda: LambdaFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const { subscriptionsTable, usersTable, schedulerRoleArn, schedulerGroupName, sesSenderEmail } = props;

    // ── Shared Lambda Layer (lambdas/shared) ───────────────────────────────
    // Packages shared Python utilities (db.py, email.py, scheduler.py, etc.)
    // into a layer so each Lambda doesn't bundle duplicate code.
    const sharedLayer = new LayerVersion(this, 'SharedLayer', {
      layerVersionName: `${RESOURCE_PREFIX}-shared-${currentEnv}`,
      code: Code.fromAsset('lambdas/shared'),
      compatibleRuntimes: [Runtime.PYTHON_3_11],
      description: 'Shared utilities: db, email, scheduler helpers',
    });

    // ── Common environment variables passed to all Lambdas ─────────────────
    const commonEnv = {
      SUBSCRIPTIONS_TABLE_NAME: subscriptionsTable.tableName,
      USERS_TABLE_NAME: usersTable.tableName,
      SCHEDULER_GROUP_NAME: schedulerGroupName,
      SCHEDULER_ROLE_ARN: schedulerRoleArn,
      SES_SENDER_EMAIL: sesSenderEmail,
    };

    // ── IAM Roles ──────────────────────────────────────────────────────────

    // CreateSubscription: DynamoDB write + EventBridge Scheduler create
    const createSubscriptionRole = this.buildRole('CreateSubscriptionRole', [
      this.dynamoPolicy([subscriptionsTable.tableArn, usersTable.tableArn], ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem']),
      this.schedulerPolicy(['scheduler:CreateSchedule']),
      this.logsPolicy(`/aws/lambda/${RESOURCE_PREFIX}-create-subscription-${currentEnv}`),
    ]);

    // CancelNow: DynamoDB update + EventBridge Scheduler delete + SES send
    const cancelNowRole = this.buildRole('CancelNowRole', [
      this.dynamoPolicy([subscriptionsTable.tableArn, usersTable.tableArn], ['dynamodb:GetItem', 'dynamodb:UpdateItem']),
      this.schedulerPolicy(['scheduler:DeleteSchedule']),
      this.sesPolicy(),
      this.logsPolicy(`/aws/lambda/${RESOURCE_PREFIX}-cancel-now-${currentEnv}`),
    ]);

    // ExecuteCancellation: same permissions as CancelNow (triggered by scheduler)
    const executeCancellationRole = this.buildRole('ExecuteCancellationRole', [
      this.dynamoPolicy([subscriptionsTable.tableArn, usersTable.tableArn], ['dynamodb:GetItem', 'dynamodb:UpdateItem']),
      this.schedulerPolicy(['scheduler:DeleteSchedule']),
      this.sesPolicy(),
      this.logsPolicy(`/aws/lambda/${RESOURCE_PREFIX}-execute-cancellation-${currentEnv}`),
    ]);

    // ── Lambda Functions ───────────────────────────────────────────────────

    this.createSubscriptionLambda = new LambdaFunction(this, 'CreateSubscription', {
      functionName: `${RESOURCE_PREFIX}-create-subscription-${currentEnv}`,
      handler: 'handler.lambda_handler',
      codePath: 'lambdas/create-subscription',
      environment: commonEnv,
      role: createSubscriptionRole,
      layers: [sharedLayer],
    });

    this.cancelNowLambda = new LambdaFunction(this, 'CancelNow', {
      functionName: `${RESOURCE_PREFIX}-cancel-now-${currentEnv}`,
      handler: 'handler.lambda_handler',
      codePath: 'lambdas/cancel-now',
      environment: commonEnv,
      role: cancelNowRole,
      layers: [sharedLayer],
    });

    this.executeCancellationLambda = new LambdaFunction(this, 'ExecuteCancellation', {
      functionName: `${RESOURCE_PREFIX}-execute-cancellation-${currentEnv}`,
      handler: 'handler.lambda_handler',
      codePath: 'lambdas/execute-cancellation',
      environment: commonEnv,
      role: executeCancellationRole,
      layers: [sharedLayer],
    });

    // ── Tags ───────────────────────────────────────────────────────────────
    Tags.of(this).add('Project', PROJECT_NAME);
    Tags.of(this).add('Environment', currentEnv);

    // ── CloudFormation Outputs ─────────────────────────────────────────────
    new CfnOutput(this, 'CreateSubscriptionLambdaArn', {
      value: this.createSubscriptionLambda.functionArn,
      exportName: `${id}-CreateSubscriptionLambdaArn`,
    });
    new CfnOutput(this, 'CancelNowLambdaArn', {
      value: this.cancelNowLambda.functionArn,
      exportName: `${id}-CancelNowLambdaArn`,
    });
    new CfnOutput(this, 'ExecuteCancellationLambdaArn', {
      value: this.executeCancellationLambda.functionArn,
      exportName: `${id}-ExecuteCancellationLambdaArn`,
    });
  }

  // ── IAM helpers ───────────────────────────────────────────────────────────

  private buildRole(id: string, policies: PolicyStatement[]): Role {
    const role = new Role(this, id, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    policies.forEach(p => role.addToPolicy(p));
    return role;
  }

  /** DynamoDB least-privilege: scoped to specific table ARNs */
  private dynamoPolicy(tableArns: string[], actions: string[]): PolicyStatement {
    return new PolicyStatement({
      effect: Effect.ALLOW,
      actions,
      // Include base ARN and GSI sub-resources (index/*)
      resources: tableArns.flatMap(arn => [arn, `${arn}/index/*`]),
    });
  }

  /** EventBridge Scheduler: scoped to the scheduler group */
  private schedulerPolicy(actions: string[]): PolicyStatement {
    return new PolicyStatement({
      effect: Effect.ALLOW,
      actions,
      // Scope to the specific scheduler group; individual schedule names are dynamic
      resources: [
        `arn:aws:scheduler:${envConfig.region}:${envConfig.account}:schedule/${envConfig.schedulerGroup}/*`,
      ],
    });
  }

  /** SES SendEmail: scoped to verified sender identity */
  private sesPolicy(): PolicyStatement {
    return new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['ses:SendEmail'],
      // Scope to the sender identity ARN; recipient addresses are not known at deploy time
      resources: [
        `arn:aws:ses:${envConfig.region}:${envConfig.account}:identity/*`,
      ],
    });
  }

  /** CloudWatch Logs: scoped to the specific log group for this Lambda */
  private logsPolicy(logGroupName: string): PolicyStatement {
    const logGroupArn = `arn:aws:logs:${envConfig.region}:${envConfig.account}:log-group:${logGroupName}`;
    return new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: [logGroupArn, `${logGroupArn}:*`],
    });
  }
}
