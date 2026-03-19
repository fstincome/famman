import { supabase } from "@/integrations/supabase/client";

const escapeSQL = (val: unknown): string => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (Array.isArray(val)) return `'{${val.map(v => `"${String(v).replace(/'/g, "''")}"` ).join(',')}}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
};

const generateInserts = (tableName: string, rows: Record<string, unknown>[]): string => {
  if (!rows || rows.length === 0) return `-- No data in ${tableName}\n`;
  const columns = Object.keys(rows[0]);
  const lines = rows.map(row => {
    const values = columns.map(col => escapeSQL(row[col]));
    return `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
  });
  return `-- Table: ${tableName} (${rows.length} rows)\n${lines.join('\n')}\n\n`;
};

export async function generateBackupSQL(): Promise<string> {
  const { data: companyId } = await supabase.rpc('get_user_company_id');
  if (!companyId) throw new Error('No company found');

  const tables = [
    'income_records',
    'expense_records',
    'budget_envelopes',
    'family_assets',
    'family_debts',
    'family_events',
    'family_projects',
    'project_tasks',
    'contacts',
  ] as const;

  const now = new Date().toISOString();
  let sql = `-- ========================================\n`;
  sql += `-- BACKUP - Logiciel Familial\n`;
  sql += `-- Date: ${now}\n`;
  sql += `-- Company ID: ${companyId}\n`;
  sql += `-- ========================================\n\n`;
  sql += `BEGIN;\n\n`;

  for (const table of tables) {
    const { data } = await supabase
      .from(table)
      .select('*')
      .eq('company_id', companyId);
    sql += generateInserts(table, (data || []) as Record<string, unknown>[]);
  }

  sql += `COMMIT;\n`;
  return sql;
}

export async function purgeCompanyData(): Promise<void> {
  const { data: companyId } = await supabase.rpc('get_user_company_id');
  if (!companyId) throw new Error('No company found');

  const tables = [
    'project_tasks',
    'family_projects',
    'family_events',
    'family_assets',
    'family_debts',
    'contacts',
    'budget_envelopes',
    'expense_records',
    'income_records',
  ] as const;

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('company_id', companyId);
    if (error) console.error(`Error purging ${table}:`, error);
  }
}

export function downloadSQL(content: string) {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([content], { type: 'application/sql' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_familial_${date}.sql`;
  a.click();
  URL.revokeObjectURL(url);
}
