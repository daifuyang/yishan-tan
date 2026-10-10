import { describe, expect, it, vi } from "vitest";
import type { ServiceContext } from "~/lib/service-context";

const check = vi.hoisted(() => vi.fn());
vi.mock("~/features/permissions/permissions.service", () => ({ assertPermissionService: check }));
const { assertDepartmentOperation } = await import("./departments.policy");
const ctx: ServiceContext = { userId: "member", headers: new Headers(), authKind: "session" };

describe("departments operation policy", () => {
  it("checks the requested operation for a delegated member", async () => {
    check.mockResolvedValueOnce(undefined);
    await expect(assertDepartmentOperation(ctx, "departments:read")).resolves.toBeUndefined();
    expect(check).toHaveBeenLastCalledWith(ctx, "departments:read");
  });
  it("propagates rejection rather than falling back to navigation access", async () => {
    const error = new Error("forbidden");
    check.mockRejectedValueOnce(error);
    await expect(assertDepartmentOperation(ctx, "departments:delete")).rejects.toBe(error);
  });
});
