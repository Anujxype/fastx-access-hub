import { useEffect, useRef } from 'react';

interface Star {
  x: number; y: number; radius: number; alpha: number;
  speed: number; twinkleOffset: number;
}
interface Meteor {
  x: number; y: number; len: number; speed: number;
  alpha: number; angle: number; active: boolean; delay: number;
}

const STAR_COUNT = 200;
const METEOR_COUNT = 5;
const r = (a: number, b: number) => a + Math.random() * (b - a);

const Starfield = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = 0, h = 0;
    const stars: Star[] = [];
    const meteors: Meteor[] = [];
    const meteorTimeouts: ReturnType<typeof setTimeout>[] = [];

    const resize = () => {
      // Use window dimensions — reliable for fixed full-screen canvas
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      // Redistribute stars on resize
      stars.forEach(s => { s.x = Math.random() * w; s.y = Math.random() * h; });
    };

    const initStars = () => {
      stars.length = 0;
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          radius: r(0.4, 1.8),
          alpha: r(0.4, 1),
          speed: r(0.0003, 0.0012),
          twinkleOffset: Math.random() * Math.PI * 2,
        });
      }
    };

    const makeMeteor = (initialDelay = false): Meteor => ({
      x: r(w * 0.1, w * 0.9), y: r(-80, h * 0.25),
      len: r(100, 220), speed: r(7, 16),
      alpha: 0, angle: Math.PI / 4 + r(-0.2, 0.2),
      active: false,
      delay: initialDelay ? r(500, 7000) : r(5000, 14000),
    });

    const scheduleMeteor = (m: Meteor) => {
      if (m.active) return;
      const t = setTimeout(() => {
        const fresh = makeMeteor(false);
        Object.assign(m, { ...fresh, active: true, alpha: 1 });
      }, m.delay);
      meteorTimeouts.push(t);
    };

    let lastTime = 0;
    let scheduled = false;

    const draw = (now: number) => {
      const dt = Math.min(now - lastTime, 50); // clamp dt to avoid large jumps
      lastTime = now;
      ctx.clearRect(0, 0, w, h);

      // Stars
      stars.forEach(s => {
        const twinkle = 0.5 + 0.5 * Math.sin(now * s.speed * 1500 + s.twinkleOffset);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${(s.alpha * twinkle).toFixed(3)})`;
        ctx.fill();
      });

      // Schedule meteors once
      if (!scheduled) { meteors.forEach(m => scheduleMeteor(m)); scheduled = true; }

      // Meteors
      meteors.forEach(m => {
        if (!m.active) return;
        const dx = Math.cos(m.angle) * m.len;
        const dy = Math.sin(m.angle) * m.len;
        const g = ctx.createLinearGradient(m.x, m.y, m.x - dx, m.y - dy);
        g.addColorStop(0,   `rgba(255,255,255,${m.alpha.toFixed(3)})`);
        g.addColorStop(0.3, `rgba(190,150,255,${(m.alpha * 0.6).toFixed(3)})`);
        g.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - dx, m.y - dy);
        ctx.strokeStyle = g; ctx.lineWidth = 1.8; ctx.stroke();

        m.x += Math.cos(m.angle) * m.speed * (dt / 16);
        m.y += Math.sin(m.angle) * m.speed * (dt / 16);

        // Fade near edges
        const edge = Math.min(m.x, w - m.x, h - m.y);
        if (edge < 150) m.alpha = Math.max(0, m.alpha - 0.025);

        if (m.x > w + 60 || m.y > h + 60 || m.alpha <= 0) {
          m.active = false;
          const fresh = makeMeteor(false);
          Object.assign(m, fresh);
          scheduleMeteor(m);
        }
      });

      animId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    initStars();
    for (let i = 0; i < METEOR_COUNT; i++) meteors.push(makeMeteor(true));
    animId = requestAnimationFrame(t => { lastTime = t; draw(t); });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      meteorTimeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 1, width: '100vw', height: '100vh' }}
      aria-hidden="true"
    />
  );
};

export default Starfield;

