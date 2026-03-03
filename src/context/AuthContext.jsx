import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  currentUser as initialUser,
  orgUnits,
  getDescendants,
  buildOrgUnitMap
} from '../data/mockData';

/**
 * Demo Users for Role Switching
 */
const demoUsers = {
  member: {
    id: 'user-demo-member',
    email: 'mitglied@example.com',
    isAdmin: false,
    profile: {
      anrede: 'Frau',
      titel: '',
      briefanrede: 'Sehr geehrte Frau Mustermitglied',
      berufsgruppe: '',
      geburtsort: '',
      nationalitaet: 'Deutschland',
      telefonPrivat: '+49 111 111111',
      telefonDienstlich: '',
      handy: '',
      street: 'Mitgliedstraße 1',
      postalCode: '48149',
      city: 'Münster',
      land: 'Deutschland',
      bezirk: '',
      hasPostalAddress: false,
      postStrasse: '',
      postPlz: '',
      postOrt: '',
      postLand: 'Deutschland',
      dateOfBirth: '1990-05-20',
      gender: 'female',
      huntingLicenseDate: '2015-03-01',
    },
    memberships: [
      { orgUnitId: 'hegering-ms-nord', role: 'member' },
    ],
    funktionen: [],
    ehrungen: [],
    externeMitgliedsnummer: 'DEMO-001',
    bemerkungen: '',
    istExternesMitglied: false,
  },
  organizer: {
    id: 'user-demo-organizer',
    email: 'organisator@example.com',
    isAdmin: false,
    profile: {
      anrede: 'Herr',
      titel: '',
      briefanrede: 'Sehr geehrter Herr Musterorganisator',
      berufsgruppe: '',
      geburtsort: '',
      nationalitaet: 'Deutschland',
      telefonPrivat: '+49 222 222222',
      telefonDienstlich: '',
      handy: '',
      street: 'Organisatorweg 2',
      postalCode: '48149',
      city: 'Münster',
      land: 'Deutschland',
      bezirk: '',
      hasPostalAddress: false,
      postStrasse: '',
      postPlz: '',
      postOrt: '',
      postLand: 'Deutschland',
      dateOfBirth: '1985-03-15',
      gender: 'male',
      huntingLicenseDate: '2010-06-01',
    },
    memberships: [
      { orgUnitId: 'hegering-ms-nord', role: 'member' },
      { orgUnitId: 'hegering-ms-sued', role: 'organizer' },
    ],
    funktionen: [
      { funktionsname: 'Hegeringleiter', vonDatum: '2020-01-01', bisDatum: '', orgUnitId: 'hegering-ms-sued' },
    ],
    ehrungen: [],
    externeMitgliedsnummer: 'DEMO-002',
    bemerkungen: '',
    istExternesMitglied: false,
  },
  admin: {
    id: 'user-demo-admin',
    email: 'admin@example.com',
    isAdmin: true,
    profile: {
      anrede: 'Herr',
      titel: '',
      briefanrede: 'Sehr geehrter Herr Administrator',
      berufsgruppe: '',
      geburtsort: '',
      nationalitaet: 'Deutschland',
      telefonPrivat: '+49 333 333333',
      telefonDienstlich: '',
      handy: '',
      street: 'Adminplatz 3',
      postalCode: '10115',
      city: 'Berlin',
      land: 'Deutschland',
      bezirk: '',
      hasPostalAddress: false,
      postStrasse: '',
      postPlz: '',
      postOrt: '',
      postLand: 'Deutschland',
      dateOfBirth: '1980-01-01',
      gender: 'male',
      huntingLicenseDate: '2005-01-01',
    },
    memberships: [
      { orgUnitId: 'federal-1', role: 'organizer' },
    ],
    funktionen: [],
    ehrungen: [],
    externeMitgliedsnummer: 'ADMIN-001',
    bemerkungen: '',
    istExternesMitglied: false,
  },
};

/**
 * AuthContext
 *
 * Provides centralized role and permission management.
 *
 * Role Model:
 * - Member: Basic user, can view eligible events and manage own profile
 * - Organizer: Manages one or more OrgUnits + all descendants
 * - Admin: Global access, no scope restrictions
 *
 * Scope Rules:
 * - An organizer's scope includes their assigned OrgUnit(s) and ALL descendants
 * - A user can be organizer for multiple OrgUnits (see DB_info.md Decision D2)
 * - Scope checks always include the full descendant tree
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(initialUser);

  const authValue = useMemo(() => {
    const orgUnitMap = buildOrgUnitMap(orgUnits);

    // Role checks
    const isAdmin = user?.isAdmin ?? false;
    const isOrganizer = user?.memberships?.some(m => m.role === 'organizer') ?? false;
    const isMember = !!user;

    // Get all OrgUnits where user is organizer
    const organizerOrgUnitIds = user?.memberships
      ?.filter(m => m.role === 'organizer')
      ?.map(m => m.orgUnitId) ?? [];

    // Get full scope (all managed OrgUnits including descendants)
    const getManagedScope = () => {
      if (isAdmin) {
        // Admin manages everything
        return orgUnits;
      }

      const scopeSet = new Set();
      organizerOrgUnitIds.forEach(orgUnitId => {
        const descendants = getDescendants(orgUnitId, orgUnits);
        descendants.forEach(d => scopeSet.add(d.id));
      });

      return orgUnits.filter(u => scopeSet.has(u.id));
    };

    // Check if user can manage a specific OrgUnit
    const canManageOrgUnit = (orgUnitId) => {
      if (isAdmin) return true;
      if (!isOrganizer) return false;

      // Check if orgUnitId is in any of the organizer's scopes
      for (const managedOrgId of organizerOrgUnitIds) {
        const descendants = getDescendants(managedOrgId, orgUnits);
        if (descendants.some(d => d.id === orgUnitId)) {
          return true;
        }
      }
      return false;
    };

    // Check if user can manage a specific user (based on their memberships)
    const canManageUser = (targetUser) => {
      if (isAdmin) return true;
      if (!isOrganizer) return false;

      // Can manage if any of target user's memberships are in organizer's scope
      const managedScope = getManagedScope();
      const managedOrgIds = managedScope.map(u => u.id);

      return targetUser.memberships.some(m => managedOrgIds.includes(m.orgUnitId));
    };

    // Check if user has access to organizer area
    const hasOrganizerAccess = isAdmin || isOrganizer;

    // Check if user has access to admin area
    const hasAdminAccess = isAdmin;

    // Get user's membership OrgUnits
    const getUserOrgUnits = () => {
      return user?.memberships?.map(m => ({
        ...orgUnitMap[m.orgUnitId],
        role: m.role
      })).filter(Boolean) ?? [];
    };

    // Update user memberships
    const updateMemberships = (newMemberships) => {
      setUser(prev => ({
        ...prev,
        memberships: newMemberships
      }));
    };

    // Update user profile data
    const updateProfile = (profileData) => {
      setUser(prev => ({
        ...prev,
        email: profileData.email || prev.email,
        profile: {
          ...prev.profile,
          ...profileData.profile
        }
      }));
    };

    return {
      user,
      setUser,

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
      updateMemberships,
      updateProfile,

      // Demo mode
      demoUsers,
    };
  }, [user]);

  // Switch demo role
  const switchDemoRole = useCallback((role) => {
    if (demoUsers[role]) {
      setUser(demoUsers[role]);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...authValue, switchDemoRole }}>
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
