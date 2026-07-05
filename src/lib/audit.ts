import type { ServiceContext } from "./service-context";

export function getActorId(ctx: ServiceContext): string {
  return ctx.userId;
}
