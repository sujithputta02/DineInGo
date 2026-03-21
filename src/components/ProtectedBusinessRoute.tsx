import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { toast } from 'react-toastify';

const ProtectedBusinessRoute: React.FC = () => {
    const storedUser = sessionStorage.getItem('userData');

    if (!storedUser) {
        return <Navigate to="/business/businessLogin" replace />;
    }

    const user = JSON.parse(storedUser);

    if (user.role === 'user') {
        const token = user.token;
        toast.info("Customers must use the User Dashboard.");
        return <Navigate to={token ? `/dashboard/${token}` : "/login"} replace />;
    }

    if (user.role !== 'owner' && user.role !== 'admin') {
        toast.error("Access restricted to Business Owners.");
        return <Navigate to="/business/businessLogin" replace />;
    }

    return <Outlet />;
};

export default ProtectedBusinessRoute;
