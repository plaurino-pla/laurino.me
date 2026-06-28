# laurino.me

Una caminata por el **Parque Centenario** — Caballito, Buenos Aires.

A first-person, walkable 3D scene rendered in the browser. Inspired by
[malamud.ar](https://malamud.ar/). Built with [Three.js](https://threejs.org/)
and [Vite](https://vitejs.dev/), shipped as a static site on Vercel.

## Controls

- **WASD / arrows** — walk
- **drag / swipe** — look around
- **hold** — keep moving forward
- **♪ sonido** — toggle ambient sound

Everything is procedural low-poly geometry — no downloaded models or textures —
so it loads fast and runs on phones.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## Deploy

Pushing to `main` triggers a production deploy on Vercel. The site is served at
[laurino.me](https://laurino.me).
