import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Maps camelCase frontend profile fields to camelCase DB columns (Prisma PascalCase tables).
 * Table names: UserProfile, UserFunction, UserAward, User
 */
const PROFILE_FIELD_MAP = {
  anrede: 'anrede',
  titel: 'titel',
  gender: 'geschlecht',
  briefanrede: 'briefanrede',
  berufsgruppe: 'berufsgruppe',
  geburtsort: 'geburtsort',
  dateOfBirth: 'geburtsdatum',
  nationalitaet: 'nationalitaet',
  telefonPrivat: 'telefonPrivat',
  telefonDienstlich: 'telefonDienstlich',
  handy: 'telefonHandy',
  street: 'strasse',
  postalCode: 'plz',
  city: 'ort',
  land: 'land',
  postStrasse: 'postfachStrasse',
  postPlz: 'postfachPlz',
  postOrt: 'postfachOrt',
  bemerkungen: 'bemerkungen',
  huntingLicenseDate: 'huntingLicenseDate',
  mitgliedJagdverbandSeit: 'mitgliedJagdverbandSeit',
  externeMitgliedsnummer: 'externeMitgliedsnummer',
  qualifications: 'qualifications',
};

const DB_TO_FRONTEND = Object.fromEntries(
  Object.entries(PROFILE_FIELD_MAP).map(([fe, db]) => [db, fe])
);

function toDbProfile(frontendProfile, userId) {
  const dbRow = { userId };
  for (const [feKey, dbCol] of Object.entries(PROFILE_FIELD_MAP)) {
    if (feKey in frontendProfile) {
      dbRow[dbCol] = frontendProfile[feKey] ?? null;
    }
  }
  return dbRow;
}

function toFrontendProfile(dbRow) {
  if (!dbRow) return null;
  const profile = {};
  for (const [dbCol, feKey] of Object.entries(DB_TO_FRONTEND)) {
    if (dbCol in dbRow) {
      profile[feKey] = dbRow[dbCol];
    }
  }
  return profile;
}

function toDbFunktion(f, userId) {
  return {
    userId,
    funktion: f.funktionsname || '',
    orgUnitName: f.orgUnitId || null,
    von: f.vonDatum || null,
    bis: f.bisDatum || null,
  };
}

function toFrontendFunktion(dbRow) {
  return {
    id: dbRow.id,
    funktionsname: dbRow.funktion || '',
    orgUnitId: dbRow.orgUnitName || null,
    vonDatum: dbRow.von || '',
    bisDatum: dbRow.bis || '',
  };
}

function toDbEhrung(e, userId) {
  return {
    userId,
    bezeichnung: e.ehrungsname || '',
    datum: e.datum || null,
  };
}

function toFrontendEhrung(dbRow) {
  return {
    id: dbRow.id,
    ehrungsname: dbRow.bezeichnung || '',
    datum: dbRow.datum || '',
  };
}

/**
 * Hook for loading and saving user profile data to Supabase.
 *
 * Returns { loadProfile, saveProfile, saveFunktionen, saveEhrungen, saving, loading, error }.
 *
 * All operations are no-ops if supabase client is not configured (missing env vars),
 * allowing the app to fall back gracefully to mock data.
 */
