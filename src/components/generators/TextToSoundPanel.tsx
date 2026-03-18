"use client";

import { useState, useRef, useCallback } from "react";
import {
  Sparkles,
  Play,
  Pause,
  Download,
  Trash2,
  Heart,
  Copy,
  RotateCcw,
  Loader2,
  Wand2,
  Volume2,
  Clock,
  Radio,
} from "lucide-react";
import { useAppStore } from "@/store";
import { WaveformDisplay } from "@/components/visualizers/WaveformDisplay";
import { SpectrogramDisplay } from "@/components/visualizers/SpectrogramDisplay";
import { LiveAnalyzer } from "@/components/visualizers/LiveAnalyzer";
import {
  generateSoundBuffer,
  extractWaveformData,
  extractSpectrogramData,
  audioBufferToWav,
  generateVariation,
} from "@/lib/audio-engine";
import { SOUND_CATEGORIES, type SoundCategory, type GeneratedSound } from "@/types";
import { generateId, formatDuration } from "@/lib/utils";

export function TextToSoundPanel() {
  const {
    generator,
    setPrompt,
    setCategory,
    setDuration,
    setSampleRate,
    setChannels,
    setVariations,
    setIsGenerating,
    addGeneratedSound,
    removeGeneratedSound,
    setCurrentPlayingId,
    clearGeneratedSounds,
    setAudioBuffer,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<"waveform" | "spectrogram" | "live">("waveform");
  const [selectedSound, setSelectedSound] = useState<GeneratedSound | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingBuffer, setPlayingBuffer] = useState<AudioBuffer | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!generator.prompt.trim() || generator.isGenerating) return;

    setIsGenerating(true);
    try {
      for (let i = 0; i < generator.variations; i++) {
        const prompt =
          i === 0
            ? generator.prompt
            : generateVariation(generator.prompt, i);

        const buffer = await generateSoundBuffer(
          prompt,
          generator.category,
          generator.duration,
          generator.sampleRate,
          generator.channels
        );

        const waveformData = extractWaveformData(buffer, 200);
        const spectrogramData = extractSpectrogramData(buffer, 1024, 256);
        const wavData = audioBufferToWav(buffer);
        const blob = new Blob([wavData], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(blob);

        const sound: GeneratedSound = {
          id: generateId(),
          name: `${generator.category}-${prompt.substring(0, 30)}`,
          prompt,
          category: generator.category,
          duration: generator.duration,
          sampleRate: generator.sampleRate,
          channels: generator.channels,
          audioUrl,
          waveformData,
          spectrogramData,
          createdAt: new Date().toISOString(),
          userId: "local",
          tags: [generator.category],
          isLoop: false,
        };

        addGeneratedSound(sound);
        if (i === 0) {
          setSelectedSound(sound);
          setPlayingBuffer(buffer);
          setAudioBuffer(buffer);
        }
      }
    } catch (err) {
      console.error("Generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [
    generator.prompt,
    generator.category,
    generator.duration,
    generator.sampleRate,
    generator.channels,
    generator.variations,
    generator.isGenerating,
    setIsGenerating,
    addGeneratedSound,
    setAudioBuffer,
  ]);

  const playSound = useCallback(
    async (sound: GeneratedSound) => {
      // Stop current
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      if (audioCtxRef.current) {
        await audioCtxRef.current.close();
      }

      if (generator.currentPlayingId === sound.id) {
        setCurrentPlayingId(null);
        setIsPlaying(false);
        return;
      }

      try {
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;

        const response = await fetch(sound.audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await audioCtx.decodeAudioData(arrayBuffer);

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        sourceNodeRef.current = source;

        source.onended = () => {
          setCurrentPlayingId(null);
          setIsPlaying(false);
        };

        source.start(0);
        setCurrentPlayingId(sound.id);
        setIsPlaying(true);
        setSelectedSound(sound);
        setPlayingBuffer(buffer);
        setAudioBuffer(buffer);
      } catch (err) {
        console.error("Playback failed:", err);
      }
    },
    [generator.currentPlayingId, setCurrentPlayingId, setAudioBuffer]
  );

  const downloadSound = useCallback((sound: GeneratedSound) => {
    const link = document.createElement("a");
    link.href = sound.audioUrl;
    link.download = `${sound.name}.wav`;
    link.click();
  }, []);

  const randomPrompt = useCallback(() => {
    const category = SOUND_CATEGORIES.find((c) => c.id === generator.category);
    if (category) {
      const prompts = category.samplePrompts;
      const random = prompts[Math.floor(Math.random() * prompts.length)];
      setPrompt(random);
    }
  }, [generator.category, setPrompt]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main Input Card */}
      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-forge-400" />
          <h3 className="section-title">Describe Your Sound</h3>
        </div>

        <div className="space-y-4">
          {/* Prompt */}
          <div>
            <div className="relative">
              <textarea
                value={generator.prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Gentle rain on a tin roof with distant thunder rolling across the valley..."
                className="input-field min-h-[100px] resize-none pr-12"
                rows={3}
              />
              <button
                onClick={randomPrompt}
                className="absolute right-3 top-3 rounded-md p-1.5 text-dark-400 hover:bg-dark-700 hover:text-dark-200 transition-colors"
                title="Random prompt"
              >
                <Wand2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Parameters Grid */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {/* Category */}
            <div>
              <label className="label-text">Category</label>
              <select
                value={generator.category}
                onChange={(e) => setCategory(e.target.value as SoundCategory)}
                className="select-field"
              >
                {SOUND_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="label-text flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Duration
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0.5}
                  max={30}
                  step={0.5}
                  value={generator.duration}
                  onChange={(e) => setDuration(parseFloat(e.target.value))}
                  className="slider-track flex-1"
                />
                <span className="text-xs text-dark-300 w-10 text-right">
                  {generator.duration}s
                </span>
              </div>
            </div>

            {/* Sample Rate */}
            <div>
              <label className="label-text flex items-center gap-1">
                <Radio className="h-3 w-3" />
                Sample Rate
              </label>
              <select
                value={generator.sampleRate}
                onChange={(e) => setSampleRate(parseInt(e.target.value))}
                className="select-field"
              >
                <option value={22050}>22.05 kHz</option>
                <option value={44100}>44.1 kHz</option>
                <option value={48000}>48 kHz</option>
                <option value={96000}>96 kHz</option>
              </select>
            </div>

            {/* Channels */}
            <div>
              <label className="label-text flex items-center gap-1">
                <Volume2 className="h-3 w-3" />
                Channels
              </label>
              <select
                value={generator.channels}
                onChange={(e) => setChannels(parseInt(e.target.value) as 1 | 2)}
                className="select-field"
              >
                <option value={1}>Mono</option>
                <option value={2}>Stereo</option>
              </select>
            </div>

            {/* Variations */}
            <div>
              <label className="label-text">Variations</label>
              <select
                value={generator.variations}
                onChange={(e) => setVariations(parseInt(e.target.value))}
                className="select-field"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <button
                onClick={handleGenerate}
                disabled={!generator.prompt.trim() || generator.isGenerating}
                className="btn-primary w-full"
              >
                {generator.isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Forging...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visualization Area */}
      {selectedSound && (
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="section-title">Visualization</h3>
              <span className="badge-sonic">{selectedSound.name}</span>
            </div>
            <div className="flex gap-1 rounded-lg bg-dark-800 p-1">
              {(["waveform", "spectrogram", "live"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-dark-700 text-dark-50"
                      : "text-dark-400 hover:text-dark-200"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center rounded-lg bg-dark-950 p-4">
            {activeTab === "waveform" && (
              <WaveformDisplay
                data={selectedSound.waveformData}
                width={800}
                height={150}
                interactive
              />
            )}
            {activeTab === "spectrogram" && (
              <SpectrogramDisplay
                data={selectedSound.spectrogramData}
                width={800}
                height={200}
                colorScheme="heat"
              />
            )}
            {activeTab === "live" && (
              <LiveAnalyzer
                audioBuffer={playingBuffer}
                isPlaying={isPlaying}
                mode="both"
                width={800}
                height={200}
              />
            )}
          </div>
        </div>
      )}

      {/* Generated Sounds List */}
      {generator.generatedSounds.length > 0 && (
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="section-title">
              Generated Sounds ({generator.generatedSounds.length})
            </h3>
            <button onClick={clearGeneratedSounds} className="btn-ghost text-xs text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
              Clear All
            </button>
          </div>

          <div className="space-y-2">
            {generator.generatedSounds.map((sound) => (
              <div
                key={sound.id}
                className={`flex items-center gap-4 rounded-lg border p-3 transition-all cursor-pointer ${
                  selectedSound?.id === sound.id
                    ? "border-sonic-500/40 bg-sonic-500/5"
                    : "border-dark-700 bg-dark-800/50 hover:border-dark-600"
                }`}
                onClick={() => setSelectedSound(sound)}
              >
                {/* Play button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playSound(sound);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-sonic-600 text-white hover:bg-sonic-500 transition-colors shrink-0"
                >
                  {generator.currentPlayingId === sound.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5" />
                  )}
                </button>

                {/* Mini waveform */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-dark-100 truncate">
                      {sound.prompt.substring(0, 60)}
                      {sound.prompt.length > 60 ? "..." : ""}
                    </span>
                    <span className="badge-sonic shrink-0">{sound.category}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-dark-400">
                    <span>{formatDuration(sound.duration)}</span>
                    <span>{sound.sampleRate / 1000}kHz</span>
                    <span>{sound.channels === 2 ? "Stereo" : "Mono"}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadSound(sound);
                    }}
                    className="btn-ghost"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button className="btn-ghost" title="Favorite">
                    <Heart className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeGeneratedSound(sound.id);
                    }}
                    className="btn-ghost text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
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
