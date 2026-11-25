import { apiRequest } from "./api";

export interface Credentials {
  email: string;
  password: string;
}

export async function register(credentials: Credentials): Promise<void> {
  await apiRequest("/auth/register", { method: "POST", body: credentials });
}

export async function login(credentials: Credentials): Promise<string> {
  const { accessToken } = await apiRequest<{ accessToken: string }>(
    "/auth/login",
    { method: "POST", body: credentials },
  );
  return accessToken;
}
