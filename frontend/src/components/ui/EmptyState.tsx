interface EmptyStateProps {
  title: string;
  description: string;
}

export const EmptyState = ({ title, description }: EmptyStateProps) => (
  <article className="empty-state glass-card">
    <h3>{title}</h3>
    <p>{description}</p>
  </article>
);
