
import React from 'react';
import { ScriptIcon, CheckIcon } from './icons';

// Fix: Removed non-compliant imports of testConnection and setManualApiKey.
// The API key must be obtained exclusively from the environment variable process.env.API_KEY.

interface ApiKeySetupProps {
  onSuccess: () => void;
}

/**
 * Fix: Replaced the API key setup form with a welcome screen.
 * Manual entry or management of the API key is prohibited; it is handled externally via process.env.API_KEY.
 */
export const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onSuccess }) => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-400">
            <ScriptIcon />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-2">Cấu Hình Hoàn Tất</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Ứng dụng đã sẵn sàng. Hệ thống tự động nhận diện cấu hình AI của bạn để bắt đầu phân tích và sáng tạo nội dung.
          </p>
        </div>

        <div className="space-y-6">
          <button
            onClick={onSuccess}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.01]"
          >
            <CheckIcon />
            Bắt Đầu Ngay
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
          <p className="text-xs text-slate-500">
            API Key đã được cấu hình bảo mật thông qua môi trường hệ thống.
          </p>
        </div>
      </div>
    </div>
  );
};
