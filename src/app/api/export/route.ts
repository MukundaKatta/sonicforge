import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getSignedDownloadUrl } from "@/lib/r2";

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
    const { soundId, format = "wav" } = body;

    if (!soundId) {
      return NextResponse.json(
        { error: "Missing soundId" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: sound, error } = await supabase
      .from("sounds")
      .select("*")
      .eq("id", soundId)
      .eq("user_id", user.id)
      .single();

    if (error || !sound) {
      return NextResponse.json(
        { error: "Sound not found" },
        { status: 404 }
      );
    }

    // Increment play count
    await supabase
      .from("sounds")
      .update({ play_count: (sound.play_count || 0) + 1 })
      .eq("id", soundId);

    // Generate signed download URL
    const key = `audio/${user.id}/${soundId}.${format}`;
    const downloadUrl = await getSignedDownloadUrl(key);

    return NextResponse.json({
      downloadUrl,
      sound: {
        id: sound.id,
        name: sound.name,
        format: sound.format,
        fileSize: sound.file_size,
      },
    });
  } catch (error) {
    console.error("Export API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
