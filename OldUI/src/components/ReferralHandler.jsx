import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ReferralHandler = () => {
    const { code } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (code) {
            // Save referral code to local storage
            localStorage.setItem('referral_code', code);
            console.log("Referral code saved:", code);
        }
        // Redirect to home page
        navigate('/');
    }, [code, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
            <p>Redirecting to GoVyral...</p>
        </div>
    );
};

export default ReferralHandler;
