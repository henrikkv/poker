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
        // 6: Waiting for player2 to bet
        // 7: Waiting for player3 to bet

        // 8: Waiting for player1 to decrypt flop
        // 9: Waiting for player2 to decrypt flop
        // 10: Waiting for player3 to decrypt flop

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
        // bitmaps
        dealer_button: u8,
        players_out: u8,
        last_bet: u8,
    }
    inline player1() -> u8 { return 1u8; }
    inline player2() -> u8 { return 2u8; }
    inline player3() -> u8 { return 4u8; }
    inline is_player1(bitmap: u8) -> bool { return bitmap & 1u8 != 0u8; }
    inline is_player2(bitmap: u8) -> bool { return bitmap & 2u8 != 0u8; }
    inline is_player3(bitmap: u8) -> bool { return bitmap & 4u8 != 0u8; }
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
            dealer_button: 4u8,
            players_out: 0u8,
            last_bet: 0u8,
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
                dealer_button: 4u8,
                players_out: 0u8,
                last_bet: 0u8,
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
                players_out: 0u8,
                last_bet: 0u8,
            };
            let chip: Chips = Chips {
                player1: 1000u16,
                player2: 1000u16,
                player3: 1000u16,
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
    async transition bet(game_id: u32, amount: u16) -> Future {
        return finalize_bet(game_id, amount, self.caller);
    }
    async function finalize_bet(game_id: u32, amount: u16, caller: address) {
        let game: Game = Mapping::get(games, game_id);
        let chip: Chips = Mapping::get(chips, game_id);

        // Validate the bet is from the correct player and state
        let is_valid_state: bool = game.state == 4u8 && game.player1 == caller ||
                                  game.state == 5u8 && game.player2 == caller ||
                                  game.state == 6u8 && game.player3 == caller;
        assert(is_valid_state);

        // Get current player's chips and bet amounts
        let (current_chips, current_bet): (u16, u16) = 
            game.state == 4u8 ? (chip.player1, chip.player1_bet) :
            game.state == 5u8 ? (chip.player2, chip.player2_bet) :
            (chip.player3, chip.player3_bet);

        // Find highest bet
        let highest_bet: u16 = 
            chip.player1_bet >= chip.player2_bet && chip.player1_bet >= chip.player3_bet ? chip.player1_bet :
            chip.player2_bet >= chip.player3_bet ? chip.player2_bet : chip.player3_bet;

        // Calculate required call amount
        let call_amount: u16 = highest_bet - current_bet;

        // Validate bet amount:
        // 1. Can't bet more than you have
        assert(amount <= current_chips);
        // 2. Must call or go all-in
        assert(amount == current_chips || amount >= call_amount);

        let new_amount: u16 = current_bet + amount;
        let new_remaining: u16 = current_chips - amount;

        // Check if any player is all-in or out
        let is_p1_inactive: bool = chip.player1 == 0u16 || is_player1(game.players_out);
        let is_p2_inactive: bool = chip.player2 == 0u16 || is_player2(game.players_out);
        let is_p3_inactive: bool = chip.player3 == 0u16 || is_player3(game.players_out);

        // Determine if this player is going all-in with this bet
        let is_going_allin: bool = new_remaining == 0u16;

        // Find next active player's state (skipping inactive players)
        let next_state: u8 = 
            game.state == 4u8 ? 
                (is_p2_inactive ? 
                    (is_p3_inactive ? 8u8 : 6u8) : 5u8) :
            game.state == 5u8 ? 
                (is_p3_inactive ? 
                    (is_p1_inactive ? 8u8 : 4u8) : 6u8) :
            // game.state == 6u8
                (is_p1_inactive ? 
                    (is_p2_inactive ? 8u8 : 5u8) : 4u8);

        // Calculate new state and last_bet based on game conditions
        let (new_state, new_last_bet): (u8, u8) = 
            // If checking (amount == 0) and current bet matches highest bet or is all-in
            (amount == 0u16 && (current_bet == highest_bet || is_going_allin)) ? 
                (next_state, game.last_bet) :
            // If raising, calling the highest bet, or going all-in
            new_amount >= highest_bet || is_going_allin ? 
                (next_state,
                 // Set last_bet to current player only if raising and not all-in
                 new_amount > highest_bet && !is_going_allin ? 
                    (game.state == 4u8 ? player1() :
                     game.state == 5u8 ? player2() : player3()) :
                 game.last_bet) :
            (game.state, game.last_bet); // Invalid bet, keep current state

        // If everyone who's not inactive has matched the highest bet, move to next phase
        let should_advance: bool = 
            (is_p1_inactive || chip.player1_bet == highest_bet) &&
            (is_p2_inactive || chip.player2_bet == highest_bet) &&
            (is_p3_inactive || chip.player3_bet == highest_bet);

        // Force next phase if all active players are matched
        let final_state: u8 = should_advance ? 8u8 : new_state;

        // Create new chip state
        let new_chip: Chips = Chips {
            player1: game.state == 4u8 ? new_remaining : chip.player1,
            player2: game.state == 5u8 ? new_remaining : chip.player2,
            player3: game.state == 6u8 ? new_remaining : chip.player3,
            player1_bet: game.state == 4u8 ? new_amount : chip.player1_bet,
            player2_bet: game.state == 5u8 ? new_amount : chip.player2_bet,
            player3_bet: game.state == 6u8 ? new_amount : chip.player3_bet,
        };

        // Create new game state
        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            deck: game.deck,
            state: final_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            last_bet: new_last_bet,
        };
        
        Mapping::set(chips, game_id, new_chip);
        Mapping::set(games, game_id, new_game);
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
        if (is_player2(game.players_out)) {
            let new_game: Game = Game {
                player1: game.player1,
                player2: game.player2,
                player3: game.player3,
                buy_in: game.buy_in,
                deck: game.deck,
                state: 4u8,
                dealer_button: game.dealer_button,
                players_out: game.players_out,
                last_bet: game.last_bet,
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
                state: 3u8,
                dealer_button: game.dealer_button,
                players_out: game.players_out,
                last_bet: game.last_bet,
            };
            Mapping::set(cards, game_id, new_card);
            Mapping::set(games, game_id, new_game);
        }
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

        // Set the cards mapping once
        Mapping::set(cards, game_id, new_card);

        // Calculate state and last_bet using ternary operators
        let new_state: u8 = is_player3(game.players_out) ? 
            (is_player2(game.dealer_button) ? 5u8 : 6u8) : 4u8;

        let new_last_bet: u8 = is_player3(game.players_out) ? 
            (is_player2(game.dealer_button) ? player2() : player1()) : game.last_bet;

        // Set the games mapping once
        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            deck: game.deck,
            state: new_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            last_bet: new_last_bet,
        };
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
        assert(game.player3 == caller);

        // Set the cards mapping once
        Mapping::set(cards, game_id, new_card);

        // Calculate state and last_bet using nested ternary operators
        let new_state: u8 = 
            is_player1(game.players_out) ? 
                (is_player2(game.dealer_button) ? 7u8 : 6u8) :
            is_player2(game.players_out) ? 
                (is_player1(game.dealer_button) ? 7u8 : 5u8) :
            is_player3(game.players_out) ? 
                (is_player2(game.dealer_button) ? 5u8 : 6u8) :
            is_player1(game.dealer_button) ? 7u8 :
            is_player2(game.dealer_button) ? 5u8 : 6u8;

        let new_last_bet: u8 = 
            is_player1(game.players_out) ? 
                (is_player2(game.dealer_button) ? player2() : player3()) :
            is_player2(game.players_out) ? 
                (is_player1(game.dealer_button) ? player1() : player3()) :
            is_player3(game.players_out) ? 
                (is_player2(game.dealer_button) ? player2() : player1()) :
            is_player1(game.dealer_button) ? player2() :
            is_player2(game.dealer_button) ? player3() : player1();

        // Set the games mapping once
        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            deck: game.deck,
            state: new_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            last_bet: new_last_bet,
        };
        Mapping::set(games, game_id, new_game);
    }
}
