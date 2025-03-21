import zk_deck_shuffle.aleo;
import zk_sra_encryption.aleo;
program poker.aleo;

struct Game:
    player1 as address;
    player2 as address;
    player3 as address;
    buy_in as u64;
    deck as [[u128; 26u32]; 2u32];
    state as u8;
    dealer_button as u8;

struct Chips:
    player1 as u16;
    player2 as u16;
    player3 as u16;
    player1_bet as u16;
    player2_bet as u16;
    player3_bet as u16;

struct Cards:
    player1 as [u128; 2u32];
    player2 as [u128; 2u32];
    player3 as [u128; 2u32];
    flop as [u128; 3u32];
    turn as u128;
    river as u128;

mapping games:
    key as u32.public;
    value as Game.public;

mapping chips:
    key as u32.public;
    value as Chips.public;

mapping cards:
    key as u32.public;
    value as Cards.public;

function create_game:
    input r0 as u32.private;
    input r1 as i8.private;
    input r2 as i8.private;
    input r3 as i8.private;
    input r4 as u128.private;
    input r5 as u128.private;
    cast  1u128 2u128 3u128 4u128 5u128 6u128 7u128 8u128 9u128 10u128 11u128 12u128 13u128 14u128 15u128 16u128 17u128 18u128 19u128 20u128 21u128 22u128 23u128 24u128 25u128 26u128 into r6 as [u128; 26u32];
    cast  27u128 28u128 29u128 30u128 31u128 32u128 33u128 34u128 35u128 36u128 37u128 38u128 39u128 40u128 41u128 42u128 43u128 44u128 45u128 46u128 47u128 48u128 49u128 50u128 51u128 52u128 into r7 as [u128; 26u32];
    cast  r6 r7 into r8 as [[u128; 26u32]; 2u32];
    call zk_sra_encryption.aleo/encrypt_deck r4 r5 r8 into r9;
    call zk_deck_shuffle.aleo/full_shuffle r1 r2 r3 r9 into r10;
    async create_game r0 r10 self.caller into r11;
    output r11 as poker.aleo/create_game.future;

finalize create_game:
    input r0 as u32.public;
    input r1 as [[u128; 26u32]; 2u32].public;
    input r2 as address.public;
    cast 0u128 into r3 as address;
    cast 0u128 into r4 as address;
    cast r2 r3 r4 10u64 r1 0u8 3u8 into r5 as Game;
    set r5 into games[r0];

function join_game:
    input r0 as u32.private;
    input r1 as [[u128; 26u32]; 2u32].private;
    input r2 as i8.private;
    input r3 as i8.private;
    input r4 as i8.private;
    input r5 as u128.private;
    input r6 as u128.private;
    call zk_sra_encryption.aleo/encrypt_deck r5 r6 r1 into r7;
    call zk_deck_shuffle.aleo/full_shuffle r2 r3 r4 r7 into r8;
    async join_game r0 r1 r8 self.caller into r9;
    output r9 as poker.aleo/join_game.future;

finalize join_game:
    input r0 as u32.public;
    input r1 as [[u128; 26u32]; 2u32].public;
    input r2 as [[u128; 26u32]; 2u32].public;
    input r3 as address.public;
    get games[r0] into r4;
    is.eq r4.deck r1 into r5;
    assert.eq r5 true;
    is.eq r4.state 0u8 into r6;
    branch.eq r6 false to end_then_0_0;
    cast 0u128 into r7 as address;
    cast r4.player1 r3 r7 r4.buy_in r2 1u8 3u8 into r8 as Game;
    set r8 into games[r0];
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    is.eq r4.state 1u8 into r9;
    branch.eq r9 false to end_then_1_2;
    cast r4.player1 r4.player2 r3 r4.buy_in r2 2u8 3u8 into r10 as Game;
    cast 0u16 0u16 0u16 0u16 0u16 0u16 into r11 as Chips;
    cast  r2[1u32][1u32] r2[1u32][4u32] into r12 as [u128; 2u32];
    cast  r2[1u32][2u32] r2[1u32][5u32] into r13 as [u128; 2u32];
    cast  r2[1u32][3u32] r2[1u32][6u32] into r14 as [u128; 2u32];
    cast  r2[1u32][7u32] r2[1u32][8u32] r2[1u32][9u32] into r15 as [u128; 3u32];
    cast r12 r13 r14 r15 r2[1u32][10u32] r2[1u32][11u32] into r16 as Cards;
    set r10 into games[r0];
    set r11 into chips[r0];
    set r16 into cards[r0];
    branch.eq true true to end_otherwise_1_3;
    position end_then_1_2;
    position end_otherwise_1_3;
    position end_otherwise_0_1;

function play:
    input r0 as u32.private;
    async play r0 self.caller into r1;
    output r1 as poker.aleo/play.future;

finalize play:
    input r0 as u32.public;
    input r1 as address.public;
    get games[r0] into r2;
    is.eq r2.state 2u8 into r3;
    branch.eq r3 false to end_then_0_4;
    branch.eq true true to end_otherwise_0_5;
    position end_then_0_4;
    position end_otherwise_0_5;

