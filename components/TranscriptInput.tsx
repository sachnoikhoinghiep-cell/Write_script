
import React from 'react';
import { CheckIcon } from './icons';

interface TranscriptInputProps {
  transcript: string;
  onTranscriptChange: (value: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  isYoutubeUrl?: boolean;
  youtubeApiKey?: string;
  onYoutubeApiKeyChange?: (value: string) => void;
  isYoutubeApiValidated?: boolean;
  isCheckingYoutubeApi?: boolean;
  onValidateYoutubeApi?: () => void;
}

export const TranscriptInput: React.FC<TranscriptInputProps> = ({ 
  transcript, 
  onTranscriptChange, 
  onAnalyze, 
  isLoading,
  isYoutubeUrl,
  youtubeApiKey,
  onYoutubeApiKeyChange,
  isYoutubeApiValidated,
  isCheckingYoutubeApi,
  onValidateYoutubeApi
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

      {/* YouTube API Input Section */}
      {isYoutubeUrl && onYoutubeApiKeyChange && onValidateYoutubeApi && (
        <div className="bg-slate-800/80 border border-indigo-500/30 p-6 rounded-2xl animate-fade-in shadow-xl">
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-grow w-full">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest">
                  Nhập YouTube Data API Key
                </label>
                <a 
                  href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-300 hover:text-white underline transition-colors"
                >
                  Lấy API Key tại đây
                </a>
              </div>
              <input
                type="password"
                value={youtubeApiKey}
                onChange={(e) => onYoutubeApiKeyChange(e.target.value)}
                placeholder="Dán API Key của bạn tại đây..."
                disabled={isYoutubeApiValidated || isCheckingYoutubeApi}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50"
              />
            </div>
            <button
              onClick={onValidateYoutubeApi}
              disabled={isYoutubeApiValidated || isCheckingYoutubeApi || !youtubeApiKey?.trim()}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                isYoutubeApiValidated 
                ? 'bg-green-600 text-white cursor-default'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
              } disabled:opacity-50`}
            >
              {isCheckingYoutubeApi ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : isYoutubeApiValidated ? (
                <>
                  <CheckIcon />
                  Đã xác nhận
                </>
              ) : (
                'Xác nhận API'
              )}
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <p className="text-[10px] text-slate-500 italic">
              * Cần thiết để truy cập dữ liệu video YouTube một cách bảo mật.
            </p>
            <p className="text-[10px] text-slate-600">
              Hướng dẫn nhanh: Truy cập link trên → Tạo Project → Enable API → Credentials → Create API Key.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onAnalyze}
          disabled={isLoading || !transcript.trim() || (isYoutubeUrl && !isYoutubeApiValidated)}
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
