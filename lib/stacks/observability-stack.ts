import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { ObservabilityConstruct } from '../constructs/observability-construct';
import { PROJECT_NAME } from '../config/constants';
import { currentEnv } from '../config/env';

export interface ObservabilityStackProps extends StackProps {
  createSubscriptionFn: Function;
  cancelNowFn: Function;
  executeCancellationFn: Function;
}

export class ObservabilityStack extends Stack {
  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);

    new ObservabilityConstruct(this, 'Observability', {
      functions: {
        CreateSubscription: props.createSubscriptionFn,
        CancelNow: props.cancelNowFn,
        ExecuteCancellation: props.executeCancellationFn,
      },
    });

    Tags.of(this).add('Project', PROJECT_NAME);
    Tags.of(this).add('Environment', currentEnv);
  }
}
