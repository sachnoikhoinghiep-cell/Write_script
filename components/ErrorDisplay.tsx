
import React from 'react';

interface ErrorDisplayProps {
  message: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  return (
    <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg text-center animate-fade-in">
      <p>{message}</p>
    </div>
  );
};
