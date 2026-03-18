"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Plus,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Trash2,
  Save,
  Download,
  Loader2,
  Layers,
  MoveHorizontal,
} from "lucide-react";
import { useAppStore } from "@/store";
import { WaveformDisplay } from "@/components/visualizers/WaveformDisplay";
import {
  generateSoundBuffer,
  extractWaveformData,
  audioBufferToWav,
} from "@/lib/audio-engine";
import {
  SOUND_CATEGORIES,
  type SoundCategory,
  type SoundLayer,
  type Soundscape,
} from "@/types";
import { generateId, formatDuration, cn } from "@/lib/utils";

const LAYER_COLORS = [
  "#5c7cfa", "#ff9800", "#4caf50", "#e91e63",
  "#9c27b0", "#00bcd4", "#ff5722", "#607d8b",
];

interface SoundscapeLayerState {
  layer: SoundLayer;
  waveformData: number[];
  audioUrl: string;
  audioBuffer: AudioBuffer | null;
}

const AMBIENT_PRESETS = [
  { name: "Forest Dawn", layers: [
    { prompt: "Gentle birdsong at dawn", category: "nature" as SoundCategory, volume: 0.7 },
    { prompt: "Light breeze through leaves", category: "nature" as SoundCategory, volume: 0.4 },
    { prompt: "Distant stream flowing over rocks", category: "nature" as SoundCategory, volume: 0.3 },
  ]},
  { name: "Rainy Cafe", layers: [
    { prompt: "Heavy rain on windows", category: "nature" as SoundCategory, volume: 0.6 },
    { prompt: "Coffee shop ambient chatter", category: "urban" as SoundCategory, volume: 0.4 },
    { prompt: "Espresso machine steaming", category: "urban" as SoundCategory, volume: 0.2 },
  ]},
  { name: "Space Station", layers: [
    { prompt: "Low frequency engine hum", category: "sci-fi" as SoundCategory, volume: 0.5 },
    { prompt: "Air circulation system whirring", category: "mechanical" as SoundCategory, volume: 0.3 },
    { prompt: "Distant electronic beeps and pings", category: "sci-fi" as SoundCategory, volume: 0.2 },
  ]},
  { name: "Enchanted Grove", layers: [
    { prompt: "Mystical wind chimes and bells", category: "fantasy" as SoundCategory, volume: 0.5 },
    { prompt: "Ethereal vocal pad hovering", category: "musical" as SoundCategory, volume: 0.4 },
    { prompt: "Soft magical sparkle sounds", category: "fantasy" as SoundCategory, volume: 0.3 },
  ]},
];

