import { useLayoutEffect, useRef } from 'react';
import { renderStaff, type StaffSpec } from '../engine/staff';

export function Staff(spec: StaffSpec) {
  const ref = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(spec);
  useLayoutEffect(() => {
    if (ref.current) renderStaff(ref.current, spec);
    // Re-render only when the spec's content changes.
  }, [key]);
  return <div className="staff" ref={ref} />;
}
