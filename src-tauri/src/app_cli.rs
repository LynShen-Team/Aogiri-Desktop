//! The lynshen CLI a release build ships (a Tauri sidecar next to the app's
//! executable). The app runs its own copy, never another `lynshen` on PATH, so
//! the engine and the daemon always match the app's version.
//!
//! The copy lives at `~/.lynshen/bin/lynshen`: the daemon outlives the app, so
//! it must not run from inside an app bundle that an update replaces or a user
//! moves. A CLI found there knows it belongs to the app (`lynshen update` leaves
//! it to the app's updates). Development builds ship no sidecar and keep
//! resolving `lynshen` as before (see backend::resolve_backend_bin).

use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

fn exe_name() -> &'static str {
    if cfg!(windows) {
        "lynshen.exe"
    } else {
        "lynshen"
    }
}

fn home() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
}

/// Where the app keeps its copy.
pub fn managed_path() -> Option<PathBuf> {
    Some(home()?.join(".lynshen").join("bin").join(exe_name()))
}

/// The sidecar inside this build, when it has one. A debug build has none:
/// a `lynshen` left in target/debug by an older build is not the app's own.
/// It is named `lynshen-cli`: up to 0.5.x the app's own executable was
/// `LynShen`, which a `lynshen` beside it would have been the same file as on
/// case-insensitive file systems (macOS, Windows). Installers and packages
/// know it by this name.
fn bundled() -> Option<PathBuf> {
    if cfg!(debug_assertions) {
        return None;
    }
    let dir = std::env::current_exe().ok()?.parent()?.to_path_buf();
    let path = dir.join(if cfg!(windows) { "lynshen-cli.exe" } else { "lynshen-cli" });
    path.is_file().then_some(path)
}

/// The installed copy, installed or refreshed on first use in a run.
static INSTALLED: Mutex<Option<PathBuf>> = Mutex::new(None);

/// The lynshen this app runs: its own copy, or None in a build without one.
/// Falls back to the sidecar itself when the copy cannot be written.
pub fn path() -> Option<PathBuf> {
    let bundled = bundled()?;
    let mut installed = INSTALLED.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(path) = installed.as_ref() {
        return Some(path.clone());
    }
    let path = match managed_path().map(|dest| install(&bundled, &dest).map(|()| dest)) {
        Some(Ok(dest)) => dest,
        Some(Err(error)) => {
            eprintln!("could not install the app's lynshen: {error}");
            bundled
        }
        None => bundled,
    };
    *installed = Some(path.clone());
    Some(path)
}

/// Copies `bundled` to `dest` unless it is already there, through a
/// temporary file so a running daemon keeps its program until it restarts.
fn install(bundled: &Path, dest: &Path) -> Result<(), String> {
    if same_contents(bundled, dest) {
        return Ok(());
    }
    let dir = dest.parent().ok_or("no parent directory")?;
    fs::create_dir_all(dir).map_err(|e| format!("{}: {e}", dir.display()))?;
    let partial = dir.join(format!(".{}.new", exe_name()));
    fs::copy(bundled, &partial).map_err(|e| format!("{}: {e}", partial.display()))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&partial, fs::Permissions::from_mode(0o755)).map_err(|e| e.to_string())?;
    }
    replace(&partial, dest).inspect_err(|_| {
        let _ = fs::remove_file(&partial);
    })
}

/// Windows keeps a running executable locked but lets it be renamed, so the
/// old copy (the daemon's program) moves aside first. A copy moved aside by
/// an earlier update may still run (a daemon that never got idle): it keeps
/// its name and this one takes a fresh one; the ones no longer running go.
fn replace(new: &Path, dest: &Path) -> Result<(), String> {
    if cfg!(windows) && dest.exists() {
        let dir = dest.parent().ok_or("no parent directory")?;
        let stem = dest.file_stem().and_then(|s| s.to_str()).unwrap_or("lynshen");
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with(&format!("{stem}.old")) && name.ends_with(".exe") {
                    let _ = fs::remove_file(entry.path());
                }
            }
        }
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        let old = dir.join(format!("{stem}.old-{stamp}.exe"));
        fs::rename(dest, &old).map_err(|e| format!("{}: {e}", dest.display()))?;
    }
    fs::rename(new, dest).map_err(|e| format!("{}: {e}", dest.display()))
}

