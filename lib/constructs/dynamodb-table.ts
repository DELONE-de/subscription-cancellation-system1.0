import { RemovalPolicy } from 'aws-cdk-lib';
import {
  AttributeType,
  BillingMode,
  Table,
  TableEncryption,
  GlobalSecondaryIndexProps,
} from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface DynamoTableProps {
  /** Physical DynamoDB table name */
  tableName: string;
  /** Primary partition key */
  partitionKey: { name: string; type: AttributeType };
  /** Optional sort key for the base table */
  sortKey?: { name: string; type: AttributeType };
  /** Attribute name used for TTL expiry (optional) */
  ttlAttribute?: string;
  /** Global Secondary Indexes to add after table creation */
  gsis?: GlobalSecondaryIndexProps[];
  /** Defaults to DESTROY (dev-friendly); set RETAIN for prod */
  removalPolicy?: RemovalPolicy;
}

export class DynamoTable extends Construct {
  public readonly table: Table;

  constructor(scope: Construct, id: string, props: DynamoTableProps) {
    super(scope, id);

    this.table = new Table(this, 'Resource', {
      tableName: props.tableName,
      partitionKey: props.partitionKey,
      sortKey: props.sortKey,
      billingMode: BillingMode.PAY_PER_REQUEST,   // no capacity planning needed
      encryption: TableEncryption.AWS_MANAGED,     // AWS-managed KMS key
      pointInTimeRecovery: true,                   // 35-day recovery window
      timeToLiveAttribute: props.ttlAttribute,
      removalPolicy: props.removalPolicy ?? RemovalPolicy.DESTROY,
    });

    for (const gsi of props.gsis ?? []) {
      this.table.addGlobalSecondaryIndex(gsi);
    }
  }
}
