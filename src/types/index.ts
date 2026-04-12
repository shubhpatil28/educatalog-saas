export type UserRole = 'principal' | 'teacher' | 'superadmin';

export interface SchoolSubscription {
    planType: 'Small' | 'Medium' | 'College';
    status: 'Active' | 'Expired' | 'Trial';
    expiryDate: any;
    amount: number;
}

export interface SchoolInfo {
    schoolId: string;
    schoolCode?: string; // Legacy field
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
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    createdAt: any;
    expiryDate: any;
}

export interface UserProfile {
    uid: string;
    email: string;
    name: string;
    role: UserRole;
    schoolId: string; // Multi-tenant ID
    class?: string; // e.g. "10"
    division?: string; // e.g. "A"
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
    date: any; // Timestamp or Date
    status: 'present' | 'absent' | 'late';
    recordedBy: string; // Teacher UID
}

export interface ClassInfo {
    id: string;
    name: string;
    assignedTeacherId?: string;
    assignedTeacherName?: string;
    totalStudents: number;
}
