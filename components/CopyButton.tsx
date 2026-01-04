
import React, { useState } from 'react';
import { CopyIcon, CheckIcon } from './icons';

interface CopyButtonProps {
  textToCopy: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-2 rounded-md transition-colors duration-200 ${
        copied
          ? 'bg-green-500/20 text-green-400'
          : 'bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-200'
      }`}
      aria-label={copied ? 'Đã sao chép' : 'Sao chép'}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
};
