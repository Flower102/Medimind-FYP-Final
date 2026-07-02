// frontend/src/lib/settingsApi.ts

/* -------------------------------------------------------------------------- */
/* Settings API Import                                                         */
/* The settings functions use the shared apiFetch helper so all authenticated  */
/* account requests go through the same Next.js backend proxy.                 */
/* -------------------------------------------------------------------------- */

import { apiFetch } from "@/src/lib/apiFetch";

/* -------------------------------------------------------------------------- */
/* User Types                                                                  */
/* These types describe the user profile shape used by the frontend and the    */
/* raw snake_case shape returned by FastAPI.                                   */
/* -------------------------------------------------------------------------- */

export type CurrentUser = {
  id: number;
  email: string;
  firstName?: string | null;
  surname?: string | null;
};

type RawCurrentUser = {
  id: number;
  email: string;
  first_name?: string | null;
  surname?: string | null;
};

/* -------------------------------------------------------------------------- */
/* User Normalisation Helper                                                   */
/* This converts backend snake_case fields into frontend camelCase fields so   */
/* page components can use a consistent naming style.                          */
/* -------------------------------------------------------------------------- */

function normaliseUser(user: RawCurrentUser): CurrentUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name ?? null,
    surname: user.surname ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Current User Request                                                        */
/* Loads the signed-in user's profile details for settings and account display */
/* areas that need the latest saved profile information.                       */
/* -------------------------------------------------------------------------- */

export async function getCurrentUser(): Promise<CurrentUser> {
  const data = await apiFetch<RawCurrentUser>("/auth/me");
  return normaliseUser(data);
}

/* -------------------------------------------------------------------------- */
/* Profile Update Request                                                      */
/* Sends editable profile fields to the backend. Optional values allow the     */
/* frontend to update one field at a time without overwriting everything else. */
/* -------------------------------------------------------------------------- */

export async function updateCurrentUser(payload: {
  firstName?: string | null;
  surname?: string | null;
}): Promise<CurrentUser> {
  const data = await apiFetch<RawCurrentUser>("/auth/me", {
    method: "PATCH",
    json: {
      first_name: payload.firstName,
      surname: payload.surname,
    },
  });

  return normaliseUser(data);
}

/* -------------------------------------------------------------------------- */
/* Password Change Request                                                     */
/* Sends the current and new password to FastAPI so the backend can verify the */
/* old password and save the new password securely.                            */
/* -------------------------------------------------------------------------- */

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiFetch<{ ok: boolean }>("/auth/change-password", {
    method: "POST",
    json: {
      current_password: payload.currentPassword,
      new_password: payload.newPassword,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Single-Device Sign Out Request                                              */
/* Ends the current browser session by asking the backend to revoke the active */
/* refresh token and clear authentication cookies.                             */
/* -------------------------------------------------------------------------- */

export async function signOut(): Promise<void> {
  await apiFetch<{ ok: boolean }>("/auth/signout", {
    method: "POST",
  });
}

/* -------------------------------------------------------------------------- */
/* All-Devices Sign Out Request                                                */
/* Revokes all active sessions for the current account, which is useful when   */
/* the user wants to secure their account across every device.                 */
/* -------------------------------------------------------------------------- */

export async function signOutAllDevices(): Promise<void> {
  await apiFetch<{ ok: boolean }>("/auth/signout-all", {
    method: "POST",
  });
}
