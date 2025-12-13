import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Instagram, Github } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-[#0f0f12] border-t border-white/5 py-6 mt-auto shrink-0">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <h3 className="text-lg font-bold text-white mb-2">GoVyral</h3>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            Create viral content in seconds with AI.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-white font-semibold text-sm mb-3">Product</h4>
                        <ul className="space-y-1.5 text-xs text-slate-400">
                            <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                            <li><Link to="/tools" className="hover:text-white transition-colors">Tools</Link></li>
                            <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                        </ul>
                    </div>

                    {/* Policies */}
                    <div>
                        <h4 className="text-white font-semibold text-sm mb-3">Legal</h4>
                        <ul className="space-y-1.5 text-xs text-slate-400">
                            <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                            <li><Link to="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                            <li><Link to="/refund-policy" className="hover:text-white transition-colors">Refunds</Link></li>
                            <li><Link to="/shipping-policy" className="hover:text-white transition-colors">Shipping</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-white font-semibold text-sm mb-3">Connect</h4>
                        <ul className="space-y-1.5 text-xs text-slate-400">
                            <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                            <li className="flex gap-3 mt-2">
                                <a href="#" className="hover:text-white transition-colors"><Twitter size={16} /></a>
                                <a href="#" className="hover:text-white transition-colors"><Instagram size={16} /></a>
                                <a href="#" className="hover:text-white transition-colors"><Github size={16} /></a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/5 pt-4 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-slate-500">
                    <p>© {new Date().getFullYear()} GoVyral.</p>
                    <p>Made with ❤️ for creators.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
