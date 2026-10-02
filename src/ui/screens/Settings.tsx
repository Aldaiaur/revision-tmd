import { useRef, useState } from 'react';
import { useStore } from '../../state/store.tsx';
import { useDeck } from '../../state/deck.tsx';
import { parseBackup, restoreBackup } from '../../storage/backup.ts';
import { exportProgress } from '../exportProgress.ts';

export function SettingsScreen() {
  const store = useStore();
  const { t, settings, updateSettings, db, reload } = store;
  const { l } = useDeck();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const exportJson = () => exportProgress(store);

  const importJson = async (file: File) => {
    try {
      const backup = parseBackup(await file.text());
      if (!db) throw new Error('Stockage local indisponible dans ce navigateur.');
      const ok = window.confirm(
        `Remplacer toute la progression actuelle par celle du fichier (${backup.reviews.length} révisions, ${backup.notes.length} notes DGR/ADR, ${backup.exams.length} examens) ?`,
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
        <label htmlFor="set-exam">{t.reglages.dateExamen} IATA</label>
        <input id="set-exam" type="date" value={settings.dateExamen ?? ''} onChange={(e) => void updateSettings({ dateExamen: e.target.value || null })} />
        <label htmlFor="set-exam-adr">{t.reglages.dateExamen} ADR</label>
        <input id="set-exam-adr" type="date" value={settings.dateExamenAdr ?? ''} onChange={(e) => void updateSettings({ dateExamenAdr: e.target.value || null })} />
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
        IATA : vos fiches Markdown uniquement (aucun texte ni tableau du manuel IATA). Les références de section renvoient au DGR sans le recopier ; les
        valeurs chiffrées sont datées (édition de référence 54-55) et à vérifier dans la 67e édition.
      </p>
      <p className="small">
        ADR : questions reformulées à partir des supports de formation (cours, évaluations et exercices corrigés). Les références renvoient aux
        chapitres de l'ADR sans les recopier ; les cartes marquées « à vérifier » signalent un point douteux dans les supports.
      </p>
      <p className="small">
        <strong>{l.mention}</strong>
      </p>
    </div>
  );
}
