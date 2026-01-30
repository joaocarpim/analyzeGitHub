interface StatCardProps {
  label: string;
  value: number;
  highlight?: boolean;
}
export const StatCard = ({ label, value, highlight }: StatCardProps) => (
  <div
    className="stat-card"
    style={highlight ? { borderColor: "var(--accent-primary)" } : {}}
  >
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);
