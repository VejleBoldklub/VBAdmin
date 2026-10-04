// Kontrol af en billedfil, der er lagt op fra adminfladen.
//
// Ligger her og ikke i en af handlingerne, fordi et "use server"-modul kun må
// eksportere handlinger, og både billederne og designeditoren lægger filer op.

// Browseren skalerer billedet ned, før det sendes, og en fil er derfor normalt
// under 1 MB. Grænsen er sat under serverActions.bodySizeLimit i
// next.config.ts, så et for stort billede får en forståelig besked frem for en
// rå fejl fra Next.
export const FIL_MAKS = 3.5 * 1024 * 1024;

// Filtypen afgøres ud fra filens første bytes, ikke ud fra det navn eller den
// type, browseren påstår. Bucketen har også en liste over tilladte typer, men
// den kontrollerer kun den type, der sendes med — som vi selv sætter her.
export function billedtype(bytes: Uint8Array): { mime: string; endelse: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", endelse: "jpg" };
  }

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { mime: "image/png", endelse: "png" };
  }

  // RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: "image/webp", endelse: "webp" };
  }

  return null;
}
