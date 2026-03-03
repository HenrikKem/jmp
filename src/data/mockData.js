/**
 * Mock Data for Development
 *
 * OrgUnit Hierarchy:
 * Federal (Bundesebene)
 *   └── State (Landesebene)
 *         └── Region (Regionalebene)
 *               └── District (Kreis)
 *                     └── Hegering
 *
 * Scope Logic:
 * - A user is "in scope" of an OrgUnit if they are a member of that OrgUnit
 *   OR any of its descendants.
 * - An organizer manages their assigned OrgUnit + all descendants.
 */

export const orgUnits = [
  // Federal Level
  {
    id: 'federal-1',
    name: 'Deutscher Jagdverband',
    level: 'federal',
    parentId: null,
  },

  // State Level
  {
    id: 'state-nrw',
    name: 'Landesjagdverband NRW',
    level: 'state',
    parentId: 'federal-1',
  },
  {
    id: 'state-bayern',
    name: 'Bayerischer Jagdverband',
    level: 'state',
    parentId: 'federal-1',
  },

  // Region Level
  {
    id: 'region-westfalen',
    name: 'Region Westfalen',
    level: 'region',
    parentId: 'state-nrw',
  },
  {
    id: 'region-rheinland',
    name: 'Region Rheinland',
    level: 'region',
    parentId: 'state-nrw',
  },
  {
    id: 'region-oberbayern',
    name: 'Region Oberbayern',
    level: 'region',
    parentId: 'state-bayern',
  },

  // District Level
  {
    id: 'district-muenster',
    name: 'Kreis Münster',
    level: 'district',
    parentId: 'region-westfalen',
  },
  {
    id: 'district-dortmund',
    name: 'Kreis Dortmund',
    level: 'district',
    parentId: 'region-westfalen',
  },
  {
    id: 'district-koeln',
    name: 'Kreis Köln',
    level: 'district',
    parentId: 'region-rheinland',
  },
  {
    id: 'district-muenchen',
    name: 'Kreis München',
    level: 'district',
    parentId: 'region-oberbayern',
  },

  // Hegering Level
  {
    id: 'hegering-ms-nord',
    name: 'Hegering Münster-Nord',
    level: 'hegering',
    parentId: 'district-muenster',
  },
  {
    id: 'hegering-ms-sued',
    name: 'Hegering Münster-Süd',
    level: 'hegering',
    parentId: 'district-muenster',
  },
  {
    id: 'hegering-do-mitte',
    name: 'Hegering Dortmund-Mitte',
    level: 'hegering',
    parentId: 'district-dortmund',
  },
  {
    id: 'hegering-koeln-ost',
    name: 'Hegering Köln-Ost',
    level: 'hegering',
    parentId: 'district-koeln',
  },
  {
    id: 'hegering-muc-zentrum',
    name: 'Hegering München-Zentrum',
    level: 'hegering',
    parentId: 'district-muenchen',
  },
];

// Level display names and order
export const orgUnitLevels = {
  federal: { name: 'Bundesebene', order: 0 },
  state: { name: 'Landesebene', order: 1 },
  region: { name: 'Regionalebene', order: 2 },
  district: { name: 'Kreis', order: 3 },
  hegering: { name: 'Hegering', order: 4 },
};

/**
 * Mock Events
 *
 * Event Scope Logic:
 * - An event has a scopeOrgId that defines who can see/register
 * - Users can see events where they are member of scopeOrgId OR any descendant
 * - Example: Event scoped to "Kreis Münster" is visible to members of
 *   Kreis Münster, Hegering Münster-Nord, and Hegering Münster-Süd
 */
