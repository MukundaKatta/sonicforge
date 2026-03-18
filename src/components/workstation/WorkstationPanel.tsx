"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Square,
  SkipBack,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  ZoomIn,
  ZoomOut,
  Download,
  Upload,
  Grid3X3,
  Loader2,
  Sparkles,
  MoveHorizontal,
} from "lucide-react";
import { useAppStore } from "@/store";
import { WaveformDisplay } from "@/components/visualizers/WaveformDisplay";
import { LiveAnalyzer } from "@/components/visualizers/LiveAnalyzer";
import {
  generateSoundBuffer,
  extractWaveformData,
  audioBufferToWav,
  processAudioBuffer,
} from "@/lib/audio-engine";
import { SOUND_CATEGORIES, type SoundCategory, type SoundLayer, type AppliedEffect } from "@/types";
import { generateId, formatDuration, cn } from "@/lib/utils";

const LAYER_COLORS = [
  "#5c7cfa", "#ff9800", "#4caf50", "#e91e63",
  "#9c27b0", "#00bcd4", "#ff5722", "#8bc34a",
];

interface LayerWithAudio {
  layer: SoundLayer;
  waveformData: number[];
  audioBuffer: AudioBuffer | null;
  audioUrl: string;
}

export function WorkstationPanel() {
  const {
    workstation,
    setIsPlaying,
    setPlaybackPosition,
    setMasterVolume,
    setZoom,
    toggleSnapToGrid,
  } = useAppStore();

  const [layers, setLayers] = useState<LayerWithAudio[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const [newCategory, setNewCategory] = useState<SoundCategory>("nature");
  const [newDuration, setNewDuration] = useState(3);
  const [isPlayingLocal, setIsPlayingLocal] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const maxDuration = Math.max(5, ...layers.map((l) => l.layer.startTime + l.layer.duration));

  const addNewLayer = useCallback(async () => {
    if (!newPrompt.trim() || isGenerating) return;
    setIsGenerating(true);

    try {
      const buffer = await generateSoundBuffer(newPrompt, newCategory, newDuration, 44100, 2);
      const waveformData = extractWaveformData(buffer, 200);
      const wavData = audioBufferToWav(buffer);
      const blob = new Blob([wavData], { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(blob);

      const id = generateId();
      const colorIdx = layers.length % LAYER_COLORS.length;

      const newLayerWithAudio: LayerWithAudio = {
        layer: {
          id,
          soundId: id,
          name: newPrompt.substring(0, 40),
          volume: 0.8,
          pan: 0,
          startTime: 0,
          duration: newDuration,
          effects: [],
          muted: false,
          solo: false,
          color: LAYER_COLORS[colorIdx],
        },
        waveformData,
        audioBuffer: buffer,
        audioUrl,
      };

      setLayers((prev) => [...prev, newLayerWithAudio]);
      setNewPrompt("");
    } catch (err) {
      console.error("Layer generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [newPrompt, newCategory, newDuration, isGenerating, layers.length]);

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.layer.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  }, [selectedLayerId]);

  const updateLayer = useCallback((id: string, updates: Partial<SoundLayer>) => {
    setLayers((prev) =>
      prev.map((l) =>
        l.layer.id === id ? { ...l, layer: { ...l.layer, ...updates } } : l
      )
    );
  }, []);

  const playAll = useCallback(async () => {
    if (isPlayingLocal) {
      sourceNodesRef.current.forEach((s) => {
        try { s.stop(); } catch { /* ignore */ }
      });
      if (audioCtxRef.current) await audioCtxRef.current.close();
      sourceNodesRef.current = [];
      setIsPlayingLocal(false);
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const sources: AudioBufferSourceNode[] = [];

    const hasSolo = layers.some((l) => l.layer.solo);

    for (const layerData of layers) {
      if (!layerData.audioBuffer) continue;
      if (layerData.layer.muted) continue;
      if (hasSolo && !layerData.layer.solo) continue;

      const source = ctx.createBufferSource();
      source.buffer = layerData.audioBuffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = layerData.layer.volume * workstation.masterVolume;

      const panner = ctx.createStereoPanner();
      panner.pan.value = layerData.layer.pan;

      source.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(ctx.destination);

      source.start(ctx.currentTime + layerData.layer.startTime);
      sources.push(source);
    }

    sourceNodesRef.current = sources;
    setIsPlayingLocal(true);
    startTimeRef.current = ctx.currentTime;

    const updatePosition = () => {
      if (!audioCtxRef.current) return;
      const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
      setPlaybackPosition(elapsed / maxDuration);

      if (elapsed < maxDuration) {
        animFrameRef.current = requestAnimationFrame(updatePosition);
      } else {
        setIsPlayingLocal(false);
        setPlaybackPosition(0);
      }
    };
    animFrameRef.current = requestAnimationFrame(updatePosition);
  }, [isPlayingLocal, layers, workstation.masterVolume, maxDuration, setPlaybackPosition]);

  const stopAll = useCallback(() => {
    sourceNodesRef.current.forEach((s) => {
      try { s.stop(); } catch { /* ignore */ }
    });
    if (audioCtxRef.current) audioCtxRef.current.close();
    sourceNodesRef.current = [];
    setIsPlayingLocal(false);
    setPlaybackPosition(0);
    cancelAnimationFrame(animFrameRef.current);
  }, [setPlaybackPosition]);

  const exportMix = useCallback(async () => {
    if (layers.length === 0) return;

    const sampleRate = 44100;
    const totalSamples = Math.ceil(sampleRate * maxDuration);
    const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);
    const hasSolo = layers.some((l) => l.layer.solo);

    for (const layerData of layers) {
      if (!layerData.audioBuffer || layerData.layer.muted) continue;
      if (hasSolo && !layerData.layer.solo) continue;

      const source = offlineCtx.createBufferSource();
      source.buffer = layerData.audioBuffer;
      const gain = offlineCtx.createGain();
      gain.gain.value = layerData.layer.volume * workstation.masterVolume;
      const panner = offlineCtx.createStereoPanner();
      panner.pan.value = layerData.layer.pan;
      source.connect(gain);
      gain.connect(panner);
      panner.connect(offlineCtx.destination);
      source.start(layerData.layer.startTime);
    }

    const rendered = await offlineCtx.startRendering();
    const wavData = audioBufferToWav(rendered);
    const blob = new Blob([wavData], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sonicforge-workstation-mix.wav";
    link.click();
    URL.revokeObjectURL(url);
  }, [layers, maxDuration, workstation.masterVolume]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Transport Controls */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setPlaybackPosition(0)} className="btn-ghost">
              <SkipBack className="h-4 w-4" />
            </button>
            <button onClick={playAll} className="btn-primary">
              {isPlayingLocal ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isPlayingLocal ? "Pause" : "Play"}
            </button>
            <button onClick={stopAll} className="btn-secondary">
              <Square className="h-4 w-4" />
              Stop
            </button>
            <span className="ml-4 text-sm font-mono text-dark-300">
              {formatDuration(workstation.playbackPosition * maxDuration)} / {formatDuration(maxDuration)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Master Volume */}
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-dark-400" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={workstation.masterVolume}
                onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                className="slider-track w-24"
              />
              <span className="text-xs text-dark-400 w-8">
                {Math.round(workstation.masterVolume * 100)}%
              </span>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom(Math.max(0.5, workstation.zoom - 0.25))} className="btn-ghost">
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-xs text-dark-400 w-10 text-center">{Math.round(workstation.zoom * 100)}%</span>
              <button onClick={() => setZoom(Math.min(4, workstation.zoom + 0.25))} className="btn-ghost">
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            {/* Snap */}
            <button
              onClick={toggleSnapToGrid}
              className={cn(
                "btn-ghost",
                workstation.snapToGrid && "text-sonic-400"
              )}
              title="Snap to grid"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>

            {/* Export */}
            <button onClick={exportMix} className="btn-secondary" disabled={layers.length === 0}>
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card overflow-hidden">
        {/* Time ruler */}
        <div className="flex h-8 border-b border-dark-700 bg-dark-800/50">
          <div className="w-48 shrink-0 border-r border-dark-700 px-3 flex items-center">
            <span className="text-[10px] text-dark-500 font-medium uppercase tracking-wider">Layers</span>
          </div>
          <div className="flex-1 relative">
            {Array.from({ length: Math.ceil(maxDuration) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 h-full border-l border-dark-700/50 flex items-end pb-1"
                style={{ left: `${(i / maxDuration) * 100 * workstation.zoom}%` }}
              >
                <span className="text-[9px] text-dark-500 ml-1">{i}s</span>
              </div>
            ))}
            {/* Playback cursor */}
            <div
              className="absolute top-0 h-full w-0.5 bg-forge-500 z-10 transition-all"
              style={{ left: `${workstation.playbackPosition * 100 * workstation.zoom}%` }}
            />
          </div>
        </div>

        {/* Layer tracks */}
        {layers.map((layerData) => (
          <div
            key={layerData.layer.id}
            className={cn(
              "flex border-b border-dark-700/50 transition-colors cursor-pointer",
              selectedLayerId === layerData.layer.id
                ? "bg-dark-800/80"
                : "bg-dark-900/50 hover:bg-dark-800/40"
            )}
            onClick={() => setSelectedLayerId(layerData.layer.id)}
          >
            {/* Track header */}
            <div className="w-48 shrink-0 border-r border-dark-700 p-2 flex items-center gap-2">
              <div
                className="h-6 w-1 rounded-full shrink-0"
                style={{ backgroundColor: layerData.layer.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-dark-200 truncate">{layerData.layer.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateLayer(layerData.layer.id, { muted: !layerData.layer.muted });
                    }}
                    className={cn(
                      "text-[9px] font-bold px-1 rounded",
                      layerData.layer.muted ? "text-red-400 bg-red-400/10" : "text-dark-500"
                    )}
                  >
                    M
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateLayer(layerData.layer.id, { solo: !layerData.layer.solo });
                    }}
                    className={cn(
                      "text-[9px] font-bold px-1 rounded",
                      layerData.layer.solo ? "text-yellow-400 bg-yellow-400/10" : "text-dark-500"
                    )}
                  >
                    S
                  </button>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeLayer(layerData.layer.id);
                }}
                className="text-dark-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Track content (waveform block) */}
            <div className="flex-1 relative h-16 overflow-hidden">
              <div
                className="absolute top-1 bottom-1 rounded-md overflow-hidden opacity-90"
                style={{
                  left: `${(layerData.layer.startTime / maxDuration) * 100 * workstation.zoom}%`,
                  width: `${(layerData.layer.duration / maxDuration) * 100 * workstation.zoom}%`,
                  backgroundColor: `${layerData.layer.color}15`,
                  border: `1px solid ${layerData.layer.color}40`,
                }}
              >
                <WaveformDisplay
                  data={layerData.waveformData}
                  width={400}
                  height={54}
                  color={layerData.layer.muted ? "#475569" : layerData.layer.color}
                  backgroundColor="transparent"
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {layers.length === 0 && (
          <div className="flex items-center justify-center h-32 text-dark-500 text-sm">
            Add layers to start designing your sound
          </div>
        )}
      </div>

      {/* Add Layer */}
      <div className="card">
        <p className="label-text mb-2">Add New Layer</p>
        <div className="flex gap-3">
          <input
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            placeholder="Describe the sound for this layer..."
            className="input-field flex-1"
            onKeyDown={(e) => e.key === "Enter" && addNewLayer()}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as SoundCategory)}
            className="select-field w-32"
          >
            {SOUND_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0.5}
              max={30}
              step={0.5}
              value={newDuration}
              onChange={(e) => setNewDuration(parseFloat(e.target.value) || 3)}
              className="input-field w-16 text-center"
            />
            <span className="text-xs text-dark-400">sec</span>
          </div>
          <button
            onClick={addNewLayer}
            disabled={!newPrompt.trim() || isGenerating}
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

      {/* Selected Layer Inspector */}
      {selectedLayerId && (() => {
        const sel = layers.find((l) => l.layer.id === selectedLayerId);
        if (!sel) return null;
        return (
          <div className="card">
            <h3 className="section-title mb-4">Layer Inspector: {sel.layer.name}</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <label className="label-text">Volume</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={sel.layer.volume}
                    onChange={(e) => updateLayer(sel.layer.id, { volume: parseFloat(e.target.value) })}
                    className="slider-track flex-1"
                  />
                  <span className="text-xs text-dark-300 w-10">
                    {Math.round(sel.layer.volume * 100)}%
                  </span>
                </div>
              </div>
              <div>
                <label className="label-text">Pan</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.05}
                    value={sel.layer.pan}
                    onChange={(e) => updateLayer(sel.layer.id, { pan: parseFloat(e.target.value) })}
                    className="slider-track flex-1"
                  />
                  <span className="text-xs text-dark-300 w-10">
                    {sel.layer.pan === 0 ? "C" : sel.layer.pan > 0 ? `R${Math.round(sel.layer.pan * 100)}` : `L${Math.round(Math.abs(sel.layer.pan) * 100)}`}
                  </span>
                </div>
              </div>
              <div>
                <label className="label-text">Start Time</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.1}
                    value={sel.layer.startTime}
                    onChange={(e) => updateLayer(sel.layer.id, { startTime: parseFloat(e.target.value) || 0 })}
                    className="input-field w-20"
                  />
                  <span className="text-xs text-dark-400">sec</span>
                </div>
              </div>
              <div>
                <label className="label-text">Duration</label>
                <span className="text-sm text-dark-200">{formatDuration(sel.layer.duration)}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
