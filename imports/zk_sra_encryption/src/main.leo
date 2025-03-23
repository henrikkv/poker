program zk_sra_encryption.aleo {
    // Ultra simple card transformation using XOR
    // Minimal variable usage, suitable for ZK environments with strict limits
    function transform_card(card: u128, key: u128) -> u128 {
        return card ^ key; // Simple XOR operation
    }
    
    // Process a card with the supplied key
    transition process_card(key: u128, card: u128) -> u128 {
        return transform_card(card, key);
    }

    // Decrypt a card - just XOR with the same key again
    transition decrypt_card(key: u128, card: u128) -> u128 {
        return transform_card(card, key);
    }
    
    // Process multiple cards at once
    transition process_two_cards(key: u128, card1: u128, card2: u128) -> [u128; 2] {
        return [transform_card(card1, key), transform_card(card2, key)];
    }
    
    transition process_three_cards(key: u128, card1: u128, card2: u128, card3: u128) -> [u128; 3] {
        return [transform_card(card1, key), transform_card(card2, key), transform_card(card3, key)];
    }
    
    // Decrypt multiple cards at once - with two key parameters (d, n) as required by calling code
    transition decrypt_two_cards(key1: u128, key2: u128, card1: u128, card2: u128) -> [u128; 2] {
        let combined_key: u128 = key1 ^ key2; // Combine the keys
        return [transform_card(card1, combined_key), transform_card(card2, combined_key)];
    }
    
    transition decrypt_three_cards(key1: u128, key2: u128, card1: u128, card2: u128, card3: u128) -> [u128; 3] {
        let combined_key: u128 = key1 ^ key2; // Combine the keys
        return [transform_card(card1, combined_key), transform_card(card2, combined_key), transform_card(card3, combined_key)];
    }
    
    // Test functions
    transition test_encryption(public card: u128, key: u128) -> (u128, u128) {
        let encrypted: u128 = transform_card(card, key);
        let decrypted: u128 = transform_card(encrypted, key);
        assert_eq(card, decrypted); // XOR twice with same key returns original
        return (encrypted, decrypted);
    }
}