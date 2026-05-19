import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const allowedRoles = new Set([
  "sucursal_1",
  "sucursal_2",
  "sucursal_3",
  "sucursal_4",
  "sucursal_5",
  "sucursal_6",
  "sucursal_7",
]);

function loadDotEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function getArgValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;

  return process.argv[index + 1] ?? fallback;
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function loadAssignments(filePath) {
  const absolutePath = resolve(process.cwd(), filePath);

  if (!existsSync(absolutePath)) {
    throw new Error(`No existe el archivo de asignaciones: ${absolutePath}`);
  }

  const parsed = JSON.parse(readFileSync(absolutePath, "utf8"));
  const assignments = new Map();

  for (const [role, emails] of Object.entries(parsed)) {
    if (!allowedRoles.has(role)) {
      throw new Error(`Rol no permitido en el JSON: ${role}`);
    }

    if (!Array.isArray(emails)) {
      throw new Error(`El valor de ${role} debe ser un arreglo de correos.`);
    }

    for (const email of emails) {
      if (typeof email !== "string" || !email.trim()) continue;

      const normalizedEmail = normalizeEmail(email);
      const previousRole = assignments.get(normalizedEmail);

      if (previousRole && previousRole !== role) {
        throw new Error(
          `El correo ${normalizedEmail} esta repetido en ${previousRole} y ${role}.`,
        );
      }

      assignments.set(normalizedEmail, role);
    }
  }

  return assignments;
}

async function listAllAuthUsers(supabase) {
  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;

    const batch = data.users ?? [];
    users.push(...batch);

    if (batch.length < perPage) break;
    page += 1;
  }

  return users;
}

function getFullName(user) {
  const metadata = user.user_metadata ?? {};
  const fullName = metadata.full_name ?? metadata.name ?? null;

  return typeof fullName === "string" && fullName.trim() ? fullName.trim() : null;
}

async function main() {
  loadDotEnvLocal();

  const filePath = getArgValue(
    "--file",
    "scripts/branch-role-assignments.example.json",
  );
  const shouldApply = process.argv.includes("--apply");
  const assignments = loadAssignments(filePath);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;


  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.",
    );
  }

  if (!assignments.size) {
    console.log("No hay correos para asignar.");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const users = await listAllAuthUsers(supabase);
  const usersByEmail = new Map(
    users
      .filter((user) => typeof user.email === "string")
      .map((user) => [normalizeEmail(user.email), user]),
  );

  const missingEmails = [];
  const rows = [];

  for (const [email, role] of assignments) {
    const user = usersByEmail.get(email);

    if (!user) {
      missingEmails.push(email);
      continue;
    }

    rows.push({
      id: user.id,
      email,
      full_name: getFullName(user),
      role,
      is_active: true,
    });
  }

  console.table(
    rows.map((row) => ({
      email: row.email,
      role: row.role,
      id: row.id,
      full_name: row.full_name ?? "",
    })),
  );

  if (missingEmails.length) {
    console.warn("\nCorreos no encontrados en Supabase Auth:");
    for (const email of missingEmails) console.warn(`- ${email}`);
  }

  if (!shouldApply) {
    console.log("\nDry-run: no se escribio nada. Ejecuta con --apply para aplicar cambios.");
    return;
  }

  if (!rows.length) {
    console.log("No hay usuarios encontrados para actualizar.");
    return;
  }

  const { error } = await supabase.from("profiles_subway").upsert(rows, {
    onConflict: "id",
  });

  if (error) throw error;

  console.log(`\nListo. Perfiles insertados/actualizados: ${rows.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
