import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { EventProvider } from './context/EventContext';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import OrgUnitTree from './components/OrgUnitTree/OrgUnitTree';
import Profile from './components/Profile/Profile';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import OrganizerArea from './components/OrganizerArea/OrganizerArea';
import AdminArea from './components/AdminArea/AdminArea';
import EventList from './components/Events/EventList';
import EventDetail from './components/Events/EventDetail';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <EventProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
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

              {/* Protected routes - Admin */}
              <Route
                path="admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminArea />
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
