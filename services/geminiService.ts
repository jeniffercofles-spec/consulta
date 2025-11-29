import { GoogleGenAI } from "@google/genai";
import { SCHOOL_CONTEXT } from "../knowledgeBase";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const sendMessageToGemini = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  newMessage: string
) => {
  try {
    const model = 'gemini-3-pro-preview';
    
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: SCHOOL_CONTEXT,
      },
      history: history,
    });

    const result = await chat.sendMessage({
      message: newMessage,
    });

    return result.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};