fn same_contents(a: &Path, b: &Path) -> bool {
    let (Ok(ma), Ok(mb)) = (fs::metadata(a), fs::metadata(b)) else {
        return false;
    };
    if ma.len() != mb.len() {
        return false;
    }
    let read = |path: &Path| -> Option<Vec<u8>> {
        let mut bytes = Vec::with_capacity(ma.len() as usize);
        fs::File::open(path).ok()?.read_to_end(&mut bytes).ok()?;
        Some(bytes)
    };
    matches!((read(a), read(b)), (Some(x), Some(y)) if x == y)
}

/// The version of the lynshen this build ships (src-tauri/lynshen-cli.version),
/// None in a build without one. A daemon of another version is replaced once
/// it is idle (see daemon.ts).
#[tauri::command]
pub fn app_cli_version() -> Option<String> {
    bundled()?;
    Some(include_str!("../lynshen-cli.version").trim().to_string())
}

/// Ends the daemon listening on the app's daemon port right away: for
/// daemons too old to restart themselves once idle (`restart_when_idle`). The
/// app starts its own on the next connection. Off the main thread: on
/// Windows it waits for PowerShell, which takes seconds to start.
#[tauri::command(async)]
pub fn replace_daemon() -> Result<(), String> {
    let port = crate::DAEMON_ADDR.rsplit(':').next().unwrap_or("7788");
    // A login service would only start the old one again.
    if daemon_service_installed() {
        return Err("the lynshen daemon runs as a login service (lynshen daemon install); reinstall it with this version".to_string());
    }
    #[cfg(unix)]
    let status = std::process::Command::new("sh")
        .args([
            "-c",
            &format!("kill -TERM $(lsof -nP -t -iTCP:{port} -sTCP:LISTEN) 2>/dev/null"),
        ])
        .status();
    #[cfg(windows)]
    let status = {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                &format!(
                    "Get-NetTCPConnection -LocalPort {port} -State Listen -ErrorAction SilentlyContinue | \
                     ForEach-Object {{ Stop-Process -Id $_.OwningProcess -Force }}"
                ),
            ])
            .creation_flags(0x0800_0000) // CREATE_NO_WINDOW
            .status()
    };
    status.map(|_| ()).map_err(|e| e.to_string())
}

/// Whether the user installed the daemon as a login service
/// (`lynshen daemon install`); the app then leaves the running daemon alone.
fn daemon_service_installed() -> bool {
    let Some(home) = home() else {
        return false;
    };
    home.join("Library/LaunchAgents/cn.lynshen.daemon.plist").exists()
        || home.join(".config/systemd/user/lynshen-daemon.service").exists()
}

/// What 「在终端中使用 lynshen 命令」 did.
#[derive(serde::Serialize)]
pub struct CliCommand {
    /// Where the command is.
    path: String,
    /// The shell startup files that put `~/.local/bin` on PATH from now on
    /// (as `~/…`); empty when the login shell has it already.
    added_to: Vec<String>,
    /// `~/.local/bin` is not on PATH and the app could not add it (a shell it
    /// does not know, or a startup file it cannot write): the user adds it.
    add_path_yourself: bool,
}

/// Makes `lynshen` a terminal command running the app's copy: a link in
/// `~/.local/bin`, with that directory on PATH in the login shell's startup
/// file (macOS, Linux), or `~/.lynshen/bin` on the user's PATH (Windows).
/// Off the main thread: it may run the login shell to read its PATH.
#[tauri::command(async)]
pub fn install_cli_command() -> Result<CliCommand, String> {
    let target = path().ok_or("this build has no bundled lynshen")?;
    #[cfg(unix)]
    {
        let home = home().ok_or("no home directory")?;
        let dir = home.join(".local").join("bin");
        fs::create_dir_all(&dir).map_err(|e| format!("{}: {e}", dir.display()))?;
        let link = dir.join("lynshen");
        link_to(&target, &link)?;
        // Also when the link is there already: versions up to 0.11 made it
        // and left PATH alone.
        let login_path = login_shell_path(&dir);
        let vars = crate::shell_env::snapshot_vars().unwrap_or_default();
        let var = |name: &str| {
            vars.get(name)
                .cloned()
                .or_else(|| std::env::var(name).ok())
                .map(PathBuf::from)
                .filter(|path| path.is_absolute())
        };
        let (zdotdir, config_home) = (var("ZDOTDIR"), var("XDG_CONFIG_HOME"));
        let program = crate::shell_env::default_shell();
        let shell = shell_path::Shell {
            program: &program,
            home: &home,
            zdotdir: zdotdir.as_deref(),
            config_home: config_home.as_deref(),
        };
        let added = shell_path::put_on_path(&shell, login_path.as_deref());
        Ok(CliCommand {
            path: link.display().to_string(),
            added_to: added.files.iter().map(|file| shell_path::tilde(file, &home)).collect(),
            add_path_yourself: added.by_hand,
        })
    }
    #[cfg(windows)]
    {
        let dir = target.parent().ok_or("no parent directory")?.display().to_string();
        // The user PATH from the registry (not this process's merged one),
        // with the directory appended once.
        let script = format!(
            "$d='{dir}'; $p=[Environment]::GetEnvironmentVariable('Path','User'); \
             if (-not (($p -split ';') -contains $d)) {{ \
             [Environment]::SetEnvironmentVariable('Path', (($p.TrimEnd(';') + ';' + $d).TrimStart(';')), 'User') }}"
        );
        let status = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            return Err(format!("could not add {dir} to PATH ({status})"));
        }
        Ok(CliCommand {
            path: target.display().to_string(),
            added_to: Vec::new(),
            add_path_yourself: false,
        })
    }
}

