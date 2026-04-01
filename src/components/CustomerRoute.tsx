import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { toast } from 'react-toastify';
import { Analytics } from '@vercel/analytics/react';
import GhostBanner from './GhostBanner';

const CustomerRoute: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [shouldRedirect, setShouldRedirect] = useState(false);

    useEffect(() => {
        // Check localStorage first for immediate feedback
        const checkUserRole = () => {
            const storedUser = localStorage.getItem('userData');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                if (user.role === 'owner') {
                    setShouldRedirect(true);
                    setLoading(false);
                    return;
                }
            } else {
                // If NO session data, we must redirect to login for vetting
                // BUT we wait for onAuthStateChanged to be sure we're actually logged in
            }
            setLoading(false);
        };

        checkUserRole();

        // Also listen to auth state to be safe, though session is faster
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const storedUser = localStorage.getItem('userData');
                if (storedUser) {
                    const parsed = JSON.parse(storedUser);
                    if (parsed.role === 'owner' && parsed.uid === user.uid) {
                        setShouldRedirect(true);
                    }
                } else {
                   // Logged in to Firebase but NO session data — DANGEROUS BYPASS
                   console.log("CustomerRoute: Missing session data, forcing re-vetting...");
                   setShouldRedirect(true); // Effectively force a redirect
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) return null; // Or a spinner

    if (shouldRedirect) {
        const storedUser = localStorage.getItem('userData');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        
        if (parsed?.role === 'owner' || parsed?.role === 'admin') {
            toast.info("Registered Owners must use the Business Portal.");
            return <Navigate to="/business/businessLogin" replace />;
        }
        
        // If it was a missing session data redirect, go to main login
        return <Navigate to="/login" replace />;
    }

    const userDataRaw = localStorage.getItem('userData');
    const isGhosting = userDataRaw ? JSON.parse(userDataRaw).impersonated : false;

    return (
        <div className={isGhosting ? 'pt-10' : ''}>
            <GhostBanner />
            <Outlet />
            <Analytics />
        </div>
    );
};

export default CustomerRoute;
