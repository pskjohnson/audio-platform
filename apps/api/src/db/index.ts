import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
}
export const db = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * Helper for running queries.
 * Use this instead of calling db.query directly.
 */
export async function query<T = any>(
    text: string,
    params?: any[]
): Promise<T[]> {
    const result = await db.query(text, params);
    return result.rows;
}
