import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const PrivacyPolicyPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => window.history.back()}
                    className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-8"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back
                </button>

                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold">
                        D<span className="relative">
                            i
                            <span className="absolute top-2.5 left-1.5 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full"></span>
                        </span>neIn
                        <span className="text-yellow-400">Go</span>
                    </h1>
                    <p className="text-sm text-gray-600">Privacy Policy</p>
                </div>

                {/* content */}
                <motion.div
                    className="bg-white p-8 rounded-3xl shadow-xl border border-emerald-100"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="prose prose-emerald max-w-none">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Privacy Policy</h2>
                        <p className="text-sm text-gray-600 mb-6">Effective Date: May 4, 2025<br />Last Updated: May 4, 2025</p>

                        <p className="mb-6">
                            At DineInGo, we value your privacy and are committed to protecting your personal information. This Privacy Policy outlines how we collect, use, and safeguard your data when you use our platform.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">1. Information We Collect</h3>
                        <p className="mb-6">
                            We may collect the following types of information:
                        </p>
                        <ul className="list-disc pl-6 mb-6">
                            <li><strong>Personal Information:</strong> Name, email address, phone number, and other details you provide when registering or making a reservation.</li>
                            <li><strong>Usage Data:</strong> Information about how you use our device, including your interactions with the Platform.</li>
                            <li><strong>Device Information:</strong> IP address, browser type, and operating system.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">2. How We Use Your Information</h3>
                        <p className="mb-6">
                            We use your information to:
                        </p>
                        <ul className="list-disc pl-6 mb-6">
                            <li>Facilitate restaurant reservations and event registrations.</li>
                            <li>Process payments (via secure third-party processors).</li>
                            <li>Improve our platform and user experience.</li>
                            <li>Communicate with you regarding your bookings and updates.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">3. Data Sharing</h3>
                        <p className="mb-6">
                            We do not sell your personal data. We may share your information with:
                        </p>
                        <ul className="list-disc pl-6 mb-6">
                            <li><strong>Restaurants & Organizers:</strong> To fulfill your reservations and bookings.</li>
                            <li><strong>Service Providers:</strong> Third-party vendors who assist with payment processing, email delivery, etc.</li>
                            <li><strong>Legal Compliance:</strong> When required by law or to protect our rights.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">4. Data Security</h3>
                        <p className="mb-6">
                            We implement reasonable security measures to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">5. Your Choices</h3>
                        <p className="mb-6">
                            You may access, update, or request deletion of your personal information by contacting us. You can also unsubscribe from marketing communications at any time.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">6. Updates to This Policy</h3>
                        <p className="mb-6">
                            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">7. Contact Us</h3>
                        <p className="mb-6">
                            If you have questions about this Privacy Policy, please contact us at:
                        </p>
                        <p className="mb-6">
                            📧 <a href="mailto:sec.dinelngo.team@gmail.com" className="text-emerald-600 hover:text-emerald-700">
                                sec.dinelngo.team@gmail.com
                            </a>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;
