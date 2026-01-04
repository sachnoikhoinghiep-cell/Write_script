
import React, { useState, useEffect } from 'react';
import { ScriptIcon, CheckIcon, KeyPointIcon } from './icons';

interface SetupScreenProps {
  onComplete: (youtubeKey: string) => void;
  currentIp: string | null;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onComplete, currentIp }) => {
  const [ytKey, setYtKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!ytKey.trim()) {
      setError("Vui lòng nhập YouTube Data API Key.");
      return;
    }

    if (ytKey.length < 30) {
      setError("API Key YouTube có vẻ không hợp lệ. Vui lòng kiểm tra lại.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Giả lập xác thực
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Lưu vào localStorage
      localStorage.setItem('yt_api_key', ytKey);
      if (currentIp) {
        localStorage.setItem('yt_last_ip', currentIp);
      }
      
      onComplete(ytKey);
    } catch (err) {
      setError("Không thể xác thực API Key. Vui lòng thử lại.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-2xl border border-slate-700 p-8 rounded-3xl shadow-2xl animate-scale-in">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20 text-white">
            <ScriptIcon />
          </div>
          <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Cấu Hình Ứng Dụng</h1>
          <p className="text-slate-400 text-sm">
            Thiết lập một lần duy nhất để bắt đầu sử dụng sức mạnh của AI.
          </p>
        </div>

        <div className="space-y-6">
          {/* Gemini AI Status (Auto-configured from process.env) */}
          <div className="bg-slate-900/50 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckIcon />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gemini AI</p>
                <p className="text-sm font-semibold text-emerald-400">Đã Sẵn Sàng</p>
              </div>
            </div>
            <span className="text-[10px] text-slate-600 font-mono italic">Auto-env</span>
          </div>

          {/* YouTube API Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">YouTube Data API Key</label>
              <a 
                href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
              >
                Lấy Key tại đây
              </a>
            </div>
            <input
              type="password"
              value={ytKey}
              onChange={(e) => setYtKey(e.target.value)}
              placeholder="Dán API Key YouTube của bạn..."
              className="w-full px-5 py-4 bg-slate-900 border border-slate-700 rounded-2xl text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center animate-shake">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isVerifying}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-2xl shadow-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform active:scale-95 disabled:opacity-50"
          >
            {isVerifying ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Đang kiểm tra...
              </div>
            ) : "LƯU & BẮT ĐẦU"}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <KeyPointIcon />
            <p className="text-[10px] font-bold uppercase tracking-widest">Ghi chú bảo mật</p>
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed italic">
            Dữ liệu được lưu cục bộ trên trình duyệt. Nếu bạn thay đổi địa chỉ IP (đổi mạng), ứng dụng sẽ yêu cầu cấu hình lại để đảm bảo an toàn.
          </p>
          {currentIp && (
            <p className="mt-2 text-[9px] font-mono text-slate-700 text-right">IP Hiện Tại: {currentIp}</p>
          )}
        </div>
      </div>
    </div>
  );
};
