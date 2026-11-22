import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const threshold = 65;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0 && !isRefreshing) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff > 0 && window.scrollY <= 0) {
      // Damped pull effect
      const damped = Math.min(diff * 0.45, 90);
      setPullY(damped);
    } else {
      setPullY(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current || isRefreshing) return;
    isPulling.current = false;

    if (pullY >= threshold) {
      setIsRefreshing(true);
      setPullY(50);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullY(0);
        }, 500);
      }
    } else {
      setPullY(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-screen"
    >
      {/* Pull down visual spinner container */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex justify-center items-center pointer-events-none transition-all duration-200"
        style={{
          transform: `translateY(${pullY}px)`,
          opacity: pullY > 10 ? Math.min(pullY / threshold, 1) : 0,
        }}
      >
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-full p-2.5 shadow-lg border border-sky-200 dark:border-sky-800 flex items-center justify-center">
          <Loader2
            className={`w-6 h-6 text-[#0284c7] ${isRefreshing ? 'animate-spin' : ''}`}
            style={{
              transform: isRefreshing ? undefined : `rotate(${pullY * 4}deg)`,
            }}
          />
        </div>
      </div>

      {/* Main Content with subtle push during pull */}
      <div
        style={{
          transform: pullY > 0 ? `translateY(${pullY * 0.5}px)` : 'none',
          transition: isPulling.current ? 'none' : 'transform 0.25s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};