export const events = [
  {
    id: 'event-1',
    name: 'Übungsschießen Frühjahr',
    description: 'Jährliches Übungsschießen für alle Mitglieder des Kreises Münster. Bitte eigene Munition mitbringen.',
    location: 'Schießstand Münster-Handorf',
    startDate: '2026-03-15T09:00:00',
    endDate: '2026-03-15T17:00:00',
    scopeOrgId: 'district-muenster',
    createdBy: 'user-1',
    isPublished: true,
  },
  {
    id: 'event-2',
    name: 'Hegering-Versammlung',
    description: 'Ordentliche Mitgliederversammlung des Hegerings Münster-Süd.',
    location: 'Gasthaus Zur Eiche, Münster',
    startDate: '2026-02-20T19:00:00',
    endDate: '2026-02-20T22:00:00',
    scopeOrgId: 'hegering-ms-sued',
    createdBy: 'user-1',
    isPublished: true,
  },
  {
    id: 'event-3',
    name: 'Landesjägertag NRW',
    description: 'Großveranstaltung des Landesjagdverbands NRW mit Vorträgen und Ausstellern.',
    location: 'Messe Dortmund',
    startDate: '2026-05-10T10:00:00',
    endDate: '2026-05-11T18:00:00',
    scopeOrgId: 'state-nrw',
    createdBy: 'user-1',
    isPublished: true,
  },
  {
    id: 'event-4',
    name: 'Revierpflege Workshop',
    description: 'Praktischer Workshop zur Revierpflege und Biotopgestaltung.',
    location: 'Revier Münster-Nord',
    startDate: '2026-04-05T08:00:00',
    endDate: '2026-04-05T14:00:00',
    scopeOrgId: 'hegering-ms-nord',
    createdBy: 'user-1',
    isPublished: true,
  },
  {
    id: 'event-5',
    name: 'Bundesjägertag',
    description: 'Jahreshauptversammlung des Deutschen Jagdverbands.',
    location: 'Berlin, Messe',
    startDate: '2026-06-20T09:00:00',
    endDate: '2026-06-21T17:00:00',
    scopeOrgId: 'federal-1',
    createdBy: 'user-1',
    isPublished: true,
  },
  {
    id: 'event-6',
    name: 'Schießtraining Bayern',
    description: 'Schießtraining für bayerische Jäger.',
    location: 'München Schießanlage',
    startDate: '2026-03-22T10:00:00',
    endDate: '2026-03-22T16:00:00',
    scopeOrgId: 'state-bayern',
    createdBy: 'user-1',
    isPublished: true,
  },
];

/**
 * Mock Groups
 *
 * Groups are capacity-limited units within an event.
 * - Optional start times (Decision: included as optional)
 * - Capacity must be > 0
 * - User must select a group when registering (if event has groups)
 */
export const groups = [
  // Groups for event-1 (Übungsschießen)
  {
    id: 'group-1a',
    eventId: 'event-1',
    name: 'Vormittag',
    capacity: 10,
    startTime: '2026-03-15T09:00:00',
  },
  {
    id: 'group-1b',
    eventId: 'event-1',
    name: 'Mittag',
    capacity: 10,
    startTime: '2026-03-15T12:00:00',
  },
  {
    id: 'group-1c',
    eventId: 'event-1',
    name: 'Nachmittag',
    capacity: 8,
    startTime: '2026-03-15T15:00:00',
  },

  // Groups for event-3 (Landesjägertag) - no start times
  {
    id: 'group-3a',
    eventId: 'event-3',
    name: 'Gruppe A',
    capacity: 50,
    startTime: null,
  },
  {
    id: 'group-3b',
    eventId: 'event-3',
    name: 'Gruppe B',
    capacity: 50,
    startTime: null,
  },

  // Groups for event-4 (Revierpflege Workshop) - small groups
  {
    id: 'group-4a',
    eventId: 'event-4',
    name: 'Gruppe 1',
    capacity: 5,
    startTime: '2026-04-05T08:00:00',
  },
  {
    id: 'group-4b',
    eventId: 'event-4',
    name: 'Gruppe 2',
    capacity: 5,
    startTime: '2026-04-05T11:00:00',
  },

  // event-2 and event-5 have no groups (single registration)
];

/**
 * Event Role Types (Fixed)
 *
 * Decision: Using fixed role types for simplicity.
 * These roles can be assigned per event to registered participants.
 */
