import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { uploadAudio, getAudioKey, getContentType } from "@/lib/r2";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { prompt, category, duration, sampleRate, channels, name, waveformData, spectrogramData, audioData, format = "wav" } = body;

    if (!prompt || !category || !duration) {
      return NextResponse.json(
        { error: "Missing required fields: prompt, category, duration" },
        { status: 400 }
      );
    }

    // Check generation limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("generations_today, generation_limit, storage_used, storage_limit, plan")
      .eq("id", user.id)
      .single();

    if (profile && profile.generations_today >= profile.generation_limit) {
      return NextResponse.json(
        { error: "Daily generation limit reached. Upgrade your plan for more." },
        { status: 429 }
      );
    }

    const soundId = uuidv4();
    let audioUrl = "";

    // Upload audio if provided
    if (audioData) {
      const audioBuffer = Buffer.from(audioData, "base64");
      const key = getAudioKey(user.id, soundId, format);
      const contentType = getContentType(format);

      // Check storage limit
      if (profile && profile.storage_used + audioBuffer.length > profile.storage_limit) {
        return NextResponse.json(
          { error: "Storage limit reached. Upgrade your plan for more storage." },
          { status: 429 }
        );
      }

      audioUrl = await uploadAudio(key, audioBuffer, contentType);

      // Update storage usage
      await supabase
        .from("profiles")
        .update({
          storage_used: (profile?.storage_used || 0) + audioBuffer.length,
          generations_today: (profile?.generations_today || 0) + 1,
        })
        .eq("id", user.id);
    }

    // Save sound metadata
    const { data: sound, error } = await supabase
      .from("sounds")
      .insert({
        id: soundId,
        user_id: user.id,
        name: name || `${category}-${prompt.substring(0, 30)}`,
        prompt,
        category,
        duration,
        sample_rate: sampleRate || 44100,
        channels: channels || 2,
        audio_url: audioUrl,
        waveform_data: waveformData || [],
        spectrogram_data: spectrogramData || [],
        tags: [category],
        is_loop: false,
        format: format,
        file_size: audioData ? Buffer.from(audioData, "base64").length : 0,
        type: "sound",
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to save sound" }, { status: 500 });
    }

    return NextResponse.json({ sound }, { status: 201 });
  } catch (error) {
    console.error("Generation API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
