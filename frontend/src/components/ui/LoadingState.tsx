import { useTranslation } from '../../context/language-context';

export const LoadingState = ({ label }: { label?: string }) => {
  const { t } = useTranslation();

  return (
    <div className="loading-state">
      <div className="loading-state__ring" />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
};
