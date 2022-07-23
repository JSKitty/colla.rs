#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::{command, Manager};
use tungstenite::WebSocket;
use std::sync::Mutex;

struct CollarServer {
  socket: Mutex<WebSocket<tungstenite::stream::MaybeTlsStream<std::net::TcpStream>>>
}

impl CollarServer {
    pub fn run(&self, mode: &str, level: i16, duration: i32) {
        // Note: serde is not needed *yet* as this is the only place JSON is handled in the backend
        let cmd = format!("{{\"mode\": \"{mode}\", \"level\": {level}, \"duration\": {duration}}}");
        self.socket.lock().unwrap().write_message(tungstenite::Message::from(cmd)).expect("Failed to send test msg!");
    }

    pub fn read(&self) -> String {
        self.socket.lock().unwrap().read_message().unwrap().into_text().unwrap()
    }
}

#[command]
fn collar_connect(app: tauri::AppHandle, server: String) {
    // TODO: error handling + frontend Result returns on failed socket connection
    let (socket, _response) = tungstenite::connect(server).expect("Couldn't connect!");
    let server = CollarServer { socket: Mutex::new(socket) };
    app.manage(server);
}

#[command]
fn collar_run(app: tauri::AppHandle, mode: &str, level: i16, duration: i32) {
    // TODO: return a Result error if the socket is broken and/or current packet fails
    let state = app.state::<CollarServer>();
    let collar = state.inner();
    collar.run(mode, level, duration)
}

#[command]
fn collar_read(app: tauri::AppHandle) -> String {
    // TODO: return a Result error if the socket is broken
    // TODO: also potentially move socket reading into a dedicated thread with an event system to the main thread?
    let state = app.state::<CollarServer>();
    let collar = state.inner();
    collar.read()
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      collar_connect,
      collar_run,
      collar_read
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
