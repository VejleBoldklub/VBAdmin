// Bruges i browseren af både billedsiden og designeditoren.

// Skærmen er en almindelig fladskærm. Større end dette ses ikke, og et billede
// direkte fra en telefon er ofte 4–8 MB.
const MAKS_SIDE = 1920;

// Skalér billedet ned i browseren, før det sendes.
//
// Et foto fra en telefon er større, end en server action og Vercel tager imod,
// og meget større end skærmen kan vise. createImageBitmap med
// imageOrientation: "from-image" vender billedet efter telefonens EXIF-data, så
// et portrætfoto ikke ender på siden.
//
// Med bevarGennemsigtighed beholder et PNG eller WebP sin gennemsigtige
// baggrund, så fx en udklippet ret kan lægges oven på en farve i designet.
// Resultatet er så WebP, som er langt mindre end PNG; browsere, der ikke kan
// skrive WebP, giver PNG i stedet.
export async function skalerNed(fil: File, bevarGennemsigtighed = false): Promise<Blob> {
  const gennemsigtig =
    bevarGennemsigtighed && (fil.type === "image/png" || fil.type === "image/webp");

  const bitmap = await createImageBitmap(fil, { imageOrientation: "from-image" });

  const faktor = Math.min(1, MAKS_SIDE / Math.max(bitmap.width, bitmap.height));
  const bredde = Math.round(bitmap.width * faktor);
  const hoejde = Math.round(bitmap.height * faktor);

  const laerred = document.createElement("canvas");
  laerred.width = bredde;
  laerred.height = hoejde;

  const ctx = laerred.getContext("2d");
  if (!ctx) throw new Error("Browseren kan ikke behandle billedet.");

  // Hvid bund, så et PNG med gennemsigtighed ikke bliver sort som JPEG.
  if (!gennemsigtig) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, bredde, hoejde);
  }
  ctx.drawImage(bitmap, 0, 0, bredde, hoejde);
  bitmap.close();

  return new Promise((resolve, reject) => {
    laerred.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Billedet kunne ikke konverteres."))),
      gennemsigtig ? "image/webp" : "image/jpeg",
      0.85
    );
  });
}
