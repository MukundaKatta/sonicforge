"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Search,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Heart,
  Play,
  Pause,
  Download,
  Trash2,
  FolderPlus,
  Filter,
  Clock,
  HardDrive,
  Music,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { useAppStore } from "@/store";
import { WaveformDisplay } from "@/components/visualizers/WaveformDisplay";
import { SOUND_CATEGORIES, type SoundCategory, type LibraryItem } from "@/types";
import { formatDuration, formatFileSize, cn } from "@/lib/utils";

// Demo items for the library
const DEMO_ITEMS: LibraryItem[] = [
  {
    id: "demo-1",
    type: "sound",
    name: "Rain on Tin Roof",
    category: "nature",
    tags: ["rain", "ambient", "weather"],
    duration: 5.2,
    fileSize: 462848,
    format: "wav",
    audioUrl: "",
    createdAt: "2026-03-15T10:00:00Z",
    updatedAt: "2026-03-15T10:00:00Z",
    userId: "local",
    isFavorite: true,
    playCount: 12,
  },
  {
    id: "demo-2",
    type: "loop",
    name: "Cinematic Pulse 120BPM",
    category: "musical",
    tags: ["loop", "cinematic", "pulse"],
    duration: 8.0,
    fileSize: 705600,
    format: "wav",
    audioUrl: "",
    createdAt: "2026-03-14T15:30:00Z",
    updatedAt: "2026-03-14T15:30:00Z",
    userId: "local",
    isFavorite: false,
    playCount: 5,
  },
  {
    id: "demo-3",
    type: "game-audio",
    name: "Sword Swing Whoosh",
    category: "mechanical",
    tags: ["combat", "sword", "whoosh"],
    duration: 0.6,
    fileSize: 52920,
    format: "wav",
    audioUrl: "",
    createdAt: "2026-03-13T09:15:00Z",
    updatedAt: "2026-03-13T09:15:00Z",
    userId: "local",
    isFavorite: true,
    playCount: 23,
  },
  {
    id: "demo-4",
    type: "soundscape",
    name: "Forest Dawn Ambience",
    category: "nature",
    tags: ["forest", "birds", "morning"],
    duration: 30.0,
    fileSize: 2646000,
    format: "wav",
    audioUrl: "",
    createdAt: "2026-03-12T20:00:00Z",
    updatedAt: "2026-03-12T20:00:00Z",
    userId: "local",
    isFavorite: false,
    playCount: 8,
  },
  {
    id: "demo-5",
    type: "sound",
    name: "Laser Blaster Shot",
    category: "sci-fi",
    tags: ["laser", "weapon", "space"],
    duration: 1.2,
    fileSize: 105840,
    format: "wav",
    audioUrl: "",
    createdAt: "2026-03-11T14:45:00Z",
    updatedAt: "2026-03-11T14:45:00Z",
    userId: "local",
    isFavorite: false,
    playCount: 15,
  },
  {
    id: "demo-6",
    type: "foley",
    name: "Kitchen Scene Mix",
    category: "urban",
    tags: ["foley", "kitchen", "cooking"],
    duration: 10.0,
    fileSize: 882000,
    format: "wav",
    audioUrl: "",
    createdAt: "2026-03-10T11:00:00Z",
    updatedAt: "2026-03-10T11:00:00Z",
    userId: "local",
    isFavorite: true,
    playCount: 3,
  },
];

const TYPE_LABELS: Record<string, string> = {
  sound: "Sound",
  soundscape: "Soundscape",
  loop: "Loop",
  foley: "Foley",
  "game-audio": "Game Audio",
};

const TYPE_COLORS: Record<string, string> = {
  sound: "bg-sonic-500/15 text-sonic-400",
  soundscape: "bg-green-500/15 text-green-400",
  loop: "bg-forge-500/15 text-forge-400",
  foley: "bg-purple-500/15 text-purple-400",
  "game-audio": "bg-cyan-500/15 text-cyan-400",
};

