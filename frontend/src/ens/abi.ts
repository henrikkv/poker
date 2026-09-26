import { parseAbi } from "viem";

/** ENSv2 Permissioned Resolver write surface. Setters take a DNS-encoded name. */
export const permissionedResolverAbi = parseAbi([
    "function setText(bytes name, string key, string value)",
    "function grantSetterRoles(bytes setter, address account)",
    "function grantRootRoles(uint256 roleBitmap, address account)",
    "function multicall(bytes[] calls) returns (bytes[])",
]);

/** ENSv1-style resolver kept for unmigrated names. */
export const legacyResolverAbi = parseAbi([
    "function setText(bytes32 node, string key, string value)",
    "function multicall(bytes[] data) returns (bytes[])",
]);
