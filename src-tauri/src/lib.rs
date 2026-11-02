use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WindowEvent,
};

pub struct DesktopAppState {
    pub minimize_to_tray: AtomicBool,
    pub always_on_top: AtomicBool,
}

#[derive(Serialize)]
pub struct DesktopRuntimeInfo {
    pub is_tauri: bool,
    pub platform: String,
    pub arch: String,
    pub app_version: String,
    pub minimize_to_tray: bool,
    pub always_on_top: bool,
    pub local_data_dir: String,
}

#[tauri::command]
fn get_desktop_runtime_info(
    app: AppHandle,
    state: State<'_, DesktopAppState>,
) -> DesktopRuntimeInfo {
    let local_data_dir = app
        .path()
        .app_local_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| ".local-data".to_string());

    DesktopRuntimeInfo {
        is_tauri: true,
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        app_version: app.package_info().version.to_string(),
        minimize_to_tray: state.minimize_to_tray.load(Ordering::Relaxed),
        always_on_top: state.always_on_top.load(Ordering::Relaxed),
        local_data_dir,
    }
}

#[tauri::command]
fn set_minimize_to_tray(enabled: bool, state: State<'_, DesktopAppState>) -> bool {
    state.minimize_to_tray.store(enabled, Ordering::Relaxed);
    enabled
}

#[tauri::command]
fn set_window_always_on_top(
    app: AppHandle,
    enabled: bool,
    state: State<'_, DesktopAppState>,
) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_always_on_top(enabled)
            .map_err(|e| e.to_string())?;
        state.always_on_top.store(enabled, Ordering::Relaxed);
        Ok(enabled)
    } else {
        Err("Main window not found".to_string())
    }
}

#[tauri::command]
fn window_control(app: AppHandle, action: String) -> Result<String, String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    match action.as_str() {
        "minimize" => {
            window.minimize().map_err(|e| e.to_string())?;
            Ok("minimized".to_string())
        }
        "toggle_maximize" => {
            let is_max = window.is_maximized().unwrap_or(false);
            if is_max {
                window.unmaximize().map_err(|e| e.to_string())?;
                Ok("unmaximized".to_string())
            } else {
                window.maximize().map_err(|e| e.to_string())?;
                Ok("maximized".to_string())
            }
        }
        "hide_to_tray" => {
            window.hide().map_err(|e| e.to_string())?;
            Ok("hidden_to_tray".to_string())
        }
        "show" => {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
            Ok("shown".to_string())
        }
        "close" => {
            app.exit(0);
            Ok("closed".to_string())
        }
        _ => Err(format!("Unknown window action: {}", action)),
    }
}

#[tauri::command]
fn print_thermal_receipt(
    app: AppHandle,
    html: String,
    paper_width: String,
) -> Result<String, String> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit(
            "desktop://print-receipt-Dispatched",
            serde_json::json!({
                "paperWidth": paper_width,
                "bytes": html.len()
            }),
        );
        // Trigger native webview print dialog / spooler
        let _ = window.print();
        Ok("printed".to_string())
    } else {
        Err("Main window not available for printing".to_string())
    }
}

fn ensure_backend_server() {
    use std::net::{SocketAddr, TcpStream};
    use std::time::Duration;

    let addr: SocketAddr = "127.0.0.1:3000".parse().unwrap();
    if TcpStream::connect_timeout(&addr, Duration::from_millis(400)).is_err() {
        eprintln!("[EasyDebt Tauri] Port 3000 not responding, starting Next.js standalone server...");
        let manifest_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let project_dir = manifest_dir
            .parent()
            .map(|parent| parent.to_path_buf())
            .unwrap_or(manifest_dir);
        let script = project_dir.join("scripts/start-tauri-standalone.mjs");
        if script.exists() {
            let log_file = std::fs::File::create(
                dirs_next().unwrap_or_else(|| std::path::PathBuf::from("/tmp"))
                    .join(".easydebt-desktop-server.log")
            );

            let mut cmd = std::process::Command::new("node");
            cmd.arg(&script).current_dir(&project_dir);

            if let Ok(file) = log_file {
                let stdout_file = file.try_clone().unwrap_or(file);
                cmd.stdout(stdout_file);
            }

            match cmd.spawn() {
                Ok(_) => eprintln!("[EasyDebt Tauri] Next.js server spawned successfully"),
                Err(e) => eprintln!("[EasyDebt Tauri] Failed to spawn Next.js server: {}", e),
            }
        }
    } else {
        eprintln!("[EasyDebt Tauri] Next.js server is already running on port 3000");
    }
}

fn dirs_next() -> Option<std::path::PathBuf> {
    std::env::var_os("HOME").map(std::path::PathBuf::from)
}

fn setup_system_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let show_item = MenuItem::with_id(
        app,
        "show_window",
        "EasyDebt oynasini ochish",
        true,
        None::<&str>,
    )?;
    let sync_item = MenuItem::with_id(
        app,
        "sync_now",
        "Server bilan hozir sinxronlash",
        true,
        None::<&str>,
    )?;
    let quick_create_item = MenuItem::with_id(
        app,
        "quick_create",
        "Tezkor qarz / to'lov qo'shish",
        true,
        None::<&str>,
    )?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(
        app,
        "quit_app",
        "Dasturdan to'liq chiqish",
        true,
        None::<&str>,
    )?;

    let menu = Menu::with_items(
        app,
        &[&show_item, &sync_item, &quick_create_item, &sep, &quit_item],
    )?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("EasyDebt Desktop — Onlayn va Offlayn Qarzlar Boshqaruvi")
        .on_menu_event(|app: &AppHandle, event| match event.id.as_ref() {
            "show_window" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "sync_now" => {
                let _ = app.emit("desktop://trigger-sync", ());
            }
            "quick_create" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
                let _ = app.emit("desktop://quick-create", ());
            }
            "quit_app" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(DesktopAppState {
            minimize_to_tray: AtomicBool::new(true),
            always_on_top: AtomicBool::new(false),
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            ensure_backend_server();
            if let Err(err) = setup_system_tray(app) {
                eprintln!("[EasyDebt Tauri] System tray init warning: {}", err);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<DesktopAppState>();
                if state.minimize_to_tray.load(Ordering::Relaxed) {
                    api.prevent_close();
                    let _ = window.hide();
                    let _ = window.emit("desktop://minimized-to-tray", ());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_desktop_runtime_info,
            set_minimize_to_tray,
            set_window_always_on_top,
            window_control,
            print_thermal_receipt
        ])
        .run(tauri::generate_context!())
        .expect("error while running EasyDebt Tauri application");
}
