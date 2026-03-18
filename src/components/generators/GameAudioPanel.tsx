"use client";

import { useState, useCallback, useRef } from "react";
import {
  Gamepad2,
  Play,
  Pause,
  Download,
  Loader2,
  Search,
  Sparkles,
  Swords,
  Footprints,
  Zap,
  TreePine,
  MousePointerClick,
} from "lucide-react";
import { GAME_AUDIO_PRESETS, FOLEY_PRESETS, type SoundCategory, type GameAudioPreset, type FoleyPreset } from "@/types";
import { generateSoundBuffer, extractWaveformData, audioBufferToWav } from "@/lib/audio-engine";
import { WaveformDisplay } from "@/components/visualizers/WaveformDisplay";
import { generateId, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

const GAME_CATEGORIES = ["All", "Character", "Combat", "UI", "Environment"];

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Character: Footprints,
  Combat: Swords,
  UI: MousePointerClick,
  Environment: TreePine,
};

interface GeneratedPreset {
  id: string;
  preset: GameAudioPreset | FoleyPreset;
  waveformData: number[];
  audioUrl: string;
  duration: number;
}

export function GameAudioPanel() {
  const [activeTab, setActiveTab] = useState<"presets" | "foley">("presets");
  const [selectedGameCat, setSelectedGameCat] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedPreset[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const filteredPresets = GAME_AUDIO_PRESETS.filter((p) => {
    const matchesCat = selectedGameCat === "All" || p.category === selectedGameCat;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredFoley = FOLEY_PRESETS.filter((p) => {
    return (
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const categoryForPreset = (preset: GameAudioPreset): SoundCategory => {
    const map: Record<string, SoundCategory> = {
      Character: "mechanical",
      Combat: "sci-fi",
      UI: "musical",
      Environment: "nature",
    };
    return map[preset.category] || "abstract";
  };

  const generateFromPreset = useCallback(
    async (preset: GameAudioPreset) => {
      setGeneratingId(preset.id);
      try {
        const dur = preset.params.duration || 2;
        const category = categoryForPreset(preset);
        const buffer = await generateSoundBuffer(preset.prompt, category, dur, 44100, 2);
        const waveformData = extractWaveformData(buffer, 150);
        const wavData = audioBufferToWav(buffer);
        const blob = new Blob([wavData], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(blob);

        setResults((prev) => [
          { id: generateId(), preset, waveformData, audioUrl, duration: dur },
          ...prev,
        ]);
      } catch (err) {
        console.error("Game audio generation failed:", err);
      } finally {
        setGeneratingId(null);
      }
    },
    []
  );

  const generateFromFoley = useCallback(async (preset: FoleyPreset) => {
    setGeneratingId(preset.id);
    try {
      const buffer = await generateSoundBuffer(preset.prompt, "urban", 5, 44100, 2);
      const waveformData = extractWaveformData(buffer, 150);
      const wavData = audioBufferToWav(buffer);
      const blob = new Blob([wavData], { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(blob);

      setResults((prev) => [
        { id: generateId(), preset, waveformData, audioUrl, duration: 5 },
        ...prev,
      ]);
    } catch (err) {
      console.error("Foley generation failed:", err);
    } finally {
      setGeneratingId(null);
    }
  }, []);

  const playResult = useCallback(
    async (result: GeneratedPreset) => {
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch { /* ignore */ }
      }
      if (audioCtxRef.current) {
        await audioCtxRef.current.close();
      }
      if (playingId === result.id) {
        setPlayingId(null);
        return;
      }
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const resp = await fetch(result.audioUrl);
        const ab = await resp.arrayBuffer();
        const buffer = await ctx.decodeAudioData(ab);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        sourceRef.current = source;
        source.onended = () => setPlayingId(null);
        source.start(0);
        setPlayingId(result.id);
      } catch (err) {
        console.error("Playback failed:", err);
      }
    },
    [playingId]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-forge-400" />
            <h3 className="section-title">Game Audio Generator</h3>
          </div>
          <div className="flex gap-1 rounded-lg bg-dark-800 p-1">
            <button
              onClick={() => setActiveTab("presets")}
              className={cn(
                "rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
                activeTab === "presets"
                  ? "bg-dark-700 text-dark-50"
                  : "text-dark-400 hover:text-dark-200"
              )}
            >
              SFX Presets
            </button>
            <button
              onClick={() => setActiveTab("foley")}
              className={cn(
                "rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
                activeTab === "foley"
                  ? "bg-dark-700 text-dark-50"
                  : "text-dark-400 hover:text-dark-200"
              )}
            >
              Foley Scenes
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === "presets" ? "Search SFX presets..." : "Search foley scenes..."}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Presets Tab */}
      {activeTab === "presets" && (
        <>
          {/* Category filters */}
          <div className="flex gap-2 flex-wrap">
            {GAME_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedGameCat(cat)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                  selectedGameCat === cat
                    ? "bg-sonic-600 text-white"
                    : "bg-dark-800 text-dark-300 hover:text-dark-100 border border-dark-700"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Presets Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPresets.map((preset) => (
              <div key={preset.id} className="card-hover">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-semibold text-dark-100">{preset.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge-sonic text-[10px]">{preset.category}</span>
                      <span className="badge text-[10px] text-dark-400 bg-dark-800">
                        {preset.subcategory}
                      </span>
                      <span className="text-[10px] text-dark-500">
                        {formatDuration(preset.params.duration || 2)}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-dark-400 mb-3 line-clamp-2">{preset.prompt}</p>
                <button
                  onClick={() => generateFromPreset(preset)}
                  disabled={generatingId === preset.id}
                  className="btn-primary w-full text-xs"
                >
                  {generatingId === preset.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generate
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Foley Tab */}
      {activeTab === "foley" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filteredFoley.map((preset) => (
            <div key={preset.id} className="card-hover">
              <div className="mb-2">
                <h4 className="text-sm font-semibold text-dark-100">{preset.name}</h4>
                <span className="badge-forge text-[10px] mt-1">{preset.scene}</span>
              </div>
              <p className="text-xs text-dark-400 mb-2">{preset.prompt}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {preset.actions.map((action) => (
                  <span key={action} className="badge bg-dark-800 text-dark-300 text-[10px]">
                    {action}
                  </span>
                ))}
              </div>
              <button
                onClick={() => generateFromFoley(preset)}
                disabled={generatingId === preset.id}
                className="btn-primary w-full text-xs"
              >
                {generatingId === preset.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Generate Scene
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="card">
          <h3 className="section-title mb-4">Generated Game Audio ({results.length})</h3>
          <div className="space-y-2">
            {results.map((result) => (
              <div
                key={result.id}
                className="flex items-center gap-3 rounded-lg border border-dark-700 bg-dark-800/50 p-3"
              >
                <button
                  onClick={() => playResult(result)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-sonic-600 text-white hover:bg-sonic-500 shrink-0"
                >
                  {playingId === result.id ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5 ml-0.5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-200 font-medium">{result.preset.name}</p>
                  <p className="text-xs text-dark-400">{formatDuration(result.duration)}</p>
                </div>
                <WaveformDisplay
                  data={result.waveformData}
                  width={180}
                  height={35}
                  className="shrink-0 hidden md:block"
                />
                <button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = result.audioUrl;
                    link.download = `sonicforge-${result.preset.name.replace(/\s+/g, "-").toLowerCase()}.wav`;
                    link.click();
                  }}
                  className="btn-ghost shrink-0"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
