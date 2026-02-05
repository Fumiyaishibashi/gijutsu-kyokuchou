'use client';

import { useRef, useCallback, useState } from 'react';
import Webcam from 'react-webcam';

interface CameraCaptureProps {
  onCapture: (imageBlob: Blob) => void;
  onError: (error: Error) => void;
}

/**
 * カメラキャプチャコンポーネント
 * デバイスのカメラを使用して写真を撮影
 */
export default function CameraCapture({ onCapture, onError }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // カメラ権限エラーハンドリング
  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error('カメラアクセスエラー:', error);
    setHasPermission(false);
    onError(new Error('カメラへのアクセスが拒否されました。設定からカメラ権限を許可してください'));
  }, [onError]);

  // カメラ権限取得成功
  const handleUserMedia = useCallback(() => {
    setHasPermission(true);
  }, []);

  // 写真撮影
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      // Base64をBlobに変換
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          onCapture(blob);
        })
        .catch(error => {
          console.error('画像変換エラー:', error);
          onError(error);
        });
    }
  }, [onCapture, onError]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {hasPermission === false && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10">
          <div className="text-center p-6 max-w-md">
            <div className="text-6xl mb-4">📷</div>
            <h3 className="text-xl font-bold text-slate-50 mb-2">
              カメラアクセスが必要です
            </h3>
            <p className="text-slate-300 mb-4">
              機器を撮影するには、カメラへのアクセスを許可してください。
            </p>
            <p className="text-sm text-slate-400">
              ブラウザの設定からカメラ権限を有効にするか、アップロードモードをご利用ください。
            </p>
          </div>
        </div>
      )}

      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        screenshotQuality={0.9}
        videoConstraints={{
          facingMode: 'environment', // バックカメラを優先
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }}
        onUserMedia={handleUserMedia}
        onUserMediaError={handleUserMediaError}
        className="w-full h-full object-contain"
      />

      <button
        onClick={capture}
        disabled={hasPermission === false}
        className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full shadow-lg transition-all flex items-center justify-center z-50 ${
          hasPermission === false
            ? 'bg-slate-600 cursor-not-allowed opacity-30' 
            : 'bg-sky-500 hover:bg-sky-600 hover:scale-110 active:scale-95 cursor-pointer'
        }`}
      >
        <div className="w-12 h-12 bg-white rounded-full"></div>
      </button>
    </div>
  );
}
