"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface WaveformDisplayProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  playbackPosition?: number;
  className?: string;
  interactive?: boolean;
  onSeek?: (position: number) => void;
}

export function WaveformDisplay({
  data,
  width = 600,
  height = 120,
  color = "#5c7cfa",
  backgroundColor = "#1e293b",
  playbackPosition = 0,
  className,
  interactive = false,
  onSeek,
}: WaveformDisplayProps) {
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

    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Center line
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const barWidth = width / data.length;
    const centerY = height / 2;
    const maxBarHeight = height * 0.9;

    // Waveform bars
    for (let i = 0; i < data.length; i++) {
      const x = i * barWidth;
      const barHeight = data[i] * maxBarHeight;
      const posNorm = i / data.length;

      if (posNorm <= playbackPosition) {
        ctx.fillStyle = color;
      } else {
        ctx.fillStyle = `${color}55`;
      }

      ctx.fillRect(
        x + barWidth * 0.1,
        centerY - barHeight / 2,
        barWidth * 0.8,
        barHeight || 1
      );
    }

    // Playback cursor
    if (playbackPosition > 0 && playbackPosition < 1) {
      const cursorX = playbackPosition * width;
      ctx.strokeStyle = "#ff9800";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();
    }
  }, [data, width, height, color, backgroundColor, playbackPosition]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !onSeek) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = x / rect.width;
    onSeek(Math.max(0, Math.min(1, position)));
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={cn(
        "rounded-lg",
        interactive && "cursor-pointer",
        className
      )}
      onClick={handleClick}
    />
  );
}
