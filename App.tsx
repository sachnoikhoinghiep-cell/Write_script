
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { analyzeTranscript, translateResult, extractContentFromUrl } from './services/geminiService';
import type { AnalysisResult } from './types';
import { Header } from './components/Header';
import { TranscriptInput } from './components/TranscriptInput';
import { ResultDisplay } from './components/ResultDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ScriptWriter } from './components/ScriptWriter';
import { Footer } from './components/Footer';

type View = 'main' | 'scriptWriter';

const App: React.FC = () => {
  const [view, setView] = useState<View>('main');
  
  const [transcript, setTranscript] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Đang phân tích...');
  const [error, setError] = useState<string | null>(null);

  // YouTube API States
  const [youtubeApiKey, setYoutubeApiKey] = useState<string>('');
  const [isYoutubeApiValidated, setIsYoutubeApiValidated] = useState<boolean>(false);
  const [isCheckingYoutubeApi, setIsCheckingYoutubeApi] = useState<boolean>(false);
  const [userIp, setUserIp] = useState<string | null>(null);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [translatedResult, setTranslatedResult] = useState<AnalysisResult | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('Vietnamese');

  const [scriptWriterInput, setScriptWriterInput] = useState<{ result: AnalysisResult; language: string } | null>(null);

  // Lấy IP người dùng và kiểm tra session đã lưu
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        const currentIp = data.ip;
        setUserIp(currentIp);

        const savedKey = localStorage.getItem('yt_api_key');
        const savedIp = localStorage.getItem('yt_last_ip');

        if (savedKey && savedIp === currentIp) {
          setYoutubeApiKey(savedKey);
          setIsYoutubeApiValidated(true);
        } else if (savedIp && savedIp !== currentIp) {
          // IP đã thay đổi, yêu cầu nhập lại
          localStorage.removeItem('yt_api_key');
          localStorage.removeItem('yt_last_ip');
          setYoutubeApiKey('');
          setIsYoutubeApiValidated(false);
        }
      } catch (err) {
        console.error("Không thể lấy IP người dùng:", err);
      }
    };
    checkSession();
  }, []);

  const isUrl = useCallback((text: string) => {
    try {
      const url = new URL(text.trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      return false;
    }
  }, []);

  const isYoutubeUrl = useMemo(() => {
    if (!isUrl(transcript)) return false;
    const url = transcript.trim().toLowerCase();
    return url.includes('youtube.com') || url.includes('youtu.be');
  }, [transcript, isUrl]);

  const handleValidateYoutubeApi = useCallback(async () => {
    if (!youtubeApiKey.trim()) return;
    
    setIsCheckingYoutubeApi(true);
    setError(null);
    
    try {
      // Giả lập kiểm tra API Key (Trong tương lai có thể thực hiện gọi API YouTube thực sự tại đây)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (youtubeApiKey.length < 30) {
        throw new Error("API Key YouTube không hợp lệ. Vui lòng kiểm tra lại.");
      }
      
      setIsYoutubeApiValidated(true);
      
      // Lưu vào localStorage kèm IP hiện tại
      localStorage.setItem('yt_api_key', youtubeApiKey);
      if (userIp) {
        localStorage.setItem('yt_last_ip', userIp);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCheckingYoutubeApi(false);
    }
  }, [youtubeApiKey, userIp]);

  const handleAnalyze = useCallback(async () => {
    if (!transcript.trim()) {
      setError('Vui lòng nhập bản ghi hoặc liên kết trước khi phân tích.');
      return;
    }

    if (isYoutubeUrl && !isYoutubeApiValidated) {
      setError('Vui lòng xác nhận API YouTube trước khi tiếp tục phân tích video.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setTranslatedResult(null);
    setTranslationError(null);

    try {
      let contentToAnalyze = transcript;

      if (isUrl(transcript)) {
        setLoadingMessage('Đang cố gắng trích xuất nội dung từ liên kết...');
        try {
          contentToAnalyze = await extractContentFromUrl(transcript.trim());
        } catch (extractErr: any) {
          // Nếu trích xuất tự động thất bại, hiển thị lỗi rõ ràng hơn
          setError(extractErr.message);
          setIsLoading(false);
          return;
        }
      }

      setLoadingMessage('Đang phân tích chủ đề và điểm cốt lõi...');
      const analysis = await analyzeTranscript(contentToAnalyze);
      setResult(analysis);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('Đang phân tích...');
    }
  }, [transcript, isYoutubeUrl, isYoutubeApiValidated, isUrl]);

  const handleTranslate = useCallback(async () => {
    if (!result) return;
    setIsTranslating(true);
    setTranslationError(null);
    setTranslatedResult(null);
    try {
        const translation = await translateResult(result, targetLanguage);
        setTranslatedResult(translation);
    } catch (err) {
        console.error(err);
        setTranslationError('Không thể dịch kết quả. Vui lòng thử lại.');
    } finally {
        setIsTranslating(false);
    }
  }, [result, targetLanguage]);

  const handleGoToScriptWriter = useCallback(() => {
    if (!translatedResult) return;
    setScriptWriterInput({ result: translatedResult, language: targetLanguage });
    setView('scriptWriter');
  }, [translatedResult, targetLanguage]);
  
  const handleBackToMain = useCallback(() => {
    setScriptWriterInput(null);
    setView('main');
  }, []);

  // Màn hình ScriptWriter
  if (view === 'scriptWriter' && scriptWriterInput) {
    return <ScriptWriter input={scriptWriterInput} onBack={handleBackToMain} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto flex-grow">
        <Header />
        <main className="mt-8">
          <TranscriptInput
            transcript={transcript}
            onTranscriptChange={(val) => {
              setTranscript(val);
            }}
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            isYoutubeUrl={isYoutubeUrl}
            youtubeApiKey={youtubeApiKey}
            onYoutubeApiKeyChange={setYoutubeApiKey}
            isYoutubeApiValidated={isYoutubeApiValidated}
            isCheckingYoutubeApi={isCheckingYoutubeApi}
            onValidateYoutubeApi={handleValidateYoutubeApi}
          />

          {error && <ErrorDisplay message={error} />}

          {isLoading && (
            <div className="text-center">
              <LoadingSpinner />
              <p className="text-sky-400 mt-2 animate-pulse">{loadingMessage}</p>
            </div>
          )}

          {result && !isLoading && (
            <div className="mt-8 animate-fade-in">
              <ResultDisplay
                result={result}
                translatedResult={translatedResult}
                onTranslate={handleTranslate}
                isTranslating={isTranslating}
                targetLanguage={targetLanguage}
                onLanguageChange={setTargetLanguage}
                translationError={translationError}
                onGoToScriptWriter={handleGoToScriptWriter}
              />
            </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default App;
