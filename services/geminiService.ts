
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { AnalysisResult, SEOResult } from '../types';

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key chưa được cấu hình trong môi trường hệ thống.");
  }
  return new GoogleGenAI({ apiKey });
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    topic: {
      type: Type.STRING,
      description: "Chủ đề chính của video hoặc văn bản.",
    },
    topicType: {
      type: Type.STRING,
      description: "Phân loại kiểu chủ đề (ví dụ: Động lực, Giáo dục, Tin tức, Kỹ năng, v.v.).",
    },
    keyPoints: {
      type: Type.ARRAY,
      description: "Danh sách các điểm chính từ transcript HOẶC Dàn ý chi tiết (Outline) nếu là phát triển chủ đề.",
      items: {
        type: Type.STRING,
      },
    },
    suggestedTopics: {
      type: Type.ARRAY,
      description: "Danh sách 5 chủ đề tiếp theo liên quan hoặc mở rộng từ nội dung này.",
      items: {
        type: Type.STRING,
      },
    }
  },
  required: ['topic', 'topicType', 'keyPoints', 'suggestedTopics'],
};

/**
 * Trích xuất nội dung từ URL (YouTube, Blog, Website) sử dụng Google Search Grounding
 */
export const extractContentFromUrl = async (url: string): Promise<string> => {
  try {
    const ai = getAIClient();
    
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Bạn là một chuyên gia trích xuất kịch bản và nội dung số. 
      NHIỆM VỤ: Hãy trích xuất toàn bộ nội dung hoặc bản ghi lời thoại (transcript) từ liên kết: ${url}
      
      HƯỚNG DẪN CHI TIẾT:
      1. SỬ DỤNG GOOGLE SEARCH: Bạn có quyền truy cập Internet. Hãy tìm kiếm chính xác tiêu đề, mô tả và quan trọng nhất là "transcript" (bản ghi lời thoại) của video/liên kết này.
      2. NGUỒN DỮ LIỆU: Tìm kiếm trên các trang web lưu trữ transcript công khai hoặc các bài blog tóm tắt nội dung video này.
      3. NẾU LÀ VIDEO: Hãy cố gắng tái hiện lại nội dung chính xác nhất dựa trên dữ liệu tìm kiếm được.
      4. ĐỊNH DẠNG: Chỉ trả về nội dung văn bản chính, không thêm lời dẫn của AI.`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    const extractedText = response.text;
    
    if (!extractedText || extractedText.length < 100) {
       throw new Error("Nội dung trích xuất không đủ để phân tích.");
    }

    return extractedText;
  } catch (error: any) {
    console.error("Error extracting content from URL:", error);
    throw new Error(`[Lỗi Trích Xuất]: AI không thể tự động lấy bản ghi từ link này. 
    
CÁCH KHẮC PHỤC:
Vui lòng mở video YouTube, sao chép bản ghi (transcript) thủ công và dán trực tiếp vào ô nhập liệu.`);
  }
};

/**
 * Tạo hình ảnh thumbnail từ prompt
 */
export const generateThumbnailImage = async (
  prompt: string,
  model: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview',
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "16:9",
  imageSize?: "1K" | "2K" | "4K"
): Promise<string> => {
  try {
    const ai = getAIClient();
    const config: any = {
      imageConfig: {
        aspectRatio,
      }
    };

    if (model === 'gemini-3-pro-image-preview' && imageSize) {
      config.imageConfig.imageSize = imageSize;
    }

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [{ text: prompt }],
      },
      config,
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Không tìm thấy dữ liệu hình ảnh trong phản hồi.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

/**
 * Tạo giọng nói (TTS) từ văn bản
 * Cập nhật: Thêm style để đảm bảo tông giọng đồng nhất
 */
export const generateAudio = async (text: string, voiceName: string = 'Kore', style: string = 'Calm'): Promise<string> => {
  try {
    const ai = getAIClient();
    // Prepend style hint to ensure consistency in tone
    const styledText = `Say this in a ${style} tone: ${text}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: styledText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Không tìm thấy dữ liệu âm thanh trong phản hồi API.");
    }
    return base64Audio;
  } catch (error) {
    console.error("Error generating audio:", error);
    throw error;
  }
};

