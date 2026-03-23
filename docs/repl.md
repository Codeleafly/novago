# NovaGo REPL Guide (v5.5.5)

The NovaGo REPL is a production-grade interactive shell for exploring and testing the language in real time.

## Starting the REPL
```bash
novago          # open REPL
novago repl     # explicit REPL command
```

| Command | Description |
|---------|-------------|
| `.help` | Show this command reference |
| `.editor` | Enter multi-line editor mode (type `.run` to execute, `.cancel` to abort) |
| `.clear` | Clear the terminal screen |
| `.reset` | Reset the environment (clears all declared variables) |
| `.exit` | Exit the REPL |
| `exit` | Shorthand to exit the REPL |

## Multi-Line Mode

### Auto-Continuation
If you type an **unclosed block** (e.g. `fn add(a, b) {`), the REPL will automatically show a `...` prompt and wait for you to finish the block:
```
novago ❯ fn greet(name) {
  ...   print("Hello", name)
  ...  }
  ⟵ [Function]
```

### Editor Mode
Use `.editor` to write multiple lines freely before executing:
```
novago ❯ .editor

  ── Editor Mode ──────────────────────────────────────
  Enter multiple lines of code.
  Type .run to execute, .cancel to abort.

  ✏  let x = 10
  ✏  let y = 20
  ✏  print(x + y)
  ✏  .run

── Running ──────────────────────────────
30
─────────────────────────────────────────
```

## Nova CLI Flags
| Command | Description |
|---------|-------------|
| `novago` | Start the interactive REPL |
| `novago repl` | Explicitly start the REPL |
| `novago run <file.ng>` | Run a NovaGo file |
| `novago <file.ng>` | Shorthand run (supports .ng, .ng, .nova) |
| `novago version` | Print the NovaGo version |
| `novago help` | Print full CLI help |
| `novago -v`, `-V` | Alias for `novago version` |
| `novago -h`, `-H` | Alias for `novago help` |

## Expression Results
Any expression that returns a non-null value will be shown with a `⟵` arrow:
```
novago ❯ 2 + 2
  ⟵ 4

novago ❯ Math.sqrt(144)
  ⟵ 12
```

## Persistent State
All variables declared in the REPL persist across lines until you type `.reset`.

## Exit
Type `.exit`, `exit`, or press `Ctrl+C`.
