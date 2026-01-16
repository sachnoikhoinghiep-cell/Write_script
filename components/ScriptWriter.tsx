
import React, { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { generateScript, translateStory, generateImagePrompts, generateSEOMetadata, generateThumbnailImage, generateAudio } from '../services/geminiService';
import type { AnalysisResult, SEOResult } from '../types';
import { BackIcon, KeyPointIcon, ScriptIcon, TranslateIcon, BrushIcon, SEOIcon, CheckIcon, CopyIcon, VoiceIcon, DownloadIcon } from './icons';
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

const AVAILABLE_VOICES = [
  { id: 'Kore', name: 'Kore', desc: 'Giọng nam trầm ấm, chuyên nghiệp.' },
  { id: 'Puck', name: 'Puck', desc: 'Giọng trẻ trung, năng động, tươi sáng.' },
  { id: 'Charon', name: 'Charon', desc: 'Giọng điềm đạm, sâu lắng.' },
  { id: 'Fenrir', name: 'Fenrir', desc: 'Giọng mạnh mẽ, uy lực.' },
  { id: 'Zephyr', name: 'Zephyr', desc: 'Giọng nam nhẹ nhàng, truyền cảm.' },
];

const VOICE_STYLES = [
  { id: 'Calm', name: 'Bình thản', desc: 'Phù hợp kể chuyện tâm linh, bài học cuộc sống.' },
  { id: 'Emotional', name: 'Cảm xúc', desc: 'Phù hợp kịch bản tâm lý, cảm động.' },
  { id: 'Energetic', name: 'Năng lượng', desc: 'Phù hợp video truyền cảm hứng, bùng nổ.' },
  { id: 'Authoritative', name: 'Quyền lực', desc: 'Phù hợp video tri thức, triết lý sâu sắc.' },
  { id: 'Cheerful', name: 'Vui vẻ', desc: 'Phù hợp video giáo dục, đời thường.' },
];

/**
 * Loại bỏ dấu tiếng Việt và ký tự đặc biệt để làm tên file
 */
const slugify = (str: string) => {
  if (!str) return "";
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();
};

/**
 * Giải mã base64 thành Uint8Array
 */
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Chuyển Uint8Array PCM thành AudioBuffer
 */
async function pcmToAudioBuffer(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Mã hóa AudioBuffer thành WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const length = buffer.length * 2;
  const result = new DataView(new ArrayBuffer(44 + length));

  // RIFF identifier
  result.setUint32(0, 0x52494646, false);
  // file length
  result.setUint32(4, 36 + length, true);
  // RIFF type
  result.setUint32(8, 0x57415645, false);
  // format chunk identifier
  result.setUint32(12, 0x666d7420, false);
  // format chunk length
  result.setUint16(16, 16); // Set to 16 for PCM
  // sample format (raw)
  result.setUint16(20, 1, true);
  // channel count
  result.setUint16(22, buffer.numberOfChannels, true);
  // sample rate
  result.setUint32(24, buffer.sampleRate, true);
  // byte rate (sample rate * block align)
  result.setUint32(28, buffer.sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  result.setUint16(32, buffer.numberOfChannels * 2, true);
  // bits per sample
  result.setUint16(34, 16, true);
  // data chunk identifier
  result.setUint32(36, 0x64617461, false);
  // data chunk length
  result.setUint32(40, length, true);

  // write PCM samples
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      result.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([result], { type: 'audio/wav' });
}

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

  // Voice States
  const [audioDataParts, setAudioDataParts] = useState<Record<number, string>>({}); // { index: base64 }
  const [selectedVoice, setSelectedVoice] = useState<string>(AVAILABLE_VOICES[0].id);
  const [selectedVoiceStyle, setSelectedVoiceStyle] = useState<string>(VOICE_STYLES[0].id);
  const [isGeneratingVoices, setIsGeneratingVoices] = useState<boolean>(false);
  const [generatingVoiceIndex, setGeneratingVoiceIndex] = useState<number | null>(null);
  const [mergedAudioUrl, setMergedAudioUrl] = useState<string | null>(null);
  const [isMergingAudio, setIsMergingAudio] = useState<boolean>(false);

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

  // Image Generation States (Thumbnail)
  const [generatedThumbnailUrl, setGeneratedThumbnailUrl] = useState<string | null>(null);
  const [isGeneratingThumbnailImage, setIsGeneratingThumbnailImage] = useState<boolean>(false);
  const [thumbnailImageError, setThumbnailImageError] = useState<string | null>(null);
  
  const [imageModel, setImageModel] = useState<'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'>('gemini-2.5-flash-image');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "3:4" | "4:3" | "9:16" | "16:9">("16:9");
  const [selectedThumbnailText, setSelectedThumbnailText] = useState<string>('');

  // Story Images States (Generate All)
  const [generatedStoryImages, setGeneratedStoryImages] = useState<(string | null)[]>([]);
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState<boolean>(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const [allImagesError, setAllImagesError] = useState<string | null>(null);
  const [showAllImagesConfig, setShowAllImagesConfig] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<{current: number, total: number}>({current: 0, total: 0});

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
    setGeneratedThumbnailUrl(null);
    setSelectedThumbnailText('');
    setGeneratedStoryImages([]);
    setAudioDataParts({});
    setMergedAudioUrl(null);
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
    setGeneratedThumbnailUrl(null);
    setSelectedThumbnailText('');
    setGeneratedStoryImages([]);
    setAudioDataParts({});
    setMergedAudioUrl(null);
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

  // Voice Logic
  const handleGenerateVoice = async (index: number) => {
    const partsToUse = translatedScriptParts || scriptParts;
    if (!partsToUse) return;

    setGeneratingVoiceIndex(index);
    try {
      // Use both selectedVoice and selectedVoiceStyle to ensure consistency
      const base64 = await generateAudio(partsToUse[index], selectedVoice, selectedVoiceStyle);
      setAudioDataParts(prev => ({ ...prev, [index]: base64 }));
    } catch (err) {
      console.error(err);
      alert("Lỗi khi tạo giọng nói cho phần " + (index + 1));
    } finally {
      setGeneratingVoiceIndex(null);
    }
  };

  const handleGenerateAllVoices = async () => {
    const partsToUse = translatedScriptParts || scriptParts;
    if (!partsToUse) return;

    setIsGeneratingVoices(true);
    setAudioDataParts({}); // Xóa voice cũ để đảm bảo đồng nhất giọng mới theo cấu hình đã chọn
    setMergedAudioUrl(null);
    
    // Đóng băng cấu hình hiện tại để sử dụng xuyên suốt vòng lặp
    const voiceToUse = selectedVoice;
    const styleToUse = selectedVoiceStyle;

    try {
      for (let i = 0; i < partsToUse.length; i++) {
        setGeneratingVoiceIndex(i);
        const base64 = await generateAudio(partsToUse[i], voiceToUse, styleToUse);
        setAudioDataParts(prev => ({ ...prev, [i]: base64 }));
        // Nghỉ một chút để tránh rate limit của Gemini API
        await new Promise(r => setTimeout(r, 800));
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi trong quá trình tạo toàn bộ giọng nói.");
    } finally {
      setIsGeneratingVoices(false);
      setGeneratingVoiceIndex(null);
    }
  };

  const handleMergeAudio = async () => {
    const partsToUse = translatedScriptParts || scriptParts;
    if (!partsToUse || Object.keys(audioDataParts).length < partsToUse.length) {
      alert("Vui lòng tạo giọng nói cho tất cả các phần trước khi ghép nối.");
      return;
    }

    setIsMergingAudio(true);
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const buffers: AudioBuffer[] = [];

      for (let i = 0; i < partsToUse.length; i++) {
        const bytes = decodeBase64(audioDataParts[i]);
        const buffer = await pcmToAudioBuffer(bytes, audioCtx, 24000, 1);
        buffers.push(buffer);
      }

      // Ghép nối buffers
      const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
      const mergedBuffer = audioCtx.createBuffer(1, totalLength, 24000);
      let offset = 0;
      for (const b of buffers) {
        mergedBuffer.getChannelData(0).set(b.getChannelData(0), offset);
        offset += b.length;
      }

      const wavBlob = audioBufferToWav(mergedBuffer);
      const url = URL.createObjectURL(wavBlob);
      setMergedAudioUrl(url);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi ghép nối âm thanh.");
    } finally {
      setIsMergingAudio(false);
    }
  };

  const downloadMergedMp3 = () => {
    if (!mergedAudioUrl) return;
    const link = document.createElement('a');
    link.href = mergedAudioUrl;
    const fileName = slugify(result.topic).slice(0, 50) || 'voice_story';
    link.download = `${fileName}_full.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGeneratePrompts = useCallback(async () => {
    if (!translatedScriptParts) return;
    setIsGeneratingPrompts(true);
    setPromptsError(null);
    setGeneratedStoryImages([]);
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
    setGeneratedThumbnailUrl(null);
    setSelectedThumbnailText('');
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

  const handleGenerateThumbnailImage = useCallback(async () => {
    if (!seoResult) return;
    
    if (imageModel === 'gemini-3-pro-image-preview') {
      if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
        }
      }
    }

    setIsGeneratingThumbnailImage(true);
    setThumbnailImageError(null);
    setGeneratedThumbnailUrl(null);

    let finalPrompt = seoResult.thumbnailPrompt;
    if (selectedThumbnailText) {
      finalPrompt += `. CRITICAL: Add the text "${selectedThumbnailText}" as a central focal point. The text MUST use an extremely bold, extra-large, and clear SANS-SERIF font (font không chân). Use HIGH-CONTRAST colors for the text (e.g., vibrant yellow or pure white with a thick black drop shadow or dark stroke) to ensure perfect legibility against the background. The typography should be professional, cinematic, and dominant, perfectly integrated into the ${selectedStyle} aesthetic.`;
    }

    try {
      const url = await generateThumbnailImage(finalPrompt, imageModel, aspectRatio, imageSize);
      setGeneratedThumbnailUrl(url);
    } catch (err: any) {
      console.error(err);
      setThumbnailImageError('Không thể tạo hình ảnh thumbnail. Vui lòng thử lại.');
    } finally {
      setIsGeneratingThumbnailImage(false);
    }
  }, [seoResult, imageModel, aspectRatio, imageSize, selectedThumbnailText, selectedStyle]);

  const handleGenerateAllImages = useCallback(async () => {
    if (!imagePrompts || imagePrompts.length === 0) return;

    if (imageModel === 'gemini-3-pro-image-preview') {
        if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await window.aistudio.openSelectKey();
            }
        }
    }

    setIsGeneratingAllImages(true);
    setAllImagesError(null);
    const newImages = new Array(imagePrompts.length).fill(null);
    setGeneratedStoryImages(newImages);
    setGenerationProgress({current: 0, total: imagePrompts.length});
    setShowAllImagesConfig(false);

    try {
        for (let i = 0; i < imagePrompts.length; i++) {
            setGenerationProgress(prev => ({...prev, current: i + 1}));
            try {
                const url = await generateThumbnailImage(imagePrompts[i], imageModel, aspectRatio, imageSize);
                newImages[i] = url;
                setGeneratedStoryImages([...newImages]);
            } catch (err) {
                console.error(`Error generating image ${i}:`, err);
            }
        }
    } catch (err: any) {
        setAllImagesError("Quá trình tạo ảnh bị gián đoạn. Một số ảnh có thể chưa được tạo.");
    } finally {
        setIsGeneratingAllImages(false);
    }
  }, [imagePrompts, imageModel, aspectRatio, imageSize]);

  const handleDownloadAllImages = useCallback(async () => {
    const validImageData = generatedStoryImages
      .map((url, index) => ({ url, index: index + 1 }))
      .filter(item => item.url !== null);

    if (validImageData.length === 0) return;

    setIsDownloadingAll(true);
    try {
      const zip = new JSZip();
      
      for (const item of validImageData) {
        const base64Data = item.url!.split(',')[1];
        zip.file(`story-image-${item.index}.png`, base64Data, { base64: true });
      }

      const zipContent = await zip.generateAsync({ 
        type: 'blob', 
        compression: 'STORE' 
      });

      const downloadUrl = URL.createObjectURL(zipContent);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const fileName = slugify(result.topic).slice(0, 50) || 'story_images';
      link.download = `${fileName}_images.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Error creating ZIP:", err);
      alert("Đã xảy ra lỗi khi tạo file ZIP.");
    } finally {
      setIsDownloadingAll(false);
    }
  }, [generatedStoryImages, result.topic]);

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
Chữ đã chọn: ${selectedThumbnailText || 'Không chọn'}

--- GỢI Ý CHỮ TRÊN THUMBNAIL ---
${seoResult.thumbnailTextIdeas.map(idea => `- ${idea}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(fullText).then(() => {
      alert('Đã sao chép toàn bộ nội dung SEO vào clipboard!');
    });
  }, [seoResult, selectedStyle, selectedThumbnailText]);

  const calculateTotalWords = (parts: string[] | null) => {
      if (!parts) return 0;
      return parts.join(' ').trim().split(/\s+/).length;
  };

  const durationPerPart = (duration / numberOfParts).toFixed(1);

  const partsToDisplay = translatedScriptParts || scriptParts;
  const isAllAudioGenerated = partsToDisplay && Object.keys(audioDataParts).length === partsToDisplay.length;

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
            <h2 className="text-xl font-bold text-slate-300 mb-4 text-center border-b border-slate-700 pb-2">Nội dung cơ sở</h2>
            <div className="mb-3">
                <h3 className="font-semibold text-purple-400 text-[10px] uppercase tracking-[0.2em] mb-1">Chủ Đề:</h3>
                <p className="text-slate-100 text-lg font-bold leading-tight">{result.topic}</p>
            </div>
            <div>
                <h3 className="font-semibold text-purple-400 text-[10px] uppercase tracking-[0.2em] mb-2">Dàn Ý / Điểm Cốt Lõi:</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start text-xs bg-slate-900/40 p-3 rounded-xl border border-slate-700/50 hover:border-purple-500/30 transition-colors">
                            <span className="text-purple-400 mr-2 mt-0.5 flex-shrink-0"><KeyPointIcon /></span>
                            <span className="text-slate-300">{point}</span>
                        </li>
                    ))}
                </ul>
            </div>
          </div>
          
          <div className="p-6 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <label htmlFor="duration" className="block text-lg font-bold text-slate-200 mb-2">
                        Tổng thời lượng: <span className="text-purple-400">{duration} phút</span>
                    </label>
                    <input
                        id="duration"
                        type="range"
                        min="1"
                        max="60"
                        step="1"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        disabled={isLoading}
                    />
                     <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-1 uppercase">
                        <span>1 phút</span>
                        <span>60 phút</span>
                    </div>
                </div>

                <div>
                     <label htmlFor="parts" className="block text-lg font-bold text-slate-200 mb-2">
                        Chia thành: <span className="text-purple-400">{numberOfParts} phần</span>
                    </label>
                    <div className="flex items-center gap-4">
                        <select
                            id="parts"
                            value={numberOfParts}
                            onChange={(e) => setNumberOfParts(Number(e.target.value))}
                            className="flex-grow px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-bold focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            disabled={isLoading}
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                                <option key={num} value={num}>
                                    {num} Phần
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

             <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black rounded-2xl shadow-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all transform active:scale-95 shadow-purple-900/20"
            >
                <ScriptIcon />
                {isLoading ? 'ĐANG TẠO KỊCH BẢN...' : 'TẠO CÂU CHUYỆN MOTIVATIONAL'}
            </button>
          </div>

          {error && <ErrorDisplay message={error} />}
          {isLoading && <LoadingSpinner />}
          
          {scriptParts && !isLoading && (
            <div className="mt-8 animate-fade-in space-y-8">
                 <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-slate-700 pb-6 gap-4">
                      <div className="flex items-baseline gap-3">
                        <h2 className="text-3xl font-black text-white tracking-tight">Kịch Bản Story</h2>
                        <span className="text-xs font-bold text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-700 uppercase">
                            ~{calculateTotalWords(translatedScriptParts || scriptParts)} từ
                        </span>
                      </div>
                      <CopyButton textToCopy={(translatedScriptParts || scriptParts || []).join('\n\n')} />
                    </div>

                    {/* Voice Config Selection - ĐỒNG NHẤT VÀ CỐ ĐỊNH */}
                    <div className="mb-12 bg-slate-900/60 p-6 sm:p-8 rounded-3xl border-2 border-purple-500/20 shadow-inner relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                      <h3 className="text-xl font-black text-slate-100 mb-8 flex items-center gap-3 uppercase tracking-tight">
                        <VoiceIcon />
                        <span>Cấu hình Voice AI Đồng Nhất</span>
                      </h3>
                      
                      {/* Chọn Giọng */}
                      <div className="mb-8">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Lựa chọn giọng đọc:</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                          {AVAILABLE_VOICES.map((voice) => (
                            <button
                              key={voice.id}
                              onClick={() => {
                                  setSelectedVoice(voice.id);
                                  setAudioDataParts({});
                                  setMergedAudioUrl(null);
                              }}
                              className={`p-4 rounded-2xl border-2 transition-all duration-300 text-center flex flex-col items-center gap-2 ${
                                selectedVoice === voice.id
                                  ? 'border-purple-500 bg-purple-500/20 ring-4 ring-purple-500/10'
                                  : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedVoice === voice.id ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                <VoiceIcon />
                              </div>
                              <p className="font-black text-xs text-slate-100">{voice.name}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Chọn Tông Giọng / Style */}
                      <div className="mb-8">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Điều chỉnh tông giọng (Style):</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {VOICE_STYLES.map((style) => (
                            <button
                              key={style.id}
                              onClick={() => {
                                  setSelectedVoiceStyle(style.id);
                                  setAudioDataParts({});
                                  setMergedAudioUrl(null);
                              }}
                              className={`p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
                                selectedVoiceStyle === style.id
                                  ? 'border-purple-500 bg-purple-500/10'
                                  : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                              }`}
                            >
                              <p className="font-bold text-slate-100 text-sm">{style.name}</p>
                              <p className="text-[10px] text-slate-500 mt-1 leading-tight">{style.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-950/80 p-6 rounded-2xl border border-slate-800">
                        <div className="flex-grow w-full">
                          <div className="flex items-center gap-2 mb-2">
                             <CheckIcon />
                             <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Cấu hình đã khóa cho toàn bộ các phần</span>
                          </div>
                          <p className="text-xs text-slate-500 italic">Mọi đoạn voice sẽ được tạo với giọng <strong>{selectedVoice}</strong> và tông <strong>{VOICE_STYLES.find(s => s.id === selectedVoiceStyle)?.name}</strong> để đảm bảo kịch bản không bị lạc giọng.</p>
                        </div>
                        <button
                          onClick={handleGenerateAllVoices}
                          disabled={isGeneratingVoices}
                          className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-black rounded-2xl text-sm shadow-xl shadow-purple-900/30 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <VoiceIcon />
                          {isGeneratingVoices ? "ĐANG TẠO VOICE..." : "BẮT ĐẦU TẠO TOÀN BỘ"}
                        </button>
                      </div>
                    </div>

                    {/* Merging Tools */}
                    {isAllAudioGenerated && (
                      <div className="mb-12 p-8 bg-gradient-to-br from-indigo-950/40 to-slate-900/90 border border-purple-500/30 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-8 animate-scale-in">
                        <div className="text-center sm:text-left">
                            <p className="text-lg text-emerald-400 font-black flex items-center justify-center sm:justify-start gap-3 mb-2">
                                <CheckIcon /> HOÀN THÀNH TẠO VOICE AI
                            </p>
                            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">
                                GIỌNG: {selectedVoice} | TÔNG: {VOICE_STYLES.find(s => s.id === selectedVoiceStyle)?.name}
                            </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4">
                          <button
                            onClick={handleMergeAudio}
                            disabled={isMergingAudio}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-black shadow-2xl transition-all disabled:opacity-50 active:scale-95"
                          >
                            {isMergingAudio ? "ĐANG GHÉP NỐI..." : "GHÉP VOICE TÀI MP3"}
                          </button>
                          {mergedAudioUrl && (
                            <button
                              onClick={downloadMergedMp3}
                              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-black shadow-2xl transition-all animate-pulse flex items-center gap-3"
                            >
                              <DownloadIcon /> TẢI FILE .MP3 CUỐI CÙNG
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-10">
                        {(translatedScriptParts || scriptParts || []).map((part, index) => (
                            <div key={index} className="bg-slate-900/40 p-6 sm:p-8 rounded-3xl border border-slate-700/50 hover:border-purple-500/20 transition-all group">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6 border-b border-slate-800 pb-6">
                                    <div className="flex items-center gap-4">
                                        <span className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-xs font-black text-purple-400 border border-purple-500/20">
                                            {index + 1}
                                        </span>
                                        <h3 className="text-slate-100 font-black uppercase tracking-[0.2em] text-[10px]">
                                            PHẦN {index + 1} / {(translatedScriptParts || scriptParts || []).length}
                                        </h3>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4">
                                        {audioDataParts[index] ? (
                                          <div className="flex items-center gap-4 bg-slate-800 p-2 rounded-full pr-6 border border-slate-700 shadow-inner">
                                            <audio controls className="h-8 w-48 sm:w-64 accent-purple-500">
                                              <source src={`data:audio/wav;base64,${audioDataParts[index]}`} type="audio/wav" />
                                            </audio>
                                            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Ready</span>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => handleGenerateVoice(index)}
                                            disabled={generatingVoiceIndex !== null}
                                            className="flex items-center gap-2 px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-full text-xs font-bold border border-slate-600 transition-all disabled:opacity-50"
                                          >
                                            {generatingVoiceIndex === index ? (
                                              <div className="w-4 h-4 border-2 border-purple-500 border-t-white rounded-full animate-spin"></div>
                                            ) : <VoiceIcon />}
                                            Thử Giọng {selectedVoice}
                                          </button>
                                        )}
                                        <CopyButton textToCopy={part} />
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-purple-500/10 group-hover:bg-purple-500/40 transition-all rounded-full"></div>
                                    <pre className="text-slate-300 whitespace-pre-wrap font-sans text-base leading-relaxed tracking-wide pl-4 italic opacity-80 group-hover:opacity-100 transition-opacity">
                                        "{part}"
                                    </pre>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t-2 border-slate-700/50 pt-12">
                  <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700">
                      <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400">
                             <TranslateIcon />
                          </div>
                          <h3 className="text-xl font-black text-white uppercase tracking-tight">Dịch Thuật</h3>
                      </div>
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
                          className="w-full sm:w-auto px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-black rounded-xl shadow-lg transition-all active:scale-95"
                      >
                          {isTranslatingScript ? 'ĐANG DỊCH...' : 'DỊCH KỊCH BẢN'}
                      </button>
                  </div>
                  {translationScriptError && <div className="mt-4"><ErrorDisplay message={translationScriptError} /></div>}
                  {isTranslatingScript && <LoadingSpinner />}
                  
                  {translatedScriptParts && !isTranslatingScript && (
                    <div className="mt-12 animate-fade-in space-y-12">
                      <div className="border-t-2 border-slate-700/50 pt-12">
                          <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">
                             <div className="mb-10 text-center">
                                <h3 className="text-3xl font-black text-white mb-4 flex items-center justify-center gap-4">
                                    <BrushIcon />
                                    <span>Biên Tập Art Director</span>
                                </h3>
                                <p className="text-slate-400 max-w-lg mx-auto mb-6 text-sm font-medium">
                                    Tạo Prompt hình ảnh xuyên suốt câu chuyện và thiết kế Thumbnail chuyên nghiệp cho YouTube.
                                </p>
                             </div>

                             {/* Phong cách nghệ thuật */}
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                                {ART_STYLES.map((style) => (
                                    <button
                                        key={style.id}
                                        onClick={() => setSelectedStyle(style.name)}
                                        className={`text-left p-6 rounded-3xl border-2 transition-all duration-300 hover:shadow-2xl ${
                                            selectedStyle === style.name
                                                ? 'border-purple-500 bg-purple-500/10 shadow-purple-500/10 ring-4 ring-purple-500/5'
                                                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="font-black text-slate-100 mb-2 uppercase tracking-tight text-sm">{style.name}</div>
                                        <div className="text-xs text-slate-500 leading-snug font-medium">{style.description}</div>
                                    </button>
                                ))}
                             </div>

                             <div className="flex flex-col sm:flex-row justify-center gap-6">
                                <button
                                    onClick={handleGeneratePrompts}
                                    disabled={isGeneratingPrompts}
                                    className="inline-flex items-center justify-center gap-3 px-10 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-black rounded-2xl shadow-xl hover:scale-105 transition-all"
                                >
                                    <BrushIcon />
                                    {isGeneratingPrompts ? 'ĐANG TẠO PROMPT...' : 'TẠO PROMPT HÌNH ẢNH'}
                                </button>
                                <button
                                    onClick={handleGenerateSEO}
                                    disabled={isGeneratingSEO}
                                    className="inline-flex items-center justify-center gap-3 px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black rounded-2xl shadow-xl hover:scale-105 transition-all"
                                >
                                    <SEOIcon />
                                    {isGeneratingSEO ? 'ĐANG TỐI ƯU SEO...' : 'TỐI ƯU SEO & THUMBNAIL'}
                                </button>
                             </div>
                          </div>

                          {promptsError && <div className="mt-4"><ErrorDisplay message={promptsError} /></div>}
                          {isGeneratingPrompts && <LoadingSpinner />}

                          {imagePrompts && !isGeneratingPrompts && (
                            <div className="mt-12 animate-fade-in">
                                <div className="bg-slate-950 border-2 border-emerald-900/30 rounded-[2.5rem] shadow-2xl p-6 sm:p-10 relative overflow-hidden">
                                    <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-6 border-b border-emerald-900/20 pb-8">
                                        <div>
                                            <h2 className="text-3xl font-black text-emerald-400 tracking-tight">Kịch Bản Hình Ảnh</h2>
                                            <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest">Phong cách: {selectedStyle}</p>
                                        </div>
                                        <div className="flex flex-wrap justify-end gap-3">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(imagePrompts.join('\n\n')).then(() => {
                                                        alert('Đã sao chép toàn bộ prompt!');
                                                    });
                                                }}
                                                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase rounded-full transition-all border border-slate-700"
                                            >
                                                Sao Chép Toàn Bộ
                                            </button>
                                            <button
                                                onClick={() => setShowAllImagesConfig(!showAllImagesConfig)}
                                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-full transition-all shadow-lg"
                                            >
                                                Tạo Ảnh AI Hàng Loạt
                                            </button>
                                        </div>
                                    </div>

                                    {showAllImagesConfig && (
                                        <div className="mb-10 p-8 bg-slate-900/80 rounded-3xl border-2 border-emerald-500/20 animate-fade-in">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
                                                <div>
                                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Model AI</label>
                                                  <select value={imageModel} onChange={(e) => setImageModel(e.target.value as any)} className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500">
                                                    <option value="gemini-2.5-flash-image">Gemini Flash</option>
                                                    <option value="gemini-3-pro-image-preview">Gemini Pro</option>
                                                  </select>
                                                </div>
                                                <div>
                                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Độ Phân Giải</label>
                                                  <select value={imageSize} onChange={(e) => setImageSize(e.target.value as any)} disabled={imageModel !== 'gemini-3-pro-image-preview'} className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-bold outline-none disabled:opacity-30">
                                                    <option value="1K">1K</option>
                                                    <option value="2K">2K</option>
                                                    <option value="4K">4K</option>
                                                  </select>
                                                </div>
                                                <div>
                                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Tỷ Lệ Ảnh</label>
                                                  <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as any)} className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500">
                                                    <option value="16:9">16:9</option>
                                                    <option value="9:16">9:16</option>
                                                    <option value="1:1">1:1</option>
                                                  </select>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-4">
                                                <button onClick={() => setShowAllImagesConfig(false)} className="px-6 py-2 text-slate-400 text-xs font-black uppercase">Đóng</button>
                                                <button onClick={handleGenerateAllImages} className="px-10 py-3 bg-emerald-600 text-white text-xs font-black uppercase rounded-xl shadow-lg">BẮT ĐẦU TẠO {imagePrompts.length} ẢNH</button>
                                            </div>
                                        </div>
                                    )}

                                    {isGeneratingAllImages && (
                                        <div className="mb-10 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                                            <div className="flex justify-between items-center mb-3 px-1">
                                                <span className="text-emerald-400 font-black text-xs uppercase tracking-widest">Đang tạo ảnh hàng loạt...</span>
                                                <span className="text-slate-400 text-xs font-bold">{generationProgress.current} / {generationProgress.total}</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]" style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}></div>
                                            </div>
                                        </div>
                                    )}

                                    {generatedStoryImages.some(url => url !== null) && !isGeneratingAllImages && (
                                        <div className="mb-10 flex justify-center">
                                            <button onClick={handleDownloadAllImages} disabled={isDownloadingAll} className="px-12 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-2xl shadow-2xl hover:scale-105 transition-all uppercase tracking-widest text-xs">
                                                {isDownloadingAll ? "ĐANG ĐÓNG GÓI..." : "TẢI XUỐNG BỘ ẢNH (.ZIP)"}
                                            </button>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-8">
                                        {imagePrompts.map((prompt, idx) => (
                                            <div key={idx} className="bg-slate-900 p-6 sm:p-8 rounded-[2rem] border border-slate-800 hover:border-emerald-500/20 transition-all shadow-sm group">
                                                <div className="flex flex-col lg:flex-row gap-8">
                                                    <div className="flex-grow">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <span className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px] font-black text-emerald-500 border border-emerald-500/20">
                                                                {idx + 1}
                                                            </span>
                                                            <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Scene Prompt</h4>
                                                        </div>
                                                        <p className="text-slate-200 text-base font-mono italic select-all leading-relaxed">"{prompt}"</p>
                                                    </div>
                                                    {generatedStoryImages[idx] && (
                                                        <div className="lg:w-64 flex-shrink-0 animate-scale-in">
                                                            <div className="relative group/img rounded-2xl overflow-hidden border-2 border-emerald-500/20 shadow-2xl">
                                                                <img src={generatedStoryImages[idx]!} className="w-full h-auto object-cover transition-transform duration-700 group-hover/img:scale-110" />
                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <a href={generatedStoryImages[idx]!} download={`scene-${idx + 1}.png`} className="px-6 py-2 bg-white text-black font-black text-[10px] uppercase rounded-full">Lưu Ảnh</a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                          )}

                          {seoError && <div className="mt-4"><ErrorDisplay message={seoError} /></div>}
                          {isGeneratingSEO && <LoadingSpinner />}
                          {seoResult && !isGeneratingSEO && (
                            <div className="mt-12 space-y-12 animate-fade-in">
                                <div className="bg-slate-900/90 border-2 border-amber-900/30 rounded-[3rem] p-6 sm:p-10 shadow-2xl">
                                    <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-6 border-b border-amber-900/20 pb-8">
                                        <h2 className="text-3xl font-black text-amber-400 flex items-center gap-4 tracking-tight uppercase">
                                            <SEOIcon /> Marketing & SEO
                                        </h2>
                                        <button onClick={handleCopyAllSEO} className="px-8 py-2.5 bg-amber-600 text-white text-[10px] font-black uppercase rounded-full shadow-lg">Sao Chép Tất Cả SEO</button>
                                    </div>

                                    <section className="mb-12">
                                        <h3 className="text-lg font-black text-white mb-6 border-l-4 border-amber-500 pl-4 uppercase tracking-tight">10 Gợi Ý Tiêu Đề Viral</h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {seoResult.titles.map((title, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-slate-800/40 p-4 rounded-2xl border border-slate-700 hover:border-amber-500/30 transition-all group">
                                                    <span className="text-slate-200 text-sm font-bold"><span className="text-amber-500 mr-2">{idx + 1}.</span> {title}</span>
                                                    <CopyButton textToCopy={title} />
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="mb-12">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-lg font-black text-white border-l-4 border-amber-500 pl-4 uppercase tracking-tight">Mô Tả Video Tối Ưu</h3>
                                            <CopyButton textToCopy={seoResult.description} />
                                        </div>
                                        <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-medium">
                                            {seoResult.description}
                                        </div>
                                    </section>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                                        <section>
                                            <h3 className="text-lg font-black text-white mb-6 border-l-4 border-amber-500 pl-4 uppercase tracking-tight">Hashtags</h3>
                                            <div className="flex flex-wrap gap-3">
                                                {seoResult.hashtags.map((tag, idx) => (
                                                    <span key={idx} className="px-4 py-1.5 bg-slate-800 text-amber-300 text-[10px] font-black rounded-full border border-slate-700 uppercase">{tag}</span>
                                                ))}
                                            </div>
                                        </section>
                                        <section>
                                            <h3 className="text-lg font-black text-white mb-6 border-l-4 border-amber-500 pl-4 uppercase tracking-tight">Từ Khóa Phổ Biến</h3>
                                            <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700 text-slate-400 text-xs font-mono break-all leading-relaxed">
                                                {seoResult.keywords}
                                            </div>
                                        </section>
                                    </div>

                                    <section className="mt-16 bg-amber-500/5 p-8 rounded-[2.5rem] border border-amber-500/20">
                                        <h3 className="text-2xl font-black text-amber-400 mb-8 flex items-center gap-4 uppercase tracking-tight">
                                            <BrushIcon /> Thumbnail Art Director
                                        </h3>
                                        
                                        <div className="space-y-10">
                                            <div>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Prompt Sáng Tạo (English)</h4>
                                                    <CopyButton textToCopy={seoResult.thumbnailPrompt} />
                                                </div>
                                                <div className="p-6 bg-slate-950/80 rounded-3xl border-2 border-amber-500/30 text-amber-200/90 text-sm italic font-mono select-all leading-relaxed shadow-inner">
                                                    "{seoResult.thumbnailPrompt}"
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1">Gợi Ý Chữ (Chọn 1 để áp dụng vào ảnh):</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    {seoResult.thumbnailTextIdeas.map((idea, idx) => (
                                                        <button 
                                                            key={idx} 
                                                            onClick={() => setSelectedThumbnailText(idea)}
                                                            className={`p-4 text-center rounded-2xl border-2 transition-all font-black text-xs uppercase shadow-lg ${
                                                              selectedThumbnailText === idea 
                                                                ? 'bg-amber-600 border-amber-400 text-white scale-105 shadow-amber-500/20' 
                                                                : 'bg-slate-900 border-slate-800 text-amber-500 hover:border-amber-500/50 hover:bg-slate-800'
                                                            }`}
                                                        >
                                                            {idea}
                                                        </button>
                                                    ))}
                                                </div>
                                                {selectedThumbnailText && (
                                                    <div className="mt-4 flex justify-center">
                                                        <button onClick={() => setSelectedThumbnailText('')} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest border-b border-slate-700">Gỡ bỏ chữ</button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-slate-900/60 p-8 rounded-[2rem] border border-slate-800 space-y-8">
                                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                                                <div>
                                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Model Tạo Ảnh</label>
                                                  <select value={imageModel} onChange={(e) => setImageModel(e.target.value as any)} className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all">
                                                    <option value="gemini-2.5-flash-image">Gemini Flash (Nhanh)</option>
                                                    <option value="gemini-3-pro-image-preview">Gemini Pro (Cực Nét)</option>
                                                  </select>
                                                </div>
                                                <div>
                                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Độ Phân Giải</label>
                                                  <select value={imageSize} onChange={(e) => setImageSize(e.target.value as any)} disabled={imageModel !== 'gemini-3-pro-image-preview'} className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-bold outline-none disabled:opacity-30">
                                                    <option value="1K">1K</option>
                                                    <option value="2K">2K</option>
                                                    <option value="4K">4K</option>
                                                  </select>
                                                </div>
                                                <div>
                                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Tỷ Lệ Khung Hình</label>
                                                  <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as any)} className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all">
                                                    <option value="16:9">16:9 (YouTube)</option>
                                                    <option value="9:16">9:16 (Shorts/Reels)</option>
                                                    <option value="1:1">1:1 (Square)</option>
                                                  </select>
                                                </div>
                                              </div>

                                              <button onClick={handleGenerateThumbnailImage} disabled={isGeneratingThumbnailImage} className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black rounded-2xl shadow-xl shadow-amber-900/20 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm">
                                                {isGeneratingThumbnailImage ? "ĐANG TẠO HÌNH ẢNH..." : `TẠO THUMBNAIL ${selectedThumbnailText ? 'CÓ CHỮ' : 'NGHỆ THUẬT'}`}
                                              </button>

                                              {generatedThumbnailUrl && (
                                                <div className="mt-8 animate-scale-in">
                                                  <div className="relative group rounded-3xl overflow-hidden border-4 border-amber-500/20 shadow-2xl bg-slate-950">
                                                    <img src={generatedThumbnailUrl} className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-105" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-6">
                                                      <h5 className="text-white font-black uppercase tracking-[0.3em] text-[10px] border-b border-white/30 pb-2">Thumbnail Ready</h5>
                                                      <a href={generatedThumbnailUrl} download={`${slugify(selectedThumbnailText) || 'youtube_thumbnail'}.png`} className="px-10 py-3 bg-white text-black font-black text-xs uppercase rounded-full shadow-2xl hover:bg-amber-100 transition-colors active:scale-90">
                                                        TẢI ẢNH XUỐNG
                                                      </a>
                                                    </div>
                                                  </div>
                                                  <p className="text-center text-[10px] text-slate-600 mt-4 uppercase font-bold tracking-widest">Gợi ý: Nhấp chuột phải để lưu nếu nút tải không hoạt động</p>
                                                </div>
                                              )}
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
