import { CfnOutput } from 'aws-cdk-lib';
import { HttpApi, HttpMethod, CorsHttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface ApiGatewayProps {
  createSubscriptionFn: Function;
  cancelNowFn: Function;
  stageName: string;
}

export class ApiGateway extends Construct {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiGatewayProps) {
    super(scope, id);

    const api = new HttpApi(this, 'HttpApi', {
      apiName: `subscription-api-${props.stageName}`,
      corsPreflight: {
        allowOrigins: ['*'],
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST, CorsHttpMethod.DELETE, CorsHttpMethod.OPTIONS],
      },
    });

    api.addRoutes({
      path: '/subscriptions',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('CreateSubscriptionIntegration', props.createSubscriptionFn),
    });

    api.addRoutes({
      path: '/subscriptions/{subscriptionId}',
      methods: [HttpMethod.DELETE],
      integration: new HttpLambdaIntegration('CancelNowIntegration', props.cancelNowFn),
    });

    this.apiUrl = api.url!;

    new CfnOutput(scope, 'ApiUrl', { value: this.apiUrl });
  }
}
