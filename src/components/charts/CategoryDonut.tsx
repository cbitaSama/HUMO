import { formatBs } from "@/lib/utils"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

type Slice = {
  name: string
  value: number
  color: string
  icon: string
}

export function CategoryDonut({ data }: { data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-zinc-600">
        Aún no hay gastos este mes
      </div>
    )
  }

  return (
    <div className="relative h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            cursor={false}
            contentStyle={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 12,
              fontSize: 13,
              color: "#fafafa",
            }}
            formatter={(value, _name, item) => {
              const v = Number(value)
              const pct = total > 0 ? ((v / total) * 100).toFixed(1) : "0"
              const label = (item?.payload as Slice | undefined)?.name ?? ""
              return [`${formatBs(v)} (${pct}%)`, label]
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="text-xs text-zinc-500">Total mes</p>
        <p className="text-2xl font-bold tabular-nums">{formatBs(total)}</p>
      </div>
    </div>
  )
}
