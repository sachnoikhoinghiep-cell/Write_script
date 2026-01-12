
import React from 'react';

export const Header: React.FC = () => {
  /**
   * PH: Phiên Bản
   * v: Version
   * 016: Số thứ tự cập nhật
   * 11: Ngày
   * 01: Tháng
   * 2026: Năm
   */
  const APP_VERSION = "PH.v.016.11.01.2026";

  return (
    <header className="text-center relative pt-4">
      <div className="absolute top-0 right-0 flex flex-col items-end gap-1">
        <span className="text-[10px] font-mono text-slate-500 bg-slate-800/30 px-2 py-1 rounded-full border border-slate-700/50 tracking-tighter">
          {APP_VERSION}
        </span>
        <a 
          href="https://www.facebook.com/henryhuynh2" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] font-bold text-sky-500/70 hover:text-sky-400 transition-colors"
        >
          Tác giả: Henry Huỳnh
        </a>
      </div>
      <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
        Phân Tích Bản Ghi YouTube
      </h1>
      <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
        Dán bản ghi video vào ô bên dưới để AI xác định chủ đề chính và các điểm cốt lõi.
      </p>
    </header>
  );
};
