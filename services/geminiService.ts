
import { GoogleGenAI, Type } from "@google/genai";
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
      description: "Chủ đề chính của video.",
    },
    keyPoints: {
      type: Type.ARRAY,
      description: "Danh sách các điểm chính hoặc nội dung cốt lõi từ video.",
      items: {
        type: Type.STRING,
      },
    },
  },
  required: ['topic', 'keyPoints'],
};

/**
 * Trích xuất nội dung từ URL (YouTube, Blog, Website) sử dụng Google Search Grounding
 * Sử dụng Gemini 3 Pro để tối ưu hóa khả năng sử dụng công cụ tìm kiếm.
 */
export const extractContentFromUrl = async (url: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Nâng cấp lên Pro để có khả năng Search tốt hơn
      contents: `Bạn là một chuyên gia trích xuất dữ liệu. 
      NHIỆM VỤ: Hãy truy cập và đọc nội dung của liên kết này: ${url}
      
      HƯỚNG DẪN CHI TIẾT:
      1. Nếu là video YouTube: Hãy tìm kiếm bản ghi lời thoại (transcript) hoặc mô tả chi tiết nội dung video. 
      2. Nếu là bài viết/blog: Hãy trích xuất toàn bộ nội dung văn bản chính.
      3. Bạn CẦN sử dụng công cụ Google Search để lấy dữ liệu mới nhất nếu không thể truy cập trực tiếp.
      4. Chỉ trả về nội dung văn bản thuần túy (Plain Text), không thêm lời dẫn hay giải thích.
      5. Nếu video có giới hạn hoặc không có transcript công khai, hãy tóm tắt nội dung dựa trên dữ liệu tìm kiếm được từ tiêu đề và mô tả video.`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    const extractedText = response.text;
    
    if (!extractedText || extractedText.length < 50) {
       throw new Error("Nội dung trích xuất quá ngắn hoặc không khả dụng.");
    }

    return extractedText;
  } catch (error: any) {
    console.error("Error extracting content from URL:", error);
    // Cung cấp thông báo lỗi chi tiết hơn để người dùng biết cách xử lý
    throw new Error(`[Lỗi Trích Xuất]: AI không thể tự động lấy dữ liệu từ link này do hạn chế của trang web hoặc chính sách bảo mật của YouTube. \n\nCÁCH KHẮC PHỤC:\n1. Hãy dán trực tiếp kịch bản (transcript) vào ô văn bản.\n2. Kiểm tra xem video có bản phụ đề (CC) công khai không.`);
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

export const analyzeTranscript = async (transcript: string): Promise<AnalysisResult> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Phân tích bản ghi video hoặc nội dung văn bản sau đây và cung cấp chủ đề chính cùng danh sách các điểm cốt lõi.

      **Nội dung:**
      ---
      ${transcript}
      ---
      `,
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
    throw new Error("Failed to analyze transcript. Please check the API response and your configuration.");
  }
};

export const translateResult = async (result: AnalysisResult, targetLanguage: string): Promise<AnalysisResult> => {
  const prompt = `Translate the following topic and key points into ${targetLanguage}. Maintain the original meaning and structure.

  **Topic to translate:**
  ${result.topic}

  **Key Points to translate:**
  ${result.keyPoints.map(p => `- ${p}`).join('\n')}

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
            You are an inspirational storyteller. Your task is to write a motivational story in the language: **${language}**.
            The story should be told from the perspective of a single narrator, perfect for a text-to-speech application.
            
            Base the story on the following topic and key points.
            - **Topic:** ${translatedResult.topic}
            - **Key Points:** ${translatedResult.keyPoints.map(p => `\n  - ${p}`).join('')}

            **STRUCTURE & TIMING:**
            - This is **Part ${partIndex}** of a ${numberOfParts}-part series.
            - Total Series Duration: ${totalDuration} minutes.
            - **Time Allocation for THIS part:** ${durationPerPart.toFixed(1)} minutes.
            - **Target Word Count:** approximately **${wordCount}** words.
            
            Please strictly adhere to the pacing. Since this is Part ${partIndex} of ${numberOfParts}, ensure the narrative flow is appropriate for this section of the overall story.
            `;

            if (isFirstPart) {
                prompt += `
                **INSTRUCTIONS FOR PART 1 (Opening):**
                1.  **Opening Hook:** Start with a powerful, captivating hook.
                2.  **Introduction:** Introduce the narrative/characters/theme clearly.
                3.  **Format:** Continuous narrative text. No script format.
                4.  **Character Names:** Change any names to be culturally appropriate for **${language}**.
                `;
            } else if (isLastPart) {
                prompt += `
                **INSTRUCTIONS FOR PART ${partIndex} (Conclusion):**
                1.  **Continuity:** Continue seamlessly from the previous part.
                2.  **Previous Context:** 
                    ---
                    ${previousContext.slice(-2000)} 
                    ---
                3.  **Resolution:** Bring the story to a powerful, satisfying conclusion.
                `;
            } else {
                prompt += `
                **INSTRUCTIONS FOR PART ${partIndex} (Middle):**
                1.  **Continuity:** Continue seamlessly from the previous part.
                2.  **Previous Context:** 
                    ---
                    ${previousContext.slice(-2000)} 
                    ---
                3.  **Development:** Deepen the story.
                `;
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

            **CRITICAL INSTRUCTION: LOCALIZATION**
            - **Character Names:** You MUST change all character names to be culturally authentic and common for **${targetLanguage}**.
            - **Consistency:** Ensure you use the EXACT SAME localized names as in the previous parts.
            `;

            if (previousTranslatedContext) {
                 prompt += `
                **CONTEXT (Previous translated text):**
                ... ${previousTranslatedContext.slice(-2000)} ...
                `;
            }

            prompt += `
            **TEXT TO TRANSLATE (Part ${i + 1}):**
            ${part}

            **OUTPUT:**
            - Provide ONLY the translated narrative text.
            - Do not include notes or explanations.
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
