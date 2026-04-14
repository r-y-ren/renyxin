import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  delay?: number;
}

export default function AnimatedBox({ children, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white shadow-lg"
    >
      {children}
    </motion.div>
  );
}
