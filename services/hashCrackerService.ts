import { md5 } from '../utils.ts';
import type { GenerateContentResponse } from '../types.ts';

interface CrackOptions {
  onProgress: (progress: { checked: number; total: number }) => void;
  signal: AbortSignal;
}

const BATCH_SIZE = 5000;
const DELAY_BETWEEN_BATCHES = 0; // ms, 0 allows for maximum speed while still yielding to the event loop

export const crackMD5 = (
  targetHash: string,
  wordlist: string,
  { onProgress, signal }: CrackOptions
): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    // Normalize line endings and filter out empty lines
    const words = wordlist.split(/\r?\n/).filter(w => w.length > 0);
    const total = words.length;
    let checked = 0;
    let currentIndex = 0;

    const processBatch = () => {
      // Check for cancellation before starting a batch
      if (signal.aborted) {
        // The DOMException is the standard way to signal an abort
        return reject(new DOMException('Aborted by user.', 'AbortError'));
      }

      const batchEnd = Math.min(currentIndex + BATCH_SIZE, total);
      for (let i = currentIndex; i < batchEnd; i++) {
        const word = words[i].trim(); // Trim whitespace from each word
        if (md5(word) === targetHash) {
          onProgress({ checked: i + 1, total });
          resolve(word); // Password found!
          return;
        }
      }

      checked = batchEnd;
      currentIndex = batchEnd;
      onProgress({ checked, total });

      if (currentIndex < total) {
        // Schedule the next batch to run asynchronously
        setTimeout(processBatch, DELAY_BETWEEN_BATCHES);
      } else {
        resolve(null); // Reached the end of the list, password not found
      }
    };

    // Start the first batch
    processBatch();
  });
};

export const calculateBruteForceCombinations = (charset: string, maxLength: number): number => {
    if (!charset || maxLength <= 0) return 0;
    let total = 0;
    for (let i = 1; i <= maxLength; i++) {
        total += Math.pow(charset.length, i);
    }
    return total;
};

export const bruteForceMD5 = (
  targetHash: string,
  charset: string,
  maxLength: number,
  { onProgress, signal }: CrackOptions
): Promise<string | null> => {
    return new Promise((resolve, reject) => {
        const total = calculateBruteForceCombinations(charset, maxLength);
        let checked = 0;

        // Recursive generator function to try combinations
        function* generate(current: string, depth: number): Generator<string> {
            if (depth > maxLength) return;
            if(depth > 0) yield current;
            for (const char of charset) {
                yield* generate(current + char, depth + 1);
            }
        }
        
        const iterator = generate('', 0);
        
        const processBatch = () => {
            if (signal.aborted) {
                return reject(new DOMException('Aborted by user.', 'AbortError'));
            }

            for (let i = 0; i < BATCH_SIZE; i++) {
                const next = iterator.next();
                if (next.done) {
                    onProgress({ checked: total, total });
                    resolve(null); // All combinations checked
                    return;
                }
                
                const word = next.value;
                checked++;

                if (md5(word) === targetHash) {
                    onProgress({ checked, total });
                    resolve(word); // Found
                    return;
                }
            }
            
            onProgress({ checked, total });
            setTimeout(processBatch, DELAY_BETWEEN_BATCHES);
        };
        
        processBatch();
    });
};

export const getAIPasswordGuesses = async (targetHash: string, { signal }: { signal: AbortSignal }): Promise<string[]> => {
    if (!process.env.API_KEY) {
        throw new Error("API key is not configured. Cannot use AI attack mode.");
    }
    
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `You are a cybersecurity expert specializing in password cracking. I have an MD5 hash, and I need you to generate a list of the 100 most likely original passwords for it. Consider common passwords, dictionary words, names, dates, and typical user patterns.
Return your answer *only* as a valid JSON array of strings. Example: ["password", "123456", "admin", "qwerty"]

MD5 Hash: ${targetHash}`;

    const generateContentPromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.7,
            maxOutputTokens: 2048, // Generous tokens for a list
            responseMimeType: "application/json",
        }
    });

    const abortPromise = new Promise((_, reject) => {
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

        const parsedData = JSON.parse(jsonStr);
        if (!Array.isArray(parsedData) || !parsedData.every(item => typeof item === 'string')) {
            throw new Error('AI did not return a valid JSON array of strings.');
        }
        return parsedData;

    } catch (e: any) {
        if (e.name === 'AbortError') {
            throw e; // Re-throw abort error
        }
        console.error("AI password guess generation failed:", e);
        throw new Error(`AI attack failed: ${e.message}`);
    }
};