import { animate, motion, useMotionValue, useTransform } from "framer-motion"
import { useEffect } from "react"
import { formatBs } from "@/lib/utils"

type Props = {
  value: number
  className?: string
  duration?: number
}

export function AnimatedBs({ value, className, duration = 0.7 }: Props) {
  const mv = useMotionValue(value)
  const display = useTransform(mv, (n) => formatBs(n))

  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      ease: [0.32, 0.72, 0, 1],
    })
    return controls.stop
  }, [value, duration, mv])

  return <motion.span className={className}>{display}</motion.span>
}
