import { GoogleGenAI, Type, GenerateContentResponse, Modality, FunctionDeclaration } from "@google/genai";
import { Message, MessagePart, ApiSettings } from '../types';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface ChatConfig {
  useSearch?: boolean;
  useMaps?: boolean;
  location?: { latitude: number; longitude: number };
  useThinking?: boolean;
  isTTS?: boolean;
  tools?: FunctionDeclaration[];
}

export interface AttachmentData {
  mimeType: string;
  data?: string; // Base64 string for images
  fileUri?: string; // URI for uploaded files (PDF, Video, etc.)
}

// Helper: Convert Gemini FunctionDeclaration to OpenAI Tool
const mapGeminiToolsToOpenAI = (tools: FunctionDeclaration[]) => {
    return tools.map(tool => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters // Gemini parameters schema is generally compatible with OpenAI JSON Schema
        }
    }));
};

// Helper: Safe JSON Parse for Tool Arguments
const safeParseJSON = (str: string) => {
    // 1. Try standard parse
    try {
        return JSON.parse(str);
    } catch (e) {}

    // 2. Cleanup markdown code blocks
    let cleaned = str.trim();
    // Remove wrapping ```json ... ``` or ``` ... ```
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
    }
    
    // Try parsing again after cleanup
    try { return JSON.parse(cleaned); } catch (e) {}

    // 3. Balanced Brace Parsing (Extract first valid object)
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace !== -1) {
        let balance = 0;
        let inString = false;
        let escaped = false;

        for (let i = firstBrace; i < cleaned.length; i++) {
            const char = cleaned[i];

            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                continue;
            }

            if (char === '"') {
                inString = !inString;
                continue;
            }

            if (!inString) {
                if (char === '{') {
                    balance++;
                } else if (char === '}') {
                    balance--;
                    if (balance === 0) {
                        const candidate = cleaned.substring(firstBrace, i + 1);
                        try { 
                            return JSON.parse(candidate); 
                        } catch (e) {}
                        break; 
                    }
                }
            }
        }
    }

    // 4. Fallback: Last Ditch
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
         try { return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1)); } catch (e) {}
    }

    console.error("JSON Parse Failed:", str);
    return { error: "JSON Parse Error", raw: str };
};

