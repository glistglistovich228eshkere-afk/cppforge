#!/usr/bin/env python3
"""cppforge - learn C++ from your terminal: lessons, exercises, a playground, and updates."""
import json
import os
import random
import re
import shutil
import sys
import time
import urllib.request
from pathlib import Path

__version__ = "1.1.0"
REPO_RAW = "https://raw.githubusercontent.com/glistglistovich228eshkere-afk/cppforge/main"
VERSION_URL = REPO_RAW + "/version.json"
SCRIPT_URL = REPO_RAW + "/cppforge.py"

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

LESSONS = [
    {
        "title": "Hello, World",
        "intro": "Every C++ program starts running at main(). std::cout sends text to the terminal, and << sends each piece of output.",
        "code": ["#include <iostream>", "", "int main() {", '    std::cout << "Hello, World!" << std::endl;', "    return 0;", "}"],
        "quiz": {"q": "Which object prints text to the terminal?", "options": ["std::cin", "std::cout", "std::print_all", "console.log"], "answer": 1, "why": "std::cout is the standard output stream. std::cin reads input."},
        "exercise": {"prompt": "Print the text Hi from cppforge instead of Hello, World!", "hint": "Keep std::cout << and put the new text in double quotes.", "must": ["std::cout", "Hi from cppforge"]},
    },
    {
        "title": "Variables & Types",
        "intro": "C++ is statically typed. Every variable has a type the compiler checks before the program runs. auto lets the compiler work the type out from the value.",
        "code": ["int year = 2026;", "double pi = 3.14159;", "bool ready = true;", "char grade = 'A';", "auto count = 42;  // deduced as int"],
        "quiz": {"q": "Which keyword lets the compiler deduce a variable's type?", "options": ["var", "let", "auto", "dynamic"], "answer": 2, "why": "auto deduces the type from the value you assign."},
        "exercise": {"prompt": "Declare an int named score set to 10, and a double named ratio.", "hint": "Write the type, then the name, then = and the value.", "must": ["int score = 10", "double ratio"]},
    },
    {
        "title": "Conditions",
        "intro": "if runs a block only when its condition is true. else handles the other case. Comparisons like > and == produce true or false.",
        "code": ["int score = 7;", "", "if (score > 5) {", '    std::cout << "Passed" << std::endl;', "} else {", '    std::cout << "Keep trying" << std::endl;', "}"],
        "quiz": {"q": "What does == check?", "options": ["Assignment", "Equality", "Addition", "Declaration"], "answer": 1, "why": "== compares two values. = assigns a value."},
        "exercise": {"prompt": "Write an if statement that checks whether score is greater than 5.", "hint": "if (condition) { }, and the condition is score > 5.", "must": ["if (score > 5)"]},
    },
    {
        "title": "Loops",
        "intro": "A for loop repeats code. It has three parts: a starting value, a condition that keeps it going, and a step after each pass.",
        "code": ["for (int i = 0; i < 3; ++i) {", "    std::cout << i << std::endl;", "}"],
        "quiz": {"q": "How many times does for (int i = 0; i < 3; ++i) run?", "options": ["2", "3", "4", "Forever"], "answer": 1, "why": "i takes 0, 1, and 2, so the body runs three times."},
        "exercise": {"prompt": "Write a for loop that counts i from 1 to 5.", "hint": "Start at 1, keep going while i <= 5, and step with ++i.", "must": ["for (int i = 1; i <= 5; ++i)"]},
    },
    {
        "title": "Functions",
        "intro": "A function groups code under a name. It can take inputs and return a result. Write the return type first, then the name and the parameters.",
        "code": ["int add(int a, int b) {", "    return a + b;", "}", "", "int main() {", "    std::cout << add(2, 3) << std::endl;", "}"],
        "quiz": {"q": "What does the first int in int add(int a, int b) describe?", "options": ["The return type", "The name", "A loop", "An include"], "answer": 0, "why": "The first type is what the function returns. a and b are parameters."},
        "exercise": {"prompt": "Write a function named add that takes two ints and returns their sum.", "hint": "Signature: int add(int a, int b), then return a + b.", "must": ["int add(int a, int b)", "return a + b"]},
    },
    {
        "title": "References",
        "intro": "A reference is another name for an existing variable. Writing int& x means the function changes the caller's variable, not a copy.",
        "code": ["void bump(int& x) {", "    x += 1;", "}", "", "int main() {", "    int n = 5;", "    bump(n);  // n is now 6", "}"],
        "quiz": {"q": "What does the & in int& x mean?", "options": ["Bitwise AND", "Address of a copy", "A reference to the caller variable", "A pointer to a string"], "answer": 2, "why": "A reference is an alias, so changing x changes the original."},
        "exercise": {"prompt": "Write void reset(int& x) that sets x to 0.", "hint": "Inside the function, assign 0 to x.", "must": ["void reset(int& x)", "x = 0"]},
    },
    {
        "title": "Vectors & Strings",
        "intro": "std::vector is a resizable list, and std::string holds text. push_back adds an element to the end. Include the matching header for each.",
        "code": ["#include <string>", "#include <vector>", "", 'std::vector<std::string> names{"Ada", "Linus"};', 'names.push_back("Grace");', "for (const std::string& n : names) {", "    std::cout << n << std::endl;", "}"],
        "quiz": {"q": "Which method adds an element to the end of a std::vector?", "options": ["add()", "push_back()", "append_end()", "insert_last()"], "answer": 1, "why": "push_back() appends one element at the end."},
        "exercise": {"prompt": "Create a vector of strings named names and add Ada to it.", "hint": "std::vector<std::string> names; then names.push_back(...).", "must": ["std::vector<std::string> names", 'push_back("Ada")']},
    },
    {
        "title": "Classes",
        "intro": "A class groups data and functions into one type. A method marked const promises not to change the object.",
        "code": ["class Dog {", "public:", "    std::string name;", "", "    void speak() const {", '        std::cout << name << " says woof" << std::endl;', "    }", "};"],
        "quiz": {"q": "Which keyword promises a method won't modify the object?", "options": ["static", "const", "final", "readonly"], "answer": 1, "why": "Placing const after the parameter list makes the method read-only."},
        "exercise": {"prompt": "Create a class Counter with a public int value and a method increment() that adds one to it.", "hint": "class Counter { public: int value; void increment() { value++; } };", "must": ["class Counter", "increment()", "value++"]},
    },
]

