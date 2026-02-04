import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

/**
 * S3署名付きURL生成APIルート
 * POST /api/upload-url
 */
export async function POST(request: NextRequest) {
  try {
    const { contentType } = await request.json();
    
    // 環境変数の取得
    const region = process.env.NEXT_PUBLIC_REGION || process.env.AWS_REGION || 'us-east-1';
    const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
    const accessKeyId = process.env.NEXT_PUBLIC_ACCESS_KEY_ID;
    const secretAccessKey = process.env.NEXT_PUBLIC_SECRET_ACCESS_KEY;
    
    // 環境変数チェック（デバッグ用）
    console.log('環境変数チェック:', {
      region: region ? '設定済み' : '未設定',
      bucketName: bucketName ? '設定済み' : '未設定',
      accessKeyId: accessKeyId ? `設定済み(${accessKeyId.substring(0, 4)}...)` : '未設定',
      secretAccessKey: secretAccessKey ? '設定済み' : '未設定'
    });
    
    if (!region || !bucketName || !accessKeyId || !secretAccessKey) {
      console.error('AWS設定エラー:', { region, bucketName, accessKeyId: accessKeyId ? 'あり' : 'なし', secretAccessKey: secretAccessKey ? 'あり' : 'なし' });
      return NextResponse.json(
        { error: 'AWS設定が不足しています（リージョン、バケット名、または認証情報）' },
        { status: 500 }
      );
    }
    
    // ファイル名の生成: timestamp-uuid.jpg
    const timestamp = Date.now();
    const uuid = uuidv4();
    const extension = contentType === 'image/png' ? 'png' : 
                     contentType === 'image/webp' ? 'webp' : 'jpg';
    const key = `uploads/${timestamp}-${uuid}.${extension}`;
    
    // S3クライアントの初期化（Amplify環境では明示的に認証情報を渡す必要がある）
    const s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      }
    });
    
    // 署名付きURLの生成
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300 // 5分間有効
    });
    
    console.log('署名付きURL生成成功:', { key, contentType });
    
    return NextResponse.json({
      uploadUrl: signedUrl,
      key: key
    });
  } catch (error) {
    console.error('署名付きURL生成エラー:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return NextResponse.json(
      { error: `署名付きURLの生成に失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
