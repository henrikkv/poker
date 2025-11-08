use crossterm::{
    event::{self, Event, KeyCode},
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use leo_bindings::utils::Account;
use poker::game::{Game, GameMessage, handle_game_key, new_interpreter_game};
use poker::game_state::NetworkType;
use ratatui::{
    Terminal,
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout},
    style::{Color, Style},
    widgets::{Block, Borders},
};
use snarkvm::prelude::TestRng;
use snarkvm::prelude::TestnetV0;
use std::io;
use std::panic;
use std::time::Duration;

struct TestModel {
    games: [Game; 3],
    active_index: usize,
}

enum TestMessage {
    GameMessage(GameMessage),

    NextPlayer,
    PrevPlayer,
    TickAll,
}

impl TestModel {
    fn new(network_type: NetworkType) -> Result<Self, Box<dyn std::error::Error>> {
        let pk1 = "APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH";
        let mut rng = TestRng::default();
        let account2: Account<TestnetV0> = Account::new(&mut rng)?;
        let account3: Account<TestnetV0> = Account::new(&mut rng)?;

        let pk2 = account2.private_key().to_string();
        let pk3 = account3.private_key().to_string();

        let games = [
            Game::new(new_interpreter_game(pk1)?, network_type),
            Game::new(new_interpreter_game(&pk2)?, network_type),
            Game::new(new_interpreter_game(&pk3)?, network_type),
        ];

        Ok(Self {
            games,
            active_index: 0,
        })
    }

    fn update(&mut self, msg: TestMessage) -> Option<TestMessage> {
        match msg {
            TestMessage::GameMessage(game_msg) => {
                let follow_up = self.games[self.active_index].update(game_msg);
                follow_up.map(TestMessage::GameMessage)
            }

            TestMessage::NextPlayer => {
                self.active_index = (self.active_index + 1) % 3;
                None
            }

            TestMessage::PrevPlayer => {
                self.active_index = (self.active_index + 2) % 3;
                None
            }

            TestMessage::TickAll => {
                for game in &mut self.games {
                    game.update(GameMessage::Tick);
                    while let Some(result_msg) = game.execute_pending_command() {
                        game.update(result_msg);
                    }
                }
                None
            }
        }
    }

    fn view(&self, frame: &mut ratatui::Frame) {
        let main_layout = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Min(10), Constraint::Length(8)])
            .split(frame.area());

        let player_layout = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Percentage(33),
                Constraint::Percentage(34),
                Constraint::Percentage(33),
            ])
            .split(main_layout[0]);

        for (i, area) in player_layout.iter().enumerate() {
            self.games[i].view(frame, *area);

            // Highlight active player with yellow border
            if i == self.active_index {
                let highlight = Block::default()
                    .borders(Borders::ALL)
                    .border_style(Style::default().fg(Color::Yellow));
                frame.render_widget(highlight, *area);
            }
        }
        // Render active player's logs
        self.games[self.active_index].render_logs(frame, main_layout[1]);
    }

    fn should_quit(&self) -> bool {
        self.games.iter().any(|g| g.should_quit())
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let original_hook = panic::take_hook();
    panic::set_hook(Box::new(move |panic_info| {
        let _ = disable_raw_mode();
        let _ = execute!(io::stdout(), LeaveAlternateScreen);
        original_hook(panic_info);
    }));

    let network_type = NetworkType::Interpreter;

    let mut model = TestModel::new(network_type)?;

    let mut terminal = setup_terminal()?;

    while !model.should_quit() {
        terminal.draw(|f| model.view(f))?;

        if let Some(msg) = handle_event()? {
            let mut current_msg = Some(msg);
            while let Some(msg) = current_msg {
                current_msg = model.update(msg);
            }
            while let Some(result_msg) = model.games[model.active_index].execute_pending_command() {
                current_msg = Some(TestMessage::GameMessage(result_msg));
                while let Some(msg) = current_msg {
                    current_msg = model.update(msg);
                }
            }
        }
    }

    restore_terminal(&mut terminal)?;
    Ok(())
}

fn setup_terminal() -> Result<Terminal<CrosstermBackend<io::Stdout>>, Box<dyn std::error::Error>> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let terminal = Terminal::new(backend)?;
    Ok(terminal)
}

fn restore_terminal(
    terminal: &mut Terminal<CrosstermBackend<io::Stdout>>,
) -> Result<(), Box<dyn std::error::Error>> {
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.show_cursor()?;
    Ok(())
}

fn handle_event() -> Result<Option<TestMessage>, Box<dyn std::error::Error>> {
    if event::poll(Duration::from_millis(100))?
        && let Event::Key(key) = event::read()?
    {
        return Ok(match key.code {
            KeyCode::Tab | KeyCode::Right => Some(TestMessage::NextPlayer),
            KeyCode::Left => Some(TestMessage::PrevPlayer),
            _ => handle_game_key(key).map(TestMessage::GameMessage),
        });
    }

    Ok(Some(TestMessage::TickAll))
}
