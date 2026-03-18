"use client";

import { useState, useCallback, useRef } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Power,
  Save,
  FolderOpen,
  Play,
  Pause,
  Download,
  Loader2,
  Upload,
  AudioWaveform,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAppStore } from "@/store";
import { WaveformDisplay } from "@/components/visualizers/WaveformDisplay";
import {
  processAudioBuffer,
  generateSoundBuffer,
  extractWaveformData,
  audioBufferToWav,
} from "@/lib/audio-engine";
import { type AudioProcessingEffect, type AppliedEffect } from "@/types";
import { generateId, cn } from "@/lib/utils";

const EFFECT_DEFINITIONS: Record<
  AudioProcessingEffect,
  { name: string; description: string; params: { key: string; label: string; min: number; max: number; step: number; default: number }[] }
> = {
  reverb: {
    name: "Reverb",
    description: "Adds space and ambience",
    params: [
      { key: "time", label: "Time", min: 0.1, max: 10, step: 0.1, default: 2 },
      { key: "decay", label: "Decay", min: 0.1, max: 10, step: 0.1, default: 2 },
      { key: "mix", label: "Mix", min: 0, max: 1, step: 0.01, default: 0.5 },
    ],
  },
  echo: {
    name: "Echo",
    description: "Delayed signal repetitions",
    params: [
      { key: "time", label: "Delay Time", min: 0.05, max: 2, step: 0.01, default: 0.3 },
      { key: "feedback", label: "Feedback", min: 0, max: 0.95, step: 0.01, default: 0.4 },
      { key: "mix", label: "Mix", min: 0, max: 1, step: 0.01, default: 0.5 },
    ],
  },
  "pitch-shift": {
    name: "Pitch Shift",
    description: "Change the pitch up or down",
    params: [
      { key: "semitones", label: "Semitones", min: -24, max: 24, step: 1, default: 0 },
    ],
  },
  "spatial-audio": {
    name: "Spatial Audio",
    description: "Stereo panning control",
    params: [
      { key: "pan", label: "Pan", min: -1, max: 1, step: 0.01, default: 0 },
    ],
  },
  distortion: {
    name: "Distortion",
    description: "Waveshaping distortion",
    params: [
      { key: "amount", label: "Amount", min: 0, max: 100, step: 1, default: 50 },
    ],
  },
  compressor: {
    name: "Compressor",
    description: "Dynamic range compression",
    params: [
      { key: "threshold", label: "Threshold (dB)", min: -60, max: 0, step: 1, default: -24 },
      { key: "knee", label: "Knee", min: 0, max: 40, step: 1, default: 30 },
      { key: "ratio", label: "Ratio", min: 1, max: 20, step: 0.5, default: 12 },
      { key: "attack", label: "Attack (s)", min: 0, max: 1, step: 0.001, default: 0.003 },
      { key: "release", label: "Release (s)", min: 0, max: 1, step: 0.01, default: 0.25 },
    ],
  },
  eq: {
    name: "Equalizer",
    description: "3-band EQ: low, mid, high",
    params: [
      { key: "low", label: "Low (dB)", min: -12, max: 12, step: 0.5, default: 0 },
      { key: "mid", label: "Mid (dB)", min: -12, max: 12, step: 0.5, default: 0 },
      { key: "high", label: "High (dB)", min: -12, max: 12, step: 0.5, default: 0 },
    ],
  },
  chorus: {
    name: "Chorus",
    description: "Modulated delay for width",
    params: [
      { key: "rate", label: "Rate (Hz)", min: 0.1, max: 10, step: 0.1, default: 1.5 },
      { key: "depth", label: "Depth", min: 0.001, max: 0.02, step: 0.001, default: 0.005 },
    ],
  },
  phaser: {
    name: "Phaser",
    description: "All-pass filter modulation",
    params: [
      { key: "rate", label: "Rate (Hz)", min: 0.1, max: 5, step: 0.1, default: 0.5 },
      { key: "depth", label: "Depth", min: 100, max: 5000, step: 100, default: 1000 },
    ],
  },
  delay: {
    name: "Delay",
    description: "Filtered feedback delay",
    params: [
      { key: "time", label: "Time (s)", min: 0.05, max: 2, step: 0.01, default: 0.5 },
      { key: "feedback", label: "Feedback", min: 0, max: 0.95, step: 0.01, default: 0.3 },
      { key: "filterFreq", label: "Filter (Hz)", min: 200, max: 10000, step: 100, default: 5000 },
    ],
  },
};

