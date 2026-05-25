import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Create a notification document in the 'notifications' collection
 * @param {object} params
 * @param {string} params.type - 'WORKER_ADDED' | 'WORKER_CLOSED' | 'WORKER_REJECTED'
 * @param {string} params.message - Human-readable message
 * @param {string} params.workerName - Worker name
 * @param {string} params.empId - Employee ID (if available)
 * @param {string} params.project - Project name
 * @param {string} params.performedBy - Name/email of person who performed the action
 */
export const createNotification = async ({ type, message, workerName, empId, project, performedBy }) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      type,
      message,
      workerName: workerName || '',
      empId: empId || '',
      project: project || '',
      performedBy: performedBy || 'SYSTEM',
      timestamp: serverTimestamp(),
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Notification creation error:', err);
  }
};