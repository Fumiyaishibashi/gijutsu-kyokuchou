import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

/**
 * 分析ステータス確認APIルート
 * GET /api/analyze-status?key=<imageKey>
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageKey = searchParams.get('key');
    
    if (!imageKey) {
      return NextResponse.json(
        { error: 'Missing image key' },
        { status: 400 }
      );
    }
    
    // 環境変数チェック
    if (!process.env.NEXT_PUBLIC_REGION || !process.env.DYNAMODB_TABLE_NAME) {
      return NextResponse.json(
        { error: 'AWS設定が不足しています' },
        { status: 500 }
      );
    }
    
    // DynamoDBクライアントの初期化
    const dynamoClient = new DynamoDBClient({
      region: process.env.NEXT_PUBLIC_REGION,
      credentials: process.env.ACCESS_KEY_ID && process.env.SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY
      } : undefined
    });
    
    // DynamoDBから分析結果を取得
    const command = new GetItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: {
        imageKey: { S: imageKey }
      }
    });
    
    const response = await dynamoClient.send(command);
    
    // 結果が見つからない場合は処理中
    if (!response.Item) {
      return NextResponse.json({
        status: 'processing'
      });
    }
    
    // 結果をアンマーシャル
    const item = unmarshall(response.Item);
    
    // 結果をパース
    const result = typeof item.result === 'string' 
      ? JSON.parse(item.result) 
      : item.result;
    
    console.log('分析結果取得成功:', { imageKey, equipmentCount: result.equipment?.length });
    
    return NextResponse.json({
      status: 'completed',
      result: result
    });
  } catch (error) {
    console.error('分析ステータス確認エラー:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
