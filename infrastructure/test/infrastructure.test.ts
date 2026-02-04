import * as cdk from 'aws-cdk-lib/core';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { GijutsuKyokuchouStack } from '../lib/infrastructure-stack';

describe('GijutsuKyokuchouStack', () => {
  let app: cdk.App;
  let stack: GijutsuKyokuchouStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new GijutsuKyokuchouStack(app, 'TestStack', {
      env: { account: '727598134232', region: 'us-east-1' }
    });
    template = Template.fromStack(stack);
  });

  test('S3バケットが正しい命名規則で作成される', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'gijutsu-kyokuchou-cteam-images'
    });
  });

  test('S3バケットにライフサイクルポリシーが設定される', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            ExpirationInDays: 3,
            Status: 'Enabled'
          })
        ])
      }
    });
  });

  test('S3バケットにCORS設定がある', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      CorsConfiguration: {
        CorsRules: Match.arrayWith([
          Match.objectLike({
            AllowedMethods: Match.arrayWith(['GET', 'PUT', 'POST']),
            AllowedOrigins: ['*']
          })
        ])
      }
    });
  });

  test('DynamoDBテーブルが正しい命名規則で作成される', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'gijutsu-kyokuchou-cteam-results',
      BillingMode: 'PAY_PER_REQUEST'
    });
  });

  test('DynamoDBテーブルにTTL属性が設定される', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TimeToLiveSpecification: {
        AttributeName: 'ttl',
        Enabled: true
      }
    });
  });

  test('Lambda関数が正しい命名規則で作成される', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'gijutsu-kyokuchou-cteam-analyzer',
      Runtime: 'python3.12',
      Timeout: 30,
      MemorySize: 1024
    });
  });

  test('Lambda関数にBedrock権限が付与される', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'bedrock:InvokeModel',
            Effect: 'Allow',
            Resource: Match.stringLikeRegexp('.*anthropic.claude-3-5-sonnet.*')
          })
        ])
      }
    });
  });

  test('S3イベント通知が設定される', () => {
    template.hasResourceProperties('Custom::S3BucketNotifications', {
      NotificationConfiguration: {
        LambdaFunctionConfigurations: Match.arrayWith([
          Match.objectLike({
            Events: ['s3:ObjectCreated:*'],
            Filter: {
              Key: {
                FilterRules: [
                  {
                    Name: 'prefix',
                    Value: 'uploads/'
                  }
                ]
              }
            }
          })
        ])
      }
    });
  });

  test('スタックスナップショット', () => {
    expect(template.toJSON()).toMatchSnapshot();
  });
});
