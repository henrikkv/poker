use crossterm::{
    event::{self, Event, KeyCode},
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use poker::game::Game;
use poker::game_state::{GameMode, GameState, NetworkType, Screen};
use ratatui::{
    Terminal,
    backend::CrosstermBackend,
    layout::{Alignment, Constraint, Direction, Layout},
    widgets::{Block, Borders, List, ListItem, Paragraph},
};
use std::io;
use std::panic;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let original_hook = panic::take_hook();
    panic::set_hook(Box::new(move |panic_info| {
        let _ = disable_raw_mode();
        let _ = execute!(io::stdout(), LeaveAlternateScreen);
        original_hook(panic_info);
    }));

    let args: Vec<String> = std::env::args().collect();

    let mut mode = GameMode::Main;
    let mut network_type = NetworkType::Testnet;

    for arg in args.iter().skip(1) {
        match arg.as_str() {
            "test" => mode = GameMode::Testing,
            "interpreter" => network_type = NetworkType::Interpreter,
            "testnet" => network_type = NetworkType::Testnet,
            "mainnet" => network_type = NetworkType::Mainnet,
            _ => {}
        }
    }

    if mode == GameMode::Main && network_type == NetworkType::Interpreter {
        eprintln!("Use test mode with interpreter.");
        return Ok(());
    }

    let game = Game::new()?;
    let mut game_state = GameState::new(mode, network_type);

    let mut terminal = setup_terminal()?;
    let result = run_app(&mut terminal, &mut game_state, game);
    restore_terminal(&mut terminal)?;

    if let Err(err) = result {
        eprintln!("Error: {:?}", err);
    }

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

fn run_app(
    terminal: &mut Terminal<CrosstermBackend<io::Stdout>>,
    game_state: &mut GameState,
    game: Game,
) -> Result<(), Box<dyn std::error::Error>> {
    loop {
        if game_state.screen == Screen::InGame
            && !game_state.game_initialized
            && game_state.game_id.is_some()
        {
            let game_id = game_state.game_id.unwrap();
            if let Err(e) = game.initialize_game(game_state, game_id) {
                game_state.log(format!("Error initializing game: {}", e));
            } else {
                game_state.game_initialized = true;
            }
        }
        terminal.draw(|f| {
            let vertical_chunks = Layout::default()
                .direction(Direction::Vertical)
                .constraints([Constraint::Min(10), Constraint::Length(8)])
                .split(f.area());

            match game_state.screen {
                Screen::GameIdInput => {
                    let network_name = match game_state.network_type {
                        NetworkType::Interpreter => "Interpreter",
                        NetworkType::Testnet => "Testnet",
                        NetworkType::Mainnet => "Mainnet",
                    };

                    let title = format!(
                        "Poker - {} ({})",
                        match game_state.mode {
                            GameMode::Main => "Main",
                            GameMode::Testing => "Testing",
                        },
                        network_name
                    );

                    let block = Block::default().title(title).borders(Borders::ALL);

                    let text = format!(
                        "Enter Game ID (or create new):\n\n{}\n\nPress Enter to confirm, Q to quit",
                        game_state.game_id_input
                    );

                    let paragraph = Paragraph::new(text)
                        .block(block)
                        .alignment(Alignment::Center);

                    f.render_widget(paragraph, vertical_chunks[0]);
                }
                Screen::InGame => {
                    let chunks = Layout::default()
                        .direction(Direction::Horizontal)
                        .constraints(match game_state.mode {
                            GameMode::Main => vec![Constraint::Percentage(100)],
                            GameMode::Testing => vec![
                                Constraint::Percentage(33),
                                Constraint::Percentage(34),
                                Constraint::Percentage(33),
                            ],
                        })
                        .split(vertical_chunks[0]);

                    match game_state.mode {
                        GameMode::Main => {
                            let block = Block::default()
                                .title(format!("Poker - Game ID: {}", game_state.game_id.unwrap()))
                                .borders(Borders::ALL);
                            f.render_widget(block, chunks[0]);
                        }
                        GameMode::Testing => {
                            let block1 = Block::default()
                                .title(format!(
                                    "Player 1 - Game ID: {}",
                                    game_state.game_id.unwrap()
                                ))
                                .borders(Borders::ALL);
                            f.render_widget(block1, chunks[0]);

                            let block2 = Block::default()
                                .title(format!(
                                    "Player 2 - Game ID: {}",
                                    game_state.game_id.unwrap()
                                ))
                                .borders(Borders::ALL);
                            f.render_widget(block2, chunks[1]);

                            let block3 = Block::default()
                                .title(format!(
                                    "Player 3 - Game ID: {}",
                                    game_state.game_id.unwrap()
                                ))
                                .borders(Borders::ALL);
                            f.render_widget(block3, chunks[2]);
                        }
                    }
                }
            }
            let log_items: Vec<ListItem> = game_state
                .logs
                .iter()
                .rev()
                .take(6)
                .rev()
                .map(|log| ListItem::new(log.as_str()))
                .collect();

            let logs_list =
                List::new(log_items).block(Block::default().title("Logs").borders(Borders::ALL));

            f.render_widget(logs_list, vertical_chunks[1]);
        })?;

        if event::poll(std::time::Duration::from_millis(100))?
            && let Event::Key(key) = event::read()?
        {
            match game_state.screen {
                Screen::GameIdInput => match key.code {
                    KeyCode::Char('q') => {
                        game_state.quit();
                    }
                    KeyCode::Char(c) => {
                        game_state.push_char(c);
                    }
                    KeyCode::Backspace => {
                        game_state.pop_char();
                    }
                    KeyCode::Enter => {
                        game_state.confirm_game_id();
                    }
                    _ => {}
                },
                Screen::InGame => {
                    if let KeyCode::Char('q') = key.code {
                        game_state.quit();
                    }
                }
            }
        }

        if game_state.should_quit {
            break;
        }
    }

    Ok(())
}
