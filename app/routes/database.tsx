import { Link, useLoaderData, useLocation } from "react-router";
import type { Route } from "./+types/database";

// Define a interface para os dados do schema da tabela
interface TableSchema {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

/**
 * O loader agora também busca o schema e uma amostra de dados da tabela
 * selecionada através de um parâmetro na URL (ex: /database?table=tb_usuario).
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB_APP;
  const url = new URL(request.url);
  const tableName = url.searchParams.get("table");

  try {
    // 1. Buscar a lista de todas as tabelas
    const tablesStmt = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    const { results: tablesResults } = await tablesStmt.all<{ name: string }>();
    const tables = tablesResults ? tablesResults.map((row) => row.name) : [];

    let schema: TableSchema[] | null = null;
    let rows: Record<string, unknown>[] | null = null;
    let queryError: string | null = null;

    // 2. Se um nome de tabela for fornecido e válido, buscar seus detalhes
    if (tableName && tables.includes(tableName)) {
      try {
        // PRAGMA é seguro aqui, pois validamos que `tableName` existe na lista de tabelas
        const schemaStmt = db.prepare(`PRAGMA table_info(${tableName})`);
        const { results: schemaResults } = await schemaStmt.all<TableSchema>();
        schema = schemaResults || [];

        const rowsStmt = db.prepare(`SELECT * FROM ${tableName} LIMIT 10`);
        const { results: rowsResults } = await rowsStmt.all();
        rows = rowsResults as Record<string, unknown>[];
      } catch (e) {
        queryError =
          e instanceof Error ? e.message : "Ocorreu um erro desconhecido ao consultar a tabela.";
        console.error(`Erro ao buscar dados da tabela '${tableName}':`, e);
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
    console.error("Database connection failed:", error);
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

/**
 * O componente React foi atualizado para renderizar as novas informações.
 */
export default function DatabaseExplorer() {
  const { connection, tables, error, selectedTable, schema, rows } =
    useLoaderData() as Awaited<ReturnType<typeof loader>>;

  return (
    <main className="container mx-auto p-4 md:p-8 font-sans text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6">Database Explorer</h1>

      {connection === "failed" && (
        <StatusMessage type="error" title="Falha na conexão." message={error || ""} />
      )}
      {error && connection === "success" && (
        <StatusMessage type="error" title="Erro na Consulta" message={error} />
      )}

      <div className="md:grid md:grid-cols-12 md:gap-8">
        {/* Coluna da Lista de Tabelas */}
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

        {/* Coluna de Conteúdo Principal */}
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
              <DataTable schema={schema} rows={rows} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// Componentes auxiliares para manter o código principal limpo

function StatusMessage({ type, title, message }: { type: 'success' | 'error', title: string, message: string }) {
  const baseClasses = "border-l-4 p-4 rounded-md mb-6";
  const typeClasses = {
    success: "bg-green-100 border-green-500 text-green-700",
    error: "bg-red-100 border-red-500 text-red-700",
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

function DataTable({ schema, rows }: { schema: TableSchema[] | null, rows: Record<string, unknown>[] | null }) {
  if (!schema || !rows) return null;
  const headers = schema.map(col => col.name);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <h3 className="text-lg font-semibold p-4 border-b dark:border-gray-700">Amostra de Dados (Primeiros 10 Registros)</h3>
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
                <tr key={rowIndex}>
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

