
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
        Phân Tích Bản Ghi YouTube
      </h1>
      <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
        Dán bản ghi video vào ô bên dưới để AI xác định chủ đề chính và các điểm cốt lõi.
      </p>
    </header>
  );
};
