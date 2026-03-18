"use client";

import { Search, Bell, Download, Settings, User } from "lucide-react";
import { useAppStore } from "@/store";

const VIEW_TITLES: Record<string, string> = {
  "text-to-sound": "Text to Sound",
  categories: "Sound Categories",
  workstation: "Sound Design Workstation",
  soundscapes: "Ambient Soundscape Builder",
  "game-audio": "Game Audio Generator",
  loops: "Loop Maker",
  processing: "Audio Processing",
  library: "Sound Library",
};

export function Header() {
  const activeView = useAppStore((s) => s.activeView);
  const generatedSounds = useAppStore((s) => s.generator.generatedSounds);

  return (
    <header className="flex items-center justify-between border-b border-dark-700 bg-dark-900/80 px-6 py-3 backdrop-blur-sm">
      <div>
        <h2 className="text-lg font-semibold text-dark-50">
          {VIEW_TITLES[activeView] || "SonicForge"}
        </h2>
        <p className="text-xs text-dark-400">
          {generatedSounds.length > 0
            ? `${generatedSounds.length} sound${generatedSounds.length > 1 ? "s" : ""} generated`
            : "Ready to create"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            placeholder="Search sounds..."
            className="input-field w-64 pl-9 py-2 text-xs"
          />
        </div>

        <button className="btn-ghost relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-forge-500" />
        </button>

        <button className="btn-ghost">
          <Download className="h-4 w-4" />
        </button>

        <button className="btn-ghost">
          <Settings className="h-4 w-4" />
        </button>

        <button className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sonic-500 to-forge-500 text-xs font-bold text-white">
          U
        </button>
      </div>
    </header>
  );
}
