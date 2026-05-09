'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

export default function Reticle() {
  const grid = useStore((s) => s.reticleGrid);
  const lasedRange = useStore((s) => s.lasedRange);
  const lasePulseAt = useStore((s) => s.lasePulseAt);

  const [flashOn, setFlashOn] = useState(false);
  const [pulseScale, setPulseScale] = useState(1);

  // Phase 3: lase visual feedback.
  // 80 ms full-screen amber flash + 200 ms reticle pulse (1.4× → 1.0×).
  // Keyed off lasePulseAt so a subsequent lase re-triggers cleanly.
  useEffect(() => {
    if (!lasePulseAt) return;
    setFlashOn(true);
    setPulseScale(1.4);
    const flashT = setTimeout(() => setFlashOn(false), 80);
    const pulseT = setTimeout(() => setPulseScale(1), 200);
    return () => {
      clearTimeout(flashT);
      clearTimeout(pulseT);
    };
  }, [lasePulseAt]);

  const rngText = lasedRange != null
    ? `RNG  ${String(Math.round(lasedRange)).padStart(4, '0')} m`
    : null;

  return (
    <>
      {/* Full-screen amber lase flash overlay (80 ms). */}
      <div
        className="pointer-events-none fixed inset-0 transition-opacity duration-75"
        style={{
          backgroundColor: '#ffb000',
          opacity: flashOn ? 0.06 : 0,
          zIndex: 30,
        }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{
            transform: `scale(${pulseScale})`,
            transition: 'transform 200ms ease-out',
          }}
        >
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
          {/* HUD readouts */}
          <div
            className="absolute font-mono text-sm"
            style={{
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#ffb84d',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            <div>GRID: {grid}</div>
            {rngText !== null && <div style={{ marginTop: 2 }}>{rngText}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
