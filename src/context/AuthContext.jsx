import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { orgUnits as mockOrgUnits, getDescendants, buildOrgUnitMap } from '../data/mockData';
import { apiPost, apiGet } from '../lib/api';

const TOKEN_KEY = 'jmp_access_token';
const REFRESH_KEY = 'jmp_refresh_token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [orgUnits, setOrgUnits] = useState([]);

  // Build user object from /auth/me response format
  const buildUserFromMe = (meData) => ({
    id: meData.id,
    email: meData.email,
    firstName: meData.firstName || '',
    lastName: meData.lastName || '',
    name: [meData.firstName, meData.lastName].filter(Boolean).join(' ') || meData.email?.split('@')[0] || '',
    isAdmin: meData.isAdmin,
    memberships: (meData.orgUnits || []).map(m => ({
      orgUnitId: m.orgUnitId,
      role: m.role.toLowerCase(),
    })),
    profile: meData.profile || {},
    funktionen: [],
    ehrungen: [],
  });

  // Build user object from /auth/login response format
  const buildUserFromLogin = (loginData) => {
    const { user: u, managedOrgUnitIds = [], memberOrgUnitIds = [] } = loginData;
    const managedSet = new Set(managedOrgUnitIds);
    const memberships = [
      ...managedOrgUnitIds.map(id => ({ orgUnitId: id, role: 'organizer' })),
      ...memberOrgUnitIds.filter(id => !managedSet.has(id)).map(id => ({ orgUnitId: id, role: 'member' })),
    ];
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email?.split('@')[0] || '',
      isAdmin: u.isAdmin,
      memberships,
      profile: {},
      funktionen: [],
      ehrungen: [],
    };
  };

  // Load org units from backend; fall back to mock on error
  const loadOrgUnits = useCallback(async (token) => {
    try {
      const data = await apiGet('/org-units', token);
      if (Array.isArray(data) && data.length > 0) {
        setOrgUnits(data.map(row => ({
          id: row.id,
          name: row.name,
          level: row.level ? row.level.toLowerCase() : row.level,
          parentId: row.parentId ?? row.parent_id ?? null,
        })));
        return;
      }
    } catch {
      // fall through to mock
    }
    setOrgUnits(mockOrgUnits);
  }, []);

  // On mount: restore session from stored access token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setAuthLoading(false);
      return;
    }

    apiGet('/auth/me', token)
      .then(async (meData) => {
        setUser(buildUserFromMe(meData));
        await loadOrgUnits(token);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        setUser(null);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, [loadOrgUnits]);

  const login = useCallback(async (email, password) => {
    const data = await apiPost('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_KEY, data.refreshToken);
    const builtUser = buildUserFromLogin(data);
    setUser(builtUser);
    await loadOrgUnits(data.accessToken);
    setAuthLoading(false);
  }, [loadOrgUnits]);

  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      apiPost('/auth/logout', {}, token).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
  }, []);

  const authValue = useMemo(() => {
    const orgUnitMap = buildOrgUnitMap(orgUnits);

    const isAdmin = user?.isAdmin ?? false;
    const isOrganizer = user?.memberships?.some(m => m.role === 'organizer') ?? false;
    const isMember = !!user;

    const organizerOrgUnitIds = user?.memberships
      ?.filter(m => m.role === 'organizer')
      ?.map(m => m.orgUnitId) ?? [];

    const getManagedScope = () => {
      if (isAdmin) return orgUnits;
      const scopeSet = new Set();
      organizerOrgUnitIds.forEach(orgUnitId => {
        const descendants = getDescendants(orgUnitId, orgUnits);
        descendants.forEach(d => scopeSet.add(d.id));
      });
      return orgUnits.filter(u => scopeSet.has(u.id));
    };

    const canManageOrgUnit = (orgUnitId) => {
      if (isAdmin) return true;
      if (!isOrganizer) return false;
      for (const managedOrgId of organizerOrgUnitIds) {
        const descendants = getDescendants(managedOrgId, orgUnits);
        if (descendants.some(d => d.id === orgUnitId)) return true;
      }
      return false;
    };

    const canManageUser = (targetUser) => {
      if (isAdmin) return true;
      if (!isOrganizer) return false;
      const managedScope = getManagedScope();
      const managedOrgIds = managedScope.map(u => u.id);
      return targetUser.memberships.some(m => managedOrgIds.includes(m.orgUnitId));
    };

    const hasOrganizerAccess = isAdmin || isOrganizer;
    const hasAdminAccess = isAdmin;

    const getUserOrgUnits = () => {
      return user?.memberships?.map(m => ({
        ...orgUnitMap[m.orgUnitId],
        role: m.role,
      })).filter(Boolean) ?? [];
    };

    const updateMemberships = (newMemberships) => {
      setUser(prev => ({ ...prev, memberships: newMemberships }));
    };

    const updateProfile = (profileData) => {
      setUser(prev => ({
        ...prev,
        email: profileData.email || prev.email,
        profile: { ...prev.profile, ...profileData.profile },
      }));
    };

    return {
      user,
      setUser,
      authLoading,
      orgUnits,

      // Role flags
      isAdmin,
      isOrganizer,
      isMember,

      // Access checks
      hasOrganizerAccess,
      hasAdminAccess,

      // Scope management
      organizerOrgUnitIds,
      getManagedScope,
      canManageOrgUnit,
      canManageUser,
      getUserOrgUnits,

      // Actions
      login,
      logout,
      updateMemberships,
      updateProfile,
    };
  }, [user, authLoading, orgUnits, login, logout]);

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
