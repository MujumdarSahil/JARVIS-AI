"use client";

import React, { useEffect, useRef, useState } from "react";

interface JarvisHologramProps {
  status?: "idle" | "planning" | "running" | "completed" | "failed";
  size?: number;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

export function JarvisHologram({ status = "idle", size = 260 }: JarvisHologramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleMotionChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleMotionChange);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.32;

    // Build 3D Icosahedron vertices (Golden ratio geometry)
    const phi = (1 + Math.sqrt(5)) / 2;
    const baseVertices: Point3D[] = [
      { x: -1, y: phi, z: 0 },
      { x: 1, y: phi, z: 0 },
      { x: -1, y: -phi, z: 0 },
      { x: 1, y: -phi, z: 0 },
      { x: 0, y: -1, z: phi },
      { x: 0, y: 1, z: phi },
      { x: 0, y: -1, z: -phi },
      { x: 0, y: 1, z: -phi },
      { x: phi, y: 0, z: -1 },
      { x: phi, y: 0, z: 1 },
      { x: -phi, y: 0, z: -1 },
      { x: -phi, y: 0, z: 1 },
    ].map((v) => {
      const len = Math.hypot(v.x, v.y, v.z);
      return { x: (v.x / len) * radius * 0.65, y: (v.y / len) * radius * 0.65, z: (v.z / len) * radius * 0.65 };
    });

    // Edges connecting icosahedron vertices (pairs with distance ~ 1.05 * r)
    const edges: [number, number][] = [];
    for (let i = 0; i < baseVertices.length; i++) {
      for (let j = i + 1; j < baseVertices.length; j++) {
        const dist = Math.hypot(
          baseVertices[i].x - baseVertices[j].x,
          baseVertices[i].y - baseVertices[j].y,
          baseVertices[i].z - baseVertices[j].z
        );
        if (dist < radius * 0.75) {
          edges.push([i, j]);
        }
      }
    }

    // Particle field in 3D
    const particleCount = 45;
    const particles: Point3D[] = [];
    for (let i = 0; i < particleCount; i++) {
      const r = radius * (0.8 + Math.random() * 0.5);
      const theta = Math.random() * Math.PI * 2;
      const u = Math.random() * 2 - 1;
      particles.push({
        x: r * Math.sqrt(1 - u * u) * Math.cos(theta),
        y: r * Math.sqrt(1 - u * u) * Math.sin(theta),
        z: r * u,
      });
    }

    // Status colors
    const getColors = () => {
      switch (status) {
        case "planning":
          return { primary: "#3b82f6", glow: "rgba(59, 130, 246, 0.4)", core: "#60a5fa" };
        case "running":
          return { primary: "#00f0ff", glow: "rgba(0, 240, 255, 0.6)", core: "#ffffff" };
        case "completed":
          return { primary: "#10b981", glow: "rgba(16, 185, 129, 0.4)", core: "#34d399" };
        case "failed":
          return { primary: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)", core: "#fbbf24" };
        case "idle":
        default:
          return { primary: "#00f0ff", glow: "rgba(0, 240, 255, 0.3)", core: "#38bdf8" };
      }
    };

    let animationFrameId: number;
    let angleX = 0.2;
    let angleY = 0;
    let angleZ = 0;
    let time = 0;

    // 3D Rotation helper
    const rotatePoint = (p: Point3D, ax: number, ay: number, az: number): Point3D => {
      // Rotate around X
      let y1 = p.y * Math.cos(ax) - p.z * Math.sin(ax);
      let z1 = p.y * Math.sin(ax) + p.z * Math.cos(ax);

      // Rotate around Y
      let x2 = p.x * Math.cos(ay) + z1 * Math.sin(ay);
      let z2 = -p.x * Math.sin(ay) + z1 * Math.cos(ay);

      // Rotate around Z
      let x3 = x2 * Math.cos(az) - y1 * Math.sin(az);
      let y3 = x2 * Math.sin(az) + y1 * Math.cos(az);

      return { x: x3, y: y3, z: z2 };
    };

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      const colors = getColors();

      const speedMult = status === "running" ? 2.4 : status === "planning" ? 1.7 : 1.0;
      if (!prefersReducedMotion) {
        angleY += 0.012 * speedMult;
        angleX += 0.005 * speedMult;
        angleZ += 0.003 * speedMult;
        time += 0.03 * speedMult;
      }

