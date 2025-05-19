import React, { useState, useEffect } from 'react';
import './App.css';
import ChatBox from './components/ChatBox';
import Auth from './components/Auth';
import { auth } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <div className="App">
      <h1>Firebase Chat App</h1>
      <Auth currentUser={user} />
      {loading ? (
        <div className="loading-container">Loading...</div>
      ) : (
        <ChatBox />
      )}
    </div>
  );
}

export default App;
