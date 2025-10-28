use mental_poker_bindings::mental_poker::interpreter::mental_poker_interpreter_cheats::*;
use mental_poker_bindings::mental_poker::*;
use snarkvm::console::network::TestnetV0;
use snarkvm::prelude::*;
use std::str::FromStr;

const ENDPOINT: &str = "http://localhost:3030";
const PRIVATE_KEY: &str = "APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH";

type Account<N> = leo_bindings::utils::Account<N>;

fn card(s: &str) -> u8 {
    let s = s.trim().replace(" ", "").to_uppercase();
    let suit_char = s.chars().next().expect("Empty card string");
    let value_str = &s[1..];

    let suit_offset = match suit_char {
        'S' => 0,
        'C' => 13,
        'H' => 26,
        'D' => 39,
        _ => panic!("Invalid suit: {}", suit_char),
    };

    let value_index = match value_str {
        "2" => 0,
        "3" => 1,
        "4" => 2,
        "5" => 3,
        "6" => 4,
        "7" => 5,
        "8" => 6,
        "9" => 7,
        "10" => 8,
        "J" => 9,
        "Q" => 10,
        "K" => 11,
        "A" => 12,
        _ => panic!("Invalid value: {}", value_str),
    };

    suit_offset + value_index
}

struct GameSetup {
    game_id: u32,
    players_out: u8,
    players_folded: u8,
    initial_chips: (u16, u16, u16),
    initial_bets: (u16, u16, u16),
}

struct Cards {
    p1_cards: [u8; 2],
    p2_cards: [u8; 2],
    p3_cards: [u8; 2],
    flop: [u8; 3],
    turn: u8,
    river: u8,
}

struct Expectation {
    winner_chips: Option<(u16, u16, u16)>,
}

fn run_test(setup: GameSetup, cards: Cards, expectation: Expectation) {
    let p1: Account<TestnetV0> = Account::from_str(PRIVATE_KEY).unwrap();
    let p2: Account<TestnetV0> = Account::new(&mut rand::thread_rng()).unwrap();
    let p3: Account<TestnetV0> = Account::new(&mut rand::thread_rng()).unwrap();
    let poker = MentalPokerInterpreter::new(&p1, ENDPOINT).unwrap();

    let game = Game::new(
        p1.address(),
        p2.address(),
        p3.address(),
        100u64,
        29u8,
        1u8,
        setup.players_out,
        setup.players_folded,
        0u8,
        10u16,
        20u16,
        10u8,
        0u8,
        0u16,
    );
    set_games(setup.game_id, game).unwrap();

    let chips = Chips::new(
        setup.initial_chips.0,
        setup.initial_chips.1,
        setup.initial_chips.2,
        setup.initial_bets.0,
        setup.initial_bets.1,
        setup.initial_bets.2,
    );
    set_chips(setup.game_id, chips).unwrap();

    let revealed = RevealedCards::new(
        cards.p1_cards,
        cards.p2_cards,
        cards.p3_cards,
        cards.flop,
        cards.turn,
        cards.river,
    );
    set_revealed_cards(setup.game_id, revealed).unwrap();

    poker.compare_hands(&p1, setup.game_id).unwrap();

    let final_chips = poker.get_chips(setup.game_id).unwrap();

    if let Some(expected_chips) = expectation.winner_chips {
        assert_eq!(
            final_chips.player1,
            expected_chips.0,
            "Expected P1 chips to be: ({}, {}, {}), got: ({}, {}, {})",
            expected_chips.0,
            expected_chips.1,
            expected_chips.2,
            final_chips.player1,
            final_chips.player2,
            final_chips.player3
        );
        assert_eq!(
            final_chips.player2,
            expected_chips.1,
            "Expected P2 chips to be: ({}, {}, {}), got: ({}, {}, {})",
            expected_chips.0,
            expected_chips.1,
            expected_chips.2,
            final_chips.player1,
            final_chips.player2,
            final_chips.player3
        );
        assert_eq!(
            final_chips.player3,
            expected_chips.2,
            "Expected P3 chips to be: ({}, {}, {}), got: ({}, {}, {})",
            expected_chips.0,
            expected_chips.1,
            expected_chips.2,
            final_chips.player1,
            final_chips.player2,
            final_chips.player3
        );
    }
}

#[test]
fn test_straight_flush_vs_quads() {
    run_test(
        GameSetup {
            game_id: 1,
            players_out: 0,
            players_folded: 4,
            initial_chips: (0, 0, 100),
            initial_bets: (100, 100, 0),
        },
        Cards {
            p1_cards: [card("S9"), card("S6")],
            p2_cards: [card("H5"), card("D5")],
            p3_cards: [card("H2"), card("C2")],
            flop: [card("S8"), card("S7"), card("S5")],
            turn: card("C5"),
            river: card("H10"),
        },
        Expectation {
            winner_chips: Some((200, 0, 100)),
        },
    );
}

#[test]
fn test_four_of_kind_vs_full_house() {
    run_test(
        GameSetup {
            game_id: 2,
            players_out: 0,
            players_folded: 4,
            initial_chips: (100, 0, 100),
            initial_bets: (50, 50, 0),
        },
        Cards {
            p1_cards: [card("SA"), card("HA")],
            p2_cards: [card("SK"), card("HK")],
            p3_cards: [card("H2"), card("H3")],
            flop: [card("DA"), card("CA"), card("SQ")],
            turn: card("HQ"),
            river: card("DQ"),
        },
        Expectation {
            winner_chips: Some((200, 0, 100)),
        },
    );
}

