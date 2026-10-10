import { describe, expect, it, vi } from "vitest";
import type { ServiceContext } from "~/lib/service-context";

const check = vi.hoisted(() => vi.fn());
vi.mock("~/features/permissions/permissions.service", () => ({ assertPermissionService: check }));
const { assertPostOperation } = await import("./posts.policy");
const ctx: ServiceContext = { userId: "member", headers: new Headers(), authKind: "session" };

describe("posts operation policy", () => {
  it("checks the requested operation for a delegated member", async () => {
    check.mockResolvedValueOnce(undefined);
    await expect(assertPostOperation(ctx, "posts:read")).resolves.toBeUndefined();
    expect(check).toHaveBeenLastCalledWith(ctx, "posts:read");
  });
  it("propagates rejection rather than falling back to navigation access", async () => {
    const error = new Error("forbidden");
    check.mockRejectedValueOnce(error);
    await expect(assertPostOperation(ctx, "posts:delete")).rejects.toBe(error);
  });
});
