import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
}
export const db = new Pool({
    connectionString: process.env.DATABASE_URL
});

/**
 * Helper for running queries.
 * Use this instead of calling db.query directly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = any>(
    text: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any[]
): Promise<T[]> {
    const result = await db.query(text, params);
    return result.rows;
}
