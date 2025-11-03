#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GameMode {
    Main,
    Testing,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NetworkType {
    Interpreter,
    Testnet,
    Mainnet,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Screen {
    GameIdInput,
    InGame,
}

#[derive(Debug)]
pub struct GameState {
    pub mode: GameMode,
    pub network_type: NetworkType,
    pub screen: Screen,
    pub game_id_input: String,
    pub game_id: Option<u32>,
    pub game_initialized: bool,
    pub should_quit: bool,
    pub logs: Vec<String>,
}

impl GameState {
    pub fn new(mode: GameMode, network_type: NetworkType) -> Self {
        let mut state = Self {
            mode,
            network_type,
            screen: Screen::GameIdInput,
            game_id_input: String::new(),
            game_id: None,
            game_initialized: false,
            should_quit: false,
            logs: Vec::new(),
        };
        state.log(format!(
            "Starting poker in {} mode with {}",
            match mode {
                GameMode::Main => "Main",
                GameMode::Testing => "Testing",
            },
            match network_type {
                NetworkType::Interpreter => "Interpreter",
                NetworkType::Testnet => "Testnet",
                NetworkType::Mainnet => "Mainnet",
            }
        ));
        state
    }

    pub fn quit(&mut self) {
        self.should_quit = true;
    }

    pub fn push_char(&mut self, c: char) {
        if c.is_ascii_digit() {
            self.game_id_input.push(c);
        }
    }

    pub fn pop_char(&mut self) {
        self.game_id_input.pop();
    }

    pub fn confirm_game_id(&mut self) {
        if let Ok(id) = self.game_id_input.parse::<u32>() {
            self.game_id = Some(id);
            self.screen = Screen::InGame;
            self.log(format!("Joining/Creating game with ID: {}", id));
        }
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
}
