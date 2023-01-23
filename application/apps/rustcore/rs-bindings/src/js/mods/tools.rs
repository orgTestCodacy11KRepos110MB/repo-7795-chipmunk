use node_bindgen::derive::node_bindgen;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::{
    path::Path,
    process::{Child, Command},
};

#[cfg(not(target_os = "windows"))]
pub fn spawn(exe: &Path, args: Vec<String>) -> Result<Child, String> {
    Command::new(exe)
        .args(args)
        .spawn()
        .map_err(|e| format!("{e}"))
}

#[cfg(target_os = "windows")]
pub fn spawn(exe: &Path, args: Vec<String>) -> Result<Child, String> {
    const DETACHED_PROCESS: u32 = 0x0000_0008;
    const CREATE_NEW_PROCESS_GROUP: u32 = 0x0000_0200;
    Command::new(exe)
        .args(args)
        .creation_flags(DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP)
        .spawn()
        .map_err(|e| format!("{}", e))
}

#[node_bindgen]
async fn execute(exe: String, args: Vec<String>) -> Result<(), String> {
    spawn(Path::new(&exe), args).map(|_c| Ok(()))?
}
