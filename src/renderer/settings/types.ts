import type { AppAction, AppSettings, AppSnapshot } from '../../shared/contracts';

export type RunAction = (action: AppAction) => Promise<boolean>;
export type ChangeSetting = <K extends keyof AppSettings>(key: K, patch: Partial<AppSettings[K]>) => void;
export interface SettingsSectionProps {
  form: AppSettings;
  snapshot: AppSnapshot;
  change: ChangeSetting;
}
