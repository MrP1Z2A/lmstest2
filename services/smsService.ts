
import { ANNOUNCEMENTS, UPCOMING_EXAMS, MOCK_ASSIGNMENTS } from '../constants';
import { ReportCard } from '../types';

/**
 * Service to bridge data between the SMS (School Management System) 
 * and this LMS (Learning Management System).
 */
export const syncSmsData = async (studentId?: string) => {
  try {
    // In production, fetch specific student data:
    await fetch(`https://smspa1.vercel.app/api/v1/sync?sid=${studentId}`);
    
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simulated Report Card Data from SMS
    const reportCard: ReportCard = {
      term: "Spring 2025",
      gpa: "3.85",
      rank: "5th / 120",
      attendance: "96%",
      subjects: [
        { name: "Modern Physics", grade: "A", score: 92, comment: "Exceptional analytical skills." },
        { name: "Data Structures", grade: "B+", score: 88, comment: "Strong logic, needs more practice in recursion." },
        { name: "Discrete Math", grade: "A-", score: 90, comment: "Active participation in seminars." }
      ]
    };

    return {
      announcements: [...ANNOUNCEMENTS],
      exams: [...UPCOMING_EXAMS],
      assignments: [...MOCK_ASSIGNMENTS],
      reportCard,
      lastSync: new Date().toLocaleTimeString()
    };
  } catch (error) {
    console.error("SMS Sync Failed:", error);
    throw error;
  }
};
