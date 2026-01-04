import React from 'react';

const LANGUAGES = [
  { code: 'English', name: 'Tiếng Anh' },
  { code: 'Vietnamese', name: 'Tiếng Việt' },
  { code: 'Spanish', name: 'Tiếng Tây Ban Nha' },
  { code: 'French', name: 'Tiếng Pháp' },
  { code: 'Japanese', name: 'Tiếng Nhật' },
  { code: 'German', name: 'Tiếng Đức' },
  { code: 'Chinese', name: 'Tiếng Trung' },
  { code: 'Korean', name: 'Tiếng Hàn' },
  { code: 'Russian', name: 'Tiếng Nga' },
];

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ value, onChange, disabled }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200 disabled:opacity-50"
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );
};