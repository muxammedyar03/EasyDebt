import { MigrationAdapter } from "./adapter";

export type MigrationBuilder = {
  addColumn: (
    table: string,
    column: string,
    type: string,
    defaultValue?: string | number | boolean | Date | Buffer | unknown,
  ) => MigrationBuilder;
  dropColumn: (table: string, column: string) => MigrationBuilder;
  renameColumn: (table: string, oldName: string, newName: string) => MigrationBuilder;
  createTable: (table: string, columns: Record<string, string>) => MigrationBuilder;
  dropTable: (table: string) => MigrationBuilder;
  run: (sql: string) => MigrationBuilder;
  code: (cb: (adapter: MigrationAdapter) => Promise<string[]>) => MigrationBuilder;
  commit: () => Promise<void>;
};

export function createMigrationBuilder(name: string, adapter: MigrationAdapter): MigrationBuilder {
  const sqls: (string | ((adapter: MigrationAdapter) => Promise<string[]>))[] = [];

  const builder: MigrationBuilder = {
    addColumn(table, column, type, defaultValue) {
      const defaultClause = defaultValue
        ? `DEFAULT ${typeof defaultValue === "string" ? `'${defaultValue}'` : defaultValue}`
        : "";

      const sql = `
        DO $$ BEGIN
          IF EXISTS(SELECT * FROM information_schema.tables WHERE table_name = '${table}')
          AND NOT EXISTS(SELECT * FROM information_schema.columns 
                         WHERE table_name = '${table}' AND column_name = '${column}')
          THEN
            ALTER TABLE "${table}" ADD COLUMN "${column}" ${type} ${defaultClause};
          END IF;
        END $$;
      `;
      sqls.push(sql);
      return builder;
    },

    dropColumn(table, column) {
      const sql = `
        DO $$ BEGIN
          IF EXISTS(SELECT * FROM information_schema.columns 
                   WHERE table_name = '${table}' AND column_name = '${column}')
          THEN
            ALTER TABLE "${table}" DROP COLUMN "${column}";
          END IF;
        END $$;
      `;
      sqls.push(sql);
      return builder;
    },

    renameColumn(table, oldName, newName) {
      const sql = `
        DO $$ BEGIN
          IF EXISTS(SELECT * FROM information_schema.columns 
                   WHERE table_name = '${table}' AND column_name = '${oldName}')
          THEN
            ALTER TABLE "${table}" RENAME COLUMN "${oldName}" TO "${newName}";
          END IF;
        END $$;
      `;
      sqls.push(sql);
      return builder;
    },

    dropTable(table) {
      const sql = `DROP TABLE IF EXISTS "${table}" CASCADE;`;
      sqls.push(sql);
      return builder;
    },

    createTable(table, columns) {
      const cols = Object.entries(columns)
        .map(([name, type]) => `"${name}" ${type}`)
        .join(", ");
      const sql = `CREATE TABLE IF NOT EXISTS "${table}" (${cols});`;
      sqls.push(sql);
      return builder;
    },

    run(sql) {
      sqls.push(sql);
      return builder;
    },

    code(cb) {
      sqls.push(cb);
      return builder;
    },

    async commit() {
      await adapter.transaction(async (tx) => {
        // One connection and lock cover callback side effects, DDL and the tracking row.
        await tx.query("SELECT pg_advisory_xact_lock(20260922, 1)");
        const exists = await tx.query<{ name: string }>("SELECT name FROM _custom_migrations WHERE name = $1", [name]);
        if (exists.length) return;
        for (const step of sqls) {
          const queries = typeof step === "function" ? await step(tx) : [step];
          for (const query of queries) if (query.trim()) await tx.exec(query);
        }
        await tx.query("INSERT INTO _custom_migrations (created_at, name) VALUES (NOW(), $1) RETURNING name", [name]);
      });
      console.log(`Migration "${name}" completed or already applied`);
    },
  };

  return builder;
}
