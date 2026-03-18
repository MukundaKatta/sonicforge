"use client";

import { useState, useCallback, useRef } from "react";
import {
  Repeat,
  Play,
  Pause,
  Square,
  Download,
  Loader2,
  Sparkles,
  Music,
  Clock,
  Hash,
  Gauge,
} from "lucide-react";
import { useAppStore } from "@/store";
import { WaveformDisplay } from "@/components/visualizers/WaveformDisplay";
import {
  generateSoundBuffer,
  extractWaveformData,
  audioBufferToWav,
  makeSeamlessLoop,
} from "@/lib/audio-engine";
import { SOUND_CATEGORIES, type SoundCategory } from "@/types";
import { generateId, formatDuration } from "@/lib/utils";

const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SCALES = ["major", "minor", "pentatonic", "blues", "dorian", "mixolydian", "phrygian"];
const TIME_SIGNATURES: [number, number][] = [[4, 4], [3, 4], [6, 8], [5, 4], [7, 8]];

interface GeneratedLoop {
  id: string;
  name: string;
  prompt: string;
  bpm: number;
  bars: number;
  key: string;
  scale: string;
  waveformData: number[];
  audioUrl: string;
  duration: number;
}

const LOOP_PRESETS = [
  { name: "Cinematic Pulse", prompt: "Deep rhythmic pulse with cinematic tension", category: "musical" as SoundCategory, bpm: 100 },
  { name: "Tech Groove", prompt: "Electronic glitch-hop beat with synth stabs", category: "abstract" as SoundCategory, bpm: 128 },
  { name: "Tribal Rhythm", prompt: "Organic tribal drum pattern with shakers", category: "nature" as SoundCategory, bpm: 110 },
  { name: "Ambient Texture", prompt: "Evolving ambient pad with gentle modulation", category: "musical" as SoundCategory, bpm: 80 },
  { name: "Industrial Beat", prompt: "Hard industrial percussion with metallic hits", category: "mechanical" as SoundCategory, bpm: 140 },
  { name: "Chiptune Bounce", prompt: "Retro 8-bit melody with bouncy square waves", category: "abstract" as SoundCategory, bpm: 150 },
];

