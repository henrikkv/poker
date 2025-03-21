program zk_deck_shuffle.aleo {
    function setup_shuffle(element: i8, deck: [[u32; 26]; 2]) -> (i8, [u32; 26], [u32; 26]) {
        let n: i8 = element.abs();
        if (element < 0i8) {
            return (n, deck[0u8], deck[1u8]);
        } else {
            return (n, deck[1u8], deck[0u8]);
        }
    }
    inline shuffle_deck(n: i8, a: [u32; 26], b: [u32; 26]) -> [[u32; 26]; 2] {
        assert(n >= 1i8);
        assert(n <= 26i8);
        let t0: u32 = 0u32;
        let t1: u32 = 0u32;
        let t2: u32 = 0u32;
        let t3: u32 = 0u32;
        let t4: u32 = 0u32;
        let t5: u32 = 0u32;
        let t6: u32 = 0u32;
        let t7: u32 = 0u32;
        let t8: u32 = 0u32;
        let t9: u32 = 0u32;
        let t10: u32 = 0u32;
        let t11: u32 = 0u32;
        let t12: u32 = 0u32;
        let t13: u32 = 0u32;
        let t14: u32 = 0u32;
        let t15: u32 = 0u32;
        let t16: u32 = 0u32;
        let t17: u32 = 0u32;
        let t18: u32 = 0u32;
        let t19: u32 = 0u32;
        let t20: u32 = 0u32;
        let t21: u32 = 0u32;
        let t22: u32 = 0u32;
        let t23: u32 = 0u32;
        let t24: u32 = 0u32;
        let t25: u32 = 0u32;
        let t26: u32 = 0u32;
        let t27: u32 = 0u32;
        let t28: u32 = 0u32;
        let t29: u32 = 0u32;
        let t30: u32 = 0u32;
        let t31: u32 = 0u32;
        let t32: u32 = 0u32;
        let t33: u32 = 0u32;
        let t34: u32 = 0u32;
        let t35: u32 = 0u32;
        let t36: u32 = 0u32;
        let t37: u32 = 0u32;
        let t38: u32 = 0u32;
        let t39: u32 = 0u32;
        let t40: u32 = 0u32;
        let t41: u32 = 0u32;
        let t42: u32 = 0u32;
        let t43: u32 = 0u32;
        let t44: u32 = 0u32;
        let t45: u32 = 0u32;
        let t46: u32 = 0u32;
        let t47: u32 = 0u32;
        let t48: u32 = 0u32;
        let t49: u32 = 0u32;
        let t50: u32 = 0u32;
        let t51: u32 = 0u32;

        let a_index: u8 = 0u8;
        let b_index: u8 = 0u8;
        for i: i8 in 0i8..52i8 {
            let match: bool = false;
            let use_b: bool = false;
            let use_a: bool = false;
            if (i < n) {
                use_b = true;
                match = true;
            }
            if (!match && ((i - n) % 2i8 == 0i8)) {
                use_a = true;
                match = true;
            }
            if (!match) {
                if (b_index <= 25u8) {
                    use_b = true;
                    match = true;
                } else {
                    use_a = true;
                    match = true;
                }
                
            }
            assert(use_a || use_b);
            assert(match);
            let temp_card: u32 = 0u32;
            if (use_a) {
                if (a_index == 0u8) {
                    temp_card = a[0u8];
                }
                if (a_index == 1u8) {
                    temp_card = a[1u8];
                }
                if (a_index == 2u8) {
                    temp_card = a[2u8];
                }
                if (a_index == 3u8) {
                    temp_card = a[3u8];
                }
                if (a_index == 4u8) {
                    temp_card = a[4u8];
                }
                if (a_index == 5u8) {
                    temp_card = a[5u8];
                }
                if (a_index == 6u8) {
                    temp_card = a[6u8];
                }
                if (a_index == 7u8) {
                    temp_card = a[7u8];
                }
                if (a_index == 8u8) {
                    temp_card = a[8u8];
                }
                if (a_index == 9u8) {
                    temp_card = a[9u8];
                }
                if (a_index == 10u8) {
                    temp_card = a[10u8];
                }
                if (a_index == 11u8) {
                    temp_card = a[11u8];
                }
                if (a_index == 12u8) {
                    temp_card = a[12u8];
                }
                if (a_index == 13u8) {
                    temp_card = a[13u8];
                }
                if (a_index == 14u8) {
                    temp_card = a[14u8];
                }
                if (a_index == 15u8) {
                    temp_card = a[15u8];
                }
                if (a_index == 16u8) {
                    temp_card = a[16u8];
                }
                if (a_index == 17u8) {
                    temp_card = a[17u8];
                }
                if (a_index == 18u8) {
                    temp_card = a[18u8];
                }
                if (a_index == 19u8) {
                    temp_card = a[19u8];
                }
                if (a_index == 20u8) {
                    temp_card = a[20u8];
                }
                if (a_index == 21u8) {
                    temp_card = a[21u8];
                }
                if (a_index == 22u8) {
                    temp_card = a[22u8];
                }
                if (a_index == 23u8) {
                    temp_card = a[23u8];
                }
                if (a_index == 24u8) {
                    temp_card = a[24u8];
                }
                if (a_index == 25u8) {
                    temp_card = a[25u8];
                }
                a_index = a_index + 1u8;
            }
            if (use_b) {
                if (b_index == 0u8) {
                    temp_card = b[0u8];
                }
                if (b_index == 1u8) {
                    temp_card = b[1u8];
                }
                if (b_index == 2u8) {
                    temp_card = b[2u8];
                }
                if (b_index == 3u8) {
                    temp_card = b[3u8];
                }
                if (b_index == 4u8) {
                    temp_card = b[4u8];
                }
                if (b_index == 5u8) {
                    temp_card = b[5u8];
                }
                if (b_index == 6u8) {
                    temp_card = b[6u8];
                }
                if (b_index == 7u8) {
                    temp_card = b[7u8];
                }
                if (b_index == 8u8) {
                    temp_card = b[8u8];
                }
                if (b_index == 9u8) {
                    temp_card = b[9u8];
                }
                if (b_index == 10u8) {
                    temp_card = b[10u8];
                }
                if (b_index == 11u8) {
                    temp_card = b[11u8];
                }
                if (b_index == 12u8) {
                    temp_card = b[12u8];
                }
                if (b_index == 13u8) {
                    temp_card = b[13u8];
                }
                if (b_index == 14u8) {
                    temp_card = b[14u8];
                }
                if (b_index == 15u8) {
                    temp_card = b[15u8];
                }
                if (b_index == 16u8) {
                    temp_card = b[16u8];
                }
                if (b_index == 17u8) {
                    temp_card = b[17u8];
                }
                if (b_index == 18u8) {
                    temp_card = b[18u8];
                }
                if (b_index == 19u8) {
                    temp_card = b[19u8];
                }
                if (b_index == 20u8) {
                    temp_card = b[20u8];
                }
                if (b_index == 21u8) {
                    temp_card = b[21u8];
                }
                if (b_index == 22u8) {
                    temp_card = b[22u8];
                }
                if (b_index == 23u8) {
                    temp_card = b[23u8];
                }
                if (b_index == 24u8) {
                    temp_card = b[24u8];
                }
                if (b_index == 25u8) {
                    temp_card = b[25u8];
                }
                b_index = b_index + 1u8;
            }
            if (i == 0i8) {
                t0 = temp_card;
            }
            if (i == 1i8) {
                t1 = temp_card;
            }
            if (i == 2i8) {
                t2 = temp_card;
            }
            if (i == 3i8) {
                t3 = temp_card;
            }
            if (i == 4i8) {
                t4 = temp_card;
            }
            if (i == 5i8) {
                t5 = temp_card;
            }
            if (i == 6i8) {
                t6 = temp_card;
            }
            if (i == 7i8) {
                t7 = temp_card;
            }
            if (i == 8i8) {
                t8 = temp_card;
            }
            if (i == 9i8) {
                t9 = temp_card;
            }
            if (i == 10i8) {
                t10 = temp_card;
            }
            if (i == 11i8) {
                t11 = temp_card;
            }
            if (i == 12i8) {
                t12 = temp_card;
            }
            if (i == 13i8) {
                t13 = temp_card;
            }
            if (i == 14i8) {
                t14 = temp_card;
            }
            if (i == 15i8) {
                t15 = temp_card;
            }
            if (i == 16i8) {
                t16 = temp_card;
            }
            if (i == 17i8) {
                t17 = temp_card;
            }
            if (i == 18i8) {
                t18 = temp_card;
            }
            if (i == 19i8) {
                t19 = temp_card;
            }
            if (i == 20i8) {
                t20 = temp_card;
            }
            if (i == 21i8) {
                t21 = temp_card;
            }
            if (i == 22i8) {
                t22 = temp_card;
            }
            if (i == 23i8) {
                t23 = temp_card;
            }
            if (i == 24i8) {
                t24 = temp_card;
            }
            if (i == 25i8) {
                t25 = temp_card;
            }
            if (i == 26i8) {
                t26 = temp_card;
            }
            if (i == 27i8) {
                t27 = temp_card;
            }
            if (i == 28i8) {
                t28 = temp_card;
            }
            if (i == 29i8) {
                t29 = temp_card;
            }
            if (i == 30i8) {
                t30 = temp_card;
            }
            if (i == 31i8) {
                t31 = temp_card;
            }
            if (i == 32i8) {
                t32 = temp_card;
            }
            if (i == 33i8) {
                t33 = temp_card;
            }
            if (i == 34i8) {
                t34 = temp_card;
            }
            if (i == 35i8) {
                t35 = temp_card;
            }
            if (i == 36i8) {
                t36 = temp_card;
            }
            if (i == 37i8) {
                t37 = temp_card;
            }
            if (i == 38i8) {
                t38 = temp_card;
            }
            if (i == 39i8) {
                t39 = temp_card;
            }
            if (i == 40i8) {
                t40 = temp_card;
            }
            if (i == 41i8) {
                t41 = temp_card;
            }
            if (i == 42i8) {
                t42 = temp_card;
            }
            if (i == 43i8) {
                t43 = temp_card;
            }
            if (i == 44i8) {
                t44 = temp_card;
            }
            if (i == 45i8) {
                t45 = temp_card;
            }
            if (i == 46i8) {
                t46 = temp_card;
            }
            if (i == 47i8) {
                t47 = temp_card;
            }
            if (i == 48i8) {
                t48 = temp_card;
            }
            if (i == 49i8) {
                t49 = temp_card;
            }
            if (i == 50i8) {
                t50 = temp_card;
            }
            if (i == 51i8) {
                t51 = temp_card;
            }
        }

        assert(a_index == 26u8);
        assert(b_index == 26u8);
        return [[t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13, t14, t15, t16, t17, t18, t19, t20, t21, t22, t23, t24, t25], [t26, t27, t28, t29, t30, t31, t32, t33, t34, t35, t36, t37, t38, t39, t40, t41, t42, t43, t44, t45, t46, t47, t48, t49, t50, t51]];
    }
    /*
    transition shuffle(deck: [[u32; 26]; 2], s0: i8, s1: i8, s2: i8, s3: i8) -> [[u32; 26]; 2] {
        let (n1, a1, b1): (i8, [u32; 26], [u32; 26]) = setup_shuffle(s0, deck);
        deck = shuffle_deck(n1, a1, b1);
        let (n2, a2, b2): (i8, [u32; 26], [u32; 26]) = setup_shuffle(s1, deck);
        deck = shuffle_deck(n2, a2, b2);
        let (n3, a3, b3): (i8, [u32; 26], [u32; 26]) = setup_shuffle(s2, deck);
        deck = shuffle_deck(n3, a3, b3);
        let (n4, a4, b4): (i8, [u32; 26], [u32; 26]) = setup_shuffle(s3, deck);
        deck = shuffle_deck(n4, a4, b4);
        return deck;
    }
*/
    transition foo() {
        return;
    }
}
