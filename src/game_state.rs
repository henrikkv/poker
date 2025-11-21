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

    pub fn poll_interval_ms(&self) -> u64 {
        match self {
            NetworkType::Interpreter => 100,
            NetworkType::Testnet => 1000,
            NetworkType::Mainnet => 1000,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Screen {
    Menu,
    CreateGame,
    JoinGame,
    InGame,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CreateGameField {
    BuyIn,
    Password,
}

impl CreateGameField {
    pub fn next(&self) -> Self {
        match self {
            CreateGameField::BuyIn => CreateGameField::Password,
            CreateGameField::Password => CreateGameField::BuyIn,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum JoinGameField {
    GameId,
    Password,
}

impl JoinGameField {
    pub fn next(&self) -> Self {
        match self {
            JoinGameField::GameId => JoinGameField::Password,
            JoinGameField::Password => JoinGameField::GameId,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MenuOption {
    CreateGame,
    JoinGame,
}

impl MenuOption {
    pub fn all() -> [Self; 2] {
        [Self::CreateGame, Self::JoinGame]
    }

    pub fn name(&self) -> &'static str {
        match self {
            MenuOption::CreateGame => "Create Game",
            MenuOption::JoinGame => "Join Game",
        }
    }

    pub fn next(&self) -> Self {
        match self {
            MenuOption::CreateGame => MenuOption::JoinGame,
            MenuOption::JoinGame => MenuOption::CreateGame,
        }
    }

    pub fn prev(&self) -> Self {
        self.next()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BettingAction {
    Fold,
    Call,
    Raise,
}

impl BettingAction {
    pub fn all() -> [Self; 3] {
        [Self::Fold, Self::Call, Self::Raise]
    }

    pub fn name(&self) -> &'static str {
        match self {
            BettingAction::Fold => "Fold",
            BettingAction::Call => "Call",
            BettingAction::Raise => "Raise",
        }
    }
}

#[derive(Debug)]
pub struct BettingUIState {
    pub selected_action: BettingAction,
    pub raise_amount: u64,
    pub call_amount: u64,
    pub min_raise: u64,
    pub max_raise: u64,
}

impl BettingUIState {
    pub fn new(player_chips: u64, call_amount: u64, min_raise: u64) -> Self {
        Self {
            selected_action: BettingAction::Call,
            raise_amount: min_raise,
            call_amount,
            min_raise,
            max_raise: player_chips,
        }
    }

    pub fn select_next(&mut self) {
        self.selected_action = match self.selected_action {
            BettingAction::Fold => BettingAction::Call,
            BettingAction::Call => BettingAction::Raise,
            BettingAction::Raise => BettingAction::Fold,
        };
    }

    pub fn select_prev(&mut self) {
        self.selected_action = match self.selected_action {
            BettingAction::Fold => BettingAction::Raise,
            BettingAction::Call => BettingAction::Fold,
            BettingAction::Raise => BettingAction::Call,
        };
    }

    pub fn increase_raise(&mut self) {
        if self.selected_action == BettingAction::Raise {
            self.raise_amount = (self.raise_amount + self.min_raise).min(self.max_raise);
        }
    }

    pub fn decrease_raise(&mut self) {
        if self.selected_action == BettingAction::Raise {
            self.raise_amount =
                (self.raise_amount.saturating_sub(self.min_raise)).max(self.min_raise);
        }
    }

    pub fn set_all_in(&mut self) {
        if self.selected_action == BettingAction::Raise {
            self.raise_amount = self.max_raise;
        }
    }
}

#[derive(Debug)]
pub struct GameModel {
    pub game_id: Option<u32>,
    pub game_initialized: bool,
    pub last_poll_time: Instant,
    pub current_state: Option<crate::game::GameState>,
    pub current_player_id: u8,

    pub screen: Screen,
    pub selected_menu_option: MenuOption,
    pub game_id_input: String,
    pub password_input: String,
    pub buy_in_input: String,
    pub create_game_field: CreateGameField,
    pub join_game_field: JoinGameField,
    pub logs: Vec<String>,

    pub network_type: NetworkType,
    pub should_quit: bool,

    pub decrypted_hand: Option<[u8; 2]>,

    pub card: Option<crate::game::Card>,
    pub chip: Option<crate::game::Chip>,

    pub betting_ui: Option<BettingUIState>,

    pub last_known_game_id: u32,

    pub eliminated_players: [bool; 3],
    pub game_winner: Option<u8>,
    pub dealer_button: u8,
}

impl GameModel {
    pub fn new(network_type: NetworkType) -> Self {
        let mut model = Self {
            game_id: None,
            game_initialized: false,
            last_poll_time: Instant::now(),
            current_state: None,
            current_player_id: 0,
            screen: Screen::Menu,
            selected_menu_option: MenuOption::CreateGame,
            game_id_input: String::new(),
            password_input: String::new(),
            buy_in_input: "100".to_string(),
            create_game_field: CreateGameField::BuyIn,
            join_game_field: JoinGameField::GameId,
            logs: Vec::new(),
            network_type,
            should_quit: false,
            decrypted_hand: None,
            card: None,
            chip: None,
            betting_ui: None,
            last_known_game_id: 0,
            eliminated_players: [false, false, false],
            game_winner: None,
            dealer_button: 0,
        };
        model.log(format!("Starting poker with {}", network_type.name()));
        model
    }

    fn add_log(&mut self, message: String) {
        self.logs.push(message);
        if self.logs.len() > 100 {
            self.logs.remove(0);
        }
    }

    pub fn log(&mut self, message: String) {
        self.add_log(message);
    }

    pub fn log_action_start(&mut self, message: String) {
        self.add_log(format!("⏳ {}", message));
    }

    pub fn log_action_complete(&mut self) {
        if let Some(last) = self.logs.last_mut()
            && last.starts_with("⏳ ")
        {
            *last = last.replace("⏳ ", "✓ ");
        }
    }

    pub fn should_poll(&self) -> bool {
        let interval_ms = self.network_type.poll_interval_ms();
        self.last_poll_time.elapsed() >= std::time::Duration::from_millis(interval_ms)
    }

    pub fn update_eliminated_players(&mut self, players_out_bitmap: u8) {
        self.eliminated_players[0] = (players_out_bitmap & 1u8) != 0;
        self.eliminated_players[1] = (players_out_bitmap & 2u8) != 0;
        self.eliminated_players[2] = (players_out_bitmap & 4u8) != 0;
    }

    pub fn is_player_eliminated(&self, player_id: u8) -> bool {
        if (1..=3).contains(&player_id) {
            self.eliminated_players[(player_id - 1) as usize]
        } else {
            false
        }
    }

    pub fn check_for_winner(&mut self) -> Option<u8> {
        let active_players: Vec<u8> = (1..=3)
            .filter(|&player_id| !self.is_player_eliminated(player_id))
            .collect();

        if active_players.len() == 1 {
            let winner = active_players[0];
            self.game_winner = Some(winner);
            Some(winner)
        } else {
            None
        }
    }
}

pub fn describe_game_state(state: crate::game::GameState) -> &'static str {
    use crate::game::GameState;
    match state {
        GameState::P2Join => "Waiting for Player 2 to join",
        GameState::P3Join => "Waiting for Player 3 to join",
        GameState::P1DecHand => "Waiting for Player 1 to decrypt hands",
        GameState::P2DecHand => "Waiting for Player 2 to decrypt hands",
        GameState::P3DecHand => "Waiting for Player 3 to decrypt hands",
        GameState::P1BetPre => "Waiting for Player 1 to bet (pre-flop)",
        GameState::P2BetPre => "Waiting for Player 2 to bet (pre-flop)",
        GameState::P3BetPre => "Waiting for Player 3 to bet (pre-flop)",
        GameState::P1DecFlop => "Waiting for Player 1 to decrypt flop",
        GameState::P2DecFlop => "Waiting for Player 2 to decrypt flop",
        GameState::P3DecFlop => "Waiting for Player 3 to decrypt flop",
        GameState::P1BetFlop => "Waiting for Player 1 to bet (flop)",
        GameState::P2BetFlop => "Waiting for Player 2 to bet (flop)",
        GameState::P3BetFlop => "Waiting for Player 3 to bet (flop)",
        GameState::P1DecTurn => "Waiting for Player 1 to decrypt turn",
        GameState::P2DecTurn => "Waiting for Player 2 to decrypt turn",
        GameState::P3DecTurn => "Waiting for Player 3 to decrypt turn",
        GameState::P1BetTurn => "Waiting for Player 1 to bet (turn)",
        GameState::P2BetTurn => "Waiting for Player 2 to bet (turn)",
        GameState::P3BetTurn => "Waiting for Player 3 to bet (turn)",
        GameState::P1DecRiver => "Waiting for Player 1 to decrypt river",
        GameState::P2DecRiver => "Waiting for Player 2 to decrypt river",
        GameState::P3DecRiver => "Waiting for Player 3 to decrypt river",
        GameState::P1BetRiver => "Waiting for Player 1 to bet (river)",
        GameState::P2BetRiver => "Waiting for Player 2 to bet (river)",
        GameState::P3BetRiver => "Waiting for Player 3 to bet (river)",
        GameState::P1Showdown => "Waiting for Player 1 showdown",
        GameState::P2Showdown => "Waiting for Player 2 showdown",
        GameState::P3Showdown => "Waiting for Player 3 showdown",
        GameState::Compare => "Ready to compare hands",
        GameState::P1NewShuffle => "Waiting for Player 1 to shuffle new deck",
        GameState::P2NewShuffle => "Waiting for Player 2 to shuffle new deck",
        GameState::P2Shuffle => "Waiting for Player 2 to shuffle",
        GameState::P3Shuffle => "Waiting for Player 3 to shuffle",
        GameState::P1Claim => "Waiting for Player 1 to claim prize",
        GameState::P2Claim => "Waiting for Player 2 to claim prize",
        GameState::P3Claim => "Waiting for Player 3 to claim prize",
    }
}
