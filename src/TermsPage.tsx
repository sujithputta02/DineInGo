import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <Link 
          to="/signup" 
          className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-8"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Sign Up
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">
            D<span className="relative">
              i
              <span className="absolute top-2.5 left-1.5 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full"></span>
            </span>neIn
            <span className="text-yellow-400">Go</span>
          </h1>
          <p className="text-sm text-gray-600">Terms and Conditions</p>
        </div>

        {/* Terms Content */}
        <motion.div 
          className="bg-white p-8 rounded-3xl shadow-xl border border-emerald-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="prose prose-emerald max-w-none">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Terms and Conditions</h2>
            <p className="text-sm text-gray-600 mb-6">Effective Date: May 4, 2025<br />Last Updated: May 4, 2025</p>

            <p className="mb-6">
              Welcome to DineInGo! These Terms and Conditions ("Terms") govern your use of the DineInGo website (the "Platform"). 
              By accessing or using the Platform, you agree to comply with and be bound by these Terms. If you do not agree with 
              these Terms, please do not use the Platform.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">1. Service Overview</h3>
            <p className="mb-6">
              DineInGo is a digital platform designed to streamline the dine-in experience at restaurants through QR-code based 
              ordering and contactless payments. Our website is currently in the initial rollout phase and services are subject 
              to updates as we develop our features.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">2. Platform Status</h3>
            <p className="mb-6">
              DineInGo is currently in its pre-launch stage. Features such as mobile applications and full-scale deployment are 
              under development. The platform is being tested and refined, and some features may be unavailable or subject to change.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">3. User Eligibility</h3>
            <p className="mb-6">
              To use DineInGo, users must:
            </p>
            <ul className="list-disc pl-6 mb-6">
              <li>Be at least 18 years old, or have legal parental/guardian consent,</li>
              <li>Use the platform in accordance with applicable local laws.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">4. Beta Usage Disclaimer</h3>
            <p className="mb-6">
              Since this is an early version of our service:
            </p>
            <ul className="list-disc pl-6 mb-6">
              <li>You understand that bugs or interruptions may occur,</li>
              <li>Features are being tested and feedback may be collected,</li>
              <li>We may remove, modify, or add features at our discretion.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">5. Use of Service</h3>
            <p className="mb-6">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 mb-6">
              <li>Use the platform for illegal or unauthorized purposes,</li>
              <li>Interfere with or disrupt the platform or its infrastructure,</li>
              <li>Copy, reproduce, or resell any part of the website or its content without permission.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">6. Content and Intellectual Property</h3>
            <p className="mb-6">
              All intellectual property, including text, graphics, design, and branding on the DineInGo website, is owned by or 
              licensed to DineInGo. Unauthorized use or distribution is prohibited.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">7. Privacy</h3>
            <p className="mb-6">
              We are committed to protecting your privacy. Any data collected during your use of the platform will be handled in 
              accordance with our Privacy Policy (coming soon). No sensitive personal data is collected unless explicitly stated.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">8. Third-Party Links</h3>
            <p className="mb-6">
              The Platform may include links to third-party websites. DineInGo is not responsible for the content, policies, or 
              practices of any third-party sites.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">9. Limitation of Liability</h3>
            <p className="mb-6">
              DineInGo provides the platform on an "as is" basis. We do not guarantee uninterrupted or error-free operation. We 
              are not liable for any damages resulting from the use or inability to use the website or its features during the 
              pre-launch stage.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">10. Modifications to Terms</h3>
            <p className="mb-6">
              These Terms may be updated at any time. We will notify users of significant changes by posting the updated version 
              on the website. Continued use of the Platform means acceptance of those changes.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">11. Contact Information</h3>
            <p className="mb-6">
              As DineInGo is a startup in early stages, we currently operate without a physical office. For questions or support, 
              please contact us via:
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

export default TermsPage; 