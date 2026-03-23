package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/fatih/color"
	"novago/errors"
	"novago/frontend"
	"novago/runtime"
	"novago/runtime/native"
)

const VERSION = "0.0.1-dev"

var diag = errors.Diagnostics{Version: VERSION}

func setupEnv() *runtime.Environment {
	env := runtime.CreateGlobalEnv()

	// Standard Print
	env.DeclareVar("print", runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		var strs []string
		for _, arg := range args {
			strs = append(strs, runtime.PlainStringify(arg))
		}
		fmt.Println(strings.Join(strs, " "))
		return runtime.MK_NULL()
	}), true)

	// Input
	env.DeclareVar("input", runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		if len(args) > 0 {
			color.New(color.FgCyan).Print(runtime.PlainStringify(args[0]))
		}
		scanner := bufio.NewScanner(os.Stdin)
		if scanner.Scan() {
			return runtime.MK_STRING(scanner.Text())
		}
		return runtime.MK_STRING("")
	}), true)

	// Native Modules
	env.DeclareVar("Math", native.CreateMathModule(), true)
	env.DeclareVar("String", native.CreateStringModule(), true)
	env.DeclareVar("Array", native.CreateArrayModule(), true)
	env.DeclareVar("FS", native.CreateFSModule(), true)
	env.DeclareVar("File", native.CreateFSModule(), true)
	env.DeclareVar("Sys", native.CreateSysModule(VERSION), true)
	env.DeclareVar("HTTP", native.CreateHTTPModule(), true)

	utils := native.CreateUtilModules()
	for k, v := range utils {
		env.DeclareVar(k, v, true)
	}

	// Extra Helpers
	env.DeclareVar("clear", runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		cmd := exec.Command("clear")
		cmd.Stdout = os.Stdout
		cmd.Run()
		return runtime.MK_NULL()
	}), true)

	// Type Conversions
	env.DeclareVar("num", runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		if len(args) == 0 { return runtime.MK_NUMBER(0) }
		return runtime.MK_NUMBER(runtime.ToNumber(args[0]))
	}), true)

	env.DeclareVar("str", runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		if len(args) == 0 { return runtime.MK_STRING("") }
		return runtime.MK_STRING(runtime.PlainStringify(args[0]))
	}), true)

	env.DeclareVar("bool", runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		if len(args) == 0 { return runtime.MK_BOOL(false) }
		return runtime.MK_BOOL(runtime.ToBool(args[0]))
	}), true)

	env.DeclareVar("parseJson", runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		if len(args) == 0 { return runtime.MK_NULL() }
		str := runtime.PlainStringify(args[0])
		// Very basic for now, just returns the string or null
		return runtime.MK_STRING(str) 
	}), true)

	env.DeclareVar("fetchText", runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		if len(args) == 0 { return runtime.MK_NULL() }
		url := runtime.PlainStringify(args[0])
		httpMod := env.LookupVar("HTTP").(*runtime.ObjectVal)
		getFn := httpMod.Properties["get"].(*runtime.NativeFnVal)
		res := getFn.Call([]runtime.RuntimeVal{runtime.MK_STRING(url)}, env)
		if obj, ok := res.(*runtime.ObjectVal); ok {
			return obj.Properties["data"]
		}
		return runtime.MK_NULL()
	}), true)

	return env
}

func runFile(filename string) {
	absPath, err := filepath.Abs(filename)
	if err != nil {
		diag.Report(err)
		os.Exit(1)
	}

	data, err := os.ReadFile(absPath)
	if err != nil {
		diag.Report(err)
		os.Exit(1)
	}

	parser := frontend.NewParser()
	
	defer func() {
		if r := recover(); r != nil {
			diag.Report(r)
			os.Exit(1)
		}
	}()

	program := parser.ProduceAST(string(data), absPath)
	env := setupEnv()
	runtime.Evaluate(program, env)
}

func stringify(val runtime.RuntimeVal) string {
	switch v := val.(type) {
	case *runtime.StringVal:
		return color.HiGreenString(v.Value)
	case *runtime.NumberVal:
		return color.HiCyanString(fmt.Sprintf("%v", v.Value))
	case *runtime.BooleanVal:
		return color.HiYellowString(fmt.Sprintf("%v", v.Value))
	case *runtime.NullVal:
		return color.New(color.FgHiBlack).Sprint("null")
	case *runtime.ArrayVal:
		var strs []string
		for _, e := range v.Elements {
			strs = append(strs, stringify(e))
		}
		return "[" + strings.Join(strs, ", ") + "]"
	case *runtime.ObjectVal:
		var strs []string
		for k, val := range v.Properties {
			strs = append(strs, fmt.Sprintf("%s: %s", color.HiBlueString(k), stringify(val)))
		}
		return "{ " + strings.Join(strs, ", ") + " }"
	case *runtime.FunctionVal:
		return color.HiMagentaString("[Function]")
	case *runtime.NativeFnVal:
		return color.HiMagentaString("[Native Function]")
	default:
		return runtime.PlainStringify(val)
	}
}

