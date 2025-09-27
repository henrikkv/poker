program zk_sra_encryption.aleo {
    @noupgrade
    async constructor() {}

    function exp_by_squaring(base: u128, exp: u128, modulus: u128) -> u128 {
        let result: u128 = 1u128;
        let current_base: u128 = base;

        for i: u8 in 0u8..32u8 {
            if (exp % 2u128 == 1u128) { 
                result = (result * current_base) % modulus;
            }
            current_base = (current_base * current_base) % modulus;
            exp >>= 1u8; // divide by two
        }

        return result as u128;
    }
    
    transition encrypt_deck(e: u128, n: u128, deck: [[u128; 26]; 2]) -> [[u128; 26]; 2] {
        let bottom_half: [u128; 26] = deck[0u8];
        let top_half: [u128; 26] = deck[1u8];
         let t0: u128 = exp_by_squaring(bottom_half[0u8], e, n);
        let t1: u128 = exp_by_squaring(bottom_half[1u8], e, n);
        let t2: u128 = exp_by_squaring(bottom_half[2u8], e, n);
        let t3: u128 = exp_by_squaring(bottom_half[3u8], e, n);
        let t4: u128 = exp_by_squaring(bottom_half[4u8], e, n);
        let t5: u128 = exp_by_squaring(bottom_half[5u8], e, n);
        let t6: u128 = exp_by_squaring(bottom_half[6u8], e, n);
        let t7: u128 = exp_by_squaring(bottom_half[7u8], e, n);
        let t8: u128 = exp_by_squaring(bottom_half[8u8], e, n);
        let t9: u128 = exp_by_squaring(bottom_half[9u8], e, n);
        let t10: u128 = exp_by_squaring(bottom_half[10u8], e, n);
        let t11: u128 = exp_by_squaring(bottom_half[11u8], e, n);
        let t12: u128 = exp_by_squaring(bottom_half[12u8], e, n);
        let t13: u128 = exp_by_squaring(bottom_half[13u8], e, n);
        let t14: u128 = exp_by_squaring(bottom_half[14u8], e, n);
        let t15: u128 = exp_by_squaring(bottom_half[15u8], e, n);
        let t16: u128 = exp_by_squaring(bottom_half[16u8], e, n);
        let t17: u128 = exp_by_squaring(bottom_half[17u8], e, n);
        let t18: u128 = exp_by_squaring(bottom_half[18u8], e, n);
        let t19: u128 = exp_by_squaring(bottom_half[19u8], e, n);
        let t20: u128 = exp_by_squaring(bottom_half[20u8], e, n);
        let t21: u128 = exp_by_squaring(bottom_half[21u8], e, n);
        let t22: u128 = exp_by_squaring(bottom_half[22u8], e, n);
        let t23: u128 = exp_by_squaring(bottom_half[23u8], e, n);
        let t24: u128 = exp_by_squaring(bottom_half[24u8], e, n);
        let t25: u128 = exp_by_squaring(bottom_half[25u8], e, n);
        let t26: u128 = exp_by_squaring(top_half[0u8], e, n);
        let t27: u128 = exp_by_squaring(top_half[1u8], e, n);
        let t28: u128 = exp_by_squaring(top_half[2u8], e, n);
        let t29: u128 = exp_by_squaring(top_half[3u8], e, n);
        let t30: u128 = exp_by_squaring(top_half[4u8], e, n);
        let t31: u128 = exp_by_squaring(top_half[5u8], e, n);
        let t32: u128 = exp_by_squaring(top_half[6u8], e, n);
        let t33: u128 = exp_by_squaring(top_half[7u8], e, n);
        let t34: u128 = exp_by_squaring(top_half[8u8], e, n);
        let t35: u128 = exp_by_squaring(top_half[9u8], e, n);
        let t36: u128 = exp_by_squaring(top_half[10u8], e, n);
        let t37: u128 = exp_by_squaring(top_half[11u8], e, n);
        let t38: u128 = exp_by_squaring(top_half[12u8], e, n);
        let t39: u128 = exp_by_squaring(top_half[13u8], e, n);
        let t40: u128 = exp_by_squaring(top_half[14u8], e, n);
        let t41: u128 = exp_by_squaring(top_half[15u8], e, n);
        let t42: u128 = exp_by_squaring(top_half[16u8], e, n);
        let t43: u128 = exp_by_squaring(top_half[17u8], e, n);
        let t44: u128 = exp_by_squaring(top_half[18u8], e, n);
        let t45: u128 = exp_by_squaring(top_half[19u8], e, n);
        let t46: u128 = exp_by_squaring(top_half[20u8], e, n);
        let t47: u128 = exp_by_squaring(top_half[21u8], e, n);
        let t48: u128 = exp_by_squaring(top_half[22u8], e, n);
        let t49: u128 = exp_by_squaring(top_half[23u8], e, n);
        let t50: u128 = exp_by_squaring(top_half[24u8], e, n);
        let t51: u128 = exp_by_squaring(top_half[25u8], e, n);
        return [[t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, t10,
                 t11, t12, t13, t14, t15, t16, t17, t18, t19, t20,
                 t21, t22, t23, t24, t25],
                [t26, t27, t28, t29, t30, t31, t32, t33, t34, t35,
                 t36, t37, t38, t39, t40, t41, t42, t43, t44, t45,
                 t46, t47, t48, t49, t50, t51]];
    }

    transition decrypt_deck(d: u128, n: u128, deck: [[u128; 26]; 2]) -> [[u128; 26]; 2] {
        let bottom_half: [u128; 26] = deck[0u8];
        let top_half: [u128; 26] = deck[1u8];
        let t0: u128 = exp_by_squaring(bottom_half[0u8], d, n);
        let t1: u128 = exp_by_squaring(bottom_half[1u8], d, n);
        let t2: u128 = exp_by_squaring(bottom_half[2u8], d, n);
        let t3: u128 = exp_by_squaring(bottom_half[3u8], d, n);
        let t4: u128 = exp_by_squaring(bottom_half[4u8], d, n);
        let t5: u128 = exp_by_squaring(bottom_half[5u8], d, n);
        let t6: u128 = exp_by_squaring(bottom_half[6u8], d, n);
        let t7: u128 = exp_by_squaring(bottom_half[7u8], d, n);
        let t8: u128 = exp_by_squaring(bottom_half[8u8], d, n);
        let t9: u128 = exp_by_squaring(bottom_half[9u8], d, n);
        let t10: u128 = exp_by_squaring(bottom_half[10u8], d, n);
        let t11: u128 = exp_by_squaring(bottom_half[11u8], d, n);
        let t12: u128 = exp_by_squaring(bottom_half[12u8], d, n);
        let t13: u128 = exp_by_squaring(bottom_half[13u8], d, n);
        let t14: u128 = exp_by_squaring(bottom_half[14u8], d, n);
        let t15: u128 = exp_by_squaring(bottom_half[15u8], d, n);
        let t16: u128 = exp_by_squaring(bottom_half[16u8], d, n);
        let t17: u128 = exp_by_squaring(bottom_half[17u8], d, n);
        let t18: u128 = exp_by_squaring(bottom_half[18u8], d, n);
        let t19: u128 = exp_by_squaring(bottom_half[19u8], d, n);
        let t20: u128 = exp_by_squaring(bottom_half[20u8], d, n);
        let t21: u128 = exp_by_squaring(bottom_half[21u8], d, n);
        let t22: u128 = exp_by_squaring(bottom_half[22u8], d, n);
        let t23: u128 = exp_by_squaring(bottom_half[23u8], d, n);
        let t24: u128 = exp_by_squaring(bottom_half[24u8], d, n);
        let t25: u128 = exp_by_squaring(bottom_half[25u8], d, n);
        let t26: u128 = exp_by_squaring(top_half[0u8], d, n);
        let t27: u128 = exp_by_squaring(top_half[1u8], d, n);
        let t28: u128 = exp_by_squaring(top_half[2u8], d, n);
        let t29: u128 = exp_by_squaring(top_half[3u8], d, n);
        let t30: u128 = exp_by_squaring(top_half[4u8], d, n);
        let t31: u128 = exp_by_squaring(top_half[5u8], d, n);
        let t32: u128 = exp_by_squaring(top_half[6u8], d, n);
        let t33: u128 = exp_by_squaring(top_half[7u8], d, n);
        let t34: u128 = exp_by_squaring(top_half[8u8], d, n);
        let t35: u128 = exp_by_squaring(top_half[9u8], d, n);
        let t36: u128 = exp_by_squaring(top_half[10u8], d, n);
        let t37: u128 = exp_by_squaring(top_half[11u8], d, n);
        let t38: u128 = exp_by_squaring(top_half[12u8], d, n);
        let t39: u128 = exp_by_squaring(top_half[13u8], d, n);
        let t40: u128 = exp_by_squaring(top_half[14u8], d, n);
        let t41: u128 = exp_by_squaring(top_half[15u8], d, n);
        let t42: u128 = exp_by_squaring(top_half[16u8], d, n);
        let t43: u128 = exp_by_squaring(top_half[17u8], d, n);
        let t44: u128 = exp_by_squaring(top_half[18u8], d, n);
        let t45: u128 = exp_by_squaring(top_half[19u8], d, n);
        let t46: u128 = exp_by_squaring(top_half[20u8], d, n);
        let t47: u128 = exp_by_squaring(top_half[21u8], d, n);
        let t48: u128 = exp_by_squaring(top_half[22u8], d, n);
        let t49: u128 = exp_by_squaring(top_half[23u8], d, n);
        let t50: u128 = exp_by_squaring(top_half[24u8], d, n);
        let t51: u128 = exp_by_squaring(top_half[25u8], d, n);
        return [[t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, t10,
                 t11, t12, t13, t14, t15, t16, t17, t18, t19, t20,
                 t21, t22, t23, t24, t25],
                [t26, t27, t28, t29, t30, t31, t32, t33, t34, t35,
                 t36, t37, t38, t39, t40, t41, t42, t43, t44, t45,
                 t46, t47, t48, t49, t50, t51]];
    }

    transition encrypt_deck_per_card(deck_e: [[u128; 26]; 2], n: u128, deck: [[u128; 26]; 2]) -> [[u128; 26]; 2] {
        let bottom_half: [u128; 26] = deck[0u8];
        let top_half: [u128; 26] = deck[1u8];
        let bottom_half_e: [u128; 26] = deck_e[0u8];
        let top_half_e: [u128; 26] = deck_e[1u8];
        // Encrypt per card
        let t0: u128 = exp_by_squaring(bottom_half[0u8], bottom_half_e[0u8], n);
        let t1: u128 = exp_by_squaring(bottom_half[1u8], bottom_half_e[1u8], n);
        let t2: u128 = exp_by_squaring(bottom_half[2u8], bottom_half_e[2u8], n);
        let t3: u128 = exp_by_squaring(bottom_half[3u8], bottom_half_e[3u8], n);
        let t4: u128 = exp_by_squaring(bottom_half[4u8], bottom_half_e[4u8], n);
        let t5: u128 = exp_by_squaring(bottom_half[5u8], bottom_half_e[5u8], n);
        let t6: u128 = exp_by_squaring(bottom_half[6u8], bottom_half_e[6u8], n);
        let t7: u128 = exp_by_squaring(bottom_half[7u8], bottom_half_e[7u8], n);
        let t8: u128 = exp_by_squaring(bottom_half[8u8], bottom_half_e[8u8], n);
        let t9: u128 = exp_by_squaring(bottom_half[9u8], bottom_half_e[9u8], n);
        let t10: u128 = exp_by_squaring(bottom_half[10u8], bottom_half_e[10u8], n);
        let t11: u128 = exp_by_squaring(bottom_half[11u8], bottom_half_e[11u8], n);
        let t12: u128 = exp_by_squaring(bottom_half[12u8], bottom_half_e[12u8], n);
        let t13: u128 = exp_by_squaring(bottom_half[13u8], bottom_half_e[13u8], n);
        let t14: u128 = exp_by_squaring(bottom_half[14u8], bottom_half_e[14u8], n);
        let t15: u128 = exp_by_squaring(bottom_half[15u8], bottom_half_e[15u8], n);
        let t16: u128 = exp_by_squaring(bottom_half[16u8], bottom_half_e[16u8], n);
        let t17: u128 = exp_by_squaring(bottom_half[17u8], bottom_half_e[17u8], n);
        let t18: u128 = exp_by_squaring(bottom_half[18u8], bottom_half_e[18u8], n);
        let t19: u128 = exp_by_squaring(bottom_half[19u8], bottom_half_e[19u8], n);
        let t20: u128 = exp_by_squaring(bottom_half[20u8], bottom_half_e[20u8], n);
        let t21: u128 = exp_by_squaring(bottom_half[21u8], bottom_half_e[21u8], n);
        let t22: u128 = exp_by_squaring(bottom_half[22u8], bottom_half_e[22u8], n);
        let t23: u128 = exp_by_squaring(bottom_half[23u8], bottom_half_e[23u8], n);
        let t24: u128 = exp_by_squaring(bottom_half[24u8], bottom_half_e[24u8], n);
        let t25: u128 = exp_by_squaring(bottom_half[25u8], bottom_half_e[25u8], n);
        let t26: u128 = exp_by_squaring(top_half[0u8], top_half_e[0u8], n);
        let t27: u128 = exp_by_squaring(top_half[1u8], top_half_e[1u8], n);
        let t28: u128 = exp_by_squaring(top_half[2u8], top_half_e[2u8], n);
        let t29: u128 = exp_by_squaring(top_half[3u8], top_half_e[3u8], n);
        let t30: u128 = exp_by_squaring(top_half[4u8], top_half_e[4u8], n);
        let t31: u128 = exp_by_squaring(top_half[5u8], top_half_e[5u8], n);
        let t32: u128 = exp_by_squaring(top_half[6u8], top_half_e[6u8], n);
        let t33: u128 = exp_by_squaring(top_half[7u8], top_half_e[7u8], n);
        let t34: u128 = exp_by_squaring(top_half[8u8], top_half_e[8u8], n);
        let t35: u128 = exp_by_squaring(top_half[9u8], top_half_e[9u8], n);
        let t36: u128 = exp_by_squaring(top_half[10u8], top_half_e[10u8], n);
        let t37: u128 = exp_by_squaring(top_half[11u8], top_half_e[11u8], n);
        let t38: u128 = exp_by_squaring(top_half[12u8], top_half_e[12u8], n);
        let t39: u128 = exp_by_squaring(top_half[13u8], top_half_e[13u8], n);
        let t40: u128 = exp_by_squaring(top_half[14u8], top_half_e[14u8], n);
        let t41: u128 = exp_by_squaring(top_half[15u8], top_half_e[15u8], n);
        let t42: u128 = exp_by_squaring(top_half[16u8], top_half_e[16u8], n);
        let t43: u128 = exp_by_squaring(top_half[17u8], top_half_e[17u8], n);
        let t44: u128 = exp_by_squaring(top_half[18u8], top_half_e[18u8], n);
        let t45: u128 = exp_by_squaring(top_half[19u8], top_half_e[19u8], n);
        let t46: u128 = exp_by_squaring(top_half[20u8], top_half_e[20u8], n);
        let t47: u128 = exp_by_squaring(top_half[21u8], top_half_e[21u8], n);
        let t48: u128 = exp_by_squaring(top_half[22u8], top_half_e[22u8], n);
        let t49: u128 = exp_by_squaring(top_half[23u8], top_half_e[23u8], n);
        let t50: u128 = exp_by_squaring(top_half[24u8], top_half_e[24u8], n);
        let t51: u128 = exp_by_squaring(top_half[25u8], top_half_e[25u8], n);
        return [[t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, t10,
                 t11, t12, t13, t14, t15, t16, t17, t18, t19, t20,
                 t21, t22, t23, t24, t25],
                [t26, t27, t28, t29, t30, t31, t32, t33, t34, t35,
                 t36, t37, t38, t39, t40, t41, t42, t43, t44, t45,
                 t46, t47, t48, t49, t50, t51]];
    }
    transition decrypt_card(d: u128, n: u128, card: u128) -> u128 {
        return exp_by_squaring(card, d, n);
    }

    transition test_encrypt_exp_by_squaring(public m: u128, e: u128, d: u128, n: u128) -> (u128, u128) {
      let c: u128 = exp_by_squaring(m, e, n);
      let p: u128 = exp_by_squaring(c, d, n);
      assert_eq(m, p);
      return (c, p);
    }

    transition test_exp_by_squaring(public m: u128, d1: u128, d2: u128, n: u128) -> (u128, u128) {
      let m1: u128 = exp_by_squaring(m, d1, n);
      let p: u128 = exp_by_squaring(m1, d2, n);
      return (m1, p);
    }
}
