
import React from 'react';

interface TranscriptInputProps {
  transcript: string;
  onTranscriptChange: (value: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  isYoutubeUrl?: boolean;
}

export const TranscriptInput: React.FC<TranscriptInputProps> = ({ 
  transcript, 
  onTranscriptChange, 
  onAnalyze, 
  isLoading,
  isYoutubeUrl
}) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="relative group">
        <textarea
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder="Dán bản ghi video YouTube HOẶC liên kết (YouTube, Website, Blog) vào đây..."
          className="w-full h-64 p-5 bg-slate-800 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 resize-y text-slate-300 placeholder-slate-500 shadow-inner"
          disabled={isLoading}
        />
        {isYoutubeUrl && (
          <div className="absolute top-4 right-4 bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-500/20 animate-pulse">
            Phát hiện link YouTube
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onAnalyze}
          disabled={isLoading || !transcript.trim()}
          className="px-12 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-xl hover:from-indigo-700 hover:to-purple-700 disabled:bg-slate-700 disabled:from-slate-800 disabled:to-slate-800 disabled:cursor-not-allowed disabled:text-slate-500 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              Đang xử lý...
            </span>
          ) : 'Bắt Đầu Phân Tích'}
        </button>
        <p className="text-xs text-slate-500">
          Hỗ trợ: Văn bản trực tiếp, Link YouTube, Website tin tức, Blog...
        </p>
      </div>
    </div>
  );
};
