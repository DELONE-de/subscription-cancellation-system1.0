import { Duration } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Alarm, Metric, ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export interface ObservabilityConstructProps {
  functions: Record<string, Function>;
}

export class ObservabilityConstruct extends Construct {
  constructor(scope: Construct, id: string, props: ObservabilityConstructProps) {
    super(scope, id);

    for (const [name, fn] of Object.entries(props.functions)) {
      // Error alarm: ≥1 error in a 1-minute window
      new Alarm(this, `${name}ErrorAlarm`, {
        alarmName: `${fn.functionName}-errors`,
        alarmDescription: `Lambda errors for ${fn.functionName}`,
        metric: new Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          dimensionsMap: { FunctionName: fn.functionName },
          statistic: 'Sum',
          period: Duration.minutes(1),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      });

      // Duration alarm: p99 > 10s
      new Alarm(this, `${name}DurationAlarm`, {
        alarmName: `${fn.functionName}-high-duration`,
        alarmDescription: `High latency for ${fn.functionName}`,
        metric: new Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          dimensionsMap: { FunctionName: fn.functionName },
          statistic: 'p99',
          period: Duration.minutes(5),
        }),
        threshold: 10000, // 10 seconds in ms
        evaluationPeriods: 2,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      });

      // Throttles alarm: ≥1 throttle
      new Alarm(this, `${name}ThrottleAlarm`, {
        alarmName: `${fn.functionName}-throttles`,
        alarmDescription: `Throttles for ${fn.functionName}`,
        metric: new Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Throttles',
          dimensionsMap: { FunctionName: fn.functionName },
          statistic: 'Sum',
          period: Duration.minutes(1),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      });
    }
  }
}
