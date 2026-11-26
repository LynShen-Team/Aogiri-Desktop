//! Whether the system asks apps to keep quiet now, so the app's sounds
//! (src/lib/sounds/play.ts) keep still. Windows says so through the shell's
//! notification state: quiet hours, a presentation, a full-screen game or
//! app, the screen locked. Other systems do not tell an app (macOS Focus is
//! private to the system), so there it is never quiet.

#[tauri::command]
pub fn system_quiet() -> bool {
    #[cfg(windows)]
    {
        use windows::Win32::UI::Shell::{
            SHQueryUserNotificationState, QUNS_ACCEPTS_NOTIFICATIONS, QUNS_APP,
        };
        // SAFETY: the call takes nothing and fills the state it returns.
        match unsafe { SHQueryUserNotificationState() } {
            Ok(state) => state != QUNS_ACCEPTS_NOTIFICATIONS && state != QUNS_APP,
            Err(_) => false,
        }
    }
    #[cfg(not(windows))]
    {
        false
    }
}
