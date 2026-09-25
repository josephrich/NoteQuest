// Records the app's read-aloud lines with OpenAI's text-to-speech, into public/voice/<id>.mpga, and
// lists them in src/voice/clips.json so the app knows which lines have a recording.
//
//   npm run voices                 record new or changed lines only (asks for your OpenAI API key)
//   npm run voices -- --force      re-record everything (e.g. after changing voice)
//   npm run voices -- --dry-run    list what would be recorded, no key needed
//   npm run voices -- --check      warn if any line has no recording, and offer to record them
//                                  (runs as part of `npm run ios`)
//   npm run voices -- --sample     record a few of the app's lines in several voices, into
//                                  voice-samples/ (not part of the app), to compare before choosing
//   npm run voices -- --sample sage,nova    ...in just these voices
//
// The key is typed in hidden, so it doesn't end up in your Terminal history. (Setting
// OPENAI_API_KEY in the environment works too.)
//
// Optional: VOICE (see VOICE SETTINGS below), VOICE_MODEL (default "gpt-4o-mini-tts") and ACCENT
// ("australian", the default, or "neutral"). After changing any of them, re-record everything
// with --force so every line sounds the same.
// Recordings that no longer match any line are deleted. Lines without a recording use the device's
// voice in the app, so this never has to be run for the app to work.
import { createServer } from 'vite';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = join(root, 'public/voice');
// MP3 audio, but named .mpga: the iOS app's file server mishandles .mp3 for fetch (see speech.ts).
const EXT = 'mpga';
const clipFile = (id) => join(outDir, `${id}.${EXT}`);
const indexFile = join(root, 'src/voice/clips.json');
const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');
const check = process.argv.includes('--check');
const sampleArg = process.argv.indexOf('--sample');
const sample = sampleArg >= 0;
let key = process.env.OPENAI_API_KEY;

// ---- VOICE SETTINGS ------------------------------------------------------------------------------
// Every line is recorded separately, so the instructions are specific: anything left open (accent,
// energy, speed) can come out differently from one line to the next.
const voice = process.env.VOICE ?? 'coral';
const model = process.env.VOICE_MODEL ?? 'gpt-4o-mini-tts';
const ACCENTS = {
  australian: 'A light, natural Australian English accent, as a teacher in Melbourne would speak. Not broad or exaggerated.',
  neutral: 'A clear, neutral English accent.',
};
const accent = ACCENTS[process.env.ACCENT ?? 'australian'] ?? ACCENTS.australian;
const INSTRUCTIONS = `
Who: A kind, patient piano teacher talking one-to-one with an 8-year-old pupil sitting at the piano.

Accent: ${accent}

Tone: Warm, calm and encouraging, with a gentle smile in the voice. Genuinely pleased when something
goes well, but never gushing, sing-song or over the top. When something is wrong ("Not quite..."),
stay relaxed and reassuring, never disappointed. Talk to the child as a capable learner, not a baby.

Pacing: Unhurried, a little slower than normal conversation, so a young child can follow. A short
pause after commas and colons, and between sentences. Keep the same pace and energy on every line.

Emphasis: Lightly stress the one word that matters most, usually the musical idea ("major",
"minor", "sharp", "semitone", "root", "higher", "lower"). Questions rise naturally at the end.

Pronunciation: Say note names crisply as single letters: "ay", "bee", "see", "dee", "ee", "eff",
"gee" are the letters A to G. "Sharp", "flat" and "natural" are musical words: say them clearly.
Say "3rd" as "third", "5th" as "fifth", "4th" as "fourth". "Semitone" is "SEM-ee-tone". "Treble"
rhymes with "pebble".

Don't: add words, sound effects or laughter; read punctuation aloud; whisper or shout.
`.trim();