function decrypt_hands_p1:
    input r0 as u32.private;
    input r1 as u128.private;
    input r2 as u128.private;
    input r3 as Cards.private;
    call zk_sra_encryption.aleo/decrypt_card r1 r2 r3.player2[0u32] into r4;
    call zk_sra_encryption.aleo/decrypt_card r1 r2 r3.player2[1u32] into r5;
    cast  r4 r5 into r6 as [u128; 2u32];
    call zk_sra_encryption.aleo/decrypt_card r1 r2 r3.player3[0u32] into r7;
    call zk_sra_encryption.aleo/decrypt_card r1 r2 r3.player3[1u32] into r8;
    cast  r7 r8 into r9 as [u128; 2u32];
    cast r3.player1 r6 r9 r3.flop r3.turn r3.river into r10 as Cards;
    async decrypt_hands_p1 r0 r3 r10 self.caller into r11;
    output r11 as poker.aleo/decrypt_hands_p1.future;

finalize decrypt_hands_p1:
    input r0 as u32.public;
    input r1 as Cards.public;
    input r2 as Cards.public;
    input r3 as address.public;
    get cards[r0] into r4;
    is.eq r1 r4 into r5;
    assert.eq r5 true;
    get games[r0] into r6;
    is.eq r6.state 2u8 into r7;
    assert.eq r7 true;
    is.eq r6.player1 r3 into r8;
    assert.eq r8 true;
    cast r6.player1 r6.player2 r6.player3 r6.buy_in r6.deck 3u8 r6.dealer_button into r9 as Game;
    set r2 into cards[r0];
    set r9 into games[r0];

function decrypt_hands_p2:
    input r0 as u32.private;
    input r1 as u128.private;
    input r2 as u128.private;
    input r3 as Cards.private;
    call zk_sra_encryption.aleo/decrypt_card r1 r2 r3.player1[0u32] into r4;
    call zk_sra_encryption.aleo/decrypt_card r1 r2 r3.player1[1u32] into r5;
    cast  r4 r5 into r6 as [u128; 2u32];
    call zk_sra_encryption.aleo/decrypt_card r1 r2 r3.player3[0u32] into r7;
    call zk_sra_encryption.aleo/decrypt_card r1 r2 r3.player3[1u32] into r8;
    cast  r7 r8 into r9 as [u128; 2u32];
    cast r6 r3.player2 r9 r3.flop r3.turn r3.river into r10 as Cards;
    async decrypt_hands_p2 r0 r3 r10 self.caller into r11;
    output r11 as poker.aleo/decrypt_hands_p2.future;

finalize decrypt_hands_p2:
    input r0 as u32.public;
    input r1 as Cards.public;
    input r2 as Cards.public;
    input r3 as address.public;
    get cards[r0] into r4;
    is.eq r1 r4 into r5;
    assert.eq r5 true;
    get games[r0] into r6;
    is.eq r6.state 3u8 into r7;
    assert.eq r7 true;
    is.eq r6.player2 r3 into r8;
    assert.eq r8 true;
    cast r6.player1 r6.player2 r6.player3 r6.buy_in r6.deck 4u8 r6.dealer_button into r9 as Game;
    set r2 into cards[r0];
    set r9 into games[r0];

function decrypt_hands_p3:
    input r0 as u32.private;
    input r1 as u128.private;
    input r2 as u128.private;
    input r3 as Cards.private;
    call zk_sra_encryption.aleo/decrypt_card r1 r2 r3.player1[0u32] into r4;
    call zk_sra_encryption.aleo/decrypt_card r1 r2 r3.player1[1u32] into r5;
    cast  r4 r5 into r6 as [u128; 2u32];
    call zk_sra_encryption.aleo/decrypt_card r1 r2 r3.player2[0u32] into r7;
    call zk_sra_encryption.aleo/decrypt_card r1 r2 r3.player2[1u32] into r8;
    cast  r7 r8 into r9 as [u128; 2u32];
    cast r6 r9 r3.player3 r3.flop r3.turn r3.river into r10 as Cards;
    async decrypt_hands_p3 r0 r3 r10 self.caller into r11;
    output r11 as poker.aleo/decrypt_hands_p3.future;

finalize decrypt_hands_p3:
    input r0 as u32.public;
    input r1 as Cards.public;
    input r2 as Cards.public;
    input r3 as address.public;
    get cards[r0] into r4;
    is.eq r1 r4 into r5;
    assert.eq r5 true;
    get games[r0] into r6;
    is.eq r6.state 4u8 into r7;
    assert.eq r7 true;
    is.eq r6.player1 r3 into r8;
    assert.eq r8 true;
    is.eq r6.dealer_button 3u8 into r9;
    branch.eq r9 false to end_then_0_6;
    cast r6.player1 r6.player2 r6.player3 r6.buy_in r6.deck 4u8 r6.dealer_button into r10 as Game;
    set r2 into cards[r0];
    set r10 into games[r0];
    branch.eq true true to end_otherwise_0_7;
    position end_then_0_6;
    is.eq r6.dealer_button 1u8 into r11;
    branch.eq r11 false to end_then_1_8;
    cast r6.player1 r6.player2 r6.player3 r6.buy_in r6.deck 5u8 r6.dealer_button into r12 as Game;
    set r2 into cards[r0];
    set r12 into games[r0];
    branch.eq true true to end_otherwise_1_9;
    position end_then_1_8;
    cast r6.player1 r6.player2 r6.player3 r6.buy_in r6.deck 6u8 r6.dealer_button into r13 as Game;
    set r2 into cards[r0];
    set r13 into games[r0];
    position end_otherwise_1_9;
    position end_otherwise_0_7;
