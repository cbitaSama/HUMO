#!/bin/bash

# ============================================================================

# HUMO — Setup script

# Corre 1 sola vez en Codespace recién creado y vacío

# ============================================================================

set -e

echo “→ Scaffolding Vite + React + TypeScript…”
npm create vite@latest . – –template react-ts

echo “→ Instalando dependencias base…”
npm install

echo “→ Instalando Tailwind v4 + plugin Vite…”
npm install tailwindcss @tailwindcss/vite

echo “→ Instalando stack de la app…”
npm install @supabase/supabase-js react-router-dom @tanstack/react-query date-fns recharts lucide-react clsx tailwind-merge
npm install -D @types/node

echo “→ Escribiendo vite.config.ts…”
cat > vite.config.ts <<‘EOF’
import path from “path”
import { defineConfig } from “vite”
import react from “@vitejs/plugin-react”
import tailwindcss from “@tailwindcss/vite”

export default defineConfig({
plugins: [react(), tailwindcss()],
resolve: {
alias: {
“@”: path.resolve(__dirname, “./src”),
},
},
})
EOF

echo “→ Actualizando tsconfig.json…”
cat > tsconfig.json <<‘EOF’
{
“files”: [],
“references”: [
{ “path”: “./tsconfig.app.json” },
{ “path”: “./tsconfig.node.json” }
],
“compilerOptions”: {
“baseUrl”: “.”,
“paths”: {
“@/*”: [”./src/*”]
}
}
}
EOF

echo “→ Actualizando tsconfig.app.json…”
node -e “
const fs = require(‘fs’);
const tsc = JSON.parse(fs.readFileSync(‘tsconfig.app.json’, ‘utf8’));
tsc.compilerOptions = tsc.compilerOptions || {};
tsc.compilerOptions.baseUrl = ‘.’;
tsc.compilerOptions.paths = { ‘@/*’: [’./src/*’] };
fs.writeFileSync(‘tsconfig.app.json’, JSON.stringify(tsc, null, 2));
“

echo “→ Reemplazando src/index.css…”
cat > src/index.css <<‘EOF’
@import “tailwindcss”;
EOF

echo “→ Creando .env.local (vacío, lo llenas después)…”
cat > .env.local <<‘EOF’
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
EOF

echo “→ Creando .env.example…”
cat > .env.example <<‘EOF’
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxx
EOF

echo “→ Asegurando .env.local esté en .gitignore…”
grep -qxF ‘.env.local’ .gitignore 2>/dev/null || echo “.env.local” >> .gitignore

echo “→ Creando src/lib/supabase.ts…”
mkdir -p src/lib
cat > src/lib/supabase.ts <<‘EOF’
import { createClient } from “@supabase/supabase-js”

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
throw new Error(
“Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local”
)
}

export const supabase = createClient(url, anon)
EOF

echo “→ Creando src/lib/types.ts…”
cat > src/lib/types.ts <<‘EOF’
// Tipos espejo del schema de Supabase. Los regeneramos automáticamente más adelante.

export type TransactionKind = “expense” | “income”
export type RecurrenceFrequency = “daily” | “weekly” | “monthly” | “yearly”
export type DebtDirection = “owed_to_me” | “i_owe”
export type DebtStatus = “open” | “settled”
export type CategoryKind = “expense” | “income” | “both”

export type Profile = {
id: string
display_name: string | null
currency: string
humo_threshold_bs: number
sin_humo_personality: “soft” | “brutal” | “funny” | null
timezone: string
created_at: string
updated_at: string
}

export type Payer = {
id: string
user_id: string
name: string
is_self: boolean
color: string
icon: string
created_at: string
archived_at: string | null
}

export type Category = {
id: string
user_id: string
name: string
kind: CategoryKind
color: string
icon: string
created_at: string
archived_at: string | null
}

export type Transaction = {
id: string
user_id: string
kind: TransactionKind
amount_bs: number
title: string
note: string | null
category_id: string | null
payer_id: string | null
occurred_at: string
recurring_template_id: string | null
created_at: string
}

export type RecurringTemplate = {
id: string
user_id: string
kind: TransactionKind
amount_bs: number
title: string
note: string | null
category_id: string | null
payer_id: string | null
frequency: RecurrenceFrequency
interval_count: number
day_of_month: number | null
day_of_week: number | null
start_date: string
end_date: string | null
next_run_date: string
last_run_date: string | null
active: boolean
created_at: string
}

export type Debt = {
id: string
user_id: string
direction: DebtDirection
counterparty_name: string
amount_bs: number
description: string | null
status: DebtStatus
created_at: string
settled_at: string | null
}
EOF

echo “→ Reemplazando src/App.tsx con prueba de conexión…”
cat > src/App.tsx <<‘EOF’
import { supabase } from “@/lib/supabase”
import { useEffect, useState } from “react”

function App() {
const [status, setStatus] = useState<string>(“Conectando…”)

useEffect(() => {
supabase.auth.getSession().then(({ error }) => {
if (error) setStatus(“Error: “ + error.message)
else setStatus(“✓ Conectado a Supabase”)
})
}, [])

return (
<div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-zinc-950 text-zinc-50">
<h1 className="text-7xl font-bold tracking-tight">Humo</h1>
<p className="text-zinc-400 text-lg">No dejes que tu plata se haga humo.</p>
<p className="text-sm text-zinc-500 mt-8">{status}</p>
</div>
)
}

export default App
EOF

echo “”
echo “════════════════════════════════════════════════════”
echo “✓ Setup completo”
echo “════════════════════════════════════════════════════”
echo “”
echo “Siguientes pasos:”
echo “  1. Editar .env.local con credenciales de Supabase”
echo “     (Supabase Dashboard → Project Settings → API)”
echo “  2. npx shadcn@latest init”
echo “     Responder: New York / Zinc / Yes a CSS variables”
echo “  3. npm run dev”
echo “”