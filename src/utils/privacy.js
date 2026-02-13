/**
 * Privacy Utilities
 *
 * GDPR-compliant data handling utilities for the application.
 * Implements data minimization principles and controls what personal data is shown where.
 *
 * Data Classification:
 * - PII (Personally Identifiable Information): email, phone, address, dateOfBirth
 * - Sensitive PII: huntingLicenseDate (implies profession/activity)
 * - Non-PII: userId, orgUnitId, role, registrationStatus
 *
 * Visibility Rules:
 * - Own data: User can see all their own data
 * - Same OrgUnit: Can see name, email (for coordination)
 * - Organizer scope: Can see name, email, phone (for event management)
 * - Admin: Can see all data (with audit logging in production)
 */

/**
 * Data visibility levels
 */
export const VisibilityLevel = {
  NONE: 'none',           // No access
  MINIMAL: 'minimal',     // Name only
  BASIC: 'basic',         // Name + email
  ORGANIZER: 'organizer', // Name + email + phone
  FULL: 'full',           // All data (own data or admin)
};

/**
 * Determine visibility level based on viewer and target user relationship
 *
 * @param {Object} viewer - The user viewing the data
 * @param {Object} targetUser - The user whose data is being viewed
 * @param {Object} context - Additional context (isAdmin, isOrganizer, sharedOrgUnits)
 * @returns {string} VisibilityLevel
 */
export function getVisibilityLevel(viewer, targetUser, context = {}) {
  const { isAdmin, isOrganizer, canManageUser } = context;

  // Own data - full access
  if (viewer?.id === targetUser?.id) {
    return VisibilityLevel.FULL;
  }

  // Admin - full access (should be audit-logged in production)
  if (isAdmin) {
    return VisibilityLevel.FULL;
  }

  // Organizer with management rights over the user
  if (isOrganizer && canManageUser) {
    return VisibilityLevel.ORGANIZER;
  }

  // Same organization - basic contact info
  if (context.sharedOrgUnits?.length > 0) {
    return VisibilityLevel.BASIC;
  }

  // Default - minimal (name only for event participant lists, etc.)
  return VisibilityLevel.MINIMAL;
}

/**
 * Mask an email address for privacy
 * Example: max.mustermann@example.com -> m***@e***.com
 *
 * @param {string} email - Email to mask
 * @returns {string} Masked email
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return '***@***.***';

  const [local, domain] = email.split('@');
  if (!domain) return '***@***.***';

  const [domainName, tld] = domain.split('.');

  const maskedLocal = local.charAt(0) + '***';
  const maskedDomain = domainName.charAt(0) + '***';

  return `${maskedLocal}@${maskedDomain}.${tld || '***'}`;
}

/**
 * Mask a phone number for privacy
 * Example: +49 123 456789 -> +49 *** ***789
 *
 * @param {string} phone - Phone number to mask
 * @returns {string} Masked phone
 */
export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '*** *** ****';

  // Keep last 3 digits visible
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '*** *** ****';

  const lastThree = digits.slice(-3);
  return `*** *** ***${lastThree}`;
}

/**
 * Mask a date of birth for privacy
 * Example: 1985-03-15 -> **.**. 1985
 *
 * @param {string} dateStr - Date string to mask
 * @returns {string} Masked date (year only)
 */
export function maskDateOfBirth(dateStr) {
  if (!dateStr) return '**.**.****';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '**.**.****';

  return `**.**. ${date.getFullYear()}`;
}

/**
 * Mask an address for privacy
 *
 * @param {Object} address - Address object { street, city, postalCode }
 * @param {string} level - 'full', 'city', 'none'
 * @returns {Object} Masked address
 */
export function maskAddress(address, level = 'city') {
  if (!address) {
    return { street: '***', city: '***', postalCode: '***' };
  }

  switch (level) {
    case 'full':
      return address;
    case 'city':
      return {
        street: '***',
        city: address.city || '***',
        postalCode: address.postalCode ? address.postalCode.slice(0, 2) + '***' : '***',
      };
    case 'none':
    default:
      return { street: '***', city: '***', postalCode: '***' };
  }
}

/**
 * Filter user data based on visibility level
 *
 * @param {Object} userData - Full user data object
 * @param {string} visibilityLevel - VisibilityLevel constant
 * @returns {Object} Filtered user data
 */
