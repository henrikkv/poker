program commutative_encryption.aleo {
    @noupgrade
    async constructor() {}

    transition encrypt_deck(secret: scalar, deck: [[group; 26]; 2]) -> [[group; 26]; 2] {
        let bottom_half: [group; 26] = deck[0u8];
        let top_half: [group; 26] = deck[1u8];

        let t0: group = bottom_half[0u8] * secret;
        let t1: group = bottom_half[1u8] * secret;
        let t2: group = bottom_half[2u8] * secret;
        let t3: group = bottom_half[3u8] * secret;
        let t4: group = bottom_half[4u8] * secret;
        let t5: group = bottom_half[5u8] * secret;
        let t6: group = bottom_half[6u8] * secret;
        let t7: group = bottom_half[7u8] * secret;
        let t8: group = bottom_half[8u8] * secret;
        let t9: group = bottom_half[9u8] * secret;
        let t10: group = bottom_half[10u8] * secret;
        let t11: group = bottom_half[11u8] * secret;
        let t12: group = bottom_half[12u8] * secret;
        let t13: group = bottom_half[13u8] * secret;
        let t14: group = bottom_half[14u8] * secret;
        let t15: group = bottom_half[15u8] * secret;
        let t16: group = bottom_half[16u8] * secret;
        let t17: group = bottom_half[17u8] * secret;
        let t18: group = bottom_half[18u8] * secret;
        let t19: group = bottom_half[19u8] * secret;
        let t20: group = bottom_half[20u8] * secret;
        let t21: group = bottom_half[21u8] * secret;
        let t22: group = bottom_half[22u8] * secret;
        let t23: group = bottom_half[23u8] * secret;
        let t24: group = bottom_half[24u8] * secret;
        let t25: group = bottom_half[25u8] * secret;
        let t26: group = top_half[0u8] * secret;
        let t27: group = top_half[1u8] * secret;
        let t28: group = top_half[2u8] * secret;
        let t29: group = top_half[3u8] * secret;
        let t30: group = top_half[4u8] * secret;
        let t31: group = top_half[5u8] * secret;
        let t32: group = top_half[6u8] * secret;
        let t33: group = top_half[7u8] * secret;
        let t34: group = top_half[8u8] * secret;
        let t35: group = top_half[9u8] * secret;
        let t36: group = top_half[10u8] * secret;
        let t37: group = top_half[11u8] * secret;
        let t38: group = top_half[12u8] * secret;
        let t39: group = top_half[13u8] * secret;
        let t40: group = top_half[14u8] * secret;
        let t41: group = top_half[15u8] * secret;
        let t42: group = top_half[16u8] * secret;
        let t43: group = top_half[17u8] * secret;
        let t44: group = top_half[18u8] * secret;
        let t45: group = top_half[19u8] * secret;
        let t46: group = top_half[20u8] * secret;
        let t47: group = top_half[21u8] * secret;
        let t48: group = top_half[22u8] * secret;
        let t49: group = top_half[23u8] * secret;
        let t50: group = top_half[24u8] * secret;
        let t51: group = top_half[25u8] * secret;

        return [[t0,  t1,  t2,  t3,  t4,  t5,  t6,  t7,  t8,  t9,  t10, t11, t12, t13, t14, t15, t16, t17, t18, t19, t20, t21, t22, t23, t24, t25],
                [t26, t27, t28, t29, t30, t31, t32, t33, t34, t35, t36, t37, t38, t39, t40, t41, t42, t43, t44, t45, t46, t47, t48, t49, t50, t51]];
    }

    transition decrypt_deck(secret_inv: scalar, deck: [[group; 26]; 2]) -> [[group; 26]; 2] {
        let bottom_half: [group; 26] = deck[0u8];
        let top_half: [group; 26] = deck[1u8];

        let t0: group = bottom_half[0u8] * secret_inv;
        let t1: group = bottom_half[1u8] * secret_inv;
        let t2: group = bottom_half[2u8] * secret_inv;
        let t3: group = bottom_half[3u8] * secret_inv;
        let t4: group = bottom_half[4u8] * secret_inv;
        let t5: group = bottom_half[5u8] * secret_inv;
        let t6: group = bottom_half[6u8] * secret_inv;
        let t7: group = bottom_half[7u8] * secret_inv;
        let t8: group = bottom_half[8u8] * secret_inv;
        let t9: group = bottom_half[9u8] * secret_inv;
        let t10: group = bottom_half[10u8] * secret_inv;
        let t11: group = bottom_half[11u8] * secret_inv;
        let t12: group = bottom_half[12u8] * secret_inv;
        let t13: group = bottom_half[13u8] * secret_inv;
        let t14: group = bottom_half[14u8] * secret_inv;
        let t15: group = bottom_half[15u8] * secret_inv;
        let t16: group = bottom_half[16u8] * secret_inv;
        let t17: group = bottom_half[17u8] * secret_inv;
        let t18: group = bottom_half[18u8] * secret_inv;
        let t19: group = bottom_half[19u8] * secret_inv;
        let t20: group = bottom_half[20u8] * secret_inv;
        let t21: group = bottom_half[21u8] * secret_inv;
        let t22: group = bottom_half[22u8] * secret_inv;
        let t23: group = bottom_half[23u8] * secret_inv;
        let t24: group = bottom_half[24u8] * secret_inv;
        let t25: group = bottom_half[25u8] * secret_inv;
        let t26: group = top_half[0u8] * secret_inv;
        let t27: group = top_half[1u8] * secret_inv;
        let t28: group = top_half[2u8] * secret_inv;
        let t29: group = top_half[3u8] * secret_inv;
        let t30: group = top_half[4u8] * secret_inv;
        let t31: group = top_half[5u8] * secret_inv;
        let t32: group = top_half[6u8] * secret_inv;
        let t33: group = top_half[7u8] * secret_inv;
        let t34: group = top_half[8u8] * secret_inv;
        let t35: group = top_half[9u8] * secret_inv;
        let t36: group = top_half[10u8] * secret_inv;
        let t37: group = top_half[11u8] * secret_inv;
        let t38: group = top_half[12u8] * secret_inv;
        let t39: group = top_half[13u8] * secret_inv;
        let t40: group = top_half[14u8] * secret_inv;
        let t41: group = top_half[15u8] * secret_inv;
        let t42: group = top_half[16u8] * secret_inv;
        let t43: group = top_half[17u8] * secret_inv;
        let t44: group = top_half[18u8] * secret_inv;
        let t45: group = top_half[19u8] * secret_inv;
        let t46: group = top_half[20u8] * secret_inv;
        let t47: group = top_half[21u8] * secret_inv;
        let t48: group = top_half[22u8] * secret_inv;
        let t49: group = top_half[23u8] * secret_inv;
        let t50: group = top_half[24u8] * secret_inv;
        let t51: group = top_half[25u8] * secret_inv;

        return [[t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, t10,
                 t11, t12, t13, t14, t15, t16, t17, t18, t19, t20,
                 t21, t22, t23, t24, t25],
                [t26, t27, t28, t29, t30, t31, t32, t33, t34, t35,
                 t36, t37, t38, t39, t40, t41, t42, t43, t44, t45,
                 t46, t47, t48, t49, t50, t51]];
    }

    transition decrypt_card(secret_inv: scalar, card: group) -> group {
        return card * secret_inv;
    }

    transition initialize_deck() -> [[group; 26]; 2] {
        return [[
            Poseidon2::hash_to_group(0u8), Poseidon2::hash_to_group(1u8), Poseidon2::hash_to_group(2u8), Poseidon2::hash_to_group(3u8),
            Poseidon2::hash_to_group(4u8), Poseidon2::hash_to_group(5u8), Poseidon2::hash_to_group(6u8), Poseidon2::hash_to_group(7u8),
            Poseidon2::hash_to_group(8u8), Poseidon2::hash_to_group(9u8), Poseidon2::hash_to_group(10u8), Poseidon2::hash_to_group(11u8),
            Poseidon2::hash_to_group(12u8), Poseidon2::hash_to_group(13u8), Poseidon2::hash_to_group(14u8), Poseidon2::hash_to_group(15u8),
            Poseidon2::hash_to_group(16u8), Poseidon2::hash_to_group(17u8), Poseidon2::hash_to_group(18u8), Poseidon2::hash_to_group(19u8),
            Poseidon2::hash_to_group(20u8), Poseidon2::hash_to_group(21u8), Poseidon2::hash_to_group(22u8), Poseidon2::hash_to_group(23u8),
            Poseidon2::hash_to_group(24u8), Poseidon2::hash_to_group(25u8)
        ], [
            Poseidon2::hash_to_group(26u8), Poseidon2::hash_to_group(27u8), Poseidon2::hash_to_group(28u8), Poseidon2::hash_to_group(29u8),
            Poseidon2::hash_to_group(30u8), Poseidon2::hash_to_group(31u8), Poseidon2::hash_to_group(32u8), Poseidon2::hash_to_group(33u8),
            Poseidon2::hash_to_group(34u8), Poseidon2::hash_to_group(35u8), Poseidon2::hash_to_group(36u8), Poseidon2::hash_to_group(37u8),
            Poseidon2::hash_to_group(38u8), Poseidon2::hash_to_group(39u8), Poseidon2::hash_to_group(40u8), Poseidon2::hash_to_group(41u8),
            Poseidon2::hash_to_group(42u8), Poseidon2::hash_to_group(43u8), Poseidon2::hash_to_group(44u8), Poseidon2::hash_to_group(45u8),
            Poseidon2::hash_to_group(46u8), Poseidon2::hash_to_group(47u8), Poseidon2::hash_to_group(48u8), Poseidon2::hash_to_group(49u8),
            Poseidon2::hash_to_group(50u8), Poseidon2::hash_to_group(51u8)
        ]];
    }
}