export const eventRoleTypes = [
  { id: 'event-leader', name: 'Eventleiter', description: 'Verantwortlich für die Durchführung des Events' },
  { id: 'co-leader', name: 'Stellvertreter', description: 'Unterstützt den Eventleiter' },
  { id: 'instructor', name: 'Ausbilder', description: 'Führt Schulungen/Übungen durch' },
  { id: 'helper', name: 'Helfer', description: 'Unterstützt bei der Organisation' },
  { id: 'safety-officer', name: 'Sicherheitsbeauftragter', description: 'Verantwortlich für Sicherheit' },
];

/**
 * Event Role Assignments
 *
 * Links users to roles within specific events.
 * A user can have multiple roles per event.
 */
export const initialEventRoles = [
  // Roles for event-1 (Übungsschießen)
  {
    id: 'erole-1',
    eventId: 'event-1',
    userId: 'user-1',
    roleTypeId: 'event-leader',
    assignedAt: '2026-01-10T10:00:00',
    assignedBy: 'user-1',
  },
  {
    id: 'erole-2',
    eventId: 'event-1',
    userId: 'user-2',
    roleTypeId: 'safety-officer',
    assignedAt: '2026-01-10T10:05:00',
    assignedBy: 'user-1',
  },
  {
    id: 'erole-3',
    eventId: 'event-1',
    userId: 'user-3',
    roleTypeId: 'helper',
    assignedAt: '2026-01-10T10:10:00',
    assignedBy: 'user-1',
  },
  // Roles for event-2 (Hegering-Versammlung)
  {
    id: 'erole-4',
    eventId: 'event-2',
    userId: 'user-1',
    roleTypeId: 'event-leader',
    assignedAt: '2026-01-12T09:00:00',
    assignedBy: 'user-1',
  },
];

/**
 * Mock Registrations
 * Links users to events they registered for
 * Now includes groupId for events with groups
 */
export const initialRegistrations = [
  {
    id: 'reg-1',
    eventId: 'event-2',
    userId: 'user-1',
    groupId: null, // event-2 has no groups
    registeredAt: '2026-01-15T10:30:00',
    status: 'confirmed',
  },
  // Pre-fill some registrations to show capacity
  {
    id: 'reg-2',
    eventId: 'event-1',
    userId: 'user-2',
    groupId: 'group-1a',
    registeredAt: '2026-01-20T09:00:00',
    status: 'confirmed',
  },
  {
    id: 'reg-3',
    eventId: 'event-1',
    userId: 'user-3',
    groupId: 'group-1a',
    registeredAt: '2026-01-20T09:15:00',
    status: 'confirmed',
  },
  {
    id: 'reg-4',
    eventId: 'event-1',
    userId: 'user-4',
    groupId: 'group-1a',
    registeredAt: '2026-01-20T09:30:00',
    status: 'confirmed',
  },
  {
    id: 'reg-5',
    eventId: 'event-4',
    userId: 'user-5',
    groupId: 'group-4a',
    registeredAt: '2026-02-01T10:00:00',
    status: 'confirmed',
  },
  {
    id: 'reg-6',
    eventId: 'event-4',
    userId: 'user-6',
    groupId: 'group-4a',
    registeredAt: '2026-02-01T10:05:00',
    status: 'confirmed',
  },
  {
    id: 'reg-7',
    eventId: 'event-4',
    userId: 'user-7',
    groupId: 'group-4a',
    registeredAt: '2026-02-01T10:10:00',
    status: 'confirmed',
  },
  {
    id: 'reg-8',
    eventId: 'event-4',
    userId: 'user-8',
    groupId: 'group-4a',
    registeredAt: '2026-02-01T10:15:00',
    status: 'confirmed',
  },
  {
    id: 'reg-9',
    eventId: 'event-4',
    userId: 'user-9',
    groupId: 'group-4a',
    registeredAt: '2026-02-01T10:20:00',
    status: 'confirmed',
  },
  // group-4a is now FULL (5/5)
];

/**
 * Qualification labels (German display names)
 */
