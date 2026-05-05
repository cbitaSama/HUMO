import { supabase } from "./supabase"
import { format } from "date-fns"

export async function exportTransactionsCsv(): Promise<void> {
  const { data: txs } = await supabase
    .from("transactions")
    .select(`occurred_at, kind, title, amount_bs, note,
             category:categories(name), payer:payers(name)`)
    .order("occurred_at", { ascending: true })

  const escape = (v: string | null | undefined): string =>
    v == null ? "" : `"${String(v).replace(/"/g, '""')}"`

  const rows = ["Fecha,Tipo,Título,Monto Bs,Categoría,Pagador,Nota"]
  for (const t of txs ?? []) {
    const row = t as any
    rows.push([
      escape(format(new Date(row.occurred_at), "yyyy-MM-dd HH:mm")),
      escape(row.kind === "expense" ? "Gasto" : "Ingreso"),
      escape(row.title),
      String(row.amount_bs),
      escape(row.category?.name),
      escape(row.payer?.name),
      escape(row.note),
    ].join(","))
  }

  const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `humo-${format(new Date(), "yyyy-MM-dd")}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
