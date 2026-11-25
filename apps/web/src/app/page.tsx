"use client";

import Link from "next/link";
import { clearToken, useToken } from "@/lib/session";

export default function HomePage() {
  const token = useToken();

  if (token === undefined) {
    return null;
  }

  if (token === null) {
    return (
      <>
        <p>Inicia sesión para gestionar tus notificaciones.</p>
        <Link href="/login" className="btn btn-primary me-2">
          Iniciar sesión
        </Link>
        <Link href="/register" className="btn btn-outline-primary">
          Crear cuenta
        </Link>
      </>
    );
  }

  return (
    <>
      <p>Sesión iniciada.</p>
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={clearToken}
      >
        Cerrar sesión
      </button>
    </>
  );
}
