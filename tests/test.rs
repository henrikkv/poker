use commutative_encryption_bindings::commutative_encryption::*;
use credits_bindings::credits::*;
use leo_bindings::utils::*;
use mental_poker_bindings::mental_poker::*;
use poker::cards::CardDisplay;
use rand::seq::SliceRandom;
use snarkvm::console::network::TestnetV0;
use snarkvm::prelude::{Group, Network};
use snarkvm::prelude::{Inverse, Scalar, TestRng, Uniform};
use std::str::FromStr;

const ENDPOINT: &str = "http://localhost:3030";
const PRIVATE_KEY: &str = "APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH";

fn shuffle_deck<N: Network>(deck: [Group<N>; 52]) -> [Group<N>; 52] {
    let mut rng = rand::thread_rng();

    let mut cards: Vec<Group<N>> = deck.into();
    cards.shuffle(&mut rng);

    cards.try_into().unwrap()
}

#[test]
fn commutative_encryption_interpreter() {
    leo_bindings::utils::init_test_logger();
    let alice: Account<TestnetV0> = Account::from_str(PRIVATE_KEY).unwrap();
    run_commutative_encryption(
        &CommutativeEncryptionInterpreter::new(&alice, ENDPOINT).unwrap(),
        &alice,
    );
}

#[test]
fn commutative_encryption_testnet() {
    leo_bindings::utils::init_test_logger();
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
    leo_bindings::utils::init_test_logger();
    let alice = Account::from_str(PRIVATE_KEY).unwrap();
    let rng = &mut rand::thread_rng();
    let bob = Account::new(rng).unwrap();
    let charlie = Account::new(rng).unwrap();
    gameplay(
        &MentalPokerInterpreter::new(&alice, ENDPOINT).unwrap(),
        &CreditsInterpreter::new(&alice, ENDPOINT).unwrap(),
        &CommutativeEncryptionInterpreter::new(&alice, ENDPOINT).unwrap(),
        &alice,
        &bob,
        &charlie,
    );
}
#[test]
fn poker_testnet() {
    leo_bindings::utils::init_test_logger();
    let alice = Account::from_str(PRIVATE_KEY).unwrap();
    let rng = &mut rand::thread_rng();
    let bob = Account::new(rng).unwrap();
    let charlie = Account::new(rng).unwrap();
    gameplay(
        &MentalPokerTestnet::new(&alice, ENDPOINT).unwrap(),
        &CreditsTestnet::new(&alice, ENDPOINT).unwrap(),
        &CommutativeEncryptionTestnet::new(&alice, ENDPOINT).unwrap(),
        &alice,
        &bob,
        &charlie,
    );
}
fn gameplay<
    N: Network,
    P: MentalPokerAleo<N>,
    C: CreditsAleo<N>,
    E: CommutativeEncryptionAleo<N>,
