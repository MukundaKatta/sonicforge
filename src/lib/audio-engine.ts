"use client";

import * as Tone from "tone";
import type { SoundCategory, AppliedEffect, AudioProcessingEffect } from "@/types";

interface OscillatorConfig {
  type: OscillatorType;
  frequency: number;
  detune: number;
  volume: number;
}

interface NoiseConfig {
  type: "white" | "pink" | "brown";
  volume: number;
  filterFreq: number;
  filterType: BiquadFilterType;
}

interface SynthesisRecipe {
  oscillators: OscillatorConfig[];
  noises: NoiseConfig[];
  envelope: { attack: number; decay: number; sustain: number; release: number };
  lfo?: { frequency: number; min: number; max: number; target: string };
  filterEnvelope?: { baseFrequency: number; octaves: number; attack: number; decay: number; sustain: number; release: number };
}

const CATEGORY_RECIPES: Record<SoundCategory, () => SynthesisRecipe> = {
  nature: () => ({
    oscillators: [],
    noises: [
      { type: "pink", volume: -12, filterFreq: 2000, filterType: "lowpass" },
      { type: "brown", volume: -18, filterFreq: 800, filterType: "lowpass" },
    ],
    envelope: { attack: 0.5, decay: 0.3, sustain: 0.7, release: 1.5 },
    lfo: { frequency: 0.3, min: 500, max: 3000, target: "filterFreq" },
  }),
  urban: () => ({
    oscillators: [
      { type: "sawtooth", frequency: 80, detune: 0, volume: -20 },
    ],
    noises: [
      { type: "white", volume: -24, filterFreq: 4000, filterType: "bandpass" },
      { type: "pink", volume: -15, filterFreq: 1500, filterType: "lowpass" },
    ],
    envelope: { attack: 0.3, decay: 0.2, sustain: 0.8, release: 0.5 },
    lfo: { frequency: 0.1, min: 800, max: 2000, target: "filterFreq" },
  }),
  mechanical: () => ({
    oscillators: [
      { type: "square", frequency: 120, detune: 0, volume: -15 },
      { type: "sawtooth", frequency: 60, detune: 5, volume: -20 },
    ],
    noises: [
      { type: "white", volume: -22, filterFreq: 5000, filterType: "highpass" },
    ],
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.2 },
    lfo: { frequency: 4, min: 50, max: 200, target: "frequency" },
  }),
  "sci-fi": () => ({
    oscillators: [
      { type: "sine", frequency: 440, detune: 0, volume: -10 },
      { type: "square", frequency: 880, detune: -10, volume: -18 },
      { type: "sawtooth", frequency: 220, detune: 7, volume: -22 },
    ],
    noises: [
      { type: "white", volume: -30, filterFreq: 8000, filterType: "bandpass" },
    ],
    envelope: { attack: 0.05, decay: 0.3, sustain: 0.5, release: 0.8 },
    lfo: { frequency: 2, min: 200, max: 2000, target: "frequency" },
    filterEnvelope: { baseFrequency: 200, octaves: 4, attack: 0.2, decay: 0.5, sustain: 0.3, release: 0.5 },
  }),
  fantasy: () => ({
    oscillators: [
      { type: "sine", frequency: 523, detune: 0, volume: -8 },
      { type: "triangle", frequency: 784, detune: 3, volume: -14 },
      { type: "sine", frequency: 1047, detune: -2, volume: -20 },
    ],
    noises: [
      { type: "pink", volume: -30, filterFreq: 6000, filterType: "highpass" },
    ],
    envelope: { attack: 0.3, decay: 0.5, sustain: 0.4, release: 2.0 },
    lfo: { frequency: 0.5, min: 400, max: 1200, target: "frequency" },
  }),
  musical: () => ({
    oscillators: [
      { type: "sawtooth", frequency: 220, detune: 0, volume: -10 },
      { type: "sawtooth", frequency: 220, detune: 7, volume: -12 },
      { type: "square", frequency: 440, detune: -5, volume: -18 },
    ],
    noises: [],
    envelope: { attack: 0.1, decay: 0.4, sustain: 0.6, release: 1.0 },
    lfo: { frequency: 0.8, min: -20, max: 20, target: "detune" },
    filterEnvelope: { baseFrequency: 300, octaves: 3, attack: 0.1, decay: 0.6, sustain: 0.4, release: 0.8 },
  }),
  abstract: () => ({
    oscillators: [
      { type: "sawtooth", frequency: 100, detune: 0, volume: -12 },
      { type: "square", frequency: 150, detune: 50, volume: -15 },
      { type: "triangle", frequency: 300, detune: -30, volume: -18 },
    ],
    noises: [
      { type: "white", volume: -20, filterFreq: 3000, filterType: "bandpass" },
      { type: "brown", volume: -24, filterFreq: 500, filterType: "lowpass" },
    ],
    envelope: { attack: 0.2, decay: 0.6, sustain: 0.3, release: 1.5 },
    lfo: { frequency: 1.5, min: 50, max: 5000, target: "filterFreq" },
  }),
};

