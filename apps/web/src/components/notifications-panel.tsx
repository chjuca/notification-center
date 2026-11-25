"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  createNotification,
  deleteNotification,
  listChannels,
  listNotifications,
  PAGE_SIZE,
  updateNotification,
  type Notification,
  type NotificationInput,
  type NotificationPage,
} from "@/lib/notifications";
import { clearToken } from "@/lib/session";
import { NotificationForm } from "./notification-form";
import { NotificationList } from "./notification-list";

export function NotificationsPanel({ token }: { token: string }) {
  const [channels, setChannels] = useState<string[]>([]);
  const [data, setData] = useState<NotificationPage | null>(null);
  const [page, setPage] = useState(1);
  const [reloads, setReloads] = useState(0);
  const [editing, setEditing] = useState<Notification | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const handleError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      clearToken();
      return;
    }
    setErrors(error instanceof ApiError ? error.messages : ["Error inesperado"]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listChannels(token)
      .then((result) => {
        if (!cancelled) setChannels(result);
      })
      .catch(handleError);
    return () => {
      cancelled = true;
    };
  }, [token, handleError]);

  useEffect(() => {
    let cancelled = false;
    listNotifications(token, page)
      .then((result) => {
        if (cancelled) return;
        if (result.items.length === 0 && page > 1) {
          setPage(page - 1);
          return;
        }
        setData(result);
      })
      .catch(handleError);
    return () => {
      cancelled = true;
    };
  }, [token, page, reloads, handleError]);

  async function handleSubmit(input: NotificationInput) {
    setErrors([]);
    try {
      if (editing) {
        await updateNotification(token, editing.id, input);
      } else {
        await createNotification(token, input);
        setPage(1);
      }
      setEditing(null);
      setFormVersion((version) => version + 1);
      setReloads((count) => count + 1);
    } catch (error) {
      handleError(error);
    }
  }

  async function handleDelete(notification: Notification) {
    if (!window.confirm(`¿Eliminar "${notification.title}"?`)) {
      return;
    }
    setErrors([]);
    try {
      await deleteNotification(token, notification.id);
      if (editing?.id === notification.id) {
        setEditing(null);
      }
      setReloads((count) => count + 1);
    } catch (error) {
      handleError(error);
    }
  }

  function handleEdit(notification: Notification) {
    setErrors([]);
    setEditing(notification);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <div className="d-flex justify-content-end mb-3">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={clearToken}
        >
          Cerrar sesión
        </button>
      </div>

      <NotificationForm
        key={`${editing?.id ?? "new"}-${formVersion}`}
        channels={channels}
        editing={editing}
        onSubmit={handleSubmit}
        onCancel={() => setEditing(null)}
      />

      {errors.length > 0 && (
        <div className="alert alert-danger" role="alert">
          {errors.map((message) => (
            <div key={message}>{message}</div>
          ))}
        </div>
      )}

      <h2 className="h5">Mis notificaciones</h2>

      {data === null ? (
        <p className="text-muted">Cargando...</p>
      ) : (
        <>
          <NotificationList
            notifications={data.items}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              Anterior
            </button>
            <span>
              Página {page} de {totalPages} ({data.total} en total)
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </>
  );
}
