export type SoundCategory =
  | "nature"
  | "urban"
  | "mechanical"
  | "sci-fi"
  | "fantasy"
  | "musical"
  | "abstract";

export type ExportFormat = "wav" | "mp3" | "ogg" | "flac";

export type AudioProcessingEffect =
  | "reverb"
  | "echo"
  | "pitch-shift"
  | "spatial-audio"
  | "distortion"
  | "chorus"
  | "phaser"
  | "compressor"
  | "eq"
  | "delay";

export interface SoundGenerationParams {
  prompt: string;
  category: SoundCategory;
  duration: number;
  sampleRate: number;
  channels: 1 | 2;
  variations: number;
}

export interface GeneratedSound {
  id: string;
  name: string;
  prompt: string;
  category: SoundCategory;
  duration: number;
  sampleRate: number;
  channels: 1 | 2;
  audioUrl: string;
  waveformData: number[];
  spectrogramData: number[][];
  createdAt: string;
  userId: string;
  tags: string[];
  isLoop: boolean;
  bpm?: number;
  key?: string;
}

export interface SoundLayer {
  id: string;
  soundId: string;
  name: string;
  volume: number;
  pan: number;
  startTime: number;
  duration: number;
  effects: AppliedEffect[];
  muted: boolean;
  solo: boolean;
  color: string;
}

export interface AppliedEffect {
  id: string;
  type: AudioProcessingEffect;
  params: Record<string, number>;
  enabled: boolean;
}

export interface Soundscape {
  id: string;
  name: string;
  description: string;
  layers: SoundLayer[];
  duration: number;
  createdAt: string;
  userId: string;
  tags: string[];
}

export interface GameAudioPreset {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  prompt: string;
  params: Partial<SoundGenerationParams>;
}

export interface FoleyPreset {
  id: string;
  name: string;
  scene: string;
  actions: string[];
  prompt: string;
}

export interface LoopSettings {
  bpm: number;
  bars: number;
  timeSignature: [number, number];
  key: string;
  scale: string;
  seamless: boolean;
}

export interface AudioProcessingChain {
  id: string;
  name: string;
  effects: AppliedEffect[];
}

export interface LibraryItem {
  id: string;
  type: "sound" | "soundscape" | "loop" | "foley" | "game-audio";
  name: string;
  category: SoundCategory;
  tags: string[];
  duration: number;
  fileSize: number;
  format: ExportFormat;
  audioUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  isFavorite: boolean;
  playCount: number;
}

export interface ExportSettings {
  format: ExportFormat;
  sampleRate: number;
  bitDepth: 16 | 24 | 32;
  channels: 1 | 2;
  normalize: boolean;
  fadeIn: number;
  fadeOut: number;
  trimSilence: boolean;
}

export interface WaveformDisplayData {
  peaks: number[];
  duration: number;
  sampleRate: number;
}

export interface SpectrogramDisplayData {
  data: Float32Array[];
  frequencies: number[];
  times: number[];
  sampleRate: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  plan: "free" | "pro" | "enterprise";
  storageUsed: number;
  storageLimit: number;
  generationsToday: number;
  generationLimit: number;
}

export interface CategoryInfo {
  id: SoundCategory;
  name: string;
  description: string;
  icon: string;
  subcategories: string[];
  samplePrompts: string[];
}

