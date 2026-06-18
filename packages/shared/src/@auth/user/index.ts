import type { PartialDeep } from "type-fest";
import type { AppSettingsConfigType } from "../../@app/core/AppSettings/AppSettings";

/**
 * The type definition for a user object.
 * Apps using @ecom/shared must conform to this shape.
 * Role maps to Ecom role names.
 */
export type User = {
  id: string;
  role: string[] | string | null;
  displayName: string;
  photoURL?: string;
  email?: string;
  shortcuts?: string[];
  settings?: PartialDeep<AppSettingsConfigType>;
  loginRedirectUrl?: string;
};