>(
    poker: &P,
    credits: &C,
    commutative_encryption: &E,
    alice: &Account<N>,
    bob: &Account<N>,
    charlie: &Account<N>,
) {
    credits
        .transfer_public(alice, bob.address(), 1_000_000_000_000)
        .unwrap();
    credits
        .transfer_public(alice, charlie.address(), 1_000_000_000_000)
        .unwrap();

    let mut rng = TestRng::default();
    let secret_alice = Scalar::rand(&mut rng);
    let secret_bob = Scalar::rand(&mut rng);
    let secret_charlie = Scalar::rand(&mut rng);

    let secret_alice_inv = Inverse::inverse(&secret_alice).unwrap();
    let secret_bob_inv = Inverse::inverse(&secret_bob).unwrap();
    let secret_charlie_inv = Inverse::inverse(&secret_charlie).unwrap();

    let balances_before = [
        credits.get_account(alice.address()).unwrap(),
        credits.get_account(bob.address()).unwrap(),
        credits.get_account(charlie.address()).unwrap(),
    ];

    let initial_deck = commutative_encryption.initialize_deck(alice).unwrap();
    let alice_shuffled_deck = shuffle_deck(initial_deck);

    let (alice_keys, _) = poker
        .create_game(
            alice,
            1,
            alice_shuffled_deck,
            secret_alice,
            secret_alice_inv,
        )
        .unwrap();
    dbg!(&alice_keys);

    let deck = poker.get_decks(1).unwrap();
    let bob_shuffled_deck = shuffle_deck(deck);
    let (bob_keys, _) = poker
        .join_game(bob, 1, deck, bob_shuffled_deck, secret_bob, secret_bob_inv)
        .unwrap();
    dbg!(&bob_keys);

    let deck = poker.get_decks(1).unwrap();
    let charlie_shuffled_deck = shuffle_deck(deck);
    let (charlie_keys, _) = poker
        .join_game(
            charlie,
            1,
            deck,
            charlie_shuffled_deck,
            secret_charlie,
            secret_charlie_inv,
        )
        .unwrap();
    dbg!(&charlie_keys);

    // Decrypt hands phase
    let cards = poker.get_cards(1).unwrap();
    let (alice_keys, _) = poker
        .decrypt_hands(alice, 1, cards.player2, cards.player3, alice_keys)
        .unwrap();

    let cards = poker.get_cards(1).unwrap();
    let (bob_keys, _) = poker
        .decrypt_hands(bob, 1, cards.player3, cards.player1, bob_keys)
        .unwrap();

    let cards = poker.get_cards(1).unwrap();
    let (charlie_keys, _) = poker
        .decrypt_hands(charlie, 1, cards.player1, cards.player2, charlie_keys)
        .unwrap();

    poker.bet(charlie, 1, 10).unwrap();
    poker.bet(alice, 1, 5).unwrap();
    poker.bet(bob, 1, 0).unwrap();

    let (alice_keys, _) = poker
        .decrypt_flop(alice, 1, poker.get_cards(1).unwrap().flop, alice_keys)
        .unwrap();

    let (bob_keys, _) = poker
        .decrypt_flop(bob, 1, poker.get_cards(1).unwrap().flop, bob_keys)
        .unwrap();

    let (charlie_keys, _) = poker
        .decrypt_flop(charlie, 1, poker.get_cards(1).unwrap().flop, charlie_keys)
        .unwrap();

    println!("{}", &poker.get_revealed_cards(1).unwrap().display_cards());

    poker.bet(alice, 1, 0).unwrap();
    poker.bet(bob, 1, 0).unwrap();
    poker.bet(charlie, 1, 0).unwrap();

    let (alice_keys, _) = poker
        .decrypt_turn_river(alice, 1, poker.get_cards(1).unwrap().turn, alice_keys)
        .unwrap();

    let (bob_keys, _) = poker
        .decrypt_turn_river(bob, 1, poker.get_cards(1).unwrap().turn, bob_keys)
        .unwrap();

    let (charlie_keys, _) = poker
        .decrypt_turn_river(charlie, 1, poker.get_cards(1).unwrap().turn, charlie_keys)
        .unwrap();

    let revealed = poker.get_revealed_cards(1).unwrap();
    println!("{}", &revealed.display_cards());

    poker.bet(alice, 1, 0).unwrap();
    poker.bet(bob, 1, 0).unwrap();
    poker.bet(charlie, 1, 0).unwrap();

    let (alice_keys, _) = poker
        .decrypt_turn_river(alice, 1, poker.get_cards(1).unwrap().river, alice_keys)
        .unwrap();

    let (bob_keys, _) = poker
        .decrypt_turn_river(bob, 1, poker.get_cards(1).unwrap().river, bob_keys)
        .unwrap();

    let (charlie_keys, _) = poker
        .decrypt_turn_river(charlie, 1, poker.get_cards(1).unwrap().river, charlie_keys)
        .unwrap();

    let revealed = poker.get_revealed_cards(1).unwrap();
    println!("{}", &revealed.display_cards());

    poker.bet(alice, 1, 0).unwrap();
    poker.bet(bob, 1, 0).unwrap();
    poker.bet(charlie, 1, 0).unwrap();

    let (_alice_keys, _) = poker
        .showdown(alice, 1, poker.get_cards(1).unwrap().player1, alice_keys)
        .unwrap();

    let (_bob_keys, _) = poker
        .showdown(bob, 1, poker.get_cards(1).unwrap().player2, bob_keys)
        .unwrap();

    let (_charlie_keys, _) = poker
        .showdown(
            charlie,
            1,
            poker.get_cards(1).unwrap().player3,
            charlie_keys,
        )
        .unwrap();

    poker.compare_hands(charlie, 1).unwrap();

    let game = poker.get_games(1).unwrap();
    dbg!(&game);
    let chips = poker.get_chips(1).unwrap();
    dbg!(&chips);
    let revealed = poker.get_revealed_cards(1).unwrap();
    println!("{}", &revealed.display_cards());

    let balances_after = [
        credits.get_account(alice.address()).unwrap(),
        credits.get_account(bob.address()).unwrap(),
        credits.get_account(charlie.address()).unwrap(),
    ];
    println!(
        "Credits spent by each player: Alice: {}, Bob: {}, Charlie {}",
        (balances_before[0] - balances_after[0]) as f64 / 1_000_000f64,
        (balances_before[1] - balances_after[1]) as f64 / 1_000_000f64,
        (balances_before[2] - balances_after[2]) as f64 / 1_000_000f64
    );
}