export function filterUserData(userData, visibilityLevel) {
  if (!userData) return null;

  switch (visibilityLevel) {
    case VisibilityLevel.FULL:
      return userData;

    case VisibilityLevel.ORGANIZER:
      return {
        id: userData.id,
        name: userData.name || userData.email?.split('@')[0],
        email: userData.email,
        phone: userData.profile?.phone,
        // Masked fields
        dateOfBirth: maskDateOfBirth(userData.profile?.dateOfBirth),
        address: maskAddress(userData.profile, 'city'),
        // Hidden fields
        huntingLicenseDate: null,
      };

    case VisibilityLevel.BASIC:
      return {
        id: userData.id,
        name: userData.name || userData.email?.split('@')[0],
        email: userData.email,
        // All other fields hidden or masked
        phone: maskPhone(userData.profile?.phone),
        dateOfBirth: null,
        address: null,
        huntingLicenseDate: null,
      };

    case VisibilityLevel.MINIMAL:
      return {
        id: userData.id,
        name: userData.name || `Benutzer ${userData.id?.replace('user-', '')}`,
        // All PII hidden
        email: null,
        phone: null,
        dateOfBirth: null,
        address: null,
        huntingLicenseDate: null,
      };

    case VisibilityLevel.NONE:
    default:
      return {
        id: userData.id,
        name: 'Anonymer Benutzer',
      };
  }
}

/**
 * Check if a field should be displayed based on visibility level
 *
 * @param {string} fieldName - Name of the field
 * @param {string} visibilityLevel - VisibilityLevel constant
 * @returns {boolean} Whether the field should be displayed
 */
export function shouldShowField(fieldName, visibilityLevel) {
  const fieldVisibility = {
    name: [VisibilityLevel.MINIMAL, VisibilityLevel.BASIC, VisibilityLevel.ORGANIZER, VisibilityLevel.FULL],
    email: [VisibilityLevel.BASIC, VisibilityLevel.ORGANIZER, VisibilityLevel.FULL],
    phone: [VisibilityLevel.ORGANIZER, VisibilityLevel.FULL],
    dateOfBirth: [VisibilityLevel.FULL],
    address: [VisibilityLevel.ORGANIZER, VisibilityLevel.FULL],
    huntingLicenseDate: [VisibilityLevel.FULL],
  };

  const allowedLevels = fieldVisibility[fieldName] || [VisibilityLevel.FULL];
  return allowedLevels.includes(visibilityLevel);
}

/**
 * Auditable actions for GDPR compliance
 * These actions should be logged in a production environment
 */
export const AuditableActions = {
  // User data access
  VIEW_USER_PROFILE: 'view_user_profile',
  VIEW_USER_LIST: 'view_user_list',
  EXPORT_USER_DATA: 'export_user_data',

  // User data modifications
  UPDATE_USER_PROFILE: 'update_user_profile',
  DELETE_USER_ACCOUNT: 'delete_user_account',

  // Registration actions
  REGISTER_FOR_EVENT: 'register_for_event',
  UNREGISTER_FROM_EVENT: 'unregister_from_event',

  // Role assignments
  ASSIGN_ROLE: 'assign_role',
  REMOVE_ROLE: 'remove_role',

  // Event management
  CREATE_EVENT: 'create_event',
  UPDATE_EVENT: 'update_event',
  DELETE_EVENT: 'delete_event',

  // Admin actions
  ADMIN_VIEW_USER: 'admin_view_user',
  ADMIN_MODIFY_USER: 'admin_modify_user',
  ADMIN_EXPORT_DATA: 'admin_export_data',
};

/**
 * Log an auditable action (stub for production implementation)
 *
 * In production, this would:
 * 1. Send to backend audit log
 * 2. Include timestamp, actor, target, action, and metadata
 * 3. Be append-only and tamper-evident
 *
 * @param {string} action - AuditableActions constant
 * @param {Object} details - Action details
 */
export function logAuditAction(action, details) {
  // In development, just log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUDIT]', {
      timestamp: new Date().toISOString(),
      action,
      ...details,
    });
  }

  // In production, this would send to the backend
  // await fetch('/api/audit', { method: 'POST', body: JSON.stringify({ action, ...details }) });
}

/**
 * Privacy notice text for data collection
 */
export const PrivacyNotices = {
  REGISTRATION: 'Mit Ihrer Anmeldung stimmen Sie zu, dass Ihre Kontaktdaten (Name, E-Mail) für die Eventorganisation verwendet werden.',
  PROFILE_EDIT: 'Ihre persönlichen Daten werden gemäß unserer Datenschutzerklärung verarbeitet. Sie können Ihre Daten jederzeit einsehen, korrigieren oder löschen lassen.',
  DATA_EXPORT: 'Sie haben das Recht, eine Kopie Ihrer gespeicherten Daten anzufordern (Art. 15 DSGVO).',
  DATA_DELETION: 'Sie haben das Recht auf Löschung Ihrer Daten (Art. 17 DSGVO), sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.',
};
