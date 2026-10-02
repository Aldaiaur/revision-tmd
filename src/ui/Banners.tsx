import nouveautes from '../../data/nouveautes.json';
import { useStore } from '../state/store.tsx';
import { useMiseAJour } from '../pwa.ts';
import { localDay } from '../srs/leitner.ts';
import { exportProgress } from './exportProgress.ts';

/** Nombre de révisions avant de proposer une sauvegarde, et délai entre deux rappels. */
const SEUIL_REVISIONS = 20;
const RAPPEL_JOURS = 30;

/** Bandeaux globaux : stockage indisponible, nouvelle version, rappel de sauvegarde, nouveautés. */
export function Banners() {
  const store = useStore();
  const { t, ready, persistent, reviews, settings, updateSettings, today } = store;
  const { disponible, recharger } = useMiseAJour();
  const b = t.bandeaux;
  if (!ready) return null;

  const rappelDu =
    persistent &&
    reviews.length >= SEUIL_REVISIONS &&
    (!settings.rappelExport || (Date.parse(today) - Date.parse(settings.rappelExport)) / 86400000 >= RAPPEL_JOURS);
  const nouveaute = persistent && settings.nouveauteVue !== nouveautes.version;

  return (
    <div className="global-banners no-print">
      {!persistent && (
        <p className="banner banner-obsolete" role="alert">
          {b.stockage}
        </p>
      )}
      {disponible && (
        <p className="banner banner-maj" role="status">
          {b.miseAJour}{' '}
          <button type="button" className="primary" onClick={recharger}>
            {b.recharger}
          </button>
        </p>
      )}
      {nouveaute && (
        <p className="banner banner-ok" role="status">
          <b>{b.nouveautes} :</b> {nouveautes.texte}{' '}
          <button type="button" onClick={() => void updateSettings({ nouveauteVue: nouveautes.version })}>
            {b.compris}
          </button>
        </p>
      )}
      {rappelDu && (
        <p className="banner banner-relire" role="status">
          {b.export(settings.rappelExport)}{' '}
          <button type="button" className="primary" onClick={() => exportProgress(store)}>
            {b.exporter}
          </button>{' '}
          <button type="button" onClick={() => void updateSettings({ rappelExport: localDay(new Date()) })}>
            {b.plusTard}
          </button>
        </p>
      )}
    </div>
  );
}
