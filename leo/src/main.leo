import commutative_encryption.aleo;
import credits.aleo;

program mental_poker.aleo {

    storage next_game_id: u32;

    mapping games: u32 => Game;
    mapping decks: u32 => [group; 52];
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
    const p3_claim: u8 = 36u8;

    const HAND_HIGH_CARD: u32 =      1 << 28u32;
    const HAND_PAIR: u32 =           2 << 28u32;
    const HAND_TWO_PAIR: u32 =       3 << 28u32;
    const HAND_TRIPS: u32 =          4 << 28u32;
    const HAND_STRAIGHT: u32 =       5 << 28u32;
    const HAND_FLUSH: u32 =          6 << 28u32;
    const HAND_FULL_HOUSE: u32 =     7 << 28u32;
    const HAND_QUADS: u32 =          8 << 28u32;
    const HAND_STRAIGHT_FLUSH: u32 = 9 << 28u32;

    struct Game {
        player1: address,
        player2: address,
        player3: address,
        buy_in: u64,
        password_hash: u128,
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

        // 29: Compare hands and determine winner

        // 30: Waiting for player1 to create a new deck and shuffle
        // 31: Waiting for player2 to create a new deck and shuffle
        // 32: Waiting for player2 to shuffle
        // 33: Waiting for player3 to shuffle

        // 34: Waiting for Player1 to claim prize
        // 35: Waiting for Player2 to claim prize
        // 36: Waiting for Player3 to claim prize

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
    async transition create_game(buy_in: u64, deck_shuffled: [group; 52], secret: scalar, secret_inv: scalar, password: u128) -> (Keys, Future) {
        let deck: [group; 52] = commutative_encryption.aleo/initialize_deck();
        commutative_encryption.aleo/verify_permutation(deck, deck_shuffled);

        let deck_enc: [group; 52] = commutative_encryption.aleo/encrypt_deck(secret, deck_shuffled);

        // Check if decryption key is correct
        assert_eq(commutative_encryption.aleo/decrypt_card(secret_inv, deck_enc[0]), deck_shuffled[0]);

        let password_hash: u128 = password == 0u128 ? 0u128 : BHP256::hash_to_u128(password);

        let signer: address = self.signer;
        let keys: Keys = Keys {
            owner: signer,
            secret: secret,
            secret_inv: secret_inv,
        };

        let transfer_future: Future = credits.aleo/transfer_public_as_signer(mental_poker.aleo, buy_in);

        return (keys, finalize_new_game(deck_enc, signer, buy_in, password_hash, transfer_future));
    }
    async function finalize_new_game(deck: [group; 52], signer: address, buy_in: u64, password_hash: u128, transfer_future: Future) {
        transfer_future.await();

        //let game_id: u32 = next_game_id.unwrap_or(0u32);
        //next_game_id = game_id + 1u32;
        let game_id: u32 = 1u32;

        let game: Game = Game {
            player1: signer,
            player2: 0u128 as address,
            player3: 0u128 as address,
            buy_in: buy_in,
            password_hash: password_hash,
            state: 0u8,
            dealer_button: player3(),
            players_out: 0u8,
            players_folded: 0u8,
            last_bet: 0u8,
            sb: 5u16,
            bb: 10u16,
            remaining_hands: 10u8, // Increase blinds every 10 hands
            hands_played: 0u8,
            last_raise_size: 0u16,
        };
        Mapping::set(games, game_id, game);
        Mapping::set(decks, game_id, deck);
    }
    async transition join_game(game_id: u32, buy_in: u64, deck: [group; 52], deck_shuffled: [group; 52], secret: scalar, secret_inv: scalar, password: u128) -> (Keys, Future) {
        commutative_encryption.aleo/verify_permutation(deck, deck_shuffled);

        let deck_enc: [group; 52] = commutative_encryption.aleo/encrypt_deck(secret, deck_shuffled);

        assert_eq(commutative_encryption.aleo/decrypt_card(secret_inv, deck_enc[0]), deck_shuffled[0]);

        let password_hash: u128 = password == 0u128 ? 0u128 : BHP256::hash_to_u128(password);

        let signer: address = self.signer;
        let keys: Keys = Keys {
            owner: signer,
            secret: secret,
            secret_inv: secret_inv,
        };

        let transfer_future: Future = credits.aleo/transfer_public_as_signer(mental_poker.aleo, buy_in);

        return (keys, finalize_join_game(game_id, deck, deck_enc, signer, buy_in, password_hash, transfer_future));
    }
    async function finalize_join_game(game_id: u32, deck: [group; 52], new_deck: [group; 52], signer: address, buy_in: u64, password_hash: u128, transfer_future: Future) {

        transfer_future.await();

        let game: Game = Mapping::get(games, game_id);
        let previous_deck: [group; 52] = Mapping::get(decks, game_id);
        
        assert_eq(previous_deck, deck);
        assert_eq(buy_in, game.buy_in);
        assert_eq(password_hash, game.password_hash);

        let player2_joining: bool = game.state == p2_join;
        assert(player2_joining || game.state == p3_join);

        let new_game: Game = Game {
            player1: game.player1,
            player2: player2_joining ? signer : game.player2,
            player3: !player2_joining ? signer : 0u128 as address,
            buy_in: game.buy_in,
            password_hash: game.password_hash,
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
                player1: 1000u16 - game.sb,
                player2: 1000u16 - game.bb,
                player3: 1000u16,
                player1_bet: game.sb,
                player2_bet: game.bb,
                player3_bet: 0u16,
            };
            
            let card: Cards = Cards {
                player1: [new_deck[0u8], new_deck[3u8]],
                player2: [new_deck[1u8], new_deck[4u8]],
                player3: [new_deck[2u8], new_deck[5u8]],
                flop: [new_deck[7u8], new_deck[8u8], new_deck[9u8]],
                turn: new_deck[11u8],
                river: new_deck[13u8],
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
        return finalize_bet(game_id, amount, self.signer);
    }
    async function finalize_bet(game_id: u32, amount: u16, signer: address) {
        let game: Game = Mapping::get(games, game_id);
        let chip: Chips = Mapping::get(chips, game_id);

        let is_p1: bool = game.player1 == signer && (game.state == p1_bet_pre ||
                                                     game.state == p1_bet_flop ||
                                                     game.state == p1_bet_turn ||
                                                     game.state == p1_bet_river);

        let is_p2: bool = game.player2 == signer && (game.state == p2_bet_pre ||
                                                     game.state == p2_bet_flop ||
                                                     game.state == p2_bet_turn ||
                                                     game.state == p2_bet_river);

        let is_p3: bool = game.player3 == signer && (game.state == p3_bet_pre ||
                                                     game.state == p3_bet_flop ||
                                                     game.state == p3_bet_turn ||
                                                     game.state == p3_bet_river);

        assert(is_p1 || is_p2 || is_p3);
        let (current_chips, current_bet): (u16, u16) = is_p1 ? (chip.player1, chip.player1_bet) :
                                                       is_p2 ? (chip.player2, chip.player2_bet) :
                                                               (chip.player3, chip.player3_bet);

        let highest_bet: u16 = (chip.player1_bet >= chip.player2_bet && chip.player1_bet >= chip.player3_bet) ? chip.player1_bet :
                               (chip.player2_bet >= chip.player3_bet) ? chip.player2_bet :
                                                                        chip.player3_bet;
        let min_raise_size: u16 = highest_bet == 0u16 ? game.bb :
                                  game.last_raise_size == 0u16 ? game.bb :
                                                                 game.last_raise_size;
        let min_raise_to: u16 = highest_bet + min_raise_size;
        let call_amount: u16 = highest_bet - current_bet;
        let min_bet: u16 = highest_bet == 0u16 ? game.bb : call_amount;

        assert(amount == current_chips || amount >= min_bet);

        let new_amount: u16 = current_bet + amount;
        let new_remaining: u16 = current_chips - amount;
        let is_going_allin: bool = new_remaining == 0u16;

        let reopens_action: bool = new_amount >= min_raise_to;

        let is_p1_inactive: bool = chip.player1 == 0u16 || is_player1(game.players_folded) || is_player1(game.players_out);
        let is_p2_inactive: bool = chip.player2 == 0u16 || is_player2(game.players_folded) || is_player2(game.players_out);
        let is_p3_inactive: bool = chip.player3 == 0u16 || is_player3(game.players_folded) || is_player3(game.players_out);

        let is_current_last_bet: bool = (is_p1 && is_player1(game.last_bet)) ||
                                        (is_p2 && is_player2(game.last_bet)) ||
                                        (is_p3 && is_player3(game.last_bet));

        let p1_matched: bool = is_p1_inactive || (is_p1 ? new_amount == highest_bet : chip.player1_bet == highest_bet);
        let p2_matched: bool = is_p2_inactive || (is_p2 ? new_amount == highest_bet : chip.player2_bet == highest_bet);
        let p3_matched: bool = is_p3_inactive || (is_p3 ? new_amount == highest_bet : chip.player3_bet == highest_bet);

        let all_matched: bool = p1_matched && p2_matched && p3_matched;

        let others_matched: bool = is_p1 ? (p2_matched && p3_matched) :
                                   is_p2 ? (p1_matched && p3_matched) :
                                           (p1_matched && p2_matched);

        let is_preflop_round: bool = game.state >= p1_bet_pre && game.state <= p3_bet_pre;
        let big_blind_has_option: bool = is_preflop_round && current_bet == game.bb && highest_bet == game.bb;

        let is_flop_round: bool = game.state >= p1_bet_flop && game.state <= p3_bet_flop;
        let is_turn_round: bool = game.state >= p1_bet_turn && game.state <= p3_bet_turn;

        let is_p1_out: bool = is_player1(game.players_out);
        let is_p2_out: bool = is_player2(game.players_out);
        let is_p3_out: bool = is_player3(game.players_out);

        let first_active_flop_decrypt: u8 = is_p1_out ? (is_p2_out ? p3_dec_flop : p2_dec_flop) : p1_dec_flop;
        let first_active_turn_decrypt: u8 = is_p1_out ? (is_p2_out ? p3_dec_turn : p2_dec_turn) : p1_dec_turn;
        let first_active_river_decrypt: u8 = is_p1_out ? (is_p2_out ? p3_dec_river : p2_dec_river) : p1_dec_river;
        let first_active_showdown: u8 = is_p1_inactive ? (is_p2_inactive ? p3_showdown : p2_showdown) : p1_showdown;

        let next_round_state: u8 = is_preflop_round ? first_active_flop_decrypt :
                                   is_flop_round ? first_active_turn_decrypt :
                                   is_turn_round ? first_active_river_decrypt :
                                   first_active_showdown;

        let current_round_base_state: u8 = is_preflop_round ? p1_bet_pre :
                                           is_flop_round ? p1_bet_flop :
                                           is_turn_round ? p1_bet_turn :
                                           p1_bet_river;

        let next_player_offset: u8 = is_p1 ? (is_p2_inactive ? 2u8 : 1u8) :
                                     is_p2 ? (is_p3_inactive ? 0u8 : 2u8) :
                                             (is_p1_inactive ? 1u8 : 0u8);

        let next_player_state: u8 = current_round_base_state + next_player_offset;

        let next_player_is_last_raiser: bool = (next_player_offset == 0u8 && is_player1(game.last_bet)) ||
                                                (next_player_offset == 1u8 && is_player2(game.last_bet)) ||
                                                (next_player_offset == 2u8 && is_player3(game.last_bet));

        let is_first_postflop_action: bool = !is_preflop_round && game.last_bet == 0u8;

        let action_returns_to_last_raiser: bool = next_player_is_last_raiser && all_matched && !(is_preflop_round && highest_bet == game.bb);

        let last_raiser_completed_action: bool = is_current_last_bet && others_matched && !reopens_action;

        let last_raiser_is_inactive: bool = (is_player1(game.last_bet) && is_p1_inactive) ||
                                             (is_player2(game.last_bet) && is_p2_inactive) ||
                                             (is_player3(game.last_bet) && is_p3_inactive);

        let betting_round_should_end: bool = action_returns_to_last_raiser ||
                                              last_raiser_completed_action ||
                                              (last_raiser_is_inactive && all_matched);

        let next_state: u8 = betting_round_should_end ? next_round_state : next_player_state;

        let current_player: u8 = is_p1 ? player1() :
                                 is_p2 ? player2() :
                                         player3();

        let should_set_current_as_raiser: bool = reopens_action || is_first_postflop_action;
        let big_blind_used_option: bool = is_current_last_bet && big_blind_has_option && !reopens_action;

        let new_last_bet: u8 = should_set_current_as_raiser ? current_player :
                                      big_blind_used_option ? 0u8 :
                                      game.last_bet;

        let new_chips: Chips = Chips {
            player1: is_p1 ? new_remaining : chip.player1,
            player2: is_p2 ? new_remaining : chip.player2,
            player3: is_p3 ? new_remaining : chip.player3,
            player1_bet: is_p1 ? new_amount : chip.player1_bet,
            player2_bet: is_p2 ? new_amount : chip.player2_bet,
            player3_bet: is_p3 ? new_amount : chip.player3_bet,
        };

        let new_last_raise_size: u16 = reopens_action ? (new_amount - highest_bet) : game.last_raise_size;

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            password_hash: game.password_hash,
            state: next_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_folded,
            last_bet: new_last_bet,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: new_last_raise_size,
        };

        Mapping::set(chips, game_id, new_chips);
        Mapping::set(games, game_id, new_game);
    }
    async transition decrypt_hands(game_id: u32, other1: [group; 2], other2: [group; 2], keys: Keys) -> (Keys, Future) {

        let other1_card0_dec: group = commutative_encryption.aleo/decrypt_card(keys.secret_inv, other1[0u8]);
        let other1_card1_dec: group = commutative_encryption.aleo/decrypt_card(keys.secret_inv, other1[1u8]);
        let other2_card0_dec: group = commutative_encryption.aleo/decrypt_card(keys.secret_inv, other2[0u8]);
        let other2_card1_dec: group = commutative_encryption.aleo/decrypt_card(keys.secret_inv, other2[1u8]);
        
        let new_other1: [group; 2] = [other1_card0_dec, other1_card1_dec];
        let new_other2: [group; 2] = [other2_card0_dec, other2_card1_dec];
        
        return (keys, finalize_decrypt_hands(game_id, other1, other2, new_other1, new_other2, self.signer));
    }
    async function finalize_decrypt_hands(game_id: u32, other1: [group; 2], other2: [group; 2], new_other1: [group; 2], new_other2: [group; 2], signer: address) {

        let old_card: Cards = Mapping::get(cards, game_id);
        let game: Game = Mapping::get(games, game_id);

        let is_p1: bool = game.player1 == signer && game.state == p1_dec_hand;
        let is_p2: bool = game.player2 == signer && game.state == p2_dec_hand;
        let is_p3: bool = game.player3 == signer && game.state == p3_dec_hand;

        assert(is_p1 || is_p2 || is_p3);
        assert((is_p1 && old_card.player2 == other1 && old_card.player3 == other2) ||
               (is_p2 && old_card.player3 == other1 && old_card.player1 == other2) ||
               (is_p3 && old_card.player1 == other1 && old_card.player2 == other2));

        let final_card: Cards = Cards {
            player1: is_p1 ? old_card.player1 : (is_p2 ? new_other2 : new_other1),
            player2: is_p2 ? old_card.player2 : (is_p1 ? new_other1 : new_other2),
            player3: is_p3 ? old_card.player3 : (is_p2 ? new_other1 : new_other2),
            flop: old_card.flop,
            turn: old_card.turn,
            river: old_card.river,
        };

        let is_p1_out: bool = is_player1(game.players_out);
        let is_p2_out: bool = is_player2(game.players_out);
        let is_p3_out: bool = is_player3(game.players_out);
        let is_p1_folded: bool = is_player1(game.players_folded);
        let is_p2_folded: bool = is_player2(game.players_folded);
        let is_p3_folded: bool = is_player3(game.players_folded);
        let is_dealer_p1: bool = is_player1(game.dealer_button);
        let is_dealer_p2: bool = is_player2(game.dealer_button);


        let is_p1_active: bool = !is_p1_out && !is_p1_folded;
        let is_p2_active: bool = !is_p2_out && !is_p2_folded;
        let is_p3_active: bool = !is_p3_out && !is_p3_folded;

        let first_bettor_state: u8 = is_dealer_p1 ? (is_p1_active ? p1_bet_pre : (is_p2_active ? p2_bet_pre : p3_bet_pre)) :
                                     is_dealer_p2 ? (is_p2_active ? p2_bet_pre : (is_p3_active ? p3_bet_pre : p1_bet_pre)) :
                                                    (is_p3_active ? p3_bet_pre : (is_p1_active ? p1_bet_pre : p2_bet_pre));

        let first_bettor_player: u8 = first_bettor_state == p1_bet_pre ? player1() :
                                      first_bettor_state == p2_bet_pre ? player2() :
                                                                         player3();

        let big_blind_player: u8 = is_dealer_p1 ? player3() :
                                   is_dealer_p2 ? player1() :
                                                  player2();

        let next_state: u8 =
            is_p1 ? (is_p2_out ? first_bettor_state : p2_dec_hand) :
            is_p2 ? (is_p3_out ? first_bettor_state : p3_dec_hand) :
            first_bettor_state;

        let new_last_bet: u8 =
            is_p1 ? game.last_bet :
            is_p2 ? (is_p3_out ? big_blind_player : game.last_bet) :
            big_blind_player;

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            password_hash: game.password_hash,
            state: next_state,
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

        Mapping::set(cards, game_id, final_card);
        Mapping::set(games, game_id, new_game);
    }
    async transition decrypt_flop(game_id: u32, flop: [group; 3], keys: Keys) -> (Keys, Future) {
        let flop0: group = commutative_encryption.aleo/decrypt_card(keys.secret_inv, flop[0u8]);
        let flop1: group = commutative_encryption.aleo/decrypt_card(keys.secret_inv, flop[1u8]);
        let flop2: group = commutative_encryption.aleo/decrypt_card(keys.secret_inv, flop[2u8]);
        
        let flop_dec: [group; 3] = [flop0, flop1, flop2];

        let flop0_u8: u8 = commutative_encryption.aleo/to_u8(flop0);
        let flop1_u8: u8 = commutative_encryption.aleo/to_u8(flop1);
        let flop2_u8: u8 = commutative_encryption.aleo/to_u8(flop2);
        let flop_u8: [u8; 3] = [flop0_u8, flop1_u8, flop2_u8];

        return (keys, finalize_decrypt_flop(game_id, flop, flop_dec, flop_u8, self.signer));
    }
    async function finalize_decrypt_flop(game_id: u32, flop: [group; 3], flop_dec: [group; 3], flop_u8: [u8; 3], signer: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        let game: Game = Mapping::get(games, game_id);
        
        let is_p1: bool = signer == game.player1 && game.state == p1_dec_flop;
        let is_p2: bool = signer == game.player2 && game.state == p2_dec_flop;
        let is_p3: bool = signer == game.player3 && game.state == p3_dec_flop;

        assert(is_p1 | is_p2 | is_p3);
        assert_eq(flop, old_card.flop);
        
        let new_card: Cards = Cards {
            player1: old_card.player1,
            player2: old_card.player2,
            player3: old_card.player3,
            flop: flop_dec,
            turn: old_card.turn,
            river: old_card.river,
        };

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

        let should_skip_betting: bool =
            (!is_p1_inactive as u8 + !is_p2_inactive as u8 + !is_p3_inactive as u8) <= 1u8;

        let next_state: u8 =
            is_p1 ? (!is_player2(game.players_out) ? p2_dec_flop : p3_dec_flop) :
            is_p2 ? (!is_player3(game.players_out) ? p3_dec_flop : should_skip_betting ? p1_dec_turn :
           is_player1(game.dealer_button) ?
                         (!is_p2_inactive ? p2_bet_flop : !is_p3_inactive ? p3_bet_flop : p1_bet_flop) :
           is_player2(game.dealer_button) ? (!is_p3_inactive ? p3_bet_flop : !is_p1_inactive ? p1_bet_flop : p2_bet_flop) :
                                            (!is_p1_inactive ? p1_bet_flop : !is_p2_inactive ? p2_bet_flop : p3_bet_flop)) :
                       should_skip_betting ? p1_dec_turn :
            is_player1(game.dealer_button) ? (!is_p2_inactive ? p2_bet_flop : !is_p3_inactive ? p3_bet_flop : p1_bet_flop) :
            is_player2(game.dealer_button) ? (!is_p3_inactive ? p3_bet_flop : !is_p1_inactive ? p1_bet_flop : p2_bet_flop) :
                                             (!is_p1_inactive ? p1_bet_flop : !is_p2_inactive ? p2_bet_flop : p3_bet_flop);

        let new_last_bet: u8 = 0u8;

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            password_hash: game.password_hash,
            state: next_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_folded,
            last_bet: new_last_bet,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: is_p3 ? 0u16 : game.last_raise_size,
        };

        Mapping::set(cards, game_id, new_card);
        Mapping::set(games, game_id, new_game);
    }
    async transition fold(game_id: u32) -> Future {
        return finalize_fold(game_id, self.signer);
    }
    
    async function finalize_fold(game_id: u32, signer: address) {
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
        let is_player1_folding: bool = game.player1 == signer;
        let is_player2_folding: bool = game.player2 == signer;
        let is_player3_folding: bool = game.player3 == signer;
        assert(is_player1_folding || is_player2_folding || is_player3_folding);
        
        let new_players_folded: u8 = 
            game.players_folded | 
            (is_player1_folding ? player1() : 
             is_player2_folding ? player2() : player3());
        
        let active_count: u8 = (!is_player1(new_players_folded) as u8) + 
                               (!is_player2(new_players_folded) as u8) + 
                               (!is_player3(new_players_folded) as u8);
        
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
            
            let next_shuffle_state: u8 = !is_player1(game.players_out) ? p1_new_shuffle : p2_new_shuffle;
            
            let new_game: Game = Game {
                player1: game.player1,
                player2: game.player2,
                player3: game.player3,
                buy_in: game.buy_in,
                password_hash: game.password_hash,
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

        let highest_bet: u16 = 
            (chip.player1_bet >= chip.player2_bet && chip.player1_bet >= chip.player3_bet) ? chip.player1_bet :
            (chip.player2_bet >= chip.player3_bet) ? chip.player2_bet : chip.player3_bet;

        // Check if all remaining players have matched the highest bet
        let all_matched: bool = 
            (is_player1(new_players_folded) || chip.player1_bet == highest_bet) &&
            (is_player2(new_players_folded) || chip.player2_bet == highest_bet) &&
            (is_player3(new_players_folded) || chip.player3_bet == highest_bet);

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
            password_hash: game.password_hash,
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
    async transition decrypt_turn_river(game_id: u32, card: group, keys: Keys) -> (Keys, Future) {
        let card_dec: group = commutative_encryption.aleo/decrypt_card(keys.secret_inv, card);
        let card_u8: u8 = commutative_encryption.aleo/to_u8(card_dec);
        return (keys, finalize_decrypt_turn_river(game_id, card, card_dec, card_u8, self.signer));
    }
    async function finalize_decrypt_turn_river(game_id: u32, card: group, card_dec: group, card_u8: u8, signer: address) {
        let old_card: Cards = Mapping::get(cards, game_id);
        let game: Game = Mapping::get(games, game_id);

        let is_p1: bool = signer == game.player1;
        let is_p2: bool = signer == game.player2;
        let is_p3: bool = signer == game.player3;

        let is_p1_turn: bool = is_p1 && game.state == p1_dec_turn;
        let is_p2_turn: bool = is_p2 && game.state == p2_dec_turn;
        let is_p3_turn: bool = is_p3 && game.state == p3_dec_turn;

        let is_p1_river: bool = is_p1 && game.state == p1_dec_river;
        let is_p2_river: bool = is_p2 && game.state == p2_dec_river;
        let is_p3_river: bool = is_p3 && game.state == p3_dec_river;

        let is_river: bool = is_p1_river | is_p2_river | is_p3_river;
        assert(is_p1_turn | is_p2_turn | is_p3_turn | is_river);
        assert_eq(card, is_river ? old_card.river : old_card.turn);
        
        let new_card: Cards = Cards {
            player1: old_card.player1,
            player2: old_card.player2,
            player3: old_card.player3,
            flop: old_card.flop,
            turn: is_river ? old_card.turn : card_dec,
            river: is_river ? card_dec : old_card.river,
        };

        if (is_p3_turn || is_p3_river) {
        let revealed: RevealedCards = Mapping::get(revealed_cards, game_id);
        let new_revealed: RevealedCards = RevealedCards {
            player1: revealed.player1,
            player2: revealed.player2,
            player3: revealed.player3,
            flop: revealed.flop,
                turn: is_p3_turn ? card_u8 : revealed.turn,
                river: is_p3_river ? card_u8 : revealed.river,
        };
        Mapping::set(revealed_cards, game_id, new_revealed);
        }

        let chip: Chips = Mapping::get(chips, game_id);
        let is_p1_inactive: bool = chip.player1 == 0u16 || is_player1(game.players_folded);
        let is_p2_inactive: bool = chip.player2 == 0u16 || is_player2(game.players_folded);
        let is_p3_inactive: bool = chip.player3 == 0u16 || is_player3(game.players_folded);

        let should_skip_betting: bool =
            (!is_p1_inactive as u8 + !is_p2_inactive as u8 + !is_p3_inactive as u8) <= 1u8;

        let next_state: u8 =
            is_p1_turn ? (!is_player2(game.players_out) ? p2_dec_turn : p3_dec_turn) :
            is_p2_turn ? (!is_player3(game.players_out) ? p3_dec_turn :
               should_skip_betting ? p1_dec_river :
           is_player1(game.dealer_button) ?
                         (!is_p2_inactive ? p2_bet_turn : !is_p3_inactive ? p3_bet_turn : p1_bet_turn) :
           is_player2(game.dealer_button) ? (!is_p3_inactive ? p3_bet_turn : !is_p1_inactive ? p1_bet_turn : p2_bet_turn) :
                                        (!is_p1_inactive ? p1_bet_turn : !is_p2_inactive ? p2_bet_turn : p3_bet_turn)) :
            is_p3_turn ? (should_skip_betting ? p1_dec_river :
            is_player1(game.dealer_button) ? (!is_p2_inactive ? p2_bet_turn : !is_p3_inactive ? p3_bet_turn : p1_bet_turn) :
            is_player2(game.dealer_button) ? (!is_p3_inactive ? p3_bet_turn : !is_p1_inactive ? p1_bet_turn : p2_bet_turn) :
                                         (!is_p1_inactive ? p1_bet_turn : !is_p2_inactive ? p2_bet_turn : p3_bet_turn)) :
            is_p1_river ? (!is_player2(game.players_out) ? p2_dec_river : p3_dec_river) :
            is_p2_river ? (!is_player3(game.players_out)  ? p3_dec_river :
                      should_skip_betting ? p1_showdown :
           is_player1(game.dealer_button) ?
                         (!is_p2_inactive ? p2_bet_river : !is_p3_inactive ? p3_bet_river : p1_bet_river) :
           is_player2(game.dealer_button) ? (!is_p3_inactive ? p3_bet_river : !is_p1_inactive ? p1_bet_river : p2_bet_river) :
                                            (!is_p1_inactive ? p1_bet_river : !is_p2_inactive ? p2_bet_river : p3_bet_river)) :
               should_skip_betting ? p1_showdown :
            is_player1(game.dealer_button) ? (!is_p2_inactive ? p2_bet_river : !is_p3_inactive ? p3_bet_river : p1_bet_river) :
            is_player2(game.dealer_button) ? (!is_p3_inactive ? p3_bet_river : !is_p1_inactive ? p1_bet_river : p2_bet_river) :
                                             (!is_p1_inactive ? p1_bet_river : !is_p2_inactive ? p2_bet_river : p3_bet_river);

        let new_last_bet: u8 = 0u8;

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            password_hash: game.password_hash,
            state: next_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_folded,
            last_bet: new_last_bet,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: (is_p3_turn || is_p3_river) ? 0u16 : game.last_raise_size,
        };

        Mapping::set(cards, game_id, new_card);
        Mapping::set(games, game_id, new_game);
    }
    async transition showdown(game_id: u32, hand: [group; 2], keys: Keys) -> (Keys, Future) {
        let c0: u8 = commutative_encryption.aleo/to_u8(commutative_encryption.aleo/decrypt_card(keys.secret_inv, hand[0u8]));
        let c1: u8 = commutative_encryption.aleo/to_u8(commutative_encryption.aleo/decrypt_card(keys.secret_inv, hand[1u8]));

        return (keys, finalize_showdown(game_id, self.signer, hand, [c0, c1]));
    }
    async function finalize_showdown(game_id: u32, signer: address, hand: [group; 2], hand_u8: [u8; 2]) {
        let old_card: Cards = Mapping::get(cards, game_id);
        let game: Game = Mapping::get(games, game_id);

        let is_p1_showdown: bool = game.state == p1_showdown;
        let is_p2_showdown: bool = game.state == p2_showdown;
        let is_p3_showdown: bool = game.state == p3_showdown;

        assert_eq(game.state, signer == game.player1 ? p1_showdown :
                              signer == game.player2 ? p2_showdown :
                              signer == game.player3 ? p3_showdown : 255u8);

        assert_eq(hand, is_p1_showdown ? old_card.player1 :
                        is_p2_showdown ? old_card.player2 :
                                         old_card.player3);

        let revealed: RevealedCards = Mapping::get(revealed_cards, game_id);
        let new_revealed: RevealedCards = RevealedCards {
            player1: is_p1_showdown ? hand_u8 : revealed.player1,
            player2: is_p2_showdown ? hand_u8 : revealed.player2,
            player3: is_p3_showdown ? hand_u8 : revealed.player3,
            flop: revealed.flop,
            turn: revealed.turn,
            river: revealed.river,
        };

        let p2_active: bool = !is_player2(game.players_out) && !is_player2(game.players_folded);
        let p3_active: bool = !is_player3(game.players_out) && !is_player3(game.players_folded);

        let new_state: u8 = is_p1_showdown ? (p2_active ? p2_showdown : (p3_active ? p3_showdown : compare)) :
                            is_p2_showdown ? (p3_active ? p3_showdown : compare) :
                                             compare;

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            password_hash: game.password_hash,
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

        Mapping::set(revealed_cards, game_id, new_revealed);
        Mapping::set(games, game_id, new_game);
    }

    async transition compare_hands(game_id: u32) -> Future {
        return finalize_compare_hands(game_id, self.signer);
    }
    async function finalize_compare_hands(game_id: u32, signer: address) {
        let game: Game = Mapping::get(games, game_id);
        assert_eq(game.state, compare);

        let is_valid_signer: bool = (is_player1(game.dealer_button) && game.player1 == signer) ||
                                    (is_player2(game.dealer_button) && game.player2 == signer) ||
                                    (is_player3(game.dealer_button) && game.player3 == signer);
        assert(is_valid_signer);

        let revealed: RevealedCards = Mapping::get(revealed_cards, game_id);
        let chip: Chips = Mapping::get(chips, game_id);

        let p1_active: bool = !is_player1(game.players_out) && !is_player1(game.players_folded);
        let p2_active: bool = !is_player2(game.players_out) && !is_player2(game.players_folded);
        let p3_active: bool = !is_player3(game.players_out) && !is_player3(game.players_folded);

        let cc1_0: (u8, u8) = (revealed.flop[0u8] / 13u8, revealed.flop[0u8] % 13u8);
        let cc2_0: (u8, u8) = (revealed.flop[1u8] / 13u8, revealed.flop[1u8] % 13u8);
        let cc3_0: (u8, u8) = (revealed.flop[2u8] / 13u8, revealed.flop[2u8] % 13u8);
        let cc4_0: (u8, u8) = (revealed.turn      / 13u8, revealed.turn      % 13u8);
        let cc5_0: (u8, u8) = (revealed.river     / 13u8, revealed.river     % 13u8);

        // Sort community cards by rank
        let cmp_1: bool = cc1_0.1 < cc2_0.1;
        let cc1_1: (u8, u8) = cmp_1 ? cc1_0 : cc2_0;
        let cc2_1: (u8, u8) = cmp_1 ? cc2_0 : cc1_0;
        let cc3_1: (u8, u8) = cc3_0;
        let cc4_1: (u8, u8) = cc4_0;
        let cc5_1: (u8, u8) = cc5_0;

        let cc1_2: (u8, u8) = cc1_1;
        let cmp_2: bool = cc2_1.1 < cc3_1.1;
        let cc2_2: (u8, u8) = cmp_2 ? cc2_1 : cc3_1;
        let cc3_2: (u8, u8) = cmp_2 ? cc3_1 : cc2_1;
        let cc4_2: (u8, u8) = cc4_1;
        let cc5_2: (u8, u8) = cc5_1;

        let cc1_3: (u8, u8) = cc1_2;
        let cc2_3: (u8, u8) = cc2_2;
        let cmp_3: bool = cc3_2.1 < cc4_2.1;
        let cc3_3: (u8, u8) = cmp_3 ? cc3_2 : cc4_2;
        let cc4_3: (u8, u8) = cmp_3 ? cc4_2 : cc3_2;
        let cc5_3: (u8, u8) = cc5_2;

        let cc1_4: (u8, u8) = cc1_3;
        let cc2_4: (u8, u8) = cc2_3;
        let cc3_4: (u8, u8) = cc3_3;
        let cmp_4: bool = cc4_3.1 < cc5_3.1;
        let cc4_4: (u8, u8) = cmp_4 ? cc4_3 : cc5_3;
        let cc5_4: (u8, u8) = cmp_4 ? cc5_3 : cc4_3;

        // Second pass
        let cmp_5: bool = cc1_4.1 < cc2_4.1;
        let cc1_5: (u8, u8) = cmp_5 ? cc1_4 : cc2_4;
        let cc2_5: (u8, u8) = cmp_5 ? cc2_4 : cc1_4;
        let cc3_5: (u8, u8) = cc3_4;
        let cc4_5: (u8, u8) = cc4_4;
        let cc5_5: (u8, u8) = cc5_4;

        let cc1_6: (u8, u8) = cc1_5;
        let cmp_6: bool = cc2_5.1 < cc3_5.1;
        let cc2_6: (u8, u8) = cmp_6 ? cc2_5 : cc3_5;
        let cc3_6: (u8, u8) = cmp_6 ? cc3_5 : cc2_5;
        let cc4_6: (u8, u8) = cc4_5;
        let cc5_6: (u8, u8) = cc5_5;

        let cc1_7: (u8, u8) = cc1_6;
        let cc2_7: (u8, u8) = cc2_6;
        let cmp_7: bool = cc3_6.1 < cc4_6.1;
        let cc3_7: (u8, u8) = cmp_7 ? cc3_6 : cc4_6;
        let cc4_7: (u8, u8) = cmp_7 ? cc4_6 : cc3_6;
        let cc5_7: (u8, u8) = cc5_6;

        let cc1_8: (u8, u8) = cc1_7;
        let cc2_8: (u8, u8) = cc2_7;
        let cc3_8: (u8, u8) = cc3_7;
        let cmp_8: bool = cc4_7.1 < cc5_7.1;
        let cc4_8: (u8, u8) = cmp_8 ? cc4_7 : cc5_7;
        let cc5_8: (u8, u8) = cmp_8 ? cc5_7 : cc4_7;

        // Third pass
        let cmp_9: bool = cc1_8.1 < cc2_8.1;
        let cc1_9: (u8, u8) = cmp_9 ? cc1_8 : cc2_8;
        let cc2_9: (u8, u8) = cmp_9 ? cc2_8 : cc1_8;
        let cc3_9: (u8, u8) = cc3_8;
        let cc4_9: (u8, u8) = cc4_8;
        let cc5_9: (u8, u8) = cc5_8;

        let cc1_10: (u8, u8) = cc1_9;
        let cmp_10: bool = cc2_9.1 < cc3_9.1;
        let cc2_10: (u8, u8) = cmp_10 ? cc2_9 : cc3_9;
        let cc3_10: (u8, u8) = cmp_10 ? cc3_9 : cc2_9;
        let cc4_10: (u8, u8) = cc4_9;
        let cc5_10: (u8, u8) = cc5_9;

        let cc1_11: (u8, u8) = cc1_10;
        let cc2_11: (u8, u8) = cc2_10;
        let cmp_11: bool = cc3_10.1 < cc4_10.1;
        let cc3_11: (u8, u8) = cmp_11 ? cc3_10 : cc4_10;
        let cc4_11: (u8, u8) = cmp_11 ? cc4_10 : cc3_10;
        let cc5_11: (u8, u8) = cc5_10;

        let cc1_12: (u8, u8) = cc1_11;
        let cc2_12: (u8, u8) = cc2_11;
        let cc3_12: (u8, u8) = cc3_11;
        let cmp_12: bool = cc4_11.1 < cc5_11.1;
        let cc4_12: (u8, u8) = cmp_12 ? cc4_11 : cc5_11;
        let cc5_12: (u8, u8) = cmp_12 ? cc5_11 : cc4_11;

        // Fourth pass
        let cmp_13: bool = cc1_12.1 < cc2_12.1;
        let cc1_13: (u8, u8) = cmp_13 ? cc1_12 : cc2_12;
        let cc2_13: (u8, u8) = cmp_13 ? cc2_12 : cc1_12;
        let cc3_13: (u8, u8) = cc3_12;
        let cc4_13: (u8, u8) = cc4_12;
        let cc5_13: (u8, u8) = cc5_12;

        let cc1_14: (u8, u8) = cc1_13;
        let cmp_14: bool = cc2_13.1 < cc3_13.1;
        let cc2_14: (u8, u8) = cmp_14 ? cc2_13 : cc3_13;
        let cc3_14: (u8, u8) = cmp_14 ? cc3_13 : cc2_13;
        let cc4_14: (u8, u8) = cc4_13;
        let cc5_14: (u8, u8) = cc5_13;

        let cc1_15: (u8, u8) = cc1_14;
        let cc2_15: (u8, u8) = cc2_14;
        let cmp_15: bool = cc3_14.1 < cc4_14.1;
        let cc3_15: (u8, u8) = cmp_15 ? cc3_14 : cc4_14;
        let cc4_15: (u8, u8) = cmp_15 ? cc4_14 : cc3_14;
        let cc5_15: (u8, u8) = cc5_14;

        let c1: (u8, u8) = cc1_15;
        let c2: (u8, u8) = cc2_15;
        let c3: (u8, u8) = cc3_15;
        let cmp_16: bool = cc4_15.1 < cc5_15.1;
        let c4: (u8, u8) = cmp_16 ? cc4_15 : cc5_15;
        let c5: (u8, u8) = cmp_16 ? cc5_15 : cc4_15;

        // Merge hole cards with community cards for each player
        let p1_h1_card: u8 = p1_active ? revealed.player1[0u8] : 0u8;
        let p1_h2_card: u8 = p1_active ? revealed.player1[1u8] : 0u8;
        let p1_h1: (u8, u8) = (p1_h1_card / 13u8, p1_h1_card % 13u8);
        let p1_h2: (u8, u8) = (p1_h2_card / 13u8, p1_h2_card % 13u8);

        let p1_h1_lt_c1: bool = p1_h1.1 < c1.1;
        let p1_h1_lt_c2: bool = p1_h1.1 < c2.1;
        let p1_h1_lt_c3: bool = p1_h1.1 < c3.1;
        let p1_h1_lt_c4: bool = p1_h1.1 < c4.1;
        let p1_h1_lt_c5: bool = p1_h1.1 < c5.1;
        let p1_tmp_c1: (u8, u8) = p1_h1_lt_c1 ? p1_h1 : c1;
        let p1_tmp_c2: (u8, u8) = p1_h1_lt_c1 ? c1 : p1_h1_lt_c2 ? p1_h1 : c2;
        let p1_tmp_c3: (u8, u8) = p1_h1_lt_c2 ? c2 : p1_h1_lt_c3 ? p1_h1 : c3;
        let p1_tmp_c4: (u8, u8) = p1_h1_lt_c3 ? c3 : p1_h1_lt_c4 ? p1_h1 : c4;
        let p1_tmp_c5: (u8, u8) = p1_h1_lt_c4 ? c4 : p1_h1_lt_c5 ? p1_h1 : c5;
        let p1_tmp_c6: (u8, u8) = p1_h1_lt_c5 ? c5 : p1_h1;

        let p1_h2_lt_t1: bool = p1_h2.1 < p1_tmp_c1.1;
        let p1_h2_lt_t2: bool = p1_h2.1 < p1_tmp_c2.1;
        let p1_h2_lt_t3: bool = p1_h2.1 < p1_tmp_c3.1;
        let p1_h2_lt_t4: bool = p1_h2.1 < p1_tmp_c4.1;
        let p1_h2_lt_t5: bool = p1_h2.1 < p1_tmp_c5.1;
        let p1_h2_lt_t6: bool = p1_h2.1 < p1_tmp_c6.1;
        let p1_c1: (u8, u8) = p1_h2_lt_t1 ? p1_h2 : p1_tmp_c1;
        let p1_c2: (u8, u8) = p1_h2_lt_t1 ? p1_tmp_c1 : p1_h2_lt_t2 ? p1_h2 : p1_tmp_c2;
        let p1_c3: (u8, u8) = p1_h2_lt_t2 ? p1_tmp_c2 : p1_h2_lt_t3 ? p1_h2 : p1_tmp_c3;
        let p1_c4: (u8, u8) = p1_h2_lt_t3 ? p1_tmp_c3 : p1_h2_lt_t4 ? p1_h2 : p1_tmp_c4;
        let p1_c5: (u8, u8) = p1_h2_lt_t4 ? p1_tmp_c4 : p1_h2_lt_t5 ? p1_h2 : p1_tmp_c5;
        let p1_c6: (u8, u8) = p1_h2_lt_t5 ? p1_tmp_c5 : p1_h2_lt_t6 ? p1_h2 : p1_tmp_c6;
        let p1_c7: (u8, u8) = p1_h2_lt_t6 ? p1_tmp_c6 : p1_h2;



        let p2_h1_card: u8 = p2_active ? revealed.player2[0u8] : 0u8;
        let p2_h2_card: u8 = p2_active ? revealed.player2[1u8] : 0u8;
        let p2_h1: (u8, u8) = (p2_h1_card / 13u8, p2_h1_card % 13u8);
        let p2_h2: (u8, u8) = (p2_h2_card / 13u8, p2_h2_card % 13u8);

        let p2_h1_lt_c1: bool = p2_h1.1 < c1.1;
        let p2_h1_lt_c2: bool = p2_h1.1 < c2.1;
        let p2_h1_lt_c3: bool = p2_h1.1 < c3.1;
        let p2_h1_lt_c4: bool = p2_h1.1 < c4.1;
        let p2_h1_lt_c5: bool = p2_h1.1 < c5.1;
        let p2_tmp_c1: (u8, u8) = p2_h1_lt_c1 ? p2_h1 : c1;
        let p2_tmp_c2: (u8, u8) = p2_h1_lt_c1 ? c1 : p2_h1_lt_c2 ? p2_h1 : c2;
        let p2_tmp_c3: (u8, u8) = p2_h1_lt_c2 ? c2 : p2_h1_lt_c3 ? p2_h1 : c3;
        let p2_tmp_c4: (u8, u8) = p2_h1_lt_c3 ? c3 : p2_h1_lt_c4 ? p2_h1 : c4;
        let p2_tmp_c5: (u8, u8) = p2_h1_lt_c4 ? c4 : p2_h1_lt_c5 ? p2_h1 : c5;
        let p2_tmp_c6: (u8, u8) = p2_h1_lt_c5 ? c5 : p2_h1;

        let p2_h2_lt_t1: bool = p2_h2.1 < p2_tmp_c1.1;
        let p2_h2_lt_t2: bool = p2_h2.1 < p2_tmp_c2.1;
        let p2_h2_lt_t3: bool = p2_h2.1 < p2_tmp_c3.1;
        let p2_h2_lt_t4: bool = p2_h2.1 < p2_tmp_c4.1;
        let p2_h2_lt_t5: bool = p2_h2.1 < p2_tmp_c5.1;
        let p2_h2_lt_t6: bool = p2_h2.1 < p2_tmp_c6.1;
        let p2_c1: (u8, u8) = p2_h2_lt_t1 ? p2_h2 : p2_tmp_c1;
        let p2_c2: (u8, u8) = p2_h2_lt_t1 ? p2_tmp_c1 : p2_h2_lt_t2 ? p2_h2 : p2_tmp_c2;
        let p2_c3: (u8, u8) = p2_h2_lt_t2 ? p2_tmp_c2 : p2_h2_lt_t3 ? p2_h2 : p2_tmp_c3;
        let p2_c4: (u8, u8) = p2_h2_lt_t3 ? p2_tmp_c3 : p2_h2_lt_t4 ? p2_h2 : p2_tmp_c4;
        let p2_c5: (u8, u8) = p2_h2_lt_t4 ? p2_tmp_c4 : p2_h2_lt_t5 ? p2_h2 : p2_tmp_c5;
        let p2_c6: (u8, u8) = p2_h2_lt_t5 ? p2_tmp_c5 : p2_h2_lt_t6 ? p2_h2 : p2_tmp_c6;
        let p2_c7: (u8, u8) = p2_h2_lt_t6 ? p2_tmp_c6 : p2_h2;



        let p3_h1_card: u8 = p3_active ? revealed.player3[0u8] : 0u8;
        let p3_h2_card: u8 = p3_active ? revealed.player3[1u8] : 0u8;
        let p3_h1: (u8, u8) = (p3_h1_card / 13u8, p3_h1_card % 13u8);
        let p3_h2: (u8, u8) = (p3_h2_card / 13u8, p3_h2_card % 13u8);

        let p3_h1_lt_c1: bool = p3_h1.1 < c1.1;
        let p3_h1_lt_c2: bool = p3_h1.1 < c2.1;
        let p3_h1_lt_c3: bool = p3_h1.1 < c3.1;
        let p3_h1_lt_c4: bool = p3_h1.1 < c4.1;
        let p3_h1_lt_c5: bool = p3_h1.1 < c5.1;
        let p3_tmp_c1: (u8, u8) = p3_h1_lt_c1 ? p3_h1 : c1;
        let p3_tmp_c2: (u8, u8) = p3_h1_lt_c1 ? c1 : p3_h1_lt_c2 ? p3_h1 : c2;
        let p3_tmp_c3: (u8, u8) = p3_h1_lt_c2 ? c2 : p3_h1_lt_c3 ? p3_h1 : c3;
        let p3_tmp_c4: (u8, u8) = p3_h1_lt_c3 ? c3 : p3_h1_lt_c4 ? p3_h1 : c4;
        let p3_tmp_c5: (u8, u8) = p3_h1_lt_c4 ? c4 : p3_h1_lt_c5 ? p3_h1 : c5;
        let p3_tmp_c6: (u8, u8) = p3_h1_lt_c5 ? c5 : p3_h1;

        let p3_h2_lt_t1: bool = p3_h2.1 < p3_tmp_c1.1;
        let p3_h2_lt_t2: bool = p3_h2.1 < p3_tmp_c2.1;
        let p3_h2_lt_t3: bool = p3_h2.1 < p3_tmp_c3.1;
        let p3_h2_lt_t4: bool = p3_h2.1 < p3_tmp_c4.1;
        let p3_h2_lt_t5: bool = p3_h2.1 < p3_tmp_c5.1;
        let p3_h2_lt_t6: bool = p3_h2.1 < p3_tmp_c6.1;
        let p3_c1: (u8, u8) = p3_h2_lt_t1 ? p3_h2 : p3_tmp_c1;
        let p3_c2: (u8, u8) = p3_h2_lt_t1 ? p3_tmp_c1 : p3_h2_lt_t2 ? p3_h2 : p3_tmp_c2;
        let p3_c3: (u8, u8) = p3_h2_lt_t2 ? p3_tmp_c2 : p3_h2_lt_t3 ? p3_h2 : p3_tmp_c3;
        let p3_c4: (u8, u8) = p3_h2_lt_t3 ? p3_tmp_c3 : p3_h2_lt_t4 ? p3_h2 : p3_tmp_c4;
        let p3_c5: (u8, u8) = p3_h2_lt_t4 ? p3_tmp_c4 : p3_h2_lt_t5 ? p3_h2 : p3_tmp_c5;
        let p3_c6: (u8, u8) = p3_h2_lt_t5 ? p3_tmp_c5 : p3_h2_lt_t6 ? p3_h2 : p3_tmp_c6;
        let p3_c7: (u8, u8) = p3_h2_lt_t6 ? p3_tmp_c6 : p3_h2;



        let p1_hand_value: u32 =
            evaluate_hand(p1_c1.0, p1_c1.1, p1_c2.0, p1_c2.1, p1_c3.0, p1_c3.1, p1_c4.0, p1_c4.1, p1_c5.0, p1_c5.1, p1_c6.0, p1_c6.1, p1_c7.0, p1_c7.1);

        let p2_hand_value: u32 =
            evaluate_hand(p2_c1.0, p2_c1.1, p2_c2.0, p2_c2.1, p2_c3.0, p2_c3.1, p2_c4.0, p2_c4.1, p2_c5.0, p2_c5.1, p2_c6.0, p2_c6.1, p2_c7.0, p2_c7.1);

        let p3_hand_value: u32 =
            evaluate_hand(p3_c1.0, p3_c1.1, p3_c2.0, p3_c2.1, p3_c3.0, p3_c3.1, p3_c4.0, p3_c4.1, p3_c5.0, p3_c5.1, p3_c6.0, p3_c6.1, p3_c7.0, p3_c7.1);

        let level1: u16 = chip.player1_bet <= chip.player2_bet && chip.player1_bet <= chip.player3_bet ? chip.player1_bet :
                          chip.player2_bet <= chip.player3_bet ? chip.player2_bet : chip.player3_bet;

        let level3: u16 = chip.player1_bet >= chip.player2_bet && chip.player1_bet >= chip.player3_bet ? chip.player1_bet :
                          chip.player2_bet >= chip.player3_bet ? chip.player2_bet : chip.player3_bet;

        let level2: u16 = chip.player1_bet != level1 && chip.player1_bet != level3 ? chip.player1_bet :
                          chip.player2_bet != level1 && chip.player2_bet != level3 ? chip.player2_bet :
                          chip.player3_bet;

        let contributors_to_main: u8 = (chip.player1_bet >= level1) as u8 +
                                       (chip.player2_bet >= level1) as u8 +
                                       (chip.player3_bet >= level1) as u8;

        let contributors_to_side1: u8 = (chip.player1_bet >= level2) as u8 +
                                        (chip.player2_bet >= level2) as u8 +
                                        (chip.player3_bet >= level2) as u8;

        let contributors_to_side2: u8 = (chip.player1_bet >= level3) as u8 +
                                        (chip.player2_bet >= level3) as u8 +
                                        (chip.player3_bet >= level3) as u8;

        let main_pot: u16 = level1 * contributors_to_main as u16;
        let side_pot_1: u16 = level1 == level2 ? 0u16 : (level2 - level1) * contributors_to_side1 as u16;
        let side_pot_2: u16 = level2 == level3 ? 0u16 : (level3 - level2) * contributors_to_side2 as u16;

        let p1_wins: bool = p1_active && p1_hand_value >= p2_hand_value && p1_hand_value >= p3_hand_value;
        let p2_wins: bool = p2_active && p2_hand_value >= p1_hand_value && p2_hand_value >= p3_hand_value;
        let p3_wins: bool = p3_active && p3_hand_value >= p1_hand_value && p3_hand_value >= p2_hand_value;

        let num_winners_main: u8 = (p1_wins as u8) + (p2_wins as u8) + (p3_wins as u8);
        let p1_from_main: u16 = p1_wins ? main_pot / num_winners_main as u16 : 0u16;
        let p2_from_main: u16 = p2_wins ? main_pot / num_winners_main as u16 : 0u16;
        let p3_from_main: u16 = p3_wins ? main_pot / num_winners_main as u16 : 0u16;

        let p1_wins_side1: bool = p1_active && chip.player1_bet >= level2;
        let p2_wins_side1: bool = p2_active && chip.player2_bet >= level2;
        let p3_wins_side1: bool = p3_active && chip.player3_bet >= level2;
        let num_winners_side1: u8 = (p1_wins && p1_wins_side1) as u8 +
                                    (p2_wins && p2_wins_side1) as u8 +
                                    (p3_wins && p3_wins_side1) as u8;

        let p1_from_side1: u16 = p1_wins && p1_wins_side1 && num_winners_side1 > 0u8 ? side_pot_1 / num_winners_side1 as u16 : 0u16;
        let p2_from_side1: u16 = p2_wins && p2_wins_side1 && num_winners_side1 > 0u8 ? side_pot_1 / num_winners_side1 as u16 : 0u16;
        let p3_from_side1: u16 = p3_wins && p3_wins_side1 && num_winners_side1 > 0u8 ? side_pot_1 / num_winners_side1 as u16 : 0u16;

        let p1_wins_side2: bool = p1_active && chip.player1_bet >= level3;
        let p2_wins_side2: bool = p2_active && chip.player2_bet >= level3;
        let p3_wins_side2: bool = p3_active && chip.player3_bet >= level3;
        let num_winners_side2: u8 = (p1_wins && p1_wins_side2) as u8 +
                                    (p2_wins && p2_wins_side2) as u8 +
                                    (p3_wins && p3_wins_side2) as u8;

        let p1_from_side2: u16 = p1_wins && p1_wins_side2 && num_winners_side2 > 0u8 ? side_pot_2 / num_winners_side2 as u16 : 0u16;
        let p2_from_side2: u16 = p2_wins && p2_wins_side2 && num_winners_side2 > 0u8 ? side_pot_2 / num_winners_side2 as u16 : 0u16;
        let p3_from_side2: u16 = p3_wins && p3_wins_side2 && num_winners_side2 > 0u8 ? side_pot_2 / num_winners_side2 as u16 : 0u16;

        let p1_share: u16 = p1_from_main + p1_from_side1 + p1_from_side2;
        let p2_share: u16 = p2_from_main + p2_from_side1 + p2_from_side2;
        let p3_share: u16 = p3_from_main + p3_from_side1 + p3_from_side2;

        let new_chip: Chips = Chips {
            player1: chip.player1 + p1_share,
            player2: chip.player2 + p2_share,
            player3: chip.player3 + p3_share,
            player1_bet: 0u16,
            player2_bet: 0u16,
            player3_bet: 0u16,
        };

        let new_players_out: u8 = (new_chip.player1 == 0u16 ? player1() : 0u8) |
                                  (new_chip.player2 == 0u16 ? player2() : 0u8) |
                                  (new_chip.player3 == 0u16 ? player3() : 0u8);

        let game_over: bool = new_players_out == 6u8 || new_players_out == 5u8 || new_players_out == 3u8;
        if (game_over) {
            Mapping::set(chips, game_id, new_chip);
            return;
        }

        let new_remaining_hands: u8 = game.remaining_hands - 1u8;

        let (new_sb, new_bb): (u16, u16) = new_remaining_hands == 0u8 ? (game.sb << 1u8, game.bb << 1u8) :
                                                                        (game.sb, game.bb);

        let next_state: u8 = !is_player1(new_players_out) ? p1_new_shuffle : p2_new_shuffle;

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            password_hash: game.password_hash,
            state: next_state,
            dealer_button: game.dealer_button,
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

    inline evaluate_hand(
        s1: u8, r1: u8,
        s2: u8, r2: u8,
        s3: u8, r3: u8,
        s4: u8, r4: u8,
        s5: u8, r5: u8,
        s6: u8, r6: u8,
        s7: u8, r7: u8
    ) -> u32 {

        let eq_12: bool = r1 == r2;
        let eq_23: bool = r2 == r3;
        let eq_34: bool = r3 == r4;
        let eq_45: bool = r4 == r5;
        let eq_56: bool = r5 == r6;
        let eq_67: bool = r6 == r7;

        // Four of a kind
        let quad_1234: bool = eq_12 && eq_23 && eq_34;
        let quad_2345: bool = eq_23 && eq_34 && eq_45;
        let quad_3456: bool = eq_34 && eq_45 && eq_56;
        let quad_4567: bool = eq_45 && eq_56 && eq_67;
        let has_quads: bool = quad_1234 || quad_2345 || quad_3456 || quad_4567;
        let quad_rank: u8 =   quad_4567 ? r7 :
                              quad_3456 ? r6 :
                              quad_2345 ? r5 :
                                          r4;
        let quad_kicker: u8 = quad_4567 ? r3 : r7;

        // Three of a kind
        let trip_123: bool = eq_12 && eq_23;
        let trip_234: bool = eq_23 && eq_34;
        let trip_345: bool = eq_34 && eq_45;
        let trip_456: bool = eq_45 && eq_56;
        let trip_567: bool = eq_56 && eq_67;
        let has_trips: bool = trip_123 || trip_234 || trip_345 || trip_456 || trip_567;
        let trip_rank: u8 = trip_567 ? r7 :
                            trip_456 ? r6 :
                            trip_345 ? r5 :
                            trip_234 ? r4 :
                            r3;

        // Pair
        let pair_12: bool = eq_12 && !trip_123;
        let pair_23: bool = eq_23 && !trip_123 && !trip_234;
        let pair_34: bool = eq_34 && !trip_234 && !trip_345;
        let pair_45: bool = eq_45 && !trip_345 && !trip_456;
        let pair_56: bool = eq_56 && !trip_456 && !trip_567;
        let pair_67: bool = eq_67 && !trip_567;
        let has_pair: bool = pair_12 || pair_23 || pair_34 || pair_45 || pair_56 || pair_67;
        let pair_rank: u8 = pair_67 ? r7 :
                            pair_56 ? r6 :
                            pair_45 ? r5 :
                            pair_34 ? r4 :
                            pair_23 ? r3 :
                                      r2;

        let has_fh: bool = has_trips && has_pair;
        let trips_only: bool = has_trips && !has_pair;
        let pair_only: bool = has_pair && !has_trips;

        // Flush
        let suit0_count: u8 = (s1 == 0u8) as u8 +
                              (s2 == 0u8) as u8 +
                              (s3 == 0u8) as u8 +
                              (s4 == 0u8) as u8 +
                              (s5 == 0u8) as u8 +
                              (s6 == 0u8) as u8 +
                              (s7 == 0u8) as u8;

        let suit1_count: u8 = (s1 == 1u8) as u8 +
                              (s2 == 1u8) as u8 +
                              (s3 == 1u8) as u8 +
                              (s4 == 1u8) as u8 +
                              (s5 == 1u8) as u8 +
                              (s6 == 1u8) as u8 +
                              (s7 == 1u8) as u8;

        let suit2_count: u8 = (s1 == 2u8) as u8 +
                              (s2 == 2u8) as u8 +
                              (s3 == 2u8) as u8 +
                              (s4 == 2u8) as u8 +
                              (s5 == 2u8) as u8 +
                              (s6 == 2u8) as u8 +
                              (s7 == 2u8) as u8;

        let suit3_count: u8 = (s1 == 3u8) as u8 +
                              (s2 == 3u8) as u8 +
                              (s3 == 3u8) as u8 +
                              (s4 == 3u8) as u8 +
                              (s5 == 3u8) as u8 +
                              (s6 == 3u8) as u8 +
                              (s7 == 3u8) as u8;

        let suit0_flush: bool = suit0_count >= 5u8;
        let suit1_flush: bool = suit1_count >= 5u8;
        let suit2_flush: bool = suit2_count >= 5u8;
        let suit3_flush: bool = suit3_count >= 5u8;
 
        let has_flush: bool = suit0_flush || suit1_flush || suit2_flush || suit3_flush;
        let flush_suit: u8 = suit3_flush ? 3u8 :
                             suit2_flush ? 2u8 :
                             suit1_flush ? 1u8 :
                                           0u8;
        let flush_count: u8 = suit3_flush ? suit3_count :
                              suit2_flush ? suit2_count :
                              suit1_flush ? suit1_count :
                                            suit0_count;

       let hand_bitfield: u32 = (1u32 << r1 as u32) |
                                (1u32 << r2 as u32) |
                                (1u32 << r3 as u32) |
                                (1u32 << r4 as u32) |
                                (1u32 << r5 as u32) |
                                (1u32 << r6 as u32) |
                                (1u32 << r7 as u32);

        let flush_bitfield: u32 = (s1 == flush_suit ? 1u32 << r1 as u32 : 0u32) |
                                  (s2 == flush_suit ? 1u32 << r2 as u32 : 0u32) |
                                  (s3 == flush_suit ? 1u32 << r3 as u32 : 0u32) |
                                  (s4 == flush_suit ? 1u32 << r4 as u32 : 0u32) |
                                  (s5 == flush_suit ? 1u32 << r5 as u32 : 0u32) |
                                  (s6 == flush_suit ? 1u32 << r6 as u32 : 0u32) |
                                  (s7 == flush_suit ? 1u32 << r7 as u32 : 0u32);

        // Combine bitfield and make a space for the low ace bit
        let combined_bitfield: u32 = ((flush_bitfield << 16u32) | hand_bitfield) << 1u32;

        // Copy aces from bit 13 to bit 0, and from bit 29 to bit 16
        let ace_low_bits: u32 = (combined_bitfield >> 13u32) & ((1u32 << 16u32) | 1u32);
        let bitfield: u32 = combined_bitfield | ace_low_bits;

        let straight_high: u32 = bitfield &
                                 bitfield >> 1u32 &
                                 bitfield >> 2u32 &
                                 bitfield >> 3u32 &
                                 bitfield >> 4u32;

        // Clear trailing bits to ignore lower straights
        straight_high = (straight_high & (straight_high >> 1u32)) ^ straight_high;

        // Only keep sf bits
        let sf_high: u32 = straight_high >> 16u32;

        let has_straight: bool = straight_high != 0u32;
        let has_sf: bool = sf_high != 0u32;

        // Only keep the five highest cards in a flush
        flush_bitfield = flush_count == 7u8 ? flush_bitfield & (flush_bitfield - 1u32) : flush_bitfield;
        flush_bitfield = flush_count >= 6u8 ? flush_bitfield & (flush_bitfield - 1u32) : flush_bitfield;


        let has_two_pair: bool = (pair_12 as u8) +
                                 (pair_23 as u8) +
                                 (pair_34 as u8) +
                                 (pair_45 as u8) +
                                 (pair_56 as u8) +
                                 (pair_67 as u8) >= 2u8;

        let not_pair_67: bool = !pair_67;
        let not_pair_56: bool = !pair_56;
        let not_pair_45: bool = !pair_45;

        let second_pair_rank: u8 = pair_56 && not_pair_67 ? r6 :
                                   pair_45 && not_pair_56 && not_pair_67 ? r5 :
                                   pair_34 ? r4 :
                                   pair_23 ? r3 :
                                             r2;
        let two_pair_kicker: u8 = not_pair_67 ? r7 :
                                  not_pair_56 ? r6 :
                                  not_pair_45 ? r5 :
                                  !pair_34 ? r4 :
                                  !pair_23 ? r3 :
                                             r2;

        let trips_kicker1: u8 = trip_567 ? r4 : r7;
        let trips_kicker2: u8 = trip_567 ? r3 :
                                trip_456 ? r3 :
                                           r6;

        let pair_kicker1: u8 = pair_67 ? r5 : r7;
        let pair_kicker2: u8 = pair_67 ? r4 :
                               pair_56 ? r4 :
                                         r6;
        let pair_kicker3: u8 = pair_67 ? r3 :
                               pair_56 ? r3 :
                               pair_45 ? r3 :
                                         r5;

        let hand_value: u32 = has_sf ? HAND_STRAIGHT_FLUSH | sf_high :
                              has_quads ? HAND_QUADS | (quad_rank as u32 << 4u8) | quad_kicker as u32 :
                              has_fh ? HAND_FULL_HOUSE | (trip_rank as u32 << 4u8) | pair_rank as u32 :
                              has_flush ? HAND_FLUSH | flush_bitfield :
                              has_straight ? HAND_STRAIGHT | straight_high :
                              trips_only ? HAND_TRIPS | (trip_rank as u32 << 8u8) |
                                                        (trips_kicker1 as u32 << 4u8) |
                                                        trips_kicker2 as u32 :
                              has_two_pair ? HAND_TWO_PAIR | (pair_rank as u32 << 8u8) |
                                                             (second_pair_rank as u32 << 4u8) |
                                                             two_pair_kicker as u32 :
                              pair_only ? HAND_PAIR | (pair_rank as u32 << 12u8) |
                                                      (pair_kicker1 as u32 << 8u8) |
                                                      (pair_kicker2 as u32 << 4u8) |
                                                      pair_kicker3 as u32 :
                              HAND_HIGH_CARD | (r7 as u32 << 16u8) |
                                               (r6 as u32 << 12u8) |
                                               (r5 as u32 << 8u8) |
                                               (r4 as u32 << 4u8) |
                                               r3 as u32;

        return hand_value;
    }

    async transition new_hand(game_id: u32, deck_shuffled: [group; 52], secret: scalar, secret_inv: scalar) -> (Keys, Future) {
        let deck: [group; 52] = commutative_encryption.aleo/initialize_deck();
        commutative_encryption.aleo/verify_permutation(deck, deck_shuffled);

        let deck_enc: [group; 52] = commutative_encryption.aleo/encrypt_deck(secret, deck_shuffled);

        assert_eq(commutative_encryption.aleo/decrypt_card(secret_inv, deck_enc[0]), deck_shuffled[0]);

        let signer: address = self.signer;
        let keys: Keys = Keys {
            owner: signer,
            secret: secret,
            secret_inv: secret_inv,
        };

        return (keys, finalize_new_hand(game_id, deck_enc, signer));
    }

    async function finalize_new_hand(game_id: u32, deck: [group; 52], signer: address) {
        let game: Game = Mapping::get(games, game_id);
        let chip: Chips = Mapping::get(chips, game_id);

        let is_p1: bool = game.player1 == signer && game.state == p1_new_shuffle;
        let is_p2: bool = game.player2 == signer && game.state == p2_new_shuffle;

        assert(is_p1 || is_p2);

        let is_p1_out: bool = is_player1(game.players_out);
        let is_p2_out: bool = is_player2(game.players_out);
        let is_p3_out: bool = is_player3(game.players_out);

        let next_state: u8 = is_p1 ? (is_p2_out ? p3_shuffle : p2_shuffle) : p3_shuffle;

        let new_dealer_button: u8 = is_player1(game.dealer_button) ? (!is_player2(game.players_out) ? player2() :
                                                                      !is_player3(game.players_out) ? player3() :
                                                                                                      player1()) :
                                    is_player2(game.dealer_button) ? (!is_player3(game.players_out) ? player3() :
                                                                      !is_player1(game.players_out) ? player1() :
                                                                                                      player2()) :
                                                                     (!is_player1(game.players_out) ? player1() :
                                                                      !is_player2(game.players_out) ? player2() :
                                                                                                      player3());

        let is_dealer_p1: bool = is_player1(new_dealer_button);
        let is_dealer_p2: bool = is_player2(new_dealer_button);

        let sb_player: u8 = is_dealer_p1 ? player2() :
                            is_dealer_p2 ? player3() :
                                           player1();

        let bb_player: u8 = is_dealer_p1 ? player3() :
                            is_dealer_p2 ? player1() :
                                           player2();

        let new_chip: Chips = Chips {
            player1: is_player1(sb_player) ? chip.player1 - game.sb :
                     is_player1(bb_player) ? chip.player1 - game.bb : chip.player1,
            player2: is_player2(sb_player) ? chip.player2 - game.sb :
                     is_player2(bb_player) ? chip.player2 - game.bb : chip.player2,
            player3: is_player3(sb_player) ? chip.player3 - game.sb :
                     is_player3(bb_player) ? chip.player3 - game.bb : chip.player3,
            player1_bet: is_player1(sb_player) ? game.sb :
                         is_player1(bb_player) ? game.bb : 0u16,
            player2_bet: is_player2(sb_player) ? game.sb :
                         is_player2(bb_player) ? game.bb : 0u16,
            player3_bet: is_player3(sb_player) ? game.sb :
                         is_player3(bb_player) ? game.bb : 0u16,
        };

        let card: Cards = Cards {
            player1: [deck[0u8], deck[3u8]],
            player2: [deck[1u8], deck[4u8]],
            player3: [deck[2u8], deck[5u8]],
            flop: [deck[7u8], deck[8u8], deck[9u8]],
            turn: deck[11u8],
            river: deck[13u8],
        };

        let revealed: RevealedCards = RevealedCards {
            player1: [255u8, 255u8],
            player2: [255u8, 255u8],
            player3: [255u8, 255u8],
            flop: [255u8, 255u8, 255u8],
            turn: 255u8,
            river: 255u8,
        };

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            password_hash: game.password_hash,
            state: next_state,
            dealer_button: new_dealer_button,
            players_out: game.players_out,
            players_folded: game.players_out,
            last_bet: 0u8,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: 0u16,
        };

        Mapping::set(decks, game_id, deck);
        Mapping::set(chips, game_id, new_chip);
        Mapping::set(cards, game_id, card);
        Mapping::set(revealed_cards, game_id, revealed);
        Mapping::set(games, game_id, new_game);
    }

    async transition shuffle_deck(game_id: u32, deck: [group; 52], deck_shuffled: [group; 52], secret: scalar, secret_inv: scalar) -> (Keys, Future) {
        commutative_encryption.aleo/verify_permutation(deck, deck_shuffled);

        let deck_enc: [group; 52] = commutative_encryption.aleo/encrypt_deck(secret, deck_shuffled);

        assert_eq(commutative_encryption.aleo/decrypt_card(secret_inv, deck_enc[0]), deck_shuffled[0]);

        let signer: address = self.signer;
        let keys: Keys = Keys {
            owner: signer,
            secret: secret,
            secret_inv: secret_inv,
        };

        return (keys, finalize_shuffle_deck(game_id, deck, deck_enc, signer));
    }

    async function finalize_shuffle_deck(game_id: u32, deck: [group; 52], new_deck: [group; 52], signer: address) {
        let game: Game = Mapping::get(games, game_id);
        let previous_deck: [group; 52] = Mapping::get(decks, game_id);
        assert(previous_deck == deck);

        let is_p2: bool = game.player2 == signer && game.state == p2_shuffle;
        let is_p3: bool = game.player3 == signer && game.state == p3_shuffle;

        assert(is_p2 || is_p3);

        let card: Cards = Cards {
            player1: [new_deck[0u8], new_deck[3u8]],
            player2: [new_deck[1u8], new_deck[4u8]],
            player3: [new_deck[2u8], new_deck[5u8]],
            flop: [new_deck[7u8], new_deck[8u8], new_deck[9u8]],
            turn: new_deck[11u8],
            river: new_deck[13u8],
        };

        let new_state: u8 = is_p2 ? (!is_player3(game.players_out) ? p3_shuffle : p1_dec_hand) :
                                     (!is_player1(game.players_out) ? p1_dec_hand :
                                      !is_player2(game.players_out) ? p2_dec_hand :
                                                                      p3_dec_hand);

        let new_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            password_hash: game.password_hash,
            state: new_state,
            dealer_button: game.dealer_button,
            players_out: game.players_out,
            players_folded: game.players_out,
            last_bet: 0u8,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: game.remaining_hands,
            hands_played: game.hands_played,
            last_raise_size: 0u16,
        };

        Mapping::set(decks, game_id, new_deck);
        Mapping::set(cards, game_id, card);
        Mapping::set(games, game_id, new_game);
    }

    async transition claim_prize(game_id: u32, public prize: u64) -> Future {
        let transfer_future: Future = credits.aleo/transfer_public(self.signer, prize);
        return finalize_claim_prize(game_id, self.signer, prize, transfer_future);
    }

    async function finalize_claim_prize(game_id: u32, signer: address, prize: u64, transfer_future: Future) {
        let game: Game = Mapping::get(games, game_id);
        let chip: Chips = Mapping::get(chips, game_id);

        assert(game.player1 == signer || game.player2 == signer || game.player3 == signer);

        let total_chips: u16 = chip.player1 + chip.player2 + chip.player3;
        let player_chips: u16 = game.player1 == signer ? chip.player1 :
                                game.player2 == signer ? chip.player2 : chip.player3;
        assert_eq(player_chips, total_chips);

        let expected_prize: u64 = game.buy_in * 3u64;
        assert_eq(prize, expected_prize);

        transfer_future.await();

        let completed_game: Game = Game {
            player1: game.player1,
            player2: game.player2,
            player3: game.player3,
            buy_in: game.buy_in,
            password_hash: game.password_hash,
            state: 255u8,
            dealer_button: game.dealer_button,
            players_out: 7u8,
            players_folded: 7u8,
            last_bet: 0u8,
            sb: game.sb,
            bb: game.bb,
            remaining_hands: 0u8,
            hands_played: game.hands_played,
            last_raise_size: 0u16,
        };

        Mapping::set(games, game_id, completed_game);
    }

    @noupgrade
    async constructor() {}
}
