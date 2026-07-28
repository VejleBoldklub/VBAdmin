import type { Category } from "@/features/baneplan/types";

// Farvekoder for tildelingernes kategorier. Delt mellem den læsende
// ScheduleView og den redigerbare ScheduleEditor, så en boks ser ens ud i
// live-planen og i kladden.
export function categoryClass(category: Category): string {
  switch (category) {
    case "piger":
      return "bg-green-100 border-green-600 text-green-950";
    case "drenge":
      return "bg-amber-100 border-amber-500 text-amber-950";
    case "akademi":
      return "bg-sky-100 border-sky-500 text-sky-950";
    case "future":
      return "bg-blue-100 border-blue-400 text-blue-950";
    case "reserveret":
      return "bg-slate-100 border-slate-500 text-slate-800 [background-image:repeating-linear-gradient(135deg,#f1f2f4_0,#f1f2f4_8px,#e2e5e9_8px,#e2e5e9_16px)]";
    default:
      return "bg-slate-100 border-slate-400 text-slate-900";
  }
}

// Lille farveprik til kategorivælgeren og til chippen i boksens hjørne.
// Holdes i samme fil som categoryClass, så de to ikke kan komme ud af trit.
export function categorySwatch(category: Category): string {
  switch (category) {
    case "piger":
      return "bg-green-500";
    case "drenge":
      return "bg-amber-500";
    case "akademi":
      return "bg-sky-500";
    case "future":
      return "bg-blue-500";
    case "reserveret":
      return "bg-slate-400";
    default:
      return "bg-slate-300";
  }
}
