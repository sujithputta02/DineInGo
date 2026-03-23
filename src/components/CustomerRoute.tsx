import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Analytics } from '@vercel/analytics/react';

const CustomerRoute: React.FC = () => {
    const { currentUser, backendUser, loading, isWaitlisted } = useAuth();
    const navigate = useNavigate();

    if (loading) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Dino is checking your reservation...</h2>
      </div>
    );

    // If backend user exists but role is owner, redirect to business portal
    if (backendUser && backendUser.role === 'owner') {
        toast.info("Registered Owners must use the Business Portal.");
        return <Navigate to="/business/businessLogin" replace />;
    }

    // SYSTEMATIC VETTING: If authenticated in Firebase but not in MongoDB
    if (currentUser && !backendUser) {
        // If they are explicitly not on waitlist
        if (isWaitlisted === false) {
            toast.error("Dino says: This email isn't on the waitlist yet!");
            return <Navigate to="/login" state={{ error: "Unauthorized access" }} replace />;
        }
        // If they ARE on waitlist but no account yet, send to signup
        if (isWaitlisted === true) {
            return <Navigate to="/signup" replace />;
        }
    }

    // Fallback: If no currentUser, redirect to login
    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    return (
        <>
            <Outlet />
            <Analytics />
        </>
    );
};

export default CustomerRoute;
