export function batteryDims(caseCode: string): { w: number; h: number } {
  const sizes: Record<string, [number, number]> = {
    MOTO: [136, 86],
    L1: [152, 122],
    L2: [178, 130],
    L3: [206, 134],
    L5: [246, 140],
  };
  const [w, h] = sizes[caseCode] ?? [178, 130];
  return { w, h };
}

export function batteryTechLabel(tech: string): string {
  return tech === 'DEEP-CYCLE' ? 'DC' : tech;
}

export function batteryTechColor(tech: string): string {
  if (tech === 'AGM') return 'var(--amber-ink)';
  if (tech === 'EFB') return 'var(--ok)';
  return 'var(--ink-2)';
}

interface Props {
  name: string;
  voltage: number;
  ah: number;
  tech: string;
  stock: string;
  caseCode: string;
}

export default function BatteryRender({ name, voltage, ah, tech, stock, caseCode }: Props) {
  const { w: W, h: H } = batteryDims(caseCode);
  const x = 8;
  const y = 18;
  const w = W - 16;
  const h = H - y - 8;
  const lid = Math.round(h * 0.2);
  const tw = Math.max(17, Math.round(w * 0.1));
  const th = Math.max(11, Math.round(lid * 0.62));
  const px = x + Math.round(w * 0.11);
  const mx = x + w - Math.round(w * 0.11) - tw;
  const lw = Math.round(w * 0.62);
  const lx = x + Math.round((w - lw) / 2);
  const ly = y + lid + Math.round(h * 0.13);
  const lh = h - (ly - y) - Math.round(h * 0.1);
  const fs1 = Math.max(14, Math.round(W * 0.088));
  const fs2 = Math.max(8.5, Math.round(W * 0.055));
  const labelSize = Math.max(11, fs2 + 2);
  const short = name.replace(/^AMPER /, '');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%' }} role="img" aria-label={`${name} battery`}>
      <rect x={px} y={y - th} width={tw} height={th} rx={2.5} fill="var(--amber-soft)" stroke="var(--amber)" strokeWidth={1.4} />
      <text x={px + tw / 2} y={y - th / 2 + 4.5} textAnchor="middle" fontFamily="var(--mono)" fontWeight={600} fontSize={labelSize} fill="var(--amber-ink)">+</text>
      <rect x={mx} y={y - th} width={tw} height={th} rx={2.5} fill="var(--bg-4)" stroke="var(--line-2)" strokeWidth={1.4} />
      <text x={mx + tw / 2} y={y - th / 2 + 4.5} textAnchor="middle" fontFamily="var(--mono)" fontSize={labelSize} fill="var(--ink-2)">−</text>
      <rect x={x} y={y} width={w} height={h} rx={5} fill="var(--bg-3)" stroke="var(--line-2)" strokeWidth={1.4} />
      <rect x={x} y={y} width={w} height={lid} rx={5} fill="var(--bg-2)" stroke="var(--line-2)" strokeWidth={1.4} />
      <rect x={x + w / 2 - lid * 0.62} y={y + lid / 2 - 3} width={lid * 1.24} height={6} rx={3} fill="none" stroke="var(--line-2)" strokeWidth={1.3} />
      <rect x={lx} y={ly} width={lw} height={lh} rx={3} fill="var(--bg-2)" stroke="var(--line-2)" strokeWidth={1.3} />
      <rect x={lx} y={ly} width={lw} height={Math.max(5, fs2 * 0.62)} rx={2} fill="var(--amber)" />
      <text x={lx + lw * 0.06} y={ly + lh * 0.52} fontFamily="var(--disp)" fontWeight={700} letterSpacing={0.6} fontSize={fs1} fill="var(--ink)">{short}</text>
      <text x={lx + lw * 0.06} y={ly + lh * 0.86} fontFamily="var(--mono)" fontSize={fs2} fill="var(--ink-2)">{voltage}V {ah}Ah</text>
      <text x={lx + lw * 0.94} y={ly + lh * 0.86} textAnchor="end" fontFamily="var(--mono)" fontSize={fs2 - 1} letterSpacing={1} fill={batteryTechColor(tech)}>{batteryTechLabel(tech)}</text>
      <circle cx={x + w - 13} cy={y + lid / 2} r={3.4} fill={stock === 'in' ? 'var(--ok)' : 'var(--amber)'} />
    </svg>
  );
}
