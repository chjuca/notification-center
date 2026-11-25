import { apiRequest } from "./api";

export interface Delivery {
  id: string;
  channel: string;
  recipient: string;
  status: "sent" | "failed";
  details: Record<string, unknown>;
  error: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  channel: string;
  recipient: string;
  createdAt: string;
  updatedAt: string;
  deliveries: Delivery[];
}

export interface NotificationPage {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationInput {
  title: string;
  content: string;
  channel: string;
  recipient: string;
}

export const PAGE_SIZE = 5;

export async function listChannels(token: string): Promise<string[]> {
  const channels = await apiRequest<{ name: string }[]>("/channels", { token });
  return channels.map((channel) => channel.name);
}

export function listNotifications(
  token: string,
  page: number,
): Promise<NotificationPage> {
  return apiRequest(`/notifications?page=${page}&limit=${PAGE_SIZE}`, {
    token,
  });
}

export function createNotification(
  token: string,
  input: NotificationInput,
): Promise<Notification> {
  return apiRequest("/notifications", { method: "POST", body: input, token });
}

export function updateNotification(
  token: string,
  id: string,
  input: NotificationInput,
): Promise<Notification> {
  return apiRequest(`/notifications/${id}`, {
    method: "PATCH",
    body: input,
    token,
  });
}

export function deleteNotification(token: string, id: string): Promise<void> {
  return apiRequest(`/notifications/${id}`, { method: "DELETE", token });
}
