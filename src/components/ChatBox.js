import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import GeminiAssistant from './GeminiAssistant';
import './ChatBox.css';
import { addMessage, subscribeToMessages } from '../firebase/services';
import { auth } from '../firebase/config';
import { detectWhereaboutInMessage, updateUserWhereabout, getUserWhereabout } from '../services/userTracker';

const ChatBox = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGemini, setShowGemini] = useState(false);
  const messagesEndRef = useRef(null);

  // Subscribe to messages from Firestore
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToMessages((newMessages) => {
      setMessages(newMessages);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Process a message for whereabouts information
  const processMessageForWhereabouts = async (messageData) => {
    try {
      // Detect if the message contains whereabouts information
      const whereaboutInfo = detectWhereaboutInMessage(messageData);
      
      if (whereaboutInfo) {
        console.log('Detected whereabout info:', whereaboutInfo);
        
        // Store the whereabout information in Firestore
        await updateUserWhereabout(
          whereaboutInfo.userId,
          whereaboutInfo.userName,
          whereaboutInfo.whereabout,
          whereaboutInfo.rawMessage
        );
      }
      
      // Check if the message is asking about someone's whereabouts
      const askingAboutPattern = /(?:where is|where's|dimana|di mana|mana|kemana|ke mana) ([a-z0-9\s]+)(?:\?|)/i;
      const askingMatch = messageData.text.match(askingAboutPattern);
      
      if (askingMatch) {
        const targetUser = askingMatch[1].trim();
        console.log('User is asking about:', targetUser);
        
        // Don't respond if it's the Gemini assistant asking
        if (messageData.userId !== 'gemini-assistant' && messageData.userId !== 'user-query') {
          // Get the whereabouts information
          const whereaboutInfo = await getUserWhereabout(targetUser);
          
          if (whereaboutInfo) {
            // Create a response message
            const responseText = `Berdasarkan maklumat yang saya ada, ${whereaboutInfo.userName} menyebut bahawa dia ${whereaboutInfo.whereabout}.`;
            
            // Add the response to the chat
            const responseData = {
              text: responseText,
              userId: 'whereabouts-assistant',
              userName: 'tung tung tung sahur',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            
            // Add the response to Firestore
            await addMessage(responseData);
          }
        }
      }
    } catch (error) {
      console.error('Error processing whereabouts:', error);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (newMessage.trim() === '') return;

    try {
      // Create a message object
      const messageData = {
        text: newMessage,
        // In a real app, you would get the user ID from authentication
        userId: auth.currentUser ? auth.currentUser.uid : 'anonymous',
        userName: auth.currentUser ? auth.currentUser.displayName || 'User' : 'Anonymous',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Add message to Firestore
      await addMessage(messageData);
      
      // Process the message for whereabouts information
      await processMessageForWhereabouts(messageData);
      
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    }
  };

  // Function to handle sending messages from Gemini
  const handleGeminiMessage = async (messageData) => {
    try {
      // Add message to Firestore
      await addMessage(messageData);
    } catch (err) {
      console.error('Error sending Gemini message:', err);
      setError('Failed to send Gemini response. Please try again.');
    }
  };

  // Toggle Gemini assistant visibility
  const toggleGemini = () => {
    setShowGemini(!showGemini);
  };

  return (
    <div className="chat-box">
      <div className="chat-header">
        <h2>Firebase Chat with Gemini</h2>
        <button 
          className="gemini-toggle" 
          onClick={toggleGemini}
          title={showGemini ? "Hide Gemini Assistant" : "Show Gemini Assistant"}
        >
          {showGemini ? "Hide AI" : "Ask AI"}
        </button>
      </div>
      
      {showGemini && (
        <GeminiAssistant 
          onSendMessage={handleGeminiMessage} 
          messages={messages} 
        />
      )}
      
      <div className="messages-container">
        {loading ? (
          <div className="loading-messages">Loading messages...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : messages.length === 0 ? (
          <div className="no-messages">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((msg) => (
            <ChatMessage 
              key={msg.id} 
              message={msg} 
              isUser={msg.userId === (auth.currentUser ? auth.currentUser.uid : 'anonymous')}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="message-input-container" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="message-input"
          disabled={loading}
        />
        <button type="submit" className="send-button" disabled={loading}>Send</button>
      </form>
    </div>
  );
};

export default ChatBox;
