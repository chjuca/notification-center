"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CredentialsForm } from "@/components/credentials-form";
import { login, type Credentials } from "@/lib/auth";
import { saveToken } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();

  async function handleLogin(credentials: Credentials) {
    saveToken(await login(credentials));
    router.push("/");
  }

  return (
    <CredentialsForm
      title="Iniciar sesión"
      submitLabel="Entrar"
      onSubmit={handleLogin}
      footer={
        <>
          ¿No tienes cuenta? <Link href="/register">Regístrate</Link>
        </>
      }
    />
  );
}
