type LoadingStateProps = {
  message: string;
};

export default function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="empty-state">
      <div className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
