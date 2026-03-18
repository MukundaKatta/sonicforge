import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const favoritesOnly = searchParams.get("favorites") === "true";

    let query = supabase
      .from("sounds")
      .select("*", { count: "exact" })
      .eq("user_id", user.id);

    if (category) {
      query = query.eq("category", category);
    }

    if (type) {
      query = query.eq("type", type);
    }

    if (favoritesOnly) {
      query = query.eq("is_favorite", true);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,prompt.ilike.%${search}%,tags.cs.{${search}}`
      );
    }

    const validSortColumns = ["created_at", "name", "duration", "file_size", "play_count"];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "created_at";

    query = query
      .order(sortColumn, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    const { data: sounds, count, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to fetch sounds" }, { status: 500 });
    }

    return NextResponse.json({
      sounds: sounds || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Sounds API error:", error);
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
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Missing sound IDs" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("sounds")
      .delete()
      .eq("user_id", user.id)
      .in("id", ids);

    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json({ error: "Failed to delete sounds" }, { status: 500 });
    }

    return NextResponse.json({ deleted: ids.length });
  } catch (error) {
    console.error("Delete API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json(
        { error: "Missing id or updates" },
        { status: 400 }
      );
    }

    const allowedFields = ["name", "tags", "is_loop", "bpm", "key", "is_favorite"];
    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) {
        sanitized[key] = updates[key];
      }
    }
    sanitized.updated_at = new Date().toISOString();

    const { data: sound, error } = await supabase
      .from("sounds")
      .update(sanitized)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json({ error: "Failed to update sound" }, { status: 500 });
    }

    return NextResponse.json({ sound });
  } catch (error) {
    console.error("Update API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
