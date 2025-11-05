use anyhow;
use commutative_encryption_bindings::commutative_encryption::*;
use crossterm::event::{KeyCode, KeyEvent};
use leo_bindings::utils::*;
use mental_poker_bindings::mental_poker::*;
use rand::seq::SliceRandom;
use ratatui::{
    Frame,
    layout::{Alignment, Rect},
    widgets::{Block, Borders, List, ListItem, Paragraph},
};
use snarkvm::prelude::{Group, Inverse, Network, Scalar, TestRng, Uniform};
use std::str::FromStr;
use std::time::Instant;

use crate::game_state::{GameModel, NetworkType, Screen, describe_game_state};

pub const DEFAULT_ENDPOINT: &str = "http://localhost:3030";
pub const DEFAULT_PRIVATE_KEY: &str = "APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH";

fn shuffle_deck<N: Network>(deck: [Group<N>; 52]) -> [Group<N>; 52] {
    let mut rng = rand::thread_rng();
    let mut cards: Vec<Group<N>> = deck.into();
    cards.shuffle(&mut rng);
    cards.try_into().unwrap()
}

pub struct PokerGame<N: Network, P: MentalPokerAleo<N>, E: CommutativeEncryptionAleo<N>> {
    pub account: Account<N>,
    pub endpoint: String,
    pub secret: Scalar<N>,
    pub secret_inv: Scalar<N>,
    pub poker: P,
    pub encryption: E,
    pub player_id: u8,
    pub keys: Option<Keys<N>>,
}

impl<N: Network, P: MentalPokerAleo<N>, E: CommutativeEncryptionAleo<N>> PokerGame<N, P, E> {
    pub fn new(
        account: Account<N>,
        endpoint: String,
        poker: P,
        encryption: E,
        player_id: u8,
    ) -> anyhow::Result<Self> {
        let mut rng = TestRng::default();
        let secret = Scalar::rand(&mut rng);
        let secret_inv = Inverse::inverse(&secret).unwrap();

        Ok(Self {
            account,
            endpoint,
            secret,
            secret_inv,
            poker,
            encryption,
            player_id,
            keys: None,
        })
    }

    fn set_player_id(&mut self, game_id: u32) -> anyhow::Result<()> {
        let game = self
            .poker
            .get_games(game_id)
            .ok_or_else(|| anyhow::anyhow!("Game {} not found", game_id))?;

        let address = self.account.address();
        if address == game.player1 {
            self.player_id = 1;
        } else if address == game.player2 {
            self.player_id = 2;
        } else if address == game.player3 {
            self.player_id = 3;
        }

        Ok(())
    }

    pub fn initialize_game(&mut self, model: &mut GameModel, game_id: u32) -> anyhow::Result<()> {
        model.log_action_start("Initializing deck".to_string());
        let initial_deck = self.encryption.initialize_deck(&self.account)?;
        model.log_action_complete();

        model.log_action_start("Shuffling deck".to_string());
        let shuffled_deck = shuffle_deck(initial_deck);
        model.log_action_complete();

        model.log_action_start(format!("Creating game with ID {}", game_id));
        let (keys, _) = self.poker.create_game(
            &self.account,
            game_id,
            shuffled_deck,
            self.secret,
            self.secret_inv,
        )?;
        model.log_action_complete();

        self.keys = Some(keys);
        self.set_player_id(game_id)?;

        model.log(format!("Game {} created as P{}", game_id, self.player_id));

        Ok(())
    }

