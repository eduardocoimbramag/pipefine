import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Fixa a raiz do workspace neste projeto (evita o aviso de múltiplos lockfiles).
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
