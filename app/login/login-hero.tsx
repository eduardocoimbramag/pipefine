"use client";

import { useEffect, useRef } from "react";
import { Logo } from "@/components/logo";

/**
 * Painel esquerdo do login — alto padrão, animado e interativo.
 *
 * Camadas (de baixo para cima):
 *  1. Fundo grafite (bg-primary)
 *  2. Aurora: gradientes radiais em movimento lento (CSS)
 *  3. Partículas conectadas em <canvas>, com parallax e brilho seguindo o mouse
 *  4. Logo central com leve flutuação
 *
 * Respeita `prefers-reduced-motion` (desliga animações para acessibilidade).
 */
export function LoginHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Posição-alvo e suavizada do mouse (0..1 relativo ao painel), centro = 0.5
  const target = useRef({ x: 0.5, y: 0.5 });
  const smooth = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    type P = { x: number; y: number; vx: number; vy: number; r: number };
    let particles: P[] = [];

    function build() {
      const rect = root!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Densidade proporcional à área (limitada para performance)
      const count = Math.min(70, Math.max(28, Math.round((width * height) / 22000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 0.6,
      }));
    }

    build();

    let raf = 0;
    const LINK_DIST = 130;

    function frame() {
      // Suaviza o seguimento do mouse (easing)
      smooth.current.x += (target.current.x - smooth.current.x) * 0.06;
      smooth.current.y += (target.current.y - smooth.current.y) * 0.06;

      // Parallax: desloca o conjunto levemente conforme o mouse
      const px = (smooth.current.x - 0.5) * 26;
      const py = (smooth.current.y - 0.5) * 26;

      ctx!.clearRect(0, 0, width, height);

      // Brilho que segue o mouse
      const gx = smooth.current.x * width;
      const gy = smooth.current.y * height;
      const glow = ctx!.createRadialGradient(gx, gy, 0, gx, gy, 260);
      glow.addColorStop(0, "rgba(245, 241, 232, 0.10)");
      glow.addColorStop(1, "rgba(245, 241, 232, 0)");
      ctx!.fillStyle = glow;
      ctx!.fillRect(0, 0, width, height);

      // Atualiza e desenha partículas
      for (const p of particles) {
        if (!reduceMotion) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
          if (p.y < -20) p.y = height + 20;
          if (p.y > height + 20) p.y = -20;
        }
      }

      // Linhas de conexão
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DIST) {
            const op = (1 - dist / LINK_DIST) * 0.18;
            ctx!.strokeStyle = `rgba(245, 241, 232, ${op})`;
            ctx!.lineWidth = 0.6;
            ctx!.beginPath();
            ctx!.moveTo(a.x + px, a.y + py);
            ctx!.lineTo(b.x + px, b.y + py);
            ctx!.stroke();
          }
        }
      }

      // Pontos
      for (const p of particles) {
        ctx!.beginPath();
        ctx!.arc(p.x + px, p.y + py, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(245, 241, 232, 0.55)";
        ctx!.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    if (reduceMotion) {
      // Desenha um quadro estático
      frame();
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(frame);
    }

    function onMove(e: PointerEvent) {
      const rect = root!.getBoundingClientRect();
      target.current.x = (e.clientX - rect.left) / rect.width;
      target.current.y = (e.clientY - rect.top) / rect.height;
    }
    function onLeave() {
      target.current.x = 0.5;
      target.current.y = 0.5;
    }

    const onResize = () => build();
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:block"
    >
      {/* Aurora — gradientes radiais em movimento lento */}
      <div className="login-aurora" aria-hidden />

      {/* Vinheta para dar profundidade nas bordas */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 40%, transparent 55%, rgba(0,0,0,0.35) 100%)",
        }}
        aria-hidden
      />

      {/* Partículas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0"
        aria-hidden
      />

      {/* Logo central protagonista */}
      <div className="relative z-10 flex h-full items-center justify-center p-12">
        <div className="login-logo-float">
          <Logo className="h-16 w-auto opacity-95 drop-shadow-[0_8px_30px_rgba(0,0,0,0.35)] sm:h-20" />
        </div>
      </div>
    </div>
  );
}