    pub fn poll_game_state(&mut self, model: &mut GameModel, game_id: u32) -> anyhow::Result<()> {
        if !model.game_initialized {
            return Ok(());
        }

        let game = self
            .poker
            .get_games(game_id)
            .ok_or_else(|| anyhow::anyhow!("Game {} not found", game_id))?;

        let new_state = game.state;

        if model.current_state != Some(new_state) {
            let description = describe_game_state(new_state);
            model.log(format!("State {}: {}", new_state, description));
            model.current_state = Some(new_state);
        }

        if self.keys.is_some() {
            let cards = self.poker.get_cards(game_id);

            match (self.player_id, new_state) {
                (1, 2) | (2, 3) | (3, 4) => {
                    if let Some(cards) = cards {
                        model.log_action_start("Decrypting hand cards".to_string());

                        let (other1, other2) = match self.player_id {
                            1 => (cards.player2, cards.player3),
                            2 => (cards.player1, cards.player3),
                            3 => (cards.player1, cards.player2),
                            _ => unreachable!(),
                        };

                        self.keys = Some(
                            self.poker
                                .decrypt_hands(
                                    &self.account,
                                    game_id,
                                    other1,
                                    other2,
                                    self.keys.take().unwrap(),
                                )?
                                .0,
                        );

                        model.log_action_complete();
                    }
                }
                (1, 8) | (2, 9) | (3, 10) => {
                    if let Some(cards) = cards {
                        model.log_action_start("Decrypting flop".to_string());

                        self.keys = Some(
                            self.poker
                                .decrypt_flop(
                                    &self.account,
                                    game_id,
                                    cards.flop,
                                    self.keys.take().unwrap(),
                                )?
                                .0,
                        );

                        model.log_action_complete();
                    }
                }
                (1, 14) | (2, 15) | (3, 16) => {
                    if let Some(cards) = cards {
                        model.log_action_start("Decrypting turn".to_string());

                        self.keys = Some(
                            self.poker
                                .decrypt_turn_river(
                                    &self.account,
                                    game_id,
                                    cards.turn,
                                    self.keys.take().unwrap(),
                                )?
                                .0,
                        );

                        model.log_action_complete();
                    }
                }
                (1, 20) | (2, 21) | (3, 22) => {
                    if let Some(cards) = cards {
                        model.log_action_start("Decrypting river".to_string());

                        self.keys = Some(
                            self.poker
                                .decrypt_turn_river(
                                    &self.account,
                                    game_id,
                                    cards.river,
                                    self.keys.take().unwrap(),
                                )?
                                .0,
                        );

                        model.log_action_complete();
                    }
                }
                (1, 26) | (2, 27) | (3, 28) => {
                    if let Some(cards) = cards {
                        model.log_action_start("Revealing cards for showdown".to_string());

                        let own_cards = match self.player_id {
                            1 => cards.player1,
                            2 => cards.player2,
                            3 => cards.player3,
                            _ => unreachable!(),
                        };

                        self.keys = Some(
                            self.poker
                                .showdown(
                                    &self.account,
                                    game_id,
                                    own_cards,
                                    self.keys.take().unwrap(),
                                )?
                                .0,
                        );

                        model.log_action_complete();
                    }
                }
                _ => {}
            }
        }

        model.last_poll_time = Instant::now();

        Ok(())
    }
}

pub trait GameHandle {
    fn check_game_exists(&self, game_id: u32) -> bool;
    fn get_game_state(&self, game_id: u32) -> Option<u8>;
    fn initialize_game(&mut self, model: &mut GameModel, game_id: u32) -> anyhow::Result<()>;
    fn join_game(&mut self, model: &mut GameModel, game_id: u32) -> anyhow::Result<()>;
    fn poll_game_state(&mut self, model: &mut GameModel, game_id: u32) -> anyhow::Result<()>;
}

impl<N: Network, P: MentalPokerAleo<N>, E: CommutativeEncryptionAleo<N>> GameHandle
    for PokerGame<N, P, E>
{
    fn check_game_exists(&self, game_id: u32) -> bool {
        self.poker.get_games(game_id).is_some()
    }

    fn get_game_state(&self, game_id: u32) -> Option<u8> {
        self.poker.get_games(game_id).map(|game| game.state)
    }

    fn initialize_game(&mut self, model: &mut GameModel, game_id: u32) -> anyhow::Result<()> {
        self.initialize_game(model, game_id)
    }

    fn join_game(&mut self, model: &mut GameModel, game_id: u32) -> anyhow::Result<()> {
        model.log_action_start("Getting current deck".to_string());
        let deck = self
            .poker
            .get_decks(game_id)
            .ok_or_else(|| anyhow::anyhow!("Deck not found for game {}", game_id))?;
        model.log_action_complete();

        model.log_action_start("Shuffling deck".to_string());
        let shuffled_deck = shuffle_deck(deck);
        model.log_action_complete();

        model.log_action_start(format!("Joining game {}", game_id));
        let (keys, _) = self.poker.join_game(
            &self.account,
            game_id,
            deck,
            shuffled_deck,
            self.secret,
            self.secret_inv,
        )?;
        model.log_action_complete();

        self.keys = Some(keys);

        self.set_player_id(game_id)?;

        model.log(format!("Joined game {} as P{}", game_id, self.player_id));
        Ok(())
    }

    fn poll_game_state(&mut self, model: &mut GameModel, game_id: u32) -> anyhow::Result<()> {
        self.poll_game_state(model, game_id)
    }
}

pub fn new_interpreter_game(private_key: &str) -> anyhow::Result<Box<dyn GameHandle>> {
    let account = Account::from_str(private_key)?;
    let endpoint = DEFAULT_ENDPOINT;
    let poker = MentalPokerInterpreter::new(&account, endpoint)?;
    let encryption = CommutativeEncryptionInterpreter::new(&account, endpoint)?;
    let game = PokerGame::new(account, endpoint.to_string(), poker, encryption, 0)?;
    Ok(Box::new(game))
}

pub fn new_testnet_game(private_key: &str, endpoint: &str) -> anyhow::Result<Box<dyn GameHandle>> {
    let account = Account::from_str(private_key)?;
    let poker = MentalPokerTestnet::new(&account, endpoint)?;
    let encryption = CommutativeEncryptionTestnet::new(&account, endpoint)?;
    let game = PokerGame::new(account, endpoint.to_string(), poker, encryption, 0)?;
    Ok(Box::new(game))
}

#[derive(Debug)]
pub enum GameMessage {
    CharInput(char),
    Backspace,
    ConfirmGameId,
    Quit,

