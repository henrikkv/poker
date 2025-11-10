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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GameState {
    P2Join = 0,
    P3Join = 1,

    P1DecHand = 2,
    P2DecHand = 3,
    P3DecHand = 4,

    P1BetPre = 5,
    P2BetPre = 6,
    P3BetPre = 7,

    P1DecFlop = 8,
    P2DecFlop = 9,
    P3DecFlop = 10,

    P1BetFlop = 11,
    P2BetFlop = 12,
    P3BetFlop = 13,

    P1DecTurn = 14,
    P2DecTurn = 15,
    P3DecTurn = 16,

    P1BetTurn = 17,
    P2BetTurn = 18,
    P3BetTurn = 19,

    P1DecRiver = 20,
    P2DecRiver = 21,
    P3DecRiver = 22,

    P1BetRiver = 23,
    P2BetRiver = 24,
    P3BetRiver = 25,

    P1Showdown = 26,
    P2Showdown = 27,
    P3Showdown = 28,

    Compare = 29,

    P1NewShuffle = 30,
    P2NewShuffle = 31,
    P2Shuffle = 32,
    P3Shuffle = 33,
    P1Claim = 34,
    P2Claim = 35,
    P3Claim = 36,
}

impl std::fmt::Display for GameState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", *self as u8)
    }
}

impl GameState {
    pub fn from_u8(state: u8) -> Option<Self> {
        match state {
            0 => Some(Self::P2Join),
            1 => Some(Self::P3Join),
            2 => Some(Self::P1DecHand),
            3 => Some(Self::P2DecHand),
            4 => Some(Self::P3DecHand),
            5 => Some(Self::P1BetPre),
            6 => Some(Self::P2BetPre),
            7 => Some(Self::P3BetPre),
            8 => Some(Self::P1DecFlop),
            9 => Some(Self::P2DecFlop),
            10 => Some(Self::P3DecFlop),
            11 => Some(Self::P1BetFlop),
            12 => Some(Self::P2BetFlop),
            13 => Some(Self::P3BetFlop),
            14 => Some(Self::P1DecTurn),
            15 => Some(Self::P2DecTurn),
            16 => Some(Self::P3DecTurn),
            17 => Some(Self::P1BetTurn),
            18 => Some(Self::P2BetTurn),
            19 => Some(Self::P3BetTurn),
            20 => Some(Self::P1DecRiver),
            21 => Some(Self::P2DecRiver),
            22 => Some(Self::P3DecRiver),
            23 => Some(Self::P1BetRiver),
            24 => Some(Self::P2BetRiver),
            25 => Some(Self::P3BetRiver),
            26 => Some(Self::P1Showdown),
            27 => Some(Self::P2Showdown),
            28 => Some(Self::P3Showdown),
            29 => Some(Self::Compare),
            30 => Some(Self::P1NewShuffle),
            31 => Some(Self::P2NewShuffle),
            32 => Some(Self::P2Shuffle),
            33 => Some(Self::P3Shuffle),
            34 => Some(Self::P1Claim),
            35 => Some(Self::P2Claim),
            36 => Some(Self::P3Claim),
            _ => None,
        }
    }

    pub fn to_u8(self) -> u8 {
        self as u8
    }

    pub fn is_betting_state(self) -> bool {
        matches!(
            self,
            Self::P1BetPre
                | Self::P2BetPre
                | Self::P3BetPre
                | Self::P1BetFlop
                | Self::P2BetFlop
                | Self::P3BetFlop
                | Self::P1BetTurn
                | Self::P2BetTurn
                | Self::P3BetTurn
                | Self::P1BetRiver
                | Self::P2BetRiver
                | Self::P3BetRiver
        )
    }

