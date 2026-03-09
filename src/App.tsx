import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LandingPage from './LandingPage';
import CheckInPage from './pages/CheckInPage';
import ARMenuPage from './pages/ARMenuPage';
import BusinessLandingPage from './BusinessLandingPage';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import DashboardPage from './pages/DashboardPage';
import RestaurantDetails from './pages/RestaurantDetails';
import ReservationPreview from './pages/ReservationPreview';
import TableSelection from './pages/TableSelection';
import ReservationDetailsPage from './pages/ReservationDetailsPage';
import TermsPage from './TermsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import UserFeedbackForm from './components/UserFeedbackForm';
import FoodMenu from './pages/FoodMenu';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminNotificationsPage from './pages/AdminNotificationsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminBusinessesPage from './pages/AdminBusinessesPage';
import AdminManagementPage from './pages/AdminManagementPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import AdminSystemHealthPage from './pages/AdminSystemHealthPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminIssueReportsPage from './pages/AdminIssueReportsPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import MaintenancePage from './pages/MaintenancePage';
import MaintenanceCheck from './components/MaintenanceCheck';
import AuthActionHandler from './pages/AuthActionHandler';
import EventRegistration from './pages/EventRegistration';
import EventPreview from './pages/EventPreview';
import EventsPage from './pages/EventsPage';
import BusinessLayout from './layouts/BusinessLayout';
import AdminLayout from './layouts/AdminLayout';
import BusinessLogin from './pages/business/BusinessLogin';
import BusinessSignup from './pages/business/BusinessSignup';
import ForgotPassword from './pages/business/ForgotPassword';
import OwnerDashboard from './pages/business/OwnerDashboard';
import ManageRestaurant from './pages/business/ManageRestaurant';
import RestaurantOnboarding from './pages/business/RestaurantOnboarding';
import BusinessOnboarding from './pages/business/BusinessOnboarding';
import BusinessDashboard from './pages/business/BusinessDashboard';
import BusinessNotifications from './components/BusinessNotifications';
import PayoutDashboard from './pages/business/PayoutDashboard';
import InvoiceManagement from './pages/business/InvoiceManagement';
import POSSettings from './pages/business/POSSettings';
import DigitalMenuEditor from './pages/business/DigitalMenuEditor';
import WaitlistManagement from './pages/business/WaitlistManagement';
import DebugTableUnblock from './pages/DebugTableUnblock';
import PreOrderManagement from './pages/business/PreOrderManagement';
import BookingManagement from './pages/business/BookingManagement';
import FloorPlanManagement from './pages/business/FloorPlanManagement';
import BusinessSettings from './pages/business/BusinessSettings';
import EventsManagement from './pages/business/EventsManagement';
import ProtectedBusinessRoute from './components/ProtectedBusinessRoute';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import CustomerRoute from './components/CustomerRoute';
import { UserActivityProvider } from './contexts/UserActivityContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AuthProvider } from './contexts/AuthContext';
import AIChatbot from './components/AIChatbot';
import FloorPlanDesigner from './components/FloorPlanDesigner';
import EventSeatingDesigner from './components/EventSeatingDesigner';
import OnboardingPage from './pages/OnboardingPage';

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
            <MaintenanceCheck>
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
                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route path="/" element={<LandingPage />} />

                {/* Business Landing Page (Public) */}
                <Route path="/business" element={<BusinessLandingPage />} />

                {/* Business Auth Routes (Public) */}
                <Route path="/business/businessLogin" element={<BusinessLogin />} />
                <Route path="/business/businessSignup" element={<BusinessSignup />} />
                <Route path="/business/forgot-password" element={<ForgotPassword />} />

                {/* Redirect /business/dashboard to /business/app/dashboard */}
                <Route path="/business/dashboard" element={<Navigate to="/business/app/dashboard" replace />} />
                <Route path="/business/onboarding" element={<Navigate to="/business/app/onboarding" replace />} />
                <Route path="/business/edit/:id" element={<Navigate to="/business/app/edit/:id" replace />} />
                <Route path="/business/view/:id" element={<Navigate to="/business/app/view/:id" replace />} />

                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/feedback" element={<UserFeedbackForm />} />
                <Route path="/test-floor-designer" element={<FloorPlanDesigner />} />
                <Route path="/test-event-designer" element={<EventSeatingDesigner />} />
                <Route path="/debug-unblock" element={<DebugTableUnblock />} />
                <Route path="/auth/action" element={<AuthActionHandler />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/check-in/:bookingId" element={<CheckInPage />} />
                <Route path="/ar-experience/:bookingId" element={<ARMenuPage />} />

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

                <Route path="/admin-login" element={<AdminLoginPage />} />

                {/* Admin Protected Routes */}
                <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="notifications" element={<AdminNotificationsPage />} />
                  <Route path="businesses" element={<AdminBusinessesPage />} />
                  <Route path="team" element={<AdminManagementPage />} />
                  <Route path="analytics" element={<AdminAnalyticsPage />} />
                  <Route path="system" element={<AdminSystemHealthPage />} />
                  <Route path="reports" element={<AdminReportsPage />} />
                  <Route path="issues" element={<AdminIssueReportsPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>

                <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />

                {/* Business Protected Routes */}
                <Route path="/business/app" element={<ProtectedBusinessRoute />}>
                  <Route element={<BusinessLayout />}>
                    <Route index element={<BusinessDashboard />} />
                    <Route path="dashboard" element={<BusinessDashboard />} />
                    <Route path="notifications" element={<BusinessNotifications />} />
                    <Route path="onboarding" element={<BusinessOnboarding />} />
                    <Route path="edit/:id" element={<BusinessOnboarding />} />
                    <Route path="view/:id" element={<BusinessOnboarding />} />
                    <Route path="bookings" element={<BookingManagement />} />
                    <Route path="reservations" element={<BookingManagement />} />
                    <Route path="floor-plans" element={<FloorPlanManagement />} />
                    <Route path="event-seating" element={<EventSeatingDesigner />} />
                    <Route path="settings" element={<BusinessSettings />} />
                    <Route path="payouts" element={<PayoutDashboard />} />
                    <Route path="invoices" element={<InvoiceManagement />} />
                    <Route path="pos-settings" element={<POSSettings />} />
                    <Route path="manage/:id" element={<ManageRestaurant />} />
                    <Route path="manage/:id" element={<ManageRestaurant />} />
                    <Route path="restaurants" element={<OwnerDashboard />} />
                    <Route path="menu" element={<DigitalMenuEditor />} />
                    <Route path="waitlist" element={<WaitlistManagement />} />
                    <Route path="waitlist" element={<WaitlistManagement />} />
                    <Route path="pre-orders" element={<PreOrderManagement />} />
                    <Route path="events" element={<EventsManagement />} />

                    {/* Legacy routes for backward compatibility */}
                    <Route path="legacy-onboarding" element={<RestaurantOnboarding />} />
                    <Route path="legacy-dashboard" element={<OwnerDashboard />} />
                  </Route>
                </Route>
              </Routes>
            </MaintenanceCheck>
          </NotificationProvider>
        </UserActivityProvider>
      </AuthProvider>
    </Router>
  );
};

export default App; 
