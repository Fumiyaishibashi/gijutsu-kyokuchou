'use client';

import Image from 'next/image';

interface ImagePreviewProps {
  imageUrl: string;
  onConfirm: () => void;
  onRetake: () => void;
}

/**
 * 画像プレビューコンポーネント
 * 選択された画像を表示し、確認または再撮影を選択
 */
export default function ImagePreview({ imageUrl, onConfirm, onRetake }: ImagePreviewProps) {
  return (
    <div className="w-full h-full flex flex-col">
      {/* 画像表示エリア */}
      <div className="flex-1 relative flex items-center justify-center bg-slate-900 p-4 pb-24">
        <div className="relative w-full h-full">
          <Image
            src={imageUrl}
            alt="プレビュー"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* アクションボタン（固定配置） */}
      <div className="fixed bottom-0 left-0 right-0 flex gap-4 p-4 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700 z-50">
        <button
          onClick={onRetake}
          className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-50 font-medium rounded-lg transition-colors"
        >
          🔄 撮り直す
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg transition-colors"
        >
          ✓ 分析する
        </button>
      </div>
    </div>
  );
}
