fn main() {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let manifest_path = std::path::Path::new(&manifest_dir);
    let src_main_leo = manifest_path.join("src/main.leo");
    let build_main_aleo = manifest_path.join("build/main.aleo");
    let initial_json = manifest_path.join("outputs/mental_poker.initial.json");
    let signatures_json = manifest_path.join("signatures.json");

    println!("cargo:rerun-if-changed=signatures.json");

    if src_main_leo.exists() {
        println!("cargo:rerun-if-changed=src/main.leo");
    }

    if build_main_aleo.exists() {
        println!("cargo:rerun-if-changed=build/main.aleo");
    }

    if initial_json.exists() {
        println!("cargo:rerun-if-changed=outputs/mental_poker.initial.json");
    }

    println!("cargo:rerun-if-changed=./imports/commutative_encryption/signatures.json");

    if src_main_leo.exists() {
        let needs_leo_build = !build_main_aleo.exists()
            || !initial_json.exists()
            || (src_main_leo.metadata().unwrap().modified().unwrap() > build_main_aleo.metadata().unwrap().modified().unwrap());
        if needs_leo_build {
            println!("cargo:warning=Running leo build to create initial ast snapshot");
            let status = std::process::Command::new("leo")
                .arg("build")
                .arg("--enable-initial-ast-snapshot")
                .current_dir(manifest_path)
                .status()
                .expect("Failed to run leo build");
            if !status.success() {
                panic!("leo build failed");
            }
        } else {
            println!("cargo:warning=Leo build up to date, skipping");
        }
    }

    if initial_json.exists() {
        let should_check = !signatures_json.exists() || (initial_json.metadata().unwrap().modified().unwrap() > signatures_json.metadata().unwrap().modified().unwrap());

        if should_check {
            let json = std::fs::read_to_string(&initial_json).expect("Failed to read initial.json");
            let new_signatures = leo_bindings_core::signature::get_signatures(json);

            let should_write = if signatures_json.exists() {
                let existing_signatures = std::fs::read_to_string(&signatures_json).expect("Failed to read existing signatures.json");
                new_signatures != existing_signatures
            } else {
                true
            };

            if should_write {
                println!("cargo:warning=Signatures changed, updating signatures.json (will trigger macro recompilation)");
                std::fs::write(&signatures_json, new_signatures)
                    .expect("Failed to write signatures.json");
            } else {
                println!("cargo:warning=Signatures unchanged, skipping update (macro recompilation avoided)");
            }
        } else {
            println!("cargo:warning=Signatures up-to-date, skipping check");
        }
    }

    if !signatures_json.exists() {
        if src_main_leo.exists() {
            panic!("Failed to generate signatures.json.");
        } else if build_main_aleo.exists() {
            panic!("signatures.json not found. TODO: Make a parser for .aleo files.");
        } else {
            panic!("No Leo source files or build artifacts found.");
        }
    }
}
