import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlogPost {
  slug: string;
  data: {
    title: string;
    date: Date;
    tags: string[];
    coverImage?: string;
  };
  html: string;
  excerpt: string;
}

interface Props {
  posts: BlogPost[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BlogAvatarGrid({ posts }: Props) {
  const [expanded, setExpanded] = useState<BlogPost | null>(null);

  return (
    <>
      {/* ── Avatar card grid ── */}
      <div className="flex flex-wrap gap-3">
        {posts.map((post, i) => (
          <motion.div
            key={post.slug}
            className="group w-[138px] rounded-xl overflow-hidden cursor-pointer
                       border border-[#b8936d]/20 bg-black/25
                       shadow-[0_8px_18px_rgba(2,8,20,0.28),inset_0_1px_0_rgba(236,229,216,0.08)]
                       hover:border-[#b8936d]/60 hover:shadow-[0_16px_30px_rgba(2,8,20,0.4),inset_0_1px_0_rgba(236,229,216,0.2),inset_0_0_20px_rgba(184,147,109,0.15)]
                       transition-all duration-300"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: i * 0.07, ease: "easeOut" }}
            whileHover={{ scale: 1.03, y: -6 }}
            onClick={() => setExpanded(post)}
          >
            {/* Cover image */}
            <div className="relative w-full aspect-square overflow-hidden">
              {post.data.coverImage ? (
                <img
                  src={post.data.coverImage}
                  alt={post.data.title}
                  className="w-full h-full object-cover transition-transform duration-500
                             group-hover:scale-110"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #2a1a0e 0%, #1a0a06 100%)",
                  }}
                >
                  <span
                    className="font-bold tracking-widest opacity-25"
                    style={{ fontSize: 36, color: "#ece5d8" }}
                  >
                    文
                  </span>
                </div>
              )}
              {/* Gold shimmer on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    "linear-gradient(to top, rgba(184,147,109,0.28) 0%, transparent 60%)",
                }}
              />
            </div>

            {/* Card info */}
            <div className="px-2.5 py-2">
              <p className="text-xs tracking-widest font-semibold leading-snug line-clamp-2 text-[#ece5d8]/90">
                {post.data.title}
              </p>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs tracking-widest text-[#ece5d8]/35">
                  {post.data.date.toLocaleDateString("zh-CN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </p>
                <span className="text-[#b8936d]/40 text-xs tracking-widest">♡</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Expanded detail modal ── */}
      <AnimatePresence mode="wait">
        {expanded && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setExpanded(null)}
              className="fixed inset-0 bg-black/65 backdrop-blur-lg z-40"
            />

            {/* Modal */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="glass-panel max-w-3xl w-full max-h-[90vh] overflow-y-auto relative">
                {/* Close button */}
                <motion.button
                  onClick={() => setExpanded(null)}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.93 }}
                  className="absolute top-5 right-5 w-10 h-10 rounded-full
                             border border-[#b8936d]/50 bg-[#b8936d]/20
                             flex items-center justify-center z-10
                             hover:bg-[#b8936d]/40 transition-colors duration-200"
                >
                  <span className="text-[#ece5d8] font-bold text-sm">✕</span>
                </motion.button>

                {/* Cover */}
                {expanded.data.coverImage && (
                  <img
                    src={expanded.data.coverImage}
                    alt={expanded.data.title}
                    className="w-full h-64 object-cover rounded-lg mb-6"
                  />
                )}

                {/* Title + meta */}
                <h1 className="text-3xl font-bold mb-3 text-genshin-gradient">
                  {expanded.data.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-genshin-light/55 mb-5">
                  <span>
                    📅{" "}
                    {expanded.data.date.toLocaleDateString("zh-CN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  {expanded.data.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-[#b8936d]/15 text-[#b8936d] border border-[#b8936d]/30
                                 px-3 py-0.5 rounded-full text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Body */}
                <div
                  className="prose text-genshin-light/85 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: expanded.html }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
