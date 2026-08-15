import Link from "next/link";

// "Aktiv" betyder i drift i produktion, ikke bare bygget. Kortet fremhæves, og et
// modul, der endnu ikke kan bruges af klubben, må derfor ikke have den.
export type ModuleStatus = "Aktiv" | "Kommer senere";

export type ModuleCardProps = {
  description: string;
  href?: string;
  index: number;
  // Sat på et aktivt modul, brugeren ikke har adgang til. Kortet vises stadig —
  // klubben skal kunne se, hvad systemet indeholder — men nedtonet og uden link.
  //
  // Gælder ikke "Kommer senere": at et modul ikke er bygget endnu er ikke et
  // adgangsspørgsmål, og et hængelås dér ville love en adgang, der ikke findes.
  laast?: boolean;
  status: ModuleStatus;
  title: string;
};

const INGEN_ADGANG = "Du har ikke adgang til dette modul – kontakt admin";

export function ModuleCard({
  description,
  href,
  index,
  laast = false,
  status,
  title,
}: ModuleCardProps) {
  const isReady = status === "Aktiv";
  const erLaast = laast && isReady;

  const className = erLaast
    ? "flex min-h-40 flex-col rounded-2xl border border-slate-200 bg-slate-100 p-5"
    : "flex min-h-40 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2";

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span
          aria-hidden="true"
          className={
            erLaast
              ? "grid h-9 w-9 place-items-center rounded-xl bg-slate-200 text-xs font-black text-slate-500 ring-1 ring-slate-300"
              : "grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-xs font-black text-red-700 ring-1 ring-red-100"
          }
        >
          {String(index).padStart(2, "0")}
        </span>

        {erLaast ? (
          // Hængelåsen erstatter "Aktiv"-mærkatet. Modulet er aktivt — det er
          // bare ikke brugerens.
          <span className="flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-300">
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="currentColor"
            >
              <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 12 6h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5H6V4.5a2 2 0 1 1 4 0V6Z" />
            </svg>
            Ingen adgang
          </span>
        ) : (
          <span
            className={
              isReady
                ? "rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 ring-1 ring-inset ring-red-100"
                : "rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200"
            }
          >
            {status}
          </span>
        )}
      </div>

      <div className="mt-auto pt-6">
        <h3
          className={`text-lg font-bold tracking-tight ${
            erLaast ? "text-slate-500" : "text-slate-950"
          }`}
        >
          {title}
        </h3>
        <p
          className={`mt-1.5 max-w-sm text-sm leading-6 ${
            erLaast ? "text-slate-500" : "text-slate-600"
          }`}
        >
          {description}
        </p>
      </div>
    </>
  );

  // Låst kort peger bevidst ikke på en rute. Adgangen afvises alligevel af
  // proxy.ts, hvis nogen gætter adressen, men et dødt link, der sender brugeren
  // til "ingen adgang", er ikke en oplevelse, der skal bygges med vilje.
  if (erLaast) {
    return (
      <article className={className} title={INGEN_ADGANG} aria-label={`${title}. ${INGEN_ADGANG}`}>
        {content}
      </article>
    );
  }

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <article className={className}>{content}</article>;
}
