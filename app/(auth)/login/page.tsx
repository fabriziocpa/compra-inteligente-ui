"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { loginSchema, type LoginFormValues } from "@/lib/schemas";
import { useLogin } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useLogin();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setSubmitting(true);
    try {
      await login.mutateAsync(values);
      toast.success("Sesión iniciada");
      router.replace(params.get("from") ?? "/");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 401
          ? "Correo o contraseña incorrectos."
          : err instanceof Error
            ? err.message
            : "No se pudo iniciar sesión.";
      toast.error(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h2>
        <p className="text-muted-foreground text-sm">
          Ingresa tus credenciales para acceder al panel.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel help="Correo con el que te registraste.">
                  Correo electrónico
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="asesor@banco.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel help="Tu contraseña de acceso.">Contraseña</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            Iniciar sesión
          </Button>
        </form>
      </Form>

      <p className="text-muted-foreground text-center text-sm">
        ¿No tienes una cuenta?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
