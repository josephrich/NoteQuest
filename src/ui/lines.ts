// Things the dragon says.
const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

export function greeting(name: string, hour: number, streak: number): string {
  const hi = hour < 12 ? `Good morning, ${name}!` : hour < 18 ? `Hi ${name}!` : `Evening, ${name}!`;
  if (streak >= 2) return `${hi} ${streak} days in a row. Let's keep the fire burning!`;
  return `${hi} ${pick(['Ready to read some notes?', "Let's find some notes!", 'Warm up those fingers!'])}`;
}

export const praise = () => pick(['Nice!', 'Great reading!', 'Yes!', 'Spot on!', 'Brilliant!', 'You got it!']);
export const lightning = () => pick(['Lightning read!', 'Super fast!', 'Speedy!']);
export const encourage = () => pick(['So close! Try again.', 'Have another look.', 'Nearly! Look again.']);