// Candidates for --sample: voices that suit a warm teacher (you can name any OpenAI voice).
const SAMPLE_VOICES = ['coral', 'sage', 'nova', 'shimmer', 'ballad', 'fable'];
// Lines from the app that exercise the tricky parts: note names, sharps, a question, a correction.
const SAMPLE_LINES = [
  'New chord!',
  'D major is D, F♯ and A. D to F♯ is a major 3rd: 4 semitones. Fingers 1, 3 and 5.',
  'Tone or semitone?',
  'Not quite. The natural cancels the flat: plain B. Try again!',
  'The bass clef dots hug the F line: the 4th line up.',
];
// ---------------------------------------------------------------------------------------------------

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
// Recordings made before the switch to .mpga just need renaming.
for (const c of clips) {
  const old = join(outDir, `${c.id}.mp3`);
  if (existsSync(old) && !existsSync(clipFile(c.id))) renameSync(old, clipFile(c.id));
}
const todo = clips.filter((c) => force || !existsSync(clipFile(c.id)));
const chars = todo.reduce((n, c) => n + c.input.length, 0);
console.log(`${clips.length} lines, ${todo.length} to record (${chars} characters), voice "${voice}", model ${model}.`);

if (dryRun) {
  for (const c of todo) console.log(`  ${c.id}  ${c.input}`);
  process.exit(0);
}

// Asks a yes/no question; anything but "y" is no.
function ask(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y/i.test(answer.trim()));
    });
  });
}

// Before a build: make sure new lines don't quietly ship with the device's robotic voice.
if (check) {
  if (!todo.length) {
    console.log('✓ Every read-aloud line has a recording.');
    process.exit(0);
  }
  const bar = '!'.repeat(72);
  console.log(`\n${bar}\n  ${todo.length} read-aloud lines have NO recording, so the app will use the iPad's own voice for them:`);
  for (const c of todo.slice(0, 8)) console.log(`    - ${c.text}`);
  if (todo.length > 8) console.log(`    ...and ${todo.length - 8} more`);
  console.log(`${bar}\n`);
  if (!process.stdin.isTTY || !(await ask('Record them now with OpenAI? [y/N] '))) {
    console.log('Carrying on without them. Run `npm run voices` any time to record them.\n');
    process.exit(0);
  }
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

async function speech(input, withVoice) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, voice: withVoice, input, instructions: INSTRUCTIONS, response_format: 'mp3' }),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const detail = await res.text();
    // Rate limits and server hiccups are worth retrying; anything else (bad key, no credit) isn't.
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    throw new Error(`OpenAI said ${res.status} for "${input}" (voice ${withVoice}): ${detail.slice(0, 300)}`);
  }
}

// Samples: the same few lines in each voice, one file per voice, to listen to side by side.
if (sample) {
  if (!key) key = await askHidden('Paste your OpenAI API key (it will not be shown): ');
  if (!key) process.exit(1);
  const named = process.argv[sampleArg + 1];
  const sampleVoices = named && !named.startsWith('--') ? named.split(',') : SAMPLE_VOICES;
  const dir = join(root, 'voice-samples');
  mkdirSync(dir, { recursive: true });
  const input = SAMPLE_LINES.map(speakable).join(' ... ');
  console.log(`Recording samples in: ${sampleVoices.join(', ')}`);
  for (const v of sampleVoices) {
    try {
      writeFileSync(join(dir, `${v}.mp3`), await speech(input, v));
      console.log(`  voice-samples/${v}.mp3`);
    } catch (e) {
      console.log(`  ${v}: ${e.message}`);
    }
  }
  console.log('Listen, pick one, then:  VOICE=<name> npm run voices -- --force');
  process.exit(0);
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
  writeFileSync(clipFile(c.id), await speech(c.input, voice));
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
  const [name, ext] = f.split('.');
  if ((ext === EXT || ext === 'mp3') && !(ext === EXT && wanted.has(name))) {
    rmSync(join(outDir, f));
    removed++;
  }
}
const available = [...new Set(clips.map((c) => c.id).filter((id) => existsSync(clipFile(id))))].sort();
writeFileSync(indexFile, JSON.stringify(available) + '\n');
if (failure) {
  console.error(`Stopped: ${failure.message}`);
  console.error(`${available.length} of ${clips.length} lines are recorded so far. Fix the problem above and run it again to continue.`);
  process.exit(1);
}
console.log(`Done. ${available.length} of ${clips.length} lines recorded${removed ? `, ${removed} old recordings removed` : ''}.`);
if (done) console.log('Commit the new recordings so they stay with the app:  git add public/voice src/voice/clips.json && git commit -m "Record voice lines" && git push');