TIPS = [
    ("for (", "A for loop has three parts: a start, a condition, and a step."),
    ("class ", "Classes end with }; the semicolon is required."),
    ("push_back", "push_back adds one element to the end of a vector."),
    ("&", "After a type, & makes a reference: another name for the same variable."),
    ("int main", "main() is where the program starts. Return 0 for success."),
]

KEYWORDS = {"include", "int", "double", "float", "bool", "char", "auto", "void", "return", "if", "else",
            "for", "while", "class", "public", "private", "const", "using", "namespace", "struct"}
TOKEN = re.compile(r'(//.*$)|("(?:\\.|[^"\\])*")|(#\w+)|(\b\w+\b)|(\s+)|(\S)')


# ---------- Updates ----------
def parse_version(text):
    return tuple(int(part) for part in re.findall(r"\d+", text))[:3]


def fetch(url, timeout=4):
    request = urllib.request.Request(url, headers={"User-Agent": "cppforge-updater"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def check_for_update(timeout=4, quiet=True):
    """Return the remote version info if a newer release exists, otherwise None."""
    try:
        info = json.loads(fetch(VERSION_URL, timeout).decode())
    except Exception as exc:
        if not quiet:
            print(ROSE + f"  Could not reach the update server: {exc}" + RESET)
        return None
    if parse_version(info.get("version", "0")) > parse_version(__version__):
        return info
    if not quiet:
        print(MINT + "  ✓ You are on the latest version." + RESET)
    return None


def apply_update():
    """Download the new script, check it compiles, then replace this file (keeping a backup)."""
    source = fetch(SCRIPT_URL, timeout=15)
    compile(source, "cppforge.py", "exec")
    target = Path(os.path.realpath(__file__))
    staged = target.with_suffix(".new")
    staged.write_bytes(source)
    os.chmod(staged, 0o755)
    shutil.copy2(target, target.with_suffix(".bak"))
    os.replace(staged, target)


def do_update(info):
    print(VIOLET + f"  Downloading cppforge {info.get('version')}..." + RESET)
    try:
        apply_update()
    except PermissionError:
        print(ROSE + "  No permission to write this install. Try: sudo cppforge --update" + RESET)
        print(MUTED + "  Or update from the repo: git pull && makepkg -si" + RESET)
        return False
    except Exception as exc:
        print(ROSE + f"  Update failed, nothing changed: {exc}" + RESET)
        return False
    print(MINT + f"  ✦ Updated to {info.get('version')}. Restart cppforge to use it." + RESET)
    return True


# ---------- Typing & highlighting ----------
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


def type_out(text, color=IVORY, speed=0.018):
    for ch in text:
        sys.stdout.write(color + ch + RESET if ch.strip() else ch)
        sys.stdout.flush()
        if not FAST and ch.strip():
            time.sleep(speed * random.uniform(0.4, 1.6))
    sys.stdout.write("\n")
    sys.stdout.flush()


def type_code(lines):
    for line in lines:
        print("    " + highlight(line))
        if not FAST:
            time.sleep(0.08)


def ask(prompt="  › "):
    return input(GOLD + prompt + RESET).strip()


def pause():
    ask("\n  [press Enter to continue]")


def load_progress():
    try:
        return set(json.loads(PROGRESS.read_text()).get("done", []))
    except (OSError, ValueError):
        return set()


def save_progress(done):
    PROGRESS.parent.mkdir(parents=True, exist_ok=True)
    PROGRESS.write_text(json.dumps({"done": sorted(done)}))


def header(subtitle=""):
    print(CLEAR, end="")
    print(GOLD + "  ╭" + "─" * 46 + "╮" + RESET)
    print(GOLD + "  │" + RESET + BOLD + IVORY + "   C P P F O R G E" + RESET + MUTED + "      learn · build" + RESET + GOLD + "   │" + RESET)
    print(GOLD + "  ╰" + "─" * 46 + "╯" + RESET)
    if subtitle:
        print(MUTED + "  " + subtitle + RESET)
    print()


def menu(done, update_info=None):
    header("Your path through modern C++")
    for i, lesson in enumerate(LESSONS, 1):
        mark = MINT + "✓" if i - 1 in done else MUTED + "·"
        print(f"  {mark}{RESET} {GOLD}{i}{RESET}  {IVORY}{lesson['title']}{RESET}")
    print()
    pct = int(100 * len(done) / len(LESSONS))
    bar = "█" * (pct // 5) + "░" * (20 - pct // 5)
    print(f"  {VIOLET}{bar}{RESET} {MUTED}{pct}%{RESET}\n")
    if update_info:
        print(GOLD + f"  ↑ Update {update_info.get('version')} is available. Press [u] to install it." + RESET + "\n")
    print(MUTED + "  [number] open lesson   [p] playground   [u] update   [x] reset   [q] quit" + RESET)


def strip_noise(text):
    text = re.sub(r'"(?:\\.|[^"\\])*"', '""', text)
    return re.sub(r"//.*", "", text)


def lint(code):
    issues = []
    clean = strip_noise(code)
    for a, b in ("()", "[]", "{}"):
        if clean.count(a) != clean.count(b):
            issues.append(f"Unbalanced '{a}{b}': every opening bracket needs a closing one.")
    lines = clean.split("\n")
    for i, line in enumerate(lines):
        s = line.strip()
        if not s or s.startswith("#") or s.endswith((";", "{", "}", ":", ",")):
            continue
        if re.match(r"(if|for|while|else|switch|class|struct|namespace)\b", s):
            continue
        if s.endswith(("(", "=", "+", "-", "<<", "&&", "||")):
            continue
        nxt = next((l.strip() for l in lines[i + 1:] if l.strip()), "")
        if nxt.startswith("{"):
            continue
        issues.append(f"Line {i + 1}: did you forget a ';'?  ->  {s}")
    needs = {"std::cout": "iostream", "std::cin": "iostream", "std::vector": "vector", "std::string": "string"}
    for token, header_name in needs.items():
        if token in code and f"<{header_name}>" not in code:
            issues.append(f"You use {token} but have no #include <{header_name}>.")
    return list(dict.fromkeys(issues))


def missing_parts(code, must):
    squash = lambda s: re.sub(r"\s+", "", s)
    joined = squash(code)
    return [m for m in must if squash(m) not in joined]


def read_code(hint=None):
    print(MUTED + "  type your code. :done to finish" + (", :hint for a hint" if hint else "") + RESET)
    lines = []
    while True:
        try:
            line = input(GOLD + "  │ " + RESET)
        except EOFError:
            break
        cmd = line.strip()
        if cmd == ":done":
            break
        if cmd == ":hint" and hint:
            type_out("  tip: " + hint, GOLD, 0.01)
            continue
        lines.append(line)
    return "\n".join(lines)


def show_feedback(code):
    issues = lint(code)
    if not issues:
        print(MINT + "  ✓ no obvious problems" + RESET)
    for msg in issues:
        print(ROSE + "  ! " + msg + RESET)
    for key, tip in TIPS:
        if key in code:
            print(MUTED + "  · " + tip + RESET)


def quiz(lesson):
    q = lesson["quiz"]
    header(f"Quiz · {lesson['title']}")
    type_out(q["q"], IVORY, 0.015)
    print()
    for n, opt in enumerate(q["options"], 1):
        print(f"    {GOLD}{n}{RESET}  {IVORY}{opt}{RESET}")
    print()
    while True:
        choice = ask("  choose › ")
        if choice.isdigit() and 1 <= int(choice) <= len(q["options"]):
            break
        print(MUTED + "  enter a number from the list" + RESET)
    ok = int(choice) - 1 == q["answer"]
    type_out(("  ✦ Correct. " if ok else "  ✧ Not quite. ") + q["why"], MINT if ok else ROSE, 0.012)
    return ok


def exercise(lesson):
    ex = lesson["exercise"]
    header(f"Try it · {lesson['title']}")
    type_out(ex["prompt"], IVORY, 0.012)
    print()
    code = read_code(ex["hint"])
    print()
    show_feedback(code)
    print()
    if missing_parts(code, ex["must"]):
        type_out("  Not there yet. Re-read the prompt, or use :hint next time.", ROSE, 0.01)
        return False
    type_out("  ✦ Exercise passed.", MINT, 0.012)
    return True


def run_lesson(index, done):
    lesson = LESSONS[index]
    header(f"Lesson {index + 1} of {len(LESSONS)}")
    type_out(lesson["title"], GOLD + BOLD, speed=0.03)
    print()
    type_out(lesson["intro"], IVORY, speed=0.012)
    print()
    print(MUTED + "  ── example " + "─" * 36 + RESET)
    type_code(lesson["code"])
    print(MUTED + "  " + "─" * 46 + RESET)
    pause()

    quiz_ok = quiz(lesson)
    pause()

    ex_ok = exercise(lesson)
    print()
    if quiz_ok and ex_ok:
        done.add(index)
        save_progress(done)
        type_out("  ✦ Lesson complete.", MINT, 0.012)
    else:
        type_out("  Lesson not complete yet. Retry it from the menu to finish both parts.", MUTED, 0.01)
    pause()


def playground():
    header("Playground")
    print(MUTED + "  Write any C++ here. We check it for common mistakes and give tips." + RESET)
    print()
    code = read_code(None)
    print()
    if code.strip():
        show_feedback(code)
    print()
    pause()


def run_update_command():
    info = check_for_update(timeout=6, quiet=False)
    if info:
        do_update(info)


def main():
    if "--version" in sys.argv:
        print(f"cppforge {__version__}")
        return
    if "--update" in sys.argv:
        run_update_command()
        return

    done = load_progress()
    update_info = None
    if os.environ.get("CPPFORGE_NO_UPDATE_CHECK") != "1":
        update_info = check_for_update(timeout=2)

    try:
        while True:
            menu(done, update_info)
            choice = ask().lower()
            if choice == "q":
                break
            if choice == "x":
                done.clear()
                save_progress(done)
            elif choice == "p":
                playground()
            elif choice == "u":
                info = update_info or check_for_update(timeout=6, quiet=False)
                if info:
                    do_update(info)
                    update_info = None
                    pause()
                else:
                    pause()
            elif choice.isdigit() and 1 <= int(choice) <= len(LESSONS):
                run_lesson(int(choice) - 1, done)
    except (KeyboardInterrupt, EOFError):
        pass
    print(CLEAR + GOLD + "  Keep forging. " + RESET + MUTED + f"({len(done)}/{len(LESSONS)} complete)" + RESET)


if __name__ == "__main__":
    main()
