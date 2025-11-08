use colored::*;
use mental_poker_bindings::mental_poker::{Cards, RevealedCards};
use snarkvm::prelude::*;
use std::collections::HashMap;

#[derive(Debug, Clone, Copy)]
pub enum CardInfo {
    Valid {
        suit: &'static str,
        value: &'static str,
        is_red: bool,
    },
    FaceDown,
    Invalid(u8),
}

pub fn card_info(card_index: u8) -> CardInfo {
    if card_index == 255 {
        return CardInfo::FaceDown;
    }

    if card_index > 51 {
        return CardInfo::Invalid(card_index);
    }

    const SUITS: [&str; 4] = ["♠️", "♣️", "❤️", "♦️"];
    const VALUES: [&str; 13] = [
        " 2", " 3", " 4", " 5", " 6", " 7", " 8", " 9", "10", " J", " Q", " K", " A",
    ];

    let suit_index = card_index / 13;
    let value_index = card_index % 13;
    CardInfo::Valid {
        suit: SUITS[suit_index as usize],
        value: VALUES[value_index as usize],
        is_red: suit_index == 2 || suit_index == 3,
    }
}

pub fn format_card(card_index: u8) -> ColoredString {
    match card_info(card_index) {
        CardInfo::FaceDown => "???".bright_black(),
        CardInfo::Invalid(idx) => format!("Incorrect card index: {}", idx).yellow(),
        CardInfo::Valid {
            suit,
            value,
            is_red,
        } => {
            let card_str = format!("{}{}", suit, value);
            if is_red {
                card_str.red().on_green()
            } else {
                card_str.black().on_green()
            }
        }
    }
}

pub fn compute_card_hashes_from_deck<N: Network>(deck: [Group<N>; 52]) -> HashMap<Group<N>, u8> {
    deck.iter()
        .enumerate()
        .map(|(i, &hash)| (hash, i as u8))
        .collect()
}

pub fn decrypt_hand_local<N: Network>(
    encrypted_hand: [Group<N>; 2],
    secret_inv: Scalar<N>,
    card_hashes: &HashMap<Group<N>, u8>,
) -> [u8; 2] {
    let decrypted_hand = [
        encrypted_hand[0] * secret_inv,
        encrypted_hand[1] * secret_inv,
    ];
    [
        card_hashes.get(&decrypted_hand[0]).copied().unwrap_or(255),
        card_hashes.get(&decrypted_hand[1]).copied().unwrap_or(255),
    ]
}

pub trait CardDisplay {
    fn display_cards(&self) -> String;
}

impl<N: Network> CardDisplay for RevealedCards<N> {
    fn display_cards(&self) -> String {
        format!(
            "Community: [{}, {}, {}, {}, {}]\nPlayer 1:  [{}, {}]\nPlayer 2:  [{}, {}]\nPlayer 3:  [{}, {}]",
            format_card(self.flop[0]),
            format_card(self.flop[1]),
            format_card(self.flop[2]),
            format_card(self.turn),
            format_card(self.river),
            format_card(self.player1[0]),
            format_card(self.player1[1]),
            format_card(self.player2[0]),
            format_card(self.player2[1]),
            format_card(self.player3[0]),
            format_card(self.player3[1]),
        )
    }
}

pub fn get_opponents(player_id: u8) -> (u8, u8) {
    match player_id {
        1 => (2, 3),
        2 => (1, 3),
        3 => (1, 2),
        _ => unreachable!("Invalid player_id"),
    }
}

pub fn get_other_players_cards<N: Network>(
    player_id: u8,
    cards: &Cards<N>,
) -> ([Group<N>; 2], [Group<N>; 2]) {
    let (opp1, opp2) = get_opponents(player_id);
    (get_player_cards(opp1, cards), get_player_cards(opp2, cards))
}

pub fn get_player_cards<N: Network>(player_id: u8, cards: &Cards<N>) -> [Group<N>; 2] {
    match player_id {
        1 => cards.player1,
        2 => cards.player2,
        3 => cards.player3,
        _ => unreachable!("Invalid player_id"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_card() {
        assert_eq!(format_card(0), "♠️ 2".black().on_green());
        assert_eq!(format_card(1), "♠️ 3".black().on_green());
        assert_eq!(format_card(8), "♠️10".black().on_green());
        assert_eq!(format_card(9), "♠️ J".black().on_green());
        assert_eq!(format_card(11), "♠️ K".black().on_green());
        assert_eq!(format_card(12), "♠️ A".black().on_green());
        assert_eq!(format_card(13), "♣️ 2".black().on_green());
        assert_eq!(format_card(25), "♣️ A".black().on_green());
        assert_eq!(format_card(26), "❤️ 2".red().on_green());
        assert_eq!(format_card(38), "❤️ A".red().on_green());
        assert_eq!(format_card(39), "♦️ 2".red().on_green());
        assert_eq!(format_card(51), "♦️ A".red().on_green());
        assert_eq!(format_card(255), "???".bright_black());
        println!("{}", format_card(0));
        println!("{}", format_card(1));
        println!("{}", format_card(8));
        println!("{}", format_card(12));
        println!("{}", format_card(13));
        println!("{}", format_card(26));
        println!("{}", format_card(51));
        println!("{}", format_card(255));
        println!("{}", format_card(123));
    }
}
