import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/database";

// Define the interface for table schema data
interface TableSchema {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

/**
 * Converts an array of objects into a CSV formatted string.
 * @param data The array of objects to convert.
 * @returns A string in CSV format.
 */
function convertToCSV(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) {
    return "";
  }
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")]; // Header row

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      let stringValue =
        value === null || value === undefined ? "" : String(value);

      // Escape double quotes and wrap in quotes if the value contains a comma, quote, or newline.
      if (
        stringValue.includes('"') ||
        stringValue.includes(",") ||
        stringValue.includes("\n") ||
        stringValue.includes("\r")
      ) {
        stringValue = `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB_APP;
  const url = new URL(request.url);
  const tableName = url.searchParams.get("table");
  const shouldDownload = url.searchParams.get("download") === "true";

  // --- Path 1: Handle CSV Download Request ---
  if (shouldDownload && tableName) {
    try {
      const tablesStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
      const tablesResult = await tablesStmt.all<{ name: string }>();
      const tables = tablesResult?.results ? tablesResult.results.map((row) => row.name) : [];
      
      if (!tables.includes(tableName)) {
        return new Response(`Error: Table "${tableName}" not found.`, { status: 404 });
      }

      const allRowsStmt = db.prepare(`SELECT * FROM "${tableName}"`);
      const allRowsResult = await allRowsStmt.all();
      const allRowsData = allRowsResult?.results as Record<string, unknown>[] || [];

      // Add the UTF-8 BOM to ensure correct encoding in applications like Excel.
      const csv = "\uFEFF" + convertToCSV(allRowsData);

      const headers = new Headers({
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${tableName}.csv"`,
      });
      return new Response(csv, { headers });

    } catch (e) {
      console.error(`Error during CSV export for table '${tableName}':`, e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      return new Response(`Failed to export CSV: ${errorMessage}`, { status: 500 });
    }
  }

  // --- Path 2: Handle HTML Page Render Request ---
  try {
    const tablesStmt = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    const { results: tablesResults } = await tablesStmt.all<{ name: string }>();
    const tables = tablesResults ? tablesResults.map((row) => row.name) : [];

    let schema: TableSchema[] | null = null;
    let rows: Record<string, unknown>[] | null = null;
    let queryError: string | null = null;

    if (tableName) {
        if (!tables.includes(tableName)) {
            queryError = `Tabela "${tableName}" não encontrada.`
        } else {
            try {
                const schemaStmt = db.prepare(`PRAGMA table_info("${tableName}")`);
                const { results: schemaResults } = await schemaStmt.all<TableSchema>();
                schema = schemaResults || [];

                const rowsStmt = db.prepare(`SELECT * FROM "${tableName}" LIMIT 10`);
                const { results: rowsResults } = await rowsStmt.all();
                rows = rowsResults as Record<string, unknown>[];
            } catch (e) {
                queryError = e instanceof Error ? e.message : "Ocorreu um erro desconhecido ao consultar a tabela.";
                console.error(`Erro ao buscar dados da tabela '${tableName}':`, e);
            }
        }
    }
    
    return {
      connection: "success",
      tables,
      error: queryError,
      selectedTable: tableName,
      schema,
      rows,
    };

  } catch (error) {
    console.error("Falha na conexão com o banco de dados:", error);
    return {
      connection: "failed",
      tables: [],
      error: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
      selectedTable: null,
      schema: null,
      rows: null,
    };
  }
}

