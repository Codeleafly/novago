package errors

import (
	"fmt"
	"math"
	"runtime"
	"strings"
	"time"

	"github.com/fatih/color"
)

var ERROR_ICONS = map[ErrorType]string{
	SyntaxError:       "✘",
	TypeError:         "⚠",
	ReferenceError:    "?",
	RuntimeError:      "✘",
	ImportError:       "⬇",
	ValueError:        "✘",
	ZeroDivisionError: "÷",
}

var ERROR_COLORS = map[ErrorType]*color.Color{
	SyntaxError:       color.New(color.FgRed, color.Bold),
	TypeError:         color.New(color.FgYellow, color.Bold),
	ReferenceError:    color.New(color.FgMagenta, color.Bold),
	RuntimeError:      color.New(color.FgRed, color.Bold),
	ImportError:       color.New(color.FgCyan, color.Bold),
	ValueError:        color.New(color.FgRed, color.Bold),
	ZeroDivisionError: color.New(color.FgRed, color.Bold),
}

type Diagnostics struct {
	Version string
}

func (d *Diagnostics) Report(err interface{}) {
	fmt.Println()

	if novaErr, ok := err.(*NovaError); ok {
		d.reportNovaError(novaErr)
	} else if novaErrPtr, ok := err.(*NovaError); ok {
		d.reportNovaError(novaErrPtr)
	} else {
		d.reportSystemError(err)
	}
}

func (d *Diagnostics) reportNovaError(err *NovaError) {
	icon, ok := ERROR_ICONS[err.Type]
	if !ok {
		icon = "✘"
	}

	c, ok := ERROR_COLORS[err.Type]
	if !ok {
		c = color.New(color.FgRed, color.Bold)
	}

	// Header
	c.Printf("%s %s\n", icon, err.Type)
	fmt.Println(strings.Repeat("─", 50))

	// Message and Location
	color.White("%s", err.Message)
	color.New(color.FgHiBlack).Printf("File: %s:%d:%d\n", err.Location.File, err.Location.Line, err.Location.Column)
	fmt.Println()

	// Source snippet
	if err.Location.Source != "" {
		lines := strings.Split(err.Location.Source, "\n")
		startLine := int(math.Max(0, float64(err.Location.Line-3)))
		endLine := int(math.Min(float64(len(lines)), float64(err.Location.Line+2)))

		for i := startLine; i < endLine; i++ {
			lineNum := i + 1
			lineContent := lines[i]
			numStr := fmt.Sprintf("%4d | ", lineNum)

			if lineNum == err.Location.Line {
				c.Print(numStr)
				color.HiWhite(lineContent)
				
				// Caret
				caretPad := ""
				if err.Location.Column > 1 {
					caretPad = strings.Repeat(" ", err.Location.Column-1)
				}
				color.New(color.FgHiBlack).Print("     | ")
				c.Printf("%s^── %s\n", caretPad, err.Message)
			} else {
				color.New(color.FgHiBlack).Printf("%s%s\n", numStr, lineContent)
			}
		}
	}

	fmt.Println(strings.Repeat("─", 50))
	diagnosticInfo := fmt.Sprintf("NovaGo %s | %s %s | Go %s\n%s", 
		d.Version, runtime.GOOS, runtime.GOARCH, runtime.Version(), time.Now().Format(time.RFC1123))
	color.New(color.FgHiBlack).Println(diagnosticInfo)
	fmt.Println()
}

func (d *Diagnostics) reportSystemError(err interface{}) {
	header := color.New(color.FgRed, color.Bold)
	header.Println("✘ System Error")
	fmt.Println(strings.Repeat("─", 50))
	
	msg := fmt.Sprintf("%v", err)
	color.White("%s", msg)
	fmt.Println(strings.Repeat("─", 50))
}
