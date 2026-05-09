'use client';

import { useStore } from '@/lib/store';

export default function Reticle() {
  const grid = useStore((s) => s.reticleGrid);
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative">
        {/* crosshair */}
        <span
          className="absolute"
          style={{
            left: '-8px',
            top: '-1px',
            width: '16px',
            height: '2px',
            backgroundColor: '#a3ff7a',
          }}
        />
        <span
          className="absolute"
          style={{
            left: '-1px',
            top: '-8px',
            width: '2px',
            height: '16px',
            backgroundColor: '#a3ff7a',
          }}
        />
        {/* grid readout */}
        <div
          className="absolute font-mono text-sm"
          style={{
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#ffb84d',
            whiteSpace: 'nowrap',
          }}
        >
          GRID: {grid}
        </div>
      </div>
    </div>
  );
}
