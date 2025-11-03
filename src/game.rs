use commutative_encryption_bindings::commutative_encryption::*;
use leo_bindings::utils::*;
use mental_poker_bindings::mental_poker::*;
use rand::seq::SliceRandom;
use snarkvm::console::network::TestnetV0;
use snarkvm::prelude::{Future, Group, Inverse, Network, Scalar, TestRng, Uniform};
use std::str::FromStr;

use crate::game_state::{GameState, NetworkType};

const DEFAULT_ENDPOINT: &str = "http://localhost:3030";
const DEFAULT_PRIVATE_KEY: &str = "APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH";

fn shuffle_deck<N: Network>(deck: [Group<N>; 52]) -> [Group<N>; 52] {
    let mut rng = rand::thread_rng();
    let mut cards: Vec<Group<N>> = deck.into();
    cards.shuffle(&mut rng);
    cards.try_into().unwrap()
}

pub enum CommutativeEncryptionBinding {
    Interpreter(CommutativeEncryptionInterpreter),
    Testnet(CommutativeEncryptionTestnet),
}

impl CommutativeEncryptionBinding {
    pub fn new(
        network_type: NetworkType,
        account: &Account<TestnetV0>,
        endpoint: &str,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(match network_type {
            NetworkType::Interpreter => {
                Self::Interpreter(CommutativeEncryptionInterpreter::new(account, endpoint)?)
            }
            NetworkType::Testnet => {
                Self::Testnet(CommutativeEncryptionTestnet::new(account, endpoint)?)
            }
            NetworkType::Mainnet => {
                Self::Testnet(CommutativeEncryptionTestnet::new(account, endpoint)?)
            }
        })
    }

    pub fn initialize_deck(
        &self,
        account: &Account<TestnetV0>,
    ) -> Result<[Group<TestnetV0>; 52], Box<dyn std::error::Error>> {
        Ok(match self {
            Self::Interpreter(ce) => ce.initialize_deck(account)?,
            Self::Testnet(ce) => ce.initialize_deck(account)?,
        })
    }
}

pub enum MentalPokerBinding {
    Interpreter(MentalPokerInterpreter),
    Testnet(MentalPokerTestnet),
}

impl MentalPokerBinding {
    pub fn new(
        network_type: NetworkType,
        account: &Account<TestnetV0>,
        endpoint: &str,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(match network_type {
            NetworkType::Interpreter => {
                Self::Interpreter(MentalPokerInterpreter::new(account, endpoint)?)
            }
            NetworkType::Testnet => Self::Testnet(MentalPokerTestnet::new(account, endpoint)?),
            NetworkType::Mainnet => Self::Testnet(MentalPokerTestnet::new(account, endpoint)?),
        })
    }

    pub fn create_game(
        &self,
        account: &Account<TestnetV0>,
        game_id: u32,
        shuffled_deck: [Group<TestnetV0>; 52],
        secret: Scalar<TestnetV0>,
        secret_inv: Scalar<TestnetV0>,
    ) -> Result<(Keys<TestnetV0>, Future<TestnetV0>), Box<dyn std::error::Error>> {
        Ok(match self {
            Self::Interpreter(poker) => {
                poker.create_game(account, game_id, shuffled_deck, secret, secret_inv)?
            }
            Self::Testnet(poker) => {
                poker.create_game(account, game_id, shuffled_deck, secret, secret_inv)?
            }
        })
    }
}

pub struct Game {
    pub account: Account<TestnetV0>,
    pub endpoint: String,
    pub secret: Scalar<TestnetV0>,
    pub secret_inv: Scalar<TestnetV0>,
}

impl Game {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let account = Account::from_str(DEFAULT_PRIVATE_KEY)?;
        let mut rng = TestRng::default();
        let secret = Scalar::rand(&mut rng);
        let secret_inv = Inverse::inverse(&secret).unwrap();

        Ok(Self {
            account,
            endpoint: DEFAULT_ENDPOINT.to_string(),
            secret,
            secret_inv,
        })
    }

    pub fn initialize_game(
        &self,
        game_state: &mut GameState,
        game_id: u32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        game_state.log_action_start("Initializing CommutativeEncryption".to_string());
        let commutative_encryption = CommutativeEncryptionBinding::new(
            game_state.network_type,
            &self.account,
            &self.endpoint,
        )?;
        game_state.log_action_complete();

        game_state.log_action_start("Initializing deck".to_string());
        let initial_deck = commutative_encryption.initialize_deck(&self.account)?;
        game_state.log_action_complete();

        game_state.log_action_start("Shuffling deck".to_string());
        let shuffled_deck = shuffle_deck(initial_deck);
        game_state.log_action_complete();

        game_state.log_action_start("Initializing MentalPoker".to_string());
        let poker =
            MentalPokerBinding::new(game_state.network_type, &self.account, &self.endpoint)?;
        game_state.log_action_complete();

        game_state.log_action_start(format!("Creating game with ID {}", game_id));
        let (_keys, _) = poker.create_game(
            &self.account,
            game_id,
            shuffled_deck,
            self.secret,
            self.secret_inv,
        )?;
        game_state.log_action_complete();

        game_state.log(format!("Game {} created successfully", game_id));

        Ok(())
    }
}
