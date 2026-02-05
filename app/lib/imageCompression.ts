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
 * @returns 圧縮された画像Blob（JPEG形式）
 */
export async function compressImage(file: File | Blob): Promise<Blob> {
  const originalSize = file.size;
  console.log(`[圧縮開始] 元のサイズ: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);

  try {
    // 圧縮オプション（常に圧縮してJPEGに変換）
    const options = {
      maxSizeMB: MAX_SIZE_MB,
      maxWidthOrHeight: 1920, // 最大解像度
      useWebWorker: true,
      fileType: 'image/jpeg', // 必ずJPEGに変換
      initialQuality: 0.85, // 初期品質
    };

    // 圧縮実行
    const compressedFile = await imageCompression(file as File, options);
    
    const compressedSize = compressedFile.size;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    
    console.log(`[圧縮完了] ${(originalSize / 1024 / 1024).toFixed(2)}MB -> ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio}%削減)`);
    console.log(`[圧縮完了] ファイル形式: ${compressedFile.type}`);
    
    // 5MB以下になっているか確認
    if (compressedSize > MAX_SIZE_BYTES) {
      console.warn(`[警告] 圧縮後も5MBを超えています: ${(compressedSize / 1024 / 1024).toFixed(2)}MB`);
    }
    
    return compressedFile;
  } catch (error) {
    console.error('[圧縮エラー]', error);
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
