import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { events as initialEventsData, initialRegistrations, groups as initialGroups, orgUnits, getDescendants, eventRoleTypes, initialEventRoles } from '../data/mockData';
import { useAuth } from './AuthContext';

/**
 * EventContext
 *
 * Manages events, groups, and registrations.
 *
 * Event Visibility (C1):
 * - User sees events where they are member of event.scopeOrgId OR any descendant
 *
 * Registration (C2/D2):
 * - Register/unregister with confirmation
 * - Select group during registration (if event has groups)
 * - Capacity enforcement: prevent registration if group is full
 * - Unregister frees capacity
 */

const EventContext = createContext(null);

export function EventProvider({ children }) {
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState(initialEventsData);
  const [groups, setGroups] = useState(initialGroups);
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [eventRoles, setEventRoles] = useState(initialEventRoles);

  const eventValue = useMemo(() => {
    // Get user's OrgUnit IDs
    const userOrgUnitIds = user?.memberships?.map(m => m.orgUnitId) ?? [];

    // Check if user can see an event (based on scope)
    const canUserSeeEvent = (event) => {
      if (isAdmin) return true;
      if (!event.isPublished) return false;

      const scopeDescendants = getDescendants(event.scopeOrgId, orgUnits);
      const scopeOrgIds = scopeDescendants.map(u => u.id);

      return userOrgUnitIds.some(orgId => scopeOrgIds.includes(orgId));
    };

    // Get events visible to current user
    const getVisibleEvents = () => {
      return events.filter(canUserSeeEvent);
    };

    // Check if user is registered for an event
    const isRegistered = (eventId) => {
      return registrations.some(
        r => r.eventId === eventId && r.userId === user?.id && r.status === 'confirmed'
      );
    };

    // Get registration for an event
    const getRegistration = (eventId) => {
      return registrations.find(
        r => r.eventId === eventId && r.userId === user?.id && r.status === 'confirmed'
      );
    };

    // Get event by ID
    const getEventById = (eventId) => {
      const event = events.find(e => e.id === eventId);
      if (!event) return null;
      if (!canUserSeeEvent(event)) return null;
      return event;
    };

    // Get event by ID for management (bypasses visibility check for organizers)
    const getEventByIdForManagement = (eventId) => {
      return events.find(e => e.id === eventId) || null;
    };

    // Get all events for management (organizers see their scoped events)
    const getEventsForManagement = (managedOrgUnitIds) => {
      return events.filter(event => managedOrgUnitIds.includes(event.scopeOrgId));
    };

    // Get OrgUnit by ID
    const getOrgUnitById = (orgUnitId) => {
      return orgUnits.find(u => u.id === orgUnitId);
    };

    // Get all registrations for an event
    const getEventRegistrations = (eventId) => {
      return registrations.filter(r => r.eventId === eventId && r.status === 'confirmed');
    };

    // Get groups for an event
    const getEventGroups = (eventId) => {
      return groups.filter(g => g.eventId === eventId);
    };

    // Check if event has groups
    const eventHasGroups = (eventId) => {
      return groups.some(g => g.eventId === eventId);
    };

    // Get group by ID
    const getGroupById = (groupId) => {
      return groups.find(g => g.id === groupId);
    };

    // Get current registration count for a group
    const getGroupRegistrationCount = (groupId) => {
      return registrations.filter(
        r => r.groupId === groupId && r.status === 'confirmed'
      ).length;
    };

    // Get available capacity for a group
    const getGroupAvailableCapacity = (groupId) => {
      const group = getGroupById(groupId);
      if (!group) return 0;
      const currentCount = getGroupRegistrationCount(groupId);
      return Math.max(0, group.capacity - currentCount);
    };

    // Check if group is full
    const isGroupFull = (groupId) => {
      return getGroupAvailableCapacity(groupId) === 0;
    };

    // Get groups with capacity info for an event
    const getEventGroupsWithCapacity = (eventId) => {
      const eventGroups = getEventGroups(eventId);
      return eventGroups.map(group => ({
        ...group,
        currentCount: getGroupRegistrationCount(group.id),
        availableCapacity: getGroupAvailableCapacity(group.id),
        isFull: isGroupFull(group.id),
      }));
    };

    // Get all event role types
    const getEventRoleTypes = () => eventRoleTypes;

    // Get role type by ID
    const getRoleTypeById = (roleTypeId) => {
      return eventRoleTypes.find(rt => rt.id === roleTypeId);
    };

    // Get all role assignments for an event
    const getEventRoleAssignments = (eventId) => {
      return eventRoles.filter(er => er.eventId === eventId);
    };

    // Get roles assigned to a user for a specific event
    const getUserEventRoles = (eventId, userId) => {
      return eventRoles
        .filter(er => er.eventId === eventId && er.userId === userId)
        .map(er => ({
          ...er,
          roleType: getRoleTypeById(er.roleTypeId),
        }));
    };

    // Check if user has a specific role for an event
    const userHasEventRole = (eventId, userId, roleTypeId) => {
      return eventRoles.some(
        er => er.eventId === eventId && er.userId === userId && er.roleTypeId === roleTypeId
      );
    };

    // Get all users with roles for an event (with role details)
    const getEventRolesWithDetails = (eventId) => {
      const assignments = getEventRoleAssignments(eventId);
      return assignments.map(assignment => ({
        ...assignment,
        roleType: getRoleTypeById(assignment.roleTypeId),
      }));
    };

    return {
      events,
      groups,
      registrations,
      eventRoles,
      getVisibleEvents,
      isRegistered,
      getRegistration,
      getEventById,
      getEventByIdForManagement,
      getEventsForManagement,
      getOrgUnitById,
      getEventRegistrations,
      getEventGroups,
      eventHasGroups,
      getGroupById,
      getGroupRegistrationCount,
      getGroupAvailableCapacity,
      isGroupFull,
      getEventGroupsWithCapacity,
      canUserSeeEvent,
      getEventRoleTypes,
      getRoleTypeById,
      getEventRoleAssignments,
      getUserEventRoles,
      userHasEventRole,
      getEventRolesWithDetails,
    };
  }, [user, isAdmin, events, groups, registrations, eventRoles]);

  // Register for event (with optional groupId)
  const registerForEvent = useCallback((eventId, groupId = null) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const event = events.find(e => e.id === eventId);
        if (!event) {
          reject(new Error('Event nicht gefunden'));
          return;
        }

        // Check if already registered
        const existing = registrations.find(
          r => r.eventId === eventId && r.userId === user?.id && r.status === 'confirmed'
        );
        if (existing) {
          reject(new Error('Sie sind bereits für dieses Event angemeldet'));
          return;
        }

        // Check if event has groups
        const eventGroups = groups.filter(g => g.eventId === eventId);
        if (eventGroups.length > 0) {
          // Event has groups - groupId is required
          if (!groupId) {
            reject(new Error('Bitte wählen Sie eine Gruppe aus'));
            return;
          }

          // Verify group belongs to event
          const group = eventGroups.find(g => g.id === groupId);
          if (!group) {
            reject(new Error('Ungültige Gruppe'));
            return;
          }

          // Check capacity
          const currentCount = registrations.filter(
            r => r.groupId === groupId && r.status === 'confirmed'
          ).length;

          if (currentCount >= group.capacity) {
            reject(new Error('Diese Gruppe ist leider voll'));
            return;
          }
        }

        const newRegistration = {
          id: `reg-${Date.now()}`,
          eventId,
          userId: user?.id,
          groupId,
          registeredAt: new Date().toISOString(),
          status: 'confirmed',
        };

        setRegistrations(prev => [...prev, newRegistration]);
        resolve(newRegistration);
      }, 500);
    });
  }, [user, events, groups, registrations]);

  // Unregister from event (frees capacity)
  const unregisterFromEvent = useCallback((eventId) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const registration = registrations.find(
          r => r.eventId === eventId && r.userId === user?.id && r.status === 'confirmed'
        );

        if (!registration) {
          reject(new Error('Keine Anmeldung gefunden'));
          return;
        }

        // Set status to cancelled - this frees capacity as capacity is calculated
        // based on 'confirmed' registrations only
        setRegistrations(prev =>
          prev.map(r =>
            r.id === registration.id
              ? { ...r, status: 'cancelled' }
              : r
          )
        );
        resolve();
      }, 500);
    });
  }, [user, registrations]);

  // Create a new event
  const createEvent = useCallback((eventData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newEvent = {
          ...eventData,
          id: `event-${Date.now()}`,
          createdBy: user?.id,
        };
        setEvents(prev => [...prev, newEvent]);
        resolve(newEvent);
      }, 300);
    });
  }, [user]);

  // Update an existing event
  const updateEvent = useCallback((eventId, eventData) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const eventIndex = events.findIndex(e => e.id === eventId);
        if (eventIndex === -1) {
          reject(new Error('Event nicht gefunden'));
          return;
        }

        const updatedEvent = {
          ...events[eventIndex],
          ...eventData,
          id: eventId, // Ensure ID doesn't change
        };

        setEvents(prev => prev.map(e => e.id === eventId ? updatedEvent : e));
        resolve(updatedEvent);
      }, 300);
    });
  }, [events]);

  // Delete an event
  const deleteEvent = useCallback((eventId) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const event = events.find(e => e.id === eventId);
        if (!event) {
          reject(new Error('Event nicht gefunden'));
          return;
        }

        // Cancel all registrations for this event
        setRegistrations(prev =>
          prev.map(r =>
            r.eventId === eventId && r.status === 'confirmed'
              ? { ...r, status: 'cancelled' }
              : r
          )
        );

        // Remove groups for this event
        setGroups(prev => prev.filter(g => g.eventId !== eventId));

        // Remove the event
        setEvents(prev => prev.filter(e => e.id !== eventId));
        resolve();
      }, 300);
    });
  }, [events]);

  // Create a new group for an event
  const createGroup = useCallback((eventId, groupData) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const event = events.find(e => e.id === eventId);
        if (!event) {
          reject(new Error('Event nicht gefunden'));
          return;
        }

        const newGroup = {
          ...groupData,
          id: `group-${Date.now()}`,
          eventId,
        };
        setGroups(prev => [...prev, newGroup]);
        resolve(newGroup);
      }, 300);
    });
  }, [events]);

  // Update an existing group
  const updateGroup = useCallback((groupId, groupData) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const group = groups.find(g => g.id === groupId);
        if (!group) {
          reject(new Error('Gruppe nicht gefunden'));
          return;
        }

        // Check if capacity is being reduced below current registrations
        const currentCount = registrations.filter(
          r => r.groupId === groupId && r.status === 'confirmed'
        ).length;

        if (groupData.capacity < currentCount) {
          reject(new Error(`Kapazität kann nicht unter ${currentCount} (aktuelle Anmeldungen) reduziert werden`));
          return;
        }

        const updatedGroup = {
          ...group,
          ...groupData,
          id: groupId,
          eventId: group.eventId, // Ensure eventId doesn't change
        };

        setGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
        resolve(updatedGroup);
      }, 300);
    });
  }, [groups, registrations]);

  // Delete a group
  const deleteGroup = useCallback((groupId) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const group = groups.find(g => g.id === groupId);
        if (!group) {
          reject(new Error('Gruppe nicht gefunden'));
          return;
        }

        // Check if group has registrations
        const hasRegistrations = registrations.some(
          r => r.groupId === groupId && r.status === 'confirmed'
        );

        if (hasRegistrations) {
          reject(new Error('Gruppe kann nicht gelöscht werden, da noch Anmeldungen vorhanden sind'));
          return;
        }

        setGroups(prev => prev.filter(g => g.id !== groupId));
        resolve();
      }, 300);
    });
  }, [groups, registrations]);

  // Assign a role to a user for an event
  const assignEventRole = useCallback((eventId, userId, roleTypeId) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Check if event exists
        const event = events.find(e => e.id === eventId);
        if (!event) {
          reject(new Error('Event nicht gefunden'));
          return;
        }

        // Check if role type exists
        const roleType = eventRoleTypes.find(rt => rt.id === roleTypeId);
        if (!roleType) {
          reject(new Error('Ungültiger Rollentyp'));
          return;
        }

        // Check if user already has this role for this event
        const existing = eventRoles.find(
          er => er.eventId === eventId && er.userId === userId && er.roleTypeId === roleTypeId
        );
        if (existing) {
          reject(new Error('Benutzer hat diese Rolle bereits'));
          return;
        }

        const newRole = {
          id: `erole-${Date.now()}`,
          eventId,
          userId,
          roleTypeId,
          assignedAt: new Date().toISOString(),
          assignedBy: user?.id,
        };

        setEventRoles(prev => [...prev, newRole]);
        resolve(newRole);
      }, 300);
    });
  }, [events, eventRoles, user]);

  // Remove a role assignment
  const removeEventRole = useCallback((roleAssignmentId) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const assignment = eventRoles.find(er => er.id === roleAssignmentId);
        if (!assignment) {
          reject(new Error('Rollenzuweisung nicht gefunden'));
          return;
        }

        setEventRoles(prev => prev.filter(er => er.id !== roleAssignmentId));
        resolve();
      }, 300);
    });
  }, [eventRoles]);

  return (
    <EventContext.Provider value={{
      ...eventValue,
      registerForEvent,
      unregisterFromEvent,
      createEvent,
      updateEvent,
      deleteEvent,
      createGroup,
      updateGroup,
      deleteGroup,
      assignEventRole,
      removeEventRole,
    }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
}

export default EventContext;
