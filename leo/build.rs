fn main() {
    use std::path::Path;

    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let manifest_path = Path::new(&manifest_dir);
    let src_main_leo = manifest_path.join("src/main.leo");
    let src_main_aleo = manifest_path.join("src/main.aleo");
    let build_aleo = manifest_path.join("build/mental_poker/mental_poker.aleo");
    let build_abi = manifest_path.join("build/mental_poker/abi.json");

    if src_main_leo.exists() && src_main_aleo.exists() {
        panic!("Cannot have both src/main.leo and src/main.aleo; remove one.");
    }

    println!("cargo:rerun-if-changed=build/mental_poker/abi.json");
    if src_main_leo.exists() {
        println!("cargo:rerun-if-changed=src/main.leo");
    } else if src_main_aleo.exists() {
        println!("cargo:rerun-if-changed=src/main.aleo");
    }


    println!("cargo:rerun-if-changed=lib/waksman//src/lib.leo");

    let needs_refresh = if src_main_leo.exists() {
        !build_aleo.exists()
            || !build_abi.exists()
            || match (
                src_main_leo.metadata().ok().and_then(|m| m.modified().ok()),
                build_aleo.metadata().ok().and_then(|m| m.modified().ok()),
            ) {
                (Some(s), Some(d)) => s > d,
                _ => false,
            }
    } else if src_main_aleo.exists() {
        !build_abi.exists()
            || match (
                src_main_aleo.metadata().ok().and_then(|m| m.modified().ok()),
                build_abi.metadata().ok().and_then(|m| m.modified().ok()),
            ) {
                (Some(s), Some(d)) => s > d,
                _ => false,
            }
    } else {
        panic!("Expected main.leo or main.aleo in {}.", manifest_path.display());
    };

    if needs_refresh {
        if src_main_leo.exists() {
            println!("cargo:warning=Running leo build");
            let status = std::process::Command::new("leo")
                .arg("build")
                .current_dir(manifest_path)
                .status()
                .expect("Failed to run leo build");
            if !status.success() {
                panic!("leo build failed");
            }
        } else {
            println!("cargo:warning=Running leo abi");
            let abi_dir = build_abi.parent().unwrap();
            std::fs::create_dir_all(abi_dir).expect("create build directory");
            let status = std::process::Command::new("leo")
                .arg("abi")
                .arg(&src_main_aleo)
                .arg("-o")
                .arg(abi_dir)
                .current_dir(manifest_path)
                .status()
                .expect("Failed to run leo abi");
            if !status.success() {
                panic!("leo abi failed");
            }
            let program_name = abi_dir.file_name().unwrap().to_str().unwrap();
            std::fs::rename(abi_dir.join(format!("{program_name}.aleo.abi.json")), &build_abi)
                .expect("rename abi.json");
        }
    } else {
        println!("cargo:warning=ABI up to date, skipping");
    }

    if !build_abi.exists() {
        panic!("Expected abi.json in {}.", manifest_path.display());
    }
}
