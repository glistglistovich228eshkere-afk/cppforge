#!/usr/bin/env python3
"""cppforge - learn C++ from your terminal. A dark, typewriter-style tutor."""
import json
import os
import random
import re
import sys
import time
from pathlib import Path

# ---------- Theme (truecolor ANSI: midnight, gold, ivory) ----------
GOLD = "\033[38;2;212;175;55m"
IVORY = "\033[38;2;236;230;214m"
MUTED = "\033[38;2;110;112;130m"
VIOLET = "\033[38;2;167;139;250m"
MINT = "\033[38;2;110;220;170m"
ROSE = "\033[38;2;240;113;120m"
BOLD = "\033[1m"
RESET = "\033[0m"
CLEAR = "\033[2J\033[H"

FAST = os.environ.get("CPPFORGE_FAST") == "1" or not sys.stdout.isatty()
PROGRESS = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local/share")) / "cppforge" / "progress.json"

# ---------- Lessons ----------
LESSONS = [
    {
        "title": "Hello, World",
        "text": ["Every C++ program begins running at main(). The include line pulls in the "
                 "I/O library, and std::cout sends text to your terminal."],
        "code": '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
        "quiz": {"q": "Which object prints text to the terminal?",
                 "options": ["std::cin", "std::cout", "std::print_all", "console.log"],
                 "answer": 1, "why": "std::cout is the standard output stream. std::cin reads input."},
    },
    {
        "title": "Variables & Types",
        "text": ["C++ is statically typed: every variable has a type known at compile time. "
                 "auto asks the compiler to deduce the type from the initializer."],
        "code": 'int year = 2026;\ndouble pi = 3.14159;\nbool ready = true;\nchar grade = \'A\';\nauto count = 42;  // deduced as int',
        "quiz": {"q": "Which keyword lets the compiler deduce a variable's type?",
                 "options": ["var", "let", "auto", "dynamic"],
                 "answer": 2, "why": "auto deduces the type from the value you assign."},
    },
    {
        "title": "Control Flow",
        "text": ["if and for decide what runs and how often. A classic for loop has three parts: "
                 "start, condition, and step."],
        "code": 'for (int i = 0; i < 3; ++i) {\n    if (i % 2 == 0) {\n        std::cout << i << " is even\\n";\n    }\n}',
        "quiz": {"q": "How many times does `for (int i = 0; i < 3; ++i)` run?",
                 "options": ["2", "3", "4", "Forever"],
                 "answer": 1, "why": "i takes the values 0, 1, and 2, so the body runs three times."},
    },
    {
        "title": "Functions & References",
        "text": ["A function can take an int& parameter. The & makes it a reference, so changes "
                 "inside the function affect the caller's variable."],
        "code": 'void bump(int& x) {\n    x += 1;\n}\n\nint main() {\n    int n = 5;\n    bump(n);  // n is now 6\n}',
        "quiz": {"q": "What does the & in `int& x` mean?",
                 "options": ["Bitwise AND", "Address of a copy", "A reference to the caller's variable", "A pointer to a string"],
                 "answer": 2, "why": "A reference is an alias, so modifying x modifies the original."},
    },
    {
        "title": "Vectors & Range-for",
        "text": ["std::vector is a resizable array and the everyday container of C++. "
                 "The range-for loop visits each element without manual indexing."],
        "code": '#include <vector>\n\nstd::vector<int> v{1, 2, 3};\nv.push_back(4);\nfor (int n : v) {\n    std::cout << n << " ";\n}',
        "quiz": {"q": "Which method returns how many elements a std::vector holds?",
                 "options": ["length()", "size()", "count()", "len()"],
                 "answer": 1, "why": "size() is the standard member function for element count."},
    },
    {
        "title": "Classes",
        "text": ["A class bundles data and behavior. Methods marked const promise not to modify "
                 "the object, which lets the compiler catch mistakes for you."],
        "code": 'class Dog {\npublic:\n    std::string name;\n\n    void speak() const {\n        std::cout << name << " says woof\\n";\n    }\n};',
        "quiz": {"q": "Which keyword promises a member function won't modify the object?",
                 "options": ["static", "const", "final", "readonly"],
                 "answer": 1, "why": "Placing const after the parameter list makes the method read-only."},
    },
]

# ---------- Typing & highlighting ----------
KEYWORDS = {"include", "int", "double", "float", "bool", "char", "auto", "void", "return", "if", "else",
            "for", "while", "class", "public", "private", "const", "using", "namespace", "struct"}
TOKEN = re.compile(r'(//.*$)|("(?:\\.|[^"\\])*")|(#\w+)|(\b\w+\b)|(\s+)|(\S)')