export const qualificationLabels = {
  jagdpaechter: 'Jagdpächter',
  begegnungsscheininhaber: 'Begegnungsscheininhaber',
  hundefuehrer: 'Hundeführer',
  hundpruefungsarten: 'Hundprüfungsarten',
  bestaetigterJagdaufseher: 'Bestätigter Jagdaufseher',
  fallenlehrgang: 'Fallenlehrgang',
  jagdhorn: 'Jagdhorn',
  drohnenfuehrerschein: 'Drohnenführerschein',
  schiessleistungsnadel: 'Schießleistungsnadel',
  aktivMitglied: 'Aktives Mitglied',
};

/**
 * Dog test types for Hundprüfungsarten multi-select
 */
export const hundpruefungsartenOptions = [
  'VJP', 'HZP', 'VGP', 'VSwP', 'Btr', 'Sw/K', 'Spur/F',
];

/**
 * Mock Members with enriched data for Member Management
 *
 * Fields:
 * - membershipDates: { orgUnitId: 'YYYY-MM-DD' } — when user joined each OrgUnit
 * - firstHuntingLicenseDate: date of first hunting license
 * - qualifications: boolean flags + multi-select for hunting qualifications
 */
export const mockMembers = [
  {
    id: 'user-1',
    name: 'Max Mustermann',
    email: 'max.mustermann@example.com',
    phone: '+49 123 456789',
    orgUnitIds: ['hegering-ms-nord', 'hegering-ms-sued'],
    membershipDates: {
      'hegering-ms-nord': '2012-04-01',
      'hegering-ms-sued': '2018-01-15',
      'state-nrw': '2012-04-01',
    },
    firstHuntingLicenseDate: '2010-06-01',
    qualifications: {
      jagdpaechter: true,
      begegnungsscheininhaber: false,
      hundefuehrer: true,
      hundpruefungsarten: ['VGP', 'VSwP'],
      bestaetigterJagdaufseher: false,
      fallenlehrgang: true,
      jagdhorn: false,
      drohnenfuehrerschein: false,
      schiessleistungsnadel: 'gold',
      aktivMitglied: true,
    },
  },
  {
    id: 'user-2',
    name: 'Anna Schmidt',
    email: 'anna.schmidt@example.com',
    phone: '+49 234 567890',
    orgUnitIds: ['hegering-ms-nord'],
    membershipDates: {
      'hegering-ms-nord': '2019-09-01',
      'state-nrw': '2019-09-01',
    },
    firstHuntingLicenseDate: '2018-03-15',
    qualifications: {
      jagdpaechter: false,
      begegnungsscheininhaber: false,
      hundefuehrer: false,
      hundpruefungsarten: [],
      bestaetigterJagdaufseher: false,
      fallenlehrgang: false,
      jagdhorn: true,
      drohnenfuehrerschein: true,
      schiessleistungsnadel: null,
      aktivMitglied: true,
    },
  },
  {
    id: 'user-3',
    name: 'Peter Müller',
    email: 'peter.mueller@example.com',
    phone: '+49 345 678901',
    orgUnitIds: ['hegering-ms-sued'],
    membershipDates: {
      'hegering-ms-sued': '2005-03-01',
      'state-nrw': '2005-03-01',
    },
    firstHuntingLicenseDate: '2000-09-01',
    qualifications: {
      jagdpaechter: true,
      begegnungsscheininhaber: true,
      hundefuehrer: true,
      hundpruefungsarten: ['VJP', 'HZP', 'VGP'],
      bestaetigterJagdaufseher: true,
      fallenlehrgang: true,
      jagdhorn: true,
      drohnenfuehrerschein: false,
      schiessleistungsnadel: 'silber',
      aktivMitglied: true,
    },
  },
  {
    id: 'user-4',
    name: 'Lisa Weber',
    email: 'lisa.weber@example.com',
    phone: '+49 456 789012',
    orgUnitIds: ['hegering-do-mitte'],
    membershipDates: {
      'hegering-do-mitte': '2020-06-15',
      'state-nrw': '2020-06-15',
    },
    firstHuntingLicenseDate: '2019-11-01',
    qualifications: {
      jagdpaechter: false,
      begegnungsscheininhaber: false,
      hundefuehrer: false,
      hundpruefungsarten: [],
      bestaetigterJagdaufseher: false,
      fallenlehrgang: false,
      jagdhorn: false,
      drohnenfuehrerschein: true,
      schiessleistungsnadel: null,
      aktivMitglied: true,
    },
  },
  {
    id: 'user-5',
    name: 'Thomas Braun',
    email: 'thomas.braun@example.com',
    phone: '+49 567 890123',
    orgUnitIds: ['hegering-koeln-ost'],
    membershipDates: {
      'hegering-koeln-ost': '2008-01-10',
      'state-nrw': '2008-01-10',
    },
    firstHuntingLicenseDate: '2005-04-01',
    qualifications: {
      jagdpaechter: false,
      begegnungsscheininhaber: true,
      hundefuehrer: true,
      hundpruefungsarten: ['VJP', 'Btr'],
      bestaetigterJagdaufseher: false,
      fallenlehrgang: true,
      jagdhorn: false,
      drohnenfuehrerschein: false,
      schiessleistungsnadel: 'bronze',
      aktivMitglied: true,
    },
  },
  {
    id: 'user-6',
    name: 'Julia Klein',
    email: 'julia.klein@example.com',
    phone: '+49 678 901234',
    orgUnitIds: ['district-muenster'],
    membershipDates: {
      'district-muenster': '2017-05-01',
      'state-nrw': '2017-05-01',
    },
    firstHuntingLicenseDate: '2015-08-01',
    qualifications: {
      jagdpaechter: false,
      begegnungsscheininhaber: false,
      hundefuehrer: false,
      hundpruefungsarten: [],
      bestaetigterJagdaufseher: true,
      fallenlehrgang: true,
      jagdhorn: true,
      drohnenfuehrerschein: false,
      schiessleistungsnadel: null,
      aktivMitglied: true,
    },
  },
  {
    id: 'user-7',
    name: 'Heinrich Förster',
    email: 'heinrich.foerster@example.com',
    phone: '+49 789 012345',
    orgUnitIds: ['hegering-ms-nord'],
    membershipDates: {
      'hegering-ms-nord': '1998-02-01',
      'state-nrw': '1998-02-01',
    },
    firstHuntingLicenseDate: '1990-05-15',
    qualifications: {
      jagdpaechter: true,
      begegnungsscheininhaber: true,
      hundefuehrer: true,
      hundpruefungsarten: ['VJP', 'HZP', 'VGP', 'VSwP', 'Btr'],
      bestaetigterJagdaufseher: true,
      fallenlehrgang: true,
      jagdhorn: true,
      drohnenfuehrerschein: false,
      schiessleistungsnadel: 'gold',
      aktivMitglied: true,
    },
  },
  {
    id: 'user-8',
    name: 'Sabine Richter',
    email: 'sabine.richter@example.com',
    phone: '+49 890 123456',
    orgUnitIds: ['hegering-ms-sued'],
    membershipDates: {
      'hegering-ms-sued': '2021-11-01',
      'state-nrw': '2021-11-01',
    },
    firstHuntingLicenseDate: '2021-09-15',
    qualifications: {
      jagdpaechter: false,
      begegnungsscheininhaber: false,
      hundefuehrer: false,
      hundpruefungsarten: [],
      bestaetigterJagdaufseher: false,
      fallenlehrgang: false,
      jagdhorn: false,
      drohnenfuehrerschein: false,
      schiessleistungsnadel: null,
      aktivMitglied: true,
    },
  },
  {
    id: 'user-9',
    name: 'Karl Weidmann',
    email: 'karl.weidmann@example.com',
    phone: '+49 901 234567',
    orgUnitIds: ['hegering-ms-nord', 'district-muenster'],
    membershipDates: {
      'hegering-ms-nord': '2010-07-01',
      'district-muenster': '2015-01-01',
      'state-nrw': '2010-07-01',
    },
    firstHuntingLicenseDate: '2008-03-01',
    qualifications: {
      jagdpaechter: true,
      begegnungsscheininhaber: false,
      hundefuehrer: true,
      hundpruefungsarten: ['VGP', 'Sw/K'],
      bestaetigterJagdaufseher: false,
      fallenlehrgang: true,
      jagdhorn: false,
      drohnenfuehrerschein: true,
      schiessleistungsnadel: 'silber',
      aktivMitglied: false,
    },
  },
  {
    id: 'user-10',
    name: 'Maria Jäger',
    email: 'maria.jaeger@example.com',
    phone: '+49 012 345678',
    orgUnitIds: ['hegering-muc-zentrum'],
    membershipDates: {
      'hegering-muc-zentrum': '2016-03-01',
      'state-bayern': '2016-03-01',
    },
    firstHuntingLicenseDate: '2014-06-01',
    qualifications: {
      jagdpaechter: false,
      begegnungsscheininhaber: false,
      hundefuehrer: true,
      hundpruefungsarten: ['VJP', 'HZP'],
      bestaetigterJagdaufseher: false,
      fallenlehrgang: false,
      jagdhorn: true,
      drohnenfuehrerschein: false,
      schiessleistungsnadel: 'bronze',
      aktivMitglied: true,
    },
  },
];

