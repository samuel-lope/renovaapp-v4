// File: app/session.ts
import { createCookieSessionStorage } from "@react-router/node";

// IMPORTANTE: A variável de ambiente SESSION_SECRET é essencial para a segurança.
// Para desenvolvimento local, crie um arquivo .dev.vars na raiz do projeto e adicione:
// SESSION_SECRET="seu-segredo-aleatorio-e-longo"
// Para produção, configure o segredo no dashboard da Cloudflare com 'wrangler secret put SESSION_SECRET'.
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
    secrets: [sessionSecret || "DEV_SECRET_FALLBACK"], // O fallback é apenas para evitar que o dev server quebre.
    secure: process.env.NODE_ENV === "production",
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;

