// File: app/routes.ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // A nova rota principal é a dashboard protegida
  index("routes/index.tsx"), 
  
  // Rota de login
  route("login", "routes/login.tsx"), 
  
  // Rota de ação para logout
  route("logout", "routes/logout.tsx"),
  
  // Rota de administração protegida
  route("admin", "routes/admin.tsx"),
  
  // Mantendo o explorador de banco de dados para desenvolvimento
  route("database", "routes/database.tsx"), 
] satisfies RouteConfig;

