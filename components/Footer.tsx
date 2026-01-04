
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full max-w-4xl mx-auto mt-12 pb-8 border-t border-slate-800 pt-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Open Source Project</span>
        </div>
        <p className="text-slate-500 text-sm max-w-md">
          Dự án này được phát hành dưới giấy phép MIT. Người dùng có <strong>toàn quyền sử dụng</strong>, sao chép, sửa đổi và phân phối lại mã nguồn này khi đồng bộ lên GitHub hoặc bất kỳ nền tảng nào khác.
        </p>
        <div className="flex gap-6 text-xs font-medium text-slate-400">
          <span className="hover:text-sky-400 transition-colors cursor-default">Full Rights Granted</span>
          <span className="text-slate-700">|</span>
          <span className="hover:text-sky-400 transition-colors cursor-default">MIT License</span>
          <span className="text-slate-700">|</span>
          <span className="hover:text-sky-400 transition-colors cursor-default">No Restrictions</span>
        </div>
      </div>
    </footer>
  );
};
