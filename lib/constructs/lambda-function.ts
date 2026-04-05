import { Duration } from 'aws-cdk-lib';
import { Function, Runtime, Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Role, ServicePrincipal, ManagedPolicy, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { LAMBDA_DEFAULTS } from '../config/constants';

export interface LambdaFunctionProps {
  functionName: string;
  handler: string;
  codePath: string;
  environment?: Record<string, string>;
  timeout?: Duration;
  memorySize?: number;
  // Provide an existing role, or one will be created with basic execution permissions
  role?: Role;
  layers?: LayerVersion[];
}

export class LambdaFunction extends Construct {
  public readonly lambdaFunction: Function;
  public readonly functionArn: string;
  public readonly functionName: string;

  constructor(scope: Construct, id: string, props: LambdaFunctionProps) {
    super(scope, id);

    // Create a dedicated log group so we control retention and can scope IAM to it
    const logGroup = new LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${props.functionName}`,
      retention: RetentionDays.ONE_MONTH,
    });

    // Use provided role or create a least-privilege execution role
    const role = props.role ?? this.createExecutionRole(id, logGroup.logGroupArn);

    this.lambdaFunction = new Function(this, 'Function', {
      functionName: props.functionName,
      runtime: Runtime.PYTHON_3_11,
      handler: props.handler,
      code: Code.fromAsset(props.codePath),
      environment: props.environment,
      timeout: props.timeout ?? Duration.seconds(LAMBDA_DEFAULTS.TIMEOUT),
      memorySize: props.memorySize ?? LAMBDA_DEFAULTS.MEMORY_SIZE,
      role,
      layers: props.layers,
    });

    this.functionArn = this.lambdaFunction.functionArn;
    this.functionName = this.lambdaFunction.functionName;
  }

  private createExecutionRole(id: string, logGroupArn: string): Role {
    const role = new Role(this, `${id}Role`, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      // No AWSLambdaBasicExecutionRole managed policy — we scope logs explicitly below
    });

    // Least-privilege CloudWatch Logs permissions scoped to this function's log group
    role.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: [logGroupArn, `${logGroupArn}:*`],
    }));

    return role;
  }
}
