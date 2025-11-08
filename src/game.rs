use anyhow;
use commutative_encryption_bindings::commutative_encryption::*;
use crossterm::event::{KeyCode, KeyEvent};
use leo_bindings::utils::*;
use mental_poker_bindings::mental_poker::*;
use rand::seq::SliceRandom;
use ratatui::{
    Frame,
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, Paragraph, Widget},
};
use snarkvm::prelude::{Group, Inverse, Network, Scalar, TestRng, Uniform};
use std::collections::HashMap;
use std::str::FromStr;
use std::time::Instant;

use crate::cards::{
    CardInfo, card_info, decrypt_hand_local, get_opponents, get_other_players_cards,
    get_player_cards,
};
use crate::game_state::{GameModel, NetworkType, Screen, describe_game_state};

pub const DEFAULT_ENDPOINT: &str = "http://localhost:3030";
pub const DEFAULT_PRIVATE_KEY: &str = "APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH";

const P1_DEC_HAND: u8 = 2;
const P2_DEC_HAND: u8 = 3;
const P3_DEC_HAND: u8 = 4;

const P1_DEC_FLOP: u8 = 8;
const P2_DEC_FLOP: u8 = 9;
const P3_DEC_FLOP: u8 = 10;

const P1_DEC_TURN: u8 = 14;
const P2_DEC_TURN: u8 = 15;
const P3_DEC_TURN: u8 = 16;

const P1_DEC_RIVER: u8 = 20;
const P2_DEC_RIVER: u8 = 21;
const P3_DEC_RIVER: u8 = 22;

const P1_SHOWDOWN: u8 = 26;
const P2_SHOWDOWN: u8 = 27;
const P3_SHOWDOWN: u8 = 28;

#[derive(Debug, Clone, Copy)]
enum DecryptionStep {
    Hands,
    Flop,
    Turn,
    River,
    Showdown,
}

impl DecryptionStep {
    fn matches(&self, player_id: u8, state: u8) -> bool {
        match (self, player_id) {
            (DecryptionStep::Hands, 1) => state == P1_DEC_HAND,
            (DecryptionStep::Hands, 2) => state == P2_DEC_HAND,
            (DecryptionStep::Hands, 3) => state == P3_DEC_HAND,

            (DecryptionStep::Flop, 1) => state == P1_DEC_FLOP,
            (DecryptionStep::Flop, 2) => state == P2_DEC_FLOP,
            (DecryptionStep::Flop, 3) => state == P3_DEC_FLOP,

            (DecryptionStep::Turn, 1) => state == P1_DEC_TURN,
            (DecryptionStep::Turn, 2) => state == P2_DEC_TURN,
            (DecryptionStep::Turn, 3) => state == P3_DEC_TURN,

            (DecryptionStep::River, 1) => state == P1_DEC_RIVER,
            (DecryptionStep::River, 2) => state == P2_DEC_RIVER,
            (DecryptionStep::River, 3) => state == P3_DEC_RIVER,

            (DecryptionStep::Showdown, 1) => state == P1_SHOWDOWN,
            (DecryptionStep::Showdown, 2) => state == P2_SHOWDOWN,
            (DecryptionStep::Showdown, 3) => state == P3_SHOWDOWN,

            _ => false,
        }
    }

    fn log_message(&self) -> &'static str {
        match self {
            DecryptionStep::Hands => "Decrypting hand cards",
            DecryptionStep::Flop => "Decrypting flop",
            DecryptionStep::Turn => "Decrypting turn",
            DecryptionStep::River => "Decrypting river",
            DecryptionStep::Showdown => "Revealing cards for showdown",
        }
    }
}

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
    pub card_hashes: HashMap<Group<N>, u8>,
}

