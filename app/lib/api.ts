/**
 * API関数
 */

import { AnalysisResult } from '../types';

/**
 * 署名付きURLを取得
 */
export async function getSignedUploadUrl(contentType: string): Promise<{
  uploadUrl: string;
  key: string;
}> {
  const response = await fetch('/api/upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ contentType })
  });
  
  if (!response.ok) {
    throw new Error('署名付きURLの取得に失敗しました');
  }
  
  return response.json();
}

/**
 * S3に画像をアップロード
 */
export async function uploadToS3(
  signedUrl: string, 
  file: Blob,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // プログレス監視
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
    }
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve();
      } else {
        reject(new Error(`アップロード失敗: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('ネットワークエラーが発生しました'));
    });
    
    xhr.addEventListener('abort', () => {
      reject(new Error('アップロードがキャンセルされました'));
    });
    
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * 分析ステータスをポーリング
 */
export async function pollAnalysisStatus(
  imageKey: string,
  maxAttempts: number = 30,
  intervalMs: number = 1000
): Promise<AnalysisResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`/api/analyze-status?key=${encodeURIComponent(imageKey)}`);
    
    if (!response.ok) {
      throw new Error('分析ステータスの確認に失敗しました');
    }
    
    const data = await response.json();
    
    if (data.status === 'completed') {
      return {
        imageKey,
        equipment: data.result.equipment || [],
        timestamp: Date.now(),
        status: 'completed'
      };
    }
    
    if (data.status === 'failed') {
      throw new Error(data.error || '分析に失敗しました');
    }
    
    // 次のポーリングまで待機
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error('分析がタイムアウトしました。もう一度お試しください');
}

/**
 * 画像をアップロードして分析
 */
export async function uploadAndAnalyze(
  file: Blob,
  onProgress?: (progress: number) => void
): Promise<AnalysisResult> {
  // 1. 署名付きURL取得
  const { uploadUrl, key } = await getSignedUploadUrl(file.type);
  
  // 2. S3にアップロード
  await uploadToS3(uploadUrl, file, onProgress);
  
  // 3. 分析完了を待機
  const result = await pollAnalysisStatus(key);
  
  return result;
}
