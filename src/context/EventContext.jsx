import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  getDescendants,
  eventRoleTypes,
} from '../data/mockData';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

/**
 * EventContext
 *
 * Manages events, groups, and registrations.
 * Loads data from Supabase on mount.
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

// ── Supabase <-> Frontend field mappers ──────────────────────────────────────

function mapEventFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    location: row.location,
    startDate: row.startDate,
    endDate: row.endDate,
    scopeOrgId: row.scopeOrgId,
    createdBy: row.createdById,
    isPublished: row.isPublished,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapEventToDb(data) {
  const row = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.description !== undefined) row.description = data.description;
  if (data.location !== undefined) row.location = data.location;
  if (data.startDate !== undefined) row.startDate = data.startDate;
  if (data.endDate !== undefined) row.endDate = data.endDate;
  if (data.scopeOrgId !== undefined) row.scopeOrgId = data.scopeOrgId;
  if (data.createdBy !== undefined) row.createdById = data.createdBy;
  if (data.isPublished !== undefined) row.isPublished = data.isPublished;
  return row;
}

function mapGroupFromDb(row) {
  return {
    id: row.id,
    eventId: row.eventId,
    name: row.name,
    capacity: row.capacity,
    startTime: row.startTime,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapGroupToDb(data, eventId) {
  const row = {};
  if (eventId !== undefined) row.eventId = eventId;
  if (data.name !== undefined) row.name = data.name;
  if (data.capacity !== undefined) row.capacity = Number(data.capacity);
  if (data.startTime !== undefined) row.startTime = data.startTime;
  return row;
}

function mapRegistrationFromDb(row) {
  return {
    id: row.id,
    userId: row.userId,
    eventId: row.eventId,
    groupId: row.groupId,
    status: row.status,
    registeredAt: row.registeredAt,
    updatedAt: row.updatedAt,
  };
}

function mapEventRoleFromDb(row) {
  return {
    id: row.id,
    eventId: row.eventId,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt,
    // Flatten UserEventRole if nested
    userEventRoles: row.UserEventRole?.map(uer => ({
      id: uer.id,
      userId: uer.userId,
      eventRoleId: uer.eventRoleId,
      assignedAt: uer.assignedAt,
      assignedBy: uer.assignedById,
    })) ?? [],
  };
}

function mapOrgUnitFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    level: row.level ? row.level.toLowerCase() : row.level,
    parentId: row.parentId,
  };
}

// ── Context ──────────────────────────────────────────────────────────────────

const EventContext = createContext(null);

export function EventProvider({ children }) {
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [eventRoles, setEventRoles] = useState([]);
  const [orgUnits, setOrgUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Load data from Supabase on mount ─────────────────────────────────────

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      try {
        const [eventsRes, groupsRes, registrationsRes, rolesRes, orgUnitsRes] = await Promise.all([
          supabase.from('Event').select('*'),
          supabase.from('Group').select('*'),
          supabase.from('Registration').select('*'),
          supabase.from('EventRole').select('*, UserEventRole(*)'),
          supabase.from('OrgUnit').select('*'),
        ]);

        if (cancelled) return;

        if (eventsRes.data && eventsRes.data.length > 0) {
          setEvents(eventsRes.data.map(mapEventFromDb));
        }
        if (groupsRes.data && groupsRes.data.length > 0) {
          setGroups(groupsRes.data.map(mapGroupFromDb));
        }
        if (registrationsRes.data) {
          setRegistrations(registrationsRes.data.map(mapRegistrationFromDb));
        }
        if (rolesRes.data) {
          setEventRoles(rolesRes.data.map(mapEventRoleFromDb));
        }
        if (orgUnitsRes.data && orgUnitsRes.data.length > 0) {
          setOrgUnits(orgUnitsRes.data.map(mapOrgUnitFromDb));
        }

        // Log any errors for debugging without breaking the UI
        [eventsRes, groupsRes, registrationsRes, rolesRes, orgUnitsRes].forEach((res, i) => {
          if (res.error) {
            const names = ['events', 'groups', 'registrations', 'event_roles', 'org_units'];
            console.warn(`[Supabase] Failed to load ${names[i]}:`, res.error.message);
          }
        });
      } catch (err) {
        console.warn('[Supabase] Failed to load data:', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  // ── Derived values (memoized) ────────────────────────────────────────────

  const eventValue = useMemo(() => {
    const userOrgUnitIds = user?.memberships?.map(m => m.orgUnitId) ?? [];

    const canUserSeeEvent = (event) => {
      if (isAdmin) return true;
      if (!event.isPublished) return false;

      const scopeDescendants = getDescendants(event.scopeOrgId, orgUnits);
      const scopeOrgIds = scopeDescendants.map(u => u.id);

      return userOrgUnitIds.some(orgId => scopeOrgIds.includes(orgId));
    };

    const getVisibleEvents = () => events.filter(canUserSeeEvent);

    const isRegistered = (eventId) =>
      registrations.some(r => r.eventId === eventId && r.userId === user?.id && r.status === 'CONFIRMED');

    const getRegistration = (eventId) =>
      registrations.find(r => r.eventId === eventId && r.userId === user?.id && r.status === 'CONFIRMED');

    const getEventById = (eventId) => {
      const event = events.find(e => e.id === eventId);
      if (!event) return null;
      if (!canUserSeeEvent(event)) return null;
      return event;
    };

    const getEventByIdForManagement = (eventId) =>
      events.find(e => e.id === eventId) || null;

    const getEventsForManagement = (managedOrgUnitIds) =>
      events.filter(event => managedOrgUnitIds.includes(event.scopeOrgId));

    const getOrgUnitById = (orgUnitId) =>
      orgUnits.find(u => u.id === orgUnitId);

    const getEventRegistrations = (eventId) =>
      registrations.filter(r => r.eventId === eventId && r.status === 'CONFIRMED');

    const getEventGroups = (eventId) =>
      groups.filter(g => g.eventId === eventId);

    const eventHasGroups = (eventId) =>
      groups.some(g => g.eventId === eventId);

    const getGroupById = (groupId) =>
      groups.find(g => g.id === groupId);

    const getGroupRegistrationCount = (groupId) =>
      registrations.filter(r => r.groupId === groupId && r.status === 'CONFIRMED').length;

    const getGroupAvailableCapacity = (groupId) => {
      const group = getGroupById(groupId);
      if (!group) return 0;
      return Math.max(0, group.capacity - getGroupRegistrationCount(groupId));
    };

    const isGroupFull = (groupId) =>
      getGroupAvailableCapacity(groupId) === 0;

    const getEventGroupsWithCapacity = (eventId) =>
      getEventGroups(eventId).map(group => ({
        ...group,
        currentCount: getGroupRegistrationCount(group.id),
        availableCapacity: getGroupAvailableCapacity(group.id),
        isFull: isGroupFull(group.id),
      }));

    const getEventRoleTypes = () => eventRoleTypes;
    const getRoleTypeById = (roleTypeId) => eventRoleTypes.find(rt => rt.id === roleTypeId);

    const getEventRoleAssignments = (eventId) =>
      eventRoles.filter(er => er.eventId === eventId);

    const getUserEventRoles = (eventId, userId) =>
      eventRoles
        .filter(er => er.eventId === eventId && er.userId === userId)
        .map(er => ({ ...er, roleType: getRoleTypeById(er.roleTypeId) }));

    const userHasEventRole = (eventId, userId, roleTypeId) =>
      eventRoles.some(er => er.eventId === eventId && er.userId === userId && er.roleTypeId === roleTypeId);

    const getEventRolesWithDetails = (eventId) =>
      getEventRoleAssignments(eventId).map(a => ({ ...a, roleType: getRoleTypeById(a.roleTypeId) }));

    return {
      events,
      groups,
      registrations,
      eventRoles,
      orgUnits,
      loading,
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
  }, [user, isAdmin, events, groups, registrations, eventRoles, orgUnits, loading]);

  // ── Register for event ───────────────────────────────────────────────────

  const registerForEvent = useCallback(async (eventId, groupId = null) => {
    const event = events.find(e => e.id === eventId);
    if (!event) throw new Error('Event nicht gefunden');

    const existing = registrations.find(
      r => r.eventId === eventId && r.userId === user?.id && r.status === 'CONFIRMED'
    );
    if (existing) throw new Error('Sie sind bereits für dieses Event angemeldet');

    const eventGroups = groups.filter(g => g.eventId === eventId);
    if (eventGroups.length > 0) {
      if (!groupId) throw new Error('Bitte wählen Sie eine Gruppe aus');
      const group = eventGroups.find(g => g.id === groupId);
      if (!group) throw new Error('Ungültige Gruppe');
      const currentCount = registrations.filter(
        r => r.groupId === groupId && r.status === 'CONFIRMED'
      ).length;
      if (currentCount >= group.capacity) throw new Error('Diese Gruppe ist leider voll');
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('Registration')
        .insert({
          userId: user?.id || null,
          eventId: eventId,
          groupId: groupId,
          status: 'CONFIRMED',
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      const mapped = mapRegistrationFromDb(data);
      setRegistrations(prev => [...prev, mapped]);
      return mapped;
    }

    // Fallback: local-only
    const newRegistration = {
      id: `reg-${Date.now()}`,
      eventId,
      userId: user?.id,
      groupId,
      registeredAt: new Date().toISOString(),
      status: 'CONFIRMED',
    };
    setRegistrations(prev => [...prev, newRegistration]);
    return newRegistration;
  }, [user, events, groups, registrations]);

  // ── Unregister from event ────────────────────────────────────────────────

  const unregisterFromEvent = useCallback(async (eventId) => {
    const registration = registrations.find(
      r => r.eventId === eventId && r.userId === user?.id && r.status === 'CONFIRMED'
    );
    if (!registration) throw new Error('Keine Anmeldung gefunden');

    if (supabase) {
      const { error } = await supabase
        .from('Registration')
        .update({ status: 'CANCELLED' })
        .eq('id', registration.id);

      if (error) throw new Error(error.message);
    }

    setRegistrations(prev =>
      prev.map(r => r.id === registration.id ? { ...r, status: 'CANCELLED' } : r)
    );
  }, [user, registrations]);

  // ── Create event ─────────────────────────────────────────────────────────

  const createEvent = useCallback(async (eventData) => {
    if (supabase) {
      const dbRow = mapEventToDb({
        ...eventData,
        createdBy: user?.id || null,
      });

      const { data, error } = await supabase
        .from('Event')
        .insert(dbRow)
        .select()
        .single();

      if (error) throw new Error(error.message);

      const mapped = mapEventFromDb(data);
      setEvents(prev => [...prev, mapped]);

      // Insert groups if provided
      if (eventData.groups && eventData.groups.length > 0) {
        const groupRows = eventData.groups.map(g => mapGroupToDb(g, data.id));
        const { data: groupData, error: groupError } = await supabase
          .from('Group')
          .insert(groupRows)
          .select();

        if (groupError) {
          console.warn('[Supabase] Failed to insert groups:', groupError.message);
        } else if (groupData) {
          setGroups(prev => [...prev, ...groupData.map(mapGroupFromDb)]);
        }
      }

      // Insert event_roles if provided
      if (eventData.roles && eventData.roles.length > 0) {
        const roleRows = eventData.roles.map(r => ({
          eventId: data.id,
          name: r.role || r.name,
          description: r.description || null,
        }));
        const { data: roleData, error: roleError } = await supabase
          .from('EventRole')
          .insert(roleRows)
          .select('*, UserEventRole(*)');

        if (roleError) {
          console.warn('[Supabase] Failed to insert event_roles:', roleError.message);
        } else if (roleData) {
          setEventRoles(prev => [...prev, ...roleData.map(mapEventRoleFromDb)]);
        }
      }

      return mapped;
    }

    // Fallback: local-only
    const newEvent = {
      ...eventData,
      id: `event-${Date.now()}`,
      createdBy: user?.id,
    };
    setEvents(prev => [...prev, newEvent]);
    return newEvent;
  }, [user]);

  // ── Update event ─────────────────────────────────────────────────────────

  const updateEvent = useCallback(async (eventId, eventData) => {
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) throw new Error('Event nicht gefunden');

    if (supabase) {
      const dbRow = mapEventToDb(eventData);
      const { data, error } = await supabase
        .from('Event')
        .update(dbRow)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      const mapped = mapEventFromDb(data);
      setEvents(prev => prev.map(e => e.id === eventId ? mapped : e));
      return mapped;
    }

    // Fallback: local-only
    const updatedEvent = { ...events[eventIndex], ...eventData, id: eventId };
    setEvents(prev => prev.map(e => e.id === eventId ? updatedEvent : e));
    return updatedEvent;
  }, [events]);

  // ── Delete event ─────────────────────────────────────────────────────────

  const deleteEvent = useCallback(async (eventId) => {
    const event = events.find(e => e.id === eventId);
    if (!event) throw new Error('Event nicht gefunden');

    if (supabase) {
      const { error } = await supabase
        .from('Event')
        .delete()
        .eq('id', eventId);

      if (error) throw new Error(error.message);
    }

    // Remove from local state (cascade handled by DB for Supabase)
    setRegistrations(prev =>
      prev.map(r =>
        r.eventId === eventId && r.status === 'CONFIRMED'
          ? { ...r, status: 'CANCELLED' }
          : r
      )
    );
    setGroups(prev => prev.filter(g => g.eventId !== eventId));
    setEventRoles(prev => prev.filter(er => er.eventId !== eventId));
    setEvents(prev => prev.filter(e => e.id !== eventId));
  }, [events]);

  // ── Create group ─────────────────────────────────────────────────────────

  const createGroup = useCallback(async (eventId, groupData) => {
    const event = events.find(e => e.id === eventId);
    if (!event) throw new Error('Event nicht gefunden');

    if (supabase) {
      const dbRow = mapGroupToDb(groupData, eventId);
      const { data, error } = await supabase
        .from('Group')
        .insert(dbRow)
        .select()
        .single();

      if (error) throw new Error(error.message);

      const mapped = mapGroupFromDb(data);
      setGroups(prev => [...prev, mapped]);
      return mapped;
    }

    const newGroup = { ...groupData, id: `group-${Date.now()}`, eventId };
    setGroups(prev => [...prev, newGroup]);
    return newGroup;
  }, [events]);

  // ── Update group ─────────────────────────────────────────────────────────

  const updateGroup = useCallback(async (groupId, groupData) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Gruppe nicht gefunden');

    const currentCount = registrations.filter(
      r => r.groupId === groupId && r.status === 'CONFIRMED'
    ).length;
    if (groupData.capacity < currentCount) {
      throw new Error(`Kapazität kann nicht unter ${currentCount} (aktuelle Anmeldungen) reduziert werden`);
    }

    if (supabase) {
      const dbRow = mapGroupToDb(groupData);
      const { data, error } = await supabase
        .from('Group')
        .update(dbRow)
        .eq('id', groupId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      const mapped = mapGroupFromDb(data);
      setGroups(prev => prev.map(g => g.id === groupId ? mapped : g));
      return mapped;
    }

    const updatedGroup = { ...group, ...groupData, id: groupId, eventId: group.eventId };
    setGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
    return updatedGroup;
  }, [groups, registrations]);

  // ── Delete group ─────────────────────────────────────────────────────────

  const deleteGroup = useCallback(async (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Gruppe nicht gefunden');

    const hasRegistrations = registrations.some(
      r => r.groupId === groupId && r.status === 'CONFIRMED'
    );
    if (hasRegistrations) {
      throw new Error('Gruppe kann nicht gelöscht werden, da noch Anmeldungen vorhanden sind');
    }

    if (supabase) {
      const { error } = await supabase
        .from('Group')
        .delete()
        .eq('id', groupId);

      if (error) throw new Error(error.message);
    }

    setGroups(prev => prev.filter(g => g.id !== groupId));
  }, [groups, registrations]);

  // ── Assign event role ────────────────────────────────────────────────────

  const assignEventRole = useCallback(async (eventId, userId, roleTypeId) => {
    const event = events.find(e => e.id === eventId);
    if (!event) throw new Error('Event nicht gefunden');

    const roleType = eventRoleTypes.find(rt => rt.id === roleTypeId);
    if (!roleType) throw new Error('Ungültiger Rollentyp');

    const existing = eventRoles.find(
      er => er.eventId === eventId && er.userId === userId && er.roleTypeId === roleTypeId
    );
    if (existing) throw new Error('Benutzer hat diese Rolle bereits');

    // Note: event_roles in Supabase uses name/description, not roleTypeId.
    // For now, keep local-only role assignment logic since the DB schema
    // for event_roles differs from the mock data model.
    const newRole = {
      id: `erole-${Date.now()}`,
      eventId,
      userId,
      roleTypeId,
      assignedAt: new Date().toISOString(),
      assignedBy: user?.id,
    };
    setEventRoles(prev => [...prev, newRole]);
    return newRole;
  }, [events, eventRoles, user]);

  // ── Remove event role ────────────────────────────────────────────────────

  const removeEventRole = useCallback(async (roleAssignmentId) => {
    const assignment = eventRoles.find(er => er.id === roleAssignmentId);
    if (!assignment) throw new Error('Rollenzuweisung nicht gefunden');

    setEventRoles(prev => prev.filter(er => er.id !== roleAssignmentId));
  }, [eventRoles]);

  // ── Provider ─────────────────────────────────────────────────────────────

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
