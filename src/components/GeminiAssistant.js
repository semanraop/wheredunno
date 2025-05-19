import React, { useState, useEffect } from 'react';
import { generateResponse } from '../gemini/services';
import './GeminiAssistant.css';

const GeminiAssistant = ({ onSendMessage, messages }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [modelReady, setModelReady] = useState(true);

  // Check if there were any recent errors to show model status
  useEffect(() => {
    if (error) {
      setModelReady(false);
      // Reset model ready state after 30 seconds
      const timer = setTimeout(() => setModelReady(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleAskGemini = async (e) => {
    e.preventDefault();
    if (query.trim() === '') return;

    setLoading(true);
    setError(null);
    
    try {
      // Add a user message to show what was asked
      onSendMessage({
        text: query,
        userId: 'user-query',
        userName: 'You (to AI)',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      // Format previous messages for context (limit to last 10 messages to avoid context issues)
      const recentMessages = messages.slice(-10);
      const chatHistory = recentMessages.map(msg => ({
        text: msg.text,
        isUser: msg.userId !== 'gemini-assistant'
      }));

      console.log('Sending query to Gemini:', query);
      
      // Get response from Gemini
      const response = await generateResponse(query, chatHistory);

      // Check if we got a valid response
      if (!response || typeof response !== 'string' || response.trim() === '') {
        throw new Error('Empty or invalid response received');
      }

      // Send the AI response to the chat
      onSendMessage({
        text: response,
        userId: 'gemini-assistant',
        userName: 'Gemini AI',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      // Reset retry count on success
      setRetryCount(0);
      // Clear the input
      setQuery('');
    } catch (err) {
      console.error('Error with Gemini:', err);
      
      // Increment retry count
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      // Provide more detailed error messages based on retry count
      if (newRetryCount === 1) {
        setError('Failed to get response from Gemini. Please try again with a different question.');
      } else if (newRetryCount === 2) {
        setError('Still having trouble with Gemini. Try a shorter, simpler question.');
      } else {
        setError('Gemini API is currently experiencing issues. Please try again later.');
      }
      
      // Send error message to chat if multiple retries
      if (newRetryCount >= 2) {
        onSendMessage({
          text: "I'm sorry, I'm having trouble connecting to the Gemini AI service right now. Please try again later.",
          userId: 'gemini-assistant',
          userName: 'Gemini AI',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gemini-assistant">
      <div className="gemini-header">
        <h3>Ask Gemini AI</h3>
        <div className={`model-status ${modelReady ? 'ready' : 'error'}`}>
          {modelReady ? 'Ready' : 'Service Issues'}
        </div>
      </div>
      <form onSubmit={handleAskGemini} className="gemini-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask Gemini a question..."
          className="gemini-input"
          disabled={loading}
        />
        <button 
          type="submit" 
          className="gemini-button"
          disabled={loading}
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>
      {error && <p className="gemini-error">{error}</p>}
      <div className="gemini-tips">
        <p>Try asking:</p>
        <ul>
          <li>Summarize this conversation</li>
          <li>What was discussed about [topic]?</li>
          <li>Help me draft a response about...</li>
        </ul>
        {retryCount > 0 && (
          <div className="gemini-troubleshooting">
            <p><strong>Troubleshooting tips:</strong></p>
            <ul>
              <li>Try shorter, more specific questions</li>
              <li>Avoid complex or multi-part questions</li>
              <li>Wait a few minutes and try again</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeminiAssistant;