    pub fn current_player(self) -> Option<u8> {
        match self {
            Self::P1DecHand
            | Self::P1BetPre
            | Self::P1DecFlop
            | Self::P1BetFlop
            | Self::P1DecTurn
            | Self::P1BetTurn
            | Self::P1DecRiver
            | Self::P1BetRiver
            | Self::P1Showdown
            | Self::P1NewShuffle
            | Self::P1Claim => Some(1),

            Self::P2Join
            | Self::P2DecHand
            | Self::P2BetPre
            | Self::P2DecFlop
            | Self::P2BetFlop
            | Self::P2DecTurn
            | Self::P2BetTurn
            | Self::P2DecRiver
            | Self::P2BetRiver
            | Self::P2Showdown
            | Self::P2NewShuffle
            | Self::P2Shuffle
            | Self::P2Claim => Some(2),

            Self::P3Join
            | Self::P3DecHand
            | Self::P3BetPre
            | Self::P3DecFlop
            | Self::P3BetFlop
            | Self::P3DecTurn
            | Self::P3BetTurn
            | Self::P3DecRiver
            | Self::P3BetRiver
            | Self::P3Showdown
            | Self::P3Shuffle
            | Self::P3Claim => Some(3),

            Self::Compare => None,
        }
    }
}

#[derive(Debug, Clone, Copy)]
enum DecryptionStep {
    Hands,
    Flop,
    Turn,
    River,
    Showdown,
}

