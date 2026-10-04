export default function DirectionToggle({ value, onChange }) {
  return (
    <div className={`toggle${value === 'to_alien' ? ' right' : ''}`}>
      <div className="slider" />
      <div
        className={`opt${value === 'to_english' ? ' active' : ''}`}
        onClick={() => onChange('to_english')}
      >
        ALIEN → EN
      </div>
      <div
        className={`opt${value === 'to_alien' ? ' active' : ''}`}
        onClick={() => onChange('to_alien')}
      >
        EN → ALIEN
      </div>
    </div>
  );
}
