import zk_deck_shuffle.aleo;

program poker.aleo {
    mapping games: u32 => Game;

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
    }
    async transition new_game(game_id: u32) -> Future {
        return finalize_new_game(game_id, self.caller);
    }
    async function finalize_new_game(game_id: u32, caller: address) {
        let game: Game = Game {
            player1: caller,
            player2: 0u128 as address,
            player3: 0u128 as address, 
            buy_in: 10u64,
            deck: get_new_deck(),
        };
        Mapping::set(games, game_id, game);
    }
}
