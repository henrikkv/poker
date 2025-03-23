program zk_sra_encryption.aleo;

closure transform_card:
    input r0 as u128;
    input r1 as u128;
    xor r0 r1 into r2;
    output r2 as u128;

function process_card:
    input r0 as u128.private;
    input r1 as u128.private;
    call transform_card r1 r0 into r2;
    output r2 as u128.private;

function decrypt_card:
    input r0 as u128.private;
    input r1 as u128.private;
    call transform_card r1 r0 into r2;
    output r2 as u128.private;

function process_two_cards:
    input r0 as u128.private;
    input r1 as u128.private;
    input r2 as u128.private;
    call transform_card r1 r0 into r3;
    call transform_card r2 r0 into r4;
    cast  r3 r4 into r5 as [u128; 2u32];
    output r5 as [u128; 2u32].private;

function process_three_cards:
    input r0 as u128.private;
    input r1 as u128.private;
    input r2 as u128.private;
    input r3 as u128.private;
    call transform_card r1 r0 into r4;
    call transform_card r2 r0 into r5;
    call transform_card r3 r0 into r6;
    cast  r4 r5 r6 into r7 as [u128; 3u32];
    output r7 as [u128; 3u32].private;

function decrypt_two_cards:
    input r0 as u128.private;
    input r1 as u128.private;
    input r2 as u128.private;
    input r3 as u128.private;
    xor r0 r1 into r4;
    call transform_card r2 r4 into r5;
    call transform_card r3 r4 into r6;
    cast  r5 r6 into r7 as [u128; 2u32];
    output r7 as [u128; 2u32].private;

function decrypt_three_cards:
    input r0 as u128.private;
    input r1 as u128.private;
    input r2 as u128.private;
    input r3 as u128.private;
    input r4 as u128.private;
    xor r0 r1 into r5;
    call transform_card r2 r5 into r6;
    call transform_card r3 r5 into r7;
    call transform_card r4 r5 into r8;
    cast  r6 r7 r8 into r9 as [u128; 3u32];
    output r9 as [u128; 3u32].private;

function test_encryption:
    input r0 as u128.public;
    input r1 as u128.private;
    call transform_card r0 r1 into r2;
    call transform_card r2 r1 into r3;
    assert.eq r0 r3;
    output r2 as u128.private;
    output r3 as u128.private;
