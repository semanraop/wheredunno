import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import './Auth.css';

// Helper function to get user-friendly error messages
const getErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    case 'auth/operation-not-allowed':
      return 'Operation not allowed.';
    case 'auth/configuration-not-found':
      return 'Authentication configuration error. Please try again in a moment.';
    default:
      return 'An error occurred. Please try again.';
  }
};

const Auth = ({ currentUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // Check if Firebase Auth is ready
  useEffect(() => {
    if (auth) {
      setAuthReady(true);
    } else {
      console.log('Waiting for Firebase Auth to initialize...');
      const checkAuth = setInterval(() => {
        if (auth) {
          setAuthReady(true);
          clearInterval(checkAuth);
        }
      }, 500);
      
      return () => clearInterval(checkAuth);
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!authReady) {
      setError('Authentication service is not ready yet. Please try again in a moment.');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting authentication with:', { email, isLogin });
      
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // For registration, create the user account first
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Set the display name for the user
        const displayName = username.trim() || email.split('@')[0];
        await updateProfile(user, {
          displayName: displayName
        });
        
        // Store additional user data in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: displayName,
          createdAt: new Date()
        });
        
        console.log('User profile updated with username:', displayName);
      }
      setEmail('');
      setPassword('');
      setUsername('');
    } catch (err) {
      console.error('Authentication error:', err);
      setError(getErrorMessage(err.code) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setError('');
    setLoading(true);
    
    if (!authReady) {
      setError('Authentication service is not ready yet. Please try again in a moment.');
      setLoading(false);
      return;
    }
    
    try {
      console.log('Attempting anonymous sign-in');
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      
      // Generate a random guest name if username is provided, otherwise use Guest + random number
      const guestName = username.trim() || `Guest${Math.floor(Math.random() * 10000)}`;
      
      // Set the display name for anonymous user
      await updateProfile(user, {
        displayName: guestName
      });
      
      // Store anonymous user data in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: guestName,
        isAnonymous: true,
        createdAt: new Date()
      });
      
      console.log('Anonymous user profile created with name:', guestName);
      setUsername('');
    } catch (err) {
      console.error('Anonymous sign-in error:', err);
      setError(getErrorMessage(err.code) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!authReady) return;
    
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  if (currentUser) {
    return (
      <div className="auth-container signed-in">
        <p>Signed in as {currentUser.displayName || currentUser.email || 'Anonymous User'}</p>
        <button onClick={handleSignOut} className="auth-button sign-out">Sign Out</button>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <h3>{isLogin ? 'Sign In' : 'Sign Up'}</h3>
      <form onSubmit={handleAuth} className="auth-form">
        {!isLogin && (
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username (optional)"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        {error && <p className="auth-error">{error}</p>}
        <button 
          type="submit" 
          className="auth-button"
          disabled={loading}
        >
          {isLogin ? 'Sign In' : 'Sign Up'}
        </button>
      </form>
      <button 
        onClick={handleAnonymousSignIn} 
        className="auth-button anonymous"
        disabled={loading}
      >
        Continue as Guest
      </button>
      <p className="auth-toggle">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <span onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Sign Up' : 'Sign In'}
        </span>
      </p>
    </div>
  );
};

export default Auth;
