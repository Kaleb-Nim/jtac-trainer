export default function ScenarioCard() {
  return (
    <div className="absolute top-4 right-4 w-[280px] rounded border border-amber-700/60 bg-black/85 p-3 font-mono text-xs leading-relaxed text-amber-300">
      <div className="mb-2 font-bold tracking-wider">9-LINE BRIEF</div>
      <pre className="whitespace-pre font-mono text-[11px] leading-snug">
{`1. IP:               COWBOY
2. Heading:          150°
3. Distance from IP: 4.2 km
4. Target elevation: [TGT_GRID]
5. Target description: BTR-80 armored personnel carrier
6. Target location:  [TGT_GRID]
7. Mark type:        LASER
8. Friendlies:       SOUTH 120 METERS, MARKED BLUE PANEL
9. Egress:           NORTH`}
      </pre>
    </div>
  );
}
