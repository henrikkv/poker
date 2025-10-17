use credits_bindings::credits::*;
use leo_bindings::utils::*;
use poker_bindings::poker::*;
use snarkvm::console::network::TestnetV0;
use snarkvm::prelude::Network;
use std::str::FromStr;

const ENDPOINT: &str = "http://localhost:3030";
const PRIVATE_KEY: &str = "APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH";

#[test]
fn poker_interpreter() {
    let alice: Account<TestnetV0> = Account::from_str(PRIVATE_KEY).unwrap();
    let rng = &mut rand::thread_rng();
    let bob = Account::new(rng).unwrap();
    let charlie = Account::new(rng).unwrap();
    gameplay(
        &PokerInterpreter::new(&alice, ENDPOINT).unwrap(),
        &CreditsInterpreter::new(&alice, ENDPOINT).unwrap(),
        &alice,
        &bob,
        &charlie,
    );
}
#[test]
fn poker_testnet() {
    let alice: Account<TestnetV0> = Account::from_str(PRIVATE_KEY).unwrap();
    let rng = &mut rand::thread_rng();
    let bob = Account::new(rng).unwrap();
    let charlie = Account::new(rng).unwrap();
    gameplay(
        &PokerTestnet::new(&alice, ENDPOINT).unwrap(),
        &CreditsTestnet::new(&alice, ENDPOINT).unwrap(),
        &alice,
        &bob,
        &charlie,
    );
}
fn gameplay<N: Network, P: PokerAleo<N>, C: CreditsAleo<N>>(
    poker: &P,
    credits: &C,
    alice: &Account<N>,
    bob: &Account<N>,
    charlie: &Account<N>,
) {
    credits
        .transfer_public(alice, bob.address(), 1_000_000_000_000)
        .unwrap();

    let (alice_keys, _) = poker.create_game(alice, 1, 1, 2, 3, 5, 29, 91).unwrap();
    dbg!(alice_keys);
    /*
        let deck = [game.cards_p1, game.cards_p2];
        let (mut bob_keys, _) = poker.join_game(&bob, 1, deck, 4, 5, 6, 7, 31, 91).unwrap();
    */
}