def highlight(line):
    out = []
    for m in TOKEN.finditer(line):
        com, s, pre, word, ws, other = m.groups()
        if com:
            out.append(MUTED + com + RESET)
        elif s:
            out.append(ROSE + s + RESET)
        elif pre:
            out.append(VIOLET + pre + RESET)
        elif word:
            out.append((GOLD + BOLD + word + RESET) if word in KEYWORDS else (IVORY + word + RESET))
        elif ws:
            out.append(ws)
        else:
            out.append(MUTED + other + RESET)
    return "".join(out)


def type_out(text, color=IVORY, speed=0.018, end="\n"):
    """Typewriter effect with a human-ish jitter per keystroke."""
    for ch in text:
        sys.stdout.write(color + ch + RESET if ch.strip() else ch)
        sys.stdout.flush()
        if not FAST and ch.strip():
            time.sleep(speed * random.uniform(0.4, 1.6))
    sys.stdout.write(end)
    sys.stdout.flush()


def type_code(code):
    for line in code.split("\n"):
        print("    " + highlight(line))
        if not FAST:
            time.sleep(0.09)


def ask(prompt="  › "):
    return input(GOLD + prompt + RESET).strip()


def pause():
    ask("\n  [press Enter to continue]")


# ---------- Progress ----------
def load_progress():
    try:
        return set(json.loads(PROGRESS.read_text()).get("done", []))
    except (OSError, ValueError):
        return set()


def save_progress(done):
    PROGRESS.parent.mkdir(parents=True, exist_ok=True)
    PROGRESS.write_text(json.dumps({"done": sorted(done)}))


# ---------- Screens ----------
def header(subtitle=""):
    print(CLEAR, end="")
    print(GOLD + "  ╭" + "─" * 46 + "╮" + RESET)
    print(GOLD + "  │" + RESET + BOLD + IVORY + "   C P P F O R G E" + RESET + MUTED + "      learn · build" + RESET + GOLD + "   │" + RESET)
    print(GOLD + "  ╰" + "─" * 46 + "╯" + RESET)
    if subtitle:
        print(MUTED + "  " + subtitle + RESET)
    print()


def menu(done):
    header("Your path through modern C++")
    for i, lesson in enumerate(LESSONS, 1):
        mark = MINT + "✓" if i - 1 in done else MUTED + "·"
        print(f"  {mark}{RESET} {GOLD}{i}{RESET}  {IVORY}{lesson['title']}{RESET}")
    print()
    pct = int(100 * len(done) / len(LESSONS))
    bar = "█" * (pct // 5) + "░" * (20 - pct // 5)
    print(f"  {VIOLET}{bar}{RESET} {MUTED}{pct}%{RESET}\n")
    print(MUTED + "  [number] open lesson   [x] reset progress   [q] quit" + RESET)


def run_lesson(index, done):
    lesson = LESSONS[index]
    header(f"Lesson {index + 1} of {len(LESSONS)}")
    type_out(lesson["title"], GOLD + BOLD, speed=0.03)
    print()
    for para in lesson["text"]:
        type_out(para, IVORY, speed=0.012)
        print()
    print(MUTED + "  ── code " + "─" * 38 + RESET)
    type_code(lesson["code"])
    print(MUTED + "  " + "─" * 46 + RESET)
    pause()

    quiz = lesson["quiz"]
    header(f"Quiz · {lesson['title']}")
    type_out(quiz["q"], IVORY, speed=0.015)
    print()
    for n, opt in enumerate(quiz["options"], 1):
        print(f"    {GOLD}{n}{RESET}  {IVORY}{opt}{RESET}")
    print()
    while True:
        choice = ask("  choose › ")
        if choice.isdigit() and 1 <= int(choice) <= len(quiz["options"]):
            break
        print(MUTED + "  enter a number from the list" + RESET)

    if int(choice) - 1 == quiz["answer"]:
        type_out("  ✦ Correct. " + quiz["why"], MINT, speed=0.012)
        done.add(index)
        save_progress(done)
    else:
        type_out("  ✧ Not quite. " + quiz["why"], ROSE, speed=0.012)
        print(MUTED + "  Review the lesson and try again from the menu." + RESET)
    pause()


def main():
    done = load_progress()
    try:
        while True:
            menu(done)
            choice = ask().lower()
            if choice == "q":
                break
            if choice == "x":
                done.clear()
                save_progress(done)
                continue
            if choice.isdigit() and 1 <= int(choice) <= len(LESSONS):
                run_lesson(int(choice) - 1, done)
    except (KeyboardInterrupt, EOFError):
        pass
    print(CLEAR + GOLD + "  Keep forging. " + RESET + MUTED + f"({len(done)}/{len(LESSONS)} complete)" + RESET)


if __name__ == "__main__":
    main()