function hashPrompt(prompt: string): number {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const chr = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash);
}

function modulateRecipe(recipe: SynthesisRecipe, prompt: string): SynthesisRecipe {
  const h = hashPrompt(prompt);
  const mod = (n: number, range: number, offset: number) =>
    offset + (((h >> n) & 0xff) / 255) * range;

  const modulated = { ...recipe };
  modulated.oscillators = recipe.oscillators.map((osc, i) => ({
    ...osc,
    frequency: osc.frequency * (0.8 + mod(i * 3, 0.4, 0)),
    detune: osc.detune + mod(i * 5 + 1, 20, -10),
    volume: osc.volume + mod(i * 7 + 2, 6, -3),
  }));

  modulated.noises = recipe.noises.map((n, i) => ({
    ...n,
    filterFreq: n.filterFreq * (0.5 + mod(i * 11 + 3, 1, 0)),
    volume: n.volume + mod(i * 13 + 4, 4, -2),
  }));

  if (modulated.lfo) {
    modulated.lfo = {
      ...modulated.lfo,
      frequency: modulated.lfo.frequency * (0.5 + mod(17, 1.5, 0)),
    };
  }

  modulated.envelope = {
    attack: Math.max(0.001, recipe.envelope.attack * (0.5 + mod(19, 1, 0))),
    decay: Math.max(0.01, recipe.envelope.decay * (0.5 + mod(21, 1, 0))),
    sustain: Math.min(1, Math.max(0, recipe.envelope.sustain * (0.7 + mod(23, 0.6, 0)))),
    release: Math.max(0.01, recipe.envelope.release * (0.5 + mod(25, 1, 0))),
  };

  return modulated;
}

