import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig';

interface ReservationEmail {
  email: string;
  fullName: string;
  reservationId: string;
  timestamp: Date;
}

export const storeReservationEmail = async (email: string, fullName: string, reservationId: string) => {
  try {
    const reservationEmail: ReservationEmail = {
      email,
      fullName,
      reservationId,
      timestamp: new Date()
    };

    const docRef = await addDoc(collection(db, 'reservationEmails'), reservationEmail);
    console.log('Reservation email stored with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error storing reservation email:', error);
    throw error;
  }
};

export const getReservationEmails = async (reservationId: string) => {
  try {
    const q = query(
      collection(db, 'reservationEmails'),
      where('reservationId', '==', reservationId)
    );
    
    const querySnapshot = await getDocs(q);
    const emails: ReservationEmail[] = [];
    
    querySnapshot.forEach((doc) => {
      emails.push({ ...doc.data(), id: doc.id } as ReservationEmail);
    });
    
    return emails;
  } catch (error) {
    console.error('Error getting reservation emails:', error);
    throw error;
  }
}; 