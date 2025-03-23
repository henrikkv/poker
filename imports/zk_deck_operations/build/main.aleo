import zk_sra_encryption.aleo;
program zk_deck_operations.aleo;

struct Deck:
    part1 as [u128; 26u32];
    part2 as [u128; 26u32];

function decrypt_two_cards:
    input r0 as u128.private;
    input r1 as u128.private;
    input r2 as u128.private;
    input r3 as u128.private;
    call zk_sra_encryption.aleo/decrypt_two_cards r0 r1 r2 r3 into r4;
    output r4 as [u128; 2u32].private;

function decrypt_three_cards:
    input r0 as u128.private;
    input r1 as u128.private;
    input r2 as u128.private;
    input r3 as u128.private;
    input r4 as u128.private;
    call zk_sra_encryption.aleo/decrypt_three_cards r0 r1 r2 r3 r4 into r5;
    output r5 as [u128; 3u32].private;

function encrypt_deck_part1:
    input r0 as u128.private;
    input r1 as u128.private;
    input r2 as Deck.private;
    cast  r2.part1[0u32] r2.part1[1u32] r2.part1[2u32] r2.part1[3u32] r2.part1[4u32] r2.part1[5u32] r2.part1[6u32] r2.part1[7u32] r2.part1[8u32] r2.part1[9u32] r2.part1[10u32] r2.part1[11u32] r2.part1[12u32] into r3 as [u128; 13u32];
    xor r0 r1 into r4;
    call zk_sra_encryption.aleo/process_card r4 r3[0u32] into r5;
    call zk_sra_encryption.aleo/process_card r4 r3[1u32] into r6;
    call zk_sra_encryption.aleo/process_card r4 r3[2u32] into r7;
    call zk_sra_encryption.aleo/process_card r4 r3[3u32] into r8;
    call zk_sra_encryption.aleo/process_card r4 r3[4u32] into r9;
    call zk_sra_encryption.aleo/process_card r4 r3[5u32] into r10;
    call zk_sra_encryption.aleo/process_card r4 r3[6u32] into r11;
    call zk_sra_encryption.aleo/process_card r4 r3[7u32] into r12;
    call zk_sra_encryption.aleo/process_card r4 r3[8u32] into r13;
    call zk_sra_encryption.aleo/process_card r4 r3[9u32] into r14;
    call zk_sra_encryption.aleo/process_card r4 r3[10u32] into r15;
    call zk_sra_encryption.aleo/process_card r4 r3[11u32] into r16;
    call zk_sra_encryption.aleo/process_card r4 r3[12u32] into r17;
    cast  r5 r6 r7 r8 r9 r10 r11 r12 r13 r14 r15 r16 r17 into r18 as [u128; 13u32];
    output r18 as [u128; 13u32].private;

function encrypt_deck_part2:
    input r0 as u128.private;
    input r1 as u128.private;
    input r2 as Deck.private;
    cast  r2.part1[13u32] r2.part1[14u32] r2.part1[15u32] r2.part1[16u32] r2.part1[17u32] r2.part1[18u32] r2.part1[19u32] r2.part1[20u32] r2.part1[21u32] r2.part1[22u32] r2.part1[23u32] r2.part1[24u32] r2.part1[25u32] into r3 as [u128; 13u32];
    xor r0 r1 into r4;
    call zk_sra_encryption.aleo/process_card r4 r3[0u32] into r5;
    call zk_sra_encryption.aleo/process_card r4 r3[1u32] into r6;
    call zk_sra_encryption.aleo/process_card r4 r3[2u32] into r7;
    call zk_sra_encryption.aleo/process_card r4 r3[3u32] into r8;
    call zk_sra_encryption.aleo/process_card r4 r3[4u32] into r9;
    call zk_sra_encryption.aleo/process_card r4 r3[5u32] into r10;
    call zk_sra_encryption.aleo/process_card r4 r3[6u32] into r11;
    call zk_sra_encryption.aleo/process_card r4 r3[7u32] into r12;
    call zk_sra_encryption.aleo/process_card r4 r3[8u32] into r13;
    call zk_sra_encryption.aleo/process_card r4 r3[9u32] into r14;
    call zk_sra_encryption.aleo/process_card r4 r3[10u32] into r15;
    call zk_sra_encryption.aleo/process_card r4 r3[11u32] into r16;
    call zk_sra_encryption.aleo/process_card r4 r3[12u32] into r17;
    cast  r5 r6 r7 r8 r9 r10 r11 r12 r13 r14 r15 r16 r17 into r18 as [u128; 13u32];
    output r18 as [u128; 13u32].private;

