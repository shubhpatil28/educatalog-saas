import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

// Plan pricing in paise (INR × 100)
const PLAN_AMOUNTS: Record<string, number> = {
    basic: 200000,   // ₹2,000
    premium: 500000, // ₹5,000
};

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
    try {
        const { plan, schoolId } = await req.json();

        const planKey = (plan as string).toLowerCase();
        const amount = PLAN_AMOUNTS[planKey];

        if (!amount) {
            return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 });
        }

        const order = await razorpay.orders.create({
            amount,
            currency: 'INR',
            receipt: `rcpt_${schoolId}_${Date.now()}`,
            notes: {
                schoolId,
                plan: planKey,
            },
        });

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error: any) {
        console.error('[razorpay/create-order]', error);
        return NextResponse.json({ error: error?.message || 'Failed to create order.' }, { status: 500 });
    }
}
