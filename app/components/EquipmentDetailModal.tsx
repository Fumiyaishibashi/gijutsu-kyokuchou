'use client';

import { Equipment, RISK_COLORS } from '../types';

interface EquipmentDetailModalProps {
  equipment: Equipment | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 機器名から検索クエリを生成
 * メーカー名や型番を含めてより具体的な検索を可能にする
 * 
 * @param equipmentName - 機器名
 * @param useFullName - フルネームを使用するか（公式マニュアルがある場合はtrue）
 * @returns Google検索用のクエリ文字列
 */
function generateSearchQuery(equipmentName: string, useFullName: boolean = false): string {
  // 公式マニュアルがある場合は、フルネームで検索
  if (useFullName) {
    return `${equipmentName} マニュアル`;
  }
  
  // 機器名をそのまま使用（メーカー名や型番が含まれている場合が多い）
  // 例: "HHKB Professional HYBRIDキーボード" -> "HHKB Professional HYBRID マニュアル"
  
  // 不要な一般名詞（語尾に付くもの）
  const genericTerms = [
    'キーボード',
    'マウス',
    'モニター',
    'ディスプレイ',
    'スピーカー',
    'ヘッドホン',
    'マイク',
    'カメラ',
    '機器',
    '装置',
    'システム',
    'ラックマウント機器',
    'ラックマウント',
    '放送機器',
    '制御装置'
  ];
  
  // 機器名から一般名詞を除去して、メーカー名や型番を抽出
  let specificName = equipmentName.trim();
  let removedTerm = '';
  
  // 一般名詞を除去（語尾のみ）
  for (const term of genericTerms) {
    const regex = new RegExp(term + '$');
    if (regex.test(specificName)) {
      specificName = specificName.replace(regex, '').trim();
      removedTerm = term;
      break; // 最初にマッチしたものだけ除去
    }
  }
  
  // 除去後の文字列をチェック
  // 1. 空になった場合 -> 元の名前を使用
  // 2. 短すぎる場合（3文字未満） -> 元の名前を使用
  // 3. 英数字が含まれている場合 -> メーカー名や型番の可能性が高いのでそのまま使用
  // 4. それ以外 -> 除去した一般名詞を戻す
  
  if (!specificName || specificName.length < 3) {
    // 空または短すぎる -> 元の名前を使用
    specificName = equipmentName;
  } else if (!/[A-Za-z0-9]/.test(specificName)) {
    // 英数字が含まれていない -> メーカー名や型番がない可能性が高い
    // 除去した一般名詞を戻す（例: "不明なケーブル" -> "不明なケーブル マニュアル"）
    if (removedTerm) {
      specificName = equipmentName; // 元の名前を使用
    }
  }
  // else: 英数字が含まれている -> メーカー名や型番がある可能性が高い
  // 例: "HHKB Professional HYBRID" -> そのまま使用
  
  // 検索クエリを生成
  return `${specificName} マニュアル`;
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

          {/* 公式マニュアル */}
          {equipment.manual_url ? (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">公式マニュアル</h3>
              <div className="space-y-2">
                <a
                  href={equipment.manual_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 rounded-lg transition-colors w-full justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span className="text-sm font-medium">マニュアルを開く</span>
                </a>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(generateSearchQuery(equipment.name, true))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors w-full justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-sm font-medium">Googleで検索</span>
                </a>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">マニュアル検索</h3>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(generateSearchQuery(equipment.name, false))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors w-full justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-sm font-medium">Googleで検索</span>
              </a>
            </div>
          )}

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
