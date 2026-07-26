# Vejle Boldklub Admin

En moderne og responsiv administrationsportal til Vejle Boldklub. Projektet er bygget med Next.js App Router, TypeScript og Tailwind CSS og er klar til deployment på Vercel.

## Forudsætninger

- Node.js 20.9 eller nyere
- npm

## Installation

1. Klon repositoryet, og gå til projektmappen:

   ```bash
   git clone <repository-url>
   cd VBAdmin
   ```

2. Installer dependencies:

   ```bash
   npm install
   ```

3. Start udviklingsserveren:

   ```bash
   npm run dev
   ```

4. Åbn [http://localhost:3000](http://localhost:3000) i din browser.

## Kommandoer

| Kommando | Beskrivelse |
| --- | --- |
| `npm run dev` | Starter den lokale udviklingsserver |
| `npm run build` | Opretter et optimeret produktionsbuild |
| `npm start` | Starter det færdige produktionsbuild |
| `npm run lint` | Kontrollerer kodekvalitet med ESLint |

## Deployment på Vercel

Importér repositoryet i [Vercel](https://vercel.com/new). Vercel registrerer automatisk Next.js og anvender de korrekte build-indstillinger. Der kræves ingen yderligere konfiguration.

Alternativt kan projektet deployes med Vercel CLI:

```bash
npx vercel
```
