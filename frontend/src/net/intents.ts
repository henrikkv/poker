/**
 * NEAR Intents 1Click — later mainnet ETH ↔ ALEO bridge.
 *
 * There is no Intents testnet. Quotes settle Ethereum mainnet ↔ Aleo mainnet,
 * so this module is not called from the live Sepolia / Aleo testnet path.
 *
 * When INTENTS_ENABLED=1 and you have a 1Click JWT:
 * 1. GET https://1click.chaindefuser.com/v0/tokens
 *    Find the ETH (origin) and ALEO (destination) asset ids.
 * 2. POST /v0/quote
 *    {
 *      dry: false,
 *      swapType: "EXACT_INPUT",
 *      originAsset: "<eth asset id>",
 *      destinationAsset: "<aleo asset id>",
 *      amount: "<wei>",
 *      depositType: "ORIGIN_CHAIN",
 *      recipient: "<temp or persistent aleo1…>",
 *      recipientType: "DESTINATION_CHAIN",
 *      refundTo: "<0x user>",
 *      refundType: "ORIGIN_CHAIN",
 *      deadline: "<ISO>"
 *    }
 * 3. User sends ETH to quote.depositAddress (and depositMemo if present).
 * 4. Optionally POST /v0/deposit/submit { depositAddress, txHash }.
 * 5. Poll GET /v0/status/{depositAddress} until SUCCESS / REFUNDED / FAILED.
 * 6. After claim_prize, reverse the quote (ALEO → ETH) to the user's address.
 *
 * Until then, /api/fund + repay-to-funder stands in for the bridge.
 */
export const INTENTS_ENABLED = process.env.NEXT_PUBLIC_INTENTS_ENABLED === "1";

export const ONECLICK_BASE = "https://1click.chaindefuser.com";

export function intentsConfigured(): boolean {
    return INTENTS_ENABLED;
}
