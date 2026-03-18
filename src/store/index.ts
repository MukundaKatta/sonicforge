"use client";

import { create } from "zustand";
import type {
  GeneratedSound,
  SoundCategory,
  SoundLayer,
  Soundscape,
  AppliedEffect,
  AudioProcessingChain,
  LibraryItem,
  LoopSettings,
  ExportFormat,
} from "@/types";
import { generateId } from "@/lib/utils";

interface GeneratorState {
  prompt: string;
  category: SoundCategory;
  duration: number;
  sampleRate: number;
  channels: 1 | 2;
  variations: number;
  isGenerating: boolean;
  generatedSounds: GeneratedSound[];
  currentPlayingId: string | null;
  audioBuffer: AudioBuffer | null;
}

interface WorkstationState {
  layers: SoundLayer[];
  selectedLayerId: string | null;
  masterVolume: number;
  isPlaying: boolean;
  playbackPosition: number;
  zoom: number;
  snapToGrid: boolean;
  gridSize: number;
}

interface SoundscapeState {
  currentSoundscape: Soundscape | null;
  savedSoundscapes: Soundscape[];
}

interface LoopState {
  settings: LoopSettings;
  isRecording: boolean;
}

interface ProcessingState {
  chain: AppliedEffect[];
  savedChains: AudioProcessingChain[];
  isProcessing: boolean;
}

interface LibraryState {
  items: LibraryItem[];
  searchQuery: string;
  filterCategory: SoundCategory | "all";
  filterType: LibraryItem["type"] | "all";
  sortBy: "name" | "date" | "duration" | "size";
  sortOrder: "asc" | "desc";
  selectedItems: string[];
  viewMode: "grid" | "list";
}

interface AppState {
  generator: GeneratorState;
  workstation: WorkstationState;
  soundscape: SoundscapeState;
  loop: LoopState;
  processing: ProcessingState;
  library: LibraryState;
  activeView: string;

  // Generator actions
  setPrompt: (prompt: string) => void;
  setCategory: (category: SoundCategory) => void;
  setDuration: (duration: number) => void;
  setSampleRate: (rate: number) => void;
  setChannels: (channels: 1 | 2) => void;
  setVariations: (count: number) => void;
  setIsGenerating: (value: boolean) => void;
  addGeneratedSound: (sound: GeneratedSound) => void;
  removeGeneratedSound: (id: string) => void;
  setCurrentPlayingId: (id: string | null) => void;
  setAudioBuffer: (buffer: AudioBuffer | null) => void;
  clearGeneratedSounds: () => void;

