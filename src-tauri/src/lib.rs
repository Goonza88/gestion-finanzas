use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, Manager};

const MAX_LOCAL_BACKUPS: usize = 30;
const BACKUP_PREFIX: &str = "gestion-financiera-";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalBackupInfo {
  name: String,
  modified_at: u64,
}

fn local_backups_directory(app: &AppHandle) -> Result<PathBuf, String> {
  app.path()
    .app_local_data_dir()
    .map(|directory| directory.join("backups"))
    .map_err(|error| format!("No se pudo localizar la carpeta local de datos: {error}"))
}

fn is_safe_backup_name(name: &str) -> bool {
  Path::new(name).file_name().and_then(|value| value.to_str()) == Some(name)
    && name.starts_with(BACKUP_PREFIX)
    && name.ends_with(".json")
}

fn available_backups(directory: &Path) -> Result<Vec<(u64, PathBuf)>, String> {
  let entries = match fs::read_dir(directory) {
    Ok(entries) => entries,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
    Err(error) => return Err(format!("No se pudieron leer las copias locales: {error}")),
  };

  let mut backups = Vec::new();
  for entry in entries {
    let entry = entry.map_err(|error| format!("No se pudo leer una copia local: {error}"))?;
    let path = entry.path();
    let Some(name) = path.file_name().and_then(|value| value.to_str()) else { continue };
    if !is_safe_backup_name(name) || !path.is_file() { continue }
    let modified = entry.metadata().ok()
      .and_then(|metadata| metadata.modified().ok())
      .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
      .map(|duration| duration.as_millis() as u64)
      .unwrap_or(0);
    backups.push((modified, path));
  }
  backups.sort_by(|left, right| right.0.cmp(&left.0));
  Ok(backups)
}

#[tauri::command]
fn create_local_backup(app: AppHandle, contents: String, timestamp: String) -> Result<String, String> {
  let directory = local_backups_directory(&app)?;
  fs::create_dir_all(&directory).map_err(|error| format!("No se pudo crear la carpeta de copias: {error}"))?;

  let safe_timestamp: String = timestamp.chars()
    .filter(|character| character.is_ascii_alphanumeric() || *character == '-' || *character == '_')
    .collect();
  if safe_timestamp.is_empty() {
    return Err("La fecha de la copia no es válida.".into());
  }

  let mut name = format!("{safe_timestamp}.json");
  let mut suffix = 1;
  while directory.join(&name).exists() {
    name = format!("{safe_timestamp}_{suffix}.json");
    suffix += 1;
  }
  fs::write(directory.join(&name), contents)
    .map_err(|error| format!("No se pudo guardar la copia local: {error}"))?;

  let mut backups = available_backups(&directory)?;
  backups.sort_by(|left, right| right.0.cmp(&left.0));
  for (_, path) in backups.into_iter().skip(MAX_LOCAL_BACKUPS) {
    let _ = fs::remove_file(path);
  }

  Ok(name)
}

#[tauri::command]
fn list_local_backups(app: AppHandle) -> Result<Vec<LocalBackupInfo>, String> {
  let directory = local_backups_directory(&app)?;
  available_backups(&directory).map(|backups| backups.into_iter().map(|(modified_at, path)| {
    LocalBackupInfo {
      name: path.file_name().and_then(|value| value.to_str()).unwrap_or_default().to_string(),
      modified_at,
    }
  }).collect())
}

#[tauri::command]
fn read_local_backup(app: AppHandle, name: String) -> Result<String, String> {
  if !is_safe_backup_name(&name) {
    return Err("El nombre de la copia no es válido.".into());
  }
  fs::read_to_string(local_backups_directory(&app)?.join(name))
    .map_err(|error| format!("No se pudo abrir la copia local: {error}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      create_local_backup,
      list_local_backups,
      read_local_backup,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