impl<N: Network, P: MentalPokerAleo<N>, E: CommutativeEncryptionAleo<N>> PokerGame<N, P, E> {
    pub fn new(
        account: Account<N>,
        endpoint: String,
        poker: P,
        encryption: E,
        player_id: u8,
    ) -> anyhow::Result<Self> {
        use crate::cards::compute_card_hashes_from_deck;

        let mut rng = TestRng::default();
        let secret = Scalar::rand(&mut rng);
        let secret_inv = Inverse::inverse(&secret).unwrap();

        let initial_deck = encryption.initialize_deck(&account)?;
        let card_hashes = compute_card_hashes_from_deck(initial_deck);

        Ok(Self {
            account,
            endpoint,
            secret,
            secret_inv,
            poker,
            encryption,
            player_id,
            keys: None,
            card_hashes,
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

    fn handle_decryption_step(
        &mut self,
        step: DecryptionStep,
        game_id: u32,
        cards: &Cards<N>,
        model: &mut GameModel,
    ) -> anyhow::Result<()> {
        model.log_action_start(step.log_message().to_string());

        let new_keys = match step {
            DecryptionStep::Hands => {
                let (other1, other2) = get_other_players_cards(self.player_id, cards);
                self.poker
                    .decrypt_hands(
                        &self.account,
                        game_id,
                        other1,
                        other2,
                        self.keys.take().unwrap(),
                    )?
                    .0
            }
            DecryptionStep::Flop => {
                self.poker
                    .decrypt_flop(
                        &self.account,
                        game_id,
                        cards.flop,
                        self.keys.take().unwrap(),
                    )?
                    .0
            }
            DecryptionStep::Turn => {
                self.poker
                    .decrypt_turn_river(
                        &self.account,
                        game_id,
                        cards.turn,
                        self.keys.take().unwrap(),
                    )?
                    .0
            }
            DecryptionStep::River => {
                self.poker
                    .decrypt_turn_river(
                        &self.account,
                        game_id,
                        cards.river,
                        self.keys.take().unwrap(),
                    )?
                    .0
            }
            DecryptionStep::Showdown => {
                let own_cards = get_player_cards(self.player_id, cards);
                self.poker
                    .showdown(&self.account, game_id, own_cards, self.keys.take().unwrap())?
                    .0
            }
        };

        self.keys = Some(new_keys);
        model.log_action_complete();

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
        let state_changed = model.current_state != Some(new_state);
        if state_changed {
            let description = describe_game_state(new_state);
            model.log(format!("State {}: {}", new_state, description));
            model.current_state = Some(new_state);
        }

        if self.keys.is_some() {
            let cards = self.poker.get_cards(game_id);

            for step in [
                DecryptionStep::Hands,
                DecryptionStep::Flop,
                DecryptionStep::Turn,
                DecryptionStep::River,
                DecryptionStep::Showdown,
            ] {
                if step.matches(self.player_id, new_state) {
                    if let Some(cards) = cards {
                        self.handle_decryption_step(step, game_id, &cards, model)?;
                    }
                    break;
                }
            }
        }

        let mut hand_decrypted = false;
        if new_state >= 5
            && model.decrypted_hand.is_none()
            && let (Some(cards), Some(_keys)) = (self.poker.get_cards(game_id), &self.keys)
        {
            let encrypted_hand = get_player_cards(self.player_id, &cards);
            let result = decrypt_hand_local(encrypted_hand, self.secret_inv, &self.card_hashes);
            if result != [255, 255] {
                model.decrypted_hand = Some(result);
                hand_decrypted = true;
            }
        }

        if state_changed || hand_decrypted || model.card.is_none() {
            model.card = self.get_card(game_id, model.current_player_id, model);
            model.chip = self.get_chip(game_id);
        }

        model.last_poll_time = Instant::now();

        Ok(())
    }
}

#[derive(Debug, Clone, Copy)]
pub struct Card {
    pub flop: [u8; 3],
    pub turn: u8,
    pub river: u8,
    pub player1: [u8; 2],
    pub player2: [u8; 2],
    pub player3: [u8; 2],
}

impl Card {
    pub fn get_cards(&self, player_id: u8) -> [u8; 2] {
        match player_id {
            1 => self.player1,
            2 => self.player2,
            3 => self.player3,
            _ => [255, 255],
        }
    }

    pub fn set_cards(&mut self, player_id: u8, cards: [u8; 2]) {
        match player_id {
            1 => self.player1 = cards,
            2 => self.player2 = cards,
            3 => self.player3 = cards,
            _ => {}
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct Chip {
    pub player1: u16,
    pub player2: u16,
    pub player3: u16,
}

impl Chip {
    pub fn get_chips(&self, player_id: u8) -> u16 {
        match player_id {
            1 => self.player1,
            2 => self.player2,
            3 => self.player3,
            _ => 0,
        }
    }
}

pub trait GameHandle {
    fn check_game_exists(&self, game_id: u32) -> bool;
    fn get_game_state(&self, game_id: u32) -> Option<u8>;
    fn get_player_id(&self) -> u8;
    fn get_card(&self, game_id: u32, current_player_id: u8, model: &GameModel) -> Option<Card>;
    fn get_chip(&self, game_id: u32) -> Option<Chip>;
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

    fn get_player_id(&self) -> u8 {
        self.player_id
    }

    fn get_card(&self, game_id: u32, current_player_id: u8, model: &GameModel) -> Option<Card> {
        let mut render_data = if let Some(revealed) = self.poker.get_revealed_cards(game_id) {
            Card {
                flop: revealed.flop,
                turn: revealed.turn,
                river: revealed.river,
                player1: revealed.player1,
                player2: revealed.player2,
                player3: revealed.player3,
            }
        } else {
            Card {
                flop: [255, 255, 255],
                turn: 255,
                river: 255,
                player1: [255, 255],
                player2: [255, 255],
                player3: [255, 255],
            }
        };

        if let Some(decrypted) = model.decrypted_hand {
            render_data.set_cards(current_player_id, decrypted);
        }

        Some(render_data)
    }

    fn get_chip(&self, game_id: u32) -> Option<Chip> {
        let chips = self.poker.get_chips(game_id)?;
        Some(Chip {
            player1: chips.player1,
            player2: chips.player2,
            player3: chips.player3,
        })
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

    GameInitialized(Result<(), String>),
    GameJoined(Result<(), String>),
    GameStatePolled(Result<(), String>),
}

#[derive(Debug, Clone, Copy)]
pub enum GameCommand {
    InitializeGame(u32),
    JoinGame(u32),
    PollGameState(u32),
}

pub struct Game {
    handle: Box<dyn GameHandle>,
    pub model: GameModel,
    pending_command: Option<GameCommand>,
}

impl Game {
    pub fn new(handle: Box<dyn GameHandle>, network_type: NetworkType) -> Self {
        Self {
            handle,
            model: GameModel::new(network_type),
            pending_command: None,
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
                if self.model.screen == Screen::GameIdInput
                    && let Ok(id) = self.model.game_id_input.parse::<u32>()
                {
                    self.model.game_id = Some(id);
                    self.model.screen = Screen::InGame;

                    let game_exists = self.handle.check_game_exists(id);
                    if let Some(state) = self.handle.get_game_state(id) {
                        match state {
                            0 | 1 => {
                                self.pending_command = Some(GameCommand::JoinGame(id));
                            }
                            _ => {
                                self.model
                                    .log(format!("Spectating game {} (already started)", id));
                                self.model.game_initialized = true;
                                self.pending_command = Some(GameCommand::PollGameState(id));
                            }
                        }
                    } else if !game_exists {
                        self.pending_command = Some(GameCommand::InitializeGame(id));
                    }
                }
                None
            }

            GameMessage::Tick => {
                if self.pending_command.is_none()
                    && self.model.game_initialized
                    && self.model.should_poll()
                    && let Some(game_id) = self.model.game_id
                {
                    self.pending_command = Some(GameCommand::PollGameState(game_id));
                }
                None
            }

            GameMessage::Quit => {
                self.model.should_quit = true;
                None
            }

            GameMessage::GameInitialized(result) => {
                match result {
                    Ok(()) => {
                        self.model.game_initialized = true;
                        self.model.current_player_id = self.handle.get_player_id();
                        if let Some(game_id) = self.model.game_id {
                            self.pending_command = Some(GameCommand::PollGameState(game_id));
                        }
                    }
                    Err(e) => {
                        self.model.log(format!("Error initializing: {}", e));
                    }
                }
                None
            }

            GameMessage::GameJoined(result) => {
                match result {
                    Ok(()) => {
                        self.model.game_initialized = true;
                        self.model.current_player_id = self.handle.get_player_id();
                        if let Some(game_id) = self.model.game_id {
                            self.pending_command = Some(GameCommand::PollGameState(game_id));
                        }
                    }
                    Err(e) => {
                        self.model.log(format!("Error joining: {}", e));
                    }
                }
                None
            }

            GameMessage::GameStatePolled(result) => {
                if let Err(e) = result {
                    self.model.log(format!("Error polling: {}", e));
                }
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

    pub fn execute_pending_command(&mut self) -> Option<GameMessage> {
        let command = self.pending_command.take()?;

        match command {
            GameCommand::InitializeGame(game_id) => {
                self.model.log(format!("Creating new game {}", game_id));
                let result = self
                    .handle
                    .initialize_game(&mut self.model, game_id)
                    .map_err(|e| e.to_string());
                Some(GameMessage::GameInitialized(result))
            }

            GameCommand::JoinGame(game_id) => {
                let player_num = if self.handle.get_game_state(game_id) == Some(0) {
                    2
                } else {
                    3
                };
                self.model
                    .log(format!("Joining game {} as Player {}", game_id, player_num));
                let result = self
                    .handle
                    .join_game(&mut self.model, game_id)
                    .map_err(|e| e.to_string());
                Some(GameMessage::GameJoined(result))
            }

            GameCommand::PollGameState(game_id) => {
                let result = self
                    .handle
                    .poll_game_state(&mut self.model, game_id)
                    .map_err(|e| e.to_string());
                Some(GameMessage::GameStatePolled(result))
            }
        }
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
}

fn format_card_span(card_index: u8) -> Span<'static> {
    match card_info(card_index) {
        CardInfo::FaceDown => Span::styled("???", Style::default().fg(Color::DarkGray)),
        CardInfo::Invalid(idx) => {
            Span::styled(format!("Err:{}", idx), Style::default().fg(Color::Yellow))
        }
        CardInfo::Valid {
            suit,
            value,
            is_red,
        } => {
            let card_str = format!("{}{}", suit, value);
            let style = if is_red {
                Style::default().fg(Color::Red).bg(Color::Green)
            } else {
                Style::default().fg(Color::Black).bg(Color::Green)
            };
            Span::styled(card_str, style)
        }
    }
}

struct CommunityWidget {
    flop: [u8; 3],
    turn: u8,
    river: u8,
}

impl CommunityWidget {
    fn new(flop: [u8; 3], turn: u8, river: u8) -> Self {
        Self { flop, turn, river }
    }
}

impl Widget for CommunityWidget {
    fn render(self, area: Rect, buf: &mut ratatui::prelude::Buffer) {
        let cards = vec![
            format_card_span(self.flop[0]),
            Span::raw(" "),
            format_card_span(self.flop[1]),
            Span::raw(" "),
            format_card_span(self.flop[2]),
            Span::raw("  "),
            format_card_span(self.turn),
            Span::raw(" "),
            format_card_span(self.river),
        ];

        let line = Line::from(cards);
        let paragraph = Paragraph::new(line).alignment(Alignment::Center);

        paragraph.render(area, buf);
    }
}

struct PlayerWidget {
    player_id: u8,
    cards: [u8; 2],
    chips: u16,
}

impl PlayerWidget {
    fn new(player_id: u8, cards: [u8; 2], chips: u16) -> Self {
        Self {
            player_id,
            cards,
            chips,
        }
    }
}

impl Widget for PlayerWidget {
    fn render(self, area: Rect, buf: &mut ratatui::prelude::Buffer) {
        let block = Block::default().borders(Borders::ALL);
        let inner = block.inner(area);
        block.render(area, buf);

        if inner.height < 3 {
            return;
        }

        let player_name = Line::from(format!("P{}", self.player_id)).alignment(Alignment::Center);
        player_name.render(
            Rect {
                x: inner.x,
                y: inner.y,
                width: inner.width,
                height: 1,
            },
            buf,
        );

        let card1 = format_card_span(self.cards[0]);
        let card2 = format_card_span(self.cards[1]);
        let cards_line =
            Line::from(vec![card1, Span::raw(" "), card2]).alignment(Alignment::Center);

        cards_line.render(
            Rect {
                x: inner.x,
                y: inner.y + 1,
                width: inner.width,
                height: 1,
            },
            buf,
        );

        let chips_line = Line::from(format!("Chips: {}", self.chips)).alignment(Alignment::Center);
        chips_line.render(
            Rect {
                x: inner.x,
                y: inner.y + 2,
                width: inner.width,
                height: 1,
            },
            buf,
        );
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

fn render_status(frame: &mut Frame, message: &str, area: Rect) {
    let paragraph = Paragraph::new(message).alignment(Alignment::Center);
    frame.render_widget(paragraph, area);
}

fn render_in_game(frame: &mut Frame, model: &GameModel, area: Rect) {
    let game_id = model.game_id.unwrap_or(0);
    let title = format!("Poker - Game ID: {}", game_id);
    let block = Block::default().title(title).borders(Borders::ALL);
    let inner = block.inner(area);
    frame.render_widget(block, area);

    if model.current_player_id == 0 || !model.game_initialized {
        let content = if let Some(state) = model.current_state {
            let description = describe_game_state(state);
            format!("Current State: {}\n\n{}", state, description)
        } else {
            "Connecting to game...".to_string()
        };

        render_status(frame, &content, inner);
        return;
    }

    let (cards, chips) = match (model.card, model.chip) {
        (Some(c), Some(ch)) => (c, ch),
        _ => {
            let content = if let Some(state) = model.current_state {
                let description = describe_game_state(state);
                format!("Current State: {}\n\n{}", state, description)
            } else {
                "Waiting for game data...".to_string()
            };

            render_status(frame, &content, inner);
            return;
        }
    };

    render_game_table(frame, inner, model.current_player_id, cards, chips);
}

fn create_table_layout() -> Layout {
    Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(5), // Top row for opponents
            Constraint::Min(3),    // Middle for community cards
            Constraint::Length(5), // Bottom for current player
        ])
}

fn create_opponents_layout() -> Layout {
    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
}

fn render_game_table(frame: &mut Frame, area: Rect, current_player: u8, cards: Card, chips: Chip) {
    let (opponent1, opponent2) = get_opponents(current_player);

    let vertical_layout = create_table_layout().split(area);
    let top_layout = create_opponents_layout().split(vertical_layout[0]);

    frame.render_widget(
        PlayerWidget::new(
            opponent1,
            cards.get_cards(opponent1),
            chips.get_chips(opponent1),
        ),
        top_layout[0],
    );
    frame.render_widget(
        PlayerWidget::new(
            opponent2,
            cards.get_cards(opponent2),
            chips.get_chips(opponent2),
        ),
        top_layout[1],
    );

    frame.render_widget(
        CommunityWidget::new(cards.flop, cards.turn, cards.river),
        vertical_layout[1],
    );

    frame.render_widget(
        PlayerWidget::new(
            current_player,
            cards.get_cards(current_player),
            chips.get_chips(current_player),
        ),
        vertical_layout[2],
    );
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
