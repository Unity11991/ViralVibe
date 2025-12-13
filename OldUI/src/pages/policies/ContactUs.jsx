import React from 'react';
import Navbar from '../../components/Navbar';
import { Mail, MapPin, Phone } from 'lucide-react';

const ContactUs = () => {
    return (
        <div className="min-h-screen bg-[#0f0f12] text-slate-300 font-sans">
            <Navbar />
            <div className="max-w-4xl mx-auto px-6 py-24">
                <h1 className="text-4xl font-bold text-white mb-8">Contact Us</h1>

                <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                        <p className="text-lg leading-relaxed">
                            Have questions or need assistance? We're here to help! Reach out to us using the contact information below.
                        </p>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white/5 rounded-xl text-blue-400">
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Email</h3>
                                    <p className="text-slate-400">support@govyral.online</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white/5 rounded-xl text-purple-400">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Address</h3>
                                    <p className="text-slate-400">
                                        GoVyral HQ<br />
                                        New Delhi, India
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#1a1a1f] p-8 rounded-3xl border border-white/10">
                        <h2 className="text-2xl font-bold text-white mb-6">Send us a message</h2>
                        <form className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
                                <input type="text" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="Your Name" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                                <input type="email" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="your@email.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Message</label>
                                <textarea rows="4" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="How can we help?"></textarea>
                            </div>
                            <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactUs;
