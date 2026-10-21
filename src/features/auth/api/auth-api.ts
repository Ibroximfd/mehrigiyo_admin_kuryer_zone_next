import { AUTH_PATHS, api } from "@/shared/lib/api-client";
import { toApiPhone } from "@/shared/lib/phone";

import { loginResponseSchema, type LoginFormValues, type LoginResult } from "../model/auth";

export function login(values: LoginFormValues): Promise<LoginResult> {
  return api.post(AUTH_PATHS.login, {
    schema: loginResponseSchema,
    json: { phone: toApiPhone(values.phone), password: values.password },
  });
}