impl DecryptionStep {
    fn matches(&self, player_id: u8, state: GameState) -> bool {
        match (self, player_id) {
            (DecryptionStep::Hands, 1) => state == GameState::P1DecHand,
            (DecryptionStep::Hands, 2) => state == GameState::P2DecHand,
            (DecryptionStep::Hands, 3) => state == GameState::P3DecHand,

            (DecryptionStep::Flop, 1) => state == GameState::P1DecFlop,
            (DecryptionStep::Flop, 2) => state == GameState::P2DecFlop,
            (DecryptionStep::Flop, 3) => state == GameState::P3DecFlop,

            (DecryptionStep::Turn, 1) => state == GameState::P1DecTurn,
            (DecryptionStep::Turn, 2) => state == GameState::P2DecTurn,
            (DecryptionStep::Turn, 3) => state == GameState::P3DecTurn,

            (DecryptionStep::River, 1) => state == GameState::P1DecRiver,
            (DecryptionStep::River, 2) => state == GameState::P2DecRiver,
            (DecryptionStep::River, 3) => state == GameState::P3DecRiver,

            (DecryptionStep::Showdown, 1) => state == GameState::P1Showdown,
            (DecryptionStep::Showdown, 2) => state == GameState::P2Showdown,
            (DecryptionStep::Showdown, 3) => state == GameState::P3Showdown,

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

        let new_state = GameState::from_u8(game.state);
        let state_changed = model.current_state != new_state;

        if state_changed {
            if let Some(state) = new_state {
                let description = describe_game_state(state);
                model.log(format!("State {}: {}", state, description));

                if state.is_betting_state() && state.current_player() == Some(self.player_id) {
                    if let (Some(chips), Some(game)) =
                        (self.poker.get_chips(game_id), self.poker.get_games(game_id))
                    {
                        use crate::game_state::BettingUIState;

                        let (player_chips, current_bet) = match self.player_id {
                            1 => (chips.player1, chips.player1_bet),
                            2 => (chips.player2, chips.player2_bet),
                            3 => (chips.player3, chips.player3_bet),
                            _ => (0, 0),
                        };

                        let highest_bet = chips
                            .player1_bet
                            .max(chips.player2_bet)
                            .max(chips.player3_bet);

                        let min_raise_size = if highest_bet == 0 || game.last_raise_size == 0 {
                            game.bb
                        } else {
                            game.last_raise_size
                        };

                        let min_raise_to = highest_bet + min_raise_size;
                        let min_raise = min_raise_to - current_bet;
                        let call_amount = highest_bet - current_bet;

                        model.betting_ui = Some(BettingUIState::new(
                            player_chips as u64,
                            call_amount as u64,
                            min_raise as u64,
                        ));
                    }
                } else {
                    model.betting_ui = None;
                }
            }
            model.current_state = new_state;
        }

        if self.keys.is_some()
            && let Some(state) = new_state
        {
            let cards = self.poker.get_cards(game_id);

            for step in [
                DecryptionStep::Hands,
                DecryptionStep::Flop,
                DecryptionStep::Turn,
                DecryptionStep::River,
                DecryptionStep::Showdown,
            ] {
                if step.matches(self.player_id, state) {
                    if let Some(cards) = cards {
                        self.handle_decryption_step(step, game_id, &cards, model)?;
                    }
                    break;
                }
            }
        }

        let mut hand_decrypted = false;
        if let Some(state) = new_state {
            let is_past_decrypt = !matches!(
                state,
                GameState::P2Join
                    | GameState::P3Join
                    | GameState::P1DecHand
                    | GameState::P2DecHand
                    | GameState::P3DecHand
            );

            if is_past_decrypt
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
    fn place_bet(
        &mut self,
        model: &mut GameModel,
        game_id: u32,
        action: crate::game_state::BettingAction,
        amount: u64,
    ) -> anyhow::Result<()>;
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

    fn place_bet(
        &mut self,
        model: &mut GameModel,
        game_id: u32,
        action: crate::game_state::BettingAction,
        amount: u64,
    ) -> anyhow::Result<()> {
        use crate::game_state::BettingAction;

        match action {
            BettingAction::Fold => {
                model.log_action_start("Folding".to_string());
                self.poker.fold(&self.account, game_id)?;
                model.log_action_complete();
            }
            BettingAction::Call => {
                let chips = self
                    .poker
                    .get_chips(game_id)
                    .ok_or_else(|| anyhow::anyhow!("No chips found"))?;

                let (current_bet, highest_bet) = match self.player_id {
                    1 => (
                        chips.player1_bet,
                        chips
                            .player1_bet
                            .max(chips.player2_bet)
                            .max(chips.player3_bet),
                    ),
                    2 => (
                        chips.player2_bet,
                        chips
                            .player1_bet
                            .max(chips.player2_bet)
                            .max(chips.player3_bet),
                    ),
                    3 => (
                        chips.player3_bet,
                        chips
                            .player1_bet
                            .max(chips.player2_bet)
                            .max(chips.player3_bet),
                    ),
                    _ => return Err(anyhow::anyhow!("Invalid player_id")),
                };

                let call_amount = highest_bet - current_bet;
                if call_amount == 0 {
                    model.log_action_start("Checking".to_string());
                } else {
                    model.log_action_start(format!("Calling {}", call_amount));
                }
                self.poker.bet(&self.account, game_id, call_amount)?;
                model.log_action_complete();
            }
            BettingAction::Raise => {
                model.log_action_start(format!("Raising {}", amount));
                self.poker.bet(&self.account, game_id, amount as u16)?;
                model.log_action_complete();
            }
        }

        Ok(())
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
    Confirm,
    Quit,
    Tick,

    Left,
    Right,
    Up,
    Down,

    GameInitialized(Result<(), String>),
    GameJoined(Result<(), String>),
    GameStatePolled(Result<(), String>),
    BetPlaced(Result<(), String>),
}

#[derive(Debug, Clone)]
pub enum GameCommand {
    InitializeGame(u32),
    JoinGame(u32),
    PollGameState(u32),
    PlaceBet {
        game_id: u32,
        action: crate::game_state::BettingAction,
        amount: u64,
    },
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

            GameMessage::Confirm => {
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
                } else if let (Some(betting_ui), Some(game_id)) =
                    (&self.model.betting_ui, self.model.game_id)
                {
                    let action = betting_ui.selected_action;
                    let amount = betting_ui.raise_amount;
                    self.pending_command = Some(GameCommand::PlaceBet {
                        game_id,
                        action,
                        amount,
                    });
                }
                None
            }

            GameMessage::Left => {
                if let Some(betting_ui) = &mut self.model.betting_ui {
                    betting_ui.select_prev();
                }
                None
            }

            GameMessage::Right => {
                if let Some(betting_ui) = &mut self.model.betting_ui {
                    betting_ui.select_next();
                }
                None
            }

            GameMessage::Up => {
                if let Some(betting_ui) = &mut self.model.betting_ui {
                    betting_ui.increase_raise();
                }
                None
            }

            GameMessage::Down => {
                if let Some(betting_ui) = &mut self.model.betting_ui {
                    betting_ui.decrease_raise();
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

            GameMessage::BetPlaced(result) => {
                match result {
                    Ok(()) => {
                        self.model.betting_ui = None;
                        if let Some(game_id) = self.model.game_id {
                            self.pending_command = Some(GameCommand::PollGameState(game_id));
                        }
                    }
                    Err(e) => {
                        self.model.log(format!("Error placing bet: {}", e));
                    }
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

            GameCommand::PlaceBet {
                game_id,
                action,
                amount,
            } => {
                let result = self
                    .handle
                    .place_bet(&mut self.model, game_id, action, amount)
                    .map_err(|e| e.to_string());
                Some(GameMessage::BetPlaced(result))
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

struct BettingWidget<'a> {
    betting_ui: &'a crate::game_state::BettingUIState,
}

impl<'a> BettingWidget<'a> {
    fn new(betting_ui: &'a crate::game_state::BettingUIState) -> Self {
        Self { betting_ui }
    }
}

impl<'a> Widget for BettingWidget<'a> {
    fn render(self, area: Rect, buf: &mut ratatui::prelude::Buffer) {
        use crate::game_state::BettingAction;

        let actions = BettingAction::all();
        let button_width = area.width / 3;

        for (i, action) in actions.iter().enumerate() {
            let is_selected = *action == self.betting_ui.selected_action;
            let x = area.x + (i as u16 * button_width);
            let button_area = Rect {
                x,
                y: area.y,
                width: button_width,
                height: area.height,
            };

            let text = match action {
                BettingAction::Raise => {
                    format!("Raise ({})", self.betting_ui.raise_amount)
                }
                BettingAction::Call => {
                    if self.betting_ui.call_amount == 0 {
                        "Check".to_string()
                    } else {
                        format!("Call ({})", self.betting_ui.call_amount)
                    }
                }
                BettingAction::Fold => "Fold".to_string(),
            };

            let style = if is_selected {
                Style::default().fg(Color::Black).bg(Color::Yellow)
            } else {
                Style::default().fg(Color::White)
            };

            let line = Line::from(text).alignment(Alignment::Center).style(style);
            line.render(
                Rect {
                    x: button_area.x,
                    y: button_area.y + button_area.height / 2,
                    width: button_area.width,
                    height: 1,
                },
                buf,
            );
        }
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

    let (_cards, _chips) = match (model.card, model.chip) {
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

    render_game_table(frame, inner, model);
}

fn create_table_layout(has_betting_ui: bool) -> Layout {
    if has_betting_ui {
        Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(5), // Top row for opponents
                Constraint::Min(3),    // Middle for community cards
                Constraint::Length(3), // Betting buttons
                Constraint::Length(5), // Bottom for current player
            ])
    } else {
        Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(5), // Top row for opponents
                Constraint::Min(3),    // Middle for community cards
                Constraint::Length(5), // Bottom for current player
            ])
    }
}

fn create_opponents_layout() -> Layout {
    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
}

fn render_game_table(frame: &mut Frame, area: Rect, model: &GameModel) {
    let cards = model.card.unwrap();
    let chips = model.chip.unwrap();
    let current_player = model.current_player_id;
    let (opponent1, opponent2) = get_opponents(current_player);

    let has_betting_ui = model.betting_ui.is_some();
    let vertical_layout = create_table_layout(has_betting_ui).split(area);
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

    if let Some(betting_ui) = &model.betting_ui {
        frame.render_widget(BettingWidget::new(betting_ui), vertical_layout[2]);
        frame.render_widget(
            PlayerWidget::new(
                current_player,
                cards.get_cards(current_player),
                chips.get_chips(current_player),
            ),
            vertical_layout[3],
        );
    } else {
        frame.render_widget(
            PlayerWidget::new(
                current_player,
                cards.get_cards(current_player),
                chips.get_chips(current_player),
            ),
            vertical_layout[2],
        );
    }
}

pub fn handle_game_key(key: KeyEvent) -> Option<GameMessage> {
    match key.code {
        KeyCode::Char('q') => Some(GameMessage::Quit),
        KeyCode::Char(c) => Some(GameMessage::CharInput(c)),
        KeyCode::Backspace => Some(GameMessage::Backspace),
        KeyCode::Enter => Some(GameMessage::Confirm),
        KeyCode::Left => Some(GameMessage::Left),
        KeyCode::Right => Some(GameMessage::Right),
        KeyCode::Up => Some(GameMessage::Up),
        KeyCode::Down => Some(GameMessage::Down),
        _ => None,
    }
}
