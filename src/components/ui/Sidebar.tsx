"use client";

import {
  Waves,
  Mic,
  LayoutGrid,
  Sliders,
  TreePine,
  Gamepad2,
  Repeat,
  AudioWaveform,
  Library,
} from "lucide-react";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "text-to-sound", label: "Text to Sound", icon: Mic },
  { id: "categories", label: "Categories", icon: LayoutGrid },
  { id: "workstation", label: "Workstation", icon: Sliders },
  { id: "soundscapes", label: "Soundscapes", icon: TreePine },
  { id: "game-audio", label: "Game Audio", icon: Gamepad2 },
  { id: "loops", label: "Loop Maker", icon: Repeat },
  { id: "processing", label: "Processing", icon: AudioWaveform },
  { id: "library", label: "Library", icon: Library },
];

export function Sidebar() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);

  return (
    <aside className="flex w-64 flex-col border-r border-dark-700 bg-dark-900">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-dark-700 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sonic-500 to-forge-500">
          <Waves className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-dark-50">SonicForge</h1>
          <p className="text-[10px] font-medium uppercase tracking-widest text-dark-400">
            AI Sound Engine
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto scrollbar-thin">
        <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-widest text-dark-500">
          Create
        </p>
        {NAV_ITEMS.slice(0, 6).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              activeView === item.id
                ? "bg-dark-800 text-sonic-400"
                : "text-dark-400 hover:bg-dark-800 hover:text-dark-200"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}

        <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-widest text-dark-500">
          Tools
        </p>
        {NAV_ITEMS.slice(6).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              activeView === item.id
                ? "bg-dark-800 text-sonic-400"
                : "text-dark-400 hover:bg-dark-800 hover:text-dark-200"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer / Usage */}
      <div className="border-t border-dark-700 p-4">
        <div className="rounded-lg bg-dark-800 p-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-dark-400">Generations</span>
            <span className="text-dark-300">12 / 50</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-dark-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sonic-500 to-forge-500"
              style={{ width: "24%" }}
            />
          </div>
          <p className="mt-2 text-[10px] text-dark-500">Free plan - Upgrade for more</p>
        </div>
      </div>
    </aside>
  );
}
