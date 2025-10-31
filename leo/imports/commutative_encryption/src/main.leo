program commutative_encryption.aleo {

    transition encrypt_deck(secret: scalar, deck: [group; 52]) -> [group; 52] {
        for i: u8 in 0u8..52u8 {
            deck[i] = deck[i] * secret;
        }
        return deck;
    }

    transition decrypt_deck(secret_inv: scalar, deck: [group; 52]) -> [group; 52] {
        for i: u8 in 0u8..52u8 {
            deck[i] = deck[i] * secret_inv;
        }
        return deck;
    }

    transition decrypt_card(secret_inv: scalar, card: group) -> group {
        return card * secret_inv;
    }

    transition to_u8(g: group) -> u8 {
        return g == Poseidon2::hash_to_group(0u8) ? 0u8 :
               g == Poseidon2::hash_to_group(1u8) ? 1u8 :
               g == Poseidon2::hash_to_group(2u8) ? 2u8 :
               g == Poseidon2::hash_to_group(3u8) ? 3u8 :
               g == Poseidon2::hash_to_group(4u8) ? 4u8 :
               g == Poseidon2::hash_to_group(5u8) ? 5u8 :
               g == Poseidon2::hash_to_group(6u8) ? 6u8 :
               g == Poseidon2::hash_to_group(7u8) ? 7u8 :
               g == Poseidon2::hash_to_group(8u8) ? 8u8 :
               g == Poseidon2::hash_to_group(9u8) ? 9u8 :
               g == Poseidon2::hash_to_group(10u8) ? 10u8 :
               g == Poseidon2::hash_to_group(11u8) ? 11u8 :
               g == Poseidon2::hash_to_group(12u8) ? 12u8 :
               g == Poseidon2::hash_to_group(13u8) ? 13u8 :
               g == Poseidon2::hash_to_group(14u8) ? 14u8 :
               g == Poseidon2::hash_to_group(15u8) ? 15u8 :
               g == Poseidon2::hash_to_group(16u8) ? 16u8 :
               g == Poseidon2::hash_to_group(17u8) ? 17u8 :
               g == Poseidon2::hash_to_group(18u8) ? 18u8 :
               g == Poseidon2::hash_to_group(19u8) ? 19u8 :
               g == Poseidon2::hash_to_group(20u8) ? 20u8 :
               g == Poseidon2::hash_to_group(21u8) ? 21u8 :
               g == Poseidon2::hash_to_group(22u8) ? 22u8 :
               g == Poseidon2::hash_to_group(23u8) ? 23u8 :
               g == Poseidon2::hash_to_group(24u8) ? 24u8 :
               g == Poseidon2::hash_to_group(25u8) ? 25u8 :
               g == Poseidon2::hash_to_group(26u8) ? 26u8 :
               g == Poseidon2::hash_to_group(27u8) ? 27u8 :
               g == Poseidon2::hash_to_group(28u8) ? 28u8 :
               g == Poseidon2::hash_to_group(29u8) ? 29u8 :
               g == Poseidon2::hash_to_group(30u8) ? 30u8 :
               g == Poseidon2::hash_to_group(31u8) ? 31u8 :
               g == Poseidon2::hash_to_group(32u8) ? 32u8 :
               g == Poseidon2::hash_to_group(33u8) ? 33u8 :
               g == Poseidon2::hash_to_group(34u8) ? 34u8 :
               g == Poseidon2::hash_to_group(35u8) ? 35u8 :
               g == Poseidon2::hash_to_group(36u8) ? 36u8 :
               g == Poseidon2::hash_to_group(37u8) ? 37u8 :
               g == Poseidon2::hash_to_group(38u8) ? 38u8 :
               g == Poseidon2::hash_to_group(39u8) ? 39u8 :
               g == Poseidon2::hash_to_group(40u8) ? 40u8 :
               g == Poseidon2::hash_to_group(41u8) ? 41u8 :
               g == Poseidon2::hash_to_group(42u8) ? 42u8 :
               g == Poseidon2::hash_to_group(43u8) ? 43u8 :
               g == Poseidon2::hash_to_group(44u8) ? 44u8 :
               g == Poseidon2::hash_to_group(45u8) ? 45u8 :
               g == Poseidon2::hash_to_group(46u8) ? 46u8 :
               g == Poseidon2::hash_to_group(47u8) ? 47u8 :
               g == Poseidon2::hash_to_group(48u8) ? 48u8 :
               g == Poseidon2::hash_to_group(49u8) ? 49u8 :
               g == Poseidon2::hash_to_group(50u8) ? 50u8 :
               g == Poseidon2::hash_to_group(51u8) ? 51u8 : 255u8;
    }

    transition initialize_deck() -> [group; 52] {
        let deck: [group; 52] = [0group; 52];
        for i: u8 in 0u8..52u8 {
            deck[i] = Poseidon2::hash_to_group(i);
        }
        return deck;
    }

    transition verify_permutation(deck_a: [group; 52], deck_b: [group; 52]) {
        let product_a: field = 1field;
        for i: u8 in 0u8..52u8 {
            product_a *= deck_a[i] as field;
        }

        let product_b: field = 1field;
        for i: u8 in 0u8..52u8 {
            product_b *= deck_b[i] as field;
        }
        assert_eq(product_a, product_b);
    }

    @noupgrade
    async constructor() {}
}
