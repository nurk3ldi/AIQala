import { Button } from './Button';
import { useTranslation } from '../../context/language-context';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export const PaginationControls = ({ page, totalPages, onChange }: PaginationControlsProps) => {
  const { t } = useTranslation();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        {t('pagination.previous')}
      </Button>
      <span className="pagination__meta">{t('pagination.page', { page, totalPages })}</span>
      <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        {t('pagination.next')}
      </Button>
    </div>
  );
};
