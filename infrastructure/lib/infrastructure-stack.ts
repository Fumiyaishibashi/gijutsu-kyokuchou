import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';

export class GijutsuKyokuchouStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3バケット - 画像保存用
    const imageBucket = new s3.Bucket(this, 'ImageBucket', {
      bucketName: 'gijutsu-kyokuchou-cteam-images',
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST
          ],
          allowedOrigins: ['*'], // 本番環境では特定のドメインに制限
          allowedHeaders: ['*']
        }
      ],
      lifecycleRules: [
        {
          id: 'DeleteAfter3Days',
          enabled: true,
          expiration: cdk.Duration.days(3)
        }
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true, // HTTPSのみ許可
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 開発環境用
      autoDeleteObjects: true // 開発環境用
    });

    // DynamoDBテーブル - 分析結果保存用
    const resultsTable = new dynamodb.Table(this, 'ResultsTable', {
      tableName: 'gijutsu-kyokuchou-cteam-results',
      partitionKey: {
        name: 'imageKey',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl', // 3日後に自動削除
      removalPolicy: cdk.RemovalPolicy.DESTROY // 開発環境用
    });

    // Lambda関数 - 画像分析用
    const analyzerFunction = new lambda.Function(this, 'AnalyzerFunction', {
      functionName: 'gijutsu-kyokuchou-cteam-analyzer',
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('../lambda/image_analyzer'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        RESULTS_TABLE_NAME: resultsTable.tableName,
        BEDROCK_REGION: 'us-east-1',
        BEDROCK_MODEL_ID: 'us.anthropic.claude-sonnet-4-5-20250514-v1:0'
      }
    });

    // Lambda関数にBedrockアクセス権限を付与（inference profileとfoundation modelの両方）
    analyzerFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: [
        // Foundation Modelへのアクセス（全リージョン対応）
        'arn:aws:bedrock:*::foundation-model/anthropic.claude-*',
        // Inference Profileへのアクセス（全リージョン対応）
        'arn:aws:bedrock:*:*:inference-profile/*'
      ]
    }));

    // Lambda関数にS3読み取り権限を付与
    imageBucket.grantRead(analyzerFunction);

    // Lambda関数にDynamoDB書き込み権限を付与
    resultsTable.grantWriteData(analyzerFunction);

    // S3イベント通知の設定
    imageBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(analyzerFunction),
      { prefix: 'uploads/' }
    );

    // 出力
    new cdk.CfnOutput(this, 'BucketName', {
      value: imageBucket.bucketName,
      description: 'S3 Bucket Name',
      exportName: 'GijutsuKyokuchou-BucketName'
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: resultsTable.tableName,
      description: 'DynamoDB Table Name',
      exportName: 'GijutsuKyokuchou-TableName'
    });

    new cdk.CfnOutput(this, 'FunctionName', {
      value: analyzerFunction.functionName,
      description: 'Lambda Function Name',
      exportName: 'GijutsuKyokuchou-FunctionName'
    });

    new cdk.CfnOutput(this, 'FunctionArn', {
      value: analyzerFunction.functionArn,
      description: 'Lambda Function ARN',
      exportName: 'GijutsuKyokuchou-FunctionArn'
    });
  }
}
