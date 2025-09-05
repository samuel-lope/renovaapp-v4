// File: app/routes/logout.tsx
import type { ActionFunctionArgs } from "react-router";
// Utilitários agnósticos de runtime agora vêm de 'react-router'
import { redirect } from "react-router";
// Correção: Importando as funções do novo arquivo de autenticação
import { destroySession, getSession } from "~/auth.server";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  return redirect("/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}

export default function LogoutRoute() { return null; }

