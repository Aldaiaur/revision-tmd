import { useStore } from '../../state/store.tsx';

export function SettingsScreen({ children }: { children?: React.ReactNode }) {
  const { t, settings, updateSettings } = useStore();
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
        <input
          id="set-exam"
          type="date"
          value={settings.dateExamen ?? ''}
          onChange={(e) => void updateSettings({ dateExamen: e.target.value || null })}
        />
      </fieldset>
      {children}
    </div>
  );
}
