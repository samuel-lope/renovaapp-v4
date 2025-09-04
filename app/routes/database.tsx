import type { Route } from "./+types/database";

/**
 * O loader é executado no servidor (Cloudflare Worker) antes da renderização da página.
 * Ele tenta se conectar ao banco de dados D1 e buscar a lista de tabelas.
 */
export async function loader({ context }: Route.LoaderArgs) {
  try {
    // Acessa o binding do banco de dados D1 configurado no wrangler.jsonc
    const db = context.cloudflare.env.DB_APP;

    // Prepara e executa a query para listar todas as tabelas
    const stmt = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    const { results } = await stmt.all<{ name: string }>();
    const tables = results ? results.map((row) => row.name) : [];

    // Retorna os dados para o componente
    return {
      connection: "success",
      tables: tables,
      error: null,
    };
  } catch (error) {
    console.error("Database connection failed:", error);
    // Em caso de erro, retorna um status de falha e a mensagem de erro
    return {
      connection: "failed",
      tables: [],
      error: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
    };
  }
}

/**
 * O componente React que renderiza a página, utilizando os dados do loader.
 */
export default function DatabaseStatus({ loaderData }: Route.ComponentProps) {
  const { connection, tables, error } = loaderData;

  return (
    <main className="container mx-auto p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">
        Status da Base de Dados D1
      </h1>

      {connection === "success" ? (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md mb-6" role="alert">
          <p className="font-bold">Conexão bem-sucedida!</p>
          <p>A aplicação conectou-se com sucesso à base de dados D1.</p>
        </div>
      ) : (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6" role="alert">
          <p className="font-bold">Falha na conexão.</p>
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
            Tabelas na Base de Dados
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full leading-normal">
            <thead>
              <tr>
                <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Nome da Tabela
                </th>
              </tr>
            </thead>
            <tbody>
              {tables && tables.length > 0 ? (
                tables.map((tableName) => (
                  <tr key={tableName}>
                    <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                      <p className="text-gray-900 dark:text-gray-100 whitespace-no-wrap">
                        {tableName}
                      </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      {connection === 'success' ? 'Nenhuma tabela encontrada.' : 'Não foi possível carregar as tabelas.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

