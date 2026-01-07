import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  message: string;
  children?: ReactNode;
};

export default function EmptyState({
  title,
  message,
  children,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      {children}
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}
