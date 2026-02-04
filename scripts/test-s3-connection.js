#!/usr/bin/env node
/**
 * S3接続テストスクリプト
 * ローカル環境でS3への接続と署名付きURL生成をテスト
 */

require('dotenv').config({ path: '.env.local' });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

async function testS3Connection() {
  console.log('=== S3接続テスト開始 ===\n');
  
  // 環境変数チェック
  console.log('1. 環境変数チェック:');
  const region = process.env.NEXT_PUBLIC_REGION;
  const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
  const accessKeyId = process.env.ACCESS_KEY_ID;
  const secretAccessKey = process.env.SECRET_ACCESS_KEY;
  
  console.log(`   NEXT_PUBLIC_REGION: ${region || '❌ 未設定'}`);
  console.log(`   NEXT_PUBLIC_S3_BUCKET_NAME: ${bucketName || '❌ 未設定'}`);
  console.log(`   ACCESS_KEY_ID: ${accessKeyId ? '✅ 設定済み (' + accessKeyId.substring(0, 10) + '...)' : '❌ 未設定'}`);
  console.log(`   SECRET_ACCESS_KEY: ${secretAccessKey ? '✅ 設定済み (****)' : '❌ 未設定'}\n`);
  
  if (!region || !bucketName || !accessKeyId || !secretAccessKey) {
    console.error('❌ 必要な環境変数が不足しています');
    console.error('   .env.localファイルを確認してください\n');
    process.exit(1);
  }
  
  try {
    // S3クライアント初期化
    console.log('2. S3クライアント初期化...');
    const s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      }
    });
    console.log('   ✅ S3クライアント初期化成功\n');
    
    // 署名付きURL生成テスト
    console.log('3. 署名付きURL生成テスト...');
    const testKey = `uploads/test-${Date.now()}.jpg`;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      ContentType: 'image/jpeg'
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300
    });
    
    console.log('   ✅ 署名付きURL生成成功');
    console.log(`   Key: ${testKey}`);
    console.log(`   URL: ${signedUrl.substring(0, 100)}...\n`);
    
    // 実際にアップロードテスト
    console.log('4. 実際のアップロードテスト...');
    const testData = Buffer.from('test image data from local script');
    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      body: testData,
      headers: {
        'Content-Type': 'image/jpeg'
      }
    });
    
    if (uploadResponse.ok) {
      console.log('   ✅ アップロード成功');
      console.log(`   ステータス: ${uploadResponse.status} ${uploadResponse.statusText}\n`);
    } else {
      console.log(`   ❌ アップロード失敗`);
      console.log(`   ステータス: ${uploadResponse.status} ${uploadResponse.statusText}`);
      const errorText = await uploadResponse.text();
      console.log(`   エラー: ${errorText}\n`);
    }
    
    console.log('=== S3接続テスト完了 ===\n');
    console.log('✅ すべてのテストが成功しました！');
    
  } catch (error) {
    console.error('\n❌ エラー発生:');
    console.error(`   メッセージ: ${error.message}`);
    if (error.Code) console.error(`   AWSエラーコード: ${error.Code}`);
    if (error.$metadata) {
      console.error(`   HTTPステータス: ${error.$metadata.httpStatusCode}`);
      console.error(`   リクエストID: ${error.$metadata.requestId}`);
    }
    console.error('\n詳細:', error);
    process.exit(1);
  }
}

// スクリプト実行
testS3Connection();
