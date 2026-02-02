import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import DashboardPage from './DashboardPage';
import RestaurantDetails from './pages/RestaurantDetails';
import ReservationPreview from './pages/ReservationPreview';
import TableSelection from './pages/TableSelection';
import ReservationDetailsPage from './pages/ReservationDetailsPage';
import TermsPage from './TermsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import UserFeedbackForm from './components/UserFeedbackForm';
import DebugPage from './pages/DebugPage';
import FoodMenu from './pages/FoodMenu';
import AdminNotificationsPage from './pages/AdminNotificationsPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AuthActionHandler from './pages/AuthActionHandler';
import EventRegistration from './pages/EventRegistration';
import EventPreview from './pages/EventPreview';
import EventsPage from './pages/EventsPage';
import BusinessLayout from './layouts/BusinessLayout';
import BusinessAuth from './pages/business/BusinessAuth';
import OwnerDashboard from './pages/business/OwnerDashboard';
import ManageRestaurant from './pages/business/ManageRestaurant';
import RestaurantOnboarding from './pages/business/RestaurantOnboarding';
import ProtectedBusinessRoute from './components/ProtectedBusinessRoute';
import CustomerRoute from './components/CustomerRoute';
import { UserData, CityLocation } from './types';
import { UserActivityProvider } from './contexts/UserActivityContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AuthProvider } from './contexts/AuthContext';
import { auth, onAuthStateChanged } from './firebase';
import AIChatbot from './components/AIChatbot';
import FeaturesDemo from './pages/FeaturesDemo';

// Custom hook to set the document title based on the current route
function usePageTitle() {
  const location = useLocation();

  useEffect(() => {
    let title = 'DineInGo';
    if (location.pathname === '/') title = 'DineInGo - Reserve Dining & Events';
    else if (location.pathname.startsWith('/login')) title = 'Login | DineInGo';
    else if (location.pathname.startsWith('/signup')) title = 'Sign Up | DineInGo';
    else if (location.pathname.startsWith('/dashboard')) title = 'Dashboard | DineInGo';
    else if (location.pathname.startsWith('/restaurant/') && location.pathname.endsWith('/menu')) title = 'Menu | DineInGo';
    else if (location.pathname.startsWith('/restaurant/') && location.pathname.endsWith('/preview')) title = 'Reservation Preview | DineInGo';
    else if (location.pathname.startsWith('/restaurant/') && location.pathname.endsWith('/table-selection')) title = 'Table Selection | DineInGo';
    else if (location.pathname.startsWith('/restaurant/') && location.pathname.endsWith('/reservation')) title = 'Reservation Details | DineInGo';
    else if (location.pathname.startsWith('/restaurant/')) title = 'Restaurant Details | DineInGo';
    else if (location.pathname.startsWith('/event/') && location.pathname.endsWith('/preview')) title = 'Event Registration Preview | DineInGo';
    else if (location.pathname.startsWith('/event/') && location.pathname.endsWith('/register')) title = 'Event Registration | DineInGo';
    else if (location.pathname.startsWith('/events')) title = 'Events | DineInGo';
    else if (location.pathname.startsWith('/terms')) title = 'Terms & Conditions | DineInGo';
    else if (location.pathname.startsWith('/feedback')) title = 'Feedback | DineInGo';
    else if (location.pathname.startsWith('/debug')) title = 'Debug | DineInGo';
    else if (location.pathname.startsWith('/auth/action')) title = 'Auth Action | DineInGo';
    else if (location.pathname.startsWith('/admin/notifications')) title = 'Admin Notifications | DineInGo';
    else if (location.pathname.startsWith('/admin-login')) title = 'Admin Login | DineInGo';
    document.title = title;
  }, [location]);
}

// New component to call usePageTitle inside Router context
function PageTitleHandler() {
  usePageTitle();
  return null;
}

const App: React.FC = () => {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PageTitleHandler />
      <AuthProvider>
        <UserActivityProvider>
          <NotificationProvider>
            <ToastContainer
              position="top-center"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
            <AIChatbot />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/feedback" element={<UserFeedbackForm />} />
              <Route path="/debug" element={<DebugPage />} />
              <Route path="/features-demo" element={<FeaturesDemo />} />
              <Route path="/auth/action" element={<AuthActionHandler />} />

              {/* Customer Protected Routes (Redirect Owners to Business) */}
              <Route element={<CustomerRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/restaurant/:id" element={<RestaurantDetails />} />
                <Route path="/restaurant/:id/preview" element={<ReservationPreview />} />
                <Route path="/restaurant/:id/table-selection" element={<TableSelection />} />
                <Route path="/restaurant/:id/reservation" element={<ReservationDetailsPage />} />
                <Route path="/restaurant/:id/menu" element={<FoodMenu />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/event/:id/register" element={<EventRegistration />} />
                <Route path="/event/:id/preview" element={<EventPreview />} />
              </Route>

              <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />

              {/* Business Routes */}
              <Route path="/business/login" element={<BusinessAuth />} />
              <Route path="/business/signup" element={<BusinessAuth />} />

              <Route path="/business" element={<ProtectedBusinessRoute />}>
                <Route element={<BusinessLayout />}>
                  <Route index element={<OwnerDashboard />} />
                  <Route path="dashboard" element={<OwnerDashboard />} />
                  <Route path="manage/:id" element={<ManageRestaurant />} />
                  <Route path="onboarding" element={<RestaurantOnboarding />} />
                  <Route path="restaurants" element={<OwnerDashboard />} />
                </Route>
              </Route>
            </Routes>
          </NotificationProvider>
        </UserActivityProvider>
      </AuthProvider>
    </Router>
  );
};

export default App; 