#[test]
fn test_flush_vs_straight() {
    run_test(
        GameSetup {
            game_id: 3,
            players_out: 0,
            players_folded: 4,
            initial_chips: (100, 0, 100),
            initial_bets: (50, 50, 0),
        },
        Cards {
            p1_cards: [card("SA"), card("SK")],
            p2_cards: [card("H10"), card("D9")],
            p3_cards: [card("H2"), card("H3")],
            flop: [card("SQ"), card("S9"), card("S7")],
            turn: card("C8"),
            river: card("H6"),
        },
        Expectation {
            winner_chips: Some((200, 0, 100)),
        },
    );
}

#[test]
fn test_three_of_kind_vs_two_pair() {
    run_test(
        GameSetup {
            game_id: 4,
            players_out: 0,
            players_folded: 4,
            initial_chips: (100, 0, 100),
            initial_bets: (50, 50, 0),
        },
        Cards {
            p1_cards: [card("SK"), card("HK")],
            p2_cards: [card("SA"), card("HA")],
            p3_cards: [card("H2"), card("H3")],
            flop: [card("DK"), card("SQ"), card("HQ")],
            turn: card("S10"),
            river: card("S9"),
        },
        Expectation {
            winner_chips: Some((200, 0, 100)),
        },
    );
}

#[test]
fn test_pair_vs_high_card() {
    run_test(
        GameSetup {
            game_id: 5,
            players_out: 0,
            players_folded: 4,
            initial_chips: (100, 0, 100),
            initial_bets: (50, 50, 0),
        },
        Cards {
            p1_cards: [card("SK"), card("HK")],
            p2_cards: [card("DA"), card("DQ")],
            p3_cards: [card("H2"), card("H3")],
            flop: [card("C10"), card("H9"), card("D7")],
            turn: card("C5"),
            river: card("C4"),
        },
        Expectation {
            winner_chips: Some((200, 0, 100)),
        },
    );
}

#[test]
fn test_same_pair_higher_kicker() {
    run_test(
        GameSetup {
            game_id: 6,
            players_out: 0,
            players_folded: 4,
            initial_chips: (100, 0, 100),
            initial_bets: (50, 50, 0),
        },
        Cards {
            p1_cards: [card("S10"), card("SA")],
            p2_cards: [card("D10"), card("SK")],
            p3_cards: [card("H2"), card("H3")],
            flop: [card("H10"), card("S9"), card("D7")],
            turn: card("S5"),
            river: card("D4"),
        },
        Expectation {
            winner_chips: Some((200, 0, 100)),
        },
    );
}

#[test]
fn test_wheel_straight() {
    run_test(
        GameSetup {
            game_id: 7,
            players_out: 0,
            players_folded: 4,
            initial_chips: (100, 0, 100),
            initial_bets: (50, 50, 0),
        },
        Cards {
            p1_cards: [card("SA"), card("H2")],
            p2_cards: [card("D6"), card("H6")],
            p3_cards: [card("H3"), card("H4")],
            flop: [card("D3"), card("C4"), card("S5")],
            turn: card("C9"),
            river: card("C8"),
        },
        Expectation {
            winner_chips: Some((200, 0, 100)),
        },
    );
}

#[test]
fn test_split_pot_playing_board() {
    run_test(
        GameSetup {
            game_id: 8,
            players_out: 0,
            players_folded: 4,
            initial_chips: (0, 0, 100),
            initial_bets: (50, 50, 0),
        },
        Cards {
            p1_cards: [card("H2"), card("H3")],
            p2_cards: [card("D4"), card("D5")],
            p3_cards: [card("C2"), card("C3")],
            flop: [card("SA"), card("SK"), card("SQ")],
            turn: card("SJ"),
            river: card("S10"),
        },
        Expectation {
            winner_chips: Some((50, 50, 100)),
        },
    );
}

#[test]
fn test_full_house_higher_trips() {
    run_test(
        GameSetup {
            game_id: 9,
            players_out: 0,
            players_folded: 4,
            initial_chips: (100, 0, 100),
            initial_bets: (50, 50, 0),
        },
        Cards {
            p1_cards: [card("SA"), card("HA")],
            p2_cards: [card("D3"), card("C3")],
            p3_cards: [card("H2"), card("H3")],
            flop: [card("SK"), card("HK"), card("DA")],
            turn: card("S10"),
            river: card("S9"),
        },
        Expectation {
            winner_chips: Some((200, 0, 100)),
        },
    );
}

#[test]
fn test_straight_higher_top_card() {
    run_test(
        GameSetup {
            game_id: 10,
            players_out: 0,
            players_folded: 4,
            initial_chips: (100, 0, 100),
            initial_bets: (50, 50, 0),
        },
        Cards {
            p1_cards: [card("S9"), card("H8")],
            p2_cards: [card("D4"), card("H4")],
            p3_cards: [card("H2"), card("D3")],
            flop: [card("D7"), card("C6"), card("S5")],
            turn: card("C2"),
            river: card("CA"),
        },
        Expectation {
            winner_chips: Some((200, 0, 100)),
        },
    );
}
