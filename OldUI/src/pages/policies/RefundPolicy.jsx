import React from 'react';
import Navbar from '../../components/Navbar';

const RefundPolicy = () => {
    return (
        <div className="min-h-screen bg-[#0f0f12] text-slate-300 font-sans">
            <Navbar />
            <div className="max-w-4xl mx-auto px-6 py-24">
                <h1 className="text-4xl font-bold text-white mb-8">Cancellation & Refund Policy</h1>
                <div className="space-y-6 text-lg leading-relaxed">
                    <p>Last updated: December 06, 2024</p>

                    <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Digital Products</h2>
                    <p>
                        GoVyral provides digital services and virtual goods (Coins). Due to the nature of digital content, all sales are final. We do not offer refunds or cancellations once the digital goods have been delivered to your account.
                    </p>

                    <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Exceptions</h2>
                    <p>
                        We may consider refunds in the following exceptional circumstances:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>If you were charged but did not receive the purchased Coins.</li>
                        <li>If there was a technical error during the transaction process.</li>
                    </ul>

                    <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Contact Us</h2>
                    <p>
                        If you believe you are eligible for a refund based on the exceptions above, please contact our support team at support@govyral.online with your transaction details.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RefundPolicy;
