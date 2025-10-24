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

fn shuffle_deck<N: Network>(deck: [[Group<N>; 26]; 2]) -> [[Group<N>; 26]; 2] {
    let mut rng = rand::thread_rng();

    let mut cards: Vec<Group<N>> = deck[0].iter().chain(deck[1].iter()).copied().collect();
    cards.shuffle(&mut rng);
    let first_half: [Group<N>; 26] = cards[0..26].try_into().unwrap();
    let second_half: [Group<N>; 26] = cards[26..52].try_into().unwrap();

    [first_half, second_half]
}

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
    let (alice_keys, _) = poker.decrypt_hands_p1(alice, 1, cards, alice_keys).unwrap();

    let cards = poker.get_cards(1).unwrap();
    let (bob_keys, _) = poker.decrypt_hands_p2(bob, 1, cards, bob_keys).unwrap();

    let cards = poker.get_cards(1).unwrap();
    let (charlie_keys, _) = poker
        .decrypt_hands_p3(charlie, 1, cards, charlie_keys)
        .unwrap();

    poker.bet(charlie, 1, 10).unwrap();
    poker.bet(alice, 1, 5).unwrap();
    poker.bet(bob, 1, 0).unwrap();

    let cards = poker.get_cards(1).unwrap();
    let (alice_keys, _) = poker.decrypt_flop_p1(alice, 1, cards, alice_keys).unwrap();

    let cards = poker.get_cards(1).unwrap();
    let (bob_keys, _) = poker.decrypt_flop_p2(bob, 1, cards, bob_keys).unwrap();

    let cards = poker.get_cards(1).unwrap();
    let (charlie_keys, _) = poker
        .decrypt_flop_p3(charlie, 1, cards, charlie_keys)
        .unwrap();

    let revealed = poker.get_revealed_cards(1).unwrap();
    println!("{}", &revealed.display_cards());

    poker.bet(bob, 1, 0).unwrap();
    poker.bet(charlie, 1, 0).unwrap();
    poker.bet(alice, 1, 0).unwrap();

    let cards = poker.get_cards(1).unwrap();
    let (alice_keys, _) = poker.decrypt_turn_p1(alice, 1, cards, alice_keys).unwrap();

    let cards = poker.get_cards(1).unwrap();
    let (bob_keys, _) = poker.decrypt_turn_p2(bob, 1, cards, bob_keys).unwrap();

    let cards = poker.get_cards(1).unwrap();
    let (charlie_keys, _) = poker
        .decrypt_turn_p3(charlie, 1, cards, charlie_keys)
        .unwrap();

    let revealed = poker.get_revealed_cards(1).unwrap();
    println!("{}", &revealed.display_cards());

    poker.bet(bob, 1, 0).unwrap();
    poker.bet(charlie, 1, 0).unwrap();
    poker.bet(alice, 1, 0).unwrap();

    let cards = poker.get_cards(1).unwrap();
    let (alice_keys, _) = poker.decrypt_river_p1(alice, 1, cards, alice_keys).unwrap();

    let cards = poker.get_cards(1).unwrap();
    let (bob_keys, _) = poker.decrypt_river_p2(bob, 1, cards, bob_keys).unwrap();

    let cards = poker.get_cards(1).unwrap();
    let (charlie_keys, _) = poker
        .decrypt_river_p3(charlie, 1, cards, charlie_keys)
        .unwrap();

    let revealed = poker.get_revealed_cards(1).unwrap();
    println!("{}", &revealed.display_cards());

    poker.bet(bob, 1, 0).unwrap();
    poker.bet(charlie, 1, 0).unwrap();
    poker.bet(alice, 1, 0).unwrap();

    let revealed = poker.get_revealed_cards(1).unwrap();
    println!("{}", &revealed.display_cards());

    let cards = poker.get_cards(1).unwrap();
    let (_alice_keys, _) = poker.showdown_p1(alice, 1, cards, alice_keys).unwrap();

    let cards = poker.get_cards(1).unwrap();
    let (_bob_keys, _) = poker.showdown_p2(bob, 1, cards, bob_keys).unwrap();

    let cards = poker.get_cards(1).unwrap();
    let (_charlie_keys, _) = poker.showdown_p3(charlie, 1, cards, charlie_keys).unwrap();

    poker.compare_hands(alice, 1).unwrap();

    let game = poker.get_games(1).unwrap();
    dbg!(&game);
    let chips = poker.get_chips(1).unwrap();
    dbg!(&chips);
    let revealed = poker.get_revealed_cards(1).unwrap();
    println!("{}", &revealed.display_cards());
}
