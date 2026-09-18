import type { AppAction, AppSnapshot } from '../../shared/contracts';

export type RunAction = (action: AppAction) => Promise<boolean>;
export interface SettingsSectionProps {
  snapshot: AppSnapshot;
  run: RunAction;
}