/// Points `link` at `target`, replacing a link to anything else.
#[cfg(unix)]
fn link_to(target: &Path, link: &Path) -> Result<(), String> {
    match fs::symlink_metadata(link) {
        Ok(meta) if meta.file_type().is_symlink() => {
            if fs::read_link(link).ok().as_deref() == Some(target) {
                return Ok(());
            }
            fs::remove_file(link).map_err(|e| e.to_string())?;
        }
        // A real file someone put there: theirs, not ours to replace.
        Ok(_) => return Err(format!("{} already exists", link.display())),
        Err(_) => {}
    }
    std::os::unix::fs::symlink(target, link).map_err(|e| e.to_string())
}

/// The login shell's PATH, read again when the snapshot lacks `dir`: the
/// snapshot is as old as the app (or its last re-read), and a profile edited
/// since may have added it.
#[cfg(unix)]
fn login_shell_path(dir: &Path) -> Option<String> {
    let path = crate::shell_env::snapshot_path();
    if path.as_deref().is_some_and(|path| shell_path::on_path(path, dir)) {
        return path;
    }
    if crate::shell_env::recapture_if_older(std::time::Duration::ZERO) {
        return crate::shell_env::snapshot_path();
    }
    path
}

/// Puts `~/.local/bin` on PATH in the login shell's startup files with the
/// marked block LynShen CLI's one-line installer writes (Aogiri-CLI
/// `packaging/installer/install.sh`, `append_block`), byte for byte: each
/// sees the other's block and adds none of its own, and the installer's
/// `--uninstall` removes this one too.
#[cfg(unix)]
mod shell_path {
    use std::fs;
    use std::io::{self, Write};
    use std::path::{Path, PathBuf};

    const MARKER_START: &str = "# >>> lynshen installer >>>";
    const MARKER_END: &str = "# <<< lynshen installer <<<";

    #[derive(Clone, Copy)]
    enum Syntax {
        Sh,
        Fish,
    }

