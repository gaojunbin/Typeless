import '../styles/vocabulary.css';
import type { AppSnapshot } from '../../shared/contracts';
import { PageHeader } from '../ui';
import { useI18n } from '../i18n';
import type { RunAction, SettingsTab } from '../settings/types';
import { AddEntry } from './AddEntry';
import { EntryList } from './EntryList';
import { InactiveNote } from './InactiveNote';

/** 词库: words the speaker says often and how recognition mishears them; polishing uses them to correct by context. */
export function Vocabulary({ snapshot, run, openSettings }: { snapshot: AppSnapshot; run: RunAction; openSettings: (tab: SettingsTab) => void }) {
  const { t } = useI18n();
  return <>
    <PageHeader title={t('common.page.vocabulary')} subtitle={t('vocabulary.subtitle')} />
    <InactiveNote settings={snapshot.settings} openSettings={openSettings} />
    <AddEntry run={run} />
    <EntryList entries={snapshot.vocabulary} run={run} />
    <p className="vocabulary-footnote">{t('vocabulary.footnote')}</p>
  </>;
}
