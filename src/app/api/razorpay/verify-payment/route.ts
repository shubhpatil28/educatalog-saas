export async function POST() {
    return Response.json({
        success: false,
        message: "Payment verification is currently disabled"
    });
}
