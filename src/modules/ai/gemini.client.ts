import { env } from '../../config/env';
import { AppError } from '../../common/errors/app.error';

interface GenerateStructuredOptions {
  model: string;
  systemInstruction: string;
  prompt: string;
  schema: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
}

interface GeminiCandidatePart {
  text?: string;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiCandidatePart[];
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: unknown[];
  };
  error?: {
    message?: string;
  };
}

export class GeminiClient {
  async generateStructured<T>(options: GenerateStructuredOptions): Promise<T> {
    if (!env.ai.enabled) {
      throw new AppError(503, 'AI_DISABLED', 'AI features are disabled');
    }

    if (!env.ai.geminiApiKey) {
      throw new AppError(500, 'AI_CONFIG_INVALID', 'Gemini API key is not configured');
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), env.ai.timeoutMs);

    try {
      const response = await fetch(this.buildUrl(options.model), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.ai.geminiApiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: options.systemInstruction }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: options.prompt }],
            },
          ],
          generationConfig: {
            temperature: options.temperature ?? 0.2,
            maxOutputTokens: options.maxOutputTokens ?? 2048,
            responseMimeType: 'application/json',
            responseJsonSchema: options.schema,
          },
        }),
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => null)) as GeminiGenerateResponse | null;

      if (!response.ok) {
        throw new AppError(502, 'AI_PROVIDER_ERROR', payload?.error?.message ?? 'Gemini request failed');
      }

      const rawText = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();

      if (!rawText) {
        throw new AppError(
          502,
          'AI_EMPTY_RESPONSE',
          payload?.promptFeedback?.blockReason
            ? `Gemini blocked the prompt: ${payload.promptFeedback.blockReason}`
            : 'Gemini returned an empty response',
        );
      }

      return JSON.parse(this.cleanJson(rawText)) as T;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new AppError(504, 'AI_TIMEOUT', 'Gemini request timed out');
      }

      throw new AppError(502, 'AI_PROVIDER_ERROR', 'Failed to reach Gemini API');
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  private buildUrl(model: string): string {
    const baseUrl = env.ai.geminiBaseUrl.replace(/\/+$/, '');

    return `${baseUrl}/models/${model}:generateContent`;
  }

  private cleanJson(value: string): string {
    return value.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
  }
}
