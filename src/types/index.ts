export type UserRole = 'principal' | 'teacher' | 'superadmin';

export interface SchoolSubscription {
    planType: 'Small' | 'Medium' | 'College';
    status: 'Active' | 'Expired' | 'Trial';
    expiryDate: any;
    amount: number;
}

export interface SchoolInfo {
    schoolCode: string;
    name: string;
    principalName: string;
    email: string;
    phone: string;
    plan: 'trial' | 'premium';
    trialDays: number;
    subscriptionStatus: 'active' | 'expired';
    createdAt: any;
    expiryDate: any;
}

export interface UserProfile {
    uid: string;
    email: string;
    name: string;
    role: UserRole;
    schoolId: string; // Multi-tenant ID
    assignedClass?: string;
    status: 'Active' | 'Disabled';
    createdAt: any;
    lastLogin?: any;
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
    date: string; // ISO string YYYY-MM-DD
    status: 'Present' | 'Absent';
    recordedBy: string; // Teacher UID
}

export interface ClassInfo {
    id: string;
    name: string;
    assignedTeacherId?: string;
    assignedTeacherName?: string;
    totalStudents: number;
}
