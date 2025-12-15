// Simple migration runner
import fs from "fs";
import path from "path";
import { pool } from "./index";

async function runMigrations() {
    const migrationsDir = path.join(__dirname, "migrations");

    const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort();

    if (files.length === 0) {
        console.log("No migrations found.");
        return;
    }

    console.log(`Running ${files.length} migrations...`);

    for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, "utf-8");

        console.log(`Running migration: ${file}`);

        try {
            await pool.query(sql);
        } catch (err) {
            console.error(`Migration failed: ${file}`);
            throw err;
        }
    }

    console.log("Migrations complete.");
    await pool.end();
}

runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));