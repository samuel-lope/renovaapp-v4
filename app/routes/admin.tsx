// File: app/routes/admin.tsx
import { Form, useLoaderData, useNavigation, Link } from "react-router";
import { json, redirect } from "@react-router/node";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { getSession } from "~/session";

// Define an interface for the profile data structure
interface Profile {
    idtb_perfil: number;
    ds_perfil: string;
}

export const meta: MetaFunction = () => {
    return [{ title: "Admin - RENOVAAPP" }];
};

// Loader to protect the route and fetch data
export async function loader({ request, context }: LoaderFunctionArgs) {
    const session = await getSession(request.headers.get("Cookie"));
    
    // Authorization check
    if (session.get("userProfile") !== "Administrador") {
        return redirect("/");
    }

    const db = context.cloudflare.env.DB_APP;
    const profilesStmt = db.prepare("SELECT idtb_perfil, ds_perfil FROM tb_perfil ORDER BY ds_perfil");
    
    try {
        // Remove the generic from the .all() call
        const { results } = await profilesStmt.all();
        // Assert the type of the results after fetching
        const profiles = (results || []) as Profile[];
        
        return json({ profiles });
    } catch (error) {
        console.error("Failed to load admin data:", error);
        return json({ profiles: [], error: "Falha ao carregar dados." });
    }
}

// Action to handle form submissions (Create, Update, Delete)
export async function action({ request, context }: ActionFunctionArgs) {
    const session = await getSession(request.headers.get("Cookie"));
    if (session.get("userProfile") !== "Administrador") {
        return new Response("Unauthorized", { status: 403 });
    }
    
    const formData = await request.formData();
    const { _action, ...values } = Object.fromEntries(formData);
    const db = context.cloudflare.env.DB_APP;

    try {
        if (_action === "create") {
            const { ds_perfil } = values;
            if (typeof ds_perfil === "string" && ds_perfil.trim()) {
                await db.prepare("INSERT INTO tb_perfil (ds_perfil) VALUES (?)").bind(ds_perfil).run();
            }
        } else if (_action === "delete") {
            const { idtb_perfil } = values;
            await db.prepare("DELETE FROM tb_perfil WHERE idtb_perfil = ?").bind(idtb_perfil).run();
        }
    } catch(e) {
        console.error("Admin action failed:", e);
    }
    
    return json({ ok: true });
}


export default function AdminPage() {
    const { profiles, error } = useLoaderData() as Awaited<ReturnType<typeof loader>>;
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    return (
        <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 shadow-md">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Admin</h2>
                </div>
                <nav>
                    <Link to="/admin" className="block px-6 py-3 text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 font-bold">
                        Gerenciar Perfis
                    </Link>
                    {/* Placeholder for other admin modules */}
                    <Link to="/" className="block mt-4 px-6 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                        Voltar para o App
                    </Link>
                </nav>
            </aside>
            
            {/* Main Content */}
            <main className="flex-1 p-8">
                <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Gerenciar Perfis</h1>
                {error && <p className="text-red-500">{error}</p>}
                
                {/* Add New Profile Form */}
                <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                     <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Adicionar Novo Perfil</h2>
                    <Form method="post">
                        <input type="hidden" name="_action" value="create" />
                        <div className="flex items-center space-x-4">
                            <input
                                type="text"
                                name="ds_perfil"
                                placeholder="Nome do Perfil"
                                required
                                className="flex-grow px-3 py-2 text-gray-900 bg-gray-100 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
                            />
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                                {isSubmitting ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </Form>
                </div>

                {/* Profiles Table */}
                <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full">
                        <thead>
                            <tr>
                                <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">ID</th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Nome do Perfil</th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900"></th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-900 dark:text-white">
                            {profiles.map((profile: Profile) => (
                                <tr key={profile.idtb_perfil}>
                                    <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 text-sm">{profile.idtb_perfil}</td>
                                    <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 text-sm">{profile.ds_perfil}</td>
                                    <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 text-sm text-right">
                                       <Form method="post" onSubmit={(e) => !confirm('Tem certeza que deseja excluir este perfil?') && e.preventDefault()}>
                                           <input type="hidden" name="_action" value="delete" />
                                           <input type="hidden" name="idtb_perfil" value={profile.idtb_perfil} />
                                           <button type="submit" className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                                               Excluir
                                           </button>
                                       </Form>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}

