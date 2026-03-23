package main

import (
	"fmt"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
	"novago/frontend"
	"novago/runtime"
)

func runTviewREPL() {
	app := tview.NewApplication()

	// Text view for output
	outputView := tview.NewTextView().
		SetDynamicColors(true).
		SetRegions(true).
		SetWordWrap(true).
		SetScrollable(true).
		SetChangedFunc(func() {
			app.Draw()
		})
	
	outputView.SetBorder(true).
		SetTitle(fmt.Sprintf(" NovaGo %s REPL ", VERSION)).
		SetTitleColor(tcell.GetColor("fuchsia"))

	// Input field
	inputField := tview.NewInputField().
		SetLabel("[green]novago ❯ [-]").
		SetFieldWidth(0).
		SetAcceptanceFunc(tview.InputFieldMaxLength(1000))
	
	inputField.SetBorder(true).
		SetTitle(" Input (Press Ctrl+J for multi-line, Esc to execute, Ctrl+C to quit) ").
		SetTitleColor(tcell.GetColor("aqua"))

	// Custom environment for REPL that redirects print
	env := setupEnv()
	env.AssignVar("print", runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, e *runtime.Environment) runtime.RuntimeVal {
		var strs []string
		for _, arg := range args {
			strs = append(strs, runtime.PlainStringify(arg))
		}
		fmt.Fprintf(outputView, "%s\n", strings.Join(strs, " "))
		return runtime.MK_NULL()
	}))

	parser := frontend.NewParser()

	// Multi-line mode handling
	var isMultiLine bool
	var multiLineCode string

	inputField.SetDoneFunc(func(key tcell.Key) {
		if key == tcell.KeyEnter {
			if isMultiLine {
				multiLineCode += inputField.GetText() + "\n"
				inputField.SetText("")
				fmt.Fprintf(outputView, "[yellow]... %s[-]\n", inputField.GetText())
				return
			}

			code := inputField.GetText()
			inputField.SetText("")
			if strings.TrimSpace(code) == "" {
				return
			}
			
			if code == "exit" || code == ".exit" {
				app.Stop()
				return
			}
			if code == ".clear" {
				outputView.Clear()
				return
			}

			fmt.Fprintf(outputView, "[blue]❯ %s[-]\n", code)

			func() {
				defer func() {
					if r := recover(); r != nil {
						fmt.Fprintf(outputView, "[red]Error: %v[-]\n", r)
					}
				}()
				program := parser.ProduceAST(code, "repl")
				result := runtime.Evaluate(program, env)
				if result.GetType() != runtime.NullValType {
					fmt.Fprintf(outputView, "[gray]⟵ [-]%s\n", stringifyForTview(result))
				}
			}()
		}
	})

	inputField.SetInputCapture(func(event *tcell.EventKey) *tcell.EventKey {
		if event.Key() == tcell.KeyCtrlC {
			app.Stop()
			return nil
		}
		if event.Key() == tcell.KeyCtrlJ {
			isMultiLine = true
			inputField.SetLabel("[yellow]... [-]")
			fmt.Fprintln(outputView, "[yellow]-- Entered Multi-line Mode (Press ESC to execute) --[-]")
			return nil
		}
		if event.Key() == tcell.KeyEscape {
			if isMultiLine {
				isMultiLine = false
				inputField.SetLabel("[green]novago ❯ [-]")
				
				code := multiLineCode + inputField.GetText()
				inputField.SetText("")
				multiLineCode = ""
				
				fmt.Fprintln(outputView, "[yellow]-- Executing Block --[-]")
				if strings.TrimSpace(code) != "" {
					func() {
						defer func() {
							if r := recover(); r != nil {
								fmt.Fprintf(outputView, "[red]Error: %v[-]\n", r)
							}
						}()
						program := parser.ProduceAST(code, "repl")
						result := runtime.Evaluate(program, env)
						if result.GetType() != runtime.NullValType {
							fmt.Fprintf(outputView, "[gray]⟵ [-]%s\n", stringifyForTview(result))
						}
					}()
				}
				return nil
			}
		}
		return event
	})

	flex := tview.NewFlex().
		SetDirection(tview.FlexRow).
		AddItem(outputView, 0, 1, false).
		AddItem(inputField, 3, 0, true)

	fmt.Fprintf(outputView, "[magenta]✧ NovaGo ✧[-] Version %s\n", VERSION)
	fmt.Fprintf(outputView, "Type [yellow]exit[-] to quit, [yellow].clear[-] to clear screen.\n")
	fmt.Fprintf(outputView, "Press [yellow]Ctrl+J[-] for multi-line mode.\n\n")

	if err := app.SetRoot(flex, true).EnableMouse(true).Run(); err != nil {
		panic(err)
	}
}

func stringifyForTview(val runtime.RuntimeVal) string {
	switch v := val.(type) {
	case *runtime.StringVal:
		return fmt.Sprintf("[green]\"%s\"[-]", v.Value)
	case *runtime.NumberVal:
		return fmt.Sprintf("[cyan]%v[-]", v.Value)
	case *runtime.BooleanVal:
		return fmt.Sprintf("[yellow]%v[-]", v.Value)
	case *runtime.NullVal:
		return "[gray]null[-]"
	case *runtime.ArrayVal:
		var strs []string
		for _, e := range v.Elements {
			strs = append(strs, stringifyForTview(e))
		}
		return "[" + strings.Join(strs, ", ") + "]"
	case *runtime.ObjectVal:
		var strs []string
		for k, val := range v.Properties {
			strs = append(strs, fmt.Sprintf("%s: %s", fmt.Sprintf("[blue]%s[-]", k), stringifyForTview(val)))
		}
		return "{ " + strings.Join(strs, ", ") + " }"
	case *runtime.FunctionVal:
		return "[magenta][Function][-]"
	case *runtime.NativeFnVal:
		return "[magenta][Native Function][-]"
	default:
		return runtime.PlainStringify(val)
	}
}
