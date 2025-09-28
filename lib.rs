use leo_bindings::generate_bindings;

generate_bindings!(
    [
        "outputs/zk_deck_shuffle.initial.json",
        "outputs/zk_sra_encryption.initial.json",
        "outputs/poker.initial.json",
    ],
    []
);
