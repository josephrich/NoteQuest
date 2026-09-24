import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { ProgressProvider } from './ui/store';
import { listener } from './engine/listener';
import './ui/app.css';

// Test hook: with ?debug in the URL, window.__nq.note(midi) simulates playing a note.
if (new URLSearchParams(location.search).has('debug')) {
  (window as unknown as { __nq: unknown }).__nq = { note: (midi: number) => listener.simulate(midi), micOn: () => listener.running };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProgressProvider>
      <App />
    </ProgressProvider>
  </StrictMode>,
);