  // Workstation actions
  addLayer: (layer: SoundLayer) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<SoundLayer>) => void;
  setSelectedLayerId: (id: string | null) => void;
  setMasterVolume: (vol: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackPosition: (pos: number) => void;
  setZoom: (zoom: number) => void;
  toggleSnapToGrid: () => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;

  // Soundscape actions
  setCurrentSoundscape: (s: Soundscape | null) => void;
  addSavedSoundscape: (s: Soundscape) => void;

  // Loop actions
  setLoopSettings: (settings: Partial<LoopSettings>) => void;
  setIsRecording: (recording: boolean) => void;

  // Processing actions
  addEffect: (effect: AppliedEffect) => void;
  removeEffect: (id: string) => void;
  updateEffect: (id: string, updates: Partial<AppliedEffect>) => void;
  reorderEffects: (fromIndex: number, toIndex: number) => void;
  clearEffects: () => void;
  setIsProcessing: (processing: boolean) => void;
  saveProcessingChain: (name: string) => void;
  loadProcessingChain: (chain: AudioProcessingChain) => void;

  // Library actions
  setLibraryItems: (items: LibraryItem[]) => void;
  addLibraryItem: (item: LibraryItem) => void;
  removeLibraryItem: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setFilterCategory: (cat: SoundCategory | "all") => void;
  setFilterType: (type: LibraryItem["type"] | "all") => void;
  setSortBy: (sort: LibraryState["sortBy"]) => void;
  toggleSortOrder: () => void;
  toggleItemSelection: (id: string) => void;
  clearSelection: () => void;
  setViewMode: (mode: "grid" | "list") => void;
  toggleFavorite: (id: string) => void;

  // Nav
  setActiveView: (view: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  generator: {
    prompt: "",
    category: "nature",
    duration: 3,
    sampleRate: 44100,
    channels: 2,
    variations: 1,
    isGenerating: false,
    generatedSounds: [],
    currentPlayingId: null,
    audioBuffer: null,
  },
  workstation: {
    layers: [],
    selectedLayerId: null,
    masterVolume: 0.8,
    isPlaying: false,
    playbackPosition: 0,
    zoom: 1,
    snapToGrid: true,
    gridSize: 0.25,
  },
  soundscape: {
    currentSoundscape: null,
    savedSoundscapes: [],
  },
  loop: {
    settings: {
      bpm: 120,
      bars: 4,
      timeSignature: [4, 4],
      key: "C",
      scale: "major",
      seamless: true,
    },
    isRecording: false,
  },
  processing: {
    chain: [],
    savedChains: [],
    isProcessing: false,
  },
  library: {
    items: [],
    searchQuery: "",
    filterCategory: "all",
    filterType: "all",
    sortBy: "date",
    sortOrder: "desc",
    selectedItems: [],
    viewMode: "grid",
  },
  activeView: "text-to-sound",

  // Generator
  setPrompt: (prompt) => set((s) => ({ generator: { ...s.generator, prompt } })),
  setCategory: (category) => set((s) => ({ generator: { ...s.generator, category } })),
  setDuration: (duration) => set((s) => ({ generator: { ...s.generator, duration } })),
  setSampleRate: (sampleRate) => set((s) => ({ generator: { ...s.generator, sampleRate } })),
  setChannels: (channels) => set((s) => ({ generator: { ...s.generator, channels } })),
  setVariations: (variations) => set((s) => ({ generator: { ...s.generator, variations } })),
  setIsGenerating: (isGenerating) => set((s) => ({ generator: { ...s.generator, isGenerating } })),
  addGeneratedSound: (sound) =>
    set((s) => ({ generator: { ...s.generator, generatedSounds: [...s.generator.generatedSounds, sound] } })),
  removeGeneratedSound: (id) =>
    set((s) => ({ generator: { ...s.generator, generatedSounds: s.generator.generatedSounds.filter((x) => x.id !== id) } })),
  setCurrentPlayingId: (id) => set((s) => ({ generator: { ...s.generator, currentPlayingId: id } })),
  setAudioBuffer: (buffer) => set((s) => ({ generator: { ...s.generator, audioBuffer: buffer } })),
  clearGeneratedSounds: () => set((s) => ({ generator: { ...s.generator, generatedSounds: [] } })),

  // Workstation
  addLayer: (layer) => set((s) => ({ workstation: { ...s.workstation, layers: [...s.workstation.layers, layer] } })),
  removeLayer: (id) =>
    set((s) => ({
      workstation: {
        ...s.workstation,
        layers: s.workstation.layers.filter((l) => l.id !== id),
        selectedLayerId: s.workstation.selectedLayerId === id ? null : s.workstation.selectedLayerId,
      },
    })),
  updateLayer: (id, updates) =>
    set((s) => ({
      workstation: {
        ...s.workstation,
        layers: s.workstation.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      },
    })),
  setSelectedLayerId: (id) => set((s) => ({ workstation: { ...s.workstation, selectedLayerId: id } })),
  setMasterVolume: (vol) => set((s) => ({ workstation: { ...s.workstation, masterVolume: vol } })),
  setIsPlaying: (playing) => set((s) => ({ workstation: { ...s.workstation, isPlaying: playing } })),
  setPlaybackPosition: (pos) => set((s) => ({ workstation: { ...s.workstation, playbackPosition: pos } })),
  setZoom: (zoom) => set((s) => ({ workstation: { ...s.workstation, zoom } })),
  toggleSnapToGrid: () =>
    set((s) => ({ workstation: { ...s.workstation, snapToGrid: !s.workstation.snapToGrid } })),
  reorderLayers: (from, to) =>
    set((s) => {
      const layers = [...s.workstation.layers];
      const [removed] = layers.splice(from, 1);
      layers.splice(to, 0, removed);
      return { workstation: { ...s.workstation, layers } };
    }),

  // Soundscape
  setCurrentSoundscape: (s) => set((st) => ({ soundscape: { ...st.soundscape, currentSoundscape: s } })),
  addSavedSoundscape: (s) =>
    set((st) => ({ soundscape: { ...st.soundscape, savedSoundscapes: [...st.soundscape.savedSoundscapes, s] } })),

  // Loop
  setLoopSettings: (settings) =>
    set((s) => ({ loop: { ...s.loop, settings: { ...s.loop.settings, ...settings } } })),
  setIsRecording: (recording) => set((s) => ({ loop: { ...s.loop, isRecording: recording } })),

  // Processing
  addEffect: (effect) =>
    set((s) => ({ processing: { ...s.processing, chain: [...s.processing.chain, effect] } })),
  removeEffect: (id) =>
    set((s) => ({ processing: { ...s.processing, chain: s.processing.chain.filter((e) => e.id !== id) } })),
  updateEffect: (id, updates) =>
    set((s) => ({
      processing: {
        ...s.processing,
        chain: s.processing.chain.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      },
    })),
  reorderEffects: (from, to) =>
    set((s) => {
      const chain = [...s.processing.chain];
      const [removed] = chain.splice(from, 1);
      chain.splice(to, 0, removed);
      return { processing: { ...s.processing, chain } };
    }),
  clearEffects: () => set((s) => ({ processing: { ...s.processing, chain: [] } })),
  setIsProcessing: (processing) => set((s) => ({ processing: { ...s.processing, isProcessing: processing } })),
  saveProcessingChain: (name) =>
    set((s) => ({
      processing: {
        ...s.processing,
        savedChains: [
          ...s.processing.savedChains,
          { id: generateId(), name, effects: [...s.processing.chain] },
        ],
      },
    })),
  loadProcessingChain: (chain) =>
    set((s) => ({ processing: { ...s.processing, chain: [...chain.effects] } })),

  // Library
  setLibraryItems: (items) => set((s) => ({ library: { ...s.library, items } })),
  addLibraryItem: (item) =>
    set((s) => ({ library: { ...s.library, items: [...s.library.items, item] } })),
  removeLibraryItem: (id) =>
    set((s) => ({ library: { ...s.library, items: s.library.items.filter((i) => i.id !== id) } })),
  setSearchQuery: (query) => set((s) => ({ library: { ...s.library, searchQuery: query } })),
  setFilterCategory: (cat) => set((s) => ({ library: { ...s.library, filterCategory: cat } })),
  setFilterType: (type) => set((s) => ({ library: { ...s.library, filterType: type } })),
  setSortBy: (sort) => set((s) => ({ library: { ...s.library, sortBy: sort } })),
  toggleSortOrder: () =>
    set((s) => ({ library: { ...s.library, sortOrder: s.library.sortOrder === "asc" ? "desc" : "asc" } })),
  toggleItemSelection: (id) =>
    set((s) => ({
      library: {
        ...s.library,
        selectedItems: s.library.selectedItems.includes(id)
          ? s.library.selectedItems.filter((x) => x !== id)
          : [...s.library.selectedItems, id],
      },
    })),
  clearSelection: () => set((s) => ({ library: { ...s.library, selectedItems: [] } })),
  setViewMode: (mode) => set((s) => ({ library: { ...s.library, viewMode: mode } })),
  toggleFavorite: (id) =>
    set((s) => ({
      library: {
        ...s.library,
        items: s.library.items.map((i) => (i.id === id ? { ...i, isFavorite: !i.isFavorite } : i)),
      },
    })),

  setActiveView: (view) => set({ activeView: view }),
}));
