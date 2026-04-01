import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Analytics } from '@vercel/analytics/react';
import GhostBanner from './GhostBanner';
import { useAuth } from '../contexts/AuthContext';
import { useParams } from 'react-router-dom';
import { validateSession } from '../utils/sessionGuard';

const CustomerRoute: React.FC = () => {
    const { currentUser, isInitialized } = useAuth();
    const { sessionToken } = useParams<{ sessionToken: string }>();
    const storedUser = localStorage.getItem('userData');
    
    // While initializing Firebase, show nothing or a light loader to prevent flicker
    if (!isInitialized) return null;

    // 1. 🛡️ IRON GATE: No Identity -> Force Login
    if (!currentUser) {
        console.log("CustomerRoute: No Firebase identity detected.");
        return <Navigate to="/login" replace />;
    }

    // 2. 🛡️ SESSION GATE: No vetted session data -> Force Re-Vetting
    if (!storedUser) {
        console.log("CustomerRoute: Missing session data, forcing re-vetting...");
        return <Navigate to="/login" replace />;
    }

    // 🛡️ SECURITY GATE: URL Token Validation (Only if a token is present in the route)
    // This ensures that the randomized token in /dashboard/:token stays consistent 
    // with the one generated during the last successful login.
    // We only do this check if the user is already authenticated to avoid noise for guest/expired links.
    if (sessionToken && !validateSession(sessionToken)) {
        console.warn("CustomerRoute: URL Token Mismatch or Outdated Link detected.");
        toast.error("Security Session mismatch. Please login again.");
        return <Navigate to="/login" replace />;
    }

    const parsedUser = JSON.parse(storedUser);

    // 3. 🛡️ ROLE GATE: Owners/Admins belong in the Business Portal
    if (parsedUser.role === 'owner' || parsedUser.role === 'admin' || parsedUser.isAdmin) {
        // Only redirect if they aren't purposely impersonated (ghosting)
        if (!parsedUser.impersonated) {
            toast.info("Registered Owners must use the Business Portal.");
            return <Navigate to="/business/businessLogin" replace />;
        }
    }

    // 4. 🛡️ CONSISTENCY GATE: Check for identity mismatch (Stale Session Protection)
    if (parsedUser.uid !== currentUser.uid) {
        console.warn("CustomerRoute: Identity mismatch (Stale Session) detected!");
        localStorage.removeItem('userData');
        return <Navigate to="/login" replace />;
    }

    const isGhosting = parsedUser.impersonated || false;

    return (
        <div className={isGhosting ? 'pt-12' : ''}>
            <GhostBanner />
            <Outlet />
            <Analytics />
        </div>
    );
};

export default CustomerRoute;

