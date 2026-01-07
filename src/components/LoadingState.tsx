import { useEffect, useState } from 'react';

type LoadingStateProps = {
  message: string;
  facts: string[];
};

export default function LoadingState({ message, facts }: LoadingStateProps) {
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    setFactIndex(0);
  }, [facts]);

  useEffect(() => {
    if (facts.length < 2) {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      const delay = 6000 + Math.random() * 4000;
      timer = setTimeout(() => {
        setFactIndex((current) => (current + 1) % facts.length);
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [facts]);

  const fact = facts[factIndex] ?? '';

  return (
    <div className="loading-state">
      <span className="loading-message">{message}</span>
      {fact && (
        <p className="loading-fact" key={fact}>
          <span className="fact-label">Did you know?</span>
          {fact}
        </p>
      )}
    </div>
  );
}
