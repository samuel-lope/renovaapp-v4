// File: app/routes/index.tsx
import { Form, useLoaderData } from "react-router";
// Corrected import for server-side utilities
import { json, redirect } from "@react-router/node"; 
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { getSession } from "~/session";

// Define an interface for the module data structure
interface AppModule {
  id_modulo: number;
  ds_modulo: string;
  nome_modulo: string;
  tipo_modulo: string;
}

export const meta: MetaFunction = () => {
  return [{ title: "Página Inicial - RENOVAAPP" }];
};

// Protect the route and load user-specific modules
export async function loader({ request, context }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("userId")) {
    return redirect("/login");
  }

  const userId = session.get("userId");
  const userName = session.get("userName") || "Usuário";
  const userProfile = session.get("userProfile");

  // Fetch modules the user has permission to see
  const db = context.cloudflare.env.DB_APP;
  const stmt = db.prepare(
    `SELECT m.id_modulo, m.ds_modulo, m.nome_modulo, m.tipo_modulo
     FROM tb_modulo m
     JOIN tb_permissao p ON m.id_modulo = p.id_modulo
     JOIN tb_usuario u ON p.id_perfil = u.tb_perfil_idtb_perfil
     WHERE u.idtb_usuario = ?`
  ).bind(userId);
  
  // 1. Remove the generic from the .all() call
  const { results } = await stmt.all();

  // 2. Assert the type of the results after fetching them
  const modules = (results || []) as AppModule[];

  return json({
    userName,
    isAdmin: userProfile === "Administrador",
    // 3. Use the correctly typed variable in the filter
    appModules: modules.filter(m => m.tipo_modulo === 'app'),
  });
}

export default function Index() {
    // This type inference will now work correctly
    const { userName, isAdmin, appModules } = useLoaderData() as Awaited<ReturnType<typeof loader>>;

    return (
        <div className="container mx-auto p-8 dark:bg-gray-900 min-h-screen">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Seja Bem Vindo</h1>
                    <p className="text-gray-600 dark:text-gray-300">{userName}</p>
                </div>
                <div className="flex items-center space-x-4">
                    {isAdmin && (
                        <a href="/admin" className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700">
                            Painel Admin
                        </a>
                    )}
                    <Form action="/logout" method="post">
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                            Sair
                        </button>
                    </Form>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {appModules.map((mod: AppModule) => (
                    <ModuleCard key={mod.id_modulo} title={mod.ds_modulo} />
                ))}
            </div>
        </div>
    );
}

function ModuleCard({ title }: { title: string }) {
    // Placeholder icon - you can replace this with specific icons per module
    const icon = (
        <svg className="w-16 h-16 mb-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
    );

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer flex flex-col items-center text-center">
            {icon}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-4">{title}</h3>
        </div>
    );
}

