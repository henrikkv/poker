program zk_deck_shuffle.aleo {

    inline get_new_deck() -> [[u128; 26]; 2] {
        return [[1u128, 2u128, 3u128, 4u128, 5u128, 6u128, 7u128, 8u128, 9u128, 10u128, 11u128, 12u128, 13u128, 14u128, 15u128, 16u128, 17u128, 18u128, 19u128, 20u128, 21u128, 22u128, 23u128, 24u128, 25u128, 26u128],
                [27u128, 28u128, 29u128, 30u128, 31u128, 32u128, 33u128, 34u128, 35u128, 36u128, 37u128, 38u128, 39u128, 40u128, 41u128, 42u128, 43u128, 44u128, 45u128, 46u128, 47u128, 48u128, 49u128, 50u128, 51u128, 52u128]];
    }

    function setup_shuffle(element: i8, deck: [[u128; 26]; 2]) -> (i8, [u128; 26], [u128; 26]) {
        let n: i8 = element.abs();
        if (element < 0i8) {
            return (n, deck[0u8], deck[1u8]);
        } else {
            return (n, deck[1u8], deck[0u8]);
        }
    }

    function shuffle_deck(n: i8, member_size: u8, a: [u128; 26], b: [u128; 26]) -> [[u128; 26]; 2] {
        assert(n >= 1i8);
        assert(n <= 26i8);

        let result: [[u128; 26]; 2] = get_new_deck();
        let result_a: [u128;26] = result[0u8];
        let result_b: [u128;26] = result[1u8];
        
        if n == 1i8 {
            result_a = [b[0u8], a[0u8], b[1u8], a[1u8], b[2u8], a[2u8], b[3u8], a[3u8], b[4u8], a[4u8], b[5u8], a[5u8], b[6u8], a[6u8], b[7u8], a[7u8], b[8u8], a[8u8], b[9u8], a[9u8], b[10u8], a[10u8], b[11u8], a[11u8], b[12u8], a[12u8]];
            result_b = [b[13u8], a[13u8], b[14u8], a[14u8], b[15u8], a[15u8], b[16u8], a[16u8], b[17u8], a[17u8], b[18u8], a[18u8], b[19u8], a[19u8], b[20u8], a[20u8], b[21u8], a[21u8], b[22u8], a[22u8], b[23u8], a[23u8], b[24u8], a[24u8], b[25u8], a[25u8]];
        } else if n == 2i8 {
            result_a = [b[0u8], b[1u8], a[0u8], b[2u8], a[1u8], b[3u8], a[2u8], b[4u8], a[3u8], b[5u8], a[4u8], b[6u8], a[5u8], b[7u8], a[6u8], b[8u8], a[7u8], b[9u8], a[8u8], b[10u8], a[9u8], b[11u8], a[10u8], b[12u8], a[11u8], b[13u8]];
            result_b = [a[12u8], b[14u8], a[13u8], b[15u8], a[14u8], b[16u8], a[15u8], b[17u8], a[16u8], b[18u8], a[17u8], b[19u8], a[18u8], b[20u8], a[19u8], b[21u8], a[20u8], b[22u8], a[21u8], b[23u8], a[22u8], b[24u8], a[23u8], b[25u8], a[24u8], a[25u8]];
        } else if n == 3i8 {
            result_a = [b[0u8], b[1u8], b[2u8], a[0u8], b[3u8], a[1u8], b[4u8], a[2u8], b[5u8], a[3u8], b[6u8], a[4u8], b[7u8], a[5u8], b[8u8], a[6u8], b[9u8], a[7u8], b[10u8], a[8u8], b[11u8], a[9u8], b[12u8], a[10u8], b[13u8], a[11u8]];
            result_b = [b[14u8], a[12u8], b[15u8], a[13u8], b[16u8], a[14u8], b[17u8], a[15u8], b[18u8], a[16u8], b[19u8], a[17u8], b[20u8], a[18u8], b[21u8], a[19u8], b[22u8], a[20u8], b[23u8], a[21u8], b[24u8], a[22u8], b[25u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 4i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], a[0u8], b[4u8], a[1u8], b[5u8], a[2u8], b[6u8], a[3u8], b[7u8], a[4u8], b[8u8], a[5u8], b[9u8], a[6u8], b[10u8], a[7u8], b[11u8], a[8u8], b[12u8], a[9u8], b[13u8], a[10u8], b[14u8]];
            result_b = [a[11u8], b[15u8], a[12u8], b[16u8], a[13u8], b[17u8], a[14u8], b[18u8], a[15u8], b[19u8], a[16u8], b[20u8], a[17u8], b[21u8], a[18u8], b[22u8], a[19u8], b[23u8], a[20u8], b[24u8], a[21u8], b[25u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 5i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], a[0u8], b[5u8], a[1u8], b[6u8], a[2u8], b[7u8], a[3u8], b[8u8], a[4u8], b[9u8], a[5u8], b[10u8], a[6u8], b[11u8], a[7u8], b[12u8], a[8u8], b[13u8], a[9u8], b[14u8], a[10u8]];
            result_b = [b[15u8], a[11u8], b[16u8], a[12u8], b[17u8], a[13u8], b[18u8], a[14u8], b[19u8], a[15u8], b[20u8], a[16u8], b[21u8], a[17u8], b[22u8], a[18u8], b[23u8], a[19u8], b[24u8], a[20u8], b[25u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 6i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], a[0u8], b[6u8], a[1u8], b[7u8], a[2u8], b[8u8], a[3u8], b[9u8], a[4u8], b[10u8], a[5u8], b[11u8], a[6u8], b[12u8], a[7u8], b[13u8], a[8u8], b[14u8], a[9u8], b[15u8]];
            result_b = [a[10u8], b[16u8], a[11u8], b[17u8], a[12u8], b[18u8], a[13u8], b[19u8], a[14u8], b[20u8], a[15u8], b[21u8], a[16u8], b[22u8], a[17u8], b[23u8], a[18u8], b[24u8], a[19u8], b[25u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 7i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], a[0u8], b[7u8], a[1u8], b[8u8], a[2u8], b[9u8], a[3u8], b[10u8], a[4u8], b[11u8], a[5u8], b[12u8], a[6u8], b[13u8], a[7u8], b[14u8], a[8u8], b[15u8], a[9u8]];
            result_b = [b[16u8], a[10u8], b[17u8], a[11u8], b[18u8], a[12u8], b[19u8], a[13u8], b[20u8], a[14u8], b[21u8], a[15u8], b[22u8], a[16u8], b[23u8], a[17u8], b[24u8], a[18u8], b[25u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 8i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], a[0u8], b[8u8], a[1u8], b[9u8], a[2u8], b[10u8], a[3u8], b[11u8], a[4u8], b[12u8], a[5u8], b[13u8], a[6u8], b[14u8], a[7u8], b[15u8], a[8u8], b[16u8]];
            result_b = [a[9u8], b[17u8], a[10u8], b[18u8], a[11u8], b[19u8], a[12u8], b[20u8], a[13u8], b[21u8], a[14u8], b[22u8], a[15u8], b[23u8], a[16u8], b[24u8], a[17u8], b[25u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 9i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], a[0u8], b[9u8], a[1u8], b[10u8], a[2u8], b[11u8], a[3u8], b[12u8], a[4u8], b[13u8], a[5u8], b[14u8], a[6u8], b[15u8], a[7u8], b[16u8], a[8u8]];
            result_b = [b[17u8], a[9u8], b[18u8], a[10u8], b[19u8], a[11u8], b[20u8], a[12u8], b[21u8], a[13u8], b[22u8], a[14u8], b[23u8], a[15u8], b[24u8], a[16u8], b[25u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 10i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], a[0u8], b[10u8], a[1u8], b[11u8], a[2u8], b[12u8], a[3u8], b[13u8], a[4u8], b[14u8], a[5u8], b[15u8], a[6u8], b[16u8], a[7u8], b[17u8]];
            result_b = [a[8u8], b[18u8], a[9u8], b[19u8], a[10u8], b[20u8], a[11u8], b[21u8], a[12u8], b[22u8], a[13u8], b[23u8], a[14u8], b[24u8], a[15u8], b[25u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 11i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], b[10u8], a[0u8], b[11u8], a[1u8], b[12u8], a[2u8], b[13u8], a[3u8], b[14u8], a[4u8], b[15u8], a[5u8], b[16u8], a[6u8], b[17u8], a[7u8]];
            result_b = [b[18u8], a[8u8], b[19u8], a[9u8], b[20u8], a[10u8], b[21u8], a[11u8], b[22u8], a[12u8], b[23u8], a[13u8], b[24u8], a[14u8], b[25u8], a[15u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 12i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], b[10u8], b[11u8], a[0u8], b[12u8], a[1u8], b[13u8], a[2u8], b[14u8], a[3u8], b[15u8], a[4u8], b[16u8], a[5u8], b[17u8], a[6u8], b[18u8]];
            result_b = [a[7u8], b[19u8], a[8u8], b[20u8], a[9u8], b[21u8], a[10u8], b[22u8], a[11u8], b[23u8], a[12u8], b[24u8], a[13u8], b[25u8], a[14u8], a[15u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 13i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], b[10u8], b[11u8], b[12u8], a[0u8], b[13u8], a[1u8], b[14u8], a[2u8], b[15u8], a[3u8], b[16u8], a[4u8], b[17u8], a[5u8], b[18u8], a[6u8]];
            result_b = [b[19u8], a[7u8], b[20u8], a[8u8], b[21u8], a[9u8], b[22u8], a[10u8], b[23u8], a[11u8], b[24u8], a[12u8], b[25u8], a[13u8], a[14u8], a[15u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 14i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], b[10u8], b[11u8], b[12u8], b[13u8], a[0u8], b[14u8], a[1u8], b[15u8], a[2u8], b[16u8], a[3u8], b[17u8], a[4u8], b[18u8], a[5u8], b[19u8]];
            result_b = [a[6u8], b[20u8], a[7u8], b[21u8], a[8u8], b[22u8], a[9u8], b[23u8], a[10u8], b[24u8], a[11u8], b[25u8], a[12u8], a[13u8], a[14u8], a[15u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 15i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], b[10u8], b[11u8], b[12u8], b[13u8], b[14u8], a[0u8], b[15u8], a[1u8], b[16u8], a[2u8], b[17u8], a[3u8], b[18u8], a[4u8], b[19u8], a[5u8]];
            result_b = [b[20u8], a[6u8], b[21u8], a[7u8], b[22u8], a[8u8], b[23u8], a[9u8], b[24u8], a[10u8], b[25u8], a[11u8], a[12u8], a[13u8], a[14u8], a[15u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 16i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], b[10u8], b[11u8], b[12u8], b[13u8], b[14u8], b[15u8], a[0u8], b[16u8], a[1u8], b[17u8], a[2u8], b[18u8], a[3u8], b[19u8], a[4u8], b[20u8]];
            result_b = [a[5u8], b[21u8], a[6u8], b[22u8], a[7u8], b[23u8], a[8u8], b[24u8], a[9u8], b[25u8], a[10u8], a[11u8], a[12u8], a[13u8], a[14u8], a[15u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 17i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], b[10u8], b[11u8], b[12u8], b[13u8], b[14u8], b[15u8], b[16u8], a[0u8], b[17u8], a[1u8], b[18u8], a[2u8], b[19u8], a[3u8], b[20u8], a[4u8]];
            result_b = [b[21u8], a[5u8], b[22u8], a[6u8], b[23u8], a[7u8], b[24u8], a[8u8], b[25u8], a[9u8], a[10u8], a[11u8], a[12u8], a[13u8], a[14u8], a[15u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 18i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], b[10u8], b[11u8], b[12u8], b[13u8], b[14u8], b[15u8], b[16u8], b[17u8], a[0u8], b[18u8], a[1u8], b[19u8], a[2u8], b[20u8], a[3u8], b[21u8]];
            result_b = [a[4u8], b[22u8], a[5u8], b[23u8], a[6u8], b[24u8], a[7u8], b[25u8], a[8u8], a[9u8], a[10u8], a[11u8], a[12u8], a[13u8], a[14u8], a[15u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 19i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], b[10u8], b[11u8], b[12u8], b[13u8], b[14u8], b[15u8], b[16u8], b[17u8], b[18u8], a[0u8], b[19u8], a[1u8], b[20u8], a[2u8], b[21u8], a[3u8]];
            result_b = [b[22u8], a[4u8], b[23u8], a[5u8], b[24u8], a[6u8], b[25u8], a[7u8], a[8u8], a[9u8], a[10u8], a[11u8], a[12u8], a[13u8], a[14u8], a[15u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 20i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], b[10u8], b[11u8], b[12u8], b[13u8], b[14u8], b[15u8], b[16u8], b[17u8], b[18u8], b[19u8], a[0u8], b[20u8], a[1u8], b[21u8], a[2u8], b[22u8]];
            result_b = [a[3u8], b[23u8], a[4u8], b[24u8], a[5u8], b[25u8], a[6u8], a[7u8], a[8u8], a[9u8], a[10u8], a[11u8], a[12u8], a[13u8], a[14u8], a[15u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 21i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], b[10u8], b[11u8], b[12u8], b[13u8], b[14u8], b[15u8], b[16u8], b[17u8], b[18u8], b[19u8], b[20u8], a[0u8], b[21u8], a[1u8], b[22u8], a[2u8]];
            result_b = [b[23u8], a[3u8], b[24u8], a[4u8], b[25u8], a[5u8], a[6u8], a[7u8], a[8u8], a[9u8], a[10u8], a[11u8], a[12u8], a[13u8], a[14u8], a[15u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 22i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], b[10u8], b[11u8], b[12u8], b[13u8], b[14u8], b[15u8], b[16u8], b[17u8], b[18u8], b[19u8], b[20u8], b[21u8], a[0u8], b[22u8], a[1u8], b[23u8]];
            result_b = [a[2u8], b[24u8], a[3u8], b[25u8], a[4u8], a[5u8], a[6u8], a[7u8], a[8u8], a[9u8], a[10u8], a[11u8], a[12u8], a[13u8], a[14u8], a[15u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 23i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], b[10u8], b[11u8], b[12u8], b[13u8], b[14u8], b[15u8], b[16u8], b[17u8], b[18u8], b[19u8], b[20u8], b[21u8], b[22u8], a[0u8], b[23u8], a[1u8]];
            result_b = [b[24u8], a[2u8], b[25u8], a[3u8], a[4u8], a[5u8], a[6u8], a[7u8], a[8u8], a[9u8], a[10u8], a[11u8], a[12u8], a[13u8], a[14u8], a[15u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 24i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], b[10u8], b[11u8], b[12u8], b[13u8], b[14u8], b[15u8], b[16u8], b[17u8], b[18u8], b[19u8], b[20u8], b[21u8], b[22u8], b[23u8], a[0u8], b[24u8]];
            result_b = [a[1u8], b[25u8], a[2u8], a[3u8], a[4u8], a[5u8], a[6u8], a[7u8], a[8u8], a[9u8], a[10u8], a[11u8], a[12u8], a[13u8], a[14u8], a[15u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 25i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], b[10u8], b[11u8], b[12u8], b[13u8], b[14u8], b[15u8], b[16u8], b[17u8], b[18u8], b[19u8], b[20u8], b[21u8], b[22u8], b[23u8], b[24u8], a[0u8]];
            result_b = [b[25u8], a[1u8], a[2u8], a[3u8], a[4u8], a[5u8], a[6u8], a[7u8], a[8u8], a[9u8], a[10u8], a[11u8], a[12u8], a[13u8], a[14u8], a[15u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else if n == 26i8 {
            result_a = [b[0u8], b[1u8], b[2u8], b[3u8], b[4u8], b[5u8], b[6u8], b[7u8], b[8u8], b[9u8], b[10u8], b[11u8], b[12u8], b[13u8], b[14u8], b[15u8], b[16u8], b[17u8], b[18u8], b[19u8], b[20u8], b[21u8], b[22u8], b[23u8], b[24u8], b[25u8]];
            result_b = [a[0u8], a[1u8], a[2u8], a[3u8], a[4u8], a[5u8], a[6u8], a[7u8], a[8u8], a[9u8], a[10u8], a[11u8], a[12u8], a[13u8], a[14u8], a[15u8], a[16u8], a[17u8], a[18u8], a[19u8], a[20u8], a[21u8], a[22u8], a[23u8], a[24u8], a[25u8]];
        } else {
            result_a = a;
            result_b = b;
        }
        
        return [result_a, result_b];
    }

    transition full_shuffle(element1: i8, element2: i8, element3: i8, deck: [[u128; 26]; 2]) -> [[u128; 26]; 2] {
        assert(element1.abs() >= 1i8 && element1.abs() <= 26i8);
        assert(element2.abs() >= 1i8 && element2.abs() <= 26i8);
        assert(element3.abs() >= 1i8 && element3.abs() <= 26i8);
        
        let setup1: (i8, [u128; 26], [u128; 26]) = setup_shuffle(element1, deck);
        let n1: i8 = setup1.0;
        let a1: [u128; 26] = setup1.1;
        let b1: [u128; 26] = setup1.2;
        let first_shuffle: [[u128; 26]; 2] = shuffle_deck(n1, 0u8, a1, b1);
        
        let setup2: (i8, [u128; 26], [u128; 26]) = setup_shuffle(element2, first_shuffle);
        let n2: i8 = setup2.0;
        let a2: [u128; 26] = setup2.1;
        let b2: [u128; 26] = setup2.2;
        let second_shuffle: [[u128; 26]; 2] = shuffle_deck(n2, 0u8, a2, b2);
        
        let setup3: (i8, [u128; 26], [u128; 26]) = setup_shuffle(element3, second_shuffle);
        let n3: i8 = setup3.0;
        let a3: [u128; 26] = setup3.1;
        let b3: [u128; 26] = setup3.2;
        let final_shuffle: [[u128; 26]; 2] = shuffle_deck(n3, 0u8, a3, b3);
        
        return final_shuffle;
    }
}
