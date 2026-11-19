# cppforge for Windows

The Windows version is a single file, `cppforge.exe`. It has every feature of the terminal app:
lessons, the playground, the Account tab, Google sign-in, and updates.

## Install

1. Open the repo's **Releases** page and download `cppforge.exe` from the latest release.
2. Run it. Windows may show a SmartScreen warning because the file isn't signed by a
   publisher. Click **More info**, then **Run anyway**.
3. Windows Terminal (the default in Windows 11) shows the colors best. The older Command Prompt also works.

## Google sign-in

Create a file at `%APPDATA%\cppforge\google.json` with your client details:

```json
{"client_id": "YOUR_CLIENT_ID", "client_secret": "YOUR_CLIENT_SECRET"}
```

Then open the **Account** tab and choose sign-in.

## Where your data lives

- Progress and account: `%LOCALAPPDATA%\cppforge`
- Settings: `%APPDATA%\cppforge`

## Updates

Press `u` in the Lessons tab. The app downloads the new `cppforge.exe`, keeps the old one as
`cppforge.old.exe`, and asks you to restart.

## Build it yourself

```powershell
pip install pyinstaller
pyinstaller --onefile --name cppforge cppforge.py
```

The program is in `dist\cppforge.exe`.
