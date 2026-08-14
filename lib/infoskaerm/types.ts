// Svaret fra adminfladens handlinger.
//
// Typen ligger her og ikke i actions.ts, fordi det modul er markeret
// "use server": hver eksport derfra bliver et endepunkt, og en fil med
// handlinger skal kun indeholde handlinger. Samme opdeling som
// features/lokalebooking/types.ts.
export type GemResultat = { ok: true } | { ok: false; fejl: string };
