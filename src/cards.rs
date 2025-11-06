use colored::*;
use mental_poker_bindings::mental_poker::RevealedCards;
use snarkvm::prelude::*;
use std::collections::HashMap;

/// Formats a card index (0-51) as a string with suit emoji and value.
/// - Suits: ♠️ (0-12), ♣️ (13-25), ❤️ (26-38), ♦️ (39-51)
/// - Values: 2-10, J, Q, K, A
/// - 255 represents a face-down card and displays as "???"
pub fn format_card(card_index: u8) -> ColoredString {
    if card_index == 255 {
        return "???".bright_black();
    }

    if card_index > 51 {
        return format!("Incorrect card index: {}", card_index).yellow();
    }

    let suit_index = card_index / 13;
    let value_index = card_index % 13;

    let suit = match suit_index {
        0 => "♠️",
        1 => "♣️",
        2 => "❤️",
        3 => "♦️",
        _ => "?",
    };

    let value = match value_index {
        0..=7 => format!(" {}", value_index + 2),
        8 => "10".to_string(),
        9 => " J".to_string(),
        10 => " Q".to_string(),
        11 => " K".to_string(),
        12 => " A".to_string(),
        _ => "??".to_string(),
    };

    let card_str = format!("{}{}", suit, value);
    match suit_index {
        0 | 1 => card_str.black().on_green(),
        2 | 3 => card_str.red().on_green(),
        _ => card_str.yellow().on_green(),
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