export const geminiService = {
  async uploadFile(file: File, mimeTypeInput?: string): Promise<{ uri: string, mimeType: string }> {
    const ai = getAI();
    const mimeType = mimeTypeInput || file.type || 'application/octet-stream';
    
    try {
      const response = await ai.files.upload({
        file: file,
        config: { mimeType }
      });

      const fileData = response.file;
      
      if (!fileData) {
        if ((response as any).uri) {
           return { uri: (response as any).uri, mimeType: (response as any).mimeType || mimeType };
        }
        throw new Error("File upload failed: No file data received from Gemini API.");
      }

      if (!fileData.uri) {
        throw new Error("File upload failed: No URI received.");
      }

      return { uri: fileData.uri, mimeType: fileData.mimeType };
    } catch (error: any) {
      console.error("Gemini File Upload Error:", error);
      throw error;
    }
  },

  // New method for auto-generating titles
  async generateTitle(modelName: string, userPrompt: string, aiResponse: string, apiSettings?: ApiSettings) {
      // Updated prompt to enforce Simplified Chinese
      const prompt = `Summarize the following conversation into a short, concise title in Simplified Chinese (max 4-8 characters). Output ONLY the title text. Do not use quotes or prefixes.
      User: ${userPrompt.slice(0, 500)}
      AI: ${aiResponse.slice(0, 500)}`;

      // Reuse generateChatResponse logic to handle provider switching
      // We create a dummy history for this one-shot task
      const history: Message[] = [{
          id: 'title-gen',
          role: 'user', 
          parts: [{ text: prompt }],
          timestamp: Date.now()
      }];

      try {
          // Use a fast model for title generation if possible, but respect provider settings
          const titleModel = apiSettings?.provider === 'openai' ? apiSettings.openai.model : 'gemini-3-flash-preview';

          const res = await this.generateChatResponse(
              titleModel, 
              history, 
              '', 
              "You are a helpful assistant. You strictly output titles in Simplified Chinese.", 
              { useThinking: false }, 
              [], 
              apiSettings
          );
          return res.text.trim().replace(/^["']|["']$/g, '');
      } catch (e) {
          console.error("Failed to generate title", e);
          return null;
      }
  },

  async generateChatResponse(
    modelName: string,
    history: Message[],
    userInput: string,
    systemInstruction?: string,
    configOptions: ChatConfig = {},
    attachments: AttachmentData[] = [],
    apiSettings?: ApiSettings
  ) {
    // --- OPENAI COMPATIBLE PROVIDER HANDLING ---
    if (apiSettings?.provider === 'openai') {
        if (!apiSettings.openai.baseUrl || !apiSettings.openai.apiKey || !apiSettings.openai.model) {
            throw new Error("Missing OpenAI Configuration. Please check settings.");
        }

        const messages: any[] = [];
        
        // 1. System Prompt
        if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
        }

        // 2. History Mapping
        history.forEach(msg => {
            const funcResponseParts = msg.parts.filter(p => (p as any).functionResponse);
            if (funcResponseParts.length > 0) {
                funcResponseParts.forEach(p => {
                    const resp = (p as any).functionResponse;
                    messages.push({
                        role: 'tool',
                        tool_call_id: resp.id || `call_${resp.name}_${msg.timestamp}`, 
                        content: JSON.stringify(resp.response)
                    });
                });
                return;
            }

            const role = msg.role === 'model' ? 'assistant' : 'user';
            const funcCallParts = msg.parts.filter(p => (p as any).functionCall);
            if (msg.role === 'model' && funcCallParts.length > 0) {
                messages.push({
                    role: 'assistant',
                    content: null,
                    tool_calls: funcCallParts.map((p, idx) => {
                        const fc = (p as any).functionCall;
                        return {
                            id: fc.id || `call_${fc.name}_${msg.timestamp}_${idx}`,
                            type: 'function',
                            function: {
                                name: fc.name,
                                arguments: JSON.stringify(fc.args)
                            }
                        };
                    })
                });
                return;
            }

            const parts: any[] = [];
            const textPart = msg.parts.find(p => p.text)?.text || '';
            if (textPart) parts.push({ type: 'text', text: textPart });
            
            msg.parts.forEach(p => {
                if (p.inlineData) {
                    parts.push({
                        type: 'image_url',
                        image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` }
                    });
                }
            });

            if (parts.length > 0) {
                if (parts.length === 1 && parts[0].type === 'text') {
                     messages.push({ role, content: parts[0].text });
                } else {
                     messages.push({ role, content: parts });
                }
            }
        });

        // 3. Current Input
        const currentParts: any[] = [];
        if (userInput) currentParts.push({ type: 'text', text: userInput });
        
        attachments.forEach(att => {
             if (att.data) {
                 currentParts.push({
                    type: 'image_url',
                    image_url: { url: `data:${att.mimeType};base64,${att.data}` }
                 });
             } else {
                 currentParts.push({ type: 'text', text: `[System: Attachment ${att.mimeType} skipped in OpenAI mode]` });
             }
        });

        if (currentParts.length > 0) {
            messages.push({ role: 'user', content: currentParts.length === 1 && currentParts[0].type === 'text' ? currentParts[0].text : currentParts });
        }

        const body: any = {
            model: modelName || apiSettings.openai.model,
            messages: messages,
            stream: false
        };

        if (configOptions.tools && configOptions.tools.length > 0) {
            body.tools = mapGeminiToolsToOpenAI(configOptions.tools);
            body.tool_choice = "auto"; 
        }

        try {
            const baseUrl = apiSettings.openai.baseUrl.replace(/\/$/, '');
            const url = baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiSettings.openai.apiKey}`
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`OpenAI API Error (${response.status}): ${err}`);
            }

            const data = await response.json();
            const choice = data.choices?.[0];
            const message = choice?.message;

            if (message.tool_calls && message.tool_calls.length > 0) {
                const functionCalls = message.tool_calls.map((tc: any) => ({
                    id: tc.id,
                    name: tc.function.name,
                    args: safeParseJSON(tc.function.arguments)
                }));

                return {
                    text: message.content || "",
                    groundingChunks: [],
                    audioData: null,
                    functionCalls: functionCalls
                };
            }

            return {
                text: message.content || "",
                groundingChunks: [],
                audioData: null,
                functionCalls: undefined
            };

        } catch (error: any) {
             throw new Error(error.message || "Failed to fetch from OpenAI compatible API");
        }
    }

    // --- STANDARD GEMINI SDK HANDLING ---
    const ai = getAI();
    
    const contents = history.map(m => {
        let role = m.role;
        const hasFuncResp = m.parts.some(p => (p as any).functionResponse);
        if (hasFuncResp) role = 'function' as any;

        return {
            role: role,
            parts: m.parts.map(p => {
                if (p.text) return { text: p.text };
                if (p.inlineData) return { inlineData: p.inlineData };
                if (p.fileData) return { fileData: { fileUri: p.fileData.fileUri, mimeType: p.fileData.mimeType } };
                if ((p as any).functionCall) return { functionCall: (p as any).functionCall };
                if ((p as any).functionResponse) return { functionResponse: (p as any).functionResponse };
                return { text: '' };
            })
        };
    });

    const newUserParts: any[] = [];
    if (attachments.length > 0) {
      attachments.forEach(att => {
        if (att.fileUri) newUserParts.push({ fileData: { fileUri: att.fileUri, mimeType: att.mimeType } });
        else if (att.data) newUserParts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
      });
    }
    if (userInput.trim()) newUserParts.push({ text: userInput });

    if (newUserParts.length > 0) {
        contents.push({ role: 'user', parts: newUserParts });
    }

    const config: any = { systemInstruction };

    if (configOptions.tools && configOptions.tools.length > 0) {
        config.tools = [{ functionDeclarations: configOptions.tools }];
    } else if (configOptions.useSearch) {
      config.tools = [{ googleSearch: {} }];
    } else if (configOptions.useMaps && configOptions.location) {
      config.tools = [{ googleMaps: {} }];
      config.toolConfig = { retrievalConfig: { latLng: configOptions.location } };
    }

    if (configOptions.useThinking && modelName.includes('pro')) {
      config.thinkingConfig = { thinkingBudget: 1024 };
    }

    if (configOptions.isTTS) {
      config.responseModalities = [Modality.AUDIO];
      config.speechConfig = { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } };
    }

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config
      });

      let audioData = null;
      const firstPart = response.candidates?.[0]?.content?.parts?.[0];
      if (firstPart?.inlineData?.mimeType?.startsWith('audio')) {
        audioData = firstPart.inlineData.data;
      }

      const functionCalls = response.candidates?.[0]?.content?.parts
        ?.filter((p: any) => p.functionCall)
        .map((p: any) => p.functionCall);

      return {
        text: response.text || (audioData ? '(Audio Response Generated)' : ''),
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
        audioData,
        functionCalls: functionCalls && functionCalls.length > 0 ? functionCalls : undefined
      };
    } catch (error: any) {
      let parsedMessage = error.message;
      try {
         if (error.message?.startsWith('{')) {
            const jsonError = JSON.parse(error.message);
            if (jsonError.error) parsedMessage = jsonError.error.message || error.message;
         }
      } catch (e) {}

      // --- AUTOMATIC FALLBACK FOR TOOL USE ERRORS ---
      // Gemini 3 Flash/Pro sometimes fails with "Function call is missing a thought signature" when tools are used.
      // This is often due to internal model routing constraints. We fallback to Gemini 2.5 Flash in this specific case.
      if (
          (parsedMessage.includes('Function call is missing a thought signature') || parsedMessage.includes('beyond::dependency::3')) &&
          modelName !== 'gemini-2.5-flash-preview-09-2025'
      ) {
          console.warn("Gemini Tool Error detected. Retrying with fallback model (gemini-2.5-flash). Error:", parsedMessage);
          return geminiService.generateChatResponse(
              'gemini-2.5-flash-preview-09-2025', 
              history, 
              userInput, 
              systemInstruction, 
              configOptions, 
              attachments, 
              apiSettings
          );
      }

      if (parsedMessage.includes('Region not supported')) throw new Error("Region not supported. Try VPN.");
      throw new Error(parsedMessage);
    }
  },

  async generateImage(prompt: string, aspectRatio: string = "1:1", size: string = "1K") {
    const ai = getAI();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize: size as any
          }
        }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("No image generated");
    } catch (error: any) {
      let parsedMessage = error.message;
      try {
         if (error.message?.startsWith('{')) {
            const jsonError = JSON.parse(error.message);
            if (jsonError.error) parsedMessage = jsonError.error.message || error.message;
         }
      } catch (e) { }

      if (parsedMessage.includes('Region not supported')) {
         throw new Error("Region not supported. Image generation is not available in your location.");
      }
      throw new Error(parsedMessage);
    }
  },

  async generateVideo(prompt: string, aspectRatio: '16:9' | '9:16' = '16:9') {
    const ai = getAI();
    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Video generation failed");
      
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error: any) {
      let parsedMessage = error.message;
      try {
         if (error.message?.startsWith('{')) {
            const jsonError = JSON.parse(error.message);
            if (jsonError.error) parsedMessage = jsonError.error.message || error.message;
         }
      } catch (e) { }
       
      if (parsedMessage.includes('Region not supported')) {
         throw new Error("Region not supported. Video generation is not available in your location.");
      }
      throw new Error(parsedMessage);
    }
  }
};