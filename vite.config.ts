import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  cacheDir: '.derived/vite',
  build: {
    outDir: 'assets', emptyOutDir: true, target: 'es2022',
    lib: { entry: 'src/main.ts', formats: ['es'], fileName: () => 'player.js', cssFileName: 'player' },
  },
});
