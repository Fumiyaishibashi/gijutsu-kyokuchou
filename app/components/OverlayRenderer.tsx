'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Equipment, RISK_COLORS } from '../types';

interface OverlayRendererProps {
  imageUrl: string;
  equipment: Equipment[];
  onEquipmentClick: (equipment: Equipment) => void;
}

type CalloutPosition = 'top' | 'right' | 'bottom' | 'left';

/**
 * オーバーレイレンダラーコンポーネント
 * 画像上にバウンディングボックスと機器情報を表示
 */
export default function OverlayRenderer({ 
  imageUrl, 
  equipment, 
  onEquipmentClick 
}: OverlayRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageDisplay, setImageDisplay] = useState({ 
    width: 0, 
    height: 0,
    offsetX: 0,
    offsetY: 0
  });

  // 画像の実際の表示サイズとオフセットを計算
  const updateImageDisplay = useCallback(() => {
    if (containerRef.current && imageRef.current) {
      const container = containerRef.current;
      const img = imageRef.current;
      
      // コンテナのサイズ
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // 画像の元のサイズ
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      
      if (naturalWidth === 0 || naturalHeight === 0) {
        return; // 画像がまだ読み込まれていない
      }
      
      // アスペクト比を計算
      const imageAspect = naturalWidth / naturalHeight;
      const containerAspect = containerWidth / containerHeight;
      
      let displayWidth, displayHeight, offsetX, offsetY;
      
      if (imageAspect > containerAspect) {
        // 画像が横長 → 幅に合わせる
        displayWidth = containerWidth;
        displayHeight = containerWidth / imageAspect;
        offsetX = 0;
        offsetY = (containerHeight - displayHeight) / 2;
      } else {
        // 画像が縦長 → 高さに合わせる
        displayHeight = containerHeight;
        displayWidth = containerHeight * imageAspect;
        offsetX = (containerWidth - displayWidth) / 2;
        offsetY = 0;
      }
      
      setImageDisplay({
        width: displayWidth,
        height: displayHeight,
        offsetX,
        offsetY
      });
    }
  }, []);

  // 画像読み込み時とリサイズ時にサイズを更新
  useEffect(() => {
    updateImageDisplay();
    window.addEventListener('resize', updateImageDisplay);
    return () => window.removeEventListener('resize', updateImageDisplay);
  }, [updateImageDisplay]);

  // バウンディングボックスのスタイル計算
  const calculateBoundingBoxStyle = (equipment: Equipment): React.CSSProperties => {
    const { bbox } = equipment;
    const { width, height, offsetX, offsetY } = imageDisplay;

    // パーセンテージをピクセルに変換（画像の実際の表示サイズ基準）
    const left = offsetX + (bbox.x / 100) * width;
    const top = offsetY + (bbox.y / 100) * height;
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

  // 吹き出しの最適な配置位置を計算
  const calculateCalloutPosition = (equipment: Equipment): CalloutPosition => {
    const { bbox } = equipment;
    
    // 画面端からの距離を計算（パーセンテージ）
    const distanceFromTop = bbox.y;
    const distanceFromBottom = 100 - (bbox.y + bbox.height);
    const distanceFromLeft = bbox.x;
    const distanceFromRight = 100 - (bbox.x + bbox.width);
    
    // 十分なスペース（30%以上）がある方向を優先
    const spaceThreshold = 30;
    
    // 上部に十分なスペースがあれば上に配置（デフォルト）
    if (distanceFromTop > spaceThreshold) {
      return 'top';
    }
    
    // 下部にスペースがあれば下に配置
    if (distanceFromBottom > spaceThreshold) {
      return 'bottom';
    }
    
    // 左右で広い方に配置
    if (distanceFromRight > distanceFromLeft && distanceFromRight > 20) {
      return 'right';
    }
    
    if (distanceFromLeft > 20) {
      return 'left';
    }
    
    // どこにもスペースがない場合は上に配置
    return 'top';
  };

  // 吹き出しのスタイル計算
  const calculateCalloutStyle = (
    equipment: Equipment, 
    position: CalloutPosition
  ): React.CSSProperties => {
    const { bbox } = equipment;
    const { width, height, offsetX, offsetY } = imageDisplay;

    // バウンディングボックスの中心座標
    const centerX = offsetX + ((bbox.x + bbox.width / 2) / 100) * width;
    const centerY = offsetY + ((bbox.y + bbox.height / 2) / 100) * height;
    
    // バウンディングボックスの端座標
    const boxLeft = offsetX + (bbox.x / 100) * width;
    const boxTop = offsetY + (bbox.y / 100) * height;
    const boxRight = offsetX + ((bbox.x + bbox.width) / 100) * width;
    const boxBottom = offsetY + ((bbox.y + bbox.height) / 100) * height;

    const calloutOffset = 20; // 吹き出しとボックスの間隔

    switch (position) {
      case 'top':
        return {
          position: 'absolute',
          left: `${centerX}px`,
          top: `${boxTop - calloutOffset}px`,
          transform: 'translate(-50%, -100%)',
        };
      case 'bottom':
        return {
          position: 'absolute',
          left: `${centerX}px`,
          top: `${boxBottom + calloutOffset}px`,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          position: 'absolute',
          left: `${boxLeft - calloutOffset}px`,
          top: `${centerY}px`,
          transform: 'translate(-100%, -50%)',
        };
      case 'right':
        return {
          position: 'absolute',
          left: `${boxRight + calloutOffset}px`,
          top: `${centerY}px`,
          transform: 'translateY(-50%)',
        };
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-slate-900"
    >
      {/* 画像 */}
      <div className="relative w-full h-full">
        <Image
          ref={imageRef}
          src={imageUrl}
          alt="分析対象画像"
          fill
          className="object-contain"
          onLoad={updateImageDisplay}
          priority
        />

        {/* オーバーレイ */}
        {imageDisplay.width > 0 && equipment.map((eq, index) => {
          const position = calculateCalloutPosition(eq);
          const color = RISK_COLORS[eq.risk_level];
          
          return (
            <div key={index}>
              {/* バウンディングボックス */}
              <div
                style={calculateBoundingBoxStyle(eq)}
                onClick={() => onEquipmentClick(eq)}
                className="transition-all hover:opacity-80"
              />

              {/* 吹き出し */}
              <div
                style={calculateCalloutStyle(eq, position)}
                onClick={() => onEquipmentClick(eq)}
                className="pointer-events-auto cursor-pointer transition-all hover:scale-105 animate-in fade-in zoom-in duration-300"
              >
                <div 
                  className="relative px-3 py-2 bg-black/90 backdrop-blur-sm rounded-lg shadow-lg max-w-xs"
                  style={{ borderLeft: `4px solid ${color}` }}
                >
                  {/* 機器名 */}
                  <div 
                    className="text-sm font-bold whitespace-nowrap"
                    style={{ color }}
                  >
                    {eq.name}
                  </div>
                  
                  {/* 説明文（あれば） */}
                  {eq.description && (
                    <div className="text-xs text-slate-300 mt-1 whitespace-normal">
                      {eq.description}
                    </div>
                  )}

                  {/* 三角形の「しっぽ」 */}
                  <div
                    className="absolute"
                    style={{
                      ...(position === 'top' && {
                        bottom: '-8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderTop: '8px solid rgba(0, 0, 0, 0.9)',
                      }),
                      ...(position === 'bottom' && {
                        top: '-8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderBottom: '8px solid rgba(0, 0, 0, 0.9)',
                      }),
                      ...(position === 'left' && {
                        right: '-8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 0,
                        height: 0,
                        borderTop: '8px solid transparent',
                        borderBottom: '8px solid transparent',
                        borderLeft: '8px solid rgba(0, 0, 0, 0.9)',
                      }),
                      ...(position === 'right' && {
                        left: '-8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 0,
                        height: 0,
                        borderTop: '8px solid transparent',
                        borderBottom: '8px solid transparent',
                        borderRight: '8px solid rgba(0, 0, 0, 0.9)',
                      }),
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
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
