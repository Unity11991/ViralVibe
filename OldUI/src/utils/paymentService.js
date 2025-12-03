export const initializePayment = (amount, onSuccess, onError) => {
    const options = {
        key: "rzp_test_Rn4uvcKe2ZeyhB", // Replace with your actual Razorpay Key ID
        amount: amount * 100, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
        currency: "INR",
        name: "ViralVibe",
        description: "Coin Purchase",
        image: "https://viralvibe.ai/logo.png", // Optional: Add your logo URL here
        handler: function (response) {
            // Validate payment at server - using post-payment callback
            // alert(response.razorpay_payment_id);
            // alert(response.razorpay_order_id);
            // alert(response.razorpay_signature)
            onSuccess(response);
        },
        prefill: {
            name: "ViralVibe User",
            email: "user@viralvibe.ai",
            contact: "+919304273185"
        },
        notes: {
            address: "ViralVibe Corporate Office"
        },
        theme: {
            color: "#8b5cf6" // Purple-600 to match theme
        }
    };

    const rzp1 = new window.Razorpay(options);
    rzp1.on('payment.failed', function (response) {
        onError(response.error);
    });
    rzp1.open();
};
