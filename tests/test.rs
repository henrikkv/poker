use commutative_encryption_bindings::commutative_encryption::*;
use credits_bindings::credits::*;
use leo_bindings::utils::*;
use poker_bindings::poker::*;
use snarkvm::console::network::TestnetV0;
use snarkvm::prelude::Network;
use std::str::FromStr;

const ENDPOINT: &str = "http://localhost:3030";
const PRIVATE_KEY: &str = "APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH";

#[test]
fn commutative_encryption_interpreter() {
    let alice: Account<TestnetV0> = Account::from_str(PRIVATE_KEY).unwrap();
    run_commutative_encryption(
        &CommutativeEncryptionInterpreter::new(&alice, ENDPOINT).unwrap(),
        &alice,
    );
}

#[test]
fn commutative_encryption_testnet() {
    let alice: Account<TestnetV0> = Account::from_str(PRIVATE_KEY).unwrap();
    run_commutative_encryption(
        &CommutativeEncryptionTestnet::new(&alice, ENDPOINT).unwrap(),
        &alice,
    );
}

fn run_commutative_encryption<N: Network, C: CommutativeEncryptionAleo<N>>(
    commutative_encryption: &C,
    alice: &Account<N>,
) {
    use snarkvm::prelude::{Inverse, Scalar, TestRng, Uniform};

    let mut rng = TestRng::default();

    let secret_a = Scalar::rand(&mut rng);
    let secret_b = Scalar::rand(&mut rng);

    let secret_a_inv = Inverse::inverse(&secret_a).unwrap();
    let secret_b_inv = Inverse::inverse(&secret_b).unwrap();

    let deck = commutative_encryption.initialize_deck(alice).unwrap();

    let deck_a = commutative_encryption
        .encrypt_deck(alice, secret_a, deck)
        .unwrap();
    let deck_ab = commutative_encryption
        .encrypt_deck(alice, secret_b, deck_a)
        .unwrap();

    let deck_b = commutative_encryption
        .encrypt_deck(alice, secret_b, deck)
        .unwrap();
    let deck_ba = commutative_encryption
        .encrypt_deck(alice, secret_a, deck_b)
        .unwrap();

    assert_eq!(deck_ab, deck_ba);

    let deck_a = commutative_encryption
        .decrypt_deck(alice, secret_b_inv, deck_ab)
        .unwrap();
    let deck_decrypted = commutative_encryption
        .decrypt_deck(alice, secret_a_inv, deck_a)
        .unwrap();

    assert_eq!(deck_decrypted, deck);
}

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
