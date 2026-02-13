import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute Component
 *
 * Guards routes based on user roles.
 *
 * Props:
 * - requireOrganizer: Route requires organizer or admin role
 * - requireAdmin: Route requires admin role
 * - children: The protected content
 */
function ProtectedRoute({ children, requireOrganizer, requireAdmin }) {
  const { hasOrganizerAccess, hasAdminAccess, isMember } = useAuth();

  // Not logged in
  if (!isMember) {
    return <Navigate to="/" replace />;
  }

  // Requires admin but user is not admin
  if (requireAdmin && !hasAdminAccess) {
    return <AccessDenied requiredRole="Admin" />;
  }

  // Requires organizer but user is neither organizer nor admin
  if (requireOrganizer && !hasOrganizerAccess) {
    return <AccessDenied requiredRole="Organisator" />;
  }

  return children;
}

function AccessDenied({ requiredRole }) {
  return (
    <div style={{
      padding: 40,
      textAlign: 'center',
      maxWidth: 500,
      margin: '40px auto'
    }}>
      <div style={{
        fontSize: 48,
        marginBottom: 20
      }}>
        🚫
      </div>
      <h2 style={{ color: '#e74c3c', marginBottom: 16 }}>
        Zugriff verweigert
      </h2>
      <p style={{ color: '#7f8c8d', marginBottom: 24 }}>
        Sie benötigen die Rolle <strong>{requiredRole}</strong>, um auf diesen Bereich zuzugreifen.
      </p>
      <a
        href="/"
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          background: '#3498db',
          color: 'white',
          textDecoration: 'none',
          borderRadius: 4
        }}
      >
        Zurück zum Dashboard
      </a>
    </div>
  );
}

export default ProtectedRoute;
