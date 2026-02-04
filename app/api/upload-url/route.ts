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
    
    // 環境変数チェック
    if (!process.env.AWS_REGION || !process.env.S3_BUCKET_NAME) {
      return NextResponse.json(
        { error: 'AWS設定が不足しています' },
        { status: 500 }
      );
    }
    
    // ファイル名の生成: timestamp-uuid.jpg
    const timestamp = Date.now();
    const uuid = uuidv4();
    const extension = contentType === 'image/png' ? 'png' : 
                     contentType === 'image/webp' ? 'webp' : 'jpg';
    const key = `uploads/${timestamp}-${uuid}.${extension}`;
    
    // S3クライアントの初期化
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      } : undefined
    });
    
    // 署名付きURLの生成
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
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
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
