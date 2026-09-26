import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import TerserPlugin from "terser-webpack-plugin";

// Share the poker repo's .env with the Rust client.
loadEnvConfig("..");

const explorer = (process.env.ENDPOINT || "https://api.explorer.provable.com").replace(/\/$/, "");
const provable = process.env.PROVABLE_API_URL ?? "https://api.provable.com";

const nextConfig: NextConfig = {
    serverExternalPackages: ["@provablehq/sdk", "@provablehq/wasm"],
    env: {
        CONSENSUS_HEIGHTS: process.env.CONSENSUS_HEIGHTS ?? "",
        NEXT_PUBLIC_SEPOLIA_RPC: process.env.NEXT_PUBLIC_SEPOLIA_RPC ?? "",
    },
    async rewrites() {
        return [
            { source: "/explorer/:path*", destination: `${explorer}/:path*` },
            { source: "/prove/:path*", destination: `${provable}/prove/:path*` },
            { source: "/jwts/:path*", destination: `${provable}/jwts/:path*` },
        ];
    },
    async headers() {
        // Allow Shield's confirm / pairing popups. COEP + same-origin isolation
        // blocked those windows, so transfers never finished.
        return [
            {
                source: "/:path*",
                headers: [{ key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" }],
            },
        ];
    },
    webpack: (config) => {
        config.experiments = { ...config.experiments, topLevelAwait: true };
        config.output.environment = { ...config.output.environment, asyncFunction: true };
        config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
        config.optimization = {
            ...config.optimization,
            minimize: true,
            minimizer: [new TerserPlugin({ terserOptions: { module: true } })],
        };
        return config;
    },
};

export default nextConfig;
