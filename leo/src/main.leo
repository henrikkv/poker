import commutative_encryption.aleo;

program mental_poker.aleo {

    mapping games: u32 => Game;
    mapping decks: u32 => [[group; 26]; 2];
    mapping chips: u32 => Chips;
    mapping cards: u32 => Cards;
    mapping revealed_cards: u32 => RevealedCards;

    const p2_join: u8 = 0u8;
    const p3_join: u8 = 1u8;
    const p1_dec_hand: u8 = 2u8;
    const p2_dec_hand: u8 = 3u8;
    const p3_dec_hand: u8 = 4u8;

    const p1_bet_pre: u8 = 5u8;
    const p2_bet_pre: u8 = 6u8;
    const p3_bet_pre: u8 = 7u8;

    const p1_dec_flop: u8 = 8u8;
    const p2_dec_flop: u8 = 9u8;
    const p3_dec_flop: u8 = 10u8;

    const p1_bet_flop: u8 = 11u8;
    const p2_bet_flop: u8 = 12u8;
    const p3_bet_flop: u8 = 13u8;

    const p1_dec_turn: u8 = 14u8;
    const p2_dec_turn: u8 = 15u8;
    const p3_dec_turn: u8 = 16u8;

    const p1_bet_turn: u8 = 17u8;
    const p2_bet_turn: u8 = 18u8;
    const p3_bet_turn: u8 = 19u8;

    const p1_dec_river: u8 = 20u8;
    const p2_dec_river: u8 = 21u8;
    const p3_dec_river: u8 = 22u8;

    const p1_bet_river: u8 = 23u8;
    const p2_bet_river: u8 = 24u8;
    const p3_bet_river: u8 = 25u8;

    const p1_showdown: u8 = 26u8;
    const p2_showdown: u8 = 27u8;
    const p3_showdown: u8 = 28u8;

    const compare: u8 = 29u8;

    const p1_new_shuffle: u8 = 30u8;
    const p2_new_shuffle: u8 = 31u8;
    const p2_shuffle: u8 = 32u8;
    const p3_shuffle: u8 = 33u8;

    const p1_claim: u8 = 34u8;
    const p2_claim: u8 = 35u8;
    const p3_claim: u8 = 35u8;
    
    struct Game {
        player1: address,
        player2: address,
        player3: address,
        buy_in: u64,
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

        // 36: Compare hands and determine winner

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
        player1: [group; 2],
        player2: [group; 2],
        player3: [group; 2],
        flop: [group; 3],
        turn: group,
        river: group,
    }
    struct RevealedCards {
        player1: [u8; 2],
        player2: [u8; 2],
        player3: [u8; 2],
        flop: [u8; 3],
        turn: u8,
        river: u8,
    }
    record Keys {
        owner: address,
        secret: scalar,
        secret_inv: scalar,
    }
    async transition create_game(game_id: u32, shuffled_deck: [[group; 26]; 2], secret: scalar, secret_inv: scalar) -> (Keys, Future) {
        let deck: [[group; 26]; 2] = commutative_encryption.aleo/initialize_deck();

        commutative_encryption.aleo/verify_permutation(deck, shuffled_deck);

        let deck_encrypted: [[group; 26]; 2] = commutative_encryption.aleo/encrypt_deck(secret, shuffled_deck);

        // Check if decryption key is correct
        assert_eq(commutative_encryption.aleo/decrypt_card(secret_inv, deck_encrypted[0][0]), shuffled_deck[0][0]);
        let keys: Keys = Keys {
            owner: self.caller,
            secret: secret,
            secret_inv: secret_inv,
        };
        return (keys, finalize_new_game(game_id, deck_encrypted, self.caller));
    }
    async function finalize_new_game(game_id: u32, deck: [[group; 26]; 2], caller: address) {
        let game: Game = Game {
            player1: caller,
            player2: 0u128 as address,
            player3: 0u128 as address,
            buy_in: 10u64,
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
        Mapping::set(decks, game_id, deck);
    }
    async transition join_game(game_id: u32, deck: [[group; 26]; 2], shuffled_deck: [[group; 26]; 2], secret: scalar, secret_inv: scalar) -> (Keys, Future) {

        commutative_encryption.aleo/verify_permutation(deck, shuffled_deck);

        let deck_encrypted: [[group; 26]; 2] = commutative_encryption.aleo/encrypt_deck(secret, shuffled_deck);

        // Check if decryption key is correct
        assert_eq(commutative_encryption.aleo/decrypt_card(secret_inv, deck_encrypted[0][0]), shuffled_deck[0][0]);
        let keys: Keys = Keys {
            owner: self.caller,
            secret: secret,
            secret_inv: secret_inv,
        };
        return (keys, finalize_join_game(game_id, deck, deck_encrypted, self.caller));
    }
    async function finalize_join_game(game_id: u32, deck: [[group; 26]; 2], new_deck: [[group; 26]; 2], caller: address) {
        let game: Game = Mapping::get(games, game_id);
        let current_deck: [[group; 26]; 2] = Mapping::get(decks, game_id);
        assert(current_deck == deck);

        // Determine if this is player2 or player3 joining
        let player2_joining: bool = game.state == p2_join;
        assert(game.state == p2_join || game.state == p3_join);

        let new_game: Game = Game {
            player1: game.player1,
            player2: player2_joining ? caller : game.player2,
            player3: !player2_joining ? caller : 0u128 as address,
            buy_in: game.buy_in,
            state: player2_joining ? p3_join : p1_dec_hand,
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
        Mapping::set(decks, game_id, new_deck);
        
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
                player1: [new_deck[0u8][0u8], new_deck[0u8][3u8]],
                player2: [new_deck[0u8][1u8], new_deck[0u8][4u8]],
                player3: [new_deck[0u8][2u8], new_deck[0u8][5u8]],
                flop: [new_deck[0u8][7u8], new_deck[0u8][8u8], new_deck[0u8][9u8]],
                turn: new_deck[0u8][11u8],
                river: new_deck[0u8][13u8],
            };

            let revealed: RevealedCards = RevealedCards {
                player1: [255u8, 255u8],
                player2: [255u8, 255u8],
                player3: [255u8, 255u8],
                flop: [255u8, 255u8, 255u8],
                turn: 255u8,
                river: 255u8,
            };

            Mapping::set(chips, game_id, chip);
            Mapping::set(cards, game_id, card);
            Mapping::set(revealed_cards, game_id, revealed);
        }
    }
    async transition bet(game_id: u32, amount: u16) -> Future {
        return finalize_bet(game_id, amount, self.caller);
    }
    async function finalize_bet(game_id: u32, amount: u16, caller: address) {
        let game: Game = Mapping::get(games, game_id);
        let chip: Chips = Mapping::get(chips, game_id);

        let is_valid_state: bool =
            (game.state == p1_bet_pre && game.player1 == caller) ||
            (game.state == p2_bet_pre && game.player2 == caller) ||
            (game.state == p3_bet_pre && game.player3 == caller) ||
            (game.state == p1_bet_flop && game.player1 == caller) ||
            (game.state == p2_bet_flop && game.player2 == caller) ||
            (game.state == p3_bet_flop && game.player3 == caller) ||
            (game.state == p1_bet_turn && game.player1 == caller) ||
            (game.state == p2_bet_turn && game.player2 == caller) ||
            (game.state == p3_bet_turn && game.player3 == caller) ||
            (game.state == p1_bet_river && game.player1 == caller) ||
            (game.state == p2_bet_river && game.player2 == caller) ||
            (game.state == p3_bet_river && game.player3 == caller);
        assert(is_valid_state);

        let (current_chips, current_bet): (u16, u16) =
            (game.state == p1_bet_pre || game.state == p1_bet_flop || game.state == p1_bet_turn || game.state == p1_bet_river) ?
                (chip.player1, chip.player1_bet) :
                (game.state == p2_bet_pre || game.state == p2_bet_flop || game.state == p2_bet_turn || game.state == p2_bet_river) ?
                    (chip.player2, chip.player2_bet) :
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
                ((game.state == p1_bet_pre || game.state == p1_bet_flop || game.state == p1_bet_turn || game.state == p1_bet_river) ? player1() :
                 (game.state == p2_bet_pre || game.state == p2_bet_flop || game.state == p2_bet_turn || game.state == p2_bet_river) ? player2() :
                 player3()) :
                game.last_bet;

        let is_current_last_bet: bool =
            ((game.state == p1_bet_pre || game.state == p1_bet_flop || game.state == p1_bet_turn || game.state == p1_bet_river) && is_player1(game.last_bet)) ||
            ((game.state == p2_bet_pre || game.state == p2_bet_flop || game.state == p2_bet_turn || game.state == p2_bet_river) && is_player2(game.last_bet)) ||
            ((game.state == p3_bet_pre || game.state == p3_bet_flop || game.state == p3_bet_turn || game.state == p3_bet_river) && is_player3(game.last_bet));

        let p1_matched: bool = is_p1_inactive ||
            ((game.state == p1_bet_pre || game.state == p1_bet_flop || game.state == p1_bet_turn || game.state == p1_bet_river) ? new_amount == highest_bet : chip.player1_bet == highest_bet);
        let p2_matched: bool = is_p2_inactive ||
            ((game.state == p2_bet_pre || game.state == p2_bet_flop || game.state == p2_bet_turn || game.state == p2_bet_river) ? new_amount == highest_bet : chip.player2_bet == highest_bet);
        let p3_matched: bool = is_p3_inactive ||
            ((game.state == p3_bet_pre || game.state == p3_bet_flop || game.state == p3_bet_turn || game.state == p3_bet_river) ? new_amount == highest_bet : chip.player3_bet == highest_bet);

        let should_end_betting: bool = 
            post_action_active_count <= 1u8 || // Everyone all-in/folded
            (new_amount >= highest_bet &&      // Current player at least called AND
             p1_matched && p2_matched && p3_matched && // Everyone has matched the highest bet
             (is_current_last_bet ||  // Action has come back to the last bettor
              game.last_bet == 0u8 || // Or no previous action
              is_short_allin ||  // Or was a short all-in
              // Or was last to act before short all-in
              (has_short_allin && !reopens_action &&
               is_current_last_bet)));

        let next_state: u8 =
            should_end_betting ?
                (game.state <= p3_bet_pre) ? (is_player1(game.players_out) ? p2_dec_flop : p1_dec_flop) :     // Move to flop decrypt
                (game.state <= p3_bet_flop) ? (is_player1(game.players_out) ? p2_dec_turn : p1_dec_turn) :   // Move to turn decrypt
                (game.state <= p3_bet_turn) ? (is_player1(game.players_out) ? p2_dec_river : p1_dec_river) :   // Move to river decrypt
                // For showdown, check who starts based on who's still in
                is_player1(game.players_folded) ?
                    (is_player2(game.players_folded) ? p3_showdown : p2_showdown) :  // P3 or P2 starts
                p1_showdown :                                                  // P1 starts
            // Otherwise move to next active player
            (game.state == p1_bet_pre) ? (is_p2_inactive ? p3_bet_pre : p2_bet_pre) :
            (game.state == p2_bet_pre) ? (is_p3_inactive ? p1_bet_pre : p3_bet_pre) :
            (game.state == p3_bet_pre) ? (is_p1_inactive ? p2_bet_pre : p1_bet_pre) :
            (game.state == p1_bet_flop) ? (is_p2_inactive ? p3_bet_flop : p2_bet_flop) :
            (game.state == p2_bet_flop) ? (is_p3_inactive ? p1_bet_flop : p3_bet_flop) :
            (game.state == p3_bet_flop) ? (is_p1_inactive ? p2_bet_flop : p1_bet_flop) :
            (game.state == p1_bet_turn) ? (is_p2_inactive ? p3_bet_turn : p2_bet_turn) :
            (game.state == p2_bet_turn) ? (is_p3_inactive ? p1_bet_turn : p3_bet_turn) :
            (game.state == p3_bet_turn) ? (is_p1_inactive ? p2_bet_turn : p1_bet_turn) :
            (game.state == p1_bet_river) ? (is_p2_inactive ? p3_bet_river : p2_bet_river) :
            (game.state == p2_bet_river) ? (is_p3_inactive ? p1_bet_river : p3_bet_river) :
            (game.state == p3_bet_river) ? (is_p1_inactive ? p2_bet_river : p1_bet_river) : 0u8;

        // 8. UPDATE LAST BETTOR
        new_last_bet =
            (new_amount > highest_bet && !is_going_allin) ?
                ((game.state == p1_bet_pre || game.state == p1_bet_flop || game.state == p1_bet_turn || game.state == p1_bet_river) ? player1() :
                 (game.state == p2_bet_pre || game.state == p2_bet_flop || game.state == p2_bet_turn || game.state == p2_bet_river) ? player2() :
                 player3()) :
                game.last_bet;

        let pot_size: u16 = chip.player1_bet + chip.player2_bet + chip.player3_bet + amount;
        let new_chip: Chips = Chips {
            // Update current player's stack and bet
            player1: (game.state == p1_bet_pre || game.state == p1_bet_flop || game.state == p1_bet_turn || game.state == p1_bet_river) ?
                new_remaining : chip.player1,
            player2: (game.state == p2_bet_pre || game.state == p2_bet_flop || game.state == p2_bet_turn || game.state == p2_bet_river) ?
                new_remaining : chip.player2,
            player3: (game.state == p3_bet_pre || game.state == p3_bet_flop || game.state == p3_bet_turn || game.state == p3_bet_river) ?
                new_remaining : chip.player3,
            player1_bet: (game.state == p1_bet_pre || game.state == p1_bet_flop || game.state == p1_bet_turn || game.state == p1_bet_river) ?
                new_amount : chip.player1_bet,
            player2_bet: (game.state == p2_bet_pre || game.state == p2_bet_flop || game.state == p2_bet_turn || game.state == p2_bet_river) ?
                new_amount : chip.player2_bet,
            player3_bet: (game.state == p3_bet_pre || game.state == p3_bet_flop || game.state == p3_bet_turn || game.state == p3_bet_river) ?
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
    async transition decrypt_hands_p1(game_id: u32, card: Cards, keys: Keys) -> (Keys, Future) {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: [
                commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player2[0u8]),
                commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player2[1u8])
            ],
            player3: [
                commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player3[0u8]),
                commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player3[1u8])
            ],
            flop: card.flop,
            turn: card.turn,
            river: card.river,
        };
        return (keys, finalize_decrypt_hands_p1(game_id, card, new_card, self.caller));
    }
    async function finalize_decrypt_hands_p1(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == p1_dec_hand);
        assert(game.player1 == caller);
        if (is_player2(game.players_out)) {
            let new_game: Game = Game {
                player1: game.player1,
                player2: game.player2,
                player3: game.player3,
                buy_in: game.buy_in,
                state: p1_bet_pre,
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
                state: p2_dec_hand,
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
    async transition decrypt_hands_p2(game_id: u32, card: Cards, keys: Keys) -> (Keys, Future) {
        let new_card: Cards = Cards {
            player1: [
                commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player1[0u8]),
                commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player1[1u8])
            ],
            player2: card.player2,
            player3: [
                commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player3[0u8]),
                commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player3[1u8])
            ],
            flop: card.flop,
            turn: card.turn,
            river: card.river,
        };
        return (keys, finalize_decrypt_hands_p2(game_id, card, new_card, self.caller));
    }
    async function finalize_decrypt_hands_p2(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == p2_dec_hand);
        assert(game.player2 == caller);

        // Set the cards mapping once
        Mapping::set(cards, game_id, new_card);

        // Calculate state and last_bet using ternary operators
        let new_state: u8 = is_player3(game.players_out) ?
            (is_player2(game.dealer_button) ? p1_bet_pre : p2_bet_pre) : p3_dec_hand;

        let new_last_bet: u8 = is_player3(game.players_out) ? 
            (is_player2(game.dealer_button) ? player2() : player1()) : game.last_bet;

        // Set the games mapping once
        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
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
    async transition decrypt_hands_p3(game_id: u32, card: Cards, keys: Keys) -> (Keys, Future) {
        let new_card: Cards = Cards {
            player1: [
                commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player1[0u8]),
                commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player1[1u8])
            ],
            player2: [
                commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player2[0u8]),
                commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player2[1u8])
            ],
            player3: card.player3,
            flop: card.flop,
            turn: card.turn,
            river: card.river,
        };
        return (keys, finalize_decrypt_hands_p3(game_id, card, new_card, self.caller));
    }
    async function finalize_decrypt_hands_p3(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == p3_dec_hand);
        assert(game.player3 == caller);

        // Set the cards mapping once
        Mapping::set(cards, game_id, new_card);

        // Calculate state and last_bet using nested ternary operators
        let new_state: u8 =
            is_player1(game.players_out) ?
                (is_player2(game.dealer_button) ? p3_bet_pre : p2_bet_pre) :
            is_player2(game.players_out) ?
                (is_player1(game.dealer_button) ? p3_bet_pre : p1_bet_pre) :
            is_player3(game.players_out) ?
                (is_player2(game.dealer_button) ? p1_bet_pre : p2_bet_pre) :
            is_player1(game.dealer_button) ? p3_bet_pre :
            is_player2(game.dealer_button) ? p1_bet_pre : p2_bet_pre;

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
    async transition decrypt_flop_p1(game_id: u32, card: Cards, keys: Keys) -> (Keys, Future) {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: [commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.flop[0u8]),
                   commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.flop[1u8]),
                   commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.flop[2u8])],
            turn: card.turn,
            river: card.river,
        };
        return (keys, finalize_decrypt_flop_p1(game_id, card, new_card, self.caller));
    }
    async function finalize_decrypt_flop_p1(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == p1_dec_flop);
        assert(game.player1 == caller);
        assert(!is_player1(game.players_out));

        let next_state: u8 = !is_player2(game.players_out) ? p2_dec_flop : p3_dec_flop;

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
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
    async transition decrypt_flop_p2(game_id: u32, card: Cards, keys: Keys) -> (Keys, Future) {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: [commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.flop[0u8]),
                   commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.flop[1u8]),
                   commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.flop[2u8])],
            turn: card.turn,
            river: card.river,
        };
        return (keys, finalize_decrypt_flop_p2(game_id, card, new_card, self.caller));
    }
    async function finalize_decrypt_flop_p2(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == p2_dec_flop);
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
            !is_player3(game.players_out) ? p3_dec_flop :
                      should_skip_betting ? p1_dec_turn :
           is_player1(game.dealer_button) ?
                         (!is_p2_inactive ? p2_bet_flop : !is_p3_inactive ? p3_bet_flop : p1_bet_flop) :
           is_player2(game.dealer_button) ? (!is_p3_inactive ? p3_bet_flop : !is_p1_inactive ? p1_bet_flop : p2_bet_flop) :
                                            (!is_p1_inactive ? p1_bet_flop : !is_p2_inactive ? p2_bet_flop : p3_bet_flop);

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
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
    async transition decrypt_flop_p3(game_id: u32, card: Cards, keys: Keys) -> (Keys, Future) {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: [commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.flop[0u8]),
                   commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.flop[1u8]),
                   commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.flop[2u8])],
            turn: card.turn,
            river: card.river,
        };

        let flop_u8: [u8; 3] = [
            commutative_encryption.aleo/to_u8(new_card.flop[0u8]),
            commutative_encryption.aleo/to_u8(new_card.flop[1u8]),
            commutative_encryption.aleo/to_u8(new_card.flop[2u8])
        ];

        return (keys, finalize_decrypt_flop_p3(game_id, card, new_card, self.caller, flop_u8));
    }
    async function finalize_decrypt_flop_p3(game_id: u32, card: Cards, new_card: Cards, caller: address, flop_u8: [u8; 3]) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == p3_dec_flop);
        assert(game.player3 == caller);
        assert(!is_player3(game.players_out));

        let revealed: RevealedCards = Mapping::get(revealed_cards, game_id);
        let new_revealed: RevealedCards = RevealedCards {
            player1: revealed.player1,
            player2: revealed.player2,
            player3: revealed.player3,
            flop: flop_u8,
            turn: revealed.turn,
            river: revealed.river,
        };
        Mapping::set(revealed_cards, game_id, new_revealed);

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
                       should_skip_betting ? p1_dec_turn :
            is_player1(game.dealer_button) ? (!is_p2_inactive ? p2_bet_flop : !is_p3_inactive ? p3_bet_flop : p1_bet_flop) :
            is_player2(game.dealer_button) ? (!is_p3_inactive ? p3_bet_flop : !is_p1_inactive ? p1_bet_flop : p2_bet_flop) :
                                             (!is_p1_inactive ? p1_bet_flop : !is_p2_inactive ? p2_bet_flop : p3_bet_flop);

        let new_last_bet: u8 = 
            is_player1(game.dealer_button) ? 
                (!is_p1_inactive ? player1() : !is_p3_inactive ? player3() : player2()) :
            is_player2(game.dealer_button) ? 
                (!is_p2_inactive ? player2() : !is_p1_inactive ? player1() : player3()) :
                (!is_p3_inactive ? player3() : !is_p2_inactive ? player2() : player1());

        // Create new game state
        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            state: next_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_folded,
            last_bet: new_last_bet,
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
            (game.state >= p1_bet_pre && game.state <= p3_bet_pre) ||
            (game.state >= p1_bet_flop && game.state <= p3_bet_flop) ||
            (game.state >= p1_bet_turn && game.state <= p3_bet_turn) ||
            (game.state >= p1_bet_river && game.state <= p3_bet_river);
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
                !is_player1(game.players_out) ? p1_new_shuffle :
                !is_player2(game.players_out) ? p2_new_shuffle :
                p2_shuffle;
            
            let new_game: Game = Game {
                player1: game.player1,
                player2: game.player2,
                player3: game.player3,
                buy_in: game.buy_in,
                state: next_shuffle_state,
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
            (game.state <= p3_bet_pre) ? p1_bet_pre :
            (game.state <= p3_bet_flop) ? p1_bet_flop :
            (game.state <= p3_bet_turn) ? p1_bet_turn :
            p1_bet_river;

        // If betting round ends, move to next phase
        let next_state: u8 =
            should_end_betting ?
                (game.state <= p3_bet_pre)  ? (is_player1(game.players_out) ? p2_dec_flop  : p1_dec_flop)  :
                (game.state <= p3_bet_flop) ? (is_player1(game.players_out) ? p2_dec_turn : p1_dec_turn) :
                (game.state <= p3_bet_turn) ? (is_player1(game.players_out) ? p2_dec_river : p1_dec_river) :
                                        is_player1(game.players_out) ? p2_showdown : p1_showdown  :
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
    async transition decrypt_turn_p1(game_id: u32, card: Cards, keys: Keys) -> (Keys, Future) {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: card.flop,
            turn: commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.turn),
            river: card.river,
        };
        return (keys, finalize_decrypt_turn_p1(game_id, card, new_card, self.caller));
    }
    async function finalize_decrypt_turn_p1(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == p1_dec_turn);
        assert(game.player1 == caller);
        assert(!is_player1(game.players_out));

        let next_state: u8 = !is_player2(game.players_out) ? p2_dec_turn : p3_dec_turn;

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
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
    async transition decrypt_turn_p2(game_id: u32, card: Cards, keys: Keys) -> (Keys, Future) {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: card.flop,
            turn: commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.turn),
            river: card.river,
        };
        return (keys, finalize_decrypt_turn_p2(game_id, card, new_card, self.caller));
    }
    async function finalize_decrypt_turn_p2(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == p2_dec_turn);
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
            !is_player3(game.players_out) ? p3_dec_turn :
                      should_skip_betting ? p1_dec_river :
           is_player1(game.dealer_button) ?
                         (!is_p2_inactive ? p2_bet_turn : !is_p3_inactive ? p3_bet_turn : p1_bet_turn) :
           is_player2(game.dealer_button) ? (!is_p3_inactive ? p3_bet_turn : !is_p1_inactive ? p1_bet_turn : p2_bet_turn) :
                                        (!is_p1_inactive ? p1_bet_turn : !is_p2_inactive ? p2_bet_turn : p3_bet_turn);

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
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
    async transition decrypt_turn_p3(game_id: u32, card: Cards, keys: Keys) -> (Keys, Future) {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: card.flop,
            turn: commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.turn),
            river: card.river,
        };

        let turn_u8: u8 = commutative_encryption.aleo/to_u8(new_card.turn);

        return (keys, finalize_decrypt_turn_p3(game_id, card, new_card, self.caller, turn_u8));
    }
    async function finalize_decrypt_turn_p3(game_id: u32, card: Cards, new_card: Cards, caller: address, turn_u8: u8) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == p3_dec_turn);
        assert(game.player3 == caller);
        assert(!is_player3(game.players_out));

        let revealed: RevealedCards = Mapping::get(revealed_cards, game_id);
        let new_revealed: RevealedCards = RevealedCards {
            player1: revealed.player1,
            player2: revealed.player2,
            player3: revealed.player3,
            flop: revealed.flop,
            turn: turn_u8,
            river: revealed.river,
        };
        Mapping::set(revealed_cards, game_id, new_revealed);

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
               should_skip_betting ? p1_dec_river :
            is_player1(game.dealer_button) ? (!is_p2_inactive ? p2_bet_turn : !is_p3_inactive ? p3_bet_turn : p1_bet_turn) :
            is_player2(game.dealer_button) ? (!is_p3_inactive ? p3_bet_turn : !is_p1_inactive ? p1_bet_turn : p2_bet_turn) :
                                         (!is_p1_inactive ? p1_bet_turn : !is_p2_inactive ? p2_bet_turn : p3_bet_turn);

        let new_last_bet: u8 = 
            is_player1(game.dealer_button) ? 
                (!is_p1_inactive ? player1() : !is_p3_inactive ? player3() : player2()) :
            is_player2(game.dealer_button) ? 
                (!is_p2_inactive ? player2() : !is_p1_inactive ? player1() : player3()) :
                (!is_p3_inactive ? player3() : !is_p2_inactive ? player2() : player1());

        // Create new game state
        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            state: next_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_folded,
            last_bet: new_last_bet,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: 0u16, // Reset at start of new betting round
        };

        Mapping::set(cards, game_id, new_card);
        Mapping::set(games, game_id, new_game);
    }
    async transition decrypt_river_p1(game_id: u32, card: Cards, keys: Keys) -> (Keys, Future) {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: card.flop,
            turn: card.turn,
            river: commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.river),
        };
        return (keys, finalize_decrypt_river_p1(game_id, card, new_card, self.caller));
    }
    async function finalize_decrypt_river_p1(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == p1_dec_river);
        assert(game.player1 == caller);
        assert(!is_player1(game.players_out));

        let next_state: u8 = !is_player2(game.players_out) ? p2_dec_river : p3_dec_river;

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
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
    async transition decrypt_river_p2(game_id: u32, card: Cards, keys: Keys) -> (Keys, Future) {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: card.flop,
            turn: card.turn,
            river: commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.river),
        };
        return (keys, finalize_decrypt_river_p2(game_id, card, new_card, self.caller));
    }
    async function finalize_decrypt_river_p2(game_id: u32, card: Cards, new_card: Cards, caller: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == p2_dec_river);
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
            !is_player3(game.players_out) ? p3_dec_river :
                      should_skip_betting ? p1_showdown :
           is_player1(game.dealer_button) ?
                         (!is_p2_inactive ? p2_bet_river : !is_p3_inactive ? p3_bet_river : p1_bet_river) :
           is_player2(game.dealer_button) ? (!is_p3_inactive ? p3_bet_river : !is_p1_inactive ? p1_bet_river : p2_bet_river) :
                                        (!is_p1_inactive ? p1_bet_river : !is_p2_inactive ? p2_bet_river : p3_bet_river);

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
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
    async transition decrypt_river_p3(game_id: u32, card: Cards, keys: Keys) -> (Keys, Future) {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: card.player3,
            flop: card.flop,
            turn: card.turn,
            river: commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.river),
        };

        let river_u8: u8 = commutative_encryption.aleo/to_u8(new_card.river);

        return (keys, finalize_decrypt_river_p3(game_id, card, new_card, self.caller, river_u8));
    }
    async function finalize_decrypt_river_p3(game_id: u32, card: Cards, new_card: Cards, caller: address, river_u8: u8) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == p3_dec_river);
        assert(game.player3 == caller);
        assert(!is_player3(game.players_out));

        let revealed: RevealedCards = Mapping::get(revealed_cards, game_id);
        let new_revealed: RevealedCards = RevealedCards {
            player1: revealed.player1,
            player2: revealed.player2,
            player3: revealed.player3,
            flop: revealed.flop,
            turn: revealed.turn,
            river: river_u8,
        };
        Mapping::set(revealed_cards, game_id, new_revealed);

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
               should_skip_betting ? p1_showdown :
            is_player1(game.dealer_button) ? (!is_p2_inactive ? p2_bet_river : !is_p3_inactive ? p3_bet_river : p1_bet_river) :
            is_player2(game.dealer_button) ? (!is_p3_inactive ? p3_bet_river : !is_p1_inactive ? p1_bet_river : p2_bet_river) :
                                             (!is_p1_inactive ? p1_bet_river : !is_p2_inactive ? p2_bet_river : p3_bet_river);

        let new_last_bet: u8 = 
            is_player1(game.dealer_button) ? 
                (!is_p1_inactive ? player1() : !is_p3_inactive ? player3() : player2()) :
            is_player2(game.dealer_button) ? 
                (!is_p2_inactive ? player2() : !is_p1_inactive ? player1() : player3()) :
                (!is_p3_inactive ? player3() : !is_p2_inactive ? player2() : player1());

        // Create new game state
        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            state: next_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_folded,
            last_bet: new_last_bet,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: 0u16, // Reset at start of new betting round
        };

        Mapping::set(cards, game_id, new_card);
        Mapping::set(games, game_id, new_game);
    }
    async transition showdown_p1(game_id: u32, card: Cards, keys: Keys) -> (Keys, Future) {
        let new_card: Cards = Cards {
            player1: [commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player1[0u8]),
                     commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player1[1u8])],
            player2: card.player2,
            player3: card.player3,
            flop: card.flop,
            turn: card.turn,
            river: card.river,
        };

        let p1_cards: [u8; 2] = [
            commutative_encryption.aleo/to_u8(new_card.player1[0u8]),
            commutative_encryption.aleo/to_u8(new_card.player1[1u8])
        ];

        return (keys, finalize_showdown_p1(game_id, card, new_card, self.caller, p1_cards));
    }

    async function finalize_showdown_p1(game_id: u32, card: Cards, new_card: Cards, caller: address, p1_cards: [u8; 2]) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == p1_showdown);
        assert(game.player1 == caller);

        let revealed: RevealedCards = Mapping::get(revealed_cards, game_id);
        let new_revealed: RevealedCards = RevealedCards {
            player1: p1_cards,
            player2: revealed.player2,
            player3: revealed.player3,
            flop: revealed.flop,
            turn: revealed.turn,
            river: revealed.river,
        };
        Mapping::set(revealed_cards, game_id, new_revealed);

        let p2_active: bool = !is_player2(game.players_out) && !is_player2(game.players_folded);
        let p3_active: bool = !is_player3(game.players_out) && !is_player3(game.players_folded);

        let new_state: u8 =
            p2_active ? p2_showdown :
            p3_active ? p3_showdown :
            compare;

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            state: new_state,
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

    async transition showdown_p2(game_id: u32, card: Cards, keys: Keys) -> (Keys, Future) {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: [commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player2[0u8]),
                     commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player2[1u8])],
            player3: card.player3,
            flop: card.flop,
            turn: card.turn,
            river: card.river,
        };

        let p1_cards: [u8; 2] = [
            commutative_encryption.aleo/to_u8(new_card.player1[0u8]),
            commutative_encryption.aleo/to_u8(new_card.player1[1u8])
        ];
        let p2_cards: [u8; 2] = [
            commutative_encryption.aleo/to_u8(new_card.player2[0u8]),
            commutative_encryption.aleo/to_u8(new_card.player2[1u8])
        ];

        return (keys, finalize_showdown_p2(game_id, card, new_card, self.caller, p1_cards, p2_cards));
    }

    async function finalize_showdown_p2(game_id: u32, card: Cards, new_card: Cards, caller: address, p1_cards: [u8; 2], p2_cards: [u8; 2]) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == p2_showdown);
        assert(game.player2 == caller);

        let revealed: RevealedCards = Mapping::get(revealed_cards, game_id);
        let new_revealed: RevealedCards = RevealedCards {
            player1: p1_cards,
            player2: p2_cards,
            player3: revealed.player3,
            flop: revealed.flop,
            turn: revealed.turn,
            river: revealed.river,
        };
        Mapping::set(revealed_cards, game_id, new_revealed);

        let p3_active: bool = !is_player3(game.players_out) && !is_player3(game.players_folded);

        let new_state: u8 = p3_active ? p3_showdown : compare;

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            state: new_state,
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

    async transition showdown_p3(game_id: u32, card: Cards, keys: Keys) -> (Keys, Future) {
        let new_card: Cards = Cards {
            player1: card.player1,
            player2: card.player2,
            player3: [commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player3[0u8]),
                     commutative_encryption.aleo/decrypt_card(keys.secret_inv, card.player3[1u8])],
            flop: card.flop,
            turn: card.turn,
            river: card.river,
        };

        let p1_cards: [u8; 2] = [
            commutative_encryption.aleo/to_u8(new_card.player1[0u8]),
            commutative_encryption.aleo/to_u8(new_card.player1[1u8])
        ];
        let p2_cards: [u8; 2] = [
            commutative_encryption.aleo/to_u8(new_card.player2[0u8]),
            commutative_encryption.aleo/to_u8(new_card.player2[1u8])
        ];
        let p3_cards: [u8; 2] = [
            commutative_encryption.aleo/to_u8(new_card.player3[0u8]),
            commutative_encryption.aleo/to_u8(new_card.player3[1u8])
        ];

        return (keys, finalize_showdown_p3(game_id, card, new_card, self.caller, p1_cards, p2_cards, p3_cards));
    }

    async function finalize_showdown_p3(game_id: u32, card: Cards, new_card: Cards, caller: address, p1_cards: [u8; 2], p2_cards: [u8; 2], p3_cards: [u8; 2]) {
        let old_card: Cards = Mapping::get(cards, game_id);
        assert(card == old_card);
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == p3_showdown);
        assert(game.player3 == caller);

        let revealed: RevealedCards = Mapping::get(revealed_cards, game_id);
        let new_revealed: RevealedCards = RevealedCards {
            player1: p1_cards,
            player2: p2_cards,
            player3: p3_cards,
            flop: revealed.flop,
            turn: revealed.turn,
            river: revealed.river,
        };
        Mapping::set(revealed_cards, game_id, new_revealed);

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            state: compare,
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

    async transition compare_hands(game_id: u32) -> Future {
        return finalize_compare_hands(game_id, self.signer);
    }
    async function finalize_compare_hands(game_id: u32, signer: address) {
        let game: Game = Mapping::get(games, game_id);
        assert(game.state == compare);

        let is_valid_signer: bool =
            (is_player1(game.dealer_button) && game.player1 == signer) ||
            (is_player2(game.dealer_button) && game.player2 == signer) ||
            (is_player3(game.dealer_button) && game.player3 == signer);
        assert(is_valid_signer);

        let revealed: RevealedCards = Mapping::get(revealed_cards, game_id);
        let chip: Chips = Mapping::get(chips, game_id);

        let p1_active: bool = !is_player1(game.players_out) && !is_player1(game.players_folded);
        let p2_active: bool = !is_player2(game.players_out) && !is_player2(game.players_folded);
        let p3_active: bool = !is_player3(game.players_out) && !is_player3(game.players_folded);

        let cc1_0: u8 = revealed.flop[0u8];
        let cc2_0: u8 = revealed.flop[1u8];
        let cc3_0: u8 = revealed.flop[2u8];
        let cc4_0: u8 = revealed.turn;
        let cc5_0: u8 = revealed.river;

        // First pass
        let cc1_1: u8 = cc1_0 < cc2_0 ? cc1_0 : cc2_0;
        let cc2_1: u8 = cc1_0 < cc2_0 ? cc2_0 : cc1_0;
        let cc3_1: u8 = cc3_0;
        let cc4_1: u8 = cc4_0;
        let cc5_1: u8 = cc5_0;

        let cc1_2: u8 = cc1_1;
        let cc2_2: u8 = cc2_1 < cc3_1 ? cc2_1 : cc3_1;
        let cc3_2: u8 = cc2_1 < cc3_1 ? cc3_1 : cc2_1;
        let cc4_2: u8 = cc4_1;
        let cc5_2: u8 = cc5_1;

        let cc1_3: u8 = cc1_2;
        let cc2_3: u8 = cc2_2;
        let cc3_3: u8 = cc3_2 < cc4_2 ? cc3_2 : cc4_2;
        let cc4_3: u8 = cc3_2 < cc4_2 ? cc4_2 : cc3_2;
        let cc5_3: u8 = cc5_2;

        let cc1_4: u8 = cc1_3;
        let cc2_4: u8 = cc2_3;
        let cc3_4: u8 = cc3_3;
        let cc4_4: u8 = cc4_3 < cc5_3 ? cc4_3 : cc5_3;
        let cc5_4: u8 = cc4_3 < cc5_3 ? cc5_3 : cc4_3;

        // Second pass
        let cc1_5: u8 = cc1_4 < cc2_4 ? cc1_4 : cc2_4;
        let cc2_5: u8 = cc1_4 < cc2_4 ? cc2_4 : cc1_4;
        let cc3_5: u8 = cc3_4;
        let cc4_5: u8 = cc4_4;
        let cc5_5: u8 = cc5_4;

        let cc1_6: u8 = cc1_5;
        let cc2_6: u8 = cc2_5 < cc3_5 ? cc2_5 : cc3_5;
        let cc3_6: u8 = cc2_5 < cc3_5 ? cc3_5 : cc2_5;
        let cc4_6: u8 = cc4_5;
        let cc5_6: u8 = cc5_5;

        let cc1_7: u8 = cc1_6;
        let cc2_7: u8 = cc2_6;
        let cc3_7: u8 = cc3_6 < cc4_6 ? cc3_6 : cc4_6;
        let cc4_7: u8 = cc3_6 < cc4_6 ? cc4_6 : cc3_6;
        let cc5_7: u8 = cc5_6;

        let c1: u8 = cc1_7;
        let c2: u8 = cc2_7;
        let c3: u8 = cc3_7;
        let c4: u8 = cc4_7 < cc5_7 ? cc4_7 : cc5_7;
        let c5: u8 = cc4_7 < cc5_7 ? cc5_7 : cc4_7;

        let p1_h1: u8 = p1_active ? revealed.player1[0u8] : 0u8;
        let p1_h2: u8 = p1_active ? revealed.player1[1u8] : 0u8;

        let p1_tmp_c1: u8 = p1_h1 < c1 ? p1_h1 : c1;
        let p1_tmp_c2: u8 = p1_h1 < c1 ? c1 : p1_h1 < c2 ? p1_h1 : c2;
        let p1_tmp_c3: u8 = p1_h1 < c2 ? c2 : p1_h1 < c3 ? p1_h1 : c3;
        let p1_tmp_c4: u8 = p1_h1 < c3 ? c3 : p1_h1 < c4 ? p1_h1 : c4;
        let p1_tmp_c5: u8 = p1_h1 < c4 ? c4 : p1_h1 < c5 ? p1_h1 : c5;
        let p1_tmp_c6: u8 = p1_h1 < c5 ? c5 : p1_h1;

        let p1_c1: u8 = p1_h2 < p1_tmp_c1 ? p1_h2 : p1_tmp_c1;
        let p1_c2: u8 = p1_h2 < p1_tmp_c1 ? p1_tmp_c1 : p1_h2 < p1_tmp_c2 ? p1_h2 : p1_tmp_c2;
        let p1_c3: u8 = p1_h2 < p1_tmp_c2 ? p1_tmp_c2 : p1_h2 < p1_tmp_c3 ? p1_h2 : p1_tmp_c3;
        let p1_c4: u8 = p1_h2 < p1_tmp_c3 ? p1_tmp_c3 : p1_h2 < p1_tmp_c4 ? p1_h2 : p1_tmp_c4;
        let p1_c5: u8 = p1_h2 < p1_tmp_c4 ? p1_tmp_c4 : p1_h2 < p1_tmp_c5 ? p1_h2 : p1_tmp_c5;
        let p1_c6: u8 = p1_h2 < p1_tmp_c5 ? p1_tmp_c5 : p1_h2 < p1_tmp_c6 ? p1_h2 : p1_tmp_c6;
        let p1_c7: u8 = p1_h2 < p1_tmp_c6 ? p1_tmp_c6 : p1_h2;

        let p2_h1: u8 = p2_active ? revealed.player2[0u8] : 0u8;
        let p2_h2: u8 = p2_active ? revealed.player2[1u8] : 0u8;

        let p2_tmp_c1: u8 = p2_h1 < c1 ? p2_h1 : c1;
        let p2_tmp_c2: u8 = p2_h1 < c1 ? c1 : p2_h1 < c2 ? p2_h1 : c2;
        let p2_tmp_c3: u8 = p2_h1 < c2 ? c2 : p2_h1 < c3 ? p2_h1 : c3;
        let p2_tmp_c4: u8 = p2_h1 < c3 ? c3 : p2_h1 < c4 ? p2_h1 : c4;
        let p2_tmp_c5: u8 = p2_h1 < c4 ? c4 : p2_h1 < c5 ? p2_h1 : c5;
        let p2_tmp_c6: u8 = p2_h1 < c5 ? c5 : p2_h1;

        let p2_c1: u8 = p2_h2 < p2_tmp_c1 ? p2_h2 : p2_tmp_c1;
        let p2_c2: u8 = p2_h2 < p2_tmp_c1 ? p2_tmp_c1 : p2_h2 < p2_tmp_c2 ? p2_h2 : p2_tmp_c2;
        let p2_c3: u8 = p2_h2 < p2_tmp_c2 ? p2_tmp_c2 : p2_h2 < p2_tmp_c3 ? p2_h2 : p2_tmp_c3;
        let p2_c4: u8 = p2_h2 < p2_tmp_c3 ? p2_tmp_c3 : p2_h2 < p2_tmp_c4 ? p2_h2 : p2_tmp_c4;
        let p2_c5: u8 = p2_h2 < p2_tmp_c4 ? p2_tmp_c4 : p2_h2 < p2_tmp_c5 ? p2_h2 : p2_tmp_c5;
        let p2_c6: u8 = p2_h2 < p2_tmp_c5 ? p2_tmp_c5 : p2_h2 < p2_tmp_c6 ? p2_h2 : p2_tmp_c6;
        let p2_c7: u8 = p2_h2 < p2_tmp_c6 ? p2_tmp_c6 : p2_h2;

        let p3_h1: u8 = p3_active ? revealed.player3[0u8] : 0u8;
        let p3_h2: u8 = p3_active ? revealed.player3[1u8] : 0u8;

        let p3_tmp_c1: u8 = p3_h1 < c1 ? p3_h1 : c1;
        let p3_tmp_c2: u8 = p3_h1 < c1 ? c1 : p3_h1 < c2 ? p3_h1 : c2;
        let p3_tmp_c3: u8 = p3_h1 < c2 ? c2 : p3_h1 < c3 ? p3_h1 : c3;
        let p3_tmp_c4: u8 = p3_h1 < c3 ? c3 : p3_h1 < c4 ? p3_h1 : c4;
        let p3_tmp_c5: u8 = p3_h1 < c4 ? c4 : p3_h1 < c5 ? p3_h1 : c5;
        let p3_tmp_c6: u8 = p3_h1 < c5 ? c5 : p3_h1;

        let p3_c1: u8 = p3_h2 < p3_tmp_c1 ? p3_h2 : p3_tmp_c1;
        let p3_c2: u8 = p3_h2 < p3_tmp_c1 ? p3_tmp_c1 : p3_h2 < p3_tmp_c2 ? p3_h2 : p3_tmp_c2;
        let p3_c3: u8 = p3_h2 < p3_tmp_c2 ? p3_tmp_c2 : p3_h2 < p3_tmp_c3 ? p3_h2 : p3_tmp_c3;
        let p3_c4: u8 = p3_h2 < p3_tmp_c3 ? p3_tmp_c3 : p3_h2 < p3_tmp_c4 ? p3_h2 : p3_tmp_c4;
        let p3_c5: u8 = p3_h2 < p3_tmp_c4 ? p3_tmp_c4 : p3_h2 < p3_tmp_c5 ? p3_h2 : p3_tmp_c5;
        let p3_c6: u8 = p3_h2 < p3_tmp_c5 ? p3_tmp_c5 : p3_h2 < p3_tmp_c6 ? p3_h2 : p3_tmp_c6;
        let p3_c7: u8 = p3_h2 < p3_tmp_c6 ? p3_tmp_c6 : p3_h2;

        let winner: u8 =
            (p1_c7 >= p2_c7 && p1_c7 >= p3_c7) ? 1u8 :
            (p2_c7 >= p3_c7) ? 2u8 : 3u8;

        let pot: u16 = chip.player1_bet + chip.player2_bet + chip.player3_bet;
        
        let new_chip: Chips = Chips {
            player1: winner == 1u8 ? chip.player1 + pot : chip.player1,
            player2: winner == 2u8 ? chip.player2 + pot : chip.player2,
            player3: winner == 3u8 ? chip.player3 + pot : chip.player3,
            player1_bet: 0u16,
            player2_bet: 0u16,
            player3_bet: 0u16,
        };

        let new_players_out: u8 = (new_chip.player1 == 0u16 ? player1() : 0u8) |
                                  (new_chip.player2 == 0u16 ? player2() : 0u8) |
                                  (new_chip.player3 == 0u16 ? player3() : 0u8);

        if (new_players_out == 6u8) {
            // Player 1 wins the game
            Mapping::set(chips, game_id, new_chip);
            return;
        } else if (new_players_out == 5u8) {
            // Player 2 wins the game
            Mapping::set(chips, game_id, new_chip);
            return;
        } else if (new_players_out == 3u8) {
            // Player 3 wins the game
            Mapping::set(chips, game_id, new_chip);
            return;
        }

        let new_dealer_button: u8 =
            is_player1(game.dealer_button) ? player2() :
            is_player2(game.dealer_button) ? player3() : player1();

        let new_remaining_hands: u8 = game.remaining_hands - 1u8;
        let (new_sb, new_bb): (u16, u16) =
            new_remaining_hands == 0u8 ?
                (game.sb * 2u16, game.bb * 2u16) :
                (game.sb, game.bb);

        let next_state: u8 =
            !is_player1(new_players_out) ? p1_new_shuffle :
            !is_player2(new_players_out) ? p2_new_shuffle :
            p2_shuffle;

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            state: next_state,
            dealer_button: new_dealer_button,
            players_out: new_players_out,
            players_folded: new_players_out,
            last_bet: 0u8,
            sb: new_sb,
            bb: new_bb,
            remaining_hands: new_remaining_hands == 0u8 ? 10u8 : new_remaining_hands,
            hands_played: game.hands_played + 1u8,
            last_raise_size: 0u16,
        };

        Mapping::set(chips, game_id, new_chip);
        Mapping::set(games, game_id, new_game);
    }

    @noupgrade
    async constructor() {}
}
