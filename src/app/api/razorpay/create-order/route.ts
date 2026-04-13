export async function POST() {
    return Response.json({
        success: false,
        message: "Payment system is currently disabled"
    });
}