// Mock current user
export const currentUser = {
  id: 'user-1',
  email: 'max.mustermann@example.com',
  isAdmin: false,
  profile: {
    phone: '+49 123 456789',
    street: 'Musterstraße 1',
    city: 'Münster',
    postalCode: '48149',
    country: 'Germany',
    dateOfBirth: '1985-03-15',
    gender: 'male',
    huntingLicenseDate: '2010-06-01',
  },
  // User's OrgUnit memberships with roles
  memberships: [
    { orgUnitId: 'hegering-ms-nord', role: 'member' },
    { orgUnitId: 'hegering-ms-sued', role: 'organizer' },
  ],
};

/**
 * Utility Functions for Scope Logic
 */

// Build a lookup map for quick access
export function buildOrgUnitMap(units) {
  return units.reduce((map, unit) => {
    map[unit.id] = unit;
    return map;
  }, {});
}

// Get all descendants of an OrgUnit (including self)
export function getDescendants(orgUnitId, units) {
  const result = [];
  const unitMap = buildOrgUnitMap(units);

  function collect(id) {
    const unit = unitMap[id];
    if (!unit) return;
    result.push(unit);

    // Find children
    units
      .filter(u => u.parentId === id)
      .forEach(child => collect(child.id));
  }

  collect(orgUnitId);
  return result;
}

