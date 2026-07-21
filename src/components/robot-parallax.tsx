import { useEffect, useRef, useState } from "react";
import robotHero from "@/assets/robot-hero.png.asset.json";
import robotBg from "@/assets/robot-bg.png.asset.json";

/**
 * Luxury 4D parallax hero for CMR Central.
 * Layers respond to pointer + device orientation with per-layer depth,
 * subtle rotateX/Y on a perspective wrapper, and a glossy highlight sweep.
 * Respects prefers-reduced-motion.
 */
export function RobotParallax() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLImageElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Target and current values for smooth lerp
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onPointer = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1; // -1..1
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      target.current.x = Math.max(-1, Math.min(1, x));
      target.current.y = Math.max(-1, Math.min(1, y));
    };
    const onLeave = () => {
      target.current.x = 0;
      target.current.y = 0;
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      // gamma: left/right (-90..90), beta: front/back (-180..180)
      const gx = (e.gamma ?? 0) / 30; // ~[-3..3]
      const gy = ((e.beta ?? 0) - 40) / 30;
      target.current.x = Math.max(-1, Math.min(1, gx));
      target.current.y = Math.max(-1, Math.min(1, gy));
    };

    wrap.addEventListener("pointermove", onPointer);
    wrap.addEventListener("pointerleave", onLeave);
    window.addEventListener("deviceorientation", onOrient);

    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * 0.08;
      current.current.y += (target.current.y - current.current.y) * 0.08;
      const { x, y } = current.current;

      if (cardRef.current) {
        cardRef.current.style.transform = `perspective(1400px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
      }
      if (bgRef.current) {
        bgRef.current.style.transform = `translate3d(${x * -10}px, ${y * -10}px, 0) scale(1.08)`;
      }
      if (midRef.current) {
        midRef.current.style.transform = `translate3d(${x * -22}px, ${y * -22}px, 0)`;
      }
      if (fgRef.current) {
        fgRef.current.style.transform = `translate3d(${x * 36}px, ${y * 30}px, 0) scale(1.02)`;
      }
      if (glareRef.current) {
        const gx = 50 + x * 30;
        const gy = 50 + y * 30;
        glareRef.current.style.background = `radial-gradient(600px circle at ${gx}% ${gy}%, rgba(255,255,255,0.18), rgba(255,255,255,0) 55%)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      wrap.removeEventListener("pointermove", onPointer);
      wrap.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("deviceorientation", onOrient);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reduced]);

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#0f1122] via-[#151735] to-[#1b1030] shadow-2xl"
      style={{ perspective: "1400px" }}
    >
      <div
        ref={cardRef}
        className="relative h-[38vh] min-h-[240px] w-full will-change-transform sm:h-[46vh] lg:h-[52vh]"
        style={{ transformStyle: "preserve-3d", transition: reduced ? "none" : "transform 120ms linear" }}
      >
        {/* Layer 1: blurred graffiti background */}
        <div
          ref={bgRef}
          className="pointer-events-none absolute inset-0 will-change-transform"
          style={{
            backgroundImage: `url(${robotBg.url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(28px) saturate(1.1) brightness(0.55)",
          }}
          aria-hidden
        />
        {/* Layer 2: color splash midground */}
        <div
          ref={midRef}
          className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen will-change-transform"
          style={{
            backgroundImage: `url(${robotBg.url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(6px) saturate(1.4) contrast(1.1)",
            maskImage:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0) 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0) 80%)",
          }}
          aria-hidden
        />
        {/* Vignette */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.65) 100%)",
          }}
          aria-hidden
        />
        {/* Layer 3: robot foreground */}
        <img
          ref={fgRef}
          src={robotHero.url}
          alt="CMR Central maskot"
          draggable={false}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[92%] w-auto -translate-x-1/2 -translate-y-1/2 select-none drop-shadow-[0_25px_35px_rgba(0,0,0,0.55)] will-change-transform"
        />
        {/* Layer 4: glossy highlight */}
        <div
          ref={glareRef}
          className="pointer-events-none absolute inset-0 mix-blend-screen"
          aria-hidden
        />
        {/* Copy overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 sm:p-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
            Nexify Studio
          </div>
          <div className="text-2xl font-bold leading-tight text-white sm:text-3xl">
            CMR Central
          </div>
          <div className="max-w-md text-xs text-white/70 sm:text-sm">
            Centrálny operačný systém – leady, projekty, deployments a konektory na jednom mieste.
          </div>
        </div>
      </div>
    </div>
  );
}