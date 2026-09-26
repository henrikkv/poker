import {
    createWalletClient,
    custom,
    type EIP1193Provider,
    type WalletClient,
} from "viem";
import { sepolia } from "viem/chains";

const SEPOLIA_HEX = "0xaa36a7";

function injected(): EIP1193Provider {
    const provider = window.ethereum;
    if (!provider) {
        throw new Error("No Ethereum wallet found. Install a browser wallet and connect Sepolia.");
    }
    return provider;
}

export async function connectEthereum(): Promise<`0x${string}`> {
    const provider = injected();
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    const account = accounts[0] as `0x${string}` | undefined;
    if (!account) {
        throw new Error("Wallet returned no account");
    }
    await ensureSepolia(provider);
    return account;
}

export async function ensureSepolia(provider: EIP1193Provider = injected()): Promise<void> {
    const chainId = await provider.request({ method: "eth_chainId" });
    if (chainId === SEPOLIA_HEX) {
        return;
    }
    try {
        await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: SEPOLIA_HEX }],
        });
    } catch (error) {
        const code = typeof error === "object" && error && "code" in error ? Number(error.code) : 0;
        if (code !== 4902) {
            throw new Error("Switch your wallet to Sepolia to use ENSv2");
        }
        await provider.request({
            method: "wallet_addEthereumChain",
            params: [
                {
                    chainId: SEPOLIA_HEX,
                    chainName: "Sepolia",
                    nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
                    rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
                    blockExplorerUrls: ["https://sepolia.etherscan.io"],
                },
            ],
        });
    }
}

export function ownerWallet(account: `0x${string}`): WalletClient {
    return createWalletClient({
        account,
        chain: sepolia,
        transport: custom(injected()),
    });
}
