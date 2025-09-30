import type { AIForensicResult, GenerateContentResponse } from '../types.ts';

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = (reader.result as string).split(',')[1];
            resolve(result);
        };
        reader.onerror = error => reject(error);
    });
}

export const analyzeImageWithAI = async (
    imageFile: File,
    { signal }: { signal: AbortSignal }
): Promise<AIForensicResult> => {
     if (!process.env.API_KEY) {
        throw new Error("API key is not configured. Cannot use AI analysis mode.");
    }
    
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const base64Image = await fileToBase64(imageFile);
    
    const prompt = `You are a world-class digital forensics expert specializing in steganography. Analyze the provided image for any signs of hidden data. Look for visual anomalies such as unnatural noise, suspicious patterns, unusual color distributions, or artifacts that are inconsistent with a normal photograph or graphic.
    
Based on your analysis, provide a confidence score from 0 (no signs) to 10 (clear signs) that the image contains hidden steganographic data. Also, provide your reasoning and list any specific visual anomalies you detected.

Return your answer ONLY as a valid JSON object with the following structure:
{
  "confidence": number,
  "reasoning": "Your detailed reasoning here.",
  "visual_anomalies": ["list", "of", "detected", "anomalies"]
}
`;

    const imagePart = {
        inlineData: {
            mimeType: imageFile.type,
            data: base64Image,
        },
    };

    const textPart = {
        text: prompt
    };

    const generateContentPromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            temperature: 0.2,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
        }
    });
    
    const abortPromise = new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted by user.', 'AbortError')));
    });

    try {
        const response = await Promise.race([generateContentPromise, abortPromise]) as GenerateContentResponse;
        
        if (signal.aborted) {
            throw new DOMException('Aborted by user.', 'AbortError');
        }

        let jsonStr = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }
        
        const parsedData = JSON.parse(jsonStr) as AIForensicResult;

        // Basic validation
        if (typeof parsedData.confidence !== 'number' || typeof parsedData.reasoning !== 'string' || !Array.isArray(parsedData.visual_anomalies)) {
             throw new Error('AI returned data in an invalid JSON format.');
        }

        return parsedData;

    } catch (e: any) {
        if (e.name === 'AbortError') {
            throw e; // Re-throw abort error
        }
        console.error("AI forensic analysis failed:", e);
        throw new Error(`AI analysis failed: ${e.message}`);
    }
};