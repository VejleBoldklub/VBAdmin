export type ModuleStatus = "Klar til næste fase" | "Kommer senere";

export type ModuleCardProps = {
  description: string;
  index: number;
  status: ModuleStatus;
  title: string;
};

export function ModuleCard({ description, index, status, title }: ModuleCardProps) {
  const isReady = status === "Klar til næste fase";

  return (
    <article className="flex min-h-40 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <span
          aria-hidden="true"
          className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-xs font-black text-red-700 ring-1 ring-red-100"
        >
          {String(index).padStart(2, "0")}
        </span>
        <span
          className={
            isReady
              ? "rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 ring-1 ring-inset ring-red-100"
              : "rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200"
          }
        >
          {status}
        </span>
      </div>

      <div className="mt-auto pt-6">
        <h3 className="text-lg font-bold tracking-tight text-slate-950">{title}</h3>
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </article>
  );
}
