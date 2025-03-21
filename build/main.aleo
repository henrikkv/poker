program poker.aleo;

struct Game:
    player1 as address;
    player2 as address;
    player3 as address;
    buy_in as u64;
    deck as [[u128; 26u32]; 2u32];

mapping games:
    key as u32.public;
    value as Game.public;

function new_game:
    input r0 as u32.private;
    async new_game r0 self.caller into r1;
    output r1 as poker.aleo/new_game.future;

finalize new_game:
    input r0 as u32.public;
    input r1 as address.public;
    cast 0u128 into r2 as address;
    cast 0u128 into r3 as address;
    cast  1u128 2u128 3u128 4u128 5u128 6u128 7u128 8u128 9u128 10u128 11u128 12u128 13u128 14u128 15u128 16u128 17u128 18u128 19u128 20u128 21u128 22u128 23u128 24u128 25u128 26u128 into r4 as [u128; 26u32];
    cast  27u128 28u128 29u128 30u128 31u128 32u128 33u128 34u128 35u128 36u128 37u128 38u128 39u128 40u128 41u128 42u128 43u128 44u128 45u128 46u128 47u128 48u128 49u128 50u128 51u128 52u128 into r5 as [u128; 26u32];
    cast  r4 r5 into r6 as [[u128; 26u32]; 2u32];
    cast r1 r2 r3 10u64 r6 into r7 as Game;
    set r7 into games[r0];
