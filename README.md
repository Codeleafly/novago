# NovaGo ✧

NovaGo is a fast, standalone, and advanced programming language built natively in **Golang**. It is the evolved, high-performance successor to NovaScript, designed for maximum accessibility and speed without any Node.js dependency.

## 🚀 Key Features

- **Native Speed**: Built with Go for near-native execution performance.
- **Standalone**: No runtime dependencies like Node.js required.
- **Modern Syntax**: English-like, readable syntax with advanced functional programming support.
- **Async/Await**: Native concurrency powered by Go channels.
- **Rich Standard Library**: Built-in modules for HTTP, File System, Math, Regex, and more.
- **Premium Diagnostics**: Beautiful error reporting with source code snippets and caret pointers.
- **Advanced REPL**: Interactive environment with multi-line support and syntax highlighting colors.

## 🛠 Installation

To build NovaGo from source, ensure you have Go installed (v1.18+):

```bash
git clone https://github.com/your-repo/novago
cd novago
go build -o novago
```

## 📖 Quick Start

### Running a script
Create a file named `hello.ng`:
```novascript
print("Hello, NovaGo!")
```
Run it:
```bash
./novago hello.ng
```

### Interactive REPL
Simply run the command without arguments:
```bash
./novago
```

### Standard Library Example
```novascript
include { read, write } from "go:fs"
include { sqrt } from "go:math"

let val = sqrt(144)
print("Result:", val)

write("output.txt", "NovaGo is awesome!")
```

## 📂 Project Structure

- `frontend/`: Lexer, Parser, and AST definitions.
- `runtime/`: Interpreter logic and environment management.
- `runtime/native/`: Go-native standard library modules.
- `errors/`: Diagnostics and error handling system.
- `tests/`: Comprehensive test suite (fully compatible with original NovaScript tests).
- `docs/`: Detailed documentation for syntax, modules, and more.

## 🧪 Testing

Run all tests using NovaGo:
```bash
./novago tests/01_variables.ng
./novago tests/06_math.ng
# ... and so on
```

## 📜 Documentation

Check out the `docs/` folder for in-depth guides:
- [Syntax Guide](docs/syntax.md)
- [Standard Library](docs/standard_library.md)
- [Module System](docs/modules.md)
- [REPL Guide](docs/repl.md)

---
**NovaGo** - *Built for Speed, Designed for Humans.*
