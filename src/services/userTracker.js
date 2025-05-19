import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  orderBy, 
  limit,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';

// Collection reference for user whereabouts
const whereaboutsRef = collection(db, 'user_whereabouts');

/**
 * Update a user's whereabout information
 * @param {string} userId - The user's ID
 * @param {string} userName - The user's name
 * @param {string} whereabout - The whereabout information
 * @param {string} rawMessage - The original message that mentioned the whereabout
 * @returns {Promise<void>}
 */
export const updateUserWhereabout = async (userId, userName, whereabout, rawMessage) => {
  try {
    const userDocRef = doc(whereaboutsRef, userId);
    
    await setDoc(userDocRef, {
      userId,
      userName,
      whereabout,
      rawMessage,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    console.log(`Updated whereabout for user ${userName}: ${whereabout}`);
    return true;
  } catch (error) {
    console.error('Error updating user whereabout:', error);
    return false;
  }
};

/**
 * Get a user's whereabout information by their name
 * @param {string} userName - The user's name to search for
 * @returns {Promise<Object|null>} - The whereabout information or null if not found
 */
export const getUserWhereabout = async (userName) => {
  try {
    // First try exact match by userId if available
    const exactMatchQuery = query(
      whereaboutsRef, 
      orderBy('updatedAt', 'desc'),
      limit(10)
    );
    
    const querySnapshot = await getDocs(exactMatchQuery);
    
    // Look for case-insensitive name match
    const lowerUserName = userName.toLowerCase();
    const matchingUsers = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.userName && data.userName.toLowerCase().includes(lowerUserName)) {
        matchingUsers.push({
          ...data,
          updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date()
        });
      }
    });
    
    // Sort by most recent
    matchingUsers.sort((a, b) => b.updatedAt - a.updatedAt);
    
    return matchingUsers.length > 0 ? matchingUsers[0] : null;
  } catch (error) {
    console.error('Error getting user whereabout:', error);
    return null;
  }
};

/**
 * Analyze a message to detect whereabout information
 * @param {Object} message - The message object
 * @returns {Object|null} - Extracted whereabout info or null if none detected
 */
export const detectWhereaboutInMessage = (message) => {
  if (!message || !message.text || typeof message.text !== 'string') {
    return null;
  }
  
  const text = message.text.toLowerCase();
  const userId = message.userId;
  const userName = message.userName || 'User';
  
  // Common whereabout patterns
  const goingToPatterns = [
    /(?:i am|i'm|im|i will be|i'll be|aku|saya) (?:going|headed|heading|on my way) to (the )?([a-z0-9\s]+)/i,
    /(?:i am|i'm|im|i will be|i'll be|aku|saya) (?:at|in|visiting) (the )?([a-z0-9\s]+)/i,
    /(?:i want to|i wanna|i will|i'll|aku nak|saya mahu) (?:go|visit|head) to (the )?([a-z0-9\s]+)/i,
    /(?:pergi ke|ke|gi|pegi) ([a-z0-9\s]+)/i, // Malay patterns
    /(?:nak|mahu|hendak) (?:pergi|ke|gi) ([a-z0-9\s]+)/i // More Malay patterns
  ];
  
  for (const pattern of goingToPatterns) {
    const match = text.match(pattern);
    if (match) {
      const location = match[match.length - 1].trim();
      // Filter out very short or common words
      if (location.length > 2 && !['the', 'a', 'an', 'to', 'ke', 'di'].includes(location)) {
        return {
          userId,
          userName,
          whereabout: location,
          rawMessage: message.text
        };
      }
    }
  }
  
  return null;
};

export default {
  updateUserWhereabout,
  getUserWhereabout,
  detectWhereaboutInMessage
};
