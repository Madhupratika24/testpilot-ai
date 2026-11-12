export default function PagePlaceholder({ title }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-slate-500">This page will be built in a later phase.</p>
    </div>
  );
}