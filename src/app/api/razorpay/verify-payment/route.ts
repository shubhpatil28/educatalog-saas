import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// ── Firebase Admin Init (lazy singleton) ───────────────────────────────────
function getAdminDb() {
    if (!getApps().length) {
        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    }
    return getFirestore();
}

// Plan duration in days
const PLAN_DURATION_DAYS: Record<string, number> = {
    basic: 365,
    premium: 365,
};

export async function POST(req: NextRequest) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            schoolId,
            plan,
        } = await req.json();

        // ── 1. Verify Signature ─────────────────────────────────────────
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
        }

        // ── 2. Update Firestore subscription ────────────────────────────
        const db = getAdminDb();
        const planKey = (plan as string).toLowerCase();
        const durationDays = PLAN_DURATION_DAYS[planKey] ?? 365;

        const now = new Date();
        const expiryDate = new Date(now);
        expiryDate.setDate(expiryDate.getDate() + durationDays);

        await db.collection('schools').doc(schoolId).update({
            plan: planKey,
            paymentStatus: 'paid',
            subscriptionStatus: 'active',
            subscriptionStart: Timestamp.fromDate(now),
            subscriptionEnd: Timestamp.fromDate(expiryDate),
            expiryDate: Timestamp.fromDate(expiryDate),
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            updatedAt: Timestamp.fromDate(now),
        });

        return NextResponse.json({ success: true, expiryDate: expiryDate.toISOString() });
    } catch (error: any) {
        console.error('[razorpay/verify-payment]', error);
        return NextResponse.json({ error: error?.message || 'Verification failed.' }, { status: 500 });
    }
}
