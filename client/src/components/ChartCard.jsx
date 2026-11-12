export default function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {children}
    </div>
  );
}