function encrypt_deck_part3:
    input r0 as u128.private;
    input r1 as u128.private;
    input r2 as Deck.private;
    cast  r2.part2[0u32] r2.part2[1u32] r2.part2[2u32] r2.part2[3u32] r2.part2[4u32] r2.part2[5u32] r2.part2[6u32] r2.part2[7u32] r2.part2[8u32] r2.part2[9u32] r2.part2[10u32] r2.part2[11u32] r2.part2[12u32] into r3 as [u128; 13u32];
    xor r0 r1 into r4;
    call zk_sra_encryption.aleo/process_card r4 r3[0u32] into r5;
    call zk_sra_encryption.aleo/process_card r4 r3[1u32] into r6;
    call zk_sra_encryption.aleo/process_card r4 r3[2u32] into r7;
    call zk_sra_encryption.aleo/process_card r4 r3[3u32] into r8;
    call zk_sra_encryption.aleo/process_card r4 r3[4u32] into r9;
    call zk_sra_encryption.aleo/process_card r4 r3[5u32] into r10;
    call zk_sra_encryption.aleo/process_card r4 r3[6u32] into r11;
    call zk_sra_encryption.aleo/process_card r4 r3[7u32] into r12;
    call zk_sra_encryption.aleo/process_card r4 r3[8u32] into r13;
    call zk_sra_encryption.aleo/process_card r4 r3[9u32] into r14;
    call zk_sra_encryption.aleo/process_card r4 r3[10u32] into r15;
    call zk_sra_encryption.aleo/process_card r4 r3[11u32] into r16;
    call zk_sra_encryption.aleo/process_card r4 r3[12u32] into r17;
    cast  r5 r6 r7 r8 r9 r10 r11 r12 r13 r14 r15 r16 r17 into r18 as [u128; 13u32];
    output r18 as [u128; 13u32].private;

function encrypt_deck_part4:
    input r0 as u128.private;
    input r1 as u128.private;
    input r2 as Deck.private;
    cast  r2.part2[13u32] r2.part2[14u32] r2.part2[15u32] r2.part2[16u32] r2.part2[17u32] r2.part2[18u32] r2.part2[19u32] r2.part2[20u32] r2.part2[21u32] r2.part2[22u32] r2.part2[23u32] r2.part2[24u32] r2.part2[25u32] into r3 as [u128; 13u32];
    xor r0 r1 into r4;
    call zk_sra_encryption.aleo/process_card r4 r3[0u32] into r5;
    call zk_sra_encryption.aleo/process_card r4 r3[1u32] into r6;
    call zk_sra_encryption.aleo/process_card r4 r3[2u32] into r7;
    call zk_sra_encryption.aleo/process_card r4 r3[3u32] into r8;
    call zk_sra_encryption.aleo/process_card r4 r3[4u32] into r9;
    call zk_sra_encryption.aleo/process_card r4 r3[5u32] into r10;
    call zk_sra_encryption.aleo/process_card r4 r3[6u32] into r11;
    call zk_sra_encryption.aleo/process_card r4 r3[7u32] into r12;
    call zk_sra_encryption.aleo/process_card r4 r3[8u32] into r13;
    call zk_sra_encryption.aleo/process_card r4 r3[9u32] into r14;
    call zk_sra_encryption.aleo/process_card r4 r3[10u32] into r15;
    call zk_sra_encryption.aleo/process_card r4 r3[11u32] into r16;
    call zk_sra_encryption.aleo/process_card r4 r3[12u32] into r17;
    cast  r5 r6 r7 r8 r9 r10 r11 r12 r13 r14 r15 r16 r17 into r18 as [u128; 13u32];
    output r18 as [u128; 13u32].private;

function combine_encrypted_deck:
    input r0 as [u128; 13u32].private;
    input r1 as [u128; 13u32].private;
    input r2 as [u128; 13u32].private;
    input r3 as [u128; 13u32].private;
    cast  r0[0u32] r0[1u32] r0[2u32] r0[3u32] r0[4u32] r0[5u32] r0[6u32] r0[7u32] r0[8u32] r0[9u32] r0[10u32] r0[11u32] r0[12u32] r1[0u32] r1[1u32] r1[2u32] r1[3u32] r1[4u32] r1[5u32] r1[6u32] r1[7u32] r1[8u32] r1[9u32] r1[10u32] r1[11u32] r1[12u32] into r4 as [u128; 26u32];
    cast  r2[0u32] r2[1u32] r2[2u32] r2[3u32] r2[4u32] r2[5u32] r2[6u32] r2[7u32] r2[8u32] r2[9u32] r2[10u32] r2[11u32] r2[12u32] r3[0u32] r3[1u32] r3[2u32] r3[3u32] r3[4u32] r3[5u32] r3[6u32] r3[7u32] r3[8u32] r3[9u32] r3[10u32] r3[11u32] r3[12u32] into r5 as [u128; 26u32];
    cast r4 r5 into r6 as Deck;
    output r6 as Deck.private;

function create_deck_from_array:
    input r0 as [u128; 26u32].private;
    input r1 as [u128; 26u32].private;
    cast r0 r1 into r2 as Deck;
    output r2 as Deck.private;

function deck_to_array:
    input r0 as Deck.private;
    output r0.part1 as [u128; 26u32].private;
    output r0.part2 as [u128; 26u32].private;