export function SoundscapePanel() {
  const [layers, setLayers] = useState<SoundscapeLayerState[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sceneName, setSceneName] = useState("Untitled Soundscape");
  const [duration, setDuration] = useState(10);
  const [newLayerPrompt, setNewLayerPrompt] = useState("");
  const [newLayerCategory, setNewLayerCategory] = useState<SoundCategory>("nature");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);

  const addLayer = useCallback(
    async (prompt: string, category: SoundCategory, volume: number = 0.7) => {
      setIsGenerating(true);
      try {
        const buffer = await generateSoundBuffer(prompt, category, duration, 44100, 2);
        const waveformData = extractWaveformData(buffer, 150);
        const wavData = audioBufferToWav(buffer);
        const blob = new Blob([wavData], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(blob);

        const id = generateId();
        const colorIdx = layers.length % LAYER_COLORS.length;

        const newLayer: SoundscapeLayerState = {
          layer: {
            id,
            soundId: id,
            name: prompt.substring(0, 40),
            volume,
            pan: 0,
            startTime: 0,
            duration,
            effects: [],
            muted: false,
            solo: false,
            color: LAYER_COLORS[colorIdx],
          },
          waveformData,
          audioUrl,
          audioBuffer: buffer,
        };
        setLayers((prev) => [...prev, newLayer]);
      } catch (err) {
        console.error("Layer generation failed:", err);
      } finally {
        setIsGenerating(false);
      }
    },
    [duration, layers.length]
  );

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.layer.id !== id));
  }, []);

  const updateLayerVolume = useCallback((id: string, volume: number) => {
    setLayers((prev) =>
      prev.map((l) =>
        l.layer.id === id ? { ...l, layer: { ...l.layer, volume } } : l
      )
    );
  }, []);

  const updateLayerPan = useCallback((id: string, pan: number) => {
    setLayers((prev) =>
      prev.map((l) =>
        l.layer.id === id ? { ...l, layer: { ...l.layer, pan } } : l
      )
    );
  }, []);

  const toggleMute = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) =>
        l.layer.id === id
          ? { ...l, layer: { ...l.layer, muted: !l.layer.muted } }
          : l
      )
    );
  }, []);

  const playAll = useCallback(async () => {
    if (isPlaying) {
      // Stop
      sourceNodesRef.current.forEach((s) => {
        try { s.stop(); } catch { /* ignore */ }
      });
      if (audioCtxRef.current) await audioCtxRef.current.close();
      sourceNodesRef.current = [];
      gainNodesRef.current = [];
      setIsPlaying(false);
      return;
    }

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const sources: AudioBufferSourceNode[] = [];
    const gains: GainNode[] = [];

    for (const layerState of layers) {
      if (layerState.layer.muted || !layerState.audioBuffer) continue;

      const source = ctx.createBufferSource();
      source.buffer = layerState.audioBuffer;
      source.loop = true;

      const gainNode = ctx.createGain();
      gainNode.gain.value = layerState.layer.volume;

      const panner = ctx.createStereoPanner();
      panner.pan.value = layerState.layer.pan;

      source.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(ctx.destination);

      source.start(0);
      sources.push(source);
      gains.push(gainNode);
    }

    sourceNodesRef.current = sources;
    gainNodesRef.current = gains;
    setIsPlaying(true);
  }, [isPlaying, layers]);

  const loadPreset = useCallback(
    async (preset: (typeof AMBIENT_PRESETS)[0]) => {
      setSceneName(preset.name);
      setLayers([]);
      setIsGenerating(true);
      for (const layerDef of preset.layers) {
        await addLayer(layerDef.prompt, layerDef.category, layerDef.volume);
      }
      setIsGenerating(false);
    },
    [addLayer]
  );

  const exportMix = useCallback(async () => {
    if (layers.length === 0) return;

    const sampleRate = 44100;
    const totalSamples = sampleRate * duration;
    const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

    for (const layerState of layers) {
      if (layerState.layer.muted || !layerState.audioBuffer) continue;
      const source = offlineCtx.createBufferSource();
      source.buffer = layerState.audioBuffer;
      const gain = offlineCtx.createGain();
      gain.gain.value = layerState.layer.volume;
      const panner = offlineCtx.createStereoPanner();
      panner.pan.value = layerState.layer.pan;
      source.connect(gain);
      gain.connect(panner);
      panner.connect(offlineCtx.destination);
      source.start(0);
    }

    const rendered = await offlineCtx.startRendering();
    const wavData = audioBufferToWav(rendered);
    const blob = new Blob([wavData], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${sceneName.replace(/\s+/g, "-").toLowerCase()}.wav`;
    link.click();
    URL.revokeObjectURL(url);
  }, [layers, duration, sceneName]);

  const handleAddCustomLayer = useCallback(() => {
    if (!newLayerPrompt.trim()) return;
    addLayer(newLayerPrompt, newLayerCategory);
    setNewLayerPrompt("");
  }, [newLayerPrompt, newLayerCategory, addLayer]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-forge-400" />
            <div>
              <input
                value={sceneName}
                onChange={(e) => setSceneName(e.target.value)}
                className="bg-transparent text-lg font-semibold text-dark-50 border-none outline-none focus:underline"
              />
              <p className="text-xs text-dark-400">
                {layers.length} layer{layers.length !== 1 ? "s" : ""} | {formatDuration(duration)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-4">
              <label className="text-xs text-dark-400">Duration:</label>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="slider-track w-24"
              />
              <span className="text-xs text-dark-300 w-8">{duration}s</span>
            </div>
            <button onClick={playAll} className="btn-primary">
              {isPlaying ? (
                <>
                  <Square className="h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Play Mix
                </>
              )}
            </button>
            <button onClick={exportMix} className="btn-secondary" disabled={layers.length === 0}>
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Presets */}
        <div>
          <p className="label-text mb-2">Presets</p>
          <div className="flex gap-2 flex-wrap">
            {AMBIENT_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => loadPreset(preset)}
                disabled={isGenerating}
                className="btn-secondary text-xs"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add Layer */}
      <div className="card">
        <p className="label-text mb-2">Add Layer</p>
        <div className="flex gap-3">
          <input
            value={newLayerPrompt}
            onChange={(e) => setNewLayerPrompt(e.target.value)}
            placeholder="Describe a sound layer..."
            className="input-field flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAddCustomLayer()}
          />
          <select
            value={newLayerCategory}
            onChange={(e) => setNewLayerCategory(e.target.value as SoundCategory)}
            className="select-field w-36"
          >
            {SOUND_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddCustomLayer}
            disabled={!newLayerPrompt.trim() || isGenerating}
            className="btn-primary"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </button>
        </div>
      </div>

      {/* Layers Mixer */}
      {layers.length > 0 && (
        <div className="card">
          <h3 className="section-title mb-4">Layer Mixer</h3>
          <div className="space-y-3">
            {layers.map((layerState) => (
              <div
                key={layerState.layer.id}
                className={cn(
                  "rounded-lg border p-4 transition-colors",
                  layerState.layer.muted
                    ? "border-dark-700 bg-dark-900 opacity-50"
                    : "border-dark-600 bg-dark-800/50"
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Color indicator */}
                  <div
                    className="h-10 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: layerState.layer.color }}
                  />

                  {/* Name & waveform */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-100 truncate">
                      {layerState.layer.name}
                    </p>
                    <WaveformDisplay
                      data={layerState.waveformData}
                      width={300}
                      height={30}
                      color={layerState.layer.color}
                      className="mt-1"
                    />
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleMute(layerState.layer.id)}
                      className="btn-ghost"
                    >
                      {layerState.layer.muted ? (
                        <VolumeX className="h-4 w-4 text-red-400" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={layerState.layer.volume}
                      onChange={(e) =>
                        updateLayerVolume(layerState.layer.id, parseFloat(e.target.value))
                      }
                      className="slider-track w-24"
                    />
                    <span className="text-xs text-dark-400 w-8">
                      {Math.round(layerState.layer.volume * 100)}%
                    </span>
                  </div>

                  {/* Pan */}
                  <div className="flex items-center gap-2 shrink-0">
                    <MoveHorizontal className="h-4 w-4 text-dark-400" />
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.1}
                      value={layerState.layer.pan}
                      onChange={(e) =>
                        updateLayerPan(layerState.layer.id, parseFloat(e.target.value))
                      }
                      className="slider-track w-20"
                    />
                    <span className="text-xs text-dark-400 w-6">
                      {layerState.layer.pan === 0
                        ? "C"
                        : layerState.layer.pan > 0
                        ? `R${Math.round(layerState.layer.pan * 100)}`
                        : `L${Math.round(Math.abs(layerState.layer.pan) * 100)}`}
                    </span>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => removeLayer(layerState.layer.id)}
                    className="btn-ghost text-red-400 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {layers.length === 0 && !isGenerating && (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Layers className="h-12 w-12 text-dark-600 mb-4" />
          <h3 className="text-lg font-medium text-dark-300 mb-2">No Layers Yet</h3>
          <p className="text-sm text-dark-500 max-w-md">
            Add sound layers to build your ambient soundscape. Each layer is independently
            controllable with volume, pan, and mute. Try a preset to get started.
          </p>
        </div>
      )}
    </div>
  );
}