    /// The login shell and where it keeps its startup files.
    pub(super) struct Shell<'a> {
        /// The shell's program, as in $SHELL (`/bin/zsh`).
        pub program: &'a str,
        pub home: &'a Path,
        /// $ZDOTDIR (zsh) and $XDG_CONFIG_HOME (fish), when set.
        pub zdotdir: Option<&'a Path>,
        pub config_home: Option<&'a Path>,
    }

    /// What putting `~/.local/bin` on PATH did.
    #[derive(Debug, Default, PartialEq)]
    pub(super) struct Added {
        /// The startup files that got the block now.
        pub files: Vec<PathBuf>,
        /// The shell's startup file did not get it: a shell the installer
        /// does not know either, or a file that cannot be written.
        pub by_hand: bool,
    }

    /// Adds the block to the shell's startup files unless `login_path`, the
    /// login shell's PATH, has `~/.local/bin` already.
    pub(super) fn put_on_path(shell: &Shell, login_path: Option<&str>) -> Added {
        let dir = shell.home.join(".local").join("bin");
        if login_path.is_some_and(|path| on_path(path, &dir)) {
            return Added::default();
        }
        let Some((syntax, files)) = startup_files(shell) else {
            return Added {
                files: Vec::new(),
                by_hand: true,
            };
        };
        let mut added = Added::default();
        for (i, file) in files.iter().enumerate() {
            match append_block(file, syntax) {
                Ok(true) => added.files.push(file.clone()),
                Ok(false) => {}
                Err(error) => {
                    eprintln!("could not add ~/.local/bin to PATH in {}: {error}", file.display());
                    // The first is the one terminals read; bash's login file
                    // is a bonus, as in the installer.
                    added.by_hand |= i == 0;
                }
            }
        }
        added
    }

    pub(super) fn on_path(path: &str, dir: &Path) -> bool {
        std::env::split_paths(path).any(|entry| entry.as_path() == dir)
    }

    /// The installer's files for the shell, the one interactive shells read
    /// first; None for a shell it does not handle.
    fn startup_files(shell: &Shell) -> Option<(Syntax, Vec<PathBuf>)> {
        let home = shell.home;
        match Path::new(shell.program).file_name()?.to_str()? {
            "zsh" => Some((Syntax::Sh, vec![shell.zdotdir.unwrap_or(home).join(".zshrc")])),
            // Login shells (macOS Terminal, ssh) read one of the others
            // instead of ~/.bashrc.
            "bash" => Some((Syntax::Sh, vec![home.join(".bashrc"), bash_login_file(home)])),
            "fish" => {
                let config = shell.config_home.map_or_else(|| home.join(".config"), Path::to_path_buf);
                Some((Syntax::Fish, vec![config.join("fish").join("config.fish")]))
            }
            _ => None,
        }
    }

    /// The login file bash reads: the first of these there is, else a new
    /// ~/.bash_profile.
    fn bash_login_file(home: &Path) -> PathBuf {
        [".bash_profile", ".bash_login", ".profile"]
            .iter()
            .map(|name| home.join(name))
            .find(|file| file.exists())
            .unwrap_or_else(|| home.join(".bash_profile"))
    }

    fn block(syntax: Syntax) -> String {
        let line = match syntax {
            Syntax::Sh => r#"case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) export PATH="$HOME/.local/bin:$PATH" ;; esac"#,
            Syntax::Fish => r#"contains -- "$HOME/.local/bin" $PATH; or set -gx PATH "$HOME/.local/bin" $PATH"#,
        };
        format!("\n{MARKER_START}\n{line}\n{MARKER_END}\n")
    }

    /// Appends the block to `file`, creating it, unless the file has one
    /// (the installer's, whatever directory it adds). True when it wrote.
    fn append_block(file: &Path, syntax: Syntax) -> io::Result<bool> {
        match fs::read(file) {
            Ok(text) if String::from_utf8_lossy(&text).contains(MARKER_START) => return Ok(false),
            Ok(_) => {}
            Err(error) if error.kind() == io::ErrorKind::NotFound => {}
            Err(error) => return Err(error),
        }
        if let Some(dir) = file.parent() {
            fs::create_dir_all(dir)?;
        }
        fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(file)?
            .write_all(block(syntax).as_bytes())?;
        Ok(true)
    }

    /// `file` as `~/…` when it is in `home`.
    pub(super) fn tilde(file: &Path, home: &Path) -> String {
        match file.strip_prefix(home) {
            Ok(rest) => format!("~/{}", rest.display()),
            Err(_) => file.display().to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("lynshen-app-cli-{}-{name}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn the_copy_is_written_once_and_refreshed_when_the_app_changes() {
        let dir = temp("install");
        let bundled = dir.join("sidecar");
        let dest = dir.join("bin").join(exe_name());
        fs::write(&bundled, b"v1").unwrap();
        install(&bundled, &dest).unwrap();
        assert_eq!(fs::read(&dest).unwrap(), b"v1");
        let first = fs::metadata(&dest).unwrap().modified().unwrap();
        install(&bundled, &dest).unwrap();
        assert_eq!(fs::metadata(&dest).unwrap().modified().unwrap(), first);
        fs::write(&bundled, b"v2").unwrap();
        install(&bundled, &dest).unwrap();
        assert_eq!(fs::read(&dest).unwrap(), b"v2");
        assert!(!dir.join("bin").join(format!(".{}.new", exe_name())).exists());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn contents_are_compared_byte_for_byte() {
        let dir = temp("same");
        let (a, b) = (dir.join("a"), dir.join("b"));
        fs::write(&a, b"abc").unwrap();
        fs::write(&b, b"abd").unwrap();
        assert!(!same_contents(&a, &b));
        fs::write(&b, b"abc").unwrap();
        assert!(same_contents(&a, &b));
        assert!(!same_contents(&a, &dir.join("missing")));
        let _ = fs::remove_dir_all(&dir);
    }

    /// The block LynShen CLI's installer writes (install.sh `append_block`,
    /// installing in ~/.local/bin), spelled out here on its own.
    #[cfg(unix)]
    const SH_BLOCK: &str = "\n# >>> lynshen installer >>>\ncase \":$PATH:\" in *\":$HOME/.local/bin:\"*) ;; *) export PATH=\"$HOME/.local/bin:$PATH\" ;; esac\n# <<< lynshen installer <<<\n";
    #[cfg(unix)]
    const FISH_BLOCK: &str = "\n# >>> lynshen installer >>>\ncontains -- \"$HOME/.local/bin\" $PATH; or set -gx PATH \"$HOME/.local/bin\" $PATH\n# <<< lynshen installer <<<\n";

    #[cfg(unix)]
    fn shell<'a>(program: &'a str, home: &'a Path) -> shell_path::Shell<'a> {
        shell_path::Shell {
            program,
            home,
            zdotdir: None,
            config_home: None,
        }
    }

    #[cfg(unix)]
    fn read(file: &Path) -> String {
        fs::read_to_string(file).unwrap_or_default()
    }

    #[cfg(unix)]
    #[test]
    fn zsh_gets_the_installers_block_once() {
        let home = temp("zsh");
        let zshrc = home.join(".zshrc");
        // No newline at the end: the block's leading one ends that line.
        fs::write(&zshrc, "export EDITOR=vim").unwrap();
        let added = shell_path::put_on_path(&shell("/bin/zsh", &home), Some("/usr/bin:/bin"));
        assert_eq!(
            added,
            shell_path::Added {
                files: vec![zshrc.clone()],
                by_hand: false
            }
        );
        assert_eq!(read(&zshrc), format!("export EDITOR=vim{SH_BLOCK}"));
        let again = shell_path::put_on_path(&shell("/bin/zsh", &home), Some("/usr/bin:/bin"));
        assert_eq!(again, shell_path::Added::default());
        assert_eq!(read(&zshrc), format!("export EDITOR=vim{SH_BLOCK}"));
        assert_eq!(shell_path::tilde(&zshrc, &home), "~/.zshrc");
        let _ = fs::remove_dir_all(&home);
    }

    #[cfg(unix)]
    #[test]
    fn zsh_uses_zdotdir() {
        let home = temp("zdotdir");
        let zdotdir = home.join(".config").join("zsh");
        let zsh = shell_path::Shell {
            zdotdir: Some(zdotdir.as_path()),
            ..shell("zsh", &home)
        };
        let added = shell_path::put_on_path(&zsh, None);
        assert_eq!(added.files, vec![zdotdir.join(".zshrc")]);
        assert_eq!(read(&zdotdir.join(".zshrc")), SH_BLOCK);
        assert!(!home.join(".zshrc").exists());
        let _ = fs::remove_dir_all(&home);
    }

    #[cfg(unix)]
    #[test]
    fn bash_gets_bashrc_and_the_login_file_it_reads() {
        // None yet: a new ~/.bash_profile.
        let home = temp("bash-none");
        let added = shell_path::put_on_path(&shell("/bin/bash", &home), None);
        assert_eq!(added.files, vec![home.join(".bashrc"), home.join(".bash_profile")]);
        assert_eq!(read(&home.join(".bashrc")), SH_BLOCK);
        assert_eq!(read(&home.join(".bash_profile")), SH_BLOCK);
        let _ = fs::remove_dir_all(&home);

        // Only ~/.profile (Debian, Ubuntu): no ~/.bash_profile to hide it.
        let home = temp("bash-profile");
        fs::write(home.join(".profile"), "# ~/.profile\n").unwrap();
        let added = shell_path::put_on_path(&shell("/usr/bin/bash", &home), None);
        assert_eq!(added.files, vec![home.join(".bashrc"), home.join(".profile")]);
        assert_eq!(read(&home.join(".profile")), format!("# ~/.profile\n{SH_BLOCK}"));
        assert!(!home.join(".bash_profile").exists());
        let _ = fs::remove_dir_all(&home);

        // ~/.bash_login comes before ~/.profile.
        let home = temp("bash-login");
        fs::write(home.join(".bash_login"), "").unwrap();
        fs::write(home.join(".profile"), "").unwrap();
        let added = shell_path::put_on_path(&shell("bash", &home), None);
        assert_eq!(added.files, vec![home.join(".bashrc"), home.join(".bash_login")]);
        assert_eq!(read(&home.join(".profile")), "");
        let _ = fs::remove_dir_all(&home);
    }

    #[cfg(unix)]
    #[test]
    fn fish_gets_its_own_syntax() {
        let home = temp("fish");
        let added = shell_path::put_on_path(&shell("/opt/homebrew/bin/fish", &home), None);
        let config = home.join(".config").join("fish").join("config.fish");
        assert_eq!(added.files, vec![config.clone()]);
        assert_eq!(read(&config), FISH_BLOCK);
        let _ = fs::remove_dir_all(&home);

        let home = temp("fish-xdg");
        let config_home = home.join("xdg");
        let fish = shell_path::Shell {
            config_home: Some(config_home.as_path()),
            ..shell("fish", &home)
        };
        let added = shell_path::put_on_path(&fish, None);
        assert_eq!(added.files, vec![config_home.join("fish").join("config.fish")]);
        assert!(!home.join(".config").exists());
        let _ = fs::remove_dir_all(&home);
    }

    #[cfg(unix)]
    #[test]
    fn a_file_with_the_installers_block_is_left_alone() {
        let home = temp("marked");
        // The installer's block, even for another directory
        // (LYNSHEN_INSTALL_DIR): it decides whether a file has one the same way.
        let bashrc = "alias ll='ls -l'\n\n# >>> lynshen installer >>>\ncase \":$PATH:\" in *\":/opt/lynshen:\"*) ;; *) export PATH=\"/opt/lynshen:$PATH\" ;; esac\n# <<< lynshen installer <<<\n";
        fs::write(home.join(".bashrc"), bashrc).unwrap();
        let added = shell_path::put_on_path(&shell("bash", &home), None);
        assert_eq!(added.files, vec![home.join(".bash_profile")]);
        assert_eq!(read(&home.join(".bashrc")), bashrc);
        let _ = fs::remove_dir_all(&home);
    }

    #[cfg(unix)]
    #[test]
    fn nothing_changes_when_the_login_shell_has_the_directory() {
        let home = temp("on-path");
        let login_path = format!("/usr/bin:{}/.local/bin/:/bin", home.display());
        let added = shell_path::put_on_path(&shell("zsh", &home), Some(login_path.as_str()));
        assert_eq!(added, shell_path::Added::default());
        assert_eq!(fs::read_dir(&home).unwrap().count(), 0);
        let _ = fs::remove_dir_all(&home);
    }

    #[cfg(unix)]
    #[test]
    fn the_user_adds_it_for_an_unknown_shell_or_an_unwritable_file() {
        let home = temp("by-hand");
        let added = shell_path::put_on_path(&shell("/bin/tcsh", &home), None);
        assert_eq!(
            added,
            shell_path::Added {
                files: Vec::new(),
                by_hand: true
            }
        );
        assert_eq!(fs::read_dir(&home).unwrap().count(), 0);
        // A ~/.zshrc that cannot be read or written (a directory here).
        fs::create_dir(home.join(".zshrc")).unwrap();
        let added = shell_path::put_on_path(&shell("zsh", &home), None);
        assert!(added.by_hand);
        assert!(added.files.is_empty());
        let _ = fs::remove_dir_all(&home);
    }

    /// sh runs the block: ~/.local/bin goes first on PATH, once however
    /// often the file is read.
    #[cfg(unix)]
    #[test]
    fn the_block_puts_the_directory_on_path_once() {
        let home = temp("source");
        shell_path::put_on_path(&shell("bash", &home), None);
        let out = std::process::Command::new("/bin/sh")
            .args(["-c", ". \"$1\"; . \"$1\"; printf %s \"$PATH\"", "sh"])
            .arg(home.join(".bashrc"))
            .env("HOME", &home)
            .env("PATH", "/usr/bin:/bin")
            .output()
            .unwrap();
        assert!(out.status.success());
        assert_eq!(
            String::from_utf8_lossy(&out.stdout),
            format!("{}/.local/bin:/usr/bin:/bin", home.display())
        );
        let _ = fs::remove_dir_all(&home);
    }
}