export const analyzeTranscript = async (input: string): Promise<AnalysisResult> => {
  try {
    const ai = getAIClient();
    const isShortInput = input.trim().length < 300 && !input.includes('\n\n');

    let systemPrompt = '';
    if (isShortInput) {
      systemPrompt = `Dưới đây là một CHỦ ĐỀ hoặc TIÊU ĐỀ ngắn. 
      Nhiệm vụ của bạn là:
      1. Xác định đây là kiểu chủ đề gì (topicType).
      2. Xây dựng một DÀN Ý CHI TIẾT (keyPoints) để phát triển chủ đề này thành một kịch bản video hấp dẫn và có chiều sâu.
      3. Đề xuất 5 chủ đề liên quan.
      
      Nội dung: "${input}"`;
    } else {
      systemPrompt = `Phân tích bản ghi video hoặc nội dung văn bản sau đây. 
      Nhiệm vụ của bạn là:
      1. Xác định chủ đề chính (topic).
      2. Xác định kiểu nội dung/chủ đề này thuộc loại nào (topicType).
      3. Trích xuất các điểm cốt lõi quan trọng (keyPoints).
      4. Đề xuất 5 chủ đề liên quan.
      
      Nội dung:
      ---
      ${input}
      ---`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2,
      },
    });

    const jsonText = response.text.trim();
    const parsedResult = JSON.parse(jsonText);
    
    if (!parsedResult.topic || !Array.isArray(parsedResult.keyPoints)) {
        throw new Error("Invalid response format from API");
    }

    return parsedResult as AnalysisResult;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to analyze input. Please check the API response and your configuration.");
  }
};

export const translateResult = async (result: AnalysisResult, targetLanguage: string): Promise<AnalysisResult> => {
  const prompt = `Translate the following topic information into ${targetLanguage}. Maintain the original meaning and structure.

  **Topic to translate:**
  ${result.topic}

  **Topic Type to translate:**
  ${result.topicType || ''}

  **Key Points/Outline to translate:**
  ${result.keyPoints.map(p => `- ${p}`).join('\n')}

  **Suggested Topics to translate:**
  ${result.suggestedTopics?.map(p => `- ${p}`).join('\n') ?? ''}

  Respond ONLY with the JSON object.
  `;

  try {
      const ai = getAIClient();
      const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: {
              responseMimeType: "application/json",
              responseSchema: responseSchema,
              temperature: 0.1,
          },
      });

      const jsonText = response.text.trim();
      const parsedResult = JSON.parse(jsonText);
      
      if (!parsedResult.topic || !Array.isArray(parsedResult.keyPoints)) {
          throw new Error("Invalid response format from translation API");
      }

      return parsedResult as AnalysisResult;
  } catch (error) {
      console.error("Error calling Gemini API for translation:", error);
      throw new Error(`Failed to translate result to ${targetLanguage}.`);
  }
};

