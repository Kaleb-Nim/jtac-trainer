'use client';

import { useRealtimeVoice } from '@/hooks/useRealtimeVoice';
import Scene from '@/scene/Scene';
import Reticle from '@/components/Reticle';
import ScenarioCard from '@/components/ScenarioCard';
import TalkButton from '@/components/TalkButton';
import DebugPanel from '@/components/DebugPanel';
import EndRunButton from '@/components/EndRunButton';
import DebriefPanel from '@/components/DebriefPanel';

export default function Home() {
  // useRealtimeVoice() called EXACTLY ONCE in the page tree — slices passed to
  // child components as props. Calling the hook in two components would create
  // two parallel WebSocket sessions (Phase 1 race-fix invariant).
  const { status, connect, disconnect, isConnected } = useRealtimeVoice();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black font-mono text-zinc-100">
      {/* Visually-hidden H1 for accessibility + voice-smoke.ts regression contract. */}
      <h1 className="sr-only absolute -top-[9999px] left-[-9999px]">JTAC Trainer</h1>
      <Scene />
      <Reticle />
      <ScenarioCard />
      <TalkButton
        status={status}
        connect={connect}
        disconnect={disconnect}
        isConnected={isConnected}
      />
      <DebugPanel transcript={status.transcript} responseText={status.responseText} />
      <EndRunButton />
      <DebriefPanel />
    </main>
  );
}
