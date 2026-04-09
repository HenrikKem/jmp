export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  managedOrgUnitIds: string[];  // orgUnits where role = ORGANIZER (+ descendants)
  memberOrgUnitIds: string[];   // orgUnits where role = MEMBER
}
