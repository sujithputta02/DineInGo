import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { toast } from 'react-toastify';

const CustomerRoute: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [shouldRedirect, setShouldRedirect] = useState(false);

    useEffect(() => {
        // Check session storage first for immediate feedback
        const checkUserRole = () => {
            const storedUser = sessionStorage.getItem('userData');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                if (user.role === 'owner') {
                    setShouldRedirect(true);
                    setLoading(false);
                    return;
                }
            }
            setLoading(false);
        };

        checkUserRole();

        // Also listen to auth state to be safe, though session is faster
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // If we have a user, check role again if session failed
                const storedUser = sessionStorage.getItem('userData');
                if (storedUser) {
                    const parsed = JSON.parse(storedUser);
                    if (parsed.role === 'owner' && parsed.uid === user.uid) {
                        setShouldRedirect(true);
                    }
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) return null; // Or a spinner

    if (shouldRedirect) {
        toast.info("Registered Owners must use the Business Portal.");
        return <Navigate to="/business/dashboard" replace />;
    }

    return <Outlet />;
};

export default CustomerRoute;
