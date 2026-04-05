
import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SchedulerConstruct } from '../constructs/scheduler';
import { envConfig, currentEnv } from '../config/env';

/**
 * SchedulerStack
 *
 * Provisions the EventBridge Scheduler Group and the IAM Role required
 * for the scheduler to invoke Lambda functions. Exports key ARNs/names
 * as CloudFormation Outputs and public properties for cross-stack use.
 */
export class SchedulerStack extends Stack {
  public readonly schedulerGroupName: string;
  public readonly schedulerRoleArn: string;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const schedulerConstruct = new SchedulerConstruct(this, 'Scheduler', {
      groupName: envConfig.schedulerGroup,
      environment: currentEnv,
    });

    this.schedulerGroupName = schedulerConstruct.schedulerGroupName;
    this.schedulerRoleArn = schedulerConstruct.schedulerRoleArn;

    new CfnOutput(this, 'SchedulerGroupName', {
      value: this.schedulerGroupName,
      description: 'EventBridge Scheduler Group name',
      exportName: `${id}-scheduler-group-name`,
    });

    new CfnOutput(this, 'SchedulerRoleArn', {
      value: this.schedulerRoleArn,
      description: 'IAM Role ARN used by EventBridge Scheduler to invoke Lambda',
      exportName: `${id}-scheduler-role-arn`,
    });
  }
}