export const generateScript = async (
    translatedResult: AnalysisResult, 
    totalDuration: number, // in minutes
    numberOfParts: number,
    language: string
): Promise<string[]> => {
    const parts: string[] = [];
    let previousContext = "";
    
    const durationPerPart = totalDuration / numberOfParts;

    try {
        const ai = getAIClient();
        for (let partIndex = 1; partIndex <= numberOfParts; partIndex++) {
            const wordCount = Math.round(durationPerPart * 140);
            const isFirstPart = partIndex === 1;
            const isLastPart = partIndex === numberOfParts;

            let prompt = `
            Bạn là một người kể chuyện truyền cảm hứng chuyên nghiệp. Nhiệm vụ của bạn là viết một câu chuyện motivational bằng ngôn ngữ: **${language}**.
            Câu chuyện phải được kể dưới góc nhìn của một người dẫn chuyện duy nhất, phù hợp để chuyển thành giọng đọc AI (TTS).

            Dựa trên chủ đề và các điểm cốt lõi sau:
            - **Chủ đề:** ${translatedResult.topic}
            - **Kiểu chủ đề:** ${translatedResult.topicType || 'Chưa xác định'}
            - **Dàn ý/Điểm chính:** ${translatedResult.keyPoints.map(p => `\n  - ${p}`).join('')}

            **CẤU TRÚC VÀ THỜI LƯỢNG:**
            - Đây là một phần trong loạt câu chuyện dài tổng cộng ${totalDuration} phút.
            - **Thời lượng cho ĐOẠN NÀY:** ${durationPerPart.toFixed(1)} phút.
            - **Số lượng từ mục tiêu:** khoảng **${wordCount}** từ.

            **QUY TẮC QUAN TRỌNG VỀ CHUYỂN CẢNH (HÀNH ĐỘNG BẮT BUỘC):**
            1. KHÔNG ĐƯỢC phép sử dụng các cụm từ như "Chào mừng đến với phần...", "Đây là phần...", "Phần tiếp theo...", hoặc bất kỳ từ ngữ nào ám chỉ cấu trúc kỹ thuật của kịch bản.
            2. CHUYỂN TIẾP TỰ NHIÊN: Đoạn văn phải nối tiếp mạch cảm xúc và logic từ đoạn trước đó một cách vô hình. Người nghe không nên nhận ra kịch bản đang được chia thành nhiều phần.
            3. LIÊN KẾT MẠCH LẠC: Kết thúc đoạn này phải mở ra một ý niệm hoặc cảm xúc dẫn dắt tự nhiên vào ý tưởng tiếp theo.
            4. NGÔN NGỮ: Sử dụng ngôn từ giàu hình ảnh, nhịp điệu và cảm xúc.
            `;

            if (isFirstPart) {
                prompt += `
                **HƯỚNG DẪN CHO ĐOẠN MỞ ĐẦU:**
                - Bắt đầu bằng một câu "hook" mạnh mẽ, gây ấn tượng ngay lập tức.
                - Dẫn dắt người nghe vào bối cảnh hoặc chủ đề một cách tinh tế.
                - Định hình phong cách kể chuyện cho toàn bộ câu chuyện.
                `;
            } else {
                prompt += `
                **HƯỚNG DẪN CHO SỰ TIẾP NỐI (ĐOẠN ${partIndex}):**
                - Dựa trên nội dung đã kể trước đó:
                  ---
                  ${previousContext.slice(-2000)} 
                  ---
                - Bắt đầu đoạn này bằng cách tiếp nối trực tiếp hành động hoặc suy nghĩ đang dang dở ở đoạn trước.
                - Tuyệt đối không nhắc lại những gì đã nói, chỉ phát triển thêm.
                `;

                if (isLastPart) {
                    prompt += `
                    **HƯỚNG DẪN KẾT THÚC:**
                    - Đưa câu chuyện đến cao trào cảm xúc và kết thúc bằng một thông điệp đắt giá, lay động lòng người.
                    `;
                }
            }

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
                config: {
                    temperature: 0.7,
                },
            });

            const partText = response.text.trim();
            parts.push(partText);
            previousContext += "\n" + partText;
        }

        return parts;

    } catch (error) {
        console.error("Error generating script:", error);
        throw new Error("Failed to generate story script.");
    }
};