export function useSupabaseProfile() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async (userId) => {
    if (!supabase) return null;
    setLoading(true);
    setError(null);

    try {
      const [profileRes, funktionenRes, ehrungenRes] = await Promise.all([
        supabase
          .from('UserProfile')
          .select('*')
          .eq('userId', userId)
          .maybeSingle(),
        supabase
          .from('UserFunction')
          .select('id, userId, funktion, orgUnitName, von, bis')
          .eq('userId', userId)
          .order('von', { ascending: true }),
        supabase
          .from('UserAward')
          .select('id, userId, bezeichnung, datum')
          .eq('userId', userId)
          .order('datum', { ascending: true }),
      ]);

      if (profileRes.error) {
        throw new Error(`Profil laden fehlgeschlagen: ${profileRes.error.message}`);
      }
      if (funktionenRes.error) {
        throw new Error(`Funktionen laden fehlgeschlagen: ${funktionenRes.error.message}`);
      }
      if (ehrungenRes.error) {
        throw new Error(`Ehrungen laden fehlgeschlagen: ${ehrungenRes.error.message}`);
      }

      return {
        profile: toFrontendProfile(profileRes.data),
        funktionen: (funktionenRes.data || []).map(toFrontendFunktion),
        ehrungen: (ehrungenRes.data || []).map(toFrontendEhrung),
      };
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProfile = useCallback(async (userId, frontendProfileData, userName) => {
    if (!supabase) {
      return { success: false, error: 'Supabase nicht konfiguriert' };
    }
    setSaving(true);
    setError(null);

    try {
      const dbRow = toDbProfile(frontendProfileData, userId);
      const { error: upsertError } = await supabase
        .from('UserProfile')
        .upsert(dbRow, { onConflict: 'userId' });

      if (upsertError) {
        throw new Error(`Profil speichern fehlgeschlagen: ${upsertError.message}`);
      }

      if (userName !== undefined) {
        // Split "Vorname Nachname" into firstName / lastName for the User table.
        // If only one token is present it is treated as firstName.
        const parts = (userName || '').trim().split(/\s+/);
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';

        const { error: userError } = await supabase
          .from('User')
          .update({ firstName, lastName })
          .eq('id', userId);

        if (userError) {
          console.warn('Name update on User table failed:', userError.message);
        }
      }

      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, []);

  const saveFunktionen = useCallback(async (userId, funktionen) => {
    if (!supabase) {
      return { success: false, error: 'Supabase nicht konfiguriert' };
    }
    setSaving(true);
    setError(null);

    try {
      // Delete existing and re-insert (simplest approach for small lists)
      const { error: deleteError } = await supabase
        .from('UserFunction')
        .delete()
        .eq('userId', userId);

      if (deleteError) {
        throw new Error(`Funktionen löschen fehlgeschlagen: ${deleteError.message}`);
      }

      if (funktionen.length > 0) {
        const rows = funktionen.map(f => toDbFunktion(f, userId));
        const { error: insertError } = await supabase
          .from('UserFunction')
          .insert(rows);

        if (insertError) {
          throw new Error(`Funktionen speichern fehlgeschlagen: ${insertError.message}`);
        }
      }

      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, []);

  const saveEhrungen = useCallback(async (userId, ehrungen) => {
    if (!supabase) {
      return { success: false, error: 'Supabase nicht konfiguriert' };
    }
    setSaving(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('UserAward')
        .delete()
        .eq('userId', userId);

      if (deleteError) {
        throw new Error(`Ehrungen löschen fehlgeschlagen: ${deleteError.message}`);
      }

      if (ehrungen.length > 0) {
        const rows = ehrungen.map(e => toDbEhrung(e, userId));
        const { error: insertError } = await supabase
          .from('UserAward')
          .insert(rows);

        if (insertError) {
          throw new Error(`Ehrungen speichern fehlgeschlagen: ${insertError.message}`);
        }
      }

      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, []);

  const loadDogs = useCallback(async (userId) => {
    if (!supabase) return [];
    const { data, error: fetchError } = await supabase
      .from('UserDog')
      .select('*, UserDogPruefung(*)')
      .eq('userId', userId)
      .order('createdAt', { ascending: true });
    if (fetchError) {
      console.warn('Dogs laden fehlgeschlagen:', fetchError.message);
      return [];
    }
    return (data || []).map(dog => ({
      ...dog,
      pruefungen: (dog.UserDogPruefung || []).sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      ),
    }));
  }, []);

  const saveDog = useCallback(async (userId, dogData) => {
    if (!supabase) return { success: false, error: 'Supabase nicht konfiguriert' };
    const row = {
      userId,
      name: dogData.name,
      rasse: dogData.rasse || null,
      geburtsjahr: dogData.geburtsjahr || null,
    };
    if (dogData.id) {
      const { data, error: updateError } = await supabase
        .from('UserDog')
        .update({ name: row.name, rasse: row.rasse, geburtsjahr: row.geburtsjahr })
        .eq('id', dogData.id)
        .select('*, UserDogPruefung(*)')
        .single();
      if (updateError) return { success: false, error: updateError.message };
      return { success: true, dog: data };
    } else {
      const { data, error: insertError } = await supabase
        .from('UserDog')
        .insert(row)
        .select('*, UserDogPruefung(*)')
        .single();
      if (insertError) return { success: false, error: insertError.message };
      return { success: true, dog: { ...data, pruefungen: [] } };
    }
  }, []);

  const deleteDog = useCallback(async (dogId) => {
    if (!supabase) return { success: false, error: 'Supabase nicht konfiguriert' };
    const { error: deleteError } = await supabase
      .from('UserDog')
      .delete()
      .eq('id', dogId);
    if (deleteError) return { success: false, error: deleteError.message };
    return { success: true };
  }, []);

  const savePruefung = useCallback(async (dogId, pruefungData) => {
    if (!supabase) return { success: false, error: 'Supabase nicht konfiguriert' };
    const { data, error: insertError } = await supabase
      .from('UserDogPruefung')
      .insert({
        dogId,
        pruefungsart: pruefungData.pruefungsart,
        datum: pruefungData.datum || null,
      })
      .select()
      .single();
    if (insertError) return { success: false, error: insertError.message };
    return { success: true, pruefung: data };
  }, []);

  const deletePruefung = useCallback(async (pruefungId) => {
    if (!supabase) return { success: false, error: 'Supabase nicht konfiguriert' };
    const { error: deleteError } = await supabase
      .from('UserDogPruefung')
      .delete()
      .eq('id', pruefungId);
    if (deleteError) return { success: false, error: deleteError.message };
    return { success: true };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    loadProfile,
    saveProfile,
    saveFunktionen,
    saveEhrungen,
    loadDogs,
    saveDog,
    deleteDog,
    savePruefung,
    deletePruefung,
    saving,
    loading,
    error,
    clearError,
  };
}
