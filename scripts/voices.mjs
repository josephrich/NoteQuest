// Records the app's read-aloud lines with OpenAI's text-to-speech, into public/voice/<id>.mp3, and
// lists them in src/voice/clips.json so the app knows which lines have a recording.
//
//   npm run voices                 record new or changed lines only (asks for your OpenAI API key)
//   npm run voices -- --force      re-record everything (e.g. after changing voice)
//   npm run voices -- --dry-run    list what would be recorded, no key needed
//
// The key is typed in hidden, so it doesn't end up in your Terminal history. (Setting
// OPENAI_API_KEY in the environment works too.)
//
// Optional: VOICE (default "coral") and VOICE_MODEL (default "gpt-4o-mini-tts").
// Recordings that no longer match any line are deleted. Lines without a recording use the device's
// voice in the app, so this never has to be run for the app to work.
import { createServer } from 'vite';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = join(root, 'public/voice');
const indexFile = join(root, 'src/voice/clips.json');
const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');
let key = process.env.OPENAI_API_KEY;
const voice = process.env.VOICE ?? 'coral';
const model = process.env.VOICE_MODEL ?? 'gpt-4o-mini-tts';
const INSTRUCTIONS = [
  'You are a warm, patient, encouraging piano teacher talking to a child of about 8.',
  'Speak clearly and a little slowly, with a friendly smile in your voice. Keep it natural, not over the top.',
  'Letter names like "ay", "bee", "see", "dee", "ee", "eff" and "gee" are musical note names: say them as single letters.',
].join(' ');

// Load the app's own line list (TypeScript) through Vite, so this always matches what the app says.
const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom' });
let lines, speakable, clipId;
try {
  ({ spokenLines: lines } = await server.ssrLoadModule('/src/voice/lines.ts'));
  ({ speakable, clipId } = await server.ssrLoadModule('/src/voice/speakable.ts'));
  lines = lines();
} finally {
  await server.close();
}

const clips = lines.map((text) => ({ text, id: clipId(text), input: speakable(text) }));
const todo = clips.filter((c) => force || !existsSync(join(outDir, `${c.id}.mp3`)));
const chars = todo.reduce((n, c) => n + c.input.length, 0);
console.log(`${clips.length} lines, ${todo.length} to record (${chars} characters), voice "${voice}", model ${model}.`);

if (dryRun) {
  for (const c of todo) console.log(`  ${c.id}  ${c.input}`);
  process.exit(0);
}
// Asks for the key without echoing it to the screen.
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => rl.output.write(s.startsWith(question) ? s : '');
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

if (todo.length && !key) {
  if (!process.stdin.isTTY) {
    console.error('No OPENAI_API_KEY set.');
    process.exit(1);
  }
  key = await askHidden('Paste your OpenAI API key (it will not be shown): ');
  if (!key) process.exit(1);
}

mkdirSync(outDir, { recursive: true });

async function record(c) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, voice, input: c.input, instructions: INSTRUCTIONS, response_format: 'mp3' }),
    });
    if (res.ok) {
      writeFileSync(join(outDir, `${c.id}.mp3`), Buffer.from(await res.arrayBuffer()));
      return;
    }
    const detail = await res.text();
    // Rate limits and server hiccups are worth retrying; anything else (bad key, no credit) isn't.
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    throw new Error(`OpenAI said ${res.status} for "${c.input}": ${detail.slice(0, 300)}`);
  }
}

// A few at a time. If something goes wrong part way, what was recorded is kept and listed, and
// running again carries on from there.
let done = 0;
let failure = null;
const queue = [...todo];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let c = queue.shift(); c && !failure; c = queue.shift()) {
      try {
        await record(c);
        done++;
        process.stdout.write(`\r  recorded ${done}/${todo.length}`);
      } catch (e) {
        failure = e;
      }
    }
  }),
);
if (todo.length) process.stdout.write('\n');

// Tidy up recordings of lines that no longer exist, and tell the app what's available.
const wanted = new Set(clips.map((c) => c.id));
let removed = 0;
for (const f of readdirSync(outDir)) {
  if (f.endsWith('.mp3') && !wanted.has(f.slice(0, -4))) {
    rmSync(join(outDir, f));
    removed++;
  }
}
const available = [...new Set(clips.map((c) => c.id).filter((id) => existsSync(join(outDir, `${id}.mp3`))))].sort();
writeFileSync(indexFile, JSON.stringify(available) + '\n');
if (failure) {
  console.error(`Stopped: ${failure.message}`);
  console.error(`${available.length} of ${clips.length} lines are recorded so far. Fix the problem above and run it again to continue.`);
  process.exit(1);
}
console.log(`Done. ${available.length} of ${clips.length} lines recorded${removed ? `, ${removed} old recordings removed` : ''}.`);
