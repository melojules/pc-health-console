import Card from './Card';
import DeltaIndicator from './DeltaIndicator';
import BarSpark from './BarSpark';

export default function StatCard({ label, value, unit, delta, deltaDirection = 'up', deltaCaption, spark, style }) {
  const color = deltaDirection === 'up' ? 'var(--viz-1)' : 'var(--viz-4)';
  return (
    <Card style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--space-5)', ...style }}>
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        <div style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ font: 'var(--type-metric)', color: 'var(--text-heading)' }}>
          {value}
          {unit && <span style={{ fontSize: 'var(--fs-metric-md)', fontWeight: 'var(--fw-medium)' }}>{unit}</span>}
        </div>
        {delta && <DeltaIndicator value={delta} direction={deltaDirection} caption={deltaCaption} />}
      </div>
      <BarSpark values={spark} color={color} />
    </Card>
  );
}
