import React from 'react';
import Navbar from '../../components/Navbar';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-[#0f0f12] text-slate-300 font-sans">
            <Navbar />
            <div className="max-w-4xl mx-auto px-6 py-24">
                <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
                <div className="space-y-6 text-lg leading-relaxed">
                    <p>Last updated: December 06, 2024</p>
                    <p>
                        At GoVyral, accessible from https://govyral.online, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by GoVyral and how we use it.
                    </p>

                    <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Log Files</h2>
                    <p>
                        GoVyral follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services' analytics. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks.
                    </p>

                    <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Cookies and Web Beacons</h2>
                    <p>
                        Like any other website, GoVyral uses 'cookies'. These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.
                    </p>

                    <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Privacy Policies</h2>
                    <p>
                        You may consult this list to find the Privacy Policy for each of the advertising partners of GoVyral.
                    </p>

                    <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Third Party Privacy Policies</h2>
                    <p>
                        GoVyral's Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information.
                    </p>

                    <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Consent</h2>
                    <p>
                        By using our website, you hereby consent to our Privacy Policy and agree to its Terms and Conditions.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
