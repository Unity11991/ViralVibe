export const initializePayment = (amount, userDetails, onSuccess, onError) => {
    const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Replace with your actual Razorpay Key ID
        amount: Math.round(amount * 100), // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
        currency: "INR",
        name: "GoVyral",
        description: "Coin Purchase",
        // image: "https://govyral.ai/logo.png", // Optional: Add your logo URL here
        handler: function (response) {
            // Validate payment at server - using post-payment callback
            // alert(response.razorpay_payment_id);
            // alert(response.razorpay_order_id);
            // alert(response.razorpay_signature)
            onSuccess(response);
        },
        prefill: {
            name: userDetails?.name || "GoVyral User",
            email: userDetails?.email || "user@govyral.ai",
            contact: userDetails?.contact || ""
        },
        notes: {
            address: "GoVyral Corporate Office"
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
