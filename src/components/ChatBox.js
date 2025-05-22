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
      // Add client-side timestamps to messages if they don't have them
      const messagesWithTimestamps = newMessages.map(msg => {
        if (!msg.timestamp) {
          return {
            ...msg,
            timestamp: msg.createdAt ? msg.createdAt.toMillis() : Date.now()
          };
        }
        return msg;
      });
      
      setMessages(messagesWithTimestamps);
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

  // Store pending whereabout questions to respond to after a delay
  const [pendingWhereaboutQuestions, setPendingWhereaboutQuestions] = useState([]);

  // Process pending whereabout questions after a delay
  useEffect(() => {
    // Process any pending whereabout questions
    if (pendingWhereaboutQuestions.length > 0) {
      const questionData = pendingWhereaboutQuestions[0];
      const timeSinceQuestion = Date.now() - questionData.timestamp;
      
      // If it's been more than 10 seconds and no one has answered
      if (timeSinceQuestion >= 10000) {
        // Check if someone else has answered in the meantime
        const hasBeenAnswered = messages.some(msg => {
          // Check if any message after the question mentions the target user
          return msg.timestamp > questionData.timestamp && 
                 msg.userId !== 'whereabouts-assistant' &&
                 msg.text.toLowerCase().includes(questionData.targetUser.toLowerCase());
        });

        if (!hasBeenAnswered) {
          // Send the delayed response
          const sendDelayedResponse = async () => {
            try {
              // Create a response message
              const responseData = {
                text: questionData.responseText,
                userId: 'whereabouts-assistant',
                userName: 'tung tung tung sahur',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              };
              
              // Add the response to Firestore
              await addMessage(responseData);
              console.log('Sent delayed whereabout response after 10 seconds');
            } catch (error) {
              console.error('Error sending delayed response:', error);
            }
          };
          
          sendDelayedResponse();
        } else {
          console.log('Question was already answered by someone else');
        }
        
        // Remove this question from the pending queue
        setPendingWhereaboutQuestions(prev => prev.slice(1));
      }
    }
    
    // Check pending questions every second
    const timer = setInterval(() => {
      if (pendingWhereaboutQuestions.length > 0) {
        setPendingWhereaboutQuestions([...pendingWhereaboutQuestions]); // Force re-render to check time
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [pendingWhereaboutQuestions, messages]);

  // Process a message for whereabouts information
  const processMessageForWhereabouts = async (messageData) => {
    try {
      // Add timestamp to the message data for tracking
      const messageWithTimestamp = {
        ...messageData,
        timestamp: Date.now()
      };
      
      // Detect if the message contains whereabouts information
      const whereaboutInfo = detectWhereaboutInMessage(messageWithTimestamp);
      
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
      const askingMatch = messageWithTimestamp.text.match(askingAboutPattern);
      
      if (askingMatch) {
        const targetUser = askingMatch[1].trim();
        console.log('User is asking about:', targetUser);
        
        // Don't respond if it's the Gemini assistant asking
        if (messageWithTimestamp.userId !== 'gemini-assistant' && messageWithTimestamp.userId !== 'user-query') {
          // Get the whereabouts information
          const whereaboutInfo = await getUserWhereabout(targetUser);
          
          if (whereaboutInfo) {
            // Create a response message
            const responseText = `Berdasarkan maklumat yang saya ada, ${whereaboutInfo.userName} menyebut bahawa dia ${whereaboutInfo.whereabout}.`;
            
            // Instead of responding immediately, add to pending questions queue
            setPendingWhereaboutQuestions(prev => [
              ...prev, 
              {
                targetUser,
                responseText,
                timestamp: Date.now(),
                questionerId: messageWithTimestamp.userId
              }
            ]);
            
            console.log('Added whereabout question to pending queue with 10 second delay');
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
      // Get the current user's display name
      const currentUser = auth.currentUser;
      const userId = currentUser ? currentUser.uid : 'anonymous';
      const userName = currentUser && currentUser.displayName ? 
                      currentUser.displayName : 
                      (currentUser && currentUser.email ? currentUser.email.split('@')[0] : 'Anonymous');
      
      // Create a message object
      const messageData = {
        text: newMessage,
        userId: userId,
        userName: userName,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      console.log('Sending message as:', userName);

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
