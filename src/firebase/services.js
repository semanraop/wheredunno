import { db } from './config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';

// Collection reference
const messagesRef = collection(db, 'messages');

// Add a new message to Firestore
export const addMessage = async (messageData) => {
  try {
    const newMessage = {
      ...messageData,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(messagesRef, newMessage);
    return { id: docRef.id, ...newMessage };
  } catch (error) {
    console.error('Error adding message: ', error);
    throw error;
  }
};

// Get all messages from Firestore
export const getMessages = async () => {
  try {
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting messages: ', error);
    throw error;
  }
};

// Subscribe to real-time updates
export const subscribeToMessages = (callback) => {
  try {
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    return onSnapshot(q, (querySnapshot) => {
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(messages);
    });
  } catch (error) {
    console.error('Error subscribing to messages: ', error);
    throw error;
  }
};
