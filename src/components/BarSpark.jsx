export default function BarSpark({ values = [40, 62, 30, 78, 100], color = 'var(--viz-1)', width = 62, height = 34, gap = 3, style }) {
  const n = values.length;
  const bw = (width - gap * (n - 1)) / n;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap, width, height, ...style }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            width: bw,
            height: `${Math.max(8, v)}%`,
            background: color,
            borderRadius: 'var(--radius-xs)',
            transition: 'height var(--dur-chart) var(--ease-out)',
          }}
        />
      ))}
    </div>
  );
}
