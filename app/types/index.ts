/**
 * 技術局長 - 型定義
 */

// リスクレベル
export type RiskLevel = 'SAFE' | 'WARNING' | 'DANGER' | 'UNKNOWN';

// バウンディングボックス
export interface BoundingBox {
  x: number;      // パーセンテージ (0-100)
  y: number;      // パーセンテージ (0-100)
  width: number;  // パーセンテージ (0-100)
  height: number; // パーセンテージ (0-100)
}

// 機器情報
export interface Equipment {
  name: string;
  bbox: BoundingBox;
  risk_level: RiskLevel;
  description: string;
}

// 分析結果
export interface AnalysisResult {
  imageKey: string;
  equipment: Equipment[];
  timestamp: number;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
}

// 入力モード
export type InputMode = 'camera' | 'upload';

// アプリケーション状態
export interface AppState {
  inputMode: InputMode;
  selectedImage: {
    blob: Blob | null;
    url: string | null;
    key: string | null;
  };
  analysis: {
    status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
    result: AnalysisResult | null;
    error: string | null;
  };
  ui: {
    selectedEquipment: Equipment | null;
    isModalOpen: boolean;
  };
}

// リスクレベルと色のマッピング
export const RISK_COLORS: Record<RiskLevel, string> = {
  SAFE: '#10B981',      // Emerald-500
  WARNING: '#F59E0B',   // Amber-500
  DANGER: '#EF4444',    // Red-500
  UNKNOWN: '#0EA5E9'    // Sky-500
};
