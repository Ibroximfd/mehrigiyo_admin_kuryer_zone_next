"use client";

import { useMutation } from "@tanstack/react-query";

import { login } from "../api/auth-api";
import type { LoginFormValues } from "../model/auth";
import { useAuthStore } from "./auth-store";

export function useLogin() {
  const signIn = useAuthStore((state) => state.signIn);
  return useMutation({
    mutationFn: (values: LoginFormValues) => login(values),
    onSuccess: signIn,
  });
}
