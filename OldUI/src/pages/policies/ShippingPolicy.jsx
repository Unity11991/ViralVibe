import React from 'react';
import Navbar from '../../components/Navbar';

const ShippingPolicy = () => {
    return (
        <div className="min-h-screen bg-[#0f0f12] text-slate-300 font-sans">
            <Navbar />
            <div className="max-w-4xl mx-auto px-6 py-24">
                <h1 className="text-4xl font-bold text-white mb-8">Shipping & Delivery Policy</h1>
                <div className="space-y-6 text-lg leading-relaxed">
                    <p>Last updated: December 06, 2024</p>

                    <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Digital Delivery</h2>
                    <p>
                        GoVyral is a digital platform. We do not sell or ship physical products.
                    </p>

                    <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Instant Access</h2>
                    <p>
                        Upon successful payment, the purchased Coins or services are instantly credited to your GoVyral account. You will receive a confirmation email with the transaction details.
                    </p>

                    <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Issues with Delivery</h2>
                    <p>
                        If you do not receive your digital goods immediately after purchase, please try refreshing your dashboard. If the issue persists, contact our support team at support@govyral.online.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ShippingPolicy;
