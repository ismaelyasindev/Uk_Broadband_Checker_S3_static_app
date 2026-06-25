/** Render an Mbps value as a human string, promoting to Gbps at >= 1000. */
export function formatSpeed(mbps: number): { value: string; unit: string } {
  if (mbps >= 1000) {
    const gbps = mbps / 1000;
    const value = Number.isInteger(gbps) ? String(gbps) : gbps.toFixed(1);
    return { value, unit: 'Gbps' };
  }
  return { value: String(mbps), unit: 'Mbps' };
}

/** Categorise a download speed using Ofcom's broadband bands. */
export function speedCategory(mbps: number): {
  label: string;
  tone: 'none' | 'standard' | 'superfast' | 'ultrafast';
} {
  if (mbps <= 0) return { label: 'No service', tone: 'none' };
  if (mbps < 30) return { label: 'Standard', tone: 'standard' };
  if (mbps <= 300) return { label: 'Superfast', tone: 'superfast' };
  return { label: 'Ultrafast', tone: 'ultrafast' };
}