// Get all ancestors of an OrgUnit (including self)
export function getAncestors(orgUnitId, units) {
  const result = [];
  const unitMap = buildOrgUnitMap(units);

  let current = unitMap[orgUnitId];
  while (current) {
    result.push(current);
    current = current.parentId ? unitMap[current.parentId] : null;
  }

  return result;
}

// Check if user is in scope of an OrgUnit
// (user is member of that OrgUnit or any descendant)
export function isUserInScope(user, orgUnitId, units) {
  const descendants = getDescendants(orgUnitId, units);
  const descendantIds = descendants.map(d => d.id);

  return user.memberships.some(m => descendantIds.includes(m.orgUnitId));
}

// Get OrgUnits that user can manage (as organizer)
export function getManagedOrgUnits(user, units) {
  const organizerMemberships = user.memberships.filter(m => m.role === 'organizer');

  const managedUnits = [];
  organizerMemberships.forEach(m => {
    const descendants = getDescendants(m.orgUnitId, units);
    descendants.forEach(d => {
      if (!managedUnits.find(u => u.id === d.id)) {
        managedUnits.push(d);
      }
    });
  });

  return managedUnits;
}

// Build tree structure from flat list
export function buildTree(units) {
  const unitMap = buildOrgUnitMap(units);
  const roots = [];

  units.forEach(unit => {
    if (!unit.parentId) {
      roots.push(buildTreeNode(unit, units, unitMap));
    }
  });

  return roots;
}

function buildTreeNode(unit, allUnits, unitMap) {
  const children = allUnits
    .filter(u => u.parentId === unit.id)
    .map(child => buildTreeNode(child, allUnits, unitMap));

  return {
    ...unit,
    children,
  };
}