    Tick,
}

pub struct Game {
    handle: Box<dyn GameHandle>,
    pub model: GameModel,
}

impl Game {
    pub fn new(handle: Box<dyn GameHandle>, network_type: NetworkType) -> Self {
        Self {
            handle,
            model: GameModel::new(network_type),
        }
    }

    pub fn update(&mut self, msg: GameMessage) -> Option<GameMessage> {
        match msg {
            GameMessage::CharInput(c) => {
                if self.model.screen == Screen::GameIdInput && c.is_ascii_digit() {
                    self.model.game_id_input.push(c);
                }
                None
            }

            GameMessage::Backspace => {
                if self.model.screen == Screen::GameIdInput {
                    self.model.game_id_input.pop();
                }
                None
            }

            GameMessage::ConfirmGameId => {
                if self.model.screen == Screen::GameIdInput {
                    if let Ok(id) = self.model.game_id_input.parse::<u32>() {
                        self.join_or_create_game(id);
                    }
                }
                None
            }

            GameMessage::Tick => {
                if self.model.should_poll() {
                    self.poll_game();
                }
                None
            }

            GameMessage::Quit => {
                self.model.should_quit = true;
                None
            }
        }
    }

    pub fn view(&self, frame: &mut Frame, area: Rect) {
        match self.model.screen {
            Screen::GameIdInput => render_game_id_input(frame, &self.model, area),
            Screen::InGame => render_in_game(frame, &self.model, area),
        }
    }

    pub fn should_quit(&self) -> bool {
        self.model.should_quit
    }

    pub fn render_logs(&self, frame: &mut Frame, area: Rect) {
        let items: Vec<ListItem> = self
            .model
            .logs
            .iter()
            .rev()
            .take(6)
            .rev()
            .map(|log| ListItem::new(log.as_str()))
            .collect();

        let list = List::new(items).block(Block::default().title("Logs").borders(Borders::ALL));

        frame.render_widget(list, area);
    }

    fn join_or_create_game(&mut self, id: u32) {
        if self.model.game_initialized {
            return;
        }

        self.model.game_id = Some(id);
        self.model.screen = Screen::InGame;

        match self.handle.get_game_state(id) {
            Some(0) => self.join_game_as_player(id, 2),
            Some(1) => self.join_game_as_player(id, 3),
            Some(_) => self.spectate_game(id),
            None => self.create_game(id),
        }
    }

    fn join_game_as_player(&mut self, id: u32, player_num: u8) {
        self.model
            .log(format!("Joining game {} as Player {}", id, player_num));
        match self.handle.join_game(&mut self.model, id) {
            Ok(_) => {
                self.model.game_initialized = true;
                self.poll_game();
            }
            Err(e) => self.model.log(format!("Error joining: {}", e)),
        }
    }

    fn spectate_game(&mut self, id: u32) {
        self.model
            .log(format!("Spectating game {} (already started)", id));
        self.model.game_initialized = true;
        self.poll_game();
    }

    fn create_game(&mut self, id: u32) {
        self.model.log(format!("Creating new game {}", id));
        match self.handle.initialize_game(&mut self.model, id) {
            Ok(_) => {
                self.model.game_initialized = true;
                self.poll_game();
            }
            Err(e) => self.model.log(format!("Error initializing: {}", e)),
        }
    }

    fn poll_game(&mut self) {
        if let Some(game_id) = self.model.game_id {
            if let Err(e) = self.handle.poll_game_state(&mut self.model, game_id) {
                self.model.log(format!("Error polling: {}", e));
            }
        }
    }
}

fn render_game_id_input(frame: &mut Frame, model: &GameModel, area: Rect) {
    let title = format!("Poker - {}", model.network_type.name());
    let block = Block::default().title(title).borders(Borders::ALL);

    let text = format!(
        "Enter Game ID (or create new):\n\n{}\n\nPress Enter to confirm, Q to quit",
        model.game_id_input
    );

    let paragraph = Paragraph::new(text)
        .block(block)
        .alignment(Alignment::Center);

    frame.render_widget(paragraph, area);
}

fn render_in_game(frame: &mut Frame, model: &GameModel, area: Rect) {
    let game_id = model.game_id.unwrap_or(0);
    let title = format!("Poker - Game ID: {}", game_id);
    let block = Block::default().title(title).borders(Borders::ALL);

    let content = if let Some(state) = model.current_state {
        let description = describe_game_state(state);
        format!("Current State: {}\n\n{}", state, description)
    } else {
        "Connecting to game...".to_string()
    };

    let paragraph = Paragraph::new(content).block(block);
    frame.render_widget(paragraph, area);
}

pub fn handle_game_key(key: KeyEvent) -> Option<GameMessage> {
    match key.code {
        KeyCode::Char('q') => Some(GameMessage::Quit),
        KeyCode::Char(c) => Some(GameMessage::CharInput(c)),
        KeyCode::Backspace => Some(GameMessage::Backspace),
        KeyCode::Enter => Some(GameMessage::ConfirmGameId),
        _ => None,
    }
}
