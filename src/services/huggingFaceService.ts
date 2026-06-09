/**
 * Hugging Face Vision Service
 * Uses LLaVA 1.6 for food recognition
 */

const HF_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY;
const HF_MODEL = 'llava-hf/llava-v1.6-mistral-7b-hf'; // Free vision model

export interface HFVisionResult {
  label: string;
  confidence: number;
  rawResponse: string;
}

/**
 * Identify food using Hugging Face LLaVA model
 */
export async function identifyFoodWithHF(
  imageBase64: string,
  restaurantName?: string,
  menuItems?: string[]
): Promise<HFVisionResult | null> {
  
  if (!HF_API_KEY || HF_API_KEY === 'your_huggingface_key_here') {
    console.warn('[HF] API key not configured');
    return null;
  }

  try {
    // Build context-aware prompt
    let prompt = 'What food dish is shown in this image? Reply with ONLY the dish name.';
    
    if (restaurantName && menuItems && menuItems.length > 0) {
      prompt = `You are at ${restaurantName} restaurant. Their menu includes: ${menuItems.join(', ')}.\n\nWhich dish from this menu is shown in the image? Reply with ONLY the exact dish name from the menu.`;
    }

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {
            image: imageBase64.includes('base64,') 
              ? imageBase64.split('base64,')[1] 
              : imageBase64,
            question: prompt
          },
          parameters: {
            max_new_tokens: 50,
            temperature: 0.1
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[HF] API Error:', response.status, errorText);
      
      // Handle model loading (Hugging Face cold start)
      if (response.status === 503) {
        console.log('[HF] Model is loading, please retry in 20 seconds');
        return null;
      }
      
      return null;
    }

    const data = await response.json();
    console.log('[HF] Raw response:', data);

    // Parse response
    let label = '';
    if (Array.isArray(data) && data[0]?.generated_text) {
      label = data[0].generated_text;
    } else if (data.generated_text) {
      label = data.generated_text;
    } else if (typeof data === 'string') {
      label = data;
    }

    // Clean the label
    label = cleanAILabel(label);

    if (!label || label.length < 2) {
      console.warn('[HF] No valid label extracted');
      return null;
    }

    console.log('[HF] Identified:', label);

    return {
      label,
      confidence: 0.85, // HF models are generally reliable
      rawResponse: JSON.stringify(data)
    };

  } catch (error: any) {
    console.error('[HF] Error:', error.message);
    return null;
  }
}

/**
 * Clean AI response to extract just the dish name
 */
function cleanAILabel(label: string): string {
  if (!label) return '';

  // Remove common AI prefixes
  label = label.replace(/^(the dish is|this is|i see|it appears to be|this looks like|the image shows)\s+/i, '');
  
  // Remove quotes and punctuation
  label = label.trim().replace(/^["']|["']$/g, '').replace(/[.!?]$/, '');
  
  // Take first sentence if multiple
  if (label.includes('.')) {
    label = label.split('.')[0];
  }
  
  // Take first part before comma
  if (label.length > 50 && label.includes(',')) {
    label = label.split(',')[0];
  }

  return label.trim();
}

/**
 * Test if Hugging Face API is working
 */
export async function testHuggingFaceAPI(): Promise<boolean> {
  if (!HF_API_KEY || HF_API_KEY === 'your_huggingface_key_here') {
    return false;
  }

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
        },
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}
