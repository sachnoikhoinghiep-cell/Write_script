
import React from 'react';

interface TranscriptInputProps {
  transcript: string;
  onTranscriptChange: (value: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

export const TranscriptInput: React.FC<TranscriptInputProps> = ({ transcript, onTranscriptChange, onAnalyze, isLoading }) => {
  return (
    <div className="flex flex-col gap-4">
      <textarea
        value={transcript}
        onChange={(e) => onTranscriptChange(e.target.value)}
        placeholder="Dán bản ghi video YouTube HOẶC liên kết (YouTube, Website, Blog) vào đây..."
        className="w-full h-64 p-4 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-y text-slate-300 placeholder-slate-500"
        disabled={isLoading}
      />
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onAnalyze}
          disabled={isLoading || !transcript.trim()}
          className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
        >
          {isLoading ? 'Đang xử lý...' : 'Bắt Đầu Phân Tích'}
        </button>
        <p className="text-xs text-slate-500">
          Hỗ trợ: Văn bản trực tiếp, Link YouTube, Website tin tức, Blog...
        </p>
      </div>
    </div>
  );
};
