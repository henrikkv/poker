#[test]
fn gameplay() {
    use leo_bindings::utils::*;
    use leo_bindings_credits::credits_testnet::*;
    use poker_bindings::poker_testnet::*;
    use snarkvm::console::network::TestnetV0;
    use std::str::FromStr;

    const ENDPOINT: &str = "http://localhost:3030";
    let rng = &mut rand::thread_rng();
    let alice: Account<TestnetV0> =
        Account::from_str("APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH").unwrap();
    let bob = Account::new(rng).unwrap();
    let credits = credits::new(&alice, ENDPOINT).unwrap();
    credits
        .transfer_public(&alice, bob.address(), 1_000_000_000_000)
        .unwrap();

    let poker = poker::new(&alice, ENDPOINT).unwrap();

    let (alice_keys, _) = poker.create_game(&alice, 1, 1, 2, 3, 5, 29, 91).unwrap();
    dbg!(alice_keys);
    /*
        let deck = [game.cards_p1, game.cards_p2];
        let (mut bob_keys, _) = poker.join_game(&bob, 1, deck, 4, 5, 6, 7, 31, 91).unwrap();
    */
}
