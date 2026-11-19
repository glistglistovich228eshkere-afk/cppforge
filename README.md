# ✦ cppforge

A dark, elegant terminal tutor for learning C++. Lessons type themselves onto the screen,
code is syntax-highlighted in gold and violet, and quizzes track your progress.

## Install on Arch Linux

Build from the included PKGBUILD:

```bash
git clone https://github.com/glistglistovich228eshkere-afk/cppforge.git
cd cppforge
makepkg -si
cppforge
```

Or run it directly. It needs only Python 3, no extra packages:

```bash
python3 cppforge.py
```

## Recommended font

The app looks best in a modern monospace font with ligatures:

```bash
sudo pacman -S ttf-jetbrains-mono-nerd
```

Then set it as your terminal's font. Use a dark terminal background for the full effect.

## Usage

- Type a lesson number to start it.
- Read the typed lesson, then press Enter to continue.
- Answer the quiz by entering the option number.
- `x` resets progress, `q` quits.

Progress is saved to `~/.local/share/cppforge/progress.json`.

## Options

- `CPPFORGE_FAST=1` skips the typing animation.

## Adding lessons

Lessons are plain dictionaries in the `LESSONS` list in `cppforge.py`. Add a title, paragraphs,
a code sample, and a quiz with the answer index.

## License

MIT