export const SOUND_CATEGORIES: CategoryInfo[] = [
  {
    id: "nature",
    name: "Nature",
    description: "Natural environmental sounds - rain, wind, thunder, birds, water, fire",
    icon: "trees",
    subcategories: ["weather", "water", "animals", "wind", "fire", "earth"],
    samplePrompts: [
      "Gentle rain on a tin roof with distant thunder",
      "Forest ambience with birdsong at dawn",
      "Ocean waves crashing on rocky shore",
      "Crackling campfire in quiet woods",
      "Strong windstorm through canyon",
    ],
  },
  {
    id: "urban",
    name: "Urban",
    description: "City and industrial sounds - traffic, crowds, machinery, construction",
    icon: "building-2",
    subcategories: ["traffic", "crowds", "construction", "interior", "transport", "nightlife"],
    samplePrompts: [
      "Busy city intersection with car horns and pedestrians",
      "Subway train arriving at underground station",
      "Coffee shop ambience with conversations and espresso machines",
      "Construction site with jackhammers and heavy equipment",
      "Rainy urban street at night with neon buzzing",
    ],
  },
  {
    id: "mechanical",
    name: "Mechanical",
    description: "Machine and engine sounds - gears, motors, hydraulics, electronics",
    icon: "cog",
    subcategories: ["engines", "gears", "hydraulics", "electronics", "robots", "clocks"],
    samplePrompts: [
      "Industrial steam engine chugging rhythmically",
      "Complex clockwork mechanism ticking",
      "Electric motor whirring to life with servo sounds",
      "Hydraulic press with hissing pneumatics",
      "Old computer hard drive seeking and spinning",
    ],
  },
  {
    id: "sci-fi",
    name: "Sci-Fi",
    description: "Futuristic and space sounds - lasers, warp, shields, aliens, technology",
    icon: "rocket",
    subcategories: ["weapons", "spacecraft", "technology", "aliens", "energy", "communication"],
    samplePrompts: [
      "Spaceship engine powering up with energy hum",
      "Laser blaster firing with energy discharge",
      "Force field activating with electrical crackle",
      "Alien creature communication clicks and warbles",
      "Teleporter beam with shimmer and whoosh",
    ],
  },
  {
    id: "fantasy",
    name: "Fantasy",
    description: "Magical and mythical sounds - spells, creatures, enchantments, portals",
    icon: "wand-2",
    subcategories: ["magic", "creatures", "enchantments", "potions", "portals", "elements"],
    samplePrompts: [
      "Magical spell casting with crystalline shimmer",
      "Dragon roar echoing through a cavern",
      "Enchanted forest with mystical chimes and whispers",
      "Potion bubbling in a cauldron with magical steam",
      "Portal opening with swirling energy vortex",
    ],
  },
  {
    id: "musical",
    name: "Musical",
    description: "Musical textures and tones - drones, pads, hits, risers, impacts",
    icon: "music",
    subcategories: ["drones", "pads", "hits", "risers", "textures", "percussive"],
    samplePrompts: [
      "Deep cinematic drone with evolving harmonics",
      "Warm analog synth pad with gentle modulation",
      "Orchestral impact hit with reverb tail",
      "Tension riser building over 10 seconds",
      "Ethereal vocal texture with reverb wash",
    ],
  },
  {
    id: "abstract",
    name: "Abstract",
    description: "Experimental and artistic sounds - glitch, granular, spectral, noise",
    icon: "sparkles",
    subcategories: ["glitch", "granular", "spectral", "noise", "generative", "experimental"],
    samplePrompts: [
      "Glitchy digital artifacts with stuttering fragments",
      "Granular synthesis cloud of stretched vocals",
      "Spectral drone shifting through harmonic series",
      "White noise sculpted into rhythmic patterns",
      "Generative ambient texture with random events",
    ],
  },
];

