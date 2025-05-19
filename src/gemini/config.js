import { GoogleGenerativeAI } from "@google/generative-ai";

// Get API key from environment variables
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(API_KEY);

// Get the model - using the latest free model (gemini-1.5-flash)
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 1000,
  }
});

export { genAI, model };
