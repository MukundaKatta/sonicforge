"use client";

import { Sidebar } from "@/components/ui/Sidebar";
import { Header } from "@/components/ui/Header";
import { TextToSoundPanel } from "@/components/generators/TextToSoundPanel";
import { CategoriesPanel } from "@/components/generators/CategoriesPanel";
import { WorkstationPanel } from "@/components/workstation/WorkstationPanel";
import { SoundscapePanel } from "@/components/generators/SoundscapePanel";
import { GameAudioPanel } from "@/components/generators/GameAudioPanel";
import { LoopMakerPanel } from "@/components/generators/LoopMakerPanel";
import { ProcessingPanel } from "@/components/workstation/ProcessingPanel";
import { LibraryPanel } from "@/components/library/LibraryPanel";
import { useAppStore } from "@/store";

const PANELS: Record<string, React.ReactNode> = {
  "text-to-sound": <TextToSoundPanel />,
  categories: <CategoriesPanel />,
  workstation: <WorkstationPanel />,
  soundscapes: <SoundscapePanel />,
  "game-audio": <GameAudioPanel />,
  loops: <LoopMakerPanel />,
  processing: <ProcessingPanel />,
  library: <LibraryPanel />,
};

export default function Home() {
  const activeView = useAppStore((s) => s.activeView);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {PANELS[activeView] || <TextToSoundPanel />}
        </main>
      </div>
    </div>
  );
}
