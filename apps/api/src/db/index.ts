import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
}

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * Helper for running queries.
 * Use this instead of calling pool.query directly.
 */
export async function query<T = any>(
    text: string,
    params?: any[]
): Promise<T[]> {
    const result = await pool.query(text, params);
    return result.rows;
}