// File: app/auth.server.ts
// Correção: createCookieSessionStorage vem do adaptador do Cloudflare.
import { createCookieSessionStorage } from "@remix-run/cloudflare"; 
import { redirect, json } from "@remix-run/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV === "production") {
  throw new Error("A variável de ambiente SESSION_SECRET deve ser definida em produção.");
}

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [sessionSecret || "DEV_SECRET_FALLBACK"],
    secure: process.env.NODE_ENV === "production",
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;

// ... A lógica de login e requireUserId permanece a mesma ...
export async function login(db: D1Database, matricula: string, senha: string) {
    if (!matricula || !senha) {
        return json({ error: "Matrícula e senha são obrigatórios." }, { status: 400 });
    }
    const userStmt = db.prepare(
        `SELECT u.idtb_usuario, u.nome_usuario, u.senha, p.ds_perfil 
         FROM tb_usuario u 
         LEFT JOIN tb_perfil p ON u.tb_perfil_idtb_perfil = p.idtb_perfil
         WHERE u.matricula = ? AND u.st_usuario = 1 AND u.st_delete = 0`
    ).bind(matricula);
    const user = await userStmt.first<{ idtb_usuario: number; nome_usuario: string; senha: string; ds_perfil: string; }>();
    if (!user || user.senha !== senha) {
        return json({ error: "Matrícula ou senha inválida." }, { status: 401 });
    }
    const session = await getSession();
    session.set("userId", user.idtb_usuario);
    session.set("userName", user.nome_usuario);
    session.set("userProfile", user.ds_perfil);
    return redirect("/", {
        headers: { "Set-Cookie": await commitSession(session) },
    });
}

export async function requireUserId(request: Request) {
    const session = await getSession(request.headers.get("Cookie"));
    const userId = session.get("userId");
    if (!userId) {
        throw redirect("/login");
    }
    return userId;
}

