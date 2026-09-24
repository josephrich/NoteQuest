// The Clefwing lockup: the winged-clef mark next to the name.
export function Logo({ size = 64 }: { size?: number }) {
  return (
    <span className="logo" style={{ ['--logo-size' as string]: `${size}px` }}>
      <img src="./logo-mark.svg" alt="" className="logo-mark" />
      <span className="logo-word">Clefwing</span>
    </span>
  );
}
