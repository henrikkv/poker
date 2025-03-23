// Import the basic card encryption program
import zk_sra_encryption.aleo;

program zk_deck_operations.aleo {
    // Split the deck into two parts to stay within array size limits (max 32 elements)
    struct Deck {
        part1: [u128; 26],
        part2: [u128; 26]
    }
    
    // Helper to extract quarters from the deck
    inline extract_quarter1(deck: Deck) -> [u128; 13] {
        return [
            deck.part1[0u8], deck.part1[1u8], deck.part1[2u8], deck.part1[3u8],
            deck.part1[4u8], deck.part1[5u8], deck.part1[6u8], deck.part1[7u8],
            deck.part1[8u8], deck.part1[9u8], deck.part1[10u8], deck.part1[11u8],
            deck.part1[12u8]
        ];
    }
    
    inline extract_quarter2(deck: Deck) -> [u128; 13] {
        return [
            deck.part1[13u8], deck.part1[14u8], deck.part1[15u8], deck.part1[16u8],
            deck.part1[17u8], deck.part1[18u8], deck.part1[19u8], deck.part1[20u8],
            deck.part1[21u8], deck.part1[22u8], deck.part1[23u8], deck.part1[24u8],
            deck.part1[25u8]
        ];
    }
    
    inline extract_quarter3(deck: Deck) -> [u128; 13] {
        return [
            deck.part2[0u8], deck.part2[1u8], deck.part2[2u8], deck.part2[3u8],
            deck.part2[4u8], deck.part2[5u8], deck.part2[6u8], deck.part2[7u8],
            deck.part2[8u8], deck.part2[9u8], deck.part2[10u8], deck.part2[11u8],
            deck.part2[12u8]
        ];
    }
    
    inline extract_quarter4(deck: Deck) -> [u128; 13] {
        return [
            deck.part2[13u8], deck.part2[14u8], deck.part2[15u8], deck.part2[16u8],
            deck.part2[17u8], deck.part2[18u8], deck.part2[19u8], deck.part2[20u8],
            deck.part2[21u8], deck.part2[22u8], deck.part2[23u8], deck.part2[24u8],
            deck.part2[25u8]
        ];
    }
    
    // Combine quarters into a full deck
    inline combine_quarters(q1: [u128; 13], q2: [u128; 13], q3: [u128; 13], q4: [u128; 13]) -> Deck {
        return Deck {
            part1: [
                q1[0u8], q1[1u8], q1[2u8], q1[3u8], q1[4u8], 
                q1[5u8], q1[6u8], q1[7u8], q1[8u8], q1[9u8], 
                q1[10u8], q1[11u8], q1[12u8],
                q2[0u8], q2[1u8], q2[2u8], q2[3u8], q2[4u8], 
                q2[5u8], q2[6u8], q2[7u8], q2[8u8], q2[9u8], 
                q2[10u8], q2[11u8], q2[12u8]
            ],
            part2: [
                q3[0u8], q3[1u8], q3[2u8], q3[3u8], q3[4u8], 
                q3[5u8], q3[6u8], q3[7u8], q3[8u8], q3[9u8], 
                q3[10u8], q3[11u8], q3[12u8],
                q4[0u8], q4[1u8], q4[2u8], q4[3u8], q4[4u8], 
                q4[5u8], q4[6u8], q4[7u8], q4[8u8], q4[9u8], 
                q4[10u8], q4[11u8], q4[12u8]
            ]
        };
    }
    
    // Process quarters directly in transition functions
    transition encrypt_deck_part1(e: u128, n: u128, deck: Deck) -> [u128; 13] {
        let quarter: [u128; 13] = extract_quarter1(deck);
        let key: u128 = e ^ n;
        
        // Call external functions directly
        return [
            zk_sra_encryption.aleo/process_card(key, quarter[0u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[1u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[2u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[3u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[4u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[5u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[6u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[7u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[8u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[9u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[10u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[11u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[12u8])
        ];
    }
    
    transition encrypt_deck_part2(e: u128, n: u128, deck: Deck) -> [u128; 13] {
        let quarter: [u128; 13] = extract_quarter2(deck);
        let key: u128 = e ^ n;
        
        // Call external functions directly
        return [
            zk_sra_encryption.aleo/process_card(key, quarter[0u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[1u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[2u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[3u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[4u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[5u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[6u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[7u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[8u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[9u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[10u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[11u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[12u8])
        ];
    }
    
    transition encrypt_deck_part3(e: u128, n: u128, deck: Deck) -> [u128; 13] {
        let quarter: [u128; 13] = extract_quarter3(deck);
        let key: u128 = e ^ n;
        
        // Call external functions directly
        return [
            zk_sra_encryption.aleo/process_card(key, quarter[0u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[1u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[2u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[3u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[4u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[5u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[6u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[7u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[8u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[9u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[10u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[11u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[12u8])
        ];
    }
    
    transition encrypt_deck_part4(e: u128, n: u128, deck: Deck) -> [u128; 13] {
        let quarter: [u128; 13] = extract_quarter4(deck);
        let key: u128 = e ^ n;
        
        // Call external functions directly
        return [
            zk_sra_encryption.aleo/process_card(key, quarter[0u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[1u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[2u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[3u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[4u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[5u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[6u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[7u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[8u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[9u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[10u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[11u8]),
            zk_sra_encryption.aleo/process_card(key, quarter[12u8])
        ];
    }
    
    // Combine the processed parts into a full deck
    transition combine_encrypted_deck(
        part1: [u128; 13], 
        part2: [u128; 13], 
        part3: [u128; 13], 
        part4: [u128; 13]
    ) -> Deck {
        return combine_quarters(part1, part2, part3, part4);
    }
    
    // Decrypt functions for hands, flop, turn, and river
    transition decrypt_three_cards(d: u128, n: u128, card1: u128, card2: u128, card3: u128) -> [u128; 3] {
        // Use the decrypt_three_cards from zk_sra_encryption with correct parameters
        return zk_sra_encryption.aleo/decrypt_three_cards(d, n, card1, card2, card3);
    }
    
    transition decrypt_two_cards(d: u128, n: u128, card1: u128, card2: u128) -> [u128; 2] {
        // Use the decrypt_two_cards from zk_sra_encryption with correct parameters
        return zk_sra_encryption.aleo/decrypt_two_cards(d, n, card1, card2);
    }
    
    // Helper functions for external programs
    transition create_deck_from_array(part1: [u128; 26], part2: [u128; 26]) -> Deck {
        return Deck { part1, part2 };
    }
    
    transition deck_to_array(deck: Deck) -> ([u128; 26], [u128; 26]) {
        return (deck.part1, deck.part2);
    }
}