export async function generateSoundBuffer(
  prompt: string,
  category: SoundCategory,
  duration: number,
  sampleRate: number = 44100,
  channels: 1 | 2 = 2
): Promise<AudioBuffer> {
  await Tone.start();

  const offlineContext = new OfflineAudioContext(channels, sampleRate * duration, sampleRate);
  const baseRecipe = CATEGORY_RECIPES[category]();
  const recipe = modulateRecipe(baseRecipe, prompt);

  const masterGain = offlineContext.createGain();
  masterGain.gain.value = 0.7;
  masterGain.connect(offlineContext.destination);

  const envelopeGain = offlineContext.createGain();
  envelopeGain.gain.setValueAtTime(0, 0);
  envelopeGain.gain.linearRampToValueAtTime(1, recipe.envelope.attack);
  envelopeGain.gain.linearRampToValueAtTime(
    recipe.envelope.sustain,
    recipe.envelope.attack + recipe.envelope.decay
  );
  envelopeGain.gain.setValueAtTime(recipe.envelope.sustain, duration - recipe.envelope.release);
  envelopeGain.gain.linearRampToValueAtTime(0, duration);
  envelopeGain.connect(masterGain);

  const filterNode = offlineContext.createBiquadFilter();
  filterNode.type = "lowpass";
  filterNode.frequency.value = 4000;
  filterNode.Q.value = 1;
  filterNode.connect(envelopeGain);

  if (recipe.lfo && recipe.lfo.target === "filterFreq") {
    const lfo = offlineContext.createOscillator();
    const lfoGain = offlineContext.createGain();
    lfo.type = "sine";
    lfo.frequency.value = recipe.lfo.frequency;
    lfoGain.gain.value = (recipe.lfo.max - recipe.lfo.min) / 2;
    lfo.connect(lfoGain);
    lfoGain.connect(filterNode.frequency);
    filterNode.frequency.value = (recipe.lfo.max + recipe.lfo.min) / 2;
    lfo.start(0);
    lfo.stop(duration);
  }

  for (const oscConfig of recipe.oscillators) {
    const osc = offlineContext.createOscillator();
    const oscGain = offlineContext.createGain();
    osc.type = oscConfig.type;
    osc.frequency.value = oscConfig.frequency;
    osc.detune.value = oscConfig.detune;
    oscGain.gain.value = Math.pow(10, oscConfig.volume / 20);
    osc.connect(oscGain);
    oscGain.connect(filterNode);

    if (recipe.lfo && recipe.lfo.target === "frequency") {
      const lfo = offlineContext.createOscillator();
      const lfoGain = offlineContext.createGain();
      lfo.type = "sine";
      lfo.frequency.value = recipe.lfo.frequency;
      lfoGain.gain.value = (recipe.lfo.max - recipe.lfo.min) / 2;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(0);
      lfo.stop(duration);
    }

    if (recipe.lfo && recipe.lfo.target === "detune") {
      const lfo = offlineContext.createOscillator();
      const lfoGain = offlineContext.createGain();
      lfo.type = "sine";
      lfo.frequency.value = recipe.lfo.frequency;
      lfoGain.gain.value = (recipe.lfo.max - recipe.lfo.min) / 2;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);
      lfo.start(0);
      lfo.stop(duration);
    }

    osc.start(0);
    osc.stop(duration);
  }

  for (const noiseConfig of recipe.noises) {
    const bufferSize = sampleRate * duration;
    const noiseBuffer = offlineContext.createBuffer(1, bufferSize, sampleRate);
    const output = noiseBuffer.getChannelData(0);

    if (noiseConfig.type === "white") {
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } else if (noiseConfig.type === "pink") {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else {
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }
    }

    const noiseSource = offlineContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseGain = offlineContext.createGain();
    noiseGain.gain.value = Math.pow(10, noiseConfig.volume / 20);

    const noiseFilter = offlineContext.createBiquadFilter();
    noiseFilter.type = noiseConfig.filterType;
    noiseFilter.frequency.value = noiseConfig.filterFreq;
    noiseFilter.Q.value = 1;

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(filterNode);

    noiseSource.start(0);
    noiseSource.stop(duration);
  }

  return offlineContext.startRendering();
}

