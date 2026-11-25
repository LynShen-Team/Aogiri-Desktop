<script lang="ts">
	// cyber-egg.spec.md CE-R3: motes of light that drift up behind a gilt or hologram card (the gateway's
	// motes.tsx). One canvas, few particles, paused while the window is hidden; nothing under reduced motion.
	const PEARL = ['246, 216, 232', '250, 234, 204', '214, 240, 228', '218, 224, 250'];

	let props: { kind: 'gold' | 'prism' | null; active: boolean } = $props();
	let canvas = $state<HTMLCanvasElement>();

	$effect(() => {
    const element = canvas;
    const kind = props.kind;
    if (!element || !kind || !props.active) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const context = element.getContext("2d");
    if (!context) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    let width = 0;
    let height = 0;
    const resize = () => {
      width = element.clientWidth;
      height = element.clientHeight;
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    type Mote = { x: number; y: number; vy: number; vx: number; r: number; life: number; age: number; hue: number };
    const motes: Mote[] = [];
    const spawn = (): Mote => ({
      x: width * (0.25 + Math.random() * 0.5),
      y: height * (0.45 + Math.random() * 0.45),
      vy: -(5 + Math.random() * 11),
      vx: (Math.random() - 0.5) * 10,
      r: 0.6 + Math.random() * 1.6,
      life: 2.4 + Math.random() * 3,
      age: 0,
      hue: Math.random() * 360,
    });
    for (let k = 0; k < 12; k += 1) motes.push({ ...spawn(), age: Math.random() * 3 });
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      context.clearRect(0, 0, width, height);
      for (let k = 0; k < motes.length; k += 1) {
        const m = motes[k];
        m.age += dt;
        if (m.age > m.life) motes[k] = spawn();
        m.x += (m.vx + Math.sin((m.age + k) * 1.7) * 6) * dt;
        m.y += m.vy * dt;
        const t = m.age / m.life;
        const alpha = Math.sin(Math.PI * Math.min(1, t)) * 0.6;
        context.beginPath();
        context.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        // Warm dust for gilt; for the hologram, pearl tints (no rainbow).
        context.fillStyle = kind === "gold" ? `rgba(255, 220, 160, ${alpha})` : `rgba(${PEARL[Math.floor(m.hue) % PEARL.length]}, ${alpha})`;
        context.shadowColor = context.fillStyle;
        context.shadowBlur = 6;
        context.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      context.clearRect(0, 0, width, height);
    };
	});
</script>

<canvas bind:this={canvas} class="ce-motes" aria-hidden="true"></canvas>
