"use client";

import { useState, type FormEvent } from "react";
import type { Notification, NotificationInput } from "@/lib/notifications";

interface NotificationFormProps {
  channels: string[];
  editing: Notification | null;
  onSubmit: (input: NotificationInput) => Promise<void>;
  onCancel: () => void;
}

export function NotificationForm({
  channels,
  editing,
  onSubmit,
  onCancel,
}: NotificationFormProps) {
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setPending(true);
    try {
      await onSubmit({
        title: String(form.get("title")),
        content: String(form.get("content")),
        channel: String(form.get("channel")),
        recipient: String(form.get("recipient")),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card card-body mb-4">
      <h2 className="h5">
        {editing ? "Editar notificación" : "Nueva notificación"}
      </h2>

      <div className="mb-3">
        <label htmlFor="title" className="form-label">
          Título
        </label>
        <input
          id="title"
          name="title"
          className="form-control"
          defaultValue={editing?.title}
          maxLength={200}
          required
        />
      </div>

      <div className="mb-3">
        <label htmlFor="content" className="form-label">
          Contenido
        </label>
        <textarea
          id="content"
          name="content"
          className="form-control"
          rows={3}
          defaultValue={editing?.content}
          maxLength={10000}
          required
        />
      </div>

      <div className="row">
        <div className="col-md-4 mb-3">
          <label htmlFor="channel" className="form-label">
            Canal
          </label>
          <select
            id="channel"
            name="channel"
            className="form-select"
            defaultValue={editing?.channel}
            required
          >
            {channels.map((channel) => (
              <option key={channel} value={channel}>
                {channel}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-8 mb-3">
          <label htmlFor="recipient" className="form-label">
            Destinatario
          </label>
          <input
            id="recipient"
            name="recipient"
            className="form-control"
            defaultValue={editing?.recipient}
            maxLength={512}
            required
          />
          <div className="form-text">
            Un email, un teléfono como +56912345678 o un token de dispositivo,
            según el canal.
          </div>
        </div>
      </div>

      <div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Enviando..." : editing ? "Guardar cambios" : "Crear y enviar"}
        </button>
        {editing && (
          <button
            type="button"
            className="btn btn-link"
            onClick={onCancel}
            disabled={pending}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
