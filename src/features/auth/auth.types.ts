import type { ServiceContext } from "~/lib/service-context";

export type PublicUser = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  role: "admin" | "member";
};

export type CurrentUserServiceInput = undefined;
export type CurrentUserServiceOutput = PublicUser | null;

export type CreateSessionServiceInput = {
  account: string;
  password: string;
};
export type CreateSessionServiceOutput = {
  user: PublicUser;
};

export type CreateUserServiceInput = {
  email: string;
  password: string;
  username: string;
  name?: string;
  displayName?: string;
  phone?: string;
};
export type CreateUserServiceOutput = PublicUser;

export type DeleteSessionServiceInput = undefined;
export type DeleteSessionServiceOutput = { ok: true };

export type CurrentUserService = (ctx: ServiceContext | null) => Promise<CurrentUserServiceOutput>;
export type CreateSessionService = (
  input: CreateSessionServiceInput,
  headers: Headers,
) => Promise<CreateSessionServiceOutput>;
export type DeleteSessionService = (ctx: ServiceContext) => Promise<DeleteSessionServiceOutput>;
export type CreateUserService = (
  input: CreateUserServiceInput,
  headers: Headers,
) => Promise<CreateUserServiceOutput>;