export default function DatabaseExplorer() {
  const loaderData = useLoaderData() as Awaited<ReturnType<typeof loader>>;

  if (loaderData instanceof Response) {
    return null;
  }
  
  const { connection, tables, error, selectedTable, schema, rows } = loaderData;
  
  return (
    <main className="container mx-auto p-4 md:p-8 font-sans text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6">Database Explorer</h1>

      {connection === "failed" && (
        <StatusMessage type="error" title="Falha na Conexão." message={error || ""} />
      )}
      {error && connection === "success" && (
        <StatusMessage type="error" title="Erro na Consulta" message={error} />
      )}

      <div className="md:grid md:grid-cols-12 md:gap-8">
        <aside className="md:col-span-3 mb-8 md:mb-0">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-600">
            Tabelas
          </h2>
          <nav className="flex flex-col space-y-1">
            {tables && tables.length > 0 ? (
              tables.map((tableName: string) => (
                <TableLink
                  key={tableName}
                  tableName={tableName}
                  isActive={tableName === selectedTable}
                />
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                Nenhuma tabela encontrada.
              </p>
            )}
          </nav>
        </aside>

        <div className="md:col-span-9">
          {!selectedTable ? (
            <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">
                Selecione uma tabela à esquerda para ver os detalhes.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <SchemaTable schema={schema} />
              <DataTable schema={schema} rows={rows} selectedTable={selectedTable}/>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// --- Componentes Auxiliares ---

function StatusMessage({ type, title, message }: { type: 'success' | 'error', title: string, message: string }) {
  const baseClasses = "border-l-4 p-4 rounded-md mb-6";
  const typeClasses = {
    success: "bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
    error: "bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
  };
  return (
    <div className={`${baseClasses} ${typeClasses[type]}`} role="alert">
      <p className="font-bold">{title}</p>
      <p>{message}</p>
    </div>
  );
}

function TableLink({ tableName, isActive }: { tableName: string; isActive: boolean }) {
  const baseClasses = "block w-full text-left px-4 py-2 rounded-md transition-colors duration-150";
  const activeClasses = "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold";
  const inactiveClasses = "hover:bg-gray-100 dark:hover:bg-gray-700";

  return (
    <Link
      to={`/database?table=${tableName}`}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
    >
      {tableName}
    </Link>
  );
}

function SchemaTable({ schema }: { schema: TableSchema[] | null }) {
  if (!schema) return null;
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <h3 className="text-lg font-semibold p-4 border-b dark:border-gray-700">Esquema da Tabela</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              {['Coluna', 'Tipo', 'Não Nulo', 'Chave Primária'].map((header) => (
                <th key={header} className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schema.map((col) => (
              <tr key={col.name}>
                <td className="px-5 py-3 border-b border-gray-200 dark:border-gray-600 text-sm font-mono">{col.name}</td>
                <td className="px-5 py-3 border-b border-gray-200 dark:border-gray-600 text-sm font-mono">{col.type}</td>
                <td className="px-5 py-3 border-b border-gray-200 dark:border-gray-600 text-sm text-center">{col.notnull ? 'Sim' : 'Não'}</td>
                <td className="px-5 py-3 border-b border-gray-200 dark:border-gray-600 text-sm text-center">{col.pk ? 'Sim' : 'Não'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DataTable({ schema, rows, selectedTable }: { schema: TableSchema[] | null, rows: Record<string, unknown>[] | null, selectedTable: string | null }) {
  if (!schema || !rows) return null;
  const headers = schema.map(col => col.name);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
            <h3 className="text-lg font-semibold">Amostra de Dados (Primeiros 10 Registros)</h3>
            {selectedTable && (
                <a
                    href={`/database?table=${selectedTable}&download=true`}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 011.414 0L9 11.086V3a1 1 0 112 0v8.086l1.293-1.379a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Download CSV
                </a>
            )}
        </div>
      {rows.length === 0 ? (
         <p className="p-4 text-gray-500 dark:text-gray-400">Nenhum registro encontrado nesta tabela.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full leading-normal">
            <thead>
              <tr>
                {headers.map((header) => (
                   <th key={header} className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  {headers.map((header, colIndex) => (
                    <td key={colIndex} className="px-5 py-3 border-b border-gray-200 dark:border-gray-600 text-sm font-mono whitespace-pre-wrap break-all">
                      {String(row[header] === null ? 'NULL' : row[header])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

