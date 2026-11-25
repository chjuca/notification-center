"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CredentialsForm } from "@/components/credentials-form";
import { login, register, type Credentials } from "@/lib/auth";
import { saveToken } from "@/lib/session";

export default function RegisterPage() {
  const router = useRouter();

  async function handleRegister(credentials: Credentials) {
    await register(credentials);
    saveToken(await login(credentials));
    router.push("/");
  }

  return (
    <CredentialsForm
      title="Crear cuenta"
      submitLabel="Registrarme"
      passwordHint="Entre 8 y 128 caracteres."
      onSubmit={handleRegister}
      footer={
        <>
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </>
      }
    />
  );
}
