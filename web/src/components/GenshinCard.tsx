import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  delay?: number;
  variant?: "default" | "gold";
  className?: string;
}

export default function GenshinCard({
  title,
  children,
  delay = 0,
  variant = "default",
  className = "",
}: Props) {
  const baseClass = variant === "gold" ? "glass-card-gold" : "glass-card";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`${baseClass} ${className}`}
      whileHover={{
        translateY: -5,
        boxShadow: "0 20px 40px rgba(236, 229, 216, 0.4)",
      }}
    >
      <h3 className="text-genshin-gradient text-xl font-bold mb-3 uppercase tracking-widest">
        {title}
      </h3>
      <div className="genshin-text text-sm leading-relaxed">{children}</div>
    </motion.div>
  );
}
