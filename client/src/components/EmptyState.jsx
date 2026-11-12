export default function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          <Icon size={24} />
        </div>
      )}
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{text}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}