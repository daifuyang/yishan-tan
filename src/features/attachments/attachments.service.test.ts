import { describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => {
  return {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    insert: vi.fn(),
    values: vi.fn(),
    returning: vi.fn(),
    delete: vi.fn(),
  };
});

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ kind: "eq", col, val })),
  and: vi.fn((...args: unknown[]) => ({ kind: "and", args })),
  isNull: vi.fn((col: unknown) => ({ kind: "isNull", col })),
  gte: vi.fn((col: unknown, val: unknown) => ({ kind: "gte", col, val })),
  lte: vi.fn((col: unknown, val: unknown) => ({ kind: "lte", col, val })),
  like: vi.fn((col: unknown, val: unknown) => ({ kind: "like", col, val })),
  desc: vi.fn((col: unknown) => ({ kind: "desc", col })),
  sql: Object.assign(
    vi.fn(() => ({ kind: "sql" })),
    { join: vi.fn(() => ({ kind: "sql-join" })) },
  ),
}));

vi.mock("~/lib/db.server", () => ({
  getDb: () => mockDb,
}));

vi.mock("node:fs/promises", () => ({
  rm: vi.fn(async () => undefined),
}));

vi.mock("~/lib/storage-driver", () => ({
  putObject: vi.fn(),
}));

const linkChain = (value: unknown) => {
  const obj: Record<string, unknown> = {};
  const make = (): unknown => {
    const fn = (next?: unknown) => {
      if (next === undefined) return Promise.resolve(value);
      return make();
    };
    Object.assign(obj, {
      select: fn,
      from: fn,
      where: fn,
      orderBy: fn,
      limit: fn,
      offset: fn,
      insert: fn,
      values: fn,
      returning: fn,
      delete: fn,
    });
    return obj;
  };
  return make();
};

describe("attachments.service", () => {
  it("createAttachmentService maps row to DTO", async () => {
    const created = {
      id: "11111111-1111-1111-1111-111111111111",
      uploaderId: null,
      storageId: null,
      storageKey: "2026/07/05/abc.png",
      url: "/uploads/2026/07/05/abc.png",
      name: "abc.png",
      mime: "image/png",
      size: 1234,
      width: null,
      height: null,
      category: "image",
      createdAt: new Date("2026-07-05T10:00:00Z"),
      updatedAt: new Date("2026-07-05T10:00:00Z"),
    };

    mockDb.insert.mockReturnValue(linkChain([created]));
    const { createAttachmentService } = await import("~/features/attachments/attachments.service");
    const result = await createAttachmentService({
      uploaderId: null,
      storageId: null,
      storageKey: "2026/07/05/abc.png",
      url: "/uploads/2026/07/05/abc.png",
      name: "abc.png",
      mime: "image/png",
      size: 1234,
      category: "image",
    });
    expect(result.id).toBe(created.id);
    expect(result.category).toBe("image");
    expect(result.url).toBe(created.url);
    expect(result.createdAt).toBe(created.createdAt.toISOString());
  });

  it("deleteAttachmentService deletes DB record even when driver row is missing", async () => {
    const attachment = {
      id: "22222222-2222-2222-2222-222222222222",
      uploaderId: null,
      storageId: "33333333-3333-3333-3333-333333333333",
      storageKey: "2026/07/05/zzz.png",
      url: "/uploads/2026/07/05/zzz.png",
      name: "zzz.png",
      mime: "image/png",
      size: 42,
      width: null,
      height: null,
      category: "image",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let fromCall = 0;
    mockDb.select.mockImplementation(() => mockDb);
    mockDb.from.mockImplementation(() => {
      fromCall += 1;
      if (fromCall === 1) {
        return {
          where: () => ({
            limit: () => Promise.resolve([attachment]),
          }),
        };
      }
      if (fromCall === 2) {
        return {
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        };
      }
      return {
        where: () => Promise.resolve(undefined),
      };
    });
    mockDb.delete.mockImplementation(() => ({
      where: () => Promise.resolve(undefined),
    }));

    const { deleteAttachmentService } = await import("~/features/attachments/attachments.service");
    const result = await deleteAttachmentService(attachment.id as string);
    expect(result.ok).toBe(true);
    expect(mockDb.delete).toHaveBeenCalled();
  });
});
