/**
 * Meldet eine Inhaltsdatei, die beim Build nicht gelesen werden konnte.
 *
 * Die Lader in `src/utils/` fallen bei kaputtem JSON bewusst auf Standardwerte
 * zurück, damit ein Admin-Tippfehler nicht den ganzen Build umwirft. Bisher
 * passierte das lautlos: die Seite ging mit Standardtexten live, und niemand
 * sah warum. Jetzt steht es im Build-Log (Vercel). Eine fehlende Datei
 * (`ENOENT`) ist dagegen ein normaler Zustand und bleibt still.
 */
export const warnUnreadable = (what: string, err: unknown): void => {
  if ((err as { code?: unknown } | null)?.code === 'ENOENT') return;
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`[${what}] nicht lesbar, Rückfall greift: ${message}`);
};
