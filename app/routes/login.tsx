// File: app/routes/login.tsx
import { Form, useActionData, useNavigation } from "react-router";
// Corrected import for server-side utilities
import { json, redirect } from "react-router/server";
import type { ActionFunctionArgs, MetaFunction } from "react-router";
import { getSession, commitSession } from "~/session";

// Define an interface for the user data structure from the database
interface UserQueryResult {
  idtb_usuario: number;
  nome_usuario: string;
  senha: string;
  ds_perfil: string;
}

export const meta: MetaFunction = () => {
  return [{ title: "Login - RENOVAAPP" }];
};

// Action to handle the login form submission
export async function action({ request, context }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();
  const matricula = formData.get("matricula");
  const senha = formData.get("senha");

  if (typeof matricula !== "string" || typeof senha !== "string" || !matricula || !senha) {
    return json({ error: "Matrícula e senha são obrigatórios." }, { status: 400 });
  }

  const db = context.cloudflare.env.DB_APP;
  try {
    const userStmt = db.prepare(
        `SELECT u.idtb_usuario, u.nome_usuario, u.senha, p.ds_perfil 
         FROM tb_usuario u 
         LEFT JOIN tb_perfil p ON u.tb_perfil_idtb_perfil = p.idtb_perfil
         WHERE u.matricula = ? AND u.st_usuario = 1 AND u.st_delete = 0`
    ).bind(matricula);
    
    const user = await userStmt.first() as UserQueryResult | null;

    // SECURITY WARNING: Plain text password comparison.
    // In a real production environment, you MUST hash passwords and compare the hashes.
    if (!user || user.senha !== senha) {
      return json({ error: "Matrícula ou senha inválida." }, { status: 401 });
    }

    session.set("userId", user.idtb_usuario);
    session.set("userName", user.nome_usuario);
    session.set("userProfile", user.ds_perfil);

    return redirect("/", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (dbError) {
    console.error("Database error during login:", dbError);
    return json({ error: "Ocorreu um erro no servidor. Tente novamente." }, { status: 500 });
  }
}

// Login form component
export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          RENOVAAPP-V4
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300">
          Acesse sua conta para continuar
        </p>
        <Form method="post" className="space-y-6">
          <div>
            <label
              htmlFor="matricula"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Matrícula
            </label>
            <input
              id="matricula"
              name="matricula"
              type="text"
              required
              className="w-full px-3 py-2 mt-1 text-gray-900 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
          <div>
            <label
              htmlFor="senha"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              required
              className="w-full px-3 py-2 mt-1 text-gray-900 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
          {/* This type guard ensures actionData and actionData.error exist before access */}
          {actionData && "error" in actionData && (
            <p className="text-sm text-red-500" role="alert">
              {actionData.error as string}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </Form>
      </div>
    </div>
  );
}