export function LoopMakerPanel() {
  const { loop, setLoopSettings } = useAppStore();
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<SoundCategory>("musical");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loops, setLoops] = useState<GeneratedLoop[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loopingId, setLoopingId] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const barsToSeconds = useCallback(
    (bars: number, bpm: number, timeSig: [number, number]) => {
      const beatsPerBar = timeSig[0];
      const totalBeats = bars * beatsPerBar;
      return (totalBeats / bpm) * 60;
    },
    []
  );

  const generateLoop = useCallback(
    async (inputPrompt: string, inputCategory: SoundCategory, presetBpm?: number) => {
      if (!inputPrompt.trim()) return;
      setIsGenerating(true);

      try {
        const bpm = presetBpm || loop.settings.bpm;
        const duration = barsToSeconds(
          loop.settings.bars,
          bpm,
          loop.settings.timeSignature
        );

        let buffer = await generateSoundBuffer(inputPrompt, inputCategory, duration, 44100, 2);

        if (loop.settings.seamless) {
          buffer = makeSeamlessLoop(buffer, 0.05);
        }

        const waveformData = extractWaveformData(buffer, 200);
        const wavData = audioBufferToWav(buffer);
        const blob = new Blob([wavData], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(blob);

        const newLoop: GeneratedLoop = {
          id: generateId(),
          name: `${inputPrompt.substring(0, 30)} - ${bpm}BPM`,
          prompt: inputPrompt,
          bpm,
          bars: loop.settings.bars,
          key: loop.settings.key,
          scale: loop.settings.scale,
          waveformData,
          audioUrl,
          duration,
        };

        setLoops((prev) => [newLoop, ...prev]);
      } catch (err) {
        console.error("Loop generation failed:", err);
      } finally {
        setIsGenerating(false);
      }
    },
    [loop.settings, barsToSeconds]
  );

  const playLoop = useCallback(
    async (genLoop: GeneratedLoop, shouldLoop: boolean) => {
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch { /* ignore */ }
      }
      if (audioCtxRef.current) {
        await audioCtxRef.current.close();
      }

      if (playingId === genLoop.id) {
        setPlayingId(null);
        setLoopingId(null);
        return;
      }

      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const resp = await fetch(genLoop.audioUrl);
        const ab = await resp.arrayBuffer();
        const buffer = await ctx.decodeAudioData(ab);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = shouldLoop;
        source.connect(ctx.destination);
        sourceRef.current = source;
        source.onended = () => {
          if (!shouldLoop) {
            setPlayingId(null);
            setLoopingId(null);
          }
        };
        source.start(0);
        setPlayingId(genLoop.id);
        if (shouldLoop) setLoopingId(genLoop.id);
      } catch (err) {
        console.error("Playback failed:", err);
      }
    },
    [playingId]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Settings */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Repeat className="h-5 w-5 text-forge-400" />
          <h3 className="section-title">Loop Settings</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {/* BPM */}
          <div>
            <label className="label-text flex items-center gap-1">
              <Gauge className="h-3 w-3" />
              BPM
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={40}
                max={300}
                value={loop.settings.bpm}
                onChange={(e) => setLoopSettings({ bpm: parseInt(e.target.value) || 120 })}
                className="input-field w-20 text-center"
              />
              <input
                type="range"
                min={40}
                max={300}
                value={loop.settings.bpm}
                onChange={(e) => setLoopSettings({ bpm: parseInt(e.target.value) })}
                className="slider-track flex-1"
              />
            </div>
          </div>

          {/* Bars */}
          <div>
            <label className="label-text flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Bars
            </label>
            <select
              value={loop.settings.bars}
              onChange={(e) => setLoopSettings({ bars: parseInt(e.target.value) })}
              className="select-field"
            >
              {[1, 2, 4, 8, 16].map((b) => (
                <option key={b} value={b}>
                  {b} bar{b > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Time Signature */}
          <div>
            <label className="label-text flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Time Sig
            </label>
            <select
              value={`${loop.settings.timeSignature[0]}/${loop.settings.timeSignature[1]}`}
              onChange={(e) => {
                const [n, d] = e.target.value.split("/").map(Number);
                setLoopSettings({ timeSignature: [n, d] as [number, number] });
              }}
              className="select-field"
            >
              {TIME_SIGNATURES.map((ts) => (
                <option key={`${ts[0]}/${ts[1]}`} value={`${ts[0]}/${ts[1]}`}>
                  {ts[0]}/{ts[1]}
                </option>
              ))}
            </select>
          </div>

          {/* Key */}
          <div>
            <label className="label-text flex items-center gap-1">
              <Music className="h-3 w-3" />
              Key
            </label>
            <select
              value={loop.settings.key}
              onChange={(e) => setLoopSettings({ key: e.target.value })}
              className="select-field"
            >
              {KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* Scale */}
          <div>
            <label className="label-text">Scale</label>
            <select
              value={loop.settings.scale}
              onChange={(e) => setLoopSettings({ scale: e.target.value })}
              className="select-field"
            >
              {SCALES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Seamless */}
          <div>
            <label className="label-text">Seamless</label>
            <button
              onClick={() => setLoopSettings({ seamless: !loop.settings.seamless })}
              className={`w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                loop.settings.seamless
                  ? "bg-sonic-600 text-white"
                  : "bg-dark-800 text-dark-300 border border-dark-600"
              }`}
            >
              {loop.settings.seamless ? "On" : "Off"}
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-dark-500">
          Duration:{" "}
          {formatDuration(
            barsToSeconds(loop.settings.bars, loop.settings.bpm, loop.settings.timeSignature)
          )}
        </p>
      </div>

      {/* Custom Generation */}
      <div className="card">
        <p className="label-text mb-2">Describe Your Loop</p>
        <div className="flex gap-3">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Deep rhythmic bass pulse with subtle percussive elements..."
            className="input-field flex-1"
            onKeyDown={(e) => e.key === "Enter" && generateLoop(prompt, category)}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SoundCategory)}
            className="select-field w-36"
          >
            {SOUND_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => generateLoop(prompt, category)}
            disabled={!prompt.trim() || isGenerating}
            className="btn-primary"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Create Loop
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="card">
        <h3 className="section-title mb-4">Loop Presets</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LOOP_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => generateLoop(preset.prompt, preset.category, preset.bpm)}
              disabled={isGenerating}
              className="card-hover text-left"
            >
              <h4 className="text-sm font-semibold text-dark-100">{preset.name}</h4>
              <p className="text-xs text-dark-400 mt-1 line-clamp-1">{preset.prompt}</p>
              <span className="badge-forge text-[10px] mt-2">{preset.bpm} BPM</span>
            </button>
          ))}
        </div>
      </div>

      {/* Generated Loops */}
      {loops.length > 0 && (
        <div className="card">
          <h3 className="section-title mb-4">Generated Loops ({loops.length})</h3>
          <div className="space-y-3">
            {loops.map((genLoop) => (
              <div
                key={genLoop.id}
                className="rounded-lg border border-dark-700 bg-dark-800/50 p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => playLoop(genLoop, false)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-sonic-600 text-white hover:bg-sonic-500"
                      title="Play once"
                    >
                      {playingId === genLoop.id && loopingId !== genLoop.id ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5 ml-0.5" />
                      )}
                    </button>
                    <button
                      onClick={() => playLoop(genLoop, true)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                        loopingId === genLoop.id
                          ? "bg-forge-600 text-white"
                          : "bg-dark-700 text-dark-300 hover:text-white"
                      }`}
                      title="Loop"
                    >
                      <Repeat className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-100 truncate">{genLoop.name}</p>
                    <div className="flex items-center gap-3 text-xs text-dark-400">
                      <span>{genLoop.bpm} BPM</span>
                      <span>{genLoop.bars} bars</span>
                      <span>{genLoop.key} {genLoop.scale}</span>
                      <span>{formatDuration(genLoop.duration)}</span>
                    </div>
                  </div>

                  <WaveformDisplay
                    data={genLoop.waveformData}
                    width={250}
                    height={40}
                    color={loopingId === genLoop.id ? "#ff9800" : "#5c7cfa"}
                    className="shrink-0 hidden lg:block"
                  />

                  <button
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = genLoop.audioUrl;
                      link.download = `sonicforge-loop-${genLoop.bpm}bpm-${genLoop.id}.wav`;
                      link.click();
                    }}
                    className="btn-ghost shrink-0"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
