// File: app/routes/login.tsx
import { Form, useActionData, useNavigation } from "react-router";
import type { ActionFunctionArgs, MetaFunction, LoaderFunctionArgs } from "react-router";
import { getSession } from "~/auth.server";
import { login } from "~/auth.server";
// Utilitários agnósticos de runtime agora vêm de 'react-router'
import { redirect } from "react-router";

export const meta: MetaFunction = () => [{ title: "Login - RENOVAAPP" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (session.has("userId")) {
    return redirect("/");
  }
  return null;
}

type LoginActionData = { error?: string } | null;

export async function action({ request, context }: ActionFunctionArgs): Promise<LoginActionData> {
  const formData = await request.formData();
  const matricula = formData.get("matricula") as string;
  const senha = formData.get("senha") as string;
  
  // Assume login returns TypedResponse<{ error?: string }> or null
  const response = await login(context.cloudflare.env.DB_APP, matricula, senha);
  if (response && typeof response.json === "function") {
    const data = await response.json();
    return data as LoginActionData;
  }
  return null;
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

