import zk_deck_shuffle.aleo;
import zk_sra_encryption.aleo;

program poker.aleo {
    mapping games: u32 => Game;
    mapping chips: u32 => Chips;
    mapping cards: u32 => Cards;

    inline get_new_deck() -> [[u128; 26]; 2] {
        return [[1u128, 2u128, 3u128, 4u128, 5u128, 6u128, 7u128, 8u128, 9u128, 10u128, 11u128, 12u128, 13u128, 14u128, 15u128, 16u128, 17u128, 18u128, 19u128, 20u128, 21u128, 22u128, 23u128, 24u128, 25u128, 26u128],
                [27u128, 28u128, 29u128, 30u128, 31u128, 32u128, 33u128, 34u128, 35u128, 36u128, 37u128, 38u128, 39u128, 40u128, 41u128, 42u128, 43u128, 44u128, 45u128, 46u128, 47u128, 48u128, 49u128, 50u128, 51u128, 52u128]];
    }

    struct Game {
        player1: address,
        player2: address,
        player3: address,
        buy_in: u64,
        deck: [[u128; 26]; 2],
        // 0: Waiting for player2 to join
        // 1: Waiting for player3 to join

        // 2: Waiting for player1 to decrypt hands
        // 3: Waiting for player2 to decrypt hands
        // 4: Waiting for player3 to decrypt hands

        // 5: Waiting for player1 to bet
        // 5: Waiting for player2 to bet
        // 5: Waiting for player3 to bet

        // Waiting for player1 to decrypt flop
        // Waiting for player2 to decrypt flop
        // Waiting for player3 to decrypt flop

        // Waiting for player1 to decrypt turn
        // Waiting for player2 to decrypt turn
        // Waiting for player3 to decrypt turn

        // Waiting for player1 to decrypt river
        // Waiting for player2 to decrypt river
        // Waiting for player3 to decrypt river

        // Waiting for player1 to create a new deck and shuffle
        // Waiting for player2 to shuffle
        // Waiting for player3 to shuffle
        state: u8,
        dealer_button: u8,
    }
    struct Chips {
        player1: u16,
        player2: u16,
        player3: u16,
        player1_bet: u16,
        player2_bet: u16,
        player3_bet: u16,
    }
    struct Cards {
        player1: [u128; 2],
        player2: [u128; 2],
        player3: [u128; 2],
        flop: [u128; 3],
        turn: u128,
        river: u128,
    }
    async transition create_game(game_id: u32, element1: i8, element2: i8, element3: i8, e: u128, n: u128) -> Future {
        let deck: [[u128; 26]; 2] = zk_deck_shuffle.aleo/full_shuffle(element1, element2, element3, zk_sra_encryption.aleo/encrypt_deck(e, n, get_new_deck()));
        return finalize_new_game(game_id, deck, self.caller);
    }
    async function finalize_new_game(game_id: u32, deck: [[u128; 26]; 2], caller: address) {
        let game: Game = Game {
            player1: caller,
            player2: 0u128 as address,
            player3: 0u128 as address, 
            buy_in: 10u64,
            deck: deck,
            state: 0u8,
            dealer_button: 3u8,
        };
        Mapping::set(games, game_id, game);
    }
    async transition join_game(game_id: u32, deck: [[u128; 26]; 2], element1: i8, element2: i8, element3: i8, e: u128, n: u128) -> Future {
        let new_deck: [[u128; 26]; 2] = zk_deck_shuffle.aleo/full_shuffle(element1, element2, element3, zk_sra_encryption.aleo/encrypt_deck(e, n, deck)); 
        return finalize_join_game(game_id, deck, new_deck, self.caller);
    }
    async function finalize_join_game(game_id: u32, deck: [[u128; 26]; 2], new_deck: [[u128; 26]; 2], caller: address) {
        let game: Game = Mapping::get(games, game_id);    
        assert(game.deck == deck);
        if (game.state == 0u8) {
            let new_game: Game = Game {
                player1: game.player1,
                player2: caller,
                player3: 0u128 as address,
                buy_in: game.buy_in,
                deck: new_deck,
                state: 1u8,
                dealer_button: 3u8
            };
            Mapping::set(games, game_id, new_game);
        } else if (game.state == 1u8) {
            let new_game: Game = Game {
                player1: game.player1,
                player2: game.player2,
                player3: caller,
                buy_in: game.buy_in,
                deck: new_deck,
                state: 2u8,
                dealer_button: 3u8,
            };
            let chip: Chips = Chips {
                player1: 0u16,
                player2: 0u16,
                player3: 0u16,
                player1_bet: 0u16,
                player2_bet: 0u16,
                player3_bet: 0u16,
            };
            let card: Cards = Cards {
                player1: [new_deck[1u8][1u8], new_deck[1u8][4u8]],
                player2: [new_deck[1u8][2u8], new_deck[1u8][5u8]],
                player3: [new_deck[1u8][3u8], new_deck[1u8][6u8]],
                flop: [new_deck[1u8][7u8], new_deck[1u8][8u8], new_deck[1u8][9u8]],
                turn: new_deck[1u8][10u8],
                river: new_deck[1u8][11u8],
            };

            Mapping::set(games, game_id, new_game);
            Mapping::set(chips, game_id, chip);
            Mapping::set(cards, game_id, card);
        } else { return; }
    }
    async transition play(game_id: u32) -> Future {
        return finalize_play(game_id, self.caller);
    }
    async function finalize_play(game_id: u32, caller: address) {
        let game: Game = Mapping::get(games, game_id);
        if (game.state == 2u8) {
        }
    }
    async transition decrypt_hands_p1(game_id: u32, d: u128, n: u128, card: Cards) -> Future {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: [zk_sra_encryption.aleo/decrypt_card(d, n, card.player2[0u8]), zk_sra_encryption.aleo/decrypt_card(d, n, card.player2[1u8])],
            player3: [zk_sra_encryption.aleo/decrypt_card(d, n, card.player3[0u8]), zk_sra_encryption.aleo/decrypt_card(d, n, card.player3[1u8])],
            flop: card.flop,
            turn: card.turn,
            river: card.river,
        };
        return finalize_decrypt_hands_p1(game_id, card, new_card, self.caller);
    }
    async function finalize_decrypt_hands_p1(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == 2u8);
        assert(game.player1 == caller);
        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            deck: game.deck,
            state: 3u8,
            dealer_button: game.dealer_button,
        };
        Mapping::set(cards, game_id, new_card);
        Mapping::set(games, game_id, new_game);
    }
    async transition decrypt_hands_p2(game_id: u32, d: u128, n: u128, card: Cards) -> Future {
        let new_card: Cards = Cards {
            player1: [zk_sra_encryption.aleo/decrypt_card(d, n, card.player1[0u8]), zk_sra_encryption.aleo/decrypt_card(d, n, card.player1[1u8])],
            player2: card.player2,
            player3: [zk_sra_encryption.aleo/decrypt_card(d, n, card.player3[0u8]), zk_sra_encryption.aleo/decrypt_card(d, n, card.player3[1u8])],
            flop: card.flop,
            turn: card.turn,
            river: card.river,
        };
        return finalize_decrypt_hands_p2(game_id, card, new_card, self.caller);
    }
    async function finalize_decrypt_hands_p2(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == 3u8);
        assert(game.player2 == caller);
        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            deck: game.deck,
            state: 4u8,
            dealer_button: game.dealer_button,
        };
        Mapping::set(cards, game_id, new_card);
        Mapping::set(games, game_id, new_game);
    }
    async transition decrypt_hands_p3(game_id: u32, d: u128, n: u128, card: Cards) -> Future {
        let new_card: Cards = Cards {
            player1: [zk_sra_encryption.aleo/decrypt_card(d, n, card.player1[0u8]), zk_sra_encryption.aleo/decrypt_card(d, n, card.player1[1u8])],
            player2: [zk_sra_encryption.aleo/decrypt_card(d, n, card.player2[0u8]), zk_sra_encryption.aleo/decrypt_card(d, n, card.player2[1u8])],
            player3: card.player3,
            flop: card.flop,
            turn: card.turn,
            river: card.river,
        };
        return finalize_decrypt_hands_p3(game_id, card, new_card, self.caller);
    }
    async function finalize_decrypt_hands_p3(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == 4u8);
        assert(game.player1 == caller);
        if (game.dealer_button == 3u8) {
            let new_game: Game = Game {
                player1: game.player1,
                player2: game.player2,
                player3: game.player3,
                buy_in: game.buy_in,
                deck: game.deck,
                state: 4u8, // player1 starts
                dealer_button: game.dealer_button,
            };
            Mapping::set(cards, game_id, new_card);
            Mapping::set(games, game_id, new_game);
        } else if (game.dealer_button == 1u8) {
            let new_game: Game = Game {
                player1: game.player1,
                player2: game.player2,
                player3: game.player3,
                buy_in: game.buy_in,
                deck: game.deck,
                state: 5u8, // player2 starts
                dealer_button: game.dealer_button,
            };
            Mapping::set(cards, game_id, new_card);
            Mapping::set(games, game_id, new_game);
        } else {
            let new_game: Game = Game {
                player1: game.player1,
                player2: game.player2,
                player3: game.player3,
                buy_in: game.buy_in,
                deck: game.deck,
                state: 6u8, // player3 starts
                dealer_button: game.dealer_button,
            };
            Mapping::set(cards, game_id, new_card);
            Mapping::set(games, game_id, new_game);
        }
    }
}
