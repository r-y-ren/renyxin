import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary";
  className?: string;
  disabled?: boolean;
}

export default function GlassButton({
  children,
  onClick,
  variant = "default",
  className = "",
  disabled = false,
}: Props) {
  const primaryClass =
    variant === "primary"
      ? "bg-gradient-to-r from-genshin-gold/20 to-genshin-accent/20 border-genshin-gold/60 hover:from-genshin-gold/40 hover:to-genshin-accent/40"
      : "border-genshin-gold/30 hover:border-genshin-gold/60";

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      className={`glass-button ${primaryClass} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}
