use rand::seq::SliceRandom;
use snarkvm::prelude::{Group, Network};

pub fn shuffle_deck<N: Network>(deck: [Group<N>; 52]) -> ([Group<N>; 52], [bool; 249]) {
    let mut rng = rand::thread_rng();

    let mut indices: Vec<usize> = (0..52).collect();
    indices.shuffle(&mut rng);

    let mut perm = [0usize; 52];
    for (dst, &src) in indices.iter().enumerate() {
        perm[src] = dst;
    }

    let control = permutation_to_waksman_bits(&perm);
    let shuffled = std::array::from_fn(|i| deck[indices[i]]);

    (shuffled, control)
}

pub fn permutation_to_waksman_bits(perm: &[usize; 52]) -> [bool; 249] {
    debug_assert!(
        is_valid_permutation(perm),
        "not a valid permutation of 0..52"
    );
    let mut ctrl = [false; 249];
    let mut offset = 0usize;
    set_ctrl(perm, &mut ctrl, &mut offset);
    ctrl
}

fn set_ctrl(perm: &[usize], ctrl: &mut [bool], offset: &mut usize) {
    let n = perm.len();

    if n <= 1 {
        return;
    }

    if n == 2 {
        ctrl[*offset] = perm[0] == 1;
        *offset += 1;
        return;
    }

    let top_n = n.div_ceil(2);
    let bottom_n = n / 2;

    let out_end = 2 * (top_n - 1);

    let mut inv = vec![0usize; n];
    for src in 0..n {
        inv[perm[src]] = src;
    }

    let mut asgn: Vec<Option<bool>> = vec![None; n];

    if n.is_multiple_of(2) {
        asgn[inv[n - 2]] = Some(true);
        asgn[inv[n - 1]] = Some(false);
    } else {
        asgn[inv[n - 1]] = Some(true);
        asgn[n - 1] = Some(true);
    }

    let mut queue: Vec<(usize, bool)> = asgn
        .iter()
        .enumerate()
        .filter_map(|(s, &a)| a.map(|a| (s, a)))
        .collect();
    let mut qi = 0;

    loop {
        while qi < queue.len() {
            let (s, a) = queue[qi];
            qi += 1;

            if s < 2 * bottom_n {
                let partner = s ^ 1;
                if asgn[partner].is_none() {
                    asgn[partner] = Some(!a);
                    queue.push((partner, !a));
                }
            }

            let d = perm[s];
            if d < out_end {
                let src_of_paired = inv[d ^ 1];
                if asgn[src_of_paired].is_none() {
                    asgn[src_of_paired] = Some(!a);
                    queue.push((src_of_paired, !a));
                }
            }
        }

        match (0..bottom_n).find(|&i| asgn[2 * i].is_none()) {
            Some(i) => {
                asgn[2 * i] = Some(true);
                queue.push((2 * i, true));
            }
            None => break,
        }
    }

    let mut swap = vec![false; bottom_n];
    for i in 0..bottom_n {
        swap[i] = asgn[2 * i] == Some(false);
        ctrl[*offset] = swap[i];
        *offset += 1;
    }

    let mut top_in = Vec::with_capacity(top_n);
    let mut bottom_in = Vec::with_capacity(bottom_n);
    for i in 0..bottom_n {
        if !swap[i] {
            top_in.push(2 * i);
            bottom_in.push(2 * i + 1);
        } else {
            top_in.push(2 * i + 1);
            bottom_in.push(2 * i);
        }
    }
    if !n.is_multiple_of(2) {
        top_in.push(n - 1);
    }

    let top_perm: Vec<usize> = top_in
        .iter()
        .map(|&src| {
            let d = perm[src];
            if d < out_end { d / 2 } else { top_n - 1 }
        })
        .collect();

    let bottom_perm: Vec<usize> = bottom_in
        .iter()
        .map(|&src| {
            let d = perm[src];
            if d < out_end { d / 2 } else { bottom_n - 1 }
        })
        .collect();

    set_ctrl(&top_perm, ctrl, offset);
    set_ctrl(&bottom_perm, ctrl, offset);

    for i in 0..(top_n - 1) {
        ctrl[*offset] = asgn[inv[2 * i]] == Some(false);
        *offset += 1;
    }
}