export function ProcessingPanel() {
  const {
    processing,
    addEffect,
    removeEffect,
    updateEffect,
    reorderEffects,
    clearEffects,
    setIsProcessing,
    saveProcessingChain,
    loadProcessingChain,
  } = useAppStore();

  const [sourceBuffer, setSourceBuffer] = useState<AudioBuffer | null>(null);
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null);
  const [sourceWaveform, setSourceWaveform] = useState<number[]>([]);
  const [processedWaveform, setProcessedWaveform] = useState<number[]>([]);
  const [expandedEffect, setExpandedEffect] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const [isPlayingSource, setIsPlayingSource] = useState(false);
  const [isPlayingProcessed, setIsPlayingProcessed] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Generate a test tone to process
  const generateTestSound = useCallback(async () => {
    const buffer = await generateSoundBuffer(
      "Rich textured sound with harmonics and modulation",
      "musical",
      3,
      44100,
      2
    );
    setSourceBuffer(buffer);
    setSourceWaveform(extractWaveformData(buffer, 200));
    setProcessedBuffer(null);
    setProcessedWaveform([]);
  }, []);

  const handleAddEffect = useCallback(
    (type: AudioProcessingEffect) => {
      const def = EFFECT_DEFINITIONS[type];
      const params: Record<string, number> = {};
      def.params.forEach((p) => {
        params[p.key] = p.default;
      });
      addEffect({
        id: generateId(),
        type,
        params,
        enabled: true,
      });
    },
    [addEffect]
  );

  const applyChain = useCallback(async () => {
    if (!sourceBuffer) return;
    setIsProcessing(true);
    try {
      const result = await processAudioBuffer(sourceBuffer, processing.chain);
      setProcessedBuffer(result);
      setProcessedWaveform(extractWaveformData(result, 200));
    } catch (err) {
      console.error("Processing failed:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [sourceBuffer, processing.chain, setIsProcessing]);

  const playBuffer = useCallback(
    async (buffer: AudioBuffer, setPlaying: (v: boolean) => void) => {
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch { /* ignore */ }
      }
      if (audioCtxRef.current) {
        await audioCtxRef.current.close();
      }

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      sourceRef.current = source;
      source.onended = () => setPlaying(false);
      source.start(0);
      setPlaying(true);
    },
    []
  );

  const downloadBuffer = useCallback((buffer: AudioBuffer, name: string) => {
    const wavData = audioBufferToWav(buffer);
    const blob = new Blob([wavData], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sonicforge-${name}.wav`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Source */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AudioWaveform className="h-5 w-5 text-forge-400" />
            <h3 className="section-title">Audio Source</h3>
          </div>
          <button onClick={generateTestSound} className="btn-secondary text-xs">
            Generate Test Sound
          </button>
        </div>

        {sourceBuffer ? (
          <div className="space-y-3">
            <div className="flex justify-center bg-dark-950 rounded-lg p-3">
              <WaveformDisplay data={sourceWaveform} width={700} height={80} />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => playBuffer(sourceBuffer, setIsPlayingSource)}
                className="btn-secondary text-xs"
              >
                {isPlayingSource ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isPlayingSource ? "Stop" : "Play Source"}
              </button>
              <span className="text-xs text-dark-400">
                {sourceBuffer.duration.toFixed(2)}s | {sourceBuffer.sampleRate}Hz | {sourceBuffer.numberOfChannels}ch
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Upload className="h-10 w-10 text-dark-600 mb-3" />
            <p className="text-sm text-dark-400">Generate a test sound or upload audio to process</p>
          </div>
        )}
      </div>

      {/* Effects Chain */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Effects Chain ({processing.chain.length})</h3>
          <div className="flex items-center gap-2">
            {processing.chain.length > 0 && (
              <button onClick={clearEffects} className="btn-ghost text-xs text-red-400">
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
            <button
              onClick={applyChain}
              disabled={!sourceBuffer || processing.chain.length === 0 || processing.isProcessing}
              className="btn-primary text-xs"
            >
              {processing.isProcessing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <AudioWaveform className="h-3.5 w-3.5" />
              )}
              Apply Chain
            </button>
          </div>
        </div>

        {/* Add effect buttons */}
        <div className="mb-4">
          <p className="label-text mb-2">Add Effect</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(EFFECT_DEFINITIONS) as AudioProcessingEffect[]).map((type) => (
              <button
                key={type}
                onClick={() => handleAddEffect(type)}
                className="btn-secondary text-xs"
              >
                <Plus className="h-3 w-3" />
                {EFFECT_DEFINITIONS[type].name}
              </button>
            ))}
          </div>
        </div>

        {/* Chain list */}
        {processing.chain.length > 0 ? (
          <div className="space-y-2">
            {processing.chain.map((effect, index) => {
              const def = EFFECT_DEFINITIONS[effect.type];
              const isExpanded = expandedEffect === effect.id;
              return (
                <div
                  key={effect.id}
                  className={cn(
                    "rounded-lg border transition-colors",
                    effect.enabled
                      ? "border-dark-600 bg-dark-800/50"
                      : "border-dark-700 bg-dark-900 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3 p-3">
                    <GripVertical className="h-4 w-4 text-dark-500 cursor-grab shrink-0" />
                    <span className="text-xs text-dark-500 font-mono w-5">{index + 1}</span>
                    <button
                      onClick={() => updateEffect(effect.id, { enabled: !effect.enabled })}
                      className={cn(
                        "shrink-0",
                        effect.enabled ? "text-sonic-400" : "text-dark-500"
                      )}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-dark-100">{def.name}</span>
                      <span className="ml-2 text-xs text-dark-500">{def.description}</span>
                    </div>
                    <button
                      onClick={() => setExpandedEffect(isExpanded ? null : effect.id)}
                      className="btn-ghost"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => removeEffect(effect.id)}
                      className="btn-ghost text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Expanded params */}
                  {isExpanded && (
                    <div className="border-t border-dark-700 px-3 py-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {def.params.map((param) => (
                          <div key={param.key}>
                            <label className="label-text">{param.label}</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                value={effect.params[param.key] ?? param.default}
                                onChange={(e) =>
                                  updateEffect(effect.id, {
                                    params: {
                                      ...effect.params,
                                      [param.key]: parseFloat(e.target.value),
                                    },
                                  })
                                }
                                className="slider-track flex-1"
                              />
                              <span className="text-xs text-dark-300 w-14 text-right font-mono">
                                {(effect.params[param.key] ?? param.default).toFixed(
                                  param.step < 1 ? (param.step < 0.01 ? 3 : 2) : 0
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-dark-500">
            Add effects to build your processing chain
          </div>
        )}
      </div>

      {/* Save / Load Chains */}
      <div className="card">
        <h3 className="section-title mb-4">Saved Chains</h3>
        <div className="flex gap-3 mb-4">
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Chain name..."
            className="input-field flex-1"
          />
          <button
            onClick={() => {
              if (saveName.trim() && processing.chain.length > 0) {
                saveProcessingChain(saveName.trim());
                setSaveName("");
              }
            }}
            disabled={!saveName.trim() || processing.chain.length === 0}
            className="btn-secondary"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>

        {processing.savedChains.length > 0 ? (
          <div className="space-y-2">
            {processing.savedChains.map((chain) => (
              <div
                key={chain.id}
                className="flex items-center justify-between rounded-lg border border-dark-700 bg-dark-800/50 p-3"
              >
                <div>
                  <span className="text-sm font-medium text-dark-200">{chain.name}</span>
                  <span className="ml-2 text-xs text-dark-500">
                    {chain.effects.length} effect{chain.effects.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <button
                  onClick={() => loadProcessingChain(chain)}
                  className="btn-secondary text-xs"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  Load
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-dark-500 text-center py-4">No saved chains yet</p>
        )}
      </div>

      {/* Output */}
      {processedBuffer && (
        <div className="card">
          <h3 className="section-title mb-4">Processed Output</h3>
          <div className="flex justify-center bg-dark-950 rounded-lg p-3 mb-3">
            <WaveformDisplay data={processedWaveform} width={700} height={80} color="#ff9800" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => playBuffer(processedBuffer, setIsPlayingProcessed)}
              className="btn-primary text-xs"
            >
              {isPlayingProcessed ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isPlayingProcessed ? "Stop" : "Play Processed"}
            </button>
            <button
              onClick={() => downloadBuffer(processedBuffer, "processed")}
              className="btn-secondary text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
            <span className="text-xs text-dark-400">
              {processedBuffer.duration.toFixed(2)}s | {processedBuffer.sampleRate}Hz
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
