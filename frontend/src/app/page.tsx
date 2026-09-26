"use client";

import dynamic from "next/dynamic";

// Wallet adapter, Shield, and mapping reads only exist in the browser.
const Boot = dynamic(() => import("../ui/Boot.js").then((module) => module.Boot), { ssr: false });

export default function Page() {
    return <Boot />;
}
