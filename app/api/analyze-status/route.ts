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
    
    // 環境変数の取得
    const region = process.env.NEXT_PUBLIC_REGION;
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    const accessKeyId = process.env.ACCESS_KEY_ID;
    const secretAccessKey = process.env.SECRET_ACCESS_KEY;
    
    // 環境変数チェック
    console.log('環境変数チェック:', {
      region: region ? '設定済み' : '未設定',
      tableName: tableName ? '設定済み' : '未設定',
      accessKeyId: accessKeyId ? '設定済み' : '未設定',
      secretAccessKey: secretAccessKey ? '設定済み' : '未設定'
    });
    
    if (!region || !tableName) {
      console.error('AWS設定エラー:', { region, tableName });
      return NextResponse.json(
        { error: 'AWS設定が不足しています（リージョンまたはテーブル名）' },
        { status: 500 }
      );
    }
    
    if (!accessKeyId || !secretAccessKey) {
      console.error('AWS認証情報エラー');
      return NextResponse.json(
        { error: 'AWS認証情報が不足しています' },
        { status: 500 }
      );
    }
    
    // DynamoDBクライアントの初期化
    const dynamoClient = new DynamoDBClient({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      }
    });
    
    // DynamoDBから分析結果を取得
    const command = new GetItemCommand({
      TableName: tableName,
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
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return NextResponse.json(
      { error: `分析ステータスの確認に失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
