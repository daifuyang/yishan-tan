type DatabaseEnv = Partial<
  Record<
    | "DATABASE_URL"
    | "DATABASE_USER"
    | "DATABASE_PASSWORD"
    | "DATABASE_HOST"
    | "DATABASE_PORT"
    | "DATABASE_NAME",
    string
  >
>;

const DEFAULT_DATABASE_PORT = "5432";

function encodePart(value: string): string {
  return encodeURIComponent(value);
}

export function getDatabaseUrl(env: DatabaseEnv = process.env): string | undefined {
  if (env.DATABASE_URL) return env.DATABASE_URL;

  const user = env.DATABASE_USER;
  const password = env.DATABASE_PASSWORD;
  const host = env.DATABASE_HOST;
  const name = env.DATABASE_NAME;

  if (!user || !password || !host || !name) return undefined;

  const port = env.DATABASE_PORT || DEFAULT_DATABASE_PORT;
  return `postgres://${encodePart(user)}:${encodePart(password)}@${host}:${port}/${encodePart(name)}`;
}

export function requireDatabaseUrl(env: DatabaseEnv = process.env): string {
  const url = getDatabaseUrl(env);
  if (!url) {
    throw new Error(
      "Database is not configured. Set DATABASE_URL or DATABASE_USER, DATABASE_PASSWORD, DATABASE_HOST, DATABASE_PORT, and DATABASE_NAME.",
    );
  }
  return url;
}
