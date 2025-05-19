import React from 'react';
import './ChatMessage.css';

const ChatMessage = ({ message, isUser }) => {
  // Format timestamp if it's a Firestore timestamp
  const formatTime = () => {
    if (message.createdAt && message.createdAt.toDate) {
      // It's a Firestore timestamp
      return message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // It's already a formatted string or doesn't exist
    return message.time || '';
  };

  // Check if this is a Gemini AI message
  const isGemini = message.userId === 'gemini-assistant';

  return (
    <div className={`message-container ${isUser ? 'user' : isGemini ? 'gemini' : 'other'}`}>
      {!isUser && (
        <div className={`message-user ${isGemini ? 'gemini-user' : ''}`}>
          {message.userName || 'User'}
          {isGemini && <span className="gemini-badge">AI</span>}
        </div>
      )}
      <div className={`message ${isUser ? 'user-message' : isGemini ? 'gemini-message' : 'other-message'}`}>
        <p>{message.text}</p>
        <span className="message-time">{formatTime()}</span>
      </div>
    </div>
  );
};

export default ChatMessage;
