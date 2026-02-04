'use client';

import { InputMode } from '@/app/types';

interface ImageInputSelectorProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
}

/**
 * 画像入力モード切り替えコンポーネント
 * カメラモードとアップロードモードを切り替える
 */
export default function ImageInputSelector({ mode, onModeChange }: ImageInputSelectorProps) {
  return (
    <div className="flex gap-2 p-2 bg-slate-800/90 rounded-lg">
      <button
        onClick={() => onModeChange('camera')}
        className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
          mode === 'camera'
            ? 'bg-sky-500 text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
      >
        📸 カメラ
      </button>
      <button
        onClick={() => onModeChange('upload')}
        className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
          mode === 'upload'
            ? 'bg-sky-500 text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
      >
        📁 アップロード
      </button>
    </div>
  );
}