export const GAME_AUDIO_PRESETS: GameAudioPreset[] = [
  { id: "ga-1", name: "Footstep - Stone", category: "Character", subcategory: "Movement", prompt: "Footstep on stone floor, single step, dry room acoustics", params: { duration: 0.5 } },
  { id: "ga-2", name: "Footstep - Grass", category: "Character", subcategory: "Movement", prompt: "Footstep on grass, soft step with slight crunch", params: { duration: 0.4 } },
  { id: "ga-3", name: "Footstep - Metal", category: "Character", subcategory: "Movement", prompt: "Footstep on metal grating, metallic ring", params: { duration: 0.5 } },
  { id: "ga-4", name: "Sword Swing", category: "Combat", subcategory: "Melee", prompt: "Sword swinging through air, sharp whoosh", params: { duration: 0.6 } },
  { id: "ga-5", name: "Sword Impact", category: "Combat", subcategory: "Melee", prompt: "Sword hitting metal armor, clang with ring", params: { duration: 0.8 } },
  { id: "ga-6", name: "Bow Release", category: "Combat", subcategory: "Ranged", prompt: "Bow string release with arrow whistle", params: { duration: 0.7 } },
  { id: "ga-7", name: "Explosion - Small", category: "Combat", subcategory: "Impact", prompt: "Small explosion, grenade-like with debris", params: { duration: 1.5 } },
  { id: "ga-8", name: "Explosion - Large", category: "Combat", subcategory: "Impact", prompt: "Large explosion with deep bass rumble and debris", params: { duration: 3.0 } },
  { id: "ga-9", name: "Health Pickup", category: "UI", subcategory: "Pickups", prompt: "Magical healing sound, warm ascending chime", params: { duration: 1.0 } },
  { id: "ga-10", name: "Coin Collect", category: "UI", subcategory: "Pickups", prompt: "Coin collecting sound, bright metallic ding", params: { duration: 0.4 } },
  { id: "ga-11", name: "Level Up", category: "UI", subcategory: "Progress", prompt: "Level up fanfare, ascending bright tones with sparkle", params: { duration: 2.0 } },
  { id: "ga-12", name: "Door Open", category: "Environment", subcategory: "Interaction", prompt: "Heavy wooden door creaking open slowly", params: { duration: 2.0 } },
  { id: "ga-13", name: "Chest Open", category: "Environment", subcategory: "Interaction", prompt: "Treasure chest opening with wooden creak and magical shimmer", params: { duration: 1.5 } },
  { id: "ga-14", name: "Ambient Cave", category: "Environment", subcategory: "Ambient", prompt: "Dark cave ambience with water drips and distant echoes", params: { duration: 10.0 } },
  { id: "ga-15", name: "Ambient Forest", category: "Environment", subcategory: "Ambient", prompt: "Forest ambience with birdsong, rustling leaves, gentle breeze", params: { duration: 10.0 } },
  { id: "ga-16", name: "Jump", category: "Character", subcategory: "Movement", prompt: "Character jump with cloth movement and light whoosh", params: { duration: 0.5 } },
  { id: "ga-17", name: "Land", category: "Character", subcategory: "Movement", prompt: "Character landing on ground, impact with slight grunt", params: { duration: 0.6 } },
  { id: "ga-18", name: "Menu Click", category: "UI", subcategory: "Interface", prompt: "Clean UI click sound, soft and satisfying", params: { duration: 0.15 } },
  { id: "ga-19", name: "Menu Hover", category: "UI", subcategory: "Interface", prompt: "Subtle UI hover sound, very soft tick", params: { duration: 0.1 } },
  { id: "ga-20", name: "Magic Cast", category: "Combat", subcategory: "Magic", prompt: "Spell casting with energy buildup and release, magical whoosh", params: { duration: 1.2 } },
];

export const FOLEY_PRESETS: FoleyPreset[] = [
  { id: "f-1", name: "Walking Interior", scene: "Interior", actions: ["walking", "door", "sitting"], prompt: "Person walking across hardwood floor, opening door, sitting in chair" },
  { id: "f-2", name: "Kitchen Scene", scene: "Kitchen", actions: ["cooking", "chopping", "sizzling", "dishes"], prompt: "Kitchen sounds: knife on cutting board, oil sizzling in pan, dishes clinking" },
  { id: "f-3", name: "Office Scene", scene: "Office", actions: ["typing", "phone", "paper", "chair"], prompt: "Office ambience: keyboard typing, phone ringing, paper shuffling, chair rolling" },
  { id: "f-4", name: "Car Interior", scene: "Vehicle", actions: ["engine", "road", "indicator", "wipers"], prompt: "Car interior: engine running, road noise, turn indicator clicking, windshield wipers" },
  { id: "f-5", name: "Fight Scene", scene: "Action", actions: ["punch", "kick", "fall", "glass"], prompt: "Fight sounds: punches landing, body falls, glass breaking, heavy breathing" },
  { id: "f-6", name: "Horror Scene", scene: "Horror", actions: ["creak", "whisper", "heartbeat", "scream"], prompt: "Horror: floorboard creaking, eerie whispers, accelerating heartbeat, distant scream" },
  { id: "f-7", name: "Rain Scene", scene: "Weather", actions: ["rain", "thunder", "umbrella", "puddles"], prompt: "Rain scene: steady rain, distant thunder, umbrella opening, footsteps through puddles" },
  { id: "f-8", name: "Restaurant", scene: "Interior", actions: ["chatter", "glasses", "cutlery", "music"], prompt: "Restaurant ambience: crowd chatter, glasses clinking, cutlery on plates, background music" },
];
