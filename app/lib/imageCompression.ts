/**
 * 画像圧縮ユーティリティ
 * Bedrockの5MB制限に対応するため、フロントエンドで画像を圧縮
 */

import imageCompression from 'browser-image-compression';

// Bedrockの画像サイズ制限: 5MB
const MAX_SIZE_MB = 4.5; // 余裕を持って4.5MBに設定
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/**
 * 画像を圧縮してBlobを返す
 * 
 * @param file - 元の画像ファイル
 * @returns 圧縮された画像Blob
 */
export async function compressImage(file: File | Blob): Promise<Blob> {
  // ファイルサイズが既に制限以下の場合はそのまま返す
  if (file.size <= MAX_SIZE_BYTES) {
    console.log(`画像サイズは制限以下です: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    return file;
  }

  console.log(`画像を圧縮します: ${(file.size / 1024 / 1024).toFixed(2)}MB -> 目標: ${MAX_SIZE_MB}MB`);

  try {
    // 圧縮オプション
    const options = {
      maxSizeMB: MAX_SIZE_MB,
      maxWidthOrHeight: 1920, // 最大解像度
      useWebWorker: true,
      fileType: 'image/jpeg', // JPEGに変換
      initialQuality: 0.8, // 初期品質
    };

    // 圧縮実行
    const compressedFile = await imageCompression(file as File, options);
    
    console.log(`圧縮完了: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
    
    return compressedFile;
  } catch (error) {
    console.error('画像圧縮エラー:', error);
    throw new Error('画像の圧縮に失敗しました');
  }
}

/**
 * Base64文字列をBlobに変換
 * 
 * @param base64 - Base64エンコードされた画像データ
 * @param mimeType - MIMEタイプ（デフォルト: image/jpeg）
 * @returns Blob
 */
export function base64ToBlob(base64: string, mimeType: string = 'image/jpeg'): Blob {
  // data:image/jpeg;base64, のプレフィックスを除去
  const base64Data = base64.split(',')[1] || base64;
  
  // Base64をバイナリに変換
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
