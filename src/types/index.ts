export type UserRole = 'principal' | 'teacher' | 'superadmin';

export interface SchoolSubscription {
    planType: 'Small' | 'Medium' | 'College';
    status: 'Active' | 'Expired' | 'Trial';
    expiryDate: any;
    amount: number;
}

export interface SchoolInfo {
    schoolId: string;
    code: string;               // Institutional login code (same as schoolId, e.g. SCH-XXXX)
    name: string;
    city?: string;
    principalName: string;
    email: string;
    phone?: string;
    numStudents?: number;
    plan: 'trial' | 'basic' | 'premium';
    trialDays: number;
    subscriptionStatus: 'active' | 'expired';
    paymentStatus?: 'pending' | 'paid';
    subscriptionStart?: any;
    subscriptionEnd?: any;
    createdAt: any;
    expiryDate: any;
}

export interface UserProfile {
    uid: string;
    email: string;
    name: string;
    role: UserRole;
    schoolId: string;           // Multi-tenant isolation key
    class?: string | null;      // Teachers only, e.g. "10"
    division?: string | null;   // Teachers only, e.g. "A"
    status: 'active' | 'disabled';
    createdAt: any;
    lastLogin?: any;
    failedAttempts?: number;    // Rate-limiting field
    lockUntil?: any;            // Timestamp — Firestore-persisted lockout
}

export interface Student {
    id: string;
    schoolId: string;
    name: string;
    rollNumber: string;
    fatherName: string;
    motherName: string;
    dateOfBirth: string;
    birthPlace: string;
    gender: 'Male' | 'Female' | 'Other';
    address: string;
    mobileNumber: string;
    admissionDate: string;
    currentClass: string;
    division: string;
    previousClass?: string;
    academicYear: string;
    photoUrl?: string;
    status: 'Active' | 'Passed Out' | 'Graduated';
    academicHistory: AcademicHistoryEntry[];
    attendanceStats?: {
        totalDays: number;
        presentDays: number;
        percentage: number;
    };
}

export interface AcademicHistoryEntry {
    class: string;
    year: string;
    status: string;
}

export interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName: string;
    rollNumber: string;
    class: string;
    division: string;
    date: any;
    status: 'present' | 'absent' | 'late';
    recordedBy: string;
    schoolId: string;
}

export interface ClassInfo {
    id: string;
    name: string;
    assignedTeacherId?: string;
    assignedTeacherName?: string;
    totalStudents: number;
}
