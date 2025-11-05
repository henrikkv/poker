use crossterm::{
    event::{self, Event},
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use poker::game::{
    DEFAULT_ENDPOINT, DEFAULT_PRIVATE_KEY, Game, GameMessage, handle_game_key, new_testnet_game,
};
use poker::game_state::NetworkType;
use ratatui::{
    Terminal,
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout},
};
use std::io;
use std::panic;
use std::time::Duration;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let original_hook = panic::take_hook();
    panic::set_hook(Box::new(move |panic_info| {
        let _ = disable_raw_mode();
        let _ = execute!(io::stdout(), LeaveAlternateScreen);
        original_hook(panic_info);
    }));

    let network_type = parse_network_type();

    let handle = create_game_handle(network_type)?;
    let mut game = Game::new(handle, network_type);

    let mut terminal = setup_terminal()?;

    while !game.should_quit() {
        terminal.draw(|f| {
            let chunks = Layout::default()
                .direction(Direction::Vertical)
                .constraints([Constraint::Min(10), Constraint::Length(8)])
                .split(f.area());

            game.view(f, chunks[0]);
            game.render_logs(f, chunks[1]);
        })?;
        if let Some(msg) = handle_event()? {
            let mut current_msg = Some(msg);
            while let Some(msg) = current_msg {
                current_msg = game.update(msg);
            }
        }
    }

    restore_terminal(&mut terminal)?;
    Ok(())
}

fn parse_network_type() -> NetworkType {
    let args: Vec<String> = std::env::args().collect();

    for arg in args.iter().skip(1) {
        match arg.as_str() {
            "testnet" => return NetworkType::Testnet,
            "mainnet" => return NetworkType::Mainnet,
            _ => {}
        }
    }

    NetworkType::Testnet
}

fn create_game_handle(
    network_type: NetworkType,
) -> Result<Box<dyn poker::game::GameHandle>, Box<dyn std::error::Error>> {
    match network_type {
        NetworkType::Testnet => {
            let private_key =
                std::env::var("PRIVATE_KEY").unwrap_or_else(|_| DEFAULT_PRIVATE_KEY.to_string());
            let endpoint =
                std::env::var("ENDPOINT").unwrap_or_else(|_| DEFAULT_ENDPOINT.to_string());
            Ok(new_testnet_game(&private_key, &endpoint)?)
        }
        NetworkType::Mainnet => {
            let private_key = std::env::var("PRIVATE_KEY").expect("PRIVATE_KEY not set.");
            let endpoint = std::env::var("ENDPOINT").expect("ENDPOINT not set.");
            Ok(new_testnet_game(&private_key, &endpoint)?)
        }
        NetworkType::Interpreter => {
            eprintln!("Interpreter mode only available in test mode");
            std::process::exit(1);
        }
    }
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

fn handle_event() -> Result<Option<GameMessage>, Box<dyn std::error::Error>> {
    if event::poll(Duration::from_millis(100))? {
        if let Event::Key(key) = event::read()? {
            return Ok(handle_game_key(key));
        }
    }
    Ok(Some(GameMessage::Tick))
}
