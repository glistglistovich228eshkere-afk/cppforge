/* Static content: lesson data, cheat sheets, and starter code. No logic here. */
const DEFAULT_STARTER = '#include <iostream>\n\nint main() {\n    \n    return 0;\n}';
const LUA_STARTER = '-- Write your code here\n';

const CPP_LESSONS = [
  { id:'hello', sec:'Basics', title:'Hello, World',
    intro:'Every C++ program starts at main(). std::cout sends text to the terminal, and << sends each piece of output.',
    code:`#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`,
    goal:'Print the text Hi from cppforge instead of Hello, World!', must:['std::cout','Hi from cppforge'],
    hint:'Keep std::cout << and put the new text in double quotes.',
    solution:`#include <iostream>

int main() {
    std::cout << "Hi from cppforge" << std::endl;
    return 0;
}` },
  { id:'vars', sec:'Basics', title:'Variables & Types',
    intro:'C++ is statically typed. Every variable has a type the compiler checks before the program runs. auto lets the compiler work the type out from the value.',
    code:`int year = 2026;
double pi = 3.14159;
bool ready = true;
char grade = 'A';
auto count = 42;  // deduced as int`,
    goal:'Declare an int named score set to 10, and a double named ratio.', must:['int score = 10','double ratio'],
    hint:'Write the type, then the name, then = and the value.',
    solution:`int score = 10;
double ratio = 0.5;` },
  { id:'cond', sec:'Basics', title:'Conditions',
    intro:'if runs a block only when its condition is true. else handles the other case. Comparisons like > and == produce true or false.',
    code:`int score = 7;

if (score > 5) {
    std::cout << "Passed" << std::endl;
} else {
    std::cout << "Keep trying" << std::endl;
}`,
    goal:'Write an if statement that checks whether score is greater than 5.', must:['if (score > 5)'],
    hint:'if (condition) { }, and the condition is score > 5.',
    solution:`int score = 7;
if (score > 5) {
    std::cout << "Passed" << std::endl;
}` },
  { id:'loops', sec:'Basics', title:'Loops',
    intro:'A for loop repeats code. It has three parts: a starting value, a condition that keeps it going, and a step after each pass.',
    code:`for (int i = 0; i < 3; ++i) {
    std::cout << i << std::endl;
}`,
    goal:'Write a for loop that counts i from 1 to 5.', must:['for (int i = 1; i <= 5; ++i)'],
    hint:'Start at 1, keep going while i <= 5, and step with ++i.',
    solution:`for (int i = 1; i <= 5; ++i) {
    std::cout << i << std::endl;
}` },
  { id:'while', sec:'Basics', title:'While Loops',
    intro:'A while loop repeats as long as its condition stays true. Use it when you do not know in advance how many passes you need.',
    code:`int n = 3;
while (n > 0) {
    std::cout << n << std::endl;
    --n;
}`,
    goal:'Write a while loop that runs while count is less than 10.', must:['while (count < 10)'],
    hint:'while (condition) { ... }',
    solution:`int count = 0;
while (count < 10) {
    ++count;
}` },
  { id:'cin', sec:'Basics', title:'Input with cin',
    intro:'std::cin reads values typed by the user. The >> operator pulls a value from the input into a variable.',
    code:`int age;
std::cin >> age;
std::cout << "You are " << age << std::endl;`,
    goal:'Declare an int named age, then read it from the user with std::cin.', must:['int age','std::cin >> age'],
    hint:'int age; then std::cin >> age;',
    solution:`int age;
std::cin >> age;` },
  { id:'funcs', sec:'Functions', title:'Functions',
    intro:'A function groups code under a name. It can take inputs and return a result. Write the return type first, then the name and the parameters.',
    code:`int add(int a, int b) {
    return a + b;
}`,
    goal:'Write a function named add that takes two ints and returns their sum.', must:['int add(int a, int b)','return a + b'],
    hint:'Signature: int add(int a, int b), then return a + b.',
    solution:`int add(int a, int b) {
    return a + b;
}` },
  { id:'refs', sec:'Functions', title:'References',
    intro:"A reference is another name for an existing variable. Writing int& x means the function changes the caller's variable, not a copy.",
    code:`void bump(int& x) {
    x += 1;
}`,
    goal:'Write void reset(int& x) that sets x to 0.', must:['void reset(int& x)','x = 0'],
    hint:'Inside the function, assign 0 to x.',
    solution:`void reset(int& x) {
    x = 0;
}` },
  { id:'vectors', sec:'Data', title:'Vectors & Strings',
    intro:'std::vector is a resizable list, and std::string holds text. push_back adds an element to the end.',
    code:`#include <string>
#include <vector>

std::vector<std::string> names{"Ada", "Linus"};
names.push_back("Grace");`,
    goal:'Create a vector of strings named names and add Ada to it.', must:['std::vector<std::string> names','push_back("Ada")'],
    hint:'std::vector<std::string> names; then names.push_back(...).',
    solution:`std::vector<std::string> names;
names.push_back("Ada");` },
  { id:'maps', sec:'Data', title:'Maps (key-value tables)',
    intro:'std::map stores key-value pairs, much like a table in Lua. Keys are kept in sorted order, and you look values up with [].',
    code:`#include <map>
#include <string>

std::map<std::string, int> ages;
ages["Linus"] = 55;
std::cout << ages["Linus"] << std::endl;`,
    goal:'Create a std::map from std::string to int named ages, and set Ada to 36.', must:['std::map<std::string, int> ages','ages["Ada"] = 36'],
    hint:'std::map<std::string, int> ages; then ages["Ada"] = 36;',
    solution:`std::map<std::string, int> ages;
ages["Ada"] = 36;` },
  { id:'enums', sec:'Data', title:'Enums',
    intro:'An enum class is a named set of values, such as the states your program can be in. It keeps those values from clashing with other names.',
    code:`enum class Color { Red, Green, Blue };
Color c = Color::Green;`,
    goal:'Declare an enum class named Mood with the values Happy and Sad.', must:['enum class Mood','Happy','Sad'],
    hint:'enum class Name { A, B };',
    solution:`enum class Mood { Happy, Sad };` },
  { id:'smart', sec:'Data', title:'Smart Pointers',
    intro:'A std::unique_ptr owns an object on the heap and deletes it automatically when it goes out of scope. This avoids the leaks that raw new and delete can cause.',
    code:`#include <memory>

auto p = std::make_unique<int>(42);
std::cout << *p << std::endl;`,
    goal:'Create a std::unique_ptr<int> named p that holds 7, using std::make_unique.', must:['std::unique_ptr<int> p','std::make_unique<int>(7)'],
    hint:'auto p = std::make_unique<int>(7);',
    solution:`auto p = std::make_unique<int>(7);` },
  { id:'classes', sec:'OOP', title:'Classes',
    intro:'A class groups data and functions into one type. A method marked const promises not to change the object.',
    code:`class Dog {
public:
    std::string name;
    void speak() const {
        std::cout << name << " says woof" << std::endl;
    }
};`,
    goal:'Create a class Counter with a public int value and a method increment() that adds one to it.', must:['class Counter','increment()','value++'],
    hint:'class Counter { public: int value; void increment() { value++; } };',
    solution:`class Counter {
public:
    int value = 0;
    void increment() { value++; }
};` },
  { id:'inherit', sec:'OOP', title:'Inheritance',
    intro:'A derived class reuses a base class and can add its own behavior. The public keyword keeps the base class members accessible.',
    code:`class Animal {};
class Dog : public Animal {};`,
    goal:'Create class Dog that inherits publicly from Animal.', must:['class Dog : public Animal'],
    hint:'class Dog : public Animal { };',
    solution:`class Animal {};
class Dog : public Animal {};` },
  { id:'opov', sec:'OOP', title:'Operator Overloading',
    intro:'Operator overloading lets your own types work with + and similar operators. It is the C++ counterpart to Lua metatables.',
    code:`struct Vec {
    int x;
    Vec operator+(const Vec& o) const { return {x + o.x}; }
};`,
    goal:'Write a struct Vec with an int x and an operator+ that adds the x values.', must:['struct Vec','operator+(const Vec& o)'],
    hint:'Return a new Vec whose x is this->x + o.x.',
    solution:`struct Vec {
    int x;
    Vec operator+(const Vec& o) const { return {x + o.x}; }
};` },
  { id:'threads', sec:'Advanced', title:'Threads',
    intro:'std::thread runs a function alongside the rest of your program. join() waits for it to finish. This is how independent tasks overlap, similar to coroutines in Lua.',
    code:`#include <thread>

void work() {}
std::thread t(work);
t.join();`,
    goal:'Start a std::thread named t that runs a function named work, then join it.', must:['std::thread t(work)','t.join()'],
    hint:'std::thread t(work); then t.join();',
    solution:`void work() {}
std::thread t(work);
t.join();` },
  { id:'ns', sec:'Modules', title:'Namespaces & Headers',
    intro:'A namespace groups related names so they do not clash. Headers share declarations between files, which is how C++ modules are organized.',
    code:`namespace math {
    int add(int a, int b) { return a + b; }
}`,
    goal:'Create a namespace math with a function add(int a, int b).', must:['namespace math','int add(int a, int b)'],
    hint:'namespace name { ... } wraps your functions.',
    solution:`namespace math {
    int add(int a, int b) { return a + b; }
}` }
];