export function LibraryPanel() {
  const {
    library,
    setSearchQuery,
    setFilterCategory,
    setFilterType,
    setSortBy,
    toggleSortOrder,
    toggleItemSelection,
    clearSelection,
    setViewMode,
    toggleFavorite,
  } = useAppStore();

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Use demo items if library is empty
  const allItems = library.items.length > 0 ? library.items : DEMO_ITEMS;

  const filteredItems = useMemo(() => {
    let items = [...allItems];

    // Search
    if (library.searchQuery) {
      const q = library.searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q)) ||
          item.category.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (library.filterCategory !== "all") {
      items = items.filter((item) => item.category === library.filterCategory);
    }

    // Type filter
    if (library.filterType !== "all") {
      items = items.filter((item) => item.type === library.filterType);
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0;
      switch (library.sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "date":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "duration":
          cmp = a.duration - b.duration;
          break;
        case "size":
          cmp = a.fileSize - b.fileSize;
          break;
      }
      return library.sortOrder === "asc" ? cmp : -cmp;
    });

    return items;
  }, [allItems, library.searchQuery, library.filterCategory, library.filterType, library.sortBy, library.sortOrder]);

  const stats = useMemo(() => {
    const totalSize = allItems.reduce((s, i) => s + i.fileSize, 0);
    const totalDuration = allItems.reduce((s, i) => s + i.duration, 0);
    return { totalSize, totalDuration, count: allItems.length };
  }, [allItems]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sonic-500/10">
            <Music className="h-5 w-5 text-sonic-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-dark-50">{stats.count}</p>
            <p className="text-xs text-dark-400">Total Sounds</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forge-500/10">
            <Clock className="h-5 w-5 text-forge-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-dark-50">{formatDuration(stats.totalDuration)}</p>
            <p className="text-xs text-dark-400">Total Duration</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
            <HardDrive className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-dark-50">{formatFileSize(stats.totalSize)}</p>
            <p className="text-xs text-dark-400">Storage Used</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
            <input
              value={library.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, tag, or category..."
              className="input-field pl-10"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn("btn-secondary", showFilters && "border-sonic-500 text-sonic-400")}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>

          {/* Sort */}
          <select
            value={library.sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof library.sortBy)}
            className="select-field w-32"
          >
            <option value="date">Date</option>
            <option value="name">Name</option>
            <option value="duration">Duration</option>
            <option value="size">Size</option>
          </select>
          <button onClick={toggleSortOrder} className="btn-ghost">
            {library.sortOrder === "asc" ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </button>

          {/* View mode */}
          <div className="flex rounded-lg bg-dark-800 p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                library.viewMode === "grid" ? "bg-dark-700 text-dark-50" : "text-dark-400"
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                library.viewMode === "list" ? "bg-dark-700 text-dark-50" : "text-dark-400"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter options */}
        {showFilters && (
          <div className="mt-4 flex items-center gap-4 border-t border-dark-700 pt-4">
            <div>
              <label className="label-text">Category</label>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setFilterCategory("all")}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
                    library.filterCategory === "all"
                      ? "bg-sonic-600 text-white"
                      : "bg-dark-800 text-dark-300"
                  )}
                >
                  All
                </button>
                {SOUND_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCategory(cat.id)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
                      library.filterCategory === cat.id
                        ? "bg-sonic-600 text-white"
                        : "bg-dark-800 text-dark-300"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label-text">Type</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setFilterType("all")}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
                    library.filterType === "all"
                      ? "bg-sonic-600 text-white"
                      : "bg-dark-800 text-dark-300"
                  )}
                >
                  All
                </button>
                {(["sound", "soundscape", "loop", "foley", "game-audio"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
                      library.filterType === type
                        ? "bg-sonic-600 text-white"
                        : "bg-dark-800 text-dark-300"
                    )}
                  >
                    {TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selection bar */}
      {library.selectedItems.length > 0 && (
        <div className="card flex items-center justify-between bg-sonic-500/5 border-sonic-500/30">
          <span className="text-sm text-sonic-300">
            <Check className="h-4 w-4 inline mr-1" />
            {library.selectedItems.length} selected
          </span>
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-xs">
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
            <button className="btn-secondary text-xs">
              <FolderPlus className="h-3.5 w-3.5" />
              Add to Collection
            </button>
            <button className="btn-danger text-xs">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <button onClick={clearSelection} className="btn-ghost text-xs">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Grid View */}
      {library.viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "card-hover group",
                library.selectedItems.includes(item.id) && "ring-1 ring-sonic-500 border-sonic-500/40"
              )}
              onClick={() => toggleItemSelection(item.id)}
            >
              {/* Waveform placeholder */}
              <div className="mb-3 h-16 rounded-lg bg-dark-800 flex items-center justify-center relative overflow-hidden">
                <div className="flex items-end justify-center gap-[2px] h-10">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-sonic-500/40"
                      style={{
                        height: `${20 + Math.sin(i * 0.5 + item.id.charCodeAt(0)) * 20}px`,
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPlayingId(playingId === item.id ? null : item.id);
                  }}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sonic-600 text-white">
                    {playingId === item.id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </div>
                </button>
              </div>

              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-dark-100 truncate">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("badge text-[10px]", TYPE_COLORS[item.type])}>
                      {TYPE_LABELS[item.type]}
                    </span>
                    <span className="badge-sonic text-[10px]">{item.category}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item.id);
                  }}
                  className="shrink-0"
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 transition-colors",
                      item.isFavorite
                        ? "fill-red-500 text-red-500"
                        : "text-dark-500 hover:text-red-400"
                    )}
                  />
                </button>
              </div>

              <div className="mt-2 flex items-center gap-3 text-[10px] text-dark-500">
                <span>{formatDuration(item.duration)}</span>
                <span>{formatFileSize(item.fileSize)}</span>
                <span>{item.format.toUpperCase()}</span>
                <span>{item.playCount} plays</span>
              </div>

              {item.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-dark-800 px-1.5 py-0.5 text-[10px] text-dark-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {library.viewMode === "list" && (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700 text-left">
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-dark-400 w-8" />
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-dark-400">
                  Name
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-dark-400">
                  Type
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-dark-400">
                  Category
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-dark-400">
                  Duration
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-dark-400">
                  Size
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-dark-400">
                  Date
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-dark-400 w-20" />
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-dark-700/50 transition-colors cursor-pointer",
                    library.selectedItems.includes(item.id)
                      ? "bg-sonic-500/5"
                      : "hover:bg-dark-800/50"
                  )}
                  onClick={() => toggleItemSelection(item.id)}
                >
                  <td className="px-4 py-2.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayingId(playingId === item.id ? null : item.id);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-dark-800 text-dark-300 hover:bg-sonic-600 hover:text-white transition-colors"
                    >
                      {playingId === item.id ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3 ml-0.5" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Heart
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 cursor-pointer",
                          item.isFavorite
                            ? "fill-red-500 text-red-500"
                            : "text-dark-600 hover:text-red-400"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item.id);
                        }}
                      />
                      <span className="text-sm text-dark-100 font-medium">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn("badge text-[10px]", TYPE_COLORS[item.type])}>
                      {TYPE_LABELS[item.type]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-dark-300 capitalize">
                    {item.category}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-dark-300 font-mono">
                    {formatDuration(item.duration)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-dark-400">
                    {formatFileSize(item.fileSize)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-dark-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button className="btn-ghost p-1">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button className="btn-ghost p-1">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-12 w-12 text-dark-600 mb-4" />
          <h3 className="text-lg font-medium text-dark-300 mb-2">No Results Found</h3>
          <p className="text-sm text-dark-500">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}
