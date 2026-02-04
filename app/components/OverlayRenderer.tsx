'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Equipment, RISK_COLORS } from '../types';

interface OverlayRendererProps {
  imageUrl: string;
  equipment: Equipment[];
  onEquipmentClick: (equipment: Equipment) => void;
}

/**
 * オーバーレイレンダラーコンポーネント
 * 画像上にバウンディングボックスと機器情報を表示
 */
export default function OverlayRenderer({ 
  imageUrl, 
  equipment, 
  onEquipmentClick 
}: OverlayRendererProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // 画像サイズの計算
  const updateImageDimensions = useCallback(() => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.clientWidth,
        height: imageRef.current.clientHeight
      });
    }
  }, []);

  // 画像読み込み時とリサイズ時にサイズを更新
  useEffect(() => {
    updateImageDimensions();
    window.addEventListener('resize', updateImageDimensions);
    return () => window.removeEventListener('resize', updateImageDimensions);
  }, [updateImageDimensions]);

  // バウンディングボックスのスタイル計算
  const calculateBoundingBoxStyle = (equipment: Equipment): React.CSSProperties => {
    const { bbox } = equipment;
    const { width, height } = imageDimensions;

    // パーセンテージをピクセルに変換
    const left = (bbox.x / 100) * width;
    const top = (bbox.y / 100) * height;
    const boxWidth = (bbox.width / 100) * width;
    const boxHeight = (bbox.height / 100) * height;

    return {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${boxWidth}px`,
      height: `${boxHeight}px`,
      border: `4px solid ${RISK_COLORS[equipment.risk_level]}`,
      pointerEvents: 'auto',
      cursor: 'pointer'
    };
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
      {/* 画像 */}
      <div className="relative w-full h-full">
        <Image
          ref={imageRef}
          src={imageUrl}
          alt="分析対象画像"
          fill
          className="object-contain"
          onLoad={updateImageDimensions}
          priority
        />

        {/* オーバーレイ */}
        {imageDimensions.width > 0 && equipment.map((eq, index) => (
          <div key={index}>
            {/* バウンディングボックス */}
            <div
              style={calculateBoundingBoxStyle(eq)}
              onClick={() => onEquipmentClick(eq)}
              className="transition-all hover:opacity-80"
            >
              {/* 機器名ラベル */}
              <div
                className="absolute -top-8 left-0 px-2 py-1 bg-black/75 text-white text-sm font-medium rounded whitespace-nowrap"
                style={{ color: RISK_COLORS[eq.risk_level] }}
              >
                {eq.name}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 機器数表示 */}
      {equipment.length > 0 && (
        <div className="absolute top-4 right-4 px-4 py-2 bg-black/75 text-white rounded-lg">
          <span className="text-sm font-medium">
            検出: {equipment.length}個
          </span>
        </div>
      )}

      {/* 機器が検出されなかった場合 */}
      {equipment.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
          <div className="text-center p-6 bg-slate-800/90 rounded-lg max-w-md">
            <div className="text-4xl mb-2">🔍</div>
            <h3 className="text-lg font-bold text-slate-50 mb-2">
              機器を認識できませんでした
            </h3>
            <p className="text-slate-300 text-sm">
              別の角度から撮影してください
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
