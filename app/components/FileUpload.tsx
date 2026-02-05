'use client';

import { useCallback, useState } from 'react';
import { compressImage } from '../lib/imageCompression';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onError: (error: Error) => void;
  maxSizeBytes?: number;
}

// カスタムエラークラス
class FileSizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileSizeError';
  }
}

class UnsupportedFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFormatError';
  }
}

/**
 * ファイルアップロードコンポーネント
 * ローカルファイルシステムから画像を選択
 */
export default function FileUpload({ 
  onFileSelect, 
  onError, 
  maxSizeBytes = 10 * 1024 * 1024 // デフォルト10MB
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  // ファイル検証
  const validateFile = useCallback((file: File) => {
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    
    // ファイルサイズチェック
    if (file.size > maxSizeBytes) {
      throw new FileSizeError(
        `画像サイズが大きすぎます。${Math.round(maxSizeBytes / 1024 / 1024)}MB以下の画像を選択してください`
      );
    }
    
    // ファイル形式チェック
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new UnsupportedFormatError(
        '対応していない画像形式です。JPEG、PNG、またはWEBP形式の画像を選択してください'
      );
    }
  }, [maxSizeBytes]);

  // ファイル選択ハンドラ（圧縮処理を追加）
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        validateFile(file);
        
        // 画像を圧縮（5MB制限対応）
        const compressedBlob = await compressImage(file);
        
        // BlobをFileに変換
        const compressedFile = new File([compressedBlob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        
        onFileSelect(compressedFile);
      } catch (error) {
        onError(error as Error);
      }
    }
  }, [validateFile, onFileSelect, onError]);

  // ドラッグ&ドロップハンドラ
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  // ドラッグ&ドロップハンドラ（圧縮処理を追加）
  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      try {
        validateFile(file);
        
        // 画像を圧縮（5MB制限対応）
        const compressedBlob = await compressImage(file);
        
        // BlobをFileに変換
        const compressedFile = new File([compressedBlob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        
        onFileSelect(compressedFile);
      } catch (error) {
        onError(error as Error);
      }
    }
  }, [validateFile, onFileSelect, onError]);

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          w-full max-w-2xl h-96 
          border-4 border-dashed rounded-2xl
          flex flex-col items-center justify-center
          cursor-pointer transition-all
          ${isDragging 
            ? 'border-sky-500 bg-sky-500/10' 
            : 'border-slate-600 hover:border-slate-500 bg-slate-800/50 hover:bg-slate-800/70'
          }
        `}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="text-center">
          <div className="text-6xl mb-4">
            {isDragging ? '📥' : '📁'}
          </div>
          <h3 className="text-xl font-bold text-slate-50 mb-2">
            {isDragging ? 'ここにドロップ' : '画像を選択'}
          </h3>
          <p className="text-slate-300 mb-4">
            クリックして画像を選択、またはドラッグ&ドロップ
          </p>
          <div className="text-sm text-slate-400 space-y-1">
            <p>対応形式: JPEG, PNG, WEBP</p>
            <p>最大サイズ: {Math.round(maxSizeBytes / 1024 / 1024)}MB</p>
          </div>
        </div>
      </label>
    </div>
  );
}

// エラークラスをエクスポート
export { FileSizeError, UnsupportedFormatError };
