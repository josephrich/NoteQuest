import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base so the build works at https://josephrich.github.io/NoteQuest/ or any other path.
  base: './',
  plugins: [react()],
  build: {
    // VexFlow (music notation) is ~1 MB on its own.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: { main: 'index.html', micTest: 'mic-test.html' },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