const LUA_LESSONS = [
  { id:'lvars', sec:'Basics', title:'Variables & Types',
    intro:'Lua variables are dynamically typed: a variable can hold a number, string, boolean, table, or nil. Use local to keep a variable inside its block.',
    code:`local name = "Lua"
local version = 5.4
local ready = true
local nothing = nil
print(name, version, ready, nothing)`,
    goal:'Create a local variable name set to "Lua" and a local variable version set to 5.4.', must:['local name = "Lua"','local version = 5.4'],
    hint:'local name = "..." creates a string. Numbers need no quotes.',
    solution:`local name = "Lua"
local version = 5.4
print(name, version)` },
  { id:'lloops', sec:'Basics', title:'Conditions & Loops',
    intro:'if ... then ... end runs code on a condition. A numeric for loop counts from a start to an end value. Every block closes with end.',
    code:`for i = 1, 3 do
  if i % 2 == 0 then
    print(i, "even")
  else
    print(i, "odd")
  end
end`,
    goal:'Write a for loop that counts i from 1 to 5 using do and end.', must:['for i = 1, 5 do'],
    hint:'for i = 1, 5 do ... end',
    solution:`for i = 1, 5 do
  print(i)
end` },
  { id:'lfuncs', sec:'Basics', title:'Functions',
    intro:'Functions are values in Lua. Use local function to name one, and return to send a result back.',
    code:`local function add(a, b)
  return a + b
end
print(add(2, 3))`,
    goal:'Write a local function add(a, b) that returns a + b.', must:['local function add(a, b)','return a + b'],
    hint:'local function add(a, b) ... return a + b ... end',
    solution:`local function add(a, b)
  return a + b
end` },
  { id:'ltables', sec:'Data', title:'Tables',
    intro:'A table is the only data structure in Lua. A list is a table with numbers as keys, a record uses names as keys, and # gives the number of items in a list.',
    code:`local fruits = {"apple", "banana"}
local prices = {apple = 2, banana = 3}
print(#fruits, prices.apple)`,
    goal:'Create a table named fruits with "apple" and "pear", then print its length with #fruits.', must:['local fruits = {','#fruits'],
    hint:'local fruits = {"apple", "pear"} then print(#fruits)',
    solution:`local fruits = {"apple", "pear"}
print(#fruits)` },
  { id:'lmeta', sec:'OOP', title:'Metatables & __index',
    intro:'A metatable changes how a table behaves. Setting __index to the table itself lets missing lookups fall back to it, which is how Lua builds classes.',
    code:`local Point = {}
Point.__index = Point

local p = setmetatable({x = 1}, Point)
print(p.x)`,
    goal:'Create a table Point, set Point.__index = Point, then create p with setmetatable.', must:['Point.__index = Point','setmetatable('],
    hint:'local Point = {}; Point.__index = Point; setmetatable({}, Point)',
    solution:`local Point = {}
Point.__index = Point
local p = setmetatable({}, Point)` },
  { id:'lclass', sec:'OOP', title:'Classes & Methods',
    intro:'With a colon, function Counter:increment() passes the table in as self, so each object keeps its own data.',
    code:`local Counter = {}
Counter.__index = Counter

function Counter.new()
  return setmetatable({value = 0}, Counter)
end

function Counter:increment()
  self.value = self.value + 1
end

local c = Counter.new()
c:increment()
print(c.value)`,
    goal:'Add a method function Counter:increment() that adds 1 to self.value.', must:['function Counter:increment()','self.value = self.value + 1'],
    hint:'Use function Counter:increment() and inside it write self.value = self.value + 1',
    solution:`function Counter:increment()
  self.value = self.value + 1
end` }
];

