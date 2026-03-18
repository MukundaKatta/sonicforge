"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface SpectrogramDisplayProps {
  data: number[][];
  width?: number;
  height?: number;
  className?: string;
  colorScheme?: "heat" | "cool" | "mono";
}

function valueToColor(
  value: number,
  scheme: "heat" | "cool" | "mono"
): string {
  const v = Math.min(1, Math.max(0, value * 8));
  switch (scheme) {
    case "heat": {
      const r = Math.floor(255 * Math.min(1, v * 2));
      const g = Math.floor(255 * Math.min(1, Math.max(0, v * 2 - 0.5)));
      const b = Math.floor(255 * Math.max(0, v - 0.7) * 3);
      return `rgb(${r},${g},${b})`;
    }
    case "cool": {
      const r = Math.floor(60 * v);
      const g = Math.floor(100 + 155 * v);
      const b = Math.floor(180 + 75 * v);
      return `rgb(${r},${g},${b})`;
    }
    case "mono":
    default: {
      const c = Math.floor(255 * v);
      return `rgb(${c},${c},${c})`;
    }
  }
}

export function SpectrogramDisplay({
  data,
  width = 600,
  height = 200,
  className,
  colorScheme = "heat",
}: SpectrogramDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    const numFrames = data.length;
    const numBins = data[0]?.length || 0;
    if (numBins === 0) return;

    const cellWidth = width / numFrames;
    const cellHeight = height / Math.min(numBins, 128);
    const binsToShow = Math.min(numBins, 128);

    for (let frame = 0; frame < numFrames; frame++) {
      for (let bin = 0; bin < binsToShow; bin++) {
        const value = data[frame][bin] || 0;
        const x = frame * cellWidth;
        const y = height - (bin + 1) * cellHeight;

        ctx.fillStyle = valueToColor(value, colorScheme);
        ctx.fillRect(x, y, cellWidth + 0.5, cellHeight + 0.5);
      }
    }

    // Frequency labels
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    const freqLabels = ["0", "2k", "4k", "8k", "16k"];
    freqLabels.forEach((label, i) => {
      const y = height - (i / (freqLabels.length - 1)) * height;
      ctx.fillText(label, width - 4, y + 3);
    });
  }, [data, width, height, colorScheme]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={cn("rounded-lg", className)}
    />
  );
}
