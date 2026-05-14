// frontend/src/lib/settingsApi.ts
// Settings API functions.
// The browser calls /api/backend/auth/...
// Next.js proxy forwards that to FastAPI.

import { apiFetch } from "@/src/lib/apiFetch";

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

function normaliseUser(user: RawCurrentUser): CurrentUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name ?? null,
    surname: user.surname ?? null,
  };
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const data = await apiFetch<RawCurrentUser>("/auth/me");
  return normaliseUser(data);
}

export async function updateCurrentUser(payload: {
  firstName?: string | null;
  surname?: string | null;
}): Promise<CurrentUser> {
  const data = await apiFetch<RawCurrentUser>("/auth/me", {
    method: "PATCH",
    json: {
      // These are optional, so the user can update one field at a time.
      first_name: payload.firstName,
      surname: payload.surname,
    },
  });

  return normaliseUser(data);
}

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

export async function signOut(): Promise<void> {
  await apiFetch<{ ok: boolean }>("/auth/signout", {
    method: "POST",
  });
}

export async function signOutAllDevices(): Promise<void> {
  await apiFetch<{ ok: boolean }>("/auth/signout-all", {
    method: "POST",
  });
}