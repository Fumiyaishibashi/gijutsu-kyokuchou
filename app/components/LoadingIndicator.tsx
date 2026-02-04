'use client';

interface LoadingIndicatorProps {
  message: string;
  progress?: number;
}

/**
 * ローディングインジケーターコンポーネント
 * レーダースキャンアニメーション付き
 */
export default function LoadingIndicator({ message, progress }: LoadingIndicatorProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">
      <div className="text-center">
        {/* レーダースキャンアニメーション */}
        <div className="relative w-32 h-32 mx-auto mb-6">
          {/* 外側のリング */}
          <div className="absolute inset-0 rounded-full border-4 border-sky-500/20"></div>
          
          {/* 中間のリング */}
          <div className="absolute inset-4 rounded-full border-4 border-sky-500/30"></div>
          
          {/* 内側のリング */}
          <div className="absolute inset-8 rounded-full border-4 border-sky-500/40"></div>
          
          {/* 回転するスキャンライン */}
          <div className="absolute inset-0 animate-spin">
            <div className="absolute top-1/2 left-1/2 w-16 h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent transform -translate-x-1/2 -translate-y-1/2 origin-left"></div>
          </div>
          
          {/* 中央のアイコン */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl animate-pulse">🔍</div>
          </div>
        </div>

        {/* メッセージ */}
        <h3 className="text-xl font-bold text-slate-50 mb-2">
          {message}
        </h3>

        {/* プログレスバー */}
        {progress !== undefined && (
          <div className="w-64 mx-auto">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* ヒント */}
        <p className="text-sm text-slate-400 mt-4 max-w-md">
          AI が画像を分析しています...
        </p>
      </div>

      {/* CSSアニメーション */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
