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

        // 11: Waiting for player1 to bet
        // 12: Waiting for player2 to bet
        // 13: Waiting for player3 to bet

        // 14: Waiting for player1 to decrypt turn
        // 15: Waiting for player2 to decrypt turn
        // 16: Waiting for player3 to decrypt turn

        // 17: Waiting for player1 to bet
        // 18: Waiting for player2 to bet
        // 19: Waiting for player3 to bet

        // 20: Waiting for player1 to decrypt river
        // 21: Waiting for player2 to decrypt river
        // 22: Waiting for player3 to decrypt river

        // 23: Waiting for player1 to bet
        // 24: Waiting for player2 to bet
        // 25: Waiting for player3 to bet

        // 26: Player1 Showdown
        // 27: Player2 Showdown
        // 28: Player3 Showdown

        // 29: Waiting for player1 to create a new deck and shuffle
        // 30: Waiting for player2 to create a new deck and shuffle
        // 31: Waiting for player2 to shuffle
        // 32: Waiting for player3 to shuffle

        // 33: Waiting for Player1 to claim prize
        // 34: Waiting for Player2 to claim prize
        // 35: Waiting for Player3 to claim prize

        state: u8,
        // bitmaps
        dealer_button: u8,
        players_out: u8,     // Players who have left the game and do not need to decrypt cards
        players_folded: u8,  // Players who folded or are out for current round
        last_bet: u8,
        sb: u16,             
        bb: u16,             
        remaining_hands: u8,  // Hands until blinds increase
        hands_played: u8,     
        last_raise_size: u16,  // Add this field to track minimum raise size
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
            dealer_button: player1(),
            players_out: 0u8,
            players_folded: 0u8,
            last_bet: 0u8,
            sb: 5u16,         // Start with 5 chip small blind
            bb: 10u16,        // Start with 10 chip big blind
            remaining_hands: 10u8, // Increase blinds every 10 hands
            hands_played: 0u8,
            last_raise_size: 0u16,
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
        
        // Determine if this is player2 or player3 joining
        let player2_joining: bool = game.state == 0u8;
        assert(game.state == 0u8 || game.state == 1u8);
        
        let new_game: Game = Game {
            player1: game.player1,
            player2: player2_joining ? caller : game.player2,
            player3: !player2_joining ? caller : 0u128 as address,
            buy_in: game.buy_in,
            deck: new_deck,
            state: player2_joining ? 1u8 : 2u8,
            dealer_button: game.dealer_button,
            players_out: 0u8,
            players_folded: 0u8,
            last_bet: 0u8,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: 0u8,
            last_raise_size: 0u16,
        };
        
        Mapping::set(games, game_id, new_game);
        
        if (!player2_joining) {
            let chip: Chips = Chips {
                player1: 1000u16 - game.sb,  // Deduct small blind
                player2: 1000u16 - game.bb,  // Deduct big blind
                player3: 1000u16,
                player1_bet: game.sb,        // Post small blind
                player2_bet: game.bb,        // Post big blind
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
            Mapping::set(chips, game_id, chip);
            Mapping::set(cards, game_id, card);
        }
    }
    async transition bet(game_id: u32, amount: u16) -> Future {
        return finalize_bet(game_id, amount, self.caller);
    }
    async function finalize_bet(game_id: u32, amount: u16, caller: address) {
        let game: Game = Mapping::get(games, game_id);
        let chip: Chips = Mapping::get(chips, game_id);

        let is_valid_state: bool = 
            (game.state == 4u8 && game.player1 == caller) ||
            (game.state == 5u8 && game.player2 == caller) ||
            (game.state == 6u8 && game.player3 == caller) ||
            (game.state == 11u8 && game.player1 == caller) ||
            (game.state == 12u8 && game.player2 == caller) ||
            (game.state == 13u8 && game.player3 == caller) ||
            (game.state == 17u8 && game.player1 == caller) ||
            (game.state == 18u8 && game.player2 == caller) ||
            (game.state == 19u8 && game.player3 == caller) ||
            (game.state == 23u8 && game.player1 == caller) ||
            (game.state == 24u8 && game.player2 == caller) ||
            (game.state == 25u8 && game.player3 == caller);
        assert(is_valid_state);

        let (current_chips, current_bet): (u16, u16) = 
            (game.state == 4u8 || game.state == 11u8 || game.state == 17u8 || game.state == 23u8) ? (chip.player1, chip.player1_bet) :
            (game.state == 5u8 || game.state == 12u8 || game.state == 18u8 || game.state == 24u8) ? (chip.player2, chip.player2_bet) :
            (chip.player3, chip.player3_bet);

        let highest_bet: u16 = 
            (chip.player1_bet >= chip.player2_bet && chip.player1_bet >= chip.player3_bet) ? chip.player1_bet :
            (chip.player2_bet >= chip.player3_bet) ? chip.player2_bet : chip.player3_bet;

        let min_raise_size: u16 = 
            highest_bet == 0u16 ? game.bb :  // First bet must be at least BB
            game.last_raise_size == 0u16 ? game.bb :  // No raise yet this round
            game.last_raise_size;  // Must be at least the previous raise size

        let min_raise_to: u16 = highest_bet + min_raise_size;

        let call_amount: u16 = highest_bet - current_bet;

        // Add minimum bet validation
        let min_bet: u16 = highest_bet == 0u16 ? game.bb : call_amount;
        assert(
            amount == current_chips ||  // All-in is always valid
            amount >= min_bet          // Must be at least minimum bet
        );

        let is_valid_raise_size: bool = amount == current_chips || amount == call_amount || amount >= min_raise_to;
        let is_short_allin: bool = amount > highest_bet && !is_valid_raise_size;

        let reopens_action: bool = 
            amount > highest_bet && // Must be more than current bet
            amount >= min_raise_to && // Must be at least minimum raise
            !is_valid_raise_size;      // All-ins don't reopen action

        let new_amount: u16 = current_bet + amount;
        let new_remaining: u16 = current_chips - amount;
        let is_going_allin: bool = (new_remaining == 0u16);

        let is_p1_inactive: bool = chip.player1 == 0u16 || is_player1(game.players_folded) || is_player1(game.players_out);
        let is_p2_inactive: bool = chip.player2 == 0u16 || is_player2(game.players_folded) || is_player2(game.players_out);
        let is_p3_inactive: bool = chip.player3 == 0u16 || is_player3(game.players_folded) || is_player3(game.players_out);
        
        let active_players_count: u8 = 
            (!is_p1_inactive as u8) + 
            (!is_p2_inactive as u8) + 
            (!is_p3_inactive as u8);

        assert(active_players_count > 1u8 || (active_players_count == 1u8 && current_bet < highest_bet));

        let post_action_active_count: u8 = active_players_count - (is_going_allin as u8);

        // Check if any player has gone all-in with a lower amount
        let has_short_allin: bool = 
            (chip.player1 == 0u16 && chip.player1_bet < highest_bet) ||
            (chip.player2 == 0u16 && chip.player2_bet < highest_bet) ||
            (chip.player3 == 0u16 && chip.player3_bet < highest_bet);

        // Determine if this bet reopens action
        let new_last_bet: u8 = 
            reopens_action ?
                ((game.state == 4u8 || game.state == 11u8 || game.state == 17u8 || game.state == 23u8) ? player1() :
                 (game.state == 5u8 || game.state == 12u8 || game.state == 18u8 || game.state == 24u8) ? player2() : 
                 player3()) :
                game.last_bet;

        let should_end_betting: bool = 
            post_action_active_count <= 1u8 || // Everyone all-in/folded
            (new_amount >= highest_bet &&      // Current player at least called AND
             ((is_p1_inactive || chip.player1_bet == highest_bet) &&  // Everyone else matched
              (is_p2_inactive || chip.player2_bet == highest_bet) &&
              (is_p3_inactive || chip.player3_bet == highest_bet)) &&
             (!reopens_action || // Either didn't reopen action
              game.last_bet == 0u8 || // Or no previous action to reopen
              is_short_allin ||  // Or was a short all-in
              // Or was last to act before short all-in
              (has_short_allin && !reopens_action &&
               ((game.state == 4u8 || game.state == 11u8 || game.state == 17u8 || game.state == 23u8) && is_player1(game.last_bet)) ||
               ((game.state == 5u8 || game.state == 12u8 || game.state == 18u8 || game.state == 24u8) && is_player2(game.last_bet)) ||
               ((game.state == 6u8 || game.state == 13u8 || game.state == 19u8 || game.state == 25u8) && is_player3(game.last_bet)))));

        let next_state: u8 = 
            should_end_betting ? 
                (game.state <= 7u8) ? (is_player1(game.players_out) ? 8u8 : 7u8) :     // Move to flop decrypt
                (game.state <= 13u8) ? (is_player2(game.players_out) ? 14u8 : 13u8) :   // Move to turn decrypt
                (game.state <= 19u8) ? (is_player3(game.players_out) ? 20u8 : 19u8) :   // Move to river decrypt
                // For showdown, check who starts based on who's still in
                is_player1(game.players_folded) ? 
                    (is_player2(game.players_folded) ? 28u8 : 27u8) :  // P3 or P2 starts
                26u8 :                                                  // P1 starts
            // Otherwise move to next active player
            (game.state == 4u8) ? (is_p2_inactive ? 6u8 : 5u8) :
            (game.state == 5u8) ? (is_p3_inactive ? 4u8 : 6u8) :
            (game.state == 6u8) ? (is_p1_inactive ? 5u8 : 4u8) :
            (game.state == 11u8) ? (is_p2_inactive ? 13u8 : 12u8) :
            (game.state == 12u8) ? (is_p3_inactive ? 11u8 : 13u8) :
            (game.state == 13u8) ? (is_p1_inactive ? 12u8 : 11u8) :
            (game.state == 17u8) ? (is_p2_inactive ? 19u8 : 18u8) :
            (game.state == 18u8) ? (is_p3_inactive ? 17u8 : 19u8) :
            (game.state == 19u8) ? (is_p1_inactive ? 18u8 : 17u8) :
            (game.state == 23u8) ? (is_p2_inactive ? 25u8 : 24u8) :
            (game.state == 24u8) ? (is_p3_inactive ? 23u8 : 25u8) :
            (game.state == 25u8) ? (is_p1_inactive ? 24u8 : 23u8) : 0u8;

        // 8. UPDATE LAST BETTOR
        new_last_bet = 
            (new_amount > highest_bet && !is_going_allin) ?
                ((game.state == 4u8 || game.state == 11u8 || game.state == 17u8 || game.state == 23u8) ? player1() :
                 (game.state == 5u8 || game.state == 12u8 || game.state == 18u8 || game.state == 24u8) ? player2() : 
                 player3()) :
                game.last_bet;

        let pot_size: u16 = chip.player1_bet + chip.player2_bet + chip.player3_bet + amount;
        let new_chip: Chips = Chips {
            // Update current player's stack and bet
            player1: (game.state == 4u8 || game.state == 11u8 || game.state == 17u8 || game.state == 23u8) ? 
                new_remaining : chip.player1,
            player2: (game.state == 5u8 || game.state == 12u8 || game.state == 18u8 || game.state == 24u8) ? 
                new_remaining : chip.player2,
            player3: (game.state == 6u8 || game.state == 13u8 || game.state == 19u8 || game.state == 25u8) ? 
                new_remaining : chip.player3,
            player1_bet: (game.state == 4u8 || game.state == 11u8 || game.state == 17u8 || game.state == 23u8) ? 
                new_amount : chip.player1_bet,
            player2_bet: (game.state == 5u8 || game.state == 12u8 || game.state == 18u8 || game.state == 24u8) ? 
                new_amount : chip.player2_bet,
            player3_bet: (game.state == 6u8 || game.state == 13u8 || game.state == 19u8 || game.state == 25u8) ? 
                new_amount : chip.player3_bet,
        };

        let new_raise_size: u16 = 
            reopens_action ? 
                new_amount - highest_bet :  // Track actual raise size
                game.last_raise_size;   // Keep previous raise size for short all-in

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            deck: game.deck,
            state: next_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_folded,
            last_bet: new_last_bet,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: new_raise_size,
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
                players_folded: game.players_folded,
                last_bet: game.last_bet,
                sb: game.sb,
                bb: game.bb,
                remaining_hands: game.remaining_hands,
                hands_played: game.hands_played,
                last_raise_size: game.last_raise_size,
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
                players_folded: game.players_folded,
                last_bet: game.last_bet,
                sb: game.sb,
                bb: game.bb,
                remaining_hands: game.remaining_hands,
                hands_played: game.hands_played,
                last_raise_size: game.last_raise_size,
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
            players_folded: game.players_folded,
            last_bet: new_last_bet,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: game.last_raise_size,
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
            is_player1(game.players_folded) ? 
                (is_player2(game.dealer_button) ? player2() : player3()) :
            is_player2(game.players_folded) ? 
                (is_player1(game.dealer_button) ? player1() : player3()) :
            is_player3(game.players_folded) ? 
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
            players_folded: game.players_folded,
            last_bet: new_last_bet,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: game.last_raise_size,
        };
        Mapping::set(games, game_id, new_game);
    }
    async transition decrypt_flop_p1(game_id: u32, d: u128, n: u128, card: Cards) -> Future {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: [zk_sra_encryption.aleo/decrypt_card(d, n, card.flop[0u8]),
                   zk_sra_encryption.aleo/decrypt_card(d, n, card.flop[1u8]),
                   zk_sra_encryption.aleo/decrypt_card(d, n, card.flop[2u8])],
            turn: card.turn,
            river: card.river,
        };
        return finalize_decrypt_flop_p1(game_id, card, new_card, self.caller);
    }
    async function finalize_decrypt_flop_p1(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == 8u8);
        assert(game.player1 == caller);
        assert(!is_player1(game.players_out));

        let next_state: u8 = !is_player2(game.players_out) ? 9u8 : 10u8;

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            deck: game.deck,
            state: next_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_folded,
            last_bet: 0u8,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: game.last_raise_size,
        };
        
        Mapping::set(cards, game_id, new_card);
        Mapping::set(games, game_id, new_game);
    }
    async transition decrypt_flop_p2(game_id: u32, d: u128, n: u128, card: Cards) -> Future {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: [zk_sra_encryption.aleo/decrypt_card(d, n, card.flop[0u8]),
                   zk_sra_encryption.aleo/decrypt_card(d, n, card.flop[1u8]),
                   zk_sra_encryption.aleo/decrypt_card(d, n, card.flop[2u8])],
            turn: card.turn,
            river: card.river,
        };
        return finalize_decrypt_flop_p2(game_id, card, new_card, self.caller);
    }
    async function finalize_decrypt_flop_p2(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == 9u8);
        assert(game.player2 == caller);
        assert(!is_player2(game.players_out));

        let chip: Chips = Mapping::get(chips, game_id);
        let is_p1_inactive: bool = chip.player1 == 0u16 || is_player1(game.players_folded);
        let is_p2_inactive: bool = chip.player2 == 0u16 || is_player2(game.players_folded);
        let is_p3_inactive: bool = chip.player3 == 0u16 || is_player3(game.players_folded);

        // Skip betting if only one active or all are all-in
        let should_skip_betting: bool = 
            (!is_p1_inactive as u8 + !is_p2_inactive as u8 + !is_p3_inactive as u8) <= 1u8 || 
            (chip.player1 == 0u16 && chip.player2 == 0u16 && chip.player3 == 0u16);

        // Always go to P3 if not busted, otherwise determine betting state
        let new_state: u8 = 
            !is_player3(game.players_out) ? 10u8 : // P3's turn to decrypt
                      should_skip_betting ? 14u8 : // Skip to turn decrypt
           is_player1(game.dealer_button) ? 
                         (!is_p2_inactive ? 12u8 : !is_p3_inactive ? 13u8 : 11u8) :
           is_player2(game.dealer_button) ? (!is_p3_inactive ? 13u8 : !is_p1_inactive ? 11u8 : 12u8) :
                                            (!is_p1_inactive ? 11u8 : !is_p2_inactive ? 12u8 : 13u8);

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            deck: game.deck,
            state: new_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_folded,
            last_bet: 0u8,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: game.last_raise_size,
        };
        
        Mapping::set(cards, game_id, new_card);
        Mapping::set(games, game_id, new_game);
    }
    async transition decrypt_flop_p3(game_id: u32, d: u128, n: u128, card: Cards) -> Future {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: [zk_sra_encryption.aleo/decrypt_card(d, n, card.flop[0u8]),
                   zk_sra_encryption.aleo/decrypt_card(d, n, card.flop[1u8]),
                   zk_sra_encryption.aleo/decrypt_card(d, n, card.flop[2u8])],
            turn: card.turn,
            river: card.river,
        };
        return finalize_decrypt_flop_p3(game_id, card, new_card, self.caller);
    }
    async function finalize_decrypt_flop_p3(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == 10u8);
        assert(game.player3 == caller);
        assert(!is_player3(game.players_out));

        let chip: Chips = Mapping::get(chips, game_id);
        let is_p1_inactive: bool = chip.player1 == 0u16 || is_player1(game.players_folded);
        let is_p2_inactive: bool = chip.player2 == 0u16 || is_player2(game.players_folded);
        let is_p3_inactive: bool = chip.player3 == 0u16 || is_player3(game.players_folded);

        // Skip betting if only one active or all are all-in
        let should_skip_betting: bool = 
            (!is_p1_inactive as u8 + !is_p2_inactive as u8 + !is_p3_inactive as u8) <= 1u8 || 
            (chip.player1 == 0u16 && chip.player2 == 0u16 && chip.player3 == 0u16);

        // Determine first bettor based on dealer button position
        // First active player after dealer button gets to bet first
        let next_state: u8 = 
                       should_skip_betting ? 14u8 :
            is_player1(game.dealer_button) ? (!is_p2_inactive ? 12u8 : !is_p3_inactive ? 13u8 : 11u8) :
            is_player2(game.dealer_button) ? (!is_p3_inactive ? 13u8 : !is_p1_inactive ? 11u8 : 12u8) :
                                             (!is_p1_inactive ? 11u8 : !is_p2_inactive ? 12u8 : 13u8);

        // Create new game state
        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            deck: game.deck,
            state: next_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_folded,
            last_bet: 0u8, // Reset last_bet for new betting round
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: 0u16, // Reset at start of new betting round
        };

        Mapping::set(cards, game_id, new_card);
        Mapping::set(games, game_id, new_game);
    }
    async transition fold(game_id: u32) -> Future {
        return finalize_fold(game_id, self.caller);
    }
    
    async function finalize_fold(game_id: u32, caller: address) {
        let game: Game = Mapping::get(games, game_id);
        let chip: Chips = Mapping::get(chips, game_id);
        
        // Validate the fold is from the correct player and in a betting state
        let is_valid_state: bool = 
            (game.state >= 4u8 && game.state <= 7u8) ||    // Pre-flop betting
            (game.state >= 11u8 && game.state <= 13u8) ||  // Post-flop betting
            (game.state >= 17u8 && game.state <= 19u8) ||  // Post-turn betting
            (game.state >= 23u8 && game.state <= 25u8);    // Post-river betting
        assert(is_valid_state);
        
        // Determine which player is folding and validate
        let is_player1_folding: bool = game.player1 == caller;
        let is_player2_folding: bool = game.player2 == caller;
        let is_player3_folding: bool = game.player3 == caller;
        assert(is_player1_folding || is_player2_folding || is_player3_folding);
        
        // Update players_folded bitmap
        let new_players_folded: u8 = 
            game.players_folded | 
            (is_player1_folding ? player1() : 
             is_player2_folding ? player2() : player3());
        
        // Count active players after fold
        let active_count: u8 = 3u8 - 
            (is_player1(new_players_folded) ? 1u8 : 0u8) - 
            (is_player2(new_players_folded) ? 1u8 : 0u8) - 
            (is_player3(new_players_folded) ? 1u8 : 0u8);
        
        // When only one player remains, skip showdown and go straight to reshuffling
        if (active_count == 1u8) {
            let pot_size: u16 = chip.player1_bet + chip.player2_bet + chip.player3_bet;
            let new_chip: Chips = Chips {
                player1: !is_player1(new_players_folded) ? chip.player1 + pot_size : chip.player1,
                player2: !is_player2(new_players_folded) ? chip.player2 + pot_size : chip.player2,
                player3: !is_player3(new_players_folded) ? chip.player3 + pot_size : chip.player3,
                player1_bet: 0u16,
                player2_bet: 0u16,
                player3_bet: 0u16,
            };
            
            let next_shuffle_state: u8 = 
                !is_player1(game.players_out) ? 29u8 :  // P1 starts if not out
                !is_player2(game.players_out) ? 30u8 :  // Otherwise P2 if not out
                31u8;                                   // Otherwise P3 starts
            
            let new_game: Game = Game {
                player1: game.player1,
                player2: game.player2,
                player3: game.player3,
                buy_in: game.buy_in,
                deck: game.deck,
                state: next_shuffle_state, // Use helper to find first non-out player
                dealer_button: game.dealer_button,
                players_out: game.players_out,
                players_folded: new_players_folded,
                last_bet: 0u8,
                sb: game.sb,
                bb: game.bb,
                remaining_hands: game.remaining_hands,
                hands_played: game.hands_played,
                last_raise_size: 0u16,
            };
            
            Mapping::set(chips, game_id, new_chip);
            Mapping::set(games, game_id, new_game);
            return;
        }

        // Find highest bet
        let highest_bet: u16 = 
            (chip.player1_bet >= chip.player2_bet && chip.player1_bet >= chip.player3_bet) ? chip.player1_bet :
            (chip.player2_bet >= chip.player3_bet) ? chip.player2_bet : chip.player3_bet;

        // Check if all remaining players have matched the highest bet
        let all_matched: bool = 
            (is_player1(new_players_folded) || chip.player1_bet == highest_bet) &&
            (is_player2(new_players_folded) || chip.player2_bet == highest_bet) &&
            (is_player3(new_players_folded) || chip.player3_bet == highest_bet);

        // Check if betting round should end
        let should_end_betting: bool = all_matched;

        let base_state: u8 = 
            (game.state <= 7u8) ? 4u8 :      // Pre-flop states
            (game.state <= 13u8) ? 11u8 :    // Post-flop states
            (game.state <= 19u8) ? 17u8 :    // Post-turn states
            23u8;                            // Post-river states

        // If betting round ends, move to next phase
        let next_state: u8 = 
            should_end_betting ? 
                (game.state <= 7u8)  ? (is_player1(game.players_out) ? 9u8  : 8u8)  :     // Move to flop decrypt
                (game.state <= 13u8) ? (is_player1(game.players_out) ? 15u8 : 14u8) :   // Move to turn decrypt
                (game.state <= 19u8) ? (is_player1(game.players_out) ? 21u8 : 20u8) :   // Move to river decrypt
                                        is_player1(game.players_out) ? 27u8 : 26u8  : // Move to showdown
                (is_player1_folding) ? // Find next active player to the left
                    (is_player2(new_players_folded) ? base_state + 2u8 : base_state + 1u8) :  // P1 folded -> P2 or P3
                (is_player2_folding) ? 
                    (is_player3(new_players_folded) ? base_state : base_state + 2u8) :        // P2 folded -> P3 or P1
                // P3 folding
                (is_player1(new_players_folded) ? base_state + 1u8 : base_state);             // P3 folded -> P1 or P2
        
        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            deck: game.deck,
            state: next_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: new_players_folded,
            last_bet: should_end_betting ? 0u8 : game.last_bet,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: should_end_betting ? 0u16 : game.last_raise_size,
        };
        
        Mapping::set(games, game_id, new_game);
    }
    async transition decrypt_turn_p1(game_id: u32, d: u128, n: u128, card: Cards) -> Future {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: card.flop,
            turn: zk_sra_encryption.aleo/decrypt_card(d, n, card.turn),
            river: card.river,
        };
        return finalize_decrypt_turn_p1(game_id, card, new_card, self.caller);
    }
    async function finalize_decrypt_turn_p1(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == 14u8);
        assert(game.player1 == caller);
        assert(!is_player1(game.players_out));

        let next_state: u8 = !is_player2(game.players_out) ? 15u8 : 16u8;

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            deck: game.deck,
            state: next_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_folded,
            last_bet: 0u8,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: game.last_raise_size,
        };
        
        Mapping::set(cards, game_id, new_card);
        Mapping::set(games, game_id, new_game);
    }
    async transition decrypt_turn_p2(game_id: u32, d: u128, n: u128, card: Cards) -> Future {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: card.flop,
            turn: zk_sra_encryption.aleo/decrypt_card(d, n, card.turn),
            river: card.river,
        };
        return finalize_decrypt_turn_p2(game_id, card, new_card, self.caller);
    }
    async function finalize_decrypt_turn_p2(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == 15u8);
        assert(game.player2 == caller);
        assert(!is_player2(game.players_out));

        let chip: Chips = Mapping::get(chips, game_id);
        let is_p1_inactive: bool = chip.player1 == 0u16 || is_player1(game.players_folded);
        let is_p2_inactive: bool = chip.player2 == 0u16 || is_player2(game.players_folded);
        let is_p3_inactive: bool = chip.player3 == 0u16 || is_player3(game.players_folded);

        // Skip betting if only one active or all are all-in
        let should_skip_betting: bool = 
            (!is_p1_inactive as u8 + !is_p2_inactive as u8 + !is_p3_inactive as u8) <= 1u8 || 
            (chip.player1 == 0u16 && chip.player2 == 0u16 && chip.player3 == 0u16);

        // Always go to P3 if not busted, otherwise determine betting state
        let new_state: u8 = 
            !is_player3(game.players_out) ? 16u8 : // P3's turn to decrypt
                      should_skip_betting ? 20u8 : // Skip to river decrypt
           is_player1(game.dealer_button) ? 
                         (!is_p2_inactive ? 18u8 : !is_p3_inactive ? 19u8 : 17u8) :
           is_player2(game.dealer_button) ? (!is_p3_inactive ? 19u8 : !is_p1_inactive ? 17u8 : 18u8) :
                                        (!is_p1_inactive ? 17u8 : !is_p2_inactive ? 18u8 : 19u8);

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            deck: game.deck,
            state: new_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_folded,
            last_bet: 0u8,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: game.last_raise_size,
        };
        
        Mapping::set(cards, game_id, new_card);
        Mapping::set(games, game_id, new_game);
    }
    async transition decrypt_turn_p3(game_id: u32, d: u128, n: u128, card: Cards) -> Future {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: card.flop,
            turn: zk_sra_encryption.aleo/decrypt_card(d, n, card.turn),
            river: card.river,
        };
        return finalize_decrypt_turn_p3(game_id, card, new_card, self.caller);
    }
    async function finalize_decrypt_turn_p3(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == 16u8);
        assert(game.player3 == caller);
        assert(!is_player3(game.players_out));

        let chip: Chips = Mapping::get(chips, game_id);
        let is_p1_inactive: bool = chip.player1 == 0u16 || is_player1(game.players_folded);
        let is_p2_inactive: bool = chip.player2 == 0u16 || is_player2(game.players_folded);
        let is_p3_inactive: bool = chip.player3 == 0u16 || is_player3(game.players_folded);

        // Skip betting if only one active or all are all-in
        let should_skip_betting: bool = 
            (!is_p1_inactive as u8 + !is_p2_inactive as u8 + !is_p3_inactive as u8) <= 1u8 || 
            (chip.player1 == 0u16 && chip.player2 == 0u16 && chip.player3 == 0u16);

        // Determine first bettor based on dealer button position
        let next_state: u8 = 
               should_skip_betting ? 20u8 :
            is_player1(game.dealer_button) ? (!is_p2_inactive ? 18u8 : !is_p3_inactive ? 19u8 : 17u8) :
            is_player2(game.dealer_button) ? (!is_p3_inactive ? 19u8 : !is_p1_inactive ? 17u8 : 18u8) :
                                             (!is_p1_inactive ? 17u8 : !is_p2_inactive ? 18u8 : 19u8);

        // Create new game state
        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            deck: game.deck,
            state: next_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_folded,
            last_bet: 0u8, // Reset last_bet for new betting round
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: 0u16, // Reset at start of new betting round
        };

        Mapping::set(cards, game_id, new_card);
        Mapping::set(games, game_id, new_game);
    }
    async transition decrypt_river_p1(game_id: u32, d: u128, n: u128, card: Cards) -> Future {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: card.flop,
            turn: card.turn,
            river: zk_sra_encryption.aleo/decrypt_card(d, n, card.river),
        };
        return finalize_decrypt_river_p1(game_id, card, new_card, self.caller);
    }
    async function finalize_decrypt_river_p1(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == 20u8);
        assert(game.player1 == caller);
        assert(!is_player1(game.players_out));

        let next_state: u8 = !is_player2(game.players_out) ? 21u8 : 22u8;

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            deck: game.deck,
            state: next_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_folded,
            last_bet: 0u8,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: game.last_raise_size,
        };
        
        Mapping::set(cards, game_id, new_card);
        Mapping::set(games, game_id, new_game);
    }
    async transition decrypt_river_p2(game_id: u32, d: u128, n: u128, card: Cards) -> Future {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: card.flop,
            turn: card.turn,
            river: zk_sra_encryption.aleo/decrypt_card(d, n, card.river),
        };
        return finalize_decrypt_river_p2(game_id, card, new_card, self.caller);
    }
    async function finalize_decrypt_river_p2(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == 21u8);
        assert(game.player2 == caller);
        assert(!is_player2(game.players_out));

        let chip: Chips = Mapping::get(chips, game_id);
        let is_p1_inactive: bool = chip.player1 == 0u16 || is_player1(game.players_folded);
        let is_p2_inactive: bool = chip.player2 == 0u16 || is_player2(game.players_folded);
        let is_p3_inactive: bool = chip.player3 == 0u16 || is_player3(game.players_folded);

        // Skip betting if only one active or all are all-in
        let should_skip_betting: bool = 
            (!is_p1_inactive as u8 + !is_p2_inactive as u8 + !is_p3_inactive as u8) <= 1u8 || 
            (chip.player1 == 0u16 && chip.player2 == 0u16 && chip.player3 == 0u16);

        // Always go to P3 if not busted, otherwise determine betting state
        let new_state: u8 = 
            !is_player3(game.players_out) ? 22u8 : // P3's turn to decrypt
                      should_skip_betting ? 26u8 : // Skip to showdown
           is_player1(game.dealer_button) ? 
                         (!is_p2_inactive ? 24u8 : !is_p3_inactive ? 25u8 : 23u8) :
           is_player2(game.dealer_button) ? (!is_p3_inactive ? 25u8 : !is_p1_inactive ? 23u8 : 24u8) :
                                        (!is_p1_inactive ? 23u8 : !is_p2_inactive ? 24u8 : 25u8);

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            deck: game.deck,
            state: new_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_folded,
            last_bet: 0u8,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: game.last_raise_size,
        };
        
        Mapping::set(cards, game_id, new_card);
        Mapping::set(games, game_id, new_game);
    }
    async transition decrypt_river_p3(game_id: u32, d: u128, n: u128, card: Cards) -> Future {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: card.flop,
            turn: card.turn,
            river: zk_sra_encryption.aleo/decrypt_card(d, n, card.river),
        };
        return finalize_decrypt_river_p3(game_id, card, new_card, self.caller);
    }
    async function finalize_decrypt_river_p3(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == 22u8);
        assert(game.player3 == caller);
        assert(!is_player3(game.players_out));

        let chip: Chips = Mapping::get(chips, game_id);
        let is_p1_inactive: bool = chip.player1 == 0u16 || is_player1(game.players_folded);
        let is_p2_inactive: bool = chip.player2 == 0u16 || is_player2(game.players_folded);
        let is_p3_inactive: bool = chip.player3 == 0u16 || is_player3(game.players_folded);

        // Skip betting if only one active or all are all-in
        let should_skip_betting: bool = 
            (!is_p1_inactive as u8 + !is_p2_inactive as u8 + !is_p3_inactive as u8) <= 1u8 || 
            (chip.player1 == 0u16 && chip.player2 == 0u16 && chip.player3 == 0u16);

        // Determine first bettor based on dealer button position
        let next_state: u8 = 
               should_skip_betting ? 26u8 :
            is_player1(game.dealer_button) ? (!is_p2_inactive ? 24u8 : !is_p3_inactive ? 25u8 : 23u8) :
            is_player2(game.dealer_button) ? (!is_p3_inactive ? 25u8 : !is_p1_inactive ? 23u8 : 24u8) :
                                         (!is_p1_inactive ? 23u8 : !is_p2_inactive ? 24u8 : 25u8);

        // Create new game state
        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            deck: game.deck,
            state: next_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_folded,
            last_bet: 0u8, // Reset last_bet for new betting round
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: 0u16, // Reset at start of new betting round
        };

        Mapping::set(cards, game_id, new_card);
        Mapping::set(games, game_id, new_game);
    }
}
