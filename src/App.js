import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { EventProvider } from './context/EventContext';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import OrgUnitTree from './components/OrgUnitTree/OrgUnitTree';
import Profile from './components/Profile/Profile';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import OrganizerArea from './components/OrganizerArea/OrganizerArea';
import ZugangsverwaltungPage from './components/AdminArea/ZugangsverwaltungPage';
import OrganisationsstrukturPage from './components/AdminArea/OrganisationsstrukturPage';
import MemberManagement from './components/MemberManagement/MemberManagement';
import EventList from './components/Events/EventList';
import EventDetail from './components/Events/EventDetail';
import LoginPage from './components/Auth/LoginPage';
import './App.css';

function AuthGuard({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        color: '#6B7280',
      }}>
        Laden...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <EventProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <AuthGuard>
                  <Layout />
                </AuthGuard>
              }
            >
              {/* Public routes (for members) */}
              <Route index element={<Dashboard />} />
              <Route path="organisation" element={<OrgUnitTree />} />
              <Route path="profil" element={<Profile />} />
              <Route path="events" element={<EventList />} />
              <Route path="events/:eventId" element={<EventDetail />} />

              {/* Protected routes - Organizer */}
              <Route
                path="organizer"
                element={
                  <ProtectedRoute requireOrganizer>
                    <OrganizerArea />
                  </ProtectedRoute>
                }
              />
              <Route
                path="manage"
                element={
                  <ProtectedRoute requireOrganizer>
                    <MemberManagement />
                  </ProtectedRoute>
                }
              />

              {/* Protected routes - Admin */}
              <Route
                path="admin"
                element={<Navigate to="/admin/zugangsverwaltung" replace />}
              />
              <Route
                path="admin/zugangsverwaltung"
                element={
                  <ProtectedRoute requireAdmin>
                    <ZugangsverwaltungPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/organisationsstruktur"
                element={
                  <ProtectedRoute requireAdmin>
                    <OrganisationsstrukturPage />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </EventProvider>
    </AuthProvider>
  );
}

export default App;
