const styles = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-blue-100 text-blue-700",
  info: "bg-slate-100 text-slate-600",
};

const labels = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

export default function SeverityBadge({ severity }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[severity] || styles.info
      }`}
    >
      {labels[severity] || severity}
    </span>
  );
}