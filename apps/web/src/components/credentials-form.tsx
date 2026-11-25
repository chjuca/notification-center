"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
import type { Credentials } from "@/lib/auth";

interface CredentialsFormProps {
  title: string;
  submitLabel: string;
  passwordHint?: string;
  footer: ReactNode;
  onSubmit: (credentials: Credentials) => Promise<void>;
}

export function CredentialsForm({
  title,
  submitLabel,
  passwordHint,
  footer,
  onSubmit,
}: CredentialsFormProps) {
  const id = useId();
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    setErrors([]);
    setPending(true);
    try {
      await onSubmit({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      formElement.reset();
    } catch (error) {
      setErrors(
        error instanceof ApiError ? error.messages : ["Error inesperado"],
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 420 }}>
      <h1 className="h3 mb-4">{title}</h1>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor={`${id}-email`} className="form-label">
            Email
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            className="form-control"
            autoComplete="email"
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor={`${id}-password`} className="form-label">
            Contraseña
          </label>
          <input
            id={`${id}-password`}
            name="password"
            type="password"
            className="form-control"
            required
          />
          {passwordHint && <div className="form-text">{passwordHint}</div>}
        </div>

        {errors.length > 0 && (
          <div className="alert alert-danger" role="alert">
            {errors.map((message) => (
              <div key={message}>{message}</div>
            ))}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Enviando..." : submitLabel}
        </button>
      </form>

      <p className="mt-3">{footer}</p>
    </div>
  );
}
