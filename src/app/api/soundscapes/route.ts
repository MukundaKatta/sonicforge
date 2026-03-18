import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: soundscapes, error } = await supabase
      .from("soundscapes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to fetch soundscapes" }, { status: 500 });
    }

    return NextResponse.json({ soundscapes: soundscapes || [] });
  } catch (error) {
    console.error("Soundscapes API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const { name, description, layers, duration, tags } = body;

    if (!name || !layers || !duration) {
      return NextResponse.json(
        { error: "Missing required fields: name, layers, duration" },
        { status: 400 }
      );
    }

    const { data: soundscape, error } = await supabase
      .from("soundscapes")
      .insert({
        id: uuidv4(),
        user_id: user.id,
        name,
        description: description || "",
        layers,
        duration,
        tags: tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to save soundscape" }, { status: 500 });
    }

    return NextResponse.json({ soundscape }, { status: 201 });
  } catch (error) {
    console.error("Soundscapes API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing soundscape ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("soundscapes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json({ error: "Failed to delete soundscape" }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Delete API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