const CPP_CHEAT = [
  ['Include','#include <iostream>','Bring in the standard I/O library'],
  ['Output','std::cout << x << std::endl;','Print a value and a newline'],
  ['Input','std::cin >> x;','Read a value into x'],
  ['Variable','int x = 5;','Declare a typed variable'],
  ['Inference','auto x = 5;','Type deduced from the value'],
  ['Condition','if (cond) { } else { }','Run code when true'],
  ['Loop','for (int i = 0; i < n; ++i) { }','Repeat n times'],
  ['Loop','while (cond) { }','Repeat while cond is true'],
  ['Function','int f(int a) { return a; }','Named, reusable code'],
  ['Reference','int& r = x;','Another name for x'],
  ['Vector','std::vector<int> v{1, 2};','Resizable list'],
  ['Vector','v.push_back(x);  v.size();','Append and count'],
  ['Map','std::map<std::string, int> m;','Key-value table'],
  ['Map','m["key"] = value;','Set or read a key'],
  ['Enum','enum class E { A, B };','Named set of values'],
  ['Class','class C { public: int v; };','Data and functions together'],
  ['Inherit','class D : public B { };','Derive from a base class'],
  ['Method','void f() const { }','Promise not to modify the object'],
  ['Operator','T operator+(const T& o) const','Overload +'],
  ['Pointer','auto p = std::make_unique<T>(x);','Owned, auto-freed pointer'],
  ['Thread','std::thread t(f); t.join();','Run f in parallel, then wait'],
  ['Namespace','namespace ns { }','Group related names'],
  ['String','std::string s = "hi";','Text value'],
  ['Operators','a && b   a || b   !a','Logical and, or, not'],
  ['Compare','a == b   a != b   a <= b','Equal, not equal, at most'],
  ['Increment','x++;  ++x;  x += 1;','Add one or add a value'],
];
const LUA_CHEAT = [
  ['Local','local x = 5','Variable limited to its block'],
  ['If','if x > 3 then ... else ... end','Run code on a condition'],
  ['For','for i = 1, 5 do ... end','Count from 1 to 5'],
  ['While','while cond do ... end','Repeat while cond is true'],
  ['Function','local function f(a) return a end','Named, reusable code'],
  ['Table','local t = {1, 2, name = "x"}','List and record in one'],
  ['Length','#t','Number of items in a list'],
  ['Field','t.name   t["name"]','Read or set a field'],
  ['Metatable','setmetatable(t, mt)','Change how a table behaves'],
  ['Method','function C:m() self.v = 1 end','self is the table itself'],
  ['Concat','"a" .. "b"','Join strings'],
  ['Print','print("hi", x)','Show values in the console'],
  ['Comment','-- like this','Ignored by Lua'],
  ['Logic','not a   a and b   a or b','Not, and, or'],
  ['Compare','a == b   a ~= b   a <= b','Equal, not equal, at most'],
  ['Math','math.floor(x)  math.max(a, b)','Built-in math helpers'],
];

const TEMPLATES = {
  hello: `-- Variables and printing\nlocal name = "Lua++"\nlocal version = 1.0\nprint("Hello from " .. name)\nprint("Version:", version)\n\nlocal total = 10 * 4 + 2\nprint("Total:", total)\n`,
  tables: `local fruits = {"apple", "banana", "cherry"}\nfor i, fruit in ipairs(fruits) do\n  print(i, fruit)\nend\n\nlocal counts = {apples = 3, pears = 5}\ncounts.plums = 7\nfor k, v in pairs(counts) do\n  print(k, v)\nend\nprint("Items:", #fruits)\n`,
  oop: `local Animal = {}\nAnimal.__index = Animal\n\nfunction Animal.new(name, sound)\n  local self = setmetatable({}, Animal)\n  self.name = name\n  self.sound = sound\n  return self\nend\n\nfunction Animal:speak()\n  print(self.name .. " says " .. self.sound)\nend\n\nlocal dog = Animal.new("Rex", "woof")\ndog:speak()\n`,
  buggy: `local score = 10\nif score > 5 then\n  print("High score")\n-- missing end\n\nprint("Score: " .. score\n`
};
