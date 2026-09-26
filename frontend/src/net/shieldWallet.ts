/** Drop any leftover Shield session so the Ethereum path never shares a wallet. */
export async function disconnectShieldWallet(): Promise<void> {
    try {
        const { ShieldWalletAdapter } = await import("@provablehq/aleo-wallet-adapter-shield");
        const adapter = new ShieldWalletAdapter();
        await adapter.disconnect();
    } catch {
        // Not installed, already disconnected, or the extension ignored the request.
    }
}
