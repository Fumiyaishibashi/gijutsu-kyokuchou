'use client';

import { Equipment, RISK_COLORS } from '../types';

interface EquipmentDetailModalProps {
  equipment: Equipment | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 機器詳細モーダルコンポーネント
 * 選択された機器の詳細情報を表示
 */
export default function EquipmentDetailModal({ 
  equipment, 
  isOpen, 
  onClose 
}: EquipmentDetailModalProps) {
  if (!isOpen || !equipment) return null;

  // リスクレベルのラベルと説明
  const riskInfo = {
    SAFE: { label: '安全', icon: '✓', description: '安全に操作できます' },
    WARNING: { label: '警告', icon: '⚠️', description: '確認が必要です' },
    DANGER: { label: '危険', icon: '⛔', description: '触らないでください' },
    UNKNOWN: { label: '不明', icon: '❓', description: '識別できませんでした' }
  };

  const info = riskInfo[equipment.risk_level];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div 
          className="p-6 border-b border-slate-700"
          style={{ borderLeftColor: RISK_COLORS[equipment.risk_level], borderLeftWidth: '4px' }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{info.icon}</span>
                <span 
                  className="text-sm font-bold px-2 py-1 rounded"
                  style={{ 
                    backgroundColor: `${RISK_COLORS[equipment.risk_level]}20`,
                    color: RISK_COLORS[equipment.risk_level]
                  }}
                >
                  {info.label}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-50">
                {equipment.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-4">
          {/* 説明 */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">説明</h3>
            <p className="text-slate-50">{equipment.description}</p>
          </div>

          {/* リスクレベル詳細 */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">リスクレベル</h3>
            <p className="text-slate-300">{info.description}</p>
          </div>

          {/* 位置情報 */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">位置情報</h3>
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              <div className="bg-slate-900/50 p-2 rounded">
                <span className="text-slate-400">X:</span>{' '}
                <span className="text-slate-50">{equipment.bbox.x.toFixed(1)}%</span>
              </div>
              <div className="bg-slate-900/50 p-2 rounded">
                <span className="text-slate-400">Y:</span>{' '}
                <span className="text-slate-50">{equipment.bbox.y.toFixed(1)}%</span>
              </div>
              <div className="bg-slate-900/50 p-2 rounded">
                <span className="text-slate-400">幅:</span>{' '}
                <span className="text-slate-50">{equipment.bbox.width.toFixed(1)}%</span>
              </div>
              <div className="bg-slate-900/50 p-2 rounded">
                <span className="text-slate-400">高さ:</span>{' '}
                <span className="text-slate-50">{equipment.bbox.height.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 bg-slate-900/50 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
