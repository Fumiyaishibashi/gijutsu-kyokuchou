'use client';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

/**
 * エラーメッセージコンポーネント
 * エラー内容と再試行ボタンを表示
 */
export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  // エラータイプに応じたアイコンとタイトル
  const getErrorInfo = (msg: string) => {
    if (msg.includes('ネットワーク')) {
      return { icon: '📡', title: 'ネットワークエラー' };
    } else if (msg.includes('タイムアウト')) {
      return { icon: '⏱️', title: 'タイムアウト' };
    } else if (msg.includes('認識できませんでした')) {
      return { icon: '🔍', title: '機器未検出' };
    } else if (msg.includes('カメラ')) {
      return { icon: '📷', title: 'カメラエラー' };
    } else if (msg.includes('サイズ')) {
      return { icon: '📏', title: 'ファイルサイズエラー' };
    } else if (msg.includes('形式')) {
      return { icon: '📄', title: 'ファイル形式エラー' };
    } else {
      return { icon: '⚠️', title: 'エラー' };
    }
  };

  const errorInfo = getErrorInfo(message);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border-l-4 border-red-500">
        {/* ヘッダー */}
        <div className="p-6 bg-red-500/10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{errorInfo.icon}</span>
            <h2 className="text-xl font-bold text-slate-50">
              {errorInfo.title}
            </h2>
          </div>
        </div>

        {/* メッセージ */}
        <div className="p-6">
          <p className="text-slate-200 leading-relaxed">
            {message}
          </p>
        </div>

        {/* アクション */}
        <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 px-4 py-3 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              再試行
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