func isIncomplete(code string) bool {
	braces := 0
	inStr := false
	for i := 0; i < len(code); i++ {
		ch := code[i]
		if ch == '"' && (i == 0 || code[i-1] != '\\') {
			inStr = !inStr
			continue
		}
		if inStr {
			continue
		}
		if ch == '{' {
			braces++
		} else if ch == '}' {
			braces--
		}
	}
	return braces > 0
}

func printReplHelp() {
	fmt.Println()
	color.New(color.FgCyan, color.Bold).Println("  NovaGo REPL Commands")
	fmt.Println(color.HiBlackString("  ─────────────────────────────────────────────────────"))
	fmt.Printf("  %-12s %s\n", color.YellowString(".help"), "Show this help message")
	fmt.Printf("  %-12s %s\n", color.YellowString(".editor"), "Enter multi-line editor mode (finish with .run)")
	fmt.Printf("  %-12s %s\n", color.YellowString(".clear"), "Clear the terminal screen")
	fmt.Printf("  %-12s %s\n", color.YellowString(".reset"), "Reset the REPL state (clears all variables)")
	fmt.Printf("  %-12s %s\n", color.YellowString(".exit"), "Exit the REPL")
	fmt.Println()
}

func printCliHelp() {
	fmt.Println()
	color.New(color.FgCyan, color.Bold).Printf("  NovaGo CLI %s\n", VERSION)
	fmt.Println(color.HiBlackString("  ─────────────────────────────────────────────────────────────────────"))
	fmt.Printf("  %-25s %s\n", color.YellowString("novago"), "Start the interactive REPL")
	fmt.Printf("  %-25s %s\n", color.YellowString("novago run <file.ng>"), "Run a NovaGo file")
	fmt.Printf("  %-25s %s\n", color.YellowString("novago <file.ng>"), "Run a NovaGo file (shorthand)")
	fmt.Printf("  %-25s %s\n", color.YellowString("novago get <source>"), "Pre-fetch a global dependency (github:, https:)")
	fmt.Printf("  %-25s %s\n", color.YellowString("novago clean"), "Clear the global library cache (~/.novago_libs)")
	fmt.Printf("  %-25s %s\n", color.YellowString("novago version"), "Print the current version")
	fmt.Printf("  %-25s %s\n", color.YellowString("novago help"), "Show this help message")
	fmt.Printf("  %-25s %s\n", color.YellowString("novago repl"), "Start the interactive REPL explicitly")
	fmt.Println()
}

func main() {
	showVersion := flag.Bool("v", false, "Show version")
	showHelp := flag.Bool("h", false, "Show help")
	flag.Parse()

	if *showVersion {
		fmt.Printf("NovaGo version %s\n", VERSION)
		return
	}

	if *showHelp {
		printCliHelp()
		return
	}

	args := flag.Args()
	if len(args) == 0 {
		runTviewREPL()
		return
	}

	cmd := args[0]
	switch cmd {
	case "help":
		printCliHelp()
	case "version":
		fmt.Printf("NovaGo version %s\n", VERSION)
	case "repl":
		runTviewREPL()
	case "run":
		if len(args) < 2 {
			color.New(color.FgRed, color.Bold).Println("\n  Error: No file specified. Usage: novago run <file.ng>")
			os.Exit(1)
		}
		runFile(args[1])
	case "get", "install":
		if len(args) < 2 {
			color.New(color.FgRed, color.Bold).Println("\n  Error: No source specified. Usage: novago get <source>")
			os.Exit(1)
		}
		lm := runtime.NewLibraryManager()
		_, err := lm.Resolve(args[1])
		if err != nil {
			color.New(color.FgRed, color.Bold).Printf("\n  Import Error: %v\n", err)
			os.Exit(1)
		}
	case "clean":
		lm := runtime.NewLibraryManager()
		lm.Clean()
	default:
		// Assume it's a filename (backward compatible)
		if strings.HasSuffix(cmd, ".ng") || strings.HasSuffix(cmd, ".nv") || strings.HasSuffix(cmd, ".ns") || strings.HasSuffix(cmd, ".nova") {
			runFile(cmd)
		} else {
			// Check if file exists even without extension
			if _, err := os.Stat(cmd); err == nil {
				runFile(cmd)
			} else if _, err := os.Stat(cmd + ".ng"); err == nil {
				runFile(cmd + ".ng")
			} else {
				color.New(color.FgRed, color.Bold).Printf("\n  Unknown command or file: %s\n", cmd)
				color.HiBlack("  Run 'novago help' for usage.\n")
				os.Exit(1)
			}
		}
	}
}
