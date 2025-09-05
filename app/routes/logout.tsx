// File: app/routes/logout.tsx
import type { ActionFunctionArgs } from "react-router";
import { redirect } from "@react-router/node";
import { destroySession, getSession } from "~/session";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  return redirect("/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}

// This route does not render a UI
export default function LogoutRoute() {
  return null;
}

