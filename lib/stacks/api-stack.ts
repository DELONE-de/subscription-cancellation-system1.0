import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { ApiGateway } from '../constructs/api-gateway';
import { PROJECT_NAME } from '../config/constants';
import { currentEnv } from '../config/env';

export interface ApiStackProps extends StackProps {
  createSubscriptionFn: Function;
  cancelNowFn: Function;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    new ApiGateway(this, 'ApiGateway', {
      createSubscriptionFn: props.createSubscriptionFn,
      cancelNowFn: props.cancelNowFn,
      stageName: currentEnv,
    });

    Tags.of(this).add('Project', PROJECT_NAME);
    Tags.of(this).add('Environment', currentEnv);
  }
}
