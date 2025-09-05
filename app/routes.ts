// File: app/routes.ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // A rota principal agora é o dashboard
  index("routes/index.tsx"), 
  
  route("login", "routes/login.tsx"), 
  route("logout", "routes/logout.tsx"),
  route("admin", "routes/admin.tsx"),
  route("database", "routes/database.tsx"),

  // A rota "home.tsx" foi removida para resolver o erro de tipo.

] satisfies RouteConfig;

