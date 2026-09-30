import { useRef, useState } from 'react';
import { useStore } from '../../state/store.tsx';
import { makeBackup, parseBackup, restoreBackup } from '../../storage/backup.ts';

export function SettingsScreen() {
  const store = useStore();
  const { t, settings, updateSettings, db, reload } = store;
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const exportJson = () => {
    const { reviews, notes, selections, settings: s, exams, journal } = store;
    const blob = new Blob([JSON.stringify(makeBackup({ reviews, notes, selections, settings: s, exams, journal }), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `iata-dgr-progression-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (file: File) => {
    try {
      const backup = parseBackup(await file.text());
      if (!db) throw new Error('Stockage local indisponible dans ce navigateur.');
      const ok = window.confirm(
        `Remplacer toute la progression actuelle par celle du fichier (${backup.reviews.length} révisions, ${backup.notes.length} notes DGR, ${backup.exams.length} examens) ?`,
      );
      if (!ok) return;
      await restoreBackup(db, backup);
      await reload();
      setMessage({ ok: true, text: 'Progression importée.' });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="screen narrow">
      <h1>{t.reglages.titre}</h1>
      <fieldset className="form-grid">
        <label htmlFor="set-theme">{t.reglages.theme}</label>
        <select id="set-theme" value={settings.theme} onChange={(e) => void updateSettings({ theme: e.target.value as typeof settings.theme })}>
          {(['auto', 'light', 'dark'] as const).map((v) => (
            <option key={v} value={v}>
              {t.reglages.themes[v]}
            </option>
          ))}
        </select>
        <label htmlFor="set-lang">{t.reglages.langue}</label>
        <select id="set-lang" value={settings.langue} onChange={(e) => void updateSettings({ langue: e.target.value as 'fr' | 'en' })}>
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
        <label htmlFor="set-exam">{t.reglages.dateExamen}</label>
        <input id="set-exam" type="date" value={settings.dateExamen ?? ''} onChange={(e) => void updateSettings({ dateExamen: e.target.value || null })} />
      </fieldset>

      <h2>{t.reglages.donnees}</h2>
      <p className="muted small">
        Tout reste sur cet ordinateur (IndexedDB du navigateur) : aucun compte, aucun envoi. Exportez régulièrement : vider les données du navigateur
        efface la progression.
      </p>
      <div className="actions">
        <button type="button" onClick={exportJson}>
          Exporter la progression (JSON)
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          Importer une progression…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importJson(f);
          }}
        />
      </div>
      {message && (
        <p role="status" className={`banner ${message.ok ? 'banner-ok' : 'banner-obsolete'}`}>
          {message.text}
        </p>
      )}

      <h2>À propos</h2>
      <p className="small">
        Contenu : vos fiches Markdown uniquement (aucun texte ni tableau du manuel IATA). Les références de section renvoient au DGR sans le recopier ; les
        valeurs chiffrées sont datées (édition de référence 54-55) et à vérifier dans la 67e édition.
      </p>
      <p className="small">
        <strong>{t.mention}</strong>
      </p>
    </div>
  );
}
