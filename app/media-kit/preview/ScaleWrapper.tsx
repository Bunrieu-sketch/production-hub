'use client';
import { useEffect, useState, ReactNode } from 'react';

export function ScaleWrapper({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function update() {
      const s = Math.min(1, (window.innerWidth - 32) / 1440);
      setScale(s);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div style={{ width: 1440, margin: '0 auto', transformOrigin: 'top center', transform: `scale(${scale})` }}>
      {children}
    </div>
  );
}
