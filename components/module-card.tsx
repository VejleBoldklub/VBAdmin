import Link from "next/link";

// "Aktiv" betyder i drift i produktion, ikke bare bygget. Kortet fremhæves, og et
// modul, der endnu ikke kan bruges af klubben, må derfor ikke have den.
export type ModuleStatus = "Aktiv" | "Kommer senere";

export type ModuleCardProps = {
  description: string;
  href?: string;
  index: number;
  status: ModuleStatus;
  title: string;
};

export function ModuleCard({ description, href, index, status, title }: ModuleCardProps) {
  const isReady = status === "Aktiv";
  const className =
    "flex min-h-40 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2";

  const content = (
    <>
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
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <article className={className}>{content}</article>;
}
