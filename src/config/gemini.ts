import {GoogleGenAI} from '@google/genai';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

/* async function main() {
  const response = await ai.interactions.create({
    model: 'gemini-3.5-flash',
    input: 'Why is the sky blue?',
  });
  console.log(response.output_text);
} */