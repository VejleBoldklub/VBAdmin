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
    <article className="flex min-h-64 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8">
      <div className="flex items-start justify-between gap-6">
        <span
          aria-hidden="true"
          className="grid h-11 w-11 place-items-center rounded-2xl bg-red-50 text-sm font-black text-red-700 ring-1 ring-red-100"
        >
          {String(index).padStart(2, "0")}
        </span>
        <span
          className={
            isReady
              ? "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-100"
              : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200"
          }
        >
          {status}
        </span>
      </div>

      <div className="mt-auto pt-10">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-3 max-w-sm text-base leading-7 text-slate-600">{description}</p>
      </div>
    </article>
  );
}