export const translateStory = async (scriptParts: string[], targetLanguage: string): Promise<string[]> => {
    const translatedParts: string[] = [];
    let previousTranslatedContext = "";

    try {
        const ai = getAIClient();
        for (let i = 0; i < scriptParts.length; i++) {
            const part = scriptParts[i];
            
            let prompt = `
            You are a professional literary translator.
            Translate the following story part into **${targetLanguage}**.

            **CRITICAL INSTRUCTION: LOCALIZATION & FLOW**
            - **Character Names:** You MUST change all character names to be culturally authentic and common for **${targetLanguage}**.
            - **Consistency:** Ensure you use the EXACT SAME localized names as in the previous parts.
            - **Seamlessness:** Do not add any "Part X" headings. The translation must flow naturally from the previous section.
            `;

            if (previousTranslatedContext) {
                 prompt += `
                **CONTEXT (Previous translated text):**
                ... ${previousTranslatedContext.slice(-2000)} ...
                `;
            }

            prompt += `
            **TEXT TO TRANSLATE:**
            ${part}

            **OUTPUT:**
            - Provide ONLY the translated narrative text.
            - Do not include notes, part numbers, or explanations.
            `;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
                config: {
                    temperature: 0.4,
                },
            });

            const translatedText = response.text.trim();
            translatedParts.push(translatedText);
            previousTranslatedContext += "\n" + translatedText;
        }
        return translatedParts;
    } catch (error) {
        console.error("Error translating story:", error);
        throw new Error("Failed to translate story.");
    }
};

export const generateImagePrompts = async (translatedScriptParts: string[], style: string): Promise<string[]> => {
    const fullText = translatedScriptParts.join('\n\n');
    const prompt = `
    You are a professional editor and AI art director specializing in image generation prompts.
    
    **TASK:** 
    Convert the following story into a series of visual image generation prompts.
    Go through the text sentence by sentence. For every visually significant moment or shift in scene, create one high-quality English prompt.

    **STYLE REQUIREMENT:**
    The style chosen by the user is: **"${style}"**. 
    Ensure every prompt strictly follows this aesthetic. Focus on lighting, texture, composition, and artistic medium associated with "${style}".

    **OUTPUT FORMAT:**
    - Language: English.
    - One prompt per line of visual action.
    - Do NOT include numbers or bullet points.
    - Separate each prompt with exactly ONE blank line.
    - Only output the prompts.

    **STORY TEXT:**
    ${fullText}
    `;

    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                temperature: 0.8,
            },
        });

        return response.text.trim().split('\n\n').map(p => p.trim()).filter(p => p !== '');
    } catch (error) {
        console.error("Error generating image prompts:", error);
        throw new Error("Failed to generate image prompts.");
    }
};

export const generateSEOMetadata = async (scriptText: string, topic: string, style: string): Promise<SEOResult> => {
    const prompt = `
    You are a world-class YouTube SEO expert. Based on the story and topic provided, generate standard YouTube SEO metadata in VIETNAMESE (except the thumbnail prompt which must be ENGLISH).

    **TOPIC:** ${topic}
    ** STORY TEXT:** ${scriptText}

    **REQUIRED OUTPUTS:**
    1.  **10 Video Titles:** Max 55 characters each. Adhere to 4 principles: curiosity gap, emotional appeal, human-optimized, value pre-load.
    2.  **Description:** Compelling and SEO-optimized video description.
    3.  **10 Hashtags:** Relevant and trending.
    4.  **10 Keywords:** Comma-separated list for viral potential.
    5.  **Thumbnail Prompt (ENGLISH):**
        - Style: **"${style}"**.
        - Requirements: Clear main subject, blurred background, high quality, high resolution, under 500 characters.
        - Rules: NO TEXT inside the image. Must deliver a point of focus and an emotion/promise within 0.5 seconds.
    6.  **3-5 Thumbnail Text Ideas:** Short, punchy text overlays in Vietnamese.

    **RESPONSE FORMAT:** Must be a valid JSON object.
    `;

    const seoSchema = {
        type: Type.OBJECT,
        properties: {
            titles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "10 Titles" },
            description: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
            keywords: { type: Type.STRING },
            thumbnailPrompt: { type: Type.STRING },
            thumbnailTextIdeas: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["titles", "description", "hashtags", "keywords", "thumbnailPrompt", "thumbnailTextIdeas"]
    };

    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: seoSchema,
                temperature: 0.7,
            },
        });

        return JSON.parse(response.text.trim()) as SEOResult;
    } catch (error) {
        console.error("Error generating SEO metadata:", error);
        throw new Error("Failed to generate SEO metadata.");
    }
};
