
import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion } from "../types";

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.warn("Gemini API Key is missing. AI features will not work. Please add API_KEY to your .env file.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'MISSING_KEY' });

export const summarizeNotes = async (content: string): Promise<string> => {
  if (!apiKey) return "API Key missing. Please configure your .env file.";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Please provide a concise, bulleted summary of the following educational notes:\n\n${content}`,
    });
    return response.text || "Summary unavailable.";
  } catch (error) {
    console.error("Error summarizing notes:", error);
    return "Error generating summary. Please check your network and API key.";
  }
};

export const generateQuizFromNotes = async (content: string): Promise<QuizQuestion[]> => {
  if (!apiKey) {
    console.error("Cannot generate quiz: API Key missing.");
    return [];
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Generate a 5-question multiple choice quiz based on these notes:\n\n${content}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Array of 4 possible answers"
              },
              correctAnswer: { 
                type: Type.INTEGER, 
                description: "Zero-based index of the correct answer in the options array"
              }
            },
            required: ["question", "options", "correctAnswer"]
          }
        }
      }
    });

    const quizData = JSON.parse(response.text || "[]");
    return quizData as QuizQuestion[];
  } catch (error) {
    console.error("Error generating quiz:", error);
    return [];
  }
};

export const askTutor = async (question: string, context: string): Promise<string> => {
  if (!apiKey) return "AI tutor is unavailable because the API key is missing.";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are a helpful academic tutor. Answer the student's question based on the following context if possible.\nContext: ${context}\n\nQuestion: ${question}`,
    });
    return response.text || "I'm sorry, I couldn't find an answer to that.";
  } catch (error) {
    console.error("Error asking tutor:", error);
    return "The AI tutor is currently offline.";
  }
};
