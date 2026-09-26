import { encodeFunctionData, type WalletClient } from "viem";
import { namehash, normalize, packetToBytes } from "viem/ens";
import { toHex } from "viem";
import { sepolia } from "viem/chains";
import { legacyResolverAbi, permissionedResolverAbi } from "./abi.js";
import { TABLE_RECORD_KEYS } from "./keys.js";
import { ensPublicClient } from "./client.js";

export function dnsEncodedName(name: string): `0x${string}` {
    return toHex(packetToBytes(normalize(name)));
}

async function resolverAddress(name: string): Promise<`0x${string}`> {
    const address = await ensPublicClient().getEnsResolver({ name: normalize(name) });
    if (!address) {
        throw new Error(`${name} is not set up on Sepolia`);
    }
    return address;
}

function writeArgs(wallet: WalletClient) {
    if (!wallet.account) {
        throw new Error("Wallet has no account");
    }
    return { account: wallet.account, chain: sepolia };
}

export async function setTextRecords(
    wallet: WalletClient,
    name: string,
    records: Array<readonly [string, string]>,
): Promise<`0x${string}`> {
    const resolver = await resolverAddress(name);
    const dnsName = dnsEncodedName(name);
    const calls = records.map(([key, value]) =>
        encodeFunctionData({
            abi: permissionedResolverAbi,
            functionName: "setText",
            args: [dnsName, key, value],
        }),
    );
    try {
        const hash = await wallet.writeContract({
            address: resolver,
            abi: permissionedResolverAbi,
            functionName: "multicall",
            args: [calls],
            ...writeArgs(wallet),
        });
        await waitForWrite(hash);
        return hash;
    } catch (error) {
        if (isUserRejected(error)) {
            throw error;
        }
        if (isEacDenied(error)) {
            throw new Error(
                "This wallet cannot update that ENS name. Use the wallet that owns it.",
            );
        }
        return setTextRecordsLegacy(wallet, resolver, name, records);
    }
}

async function setTextRecordsLegacy(
    wallet: WalletClient,
    resolver: `0x${string}`,
    name: string,
    records: Array<readonly [string, string]>,
): Promise<`0x${string}`> {
    const node = namehash(normalize(name));
    const calls = records.map(([key, value]) =>
        encodeFunctionData({
            abi: legacyResolverAbi,
            functionName: "setText",
            args: [node, key, value],
        }),
    );
    const hash = await wallet.writeContract({
        address: resolver,
        abi: legacyResolverAbi,
        functionName: "multicall",
        args: [calls],
        ...writeArgs(wallet),
    });
    await waitForWrite(hash);
    return hash;
}

async function waitForWrite(hash: `0x${string}`): Promise<void> {
    await ensPublicClient().waitForTransactionReceipt({ hash });
}

/** Grant a local key ROLE_SET_TEXT for only the poker directory records. */
export async function grantPublisherSetterRoles(
    owner: WalletClient,
    name: string,
    publisher: `0x${string}`,
): Promise<`0x${string}`> {
    const resolver = await resolverAddress(name);
    const calls = TABLE_RECORD_KEYS.map((key) =>
        encodeFunctionData({
            abi: permissionedResolverAbi,
            functionName: "grantSetterRoles",
            args: [
                encodeFunctionData({
                    abi: permissionedResolverAbi,
                    functionName: "setText",
                    args: ["0x", key, ""],
                }),
                publisher,
            ],
        }),
    );
    try {
        return await owner.writeContract({
            address: resolver,
            abi: permissionedResolverAbi,
            functionName: "multicall",
            args: [calls],
            ...writeArgs(owner),
        });
    } catch (error) {
        if (isEacDenied(error)) {
            throw new Error("Only the resolver admin can grant ENSv2 setter roles for this name.");
        }
        throw error;
    }
}

function isEacDenied(error: unknown): boolean {
    const text = error instanceof Error ? error.message : String(error);
    return text.includes("EACUnauthorized") || text.includes("EACCannotGrant");
}

function isUserRejected(error: unknown): boolean {
    const text = error instanceof Error ? error.message : String(error);
    return /user rejected/i.test(text);
}
