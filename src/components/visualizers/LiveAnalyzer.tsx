"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface LiveAnalyzerProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  mode?: "waveform" | "frequency" | "both";
  width?: number;
  height?: number;
  className?: string;
}

export function LiveAnalyzer({
  audioBuffer,
  isPlaying,
  mode = "both",
  width = 600,
  height = 150,
  className,
}: LiveAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const startAnalysis = useCallback(() => {
    if (!audioBuffer || !isPlaying) return;

    try {
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      sourceRef.current = source;
      source.start(0);
    } catch {
      // AudioContext may fail in some environments
    }
  }, [audioBuffer, isPlaying]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    const bufferLength = analyser.frequencyBinCount;

    if (mode === "waveform" || mode === "both") {
      const timeData = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(timeData);

      const waveHeight = mode === "both" ? height / 2 : height;

      ctx.strokeStyle = "#5c7cfa";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = timeData[i] / 128.0;
        const y = (v * waveHeight) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(width, waveHeight / 2);
      ctx.stroke();
    }

    if (mode === "frequency" || mode === "both") {
      const freqData = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(freqData);

      const barHeight = mode === "both" ? height / 2 : height;
      const yOffset = mode === "both" ? height / 2 : 0;
      const barCount = 64;
      const barWidth = width / barCount;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const value = freqData[dataIndex] / 255;
        const h = value * barHeight;

        const gradient = ctx.createLinearGradient(0, yOffset + barHeight, 0, yOffset + barHeight - h);
        gradient.addColorStop(0, "#5c7cfa");
        gradient.addColorStop(1, "#ff9800");

        ctx.fillStyle = gradient;
        ctx.fillRect(
          i * barWidth + 1,
          yOffset + barHeight - h,
          barWidth - 2,
          h
        );
      }
    }

    animFrameRef.current = requestAnimationFrame(drawFrame);
  }, [width, height, mode]);

  useEffect(() => {
    if (isPlaying && audioBuffer) {
      startAnalysis();
      animFrameRef.current = requestAnimationFrame(drawFrame);
    }

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [isPlaying, audioBuffer, startAnalysis, drawFrame]);

  // Draw static state when not playing
  useEffect(() => {
    if (!isPlaying) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, width, height);

      // Idle line
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#475569";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        audioBuffer ? "Press play to analyze" : "No audio loaded",
        width / 2,
        height / 2 - 8
      );
    }
  }, [isPlaying, audioBuffer, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={cn("rounded-lg", className)}
    />
  );
}
