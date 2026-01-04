
import React, { useState, useCallback } from 'react';
import { generateScript, translateStory, generateImagePrompts, generateSEOMetadata } from '../services/geminiService';
import type { AnalysisResult, SEOResult } from '../types';
import { BackIcon, KeyPointIcon, ScriptIcon, TranslateIcon, BrushIcon, SEOIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { CopyButton } from './CopyButton';
import { LanguageSelector } from './LanguageSelector';

const ART_STYLES = [
  { id: 'ink-painting', name: 'Chinese Ink Painting (Thủy Mặc)', description: 'Tranh thủy mặc truyền thống, nét bút đậm nhạt, khoảng trắng tinh tế.' },
  { id: 'ancient-buddhist', name: 'Ancient Buddhist (Phật giáo xưa)', description: 'Phong cách tâm linh, tranh tường cổ, tông màu vàng đất và đá.' },
  { id: 'bbc-doc', name: 'BBC Documentary Style', description: 'Điện ảnh tài liệu sắc nét, chiều sâu trường ảnh, ánh sáng chân thực.' },
  { id: 'nat-geo', name: 'National Geographic Style', description: 'Nhiếp ảnh thiên nhiên hùng vĩ, màu sắc sống động, chi tiết cực cao.' },
  { id: 'ghibli', name: 'Studio Ghibli Anime', description: 'Hoạt hình Nhật Bản thơ mộng, màu sắc tươi sáng, cảm giác yên bình.' },
  { id: 'cyberpunk', name: 'Cyberpunk 2077 Aesthetic', description: 'Tương lai u tối, đèn neon rực rỡ, độ tương phản cao, phong cách viễn tưởng.' },
];

interface ScriptWriterProps {
  input: {
    result: AnalysisResult;
    language: string;
  };
  onBack: () => void;
}

export const ScriptWriter: React.FC<ScriptWriterProps> = ({ input, onBack }) => {
  const { result, language } = input;
  const [duration, setDuration] = useState<number>(5);
  const [numberOfParts, setNumberOfParts] = useState<number>(1);
  
  const [scriptParts, setScriptParts] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const defaultTranslationLang = language === 'Vietnamese' ? 'English' : 'Vietnamese';
  const [storyTargetLanguage, setStoryTargetLanguage] = useState<string>(defaultTranslationLang);
  const [translatedScriptParts, setTranslatedScriptParts] = useState<string[] | null>(null);
  const [isTranslatingScript, setIsTranslatingScript] = useState<boolean>(false);
  const [translationScriptError, setTranslationScriptError] = useState<string | null>(null);

  // Style State
  const [selectedStyle, setSelectedStyle] = useState<string>(ART_STYLES[0].name);

  // Image Prompt States
  const [imagePrompts, setImagePrompts] = useState<string[] | null>(null);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState<boolean>(false);
  const [promptsError, setPromptsError] = useState<string | null>(null);

  // SEO States
  const [seoResult, setSeoResult] = useState<SEOResult | null>(null);
  const [isGeneratingSEO, setIsGeneratingSEO] = useState<boolean>(false);
  const [seoError, setSeoError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setScriptParts(null);
    setTranslatedScriptParts(null);
    setTranslationScriptError(null);
    setImagePrompts(null);
    setPromptsError(null);
    setSeoResult(null);
    setSeoError(null);
    try {
      const generatedParts = await generateScript(result, duration, numberOfParts, language);
      setScriptParts(generatedParts);
    } catch (err) {
      console.error(err);
      setError('Không thể tạo câu chuyện. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [result, duration, numberOfParts, language]);

  const handleTranslateScript = useCallback(async () => {
    if (!scriptParts) return;
    setIsTranslatingScript(true);
    setTranslationScriptError(null);
    setTranslatedScriptParts(null);
    setImagePrompts(null);
    setSeoResult(null);
    try {
      const translation = await translateStory(scriptParts, storyTargetLanguage);
      setTranslatedScriptParts(translation);
    } catch (err) {
      console.error(err);
      setTranslationScriptError('Không thể dịch câu chuyện. Vui lòng thử lại.');
    } finally {
      setIsTranslatingScript(false);
    }
  }, [scriptParts, storyTargetLanguage]);

  const handleGeneratePrompts = useCallback(async () => {
    if (!translatedScriptParts) return;
    setIsGeneratingPrompts(true);
    setPromptsError(null);
    try {
      const prompts = await generateImagePrompts(translatedScriptParts, selectedStyle);
      setImagePrompts(prompts);
    } catch (err) {
      console.error(err);
      setPromptsError('Không thể tạo prompt hình ảnh. Vui lòng thử lại.');
    } finally {
      setIsGeneratingPrompts(false);
    }
  }, [translatedScriptParts, selectedStyle]);

  const handleGenerateSEO = useCallback(async () => {
    if (!translatedScriptParts) return;
    setIsGeneratingSEO(true);
    setSeoError(null);
    try {
      const metadata = await generateSEOMetadata(translatedScriptParts.join('\n\n'), result.topic, selectedStyle);
      setSeoResult(metadata);
    } catch (err) {
      console.error(err);
      setSeoError('Không thể tạo thông tin SEO. Vui lòng thử lại.');
    } finally {
      setIsGeneratingSEO(false);
    }
  }, [translatedScriptParts, result.topic, selectedStyle]);

  const handleCopyAllSEO = useCallback(() => {
    if (!seoResult) return;
    const fullText = `
--- 10 TIÊU ĐỀ VIDEO ---
${seoResult.titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

--- MÔ TẢ VIDEO ---
${seoResult.description}

--- HASHTAGS ---
${seoResult.hashtags.join(' ')}

--- TỪ KHÓA (KEYWORDS) ---
${seoResult.keywords}

--- THUMBNAIL PROMPT (AI IMAGE) ---
Phong cách: ${selectedStyle}
Prompt: ${seoResult.thumbnailPrompt}

--- GỢI Ý CHỮ TRÊN THUMBNAIL ---
${seoResult.thumbnailTextIdeas.map(idea => `- ${idea}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(fullText).then(() => {
      alert('Đã sao chép toàn bộ nội dung SEO vào clipboard!');
    });
  }, [seoResult, selectedStyle]);

  const calculateTotalWords = (parts: string[] | null) => {
      if (!parts) return 0;
      return parts.join(' ').trim().split(/\s+/).length;
  };

  const durationPerPart = (duration / numberOfParts).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="w-full max-w-4xl mx-auto">
        <header className="relative text-center mb-8">
          <button
            onClick={onBack}
            className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Quay lại"
          >
            <BackIcon />
            <span className="hidden sm:inline">Quay Lại</span>
          </button>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500">
            Người Kể Chuyện AI
          </h1>
        </header>

        <main>
          <div className="mb-8 p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
            <h2 className="text-xl font-bold text-slate-300 mb-4">Dựa trên nội dung đã dịch:</h2>
            <div className="mb-3">
                <h3 className="font-semibold text-purple-400">Chủ Đề:</h3>
                <p className="text-slate-300 pl-4">{result.topic}</p>
            </div>
            <div>
                <h3 className="font-semibold text-purple-400">Các Điểm Cốt Lõi:</h3>
                <ul className="space-y-2 mt-2">
                    {result.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start">
                            <span className="text-purple-400 mr-3 mt-1 flex-shrink-0"><KeyPointIcon /></span>
                            <span className="text-slate-300">{point}</span>
                        </li>
                    ))}
                </ul>
            </div>
          </div>
          
          <div className="p-6 bg-slate-800 rounded-xl shadow-lg space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <label htmlFor="duration" className="block text-lg font-semibold text-slate-300 mb-2">
                        Tổng thời lượng: <span className="font-bold text-purple-400">{duration} phút</span>
                    </label>
                    <input
                        id="duration"
                        type="range"
                        min="1"
                        max="30"
                        step="1"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        disabled={isLoading}
                    />
                     <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>1 phút</span>
                        <span>30 phút</span>
                    </div>
                </div>

                <div>
                     <label htmlFor="parts" className="block text-lg font-semibold text-slate-300 mb-2">
                        Chia thành: <span className="font-bold text-purple-400">{numberOfParts} phần</span>
                    </label>
                    <div className="flex items-center gap-4">
                        <select
                            id="parts"
                            value={numberOfParts}
                            onChange={(e) => setNumberOfParts(Number(e.target.value))}
                            className="flex-grow px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                            disabled={isLoading}
                        >
                            {[1, 2, 3, 4, 5, 6].map((num) => (
                                <option key={num} value={num}>
                                    {num} Phần
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 text-center">
                <p className="text-slate-300">
                    AI sẽ tạo <span className="text-white font-bold">{numberOfParts} phần</span>. 
                    Mỗi phần dài khoảng <span className="text-purple-400 font-bold">{durationPerPart} phút</span>.
                </p>
            </div>

             <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-3 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
            >
                <ScriptIcon />
                {isLoading ? 'Đang tạo...' : 'Tạo Câu Chuyện'}
            </button>
          </div>

          {error && <ErrorDisplay message={error} />}
          {isLoading && <LoadingSpinner />}
          
          {scriptParts && !isLoading && (
            <div className="mt-8 animate-fade-in space-y-8">
                 <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                      <div className="flex items-baseline gap-3">
                        <h2 className="text-2xl font-bold text-purple-400">Câu Chuyện Của Bạn</h2>
                        <span className="text-sm font-medium text-slate-400">
                            (Tổng cộng ~{calculateTotalWords(scriptParts)} từ)
                        </span>
                      </div>
                      <CopyButton textToCopy={scriptParts.join('\n\n')} />
                    </div>
                    
                    <div className="space-y-8">
                        {scriptParts.map((part, index) => (
                            <div key={index} className="bg-slate-900/50 p-4 rounded-md">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-purple-300 font-semibold uppercase tracking-wider text-sm">
                                        Phần {index + 1} ({durationPerPart} phút)
                                    </h3>
                                    <CopyButton textToCopy={part} />
                                </div>
                                <pre className="text-slate-300 whitespace-pre-wrap font-sans text-base leading-relaxed">
                                    {part}
                                </pre>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t-2 border-slate-700/50 pt-8">
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-800 p-4 rounded-lg">
                      <h3 className="text-xl font-semibold text-slate-300 flex items-center gap-2 flex-shrink-0">
                          <TranslateIcon />
                          <span>Dịch Câu Chuyện</span>
                      </h3>
                      <div className="w-full sm:w-auto flex-grow">
                        <LanguageSelector 
                          value={storyTargetLanguage}
                          onChange={setStoryTargetLanguage}
                          disabled={isTranslatingScript}
                        />
                      </div>
                      <button
                          onClick={handleTranslateScript}
                          disabled={isTranslatingScript || !scriptParts}
                          className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-500"
                      >
                          {isTranslatingScript ? 'Đang dịch...' : 'Dịch'}
                      </button>
                  </div>
                  {translationScriptError && <div className="mt-4"><ErrorDisplay message={translationScriptError} /></div>}
                  {isTranslatingScript && <LoadingSpinner />}
                  {translatedScriptParts && !isTranslatingScript && (
                    <div className="mt-8 animate-fade-in space-y-8">
                      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                          <div className="flex items-baseline gap-3">
                            <h2 className="text-2xl font-bold text-green-400">Câu Chuyện (Đã dịch)</h2>
                            <span className="text-sm font-medium text-slate-400">
                                (Tổng cộng ~{calculateTotalWords(translatedScriptParts)} từ)
                            </span>
                          </div>
                          <CopyButton textToCopy={translatedScriptParts.join('\n\n')} />
                        </div>
                        
                        <div className="space-y-8">
                            {translatedScriptParts.map((part, index) => (
                                <div key={index} className="bg-slate-900/50 p-4 rounded-md">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-green-300 font-semibold uppercase tracking-wider text-sm">
                                            Phần {index + 1}
                                        </h3>
                                        <CopyButton textToCopy={part} />
                                    </div>
                                    <pre className="text-slate-300 whitespace-pre-wrap font-sans text-base leading-relaxed">
                                        {part}
                                    </pre>
                                </div>
                            ))}
                        </div>
                      </div>

                      {/* AI ART & SEO TOOLS SECTION */}
                      <div className="border-t-2 border-slate-700/50 pt-8 mt-8">
                          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                             <div className="mb-8 text-center">
                                <h3 className="text-2xl font-bold text-slate-100 mb-4 flex items-center justify-center gap-2">
                                    <BrushIcon />
                                    <span>Công Cụ Biên Tập Pro</span>
                                </h3>
                                <p className="text-slate-400 max-w-lg mx-auto mb-6">
                                    Chọn phong cách nghệ thuật cho Prompt hình ảnh và Thumbnail của bạn. AI sẽ tối ưu hóa mọi thứ dựa trên lựa chọn này.
                                </p>
                             </div>

                             {/* Style Selection UI */}
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                                {ART_STYLES.map((style) => (
                                    <button
                                        key={style.id}
                                        onClick={() => setSelectedStyle(style.name)}
                                        className={`text-left p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                                            selectedStyle === style.name
                                                ? 'border-purple-500 bg-purple-500/10 shadow-purple-500/20'
                                                : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
                                        }`}
                                    >
                                        <div className="font-bold text-slate-100 mb-1">{style.name}</div>
                                        <div className="text-xs text-slate-500 leading-snug">{style.description}</div>
                                    </button>
                                ))}
                             </div>

                             <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <button
                                    onClick={handleGeneratePrompts}
                                    disabled={isGeneratingPrompts}
                                    className="inline-flex items-center justify-center gap-3 px-10 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                                >
                                    <BrushIcon />
                                    {isGeneratingPrompts ? 'Đang tạo prompt...' : 'Tạo Prompt Hình Ảnh'}
                                </button>
                                <button
                                    onClick={handleGenerateSEO}
                                    disabled={isGeneratingSEO}
                                    className="inline-flex items-center justify-center gap-3 px-10 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-lg shadow-lg hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                                >
                                    <SEOIcon />
                                    {isGeneratingSEO ? 'Đang tối ưu SEO...' : 'Tối Ưu SEO & Thumbnail'}
                                </button>
                             </div>
                          </div>

                          {promptsError && <div className="mt-4"><ErrorDisplay message={promptsError} /></div>}
                          {isGeneratingPrompts && <LoadingSpinner />}

                          {imagePrompts && !isGeneratingPrompts && (
                            <div className="mt-8 animate-fade-in">
                                <div className="bg-slate-900/80 border-2 border-emerald-900/30 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                    <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 border-b border-emerald-900/20 pb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-emerald-400">Prompts Hình Ảnh</h2>
                                            <p className="text-sm text-slate-500 mt-1 italic">Phong cách: {selectedStyle}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(imagePrompts.join('\n\n')).then(() => {
                                                    alert('Đã sao chép tất cả prompt!');
                                                });
                                            }}
                                            className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-full transition-all shadow-lg hover:shadow-emerald-500/20"
                                        >
                                            <ScriptIcon />
                                            Sao Chép Toàn Bộ Prompt
                                        </button>
                                    </div>
                                    <div className="space-y-6">
                                        {imagePrompts.map((prompt, idx) => (
                                            <div key={idx} className="group relative">
                                                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-emerald-500/20 group-hover:bg-emerald-500/50 transition-colors"></div>
                                                <div className="bg-slate-800/40 p-5 rounded-lg border border-slate-700 group-hover:border-emerald-500/30 transition-all">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <p className="text-slate-200 text-base leading-relaxed font-mono select-all">
                                                            {prompt}
                                                        </p>
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <CopyButton textToCopy={prompt} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                          )}

                          {/* SEO Results Display */}
                          {seoError && <div className="mt-4"><ErrorDisplay message={seoError} /></div>}
                          {isGeneratingSEO && <LoadingSpinner />}
                          {seoResult && !isGeneratingSEO && (
                            <div className="mt-8 animate-fade-in space-y-8">
                                <div className="bg-slate-900/90 border-2 border-amber-900/30 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                    <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 border-b border-amber-900/20 pb-6">
                                        <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-3">
                                            <SEOIcon /> Tối Ưu SEO & Marketing
                                        </h2>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleCopyAllSEO}
                                                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-full border border-amber-500/30 uppercase transition-all shadow-lg"
                                            >
                                                Sao Chép Toàn Bộ SEO
                                            </button>
                                        </div>
                                    </div>

                                    {/* 10 Titles Section */}
                                    <section className="mb-10">
                                        <h3 className="text-lg font-bold text-slate-100 mb-4 border-l-4 border-amber-500 pl-3">10 Gợi Ý Tiêu Đề (Tối ưu cảm xúc & tò mò)</h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {seoResult.titles.map((title, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700 hover:border-amber-500/30 transition-all">
                                                    <span className="text-slate-300 text-sm"><span className="text-amber-500 mr-2 font-bold">{idx + 1}.</span> {title}</span>
                                                    <CopyButton textToCopy={title} />
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Description Section */}
                                    <section className="mb-10">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold text-slate-100 border-l-4 border-amber-500 pl-3">Mô Tả Video (Description)</h3>
                                            <CopyButton textToCopy={seoResult.description} />
                                        </div>
                                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                                            {seoResult.description}
                                        </div>
                                    </section>

                                    {/* Hashtags & Keywords Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                        <section>
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-lg font-bold text-slate-100 border-l-4 border-amber-500 pl-3">10 Hashtags</h3>
                                                <CopyButton textToCopy={seoResult.hashtags.join(' ')} />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {seoResult.hashtags.map((tag, idx) => (
                                                    <span key={idx} className="px-3 py-1 bg-slate-700 text-amber-300 text-xs rounded-full border border-slate-600">{tag}</span>
                                                ))}
                                            </div>
                                        </section>
                                        <section>
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-lg font-bold text-slate-100 border-l-4 border-amber-500 pl-3">10 Keywords (Viral)</h3>
                                                <CopyButton textToCopy={seoResult.keywords} />
                                            </div>
                                            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 text-slate-300 text-xs font-mono">
                                                {seoResult.keywords}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Thumbnail Pro Section */}
                                    <section className="mt-12 bg-amber-500/5 p-6 rounded-xl border border-amber-500/20">
                                        <h3 className="text-xl font-bold text-amber-400 mb-6 flex items-center gap-2">
                                            <BrushIcon /> Thumbnail Art Director
                                        </h3>
                                        
                                        <div className="space-y-6">
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Prompt Hình Ảnh (Tiếng Anh) - {selectedStyle}</h4>
                                                    <CopyButton textToCopy={seoResult.thumbnailPrompt} />
                                                </div>
                                                <div className="p-4 bg-slate-900/80 rounded-lg border-2 border-amber-500/30 font-mono text-amber-200/90 text-sm italic select-all">
                                                    "{seoResult.thumbnailPrompt}"
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-2">Quy tắc: Đối tượng chính rõ nét, hậu cảnh mờ, chất lượng cao, không chữ.</p>
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-bold text-slate-200 mb-3 uppercase tracking-widest">Gợi Ý Chữ Trên Thumbnail (Overlay Ideas)</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    {seoResult.thumbnailTextIdeas.map((idea, idx) => (
                                                        <div key={idx} className="p-3 bg-slate-800 text-center rounded-lg border border-slate-700 text-amber-400 font-bold text-xs uppercase shadow-inner">
                                                            {idea}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