export function applyEffectToBuffer(
  context: BaseAudioContext,
  source: AudioBufferSourceNode,
  effect: AppliedEffect,
  destination: AudioNode
): AudioNode {
  if (!effect.enabled) {
    source.connect(destination);
    return destination;
  }

  switch (effect.type) {
    case "reverb": {
      const convolver = context.createConvolver();
      const reverbTime = effect.params.time || 2;
      const decay = effect.params.decay || 2;
      const sampleRate = context.sampleRate;
      const length = sampleRate * reverbTime;
      const impulse = context.createBuffer(2, length, sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
      }
      convolver.buffer = impulse;
      const wetGain = context.createGain();
      wetGain.gain.value = effect.params.mix || 0.5;
      const dryGain = context.createGain();
      dryGain.gain.value = 1 - (effect.params.mix || 0.5);
      source.connect(convolver);
      convolver.connect(wetGain);
      wetGain.connect(destination);
      source.connect(dryGain);
      dryGain.connect(destination);
      return destination;
    }
    case "echo": {
      const delay = context.createDelay(5);
      delay.delayTime.value = effect.params.time || 0.3;
      const feedback = context.createGain();
      feedback.gain.value = effect.params.feedback || 0.4;
      const wetGain = context.createGain();
      wetGain.gain.value = effect.params.mix || 0.5;
      source.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wetGain);
      wetGain.connect(destination);
      source.connect(destination);
      return destination;
    }
    case "pitch-shift": {
      source.playbackRate.value = Math.pow(2, (effect.params.semitones || 0) / 12);
      source.connect(destination);
      return destination;
    }
    case "spatial-audio": {
      const panner = context.createStereoPanner();
      panner.pan.value = effect.params.pan || 0;
      source.connect(panner);
      panner.connect(destination);
      return destination;
    }
    case "distortion": {
      const waveShaper = context.createWaveShaper();
      const amount = effect.params.amount || 50;
      const samples = 44100;
      const curve = new Float32Array(samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
      }
      waveShaper.curve = curve;
      waveShaper.oversample = "4x";
      source.connect(waveShaper);
      waveShaper.connect(destination);
      return destination;
    }
    case "compressor": {
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = effect.params.threshold || -24;
      compressor.knee.value = effect.params.knee || 30;
      compressor.ratio.value = effect.params.ratio || 12;
      compressor.attack.value = effect.params.attack || 0.003;
      compressor.release.value = effect.params.release || 0.25;
      source.connect(compressor);
      compressor.connect(destination);
      return destination;
    }
    case "eq": {
      const lowShelf = context.createBiquadFilter();
      lowShelf.type = "lowshelf";
      lowShelf.frequency.value = 320;
      lowShelf.gain.value = effect.params.low || 0;
      const mid = context.createBiquadFilter();
      mid.type = "peaking";
      mid.frequency.value = 1000;
      mid.Q.value = 0.5;
      mid.gain.value = effect.params.mid || 0;
      const highShelf = context.createBiquadFilter();
      highShelf.type = "highshelf";
      highShelf.frequency.value = 3200;
      highShelf.gain.value = effect.params.high || 0;
      source.connect(lowShelf);
      lowShelf.connect(mid);
      mid.connect(highShelf);
      highShelf.connect(destination);
      return destination;
    }
    case "chorus": {
      const delayL = context.createDelay(1);
      const delayR = context.createDelay(1);
      delayL.delayTime.value = 0.025;
      delayR.delayTime.value = 0.035;
      const lfoL = context.createOscillator();
      const lfoR = context.createOscillator();
      const lfoGainL = context.createGain();
      const lfoGainR = context.createGain();
      lfoL.frequency.value = effect.params.rate || 1.5;
      lfoR.frequency.value = (effect.params.rate || 1.5) * 1.1;
      lfoGainL.gain.value = (effect.params.depth || 0.005);
      lfoGainR.gain.value = (effect.params.depth || 0.005);
      lfoL.connect(lfoGainL);
      lfoGainL.connect(delayL.delayTime);
      lfoR.connect(lfoGainR);
      lfoGainR.connect(delayR.delayTime);
      lfoL.start();
      lfoR.start();
      const merger = context.createChannelMerger(2);
      source.connect(delayL);
      source.connect(delayR);
      delayL.connect(merger, 0, 0);
      delayR.connect(merger, 0, 1);
      merger.connect(destination);
      source.connect(destination);
      return destination;
    }
    case "phaser": {
      const filters: BiquadFilterNode[] = [];
      const stages = 4;
      let lastNode: AudioNode = source;
      for (let i = 0; i < stages; i++) {
        const filter = context.createBiquadFilter();
        filter.type = "allpass";
        filter.frequency.value = 1000 + i * 500;
        filter.Q.value = 5;
        filters.push(filter);
        lastNode.connect(filter);
        lastNode = filter;
      }
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      lfo.type = "sine";
      lfo.frequency.value = effect.params.rate || 0.5;
      lfoGain.gain.value = effect.params.depth || 1000;
      lfo.connect(lfoGain);
      for (const f of filters) {
        lfoGain.connect(f.frequency);
      }
      lfo.start();
      lastNode.connect(destination);
      source.connect(destination);
      return destination;
    }
    case "delay": {
      const delayNode = context.createDelay(5);
      delayNode.delayTime.value = effect.params.time || 0.5;
      const feedbackGain = context.createGain();
      feedbackGain.gain.value = effect.params.feedback || 0.3;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = effect.params.filterFreq || 5000;
      source.connect(delayNode);
      delayNode.connect(filter);
      filter.connect(feedbackGain);
      feedbackGain.connect(delayNode);
      filter.connect(destination);
      source.connect(destination);
      return destination;
    }
    default:
      source.connect(destination);
      return destination;
  }
}

