import React from 'react';
import Navbar from '../../components/Navbar';

const TermsAndConditions = () => {
    return (
        <div className="min-h-screen bg-[#0f0f12] text-slate-300 font-sans">
            <Navbar />
            <div className="max-w-4xl mx-auto px-6 py-24">
                <h1 className="text-4xl font-bold text-white mb-8">Terms and Conditions</h1>
                <div className="space-y-6 text-lg leading-relaxed">
                    <p>Last updated: December 06, 2024</p>
                    <p>
                        Welcome to GoVyral! These terms and conditions outline the rules and regulations for the use of GoVyral's Website, located at https://govyral.online.
                    </p>

                    <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Cookies</h2>
                    <p>
                        We employ the use of cookies. By accessing GoVyral, you agreed to use cookies in agreement with the GoVyral's Privacy Policy.
                    </p>

                    <h2 className="text-2xl font-semibold text-white mt-8 mb-4">License</h2>
                    <p>
                        Unless otherwise stated, GoVyral and/or its licensors own the intellectual property rights for all material on GoVyral. All intellectual property rights are reserved. You may access this from GoVyral for your own personal use subjected to restrictions set in these terms and conditions.
                    </p>

                    <h2 className="text-2xl font-semibold text-white mt-8 mb-4">You must not:</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Republish material from GoVyral</li>
                        <li>Sell, rent or sub-license material from GoVyral</li>
                        <li>Reproduce, duplicate or copy material from GoVyral</li>
                        <li>Redistribute content from GoVyral</li>
                    </ul>

                    <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Disclaimer</h2>
                    <p>
                        To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating to our website and the use of this website. Nothing in this disclaimer will:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>limit or exclude our or your liability for death or personal injury;</li>
                        <li>limit or exclude our or your liability for fraud or fraudulent misrepresentation;</li>
                        <li>limit any of our or your liabilities in any way that is not permitted under applicable law; or</li>
                        <li>exclude any of our or your liabilities that may not be excluded under applicable law.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default TermsAndConditions;
