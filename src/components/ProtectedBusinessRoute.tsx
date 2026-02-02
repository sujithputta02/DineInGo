import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { toast } from 'react-toastify';

const ProtectedBusinessRoute: React.FC = () => {
    const storedUser = sessionStorage.getItem('userData');

    if (!storedUser) {
        return <Navigate to="/business/login" replace />;
    }

    const user = JSON.parse(storedUser);

    if (user.role !== 'owner' && user.role !== 'admin') {
        // If logged in but not an owner, redirect to main dashboard or show error
        // For separation, maybe just logout or redirect to login
        toast.error("Access restricted to Business Owners.");
        return <Navigate to="/business/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedBusinessRoute;
