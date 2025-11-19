use clap::Parser;
use crossterm::{
    event::{self, Event},
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use poker::game::{
    Game, GameMessage, handle_game_key, new_game_from_private_key, new_testnet_game,
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

#[derive(Parser)]
#[command(name = "poker")]
#[command(about = "Mental Poker on Aleo", long_about = None)]
struct Cli {
    #[arg(short, long)]
    index: Option<u16>,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let cli = Cli::parse();

    let endpoint = std::env::var("ENDPOINT").expect("ENDPOINT environment variable must be set");
    let network = std::env::var("NETWORK").expect("NETWORK environment variable must be set");

    let network_type = match network.to_lowercase().as_str() {
        "testnet" => NetworkType::Testnet,
        "mainnet" => NetworkType::Mainnet,
        _ => {
            eprintln!(
                "Invalid NETWORK value: '{}'. Must be 'testnet' or 'mainnet'",
                network
            );
            std::process::exit(1);
        }
    };

    init_file_logger(cli.index)?;

    let original_hook = panic::take_hook();
    panic::set_hook(Box::new(move |panic_info| {
        let _ = disable_raw_mode();
        let _ = execute!(io::stdout(), LeaveAlternateScreen);
        original_hook(panic_info);
    }));

    let handle = if let Some(index) = cli.index {
        new_testnet_game(index, &endpoint)?
    } else {
        let private_key =
            std::env::var("PRIVATE_KEY").expect("PRIVATE_KEY environment variable must be set");
        new_game_from_private_key(&private_key, &endpoint)?
    };
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
            while let Some(result_msg) = game.execute_pending_command() {
                current_msg = Some(result_msg);
                while let Some(msg) = current_msg {
                    current_msg = game.update(msg);
                }
            }
        }
    }

    restore_terminal(&mut terminal)?;
    Ok(())
}

fn init_file_logger(account_index: Option<u16>) -> Result<(), Box<dyn std::error::Error>> {
    use std::fs::File;
    use std::io::Write;

    let log_file_name = if let Some(index) = account_index {
        format!(".logsP{}", index + 1)
    } else {
        ".logs".to_string()
    };
    let log_file = File::create(&log_file_name)?;

    env_logger::Builder::from_env(env_logger::Env::default().filter_or("RUST_LOG", "info"))
        .target(env_logger::Target::Pipe(Box::new(log_file)))
        .format(|buf, record| writeln!(buf, "{}", record.args()))
        .filter_module("leo_bindings", log::LevelFilter::Debug)
        .filter_module("credits_bindings", log::LevelFilter::Debug)
        .filter_module("mental_poker_bindings", log::LevelFilter::Debug)
        .filter_module("commutative_encryption_bindings", log::LevelFilter::Debug)
        .filter(Some("ureq"), log::LevelFilter::Off)
        .try_init()?;

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

fn handle_event() -> Result<Option<GameMessage>, Box<dyn std::error::Error>> {
    if event::poll(Duration::from_millis(100))? {
        if let Event::Key(key) = event::read()? {
            return Ok(handle_game_key(key));
        }
    }
    Ok(Some(GameMessage::Tick))
}
