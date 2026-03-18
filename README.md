# SonicForge

AI-powered sound design and audio generation platform with text-to-sound, soundscape creation, and game audio tools.

## Features

- **Text-to-Sound** -- Generate sound effects from natural language descriptions
- **Sound Categories** -- Browse organized library of sound effect categories
- **Audio Workstation** -- Mix and arrange generated sounds on a timeline
- **Soundscape Generator** -- Create ambient soundscapes from layered audio
- **Game Audio Tools** -- Generate adaptive audio for game development
- **Loop Maker** -- Create seamless audio loops for music and sound design
- **Audio Processing** -- Apply effects, filters, and transformations to sounds
- **Sound Library** -- Manage and organize your generated audio collection
- **S3 Storage** -- Cloud storage for audio files via AWS S3

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Audio Engine:** Tone.js, lamejs (MP3 encoding)
- **State Management:** Zustand
- **Storage:** AWS S3 (presigned URLs)
- **Database:** Supabase (with SSR support)
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone <repository-url>
cd sonicforge
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=your_bucket_name
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
sonicforge/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   │   ├── generators/   # Sound generation panels
│   │   ├── workstation/  # Audio workstation
│   │   └── library/      # Sound library
│   ├── store/            # Zustand state management
│   └── lib/              # Utilities and helpers
├── public/               # Static assets
└── package.json
```

## License

MIT
