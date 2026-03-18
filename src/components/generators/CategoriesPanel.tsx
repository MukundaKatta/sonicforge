"use client";

import { useState, useCallback, useRef } from "react";
import {
  Trees,
  Building2,
  Cog,
  Rocket,
  Wand2,
  Music,
  Sparkles,
  Play,
  Pause,
  Download,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { SOUND_CATEGORIES, type SoundCategory, type CategoryInfo } from "@/types";
import { useAppStore } from "@/store";
import { generateSoundBuffer, extractWaveformData, audioBufferToWav } from "@/lib/audio-engine";
import { WaveformDisplay } from "@/components/visualizers/WaveformDisplay";
import { generateId, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  trees: Trees,
  "building-2": Building2,
  cog: Cog,
  rocket: Rocket,
  "wand-2": Wand2,
  music: Music,
  sparkles: Sparkles,
};

const CATEGORY_COLORS: Record<SoundCategory, string> = {
  nature: "from-green-500 to-emerald-600",
  urban: "from-amber-500 to-orange-600",
  mechanical: "from-zinc-400 to-zinc-600",
  "sci-fi": "from-cyan-400 to-blue-600",
  fantasy: "from-purple-500 to-violet-600",
  musical: "from-pink-500 to-rose-600",
  abstract: "from-indigo-400 to-purple-600",
};

interface QuickGenResult {
  id: string;
  prompt: string;
  category: SoundCategory;
  waveformData: number[];
  audioUrl: string;
  duration: number;
}

export function CategoriesPanel() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryInfo | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [generatingPrompt, setGeneratingPrompt] = useState<string | null>(null);
  const [quickResults, setQuickResults] = useState<QuickGenResult[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const { setActiveView, setPrompt, setCategory } = useAppStore();

  const handleQuickGenerate = useCallback(async (prompt: string, category: SoundCategory) => {
    setGeneratingPrompt(prompt);
    try {
      const buffer = await generateSoundBuffer(prompt, category, 3, 44100, 2);
      const waveformData = extractWaveformData(buffer, 150);
      const wavData = audioBufferToWav(buffer);
      const blob = new Blob([wavData], { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(blob);

      const result: QuickGenResult = {
        id: generateId(),
        prompt,
        category,
        waveformData,
        audioUrl,
        duration: 3,
      };
      setQuickResults((prev) => [result, ...prev]);
    } catch (err) {
      console.error("Quick generation failed:", err);
    } finally {
      setGeneratingPrompt(null);
    }
  }, []);

  const playResult = useCallback(async (result: QuickGenResult) => {
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
  }, [playingId]);

  const openInGenerator = useCallback(
    (prompt: string, category: SoundCategory) => {
      setPrompt(prompt);
      setCategory(category);
      setActiveView("text-to-sound");
    },
    [setPrompt, setCategory, setActiveView]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Category Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {SOUND_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.icon] || Sparkles;
          const isSelected = selectedCategory?.id === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(isSelected ? null : cat);
                setSelectedSub(null);
              }}
              className={cn(
                "card-hover text-left transition-all",
                isSelected && "border-sonic-500/50 ring-1 ring-sonic-500/20"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white shrink-0",
                    CATEGORY_COLORS[cat.id]
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-dark-100">{cat.name}</h3>
                  <p className="mt-0.5 text-xs text-dark-400 line-clamp-2">
                    {cat.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cat.subcategories.slice(0, 3).map((sub) => (
                      <span key={sub} className="badge-sonic text-[10px]">
                        {sub}
                      </span>
                    ))}
                    {cat.subcategories.length > 3 && (
                      <span className="badge text-[10px] text-dark-500">
                        +{cat.subcategories.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Category Detail */}
      {selectedCategory && (
        <div className="card animate-slide-up">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="section-title">{selectedCategory.name} Sounds</h3>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setSelectedSub(null)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  !selectedSub
                    ? "bg-sonic-600 text-white"
                    : "bg-dark-800 text-dark-300 hover:text-dark-100"
                )}
              >
                All
              </button>
              {selectedCategory.subcategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSub(selectedSub === sub ? null : sub)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                    selectedSub === sub
                      ? "bg-sonic-600 text-white"
                      : "bg-dark-800 text-dark-300 hover:text-dark-100"
                  )}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Sample Prompts */}
          <div className="space-y-2">
            <p className="label-text">Quick Generate from Sample Prompts</p>
            {selectedCategory.samplePrompts.map((prompt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-dark-700 bg-dark-800/50 p-3 hover:border-dark-600 transition-colors"
              >
                <span className="text-sm text-dark-200 flex-1">{prompt}</span>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button
                    onClick={() => handleQuickGenerate(prompt, selectedCategory.id)}
                    disabled={generatingPrompt === prompt}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    {generatingPrompt === prompt ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => openInGenerator(prompt, selectedCategory.id)}
                    className="btn-ghost text-xs"
                    title="Open in Text to Sound"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Gen Results */}
      {quickResults.length > 0 && (
        <div className="card">
          <h3 className="section-title mb-4">Quick Results</h3>
          <div className="space-y-2">
            {quickResults.map((result) => (
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
                  <p className="text-sm text-dark-200 truncate">{result.prompt}</p>
                  <div className="flex items-center gap-2 text-xs text-dark-400">
                    <span className="capitalize">{result.category}</span>
                    <span>{formatDuration(result.duration)}</span>
                  </div>
                </div>
                <WaveformDisplay
                  data={result.waveformData}
                  width={200}
                  height={40}
                  className="shrink-0 hidden md:block"
                />
                <button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = result.audioUrl;
                    link.download = `sonicforge-${result.category}-${result.id}.wav`;
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
