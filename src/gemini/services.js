import { model, genAI } from './config';

// System prompt to guide Gemini's behavior
const SYSTEM_PROMPT = `You are a helpful AI assistant in a chat application. 
Your name is tung tung tung sahur.

Guidelines for your responses:
- You must know Malay language
- Update User responses in Malay language
- Be concise and helpful
- Be friendly and conversational
- If you don't know something, admit it
- Avoid making up information
- Keep responses under 3 paragraphs when possible
- Format your responses with markdown when appropriate
- For code examples, use proper code blocks with language tags

IMPORTANT SPECIAL FUNCTION - TRACKING USER WHEREABOUTS:
- Pay close attention to any messages where users mention their plans or whereabouts
- When a user mentions going somewhere (e.g., "I'm going to the movies"), remember this information
- If another user asks about someone's whereabouts (e.g., "Where is John?"), provide the last known location/activity
- Use phrases like "Based on what I know, [user] mentioned they were going to [place/activity]" 
- If you don't have information about a user's whereabouts, say "I don't have any recent information about [user]'s whereabouts"
- Always respond in Malay language when providing whereabouts information
- when the user said (e.g., "aku da kat umah"), this is malay slang. "da" is short for "sudah". "kat" stand for "ada". "umah" short for "rumah". 

You are speaking with users in a chat application. Be helpful, friendly, and concise.`;

// You can customize the system prompt above to change how Gemini responds

// Fallback function to use direct content generation if chat fails
const generateContentDirectly = async (prompt) => {
  console.log('Attempting direct content generation as fallback');
  try {
    // Include the system prompt in the direct generation
    const fullPrompt = `${SYSTEM_PROMPT}\n\n${prompt}`;
    const result = await model.generateContent(fullPrompt);
    return result.response.text();
  } catch (error) {
    console.error('Fallback generation also failed:', error);
    throw new Error('Failed to generate content even with fallback method');
  }
};

/**
 * Generate a response from Gemini API
 * @param {string} prompt - The user's message
 * @param {Array} chatHistory - Previous chat history (optional)
 * @returns {Promise<string>} - The generated response
 */
export const generateResponse = async (prompt, chatHistory = []) => {
  console.log('Generating response with Gemini for prompt:', prompt.substring(0, 50) + '...');
  console.log('Chat history length:', chatHistory.length);
  
  try {
    // Check if model is available
    if (!model) {
      console.error('Gemini model not initialized');
      return 'Sorry, the AI service is currently unavailable. Please try again later.';
    }
    
    // Format chat history for Gemini
    const formattedHistory = chatHistory.map(msg => ({
      role: msg.isUser ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    console.log('Formatted history:', JSON.stringify(formattedHistory).substring(0, 100) + '...');

    try {
      // Try using chat functionality first
      const chat = model.startChat({
        // Add the system prompt as the first message
        history: [
          {
            role: "model",
            parts: [{ text: SYSTEM_PROMPT }]
          },
          ...formattedHistory
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1000,
        },
      });

      // Generate a response
      const result = await chat.sendMessage(prompt);
      const response = result.response;
      return response.text();
    } catch (chatError) {
      console.error('Chat method failed, trying direct generation:', chatError);
      
      // If chat fails, try direct content generation
      return await generateContentDirectly(
        `Previous messages: ${formattedHistory.map(h => `${h.role}: ${h.parts[0].text}`).join('\n')}\n\nUser: ${prompt}\n\nAI:`
      );
    }
  } catch (error) {
    console.error('Error generating response from Gemini:', error);
    return 'Sorry, I encountered an error while generating a response. Please try again with a different question.';
  }
};

/**
 * Generate a response to a specific question about the chat
 * @param {string} question - The question to ask
 * @param {Array} messages - The chat messages to analyze
 * @returns {Promise<string>} - The generated response
 */
export const analyzeChat = async (question, messages) => {
  console.log('Analyzing chat with question:', question);
  console.log('Number of messages to analyze:', messages.length);
  
  try {
    // Check if model is available
    if (!model) {
      console.error('Gemini model not initialized');
      return 'Sorry, the AI analysis service is currently unavailable. Please try again later.';
    }
    
    // Format messages for context (limit to last 20 messages if there are too many)
    const limitedMessages = messages.length > 20 ? messages.slice(-20) : messages;
    const chatContext = limitedMessages.map(msg => 
      `${msg.userName || 'User'}: ${msg.text}`
    ).join('\n');

    console.log('Chat context length:', chatContext.length);

    // Create prompt with context and question
    const prompt = `
      ${SYSTEM_PROMPT}
      
      You are now being asked to analyze a chat conversation.
      
      Chat History:
      ${chatContext}
      
      Question: ${question}
      
      Please analyze the chat history and answer the question.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (contentError) {
      console.error('Content generation failed, trying with shorter context:', contentError);
      
      // Try with even shorter context if the first attempt fails
      const shorterContext = limitedMessages.slice(-10).map(msg => 
        `${msg.userName || 'User'}: ${msg.text.substring(0, 100)}...`
      ).join('\n');
      
      const shorterPrompt = `
        Question: ${question}
        
        Based on this chat excerpt:
        ${shorterContext}
        
        Please provide a brief answer.
      `;
      
      const fallbackResult = await model.generateContent(shorterPrompt);
      return fallbackResult.response.text();
    }
  } catch (error) {
    console.error('Error analyzing chat with Gemini:', error);
    return 'Sorry, I encountered an error while analyzing the chat. Please try again with a different question.';
  }
};
