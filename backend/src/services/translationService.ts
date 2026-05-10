import Translation from '../models/Translation';
import axios from 'axios';
import { getIO } from '../utils/socket';

export class TranslationService {
  /**
   * Gets a translation from DB, or translates it on-the-fly if missing
   */
  static async getTranslation(key: string, language: string, englishValue: string): Promise<string> {
    if (language === 'english') return englishValue;

    try {
      // 1. Check if translation already exists in DB
      const existing = await Translation.findOne({ key, language });
      if (existing) {
        return existing.value;
      }

      // 2. If not found, translate using official Google Cloud Translation API
      console.log(`[TranslationService] Translating "${key}" to ${language}...`);
      
      const langMap: Record<string, string> = {
        hindi: 'hi',
        telugu: 'te',
        tamil: 'ta',
        kannada: 'kn',
        malayalam: 'ml'
      };

      const targetLang = langMap[language.toLowerCase()] || 'en';
      let translatedText = '';

      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
      
      if (googleApiKey) {
        try {
          console.log(`[TranslationService] Using Google Cloud Translation API for ${language}...`);
          const response = await axios.post(
            `https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`,
            {
              q: englishValue,
              target: targetLang,
              format: 'text'
            },
            {
              headers: {
                'Referer': 'https://dine-in-go.vercel.app'
              }
            }
          );

          if (response.data?.data?.translations?.[0]?.translatedText) {
            translatedText = response.data.data.translations[0].translatedText;
            console.log(`[TranslationService] Google Cloud success: "${translatedText}"`);
          }
        } catch (error: any) {
          console.error(`[TranslationService] Google Cloud Translation failed:`, error.response?.data || error.message);
        }
      }

      // Final fallback if everything failed
      if (!translatedText) {
        translatedText = englishValue;
      }

      // 3. Save to DB for future use
      if (translatedText) {
        // Clean the response:
        // 1. Remove explicit <think> tags
        translatedText = translatedText.replace(/<think>[\s\S]*?<\/think>/gi, '');
        
        // 2. Remove markdown code blocks
        translatedText = translatedText.replace(/```[\s\S]*?```/g, '');
        
        // 3. Remove conversational prefixes if AI was chatty (e.g., "Sure, here is the translation: ...")
        const chattyPatterns = [
          /^.*?translation is:?\s*/i,
          /^.*?translated text is:?\s*/i,
          /^Sure, here is.*?:?\s*/i,
          /^Here is the translation.*?:?\s*/i
        ];
        
        for (const pattern of chattyPatterns) {
          translatedText = translatedText.replace(pattern, '');
        }

        // 4. If there are multiple lines, take the one that looks most like a translation
        const lines = translatedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 1) {
          translatedText = lines[lines.length - 1];
        } else {
          translatedText = lines[0] || '';
        }

        // 5. Final sanitization
        translatedText = translatedText.replace(/["']/g, '').trim(); 
        
        if (translatedText) {
          await Translation.findOneAndUpdate(
            { key, language },
            { value: translatedText, isAutomatic: true },
            { upsert: true }
          );

          // Emit socket event for real-time update
          try {
            const io = getIO();
            if (io) {
              io.emit('translation_updated', {
                key,
                language,
                value: translatedText
              });
            }
          } catch (ioError) {
            // Skip socket emission if io is not initialized
          }
        }
      }

      return translatedText || englishValue;
    } catch (error) {
      console.error(`[TranslationService] Error translating "${key}":`, error);
      return englishValue;
    }
  }

  /**
   * Bulk get translations for a specific language
   */
  static async getAllTranslations(language: string): Promise<Record<string, string>> {
    const translations = await Translation.find({ language });
    const result: Record<string, string> = {};
    translations.forEach(t => {
      result[t.key] = t.value;
    });
    return result;
  }

  /**
   * Seeds translations from a JSON object
   */
  static async seedTranslations(translationsMap: Record<string, any>) {
    try {
      const io = getIO();
      for (const [lang, keys] of Object.entries(translationsMap)) {
        for (const [key, value] of Object.entries(keys as any)) {
          await Translation.findOneAndUpdate(
            { key, language: lang },
            { value: value as string, isAutomatic: false },
            { upsert: true }
          );
          
          if (io) {
            io.emit('translation_updated', {
              key,
              language: lang,
              value: value as string
            });
          }
        }
      }
    } catch (error) {
      // Socket not initialized, just continue with DB operations
      for (const [lang, keys] of Object.entries(translationsMap)) {
        for (const [key, value] of Object.entries(keys as any)) {
          await Translation.findOneAndUpdate(
            { key, language: lang },
            { value: value as string, isAutomatic: false },
            { upsert: true }
          );
        }
      }
    }
  }

  /**
   * Updates a single translation manually
   */
  static async updateTranslation(key: string, language: string, value: string) {
    const updated = await Translation.findOneAndUpdate(
      { key, language },
      { value, isAutomatic: false },
      { upsert: true, new: true }
    );

    try {
      const io = getIO();
      if (io) {
        io.emit('translation_updated', {
          key,
          language,
          value
        });
      }
    } catch (error) {
      // Socket not initialized
    }

    return updated;
  }
}