      const pulse = Math.sin(time * 2) * 0.08 + 1.0;

      // 1. Central Ambient Glow
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.1,
        centerX,
        centerY,
        radius * pulse * 1.2
      );
      glowGrad.addColorStop(0, colors.glow);
      glowGrad.addColorStop(0.5, colors.glow.replace(/[\d\.]+\)$/, "0.1)"));
      glowGrad.addColorStop(1, "rgba(8, 12, 20, 0)");

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * pulse * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Central Luminous Core
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = colors.primary;
      ctx.fillStyle = colors.core;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.22 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Render 3D Icosahedron Wireframe
      const transformedVertices = baseVertices.map((v) => {
        const rot = rotatePoint(v, angleX, angleY, angleZ);
        // Perspective projection
        const fov = 350;
        const scale = fov / (fov + rot.z);
        return {
          x: centerX + rot.x * scale * pulse,
          y: centerY + rot.y * scale * pulse,
          z: rot.z,
          scale,
        };
      });

      // Draw Edges
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1.0;
      edges.forEach(([i, j]) => {
        const p1 = transformedVertices[i];
        const p2 = transformedVertices[j];
        // Depth alpha attenuation
        const avgZ = (p1.z + p2.z) / 2;
        const alpha = Math.max(0.15, Math.min(0.7, (avgZ + radius) / (2 * radius)));

        ctx.strokeStyle = colors.primary.replace(")", `, ${alpha})`).replace("rgb", "rgba");
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Draw Vertex Dots
      transformedVertices.forEach((p) => {
        const dotAlpha = Math.max(0.3, Math.min(0.9, (p.z + radius) / (2 * radius)));
        ctx.fillStyle = colors.core;
        ctx.globalAlpha = dotAlpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.0 * p.scale, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // 4. Layered Orbital Gimbal Rings
      ctx.save();
      ctx.translate(centerX, centerY);

      // Ring 1 (Inclined Orbit)
      ctx.rotate(angleY * 0.7);
      ctx.scale(1, 0.45);
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
      ctx.stroke();

      // Ring 2 (Counter-Rotating Orbit)
      ctx.restore();
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-angleY * 0.9 + 1.2);
      ctx.scale(1, 0.38);
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1.0;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.35, 0, Math.PI * 2);
      ctx.stroke();

      // 5. Outer HUD Arcs & Technical Tick Marks
      ctx.restore();
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angleZ * 1.5);
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5;

      // Segmented arc 1
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.48, 0, Math.PI * 0.4);
      ctx.stroke();

      // Segmented arc 2
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.48, Math.PI * 0.7, Math.PI * 1.2);
      ctx.stroke();

      // Segmented arc 3
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.48, Math.PI * 1.5, Math.PI * 1.85);
      ctx.stroke();

      // Fine tick marks
      ctx.lineWidth = 1.0;
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 16; i++) {
        const rad = (i * Math.PI * 2) / 16;
        const x1 = Math.cos(rad) * radius * 1.52;
        const y1 = Math.sin(rad) * radius * 1.52;
        const x2 = Math.cos(rad) * radius * 1.56;
        const y2 = Math.sin(rad) * radius * 1.56;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.restore();

      // 6. Floating Particles
      particles.forEach((pt) => {
        const rot = rotatePoint(pt, angleX * 0.5, angleY * 0.8, 0);
        const fov = 350;
        const scale = fov / (fov + rot.z);
        const px = centerX + rot.x * scale;
        const py = centerY + rot.y * scale;
        const pAlpha = Math.max(0.15, Math.min(0.65, (rot.z + radius) / (2 * radius)));

        ctx.fillStyle = colors.primary;
        ctx.globalAlpha = pAlpha;
        ctx.beginPath();
        ctx.arc(px, py, 1.2 * scale, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      mediaQuery.removeEventListener("change", handleMotionChange);
    };
  }, [status, size, prefersReducedMotion]);

  return (
    <div
      className="relative flex items-center justify-center select-none pointer-events-none"
      style={{ width: size, height: size }}
    >
      <canvas ref={canvasRef} className="block pointer-events-none" />
    </div>
  );
}
