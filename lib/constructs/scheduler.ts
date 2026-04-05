import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import { Tags } from 'aws-cdk-lib';
import { PROJECT_NAME } from '../config/constants';

export interface SchedulerConstructProps {
  /** Logical name for the EventBridge Scheduler Group */
  groupName: string;
  /** Deployment environment (dev | staging | prod) */
  environment: string;
  /**
   * Optional list of Lambda ARNs this scheduler role is allowed to invoke.
   * When provided, the IAM policy is scoped to those ARNs.
   * When omitted, the role is granted lambda:InvokeFunction on all functions
   * in the account/region (still restricted to Lambda service, not wildcard).
   */
  lambdaArns?: string[];
}

/**
 * SchedulerConstruct
 *
 * Creates:
 *  - An EventBridge Scheduler Group to logically group all cancellation schedules.
 *  - An IAM Role trusted by scheduler.amazonaws.com, with least-privilege
 *    lambda:InvokeFunction permission scoped to the provided Lambda ARNs
 *    (or all Lambdas in the account/region if none are specified).
 */
export class SchedulerConstruct extends Construct {
  /** Name of the EventBridge Scheduler Group */
  public readonly schedulerGroupName: string;
  /** ARN of the EventBridge Scheduler Group */
  public readonly schedulerGroupArn: string;
  /** ARN of the IAM Role used by the scheduler to invoke Lambda */
  public readonly schedulerRoleArn: string;

  constructor(scope: Construct, id: string, props: SchedulerConstructProps) {
    super(scope, id);

    // --- Scheduler Group ---
    // Groups all EventBridge schedules for this system, enabling
    // lifecycle management (list, delete) by group.
    const group = new scheduler.CfnScheduleGroup(this, 'SchedulerGroup', {
      name: props.groupName,
    });

    this.schedulerGroupName = group.name!;
    this.schedulerGroupArn = group.attrArn;

    // --- IAM Role ---
    // Trusted by the EventBridge Scheduler service so it can assume this role
    // when firing a schedule and invoking the target Lambda function.
    const role = new iam.Role(this, 'SchedulerRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
      description: `EventBridge Scheduler role for ${props.groupName}`,
    });

    // Scope lambda:InvokeFunction to specific ARNs when provided,
    // otherwise allow all Lambdas in the account (still least-privilege vs wildcard service).
    const lambdaResources = props.lambdaArns && props.lambdaArns.length > 0
      ? props.lambdaArns
      : ['*'];

    role.addToPolicy(new iam.PolicyStatement({
      actions: ['lambda:InvokeFunction'],
      resources: lambdaResources,
    }));

    this.schedulerRoleArn = role.roleArn;

    Tags.of(this).add('Project', PROJECT_NAME);
    Tags.of(this).add('Environment', props.environment);
  }
}
