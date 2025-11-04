use std::time::Instant;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NetworkType {
    Interpreter,
    Testnet,
    Mainnet,
}

impl NetworkType {
    pub fn name(&self) -> &'static str {
        match self {
            NetworkType::Interpreter => "Interpreter",
            NetworkType::Testnet => "Testnet",
            NetworkType::Mainnet => "Mainnet",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Screen {
    GameIdInput,
    InGame,
}

#[derive(Debug)]
pub struct GameModel {
    pub game_id: Option<u32>,
    pub game_initialized: bool,
    pub last_poll_time: Instant,
    pub current_state: Option<u8>,

    pub screen: Screen,
    pub game_id_input: String,
    pub logs: Vec<String>,

    pub network_type: NetworkType,
    pub should_quit: bool,
}

impl GameModel {
    pub fn new(network_type: NetworkType) -> Self {
        let mut model = Self {
            game_id: None,
            game_initialized: false,
            last_poll_time: Instant::now(),
            current_state: None,
            screen: Screen::GameIdInput,
            game_id_input: String::new(),
            logs: Vec::new(),
            network_type,
            should_quit: false,
        };
        model.log(format!("Starting poker with {}", network_type.name()));
        model
    }

    pub fn log(&mut self, message: String) {
        self.logs.push(message);
        if self.logs.len() > 100 {
            self.logs.remove(0);
        }
    }

    pub fn log_action_start(&mut self, message: String) {
        self.logs.push(format!("⏳ {}", message));
        if self.logs.len() > 100 {
            self.logs.remove(0);
        }
    }

    pub fn log_action_complete(&mut self) {
        if let Some(last) = self.logs.last_mut() {
            if last.starts_with("⏳ ") {
                *last = last.replace("⏳ ", "✓ ");
            }
        }
    }

    pub fn should_poll(&self) -> bool {
        self.last_poll_time.elapsed() >= std::time::Duration::from_secs(1)
    }
}

pub fn describe_game_state(state: u8) -> &'static str {
    match state {
        0 => "Waiting for Player 2 to join",
        1 => "Waiting for Player 3 to join",
        2 => "Waiting for Player 1 to decrypt hands",
        3 => "Waiting for Player 2 to decrypt hands",
        4 => "Waiting for Player 3 to decrypt hands",
        5 => "Waiting for Player 1 to bet (pre-flop)",
        6 => "Waiting for Player 2 to bet (pre-flop)",
        7 => "Waiting for Player 3 to bet (pre-flop)",
        8 => "Waiting for Player 1 to decrypt flop",
        9 => "Waiting for Player 2 to decrypt flop",
        10 => "Waiting for Player 3 to decrypt flop",
        11 => "Waiting for Player 1 to bet (flop)",
        12 => "Waiting for Player 2 to bet (flop)",
        13 => "Waiting for Player 3 to bet (flop)",
        14 => "Waiting for Player 1 to decrypt turn",
        15 => "Waiting for Player 2 to decrypt turn",
        16 => "Waiting for Player 3 to decrypt turn",
        17 => "Waiting for Player 1 to bet (turn)",
        18 => "Waiting for Player 2 to bet (turn)",
        19 => "Waiting for Player 3 to bet (turn)",
        20 => "Waiting for Player 1 to decrypt river",
        21 => "Waiting for Player 2 to decrypt river",
        22 => "Waiting for Player 3 to decrypt river",
        23 => "Waiting for Player 1 to bet (river)",
        24 => "Waiting for Player 2 to bet (river)",
        25 => "Waiting for Player 3 to bet (river)",
        26 => "Waiting for Player 1 showdown",
        27 => "Waiting for Player 2 showdown",
        28 => "Waiting for Player 3 showdown",
        29 => "Ready to compare hands",
        30 => "Waiting for Player 1 to shuffle new deck",
        31 => "Waiting for Player 2 to shuffle new deck",
        32 => "Waiting for Player 2 to shuffle",
        33 => "Waiting for Player 3 to shuffle",
        34 => "Waiting for Player 1 to claim prize",
        35 => "Waiting for Player 2 to claim prize",
        36 => "Waiting for Player 3 to claim prize",
        _ => "Unknown state",
    }
}