fn is_valid_permutation(perm: &[usize]) -> bool {
    let n = perm.len();
    let mut seen = vec![false; n];
    perm.iter().all(|&d| {
        d < n && {
            let ok = !seen[d];
            seen[d] = true;
            ok
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand::seq::SliceRandom;

    fn simulate(deck: &[usize], ctrl: &[bool], offset: &mut usize) -> Vec<usize> {
        let n = deck.len();

        if n <= 1 {
            return deck.to_vec();
        }
        if n == 2 {
            let swap = ctrl[*offset];
            *offset += 1;
            return if swap {
                vec![deck[1], deck[0]]
            } else {
                deck.to_vec()
            };
        }

        let top_n = n.div_ceil(2);
        let bottom_n = n / 2;

        let mut top_in = Vec::with_capacity(top_n);
        let mut bottom_in = Vec::with_capacity(bottom_n);
        for i in 0..bottom_n {
            let swap = ctrl[*offset];
            *offset += 1;
            if swap {
                top_in.push(deck[2 * i + 1]);
                bottom_in.push(deck[2 * i]);
            } else {
                top_in.push(deck[2 * i]);
                bottom_in.push(deck[2 * i + 1]);
            }
        }
        if !n.is_multiple_of(2) {
            top_in.push(deck[n - 1]);
        }

        let top_out = simulate(&top_in, ctrl, offset);
        let bottom_out = simulate(&bottom_in, ctrl, offset);

        let mut result = vec![0usize; n];
        for i in 0..(top_n - 1) {
            let swap = ctrl[*offset];
            *offset += 1;
            if swap {
                result[2 * i] = bottom_out[i];
                result[2 * i + 1] = top_out[i];
            } else {
                result[2 * i] = top_out[i];
                result[2 * i + 1] = bottom_out[i];
            }
        }

        if n.is_multiple_of(2) {
            result[n - 2] = top_out[top_n - 1];
            result[n - 1] = bottom_out[bottom_n - 1];
        } else {
            result[n - 1] = top_out[top_n - 1];
        }

        result
    }

    fn check_perm(perm: &[usize; 52]) {
        let ctrl = permutation_to_waksman_bits(perm);
        let input: Vec<usize> = (0..52).collect();
        let output = simulate(&input, &ctrl, &mut 0);

        for src in 0..52 {
            let dst = perm[src];
            assert_eq!(
                output[dst], src,
                "perm[{src}]={dst}: expected output[{dst}]={src}, got {}",
                output[dst]
            );
        }
    }

    #[test]
    fn test_identity() {
        let perm: [usize; 52] = std::array::from_fn(|i| i);
        let ctrl = permutation_to_waksman_bits(&perm);
        assert!(
            ctrl.iter().all(|&b| !b),
            "identity should produce all-false control bits"
        );
        check_perm(&perm);
    }

    #[test]
    fn test_reverse() {
        let perm: [usize; 52] = std::array::from_fn(|i| 51 - i);
        check_perm(&perm);
    }

    #[test]
    fn test_single_swap() {
        let mut perm: [usize; 52] = std::array::from_fn(|i| i);
        perm[0] = 1;
        perm[1] = 0;
        check_perm(&perm);
    }

    #[test]
    fn test_random_permutations() {
        let mut rng = rand::thread_rng();
        for _ in 0..200 {
            let mut indices: Vec<usize> = (0..52).collect();
            indices.shuffle(&mut rng);

            let mut perm = [0usize; 52];
            for (dst, &src) in indices.iter().enumerate() {
                perm[src] = dst;
            }

            check_perm(&perm);
        }
    }

    #[test]
    fn test_shuffle_deck_roundtrip() {
        use snarkvm::prelude::TestnetV0;
        let deck = crate::deck::initialized_deck::<TestnetV0>();
        let (shuffled, ctrl) = shuffle_deck(deck);

        let mut perm = [0usize; 52];
        for (dst, card) in shuffled.iter().enumerate() {
            let src = deck.iter().position(|c| c == card).unwrap();
            perm[src] = dst;
        }

        assert_eq!(ctrl, permutation_to_waksman_bits(&perm));
    }
}