export async function processAudioBuffer(
  buffer: AudioBuffer,
  effects: AppliedEffect[]
): Promise<AudioBuffer> {
  const enabledEffects = effects.filter((e) => e.enabled);
  if (enabledEffects.length === 0) return buffer;

  const offlineContext = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  let currentBuffer = buffer;

  for (const effect of enabledEffects) {
    const ctx = new OfflineAudioContext(
      currentBuffer.numberOfChannels,
      currentBuffer.length * (effect.type === "pitch-shift" ? Math.pow(2, -(effect.params.semitones || 0) / 12) : 1),
      currentBuffer.sampleRate
    );
    const source = ctx.createBufferSource();
    source.buffer = currentBuffer;
    applyEffectToBuffer(ctx, source, effect, ctx.destination);
    source.start(0);
    currentBuffer = await ctx.startRendering();
  }

  return currentBuffer;
}

export function extractWaveformData(buffer: AudioBuffer, numPoints: number = 200): number[] {
  const channelData = buffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / numPoints);
  const peaks: number[] = [];

  for (let i = 0; i < numPoints; i++) {
    let max = 0;
    const start = i * blockSize;
    for (let j = start; j < start + blockSize && j < channelData.length; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }
    peaks.push(max);
  }

  return peaks;
}

export function extractSpectrogramData(
  buffer: AudioBuffer,
  fftSize: number = 2048,
  hopSize: number = 512
): number[][] {
  const channelData = buffer.getChannelData(0);
  const numFrames = Math.floor((channelData.length - fftSize) / hopSize);
  const spectrogram: number[][] = [];

  for (let frame = 0; frame < numFrames; frame++) {
    const start = frame * hopSize;
    const magnitudes: number[] = [];

    for (let bin = 0; bin < fftSize / 2; bin++) {
      let realSum = 0;
      let imagSum = 0;
      const binFreq = (2 * Math.PI * bin) / fftSize;
      for (let n = 0; n < fftSize; n++) {
        const sample = channelData[start + n] || 0;
        const window = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (fftSize - 1)));
        realSum += sample * window * Math.cos(binFreq * n);
        imagSum -= sample * window * Math.sin(binFreq * n);
      }
      magnitudes.push(Math.sqrt(realSum * realSum + imagSum * imagSum) / fftSize);
    }
    spectrogram.push(magnitudes);
  }

  return spectrogram;
}

export function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

export function generateVariation(
  prompt: string,
  variationIndex: number
): string {
  const variations = [
    `${prompt} with subtle tonal shifts`,
    `${prompt} with more intensity and presence`,
    `${prompt} with softer attack and longer decay`,
    `${prompt} with added harmonic overtones`,
    `${prompt} with darker timbre and lower pitch`,
    `${prompt} with brighter character and higher resonance`,
    `${prompt} with rhythmic modulation`,
    `${prompt} with spacious reverb and width`,
  ];
  return variations[variationIndex % variations.length];
}

export function makeSeamlessLoop(buffer: AudioBuffer, crossfadeDuration: number = 0.05): AudioBuffer {
  const ctx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  const crossfadeSamples = Math.floor(crossfadeDuration * buffer.sampleRate);
  const outputBuffer = ctx.createBuffer(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch);
    const output = outputBuffer.getChannelData(ch);

    for (let i = 0; i < buffer.length; i++) {
      output[i] = input[i];
    }

    for (let i = 0; i < crossfadeSamples; i++) {
      const fadeOut = 1 - i / crossfadeSamples;
      const fadeIn = i / crossfadeSamples;
      const endIdx = buffer.length - crossfadeSamples + i;
      const startIdx = i;
      output[endIdx] = input[endIdx] * fadeOut + input[startIdx] * fadeIn;
      output[startIdx] = input[startIdx] * fadeIn + input[endIdx] * fadeOut;
    }
  }

  return outputBuffer;
}
