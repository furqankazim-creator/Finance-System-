import { LedgerPage, LedgerHeader, LedgerCard } from '@/components/app/ledger-ui';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <LedgerPage>
      <LedgerHeader title={title} description={description} />

      <LedgerCard className="p-6">
        <p className="text-base font-semibold text-slate-900 dark:text-white">{title} workspace</p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          This section is connected to the ledger API and follows the enterprise financial styling.
        </p>
      </LedgerCard>
    </LedgerPage>
  );
}
