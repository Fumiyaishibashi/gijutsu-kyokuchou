'use client';

import { useState } from 'react';
import ImageInputSelector from './components/ImageInputSelector';
import CameraCapture from './components/CameraCapture';
import FileUpload from './components/FileUpload';
import ImagePreview from './components/ImagePreview';
import OverlayRenderer from './components/OverlayRenderer';
import EquipmentDetailModal from './components/EquipmentDetailModal';
import LoadingIndicator from './components/LoadingIndicator';
import ErrorMessage from './components/ErrorMessage';
import { InputMode, Equipment, AnalysisResult } from './types';
import { uploadAndAnalyze } from './lib/api';

type AppStatus = 'idle' | 'preview' | 'uploading' | 'analyzing' | 'completed' | 'error';

export default function Home() {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [selectedImage, setSelectedImage] = useState<{
    blob: Blob | null;
    url: string | null;
  }>({
    blob: null,
    url: null
  });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // 画像選択ハンドラ
  const handleImageSelect = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setSelectedImage({ blob, url });
    setStatus('preview');
    setError(null);
  };

  // エラーハンドラ
  const handleError = (error: Error) => {
    console.error('エラー:', error);
    setError(error.message);
    setStatus('error');
  };

  // 撮り直し/再選択
  const handleRetake = () => {
    if (selectedImage.url) {
      URL.revokeObjectURL(selectedImage.url);
    }
    setSelectedImage({ blob: null, url: null });
    setAnalysisResult(null);
    setError(null);
    setStatus('idle');
    setUploadProgress(0);
  };

  // 分析開始
  const handleConfirm = async () => {
    if (!selectedImage.blob) return;

    try {
      setStatus('uploading');
      setUploadProgress(0);

      // 画像をアップロードして分析
      const result = await uploadAndAnalyze(
        selectedImage.blob,
        (progress) => {
          setUploadProgress(progress);
          if (progress >= 100) {
            setStatus('analyzing');
          }
        }
      );

      setAnalysisResult(result);
      setStatus('completed');
    } catch (error) {
      handleError(error as Error);
    }
  };

  // 再試行
  const handleRetry = () => {
    setError(null);
    if (status === 'error' && selectedImage.blob) {
      setStatus('preview');
    } else {
      handleRetake();
    }
  };

  // 機器クリックハンドラ
  const handleEquipmentClick = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setSelectedEquipment(null);
  };

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* ヘッダー */}
      <header className="p-4 bg-slate-900/50 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-center">
          🎬 技術局長
        </h1>
        <p className="text-sm text-slate-400 text-center mt-1">
          放送機器安全確認アプリ
        </p>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 画像入力モード */}
        {status === 'idle' && (
          <div className="flex-1 flex flex-col p-4 gap-4">
            <ImageInputSelector 
              mode={inputMode} 
              onModeChange={setInputMode} 
            />
            
            <div className="flex-1 overflow-hidden">
              {inputMode === 'camera' ? (
                <CameraCapture 
                  onCapture={handleImageSelect}
                  onError={handleError}
                />
              ) : (
                <FileUpload 
                  onFileSelect={handleImageSelect}
                  onError={handleError}
                />
              )}
            </div>
          </div>
        )}

        {/* 画像プレビュー */}
        {status === 'preview' && selectedImage.url && (
          <ImagePreview 
            imageUrl={selectedImage.url}
            onConfirm={handleConfirm}
            onRetake={handleRetake}
          />
        )}

        {/* 分析結果表示 */}
        {status === 'completed' && selectedImage.url && analysisResult && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-hidden">
              <OverlayRenderer 
                imageUrl={selectedImage.url}
                equipment={analysisResult.equipment}
                onEquipmentClick={handleEquipmentClick}
              />
            </div>
            
            {/* アクションボタン */}
            <div className="p-4 bg-slate-800/90 border-t border-slate-700">
              <button
                onClick={handleRetake}
                className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-50 font-medium rounded-lg transition-colors"
              >
                🔄 新しい画像を分析
              </button>
            </div>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="p-2 bg-slate-900/50 border-t border-slate-800 text-center text-xs text-slate-500">
        MBS Hackathon 2026 - C班
      </footer>

      {/* ローディング */}
      {(status === 'uploading' || status === 'analyzing') && (
        <LoadingIndicator 
          message={status === 'uploading' ? 'アップロード中...' : 'AI分析中...'}
          progress={status === 'uploading' ? uploadProgress : undefined}
        />
      )}

      {/* エラー表示 */}
      {status === 'error' && error && (
        <ErrorMessage 
          message={error}
          onRetry={handleRetry}
        />
      )}

      {/* 機器詳細モーダル */}
      <EquipmentDetailModal 
        equipment={selectedEquipment}
        isOpen={selectedEquipment !== null}
        onClose={handleCloseModal}
      />
    </div>
  );
}


