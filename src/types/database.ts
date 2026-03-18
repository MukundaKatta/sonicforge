export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          avatar_url: string | null;
          plan: "free" | "pro" | "enterprise";
          storage_used: number;
          storage_limit: number;
          generations_today: number;
          generation_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string;
          avatar_url?: string | null;
          plan?: "free" | "pro" | "enterprise";
          storage_used?: number;
          storage_limit?: number;
          generations_today?: number;
          generation_limit?: number;
        };
        Update: {
          display_name?: string;
          avatar_url?: string | null;
          plan?: "free" | "pro" | "enterprise";
          storage_used?: number;
          storage_limit?: number;
          generations_today?: number;
          generation_limit?: number;
          updated_at?: string;
        };
      };
      sounds: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          prompt: string;
          category: string;
          duration: number;
          sample_rate: number;
          channels: number;
          audio_url: string;
          waveform_data: Json;
          spectrogram_data: Json;
          tags: string[];
          is_loop: boolean;
          bpm: number | null;
          key: string | null;
          file_size: number;
          format: string;
          is_favorite: boolean;
          play_count: number;
          type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          prompt: string;
          category: string;
          duration: number;
          sample_rate?: number;
          channels?: number;
          audio_url: string;
          waveform_data?: Json;
          spectrogram_data?: Json;
          tags?: string[];
          is_loop?: boolean;
          bpm?: number | null;
          key?: string | null;
          file_size?: number;
          format?: string;
          is_favorite?: boolean;
          play_count?: number;
          type?: string;
        };
        Update: {
          name?: string;
          tags?: string[];
          is_loop?: boolean;
          bpm?: number | null;
          key?: string | null;
          is_favorite?: boolean;
          play_count?: number;
          updated_at?: string;
        };
      };
      soundscapes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          layers: Json;
          duration: number;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string;
          layers: Json;
          duration: number;
          tags?: string[];
        };
        Update: {
          name?: string;
          description?: string;
          layers?: Json;
          duration?: number;
          tags?: string[];
          updated_at?: string;
        };
      };
      processing_chains: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          effects: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          effects: Json;
        };
        Update: {
          name?: string;
          effects?: Json;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
