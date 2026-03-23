package frontend

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

type TokenType int

const (
	// Literals
	Number TokenType = iota
	StringToken
	IdentifierToken

	// Keywords
	Let
	Const
	Global
	Fn
	If
	Else
	While
	For
	From
	To
	Return
	Include
	And
	Or
	Not
	Is
	Isnt

	// Symbols
	Assign       // =
	PlusEquals   // +=
	MinusEquals  // -=
	Equals       // == or is
	NotEquals    // != or isnt
	LessThan     // <
	LessEquals   // <=
	GreaterThan  // >
	GreaterEquals// >=
	Plus         // +
	Minus        // -
	Times        // *
	Power        // **
	Slash        // /
	Percent      // %
	Ampersand    // &
	Pipe         // |
	Caret        // ^
	ShiftLeft    // <<
	ShiftRight   // >>
	AndLogic     // && or and
	OrLogic      // || or or
	NotLogic     // ! or not

	OpenParen    // (
	CloseParen   // )
	OpenBrace    // {
	CloseBrace   // }
	OpenBracket  // [
	CloseBracket // ]
	Comma
	Dot
	Colon        // :
	SemiColon    // ;
	Arrow        // =>
	DotDotDot    // ...
	Question     // ?
	NullCoalesce // ??
	OptionalChain// ?.

	// Keywords
	Switch
	Case
	Default
	Try
	Catch
	Finally
	Throw
	Async
	Await
	Break
	Continue
	Export

	// Special
	EOF
)

var KEYWORDS = map[string]TokenType{
	"let":      Let,
	"const":    Const,
	"global":   Global,
	"fn":       Fn,
	"if":       If,
	"else":     Else,
	"while":    While,
	"for":      For,
	"from":     From,
	"to":       To,
	"return":   Return,
	"include":  Include,
	"import":   Include,
	"and":      AndLogic,
	"or":       OrLogic,
	"not":      NotLogic,
	"is":       Equals,
	"isnt":     NotEquals,
	"switch":   Switch,
	"case":     Case,
	"default":  Default,
	"try":      Try,
	"catch":    Catch,
	"finally":  Finally,
	"throw":    Throw,
	"async":    Async,
	"await":    Await,
	"break":    Break,
	"continue": Continue,
	"export":   Export,
}

type Token struct {
	Value  string
	Type   TokenType
	Line   int
	Column int
}

func Tokenize(sourceCode string) []Token {
	var tokens []Token
	src := []rune(sourceCode)
	line := 1
	column := 1

	pushToken := func(value string, t TokenType) {
		tokens = append(tokens, Token{Value: value, Type: t, Line: line, Column: column - len(value)})
	}

	shift := func() string {
		c := string(src[0])
		src = src[1:]
		return c
	}

	for len(src) > 0 {
		c := src[0]
		if c == '(' {
			pushToken(shift(), OpenParen)
		} else if c == ')' {
			pushToken(shift(), CloseParen)
		} else if c == '{' {
			pushToken(shift(), OpenBrace)
		} else if c == '}' {
			pushToken(shift(), CloseBrace)
		} else if c == '[' {
			pushToken(shift(), OpenBracket)
		} else if c == ']' {
			pushToken(shift(), CloseBracket)
		} else if c == ',' {
			pushToken(shift(), Comma)
		} else if c == ':' {
			pushToken(shift(), Colon)
		} else if c == ';' {
			pushToken(shift(), SemiColon)
		} else if c == '.' {
			pushToken(shift(), Dot)
		} else if c == '+' {
			if len(src) > 1 && src[1] == '=' {
				shift()
				shift()
				column += 2
				tokens = append(tokens, Token{Value: "+=", Type: PlusEquals, Line: line, Column: column - 2})
				continue
			} else {
				pushToken(shift(), Plus)
			}
		} else if c == '-' {
			if len(src) > 1 && src[1] == '=' {
				shift()
				shift()
				column += 2
				tokens = append(tokens, Token{Value: "-=", Type: MinusEquals, Line: line, Column: column - 2})
				continue
			} else {
				pushToken(shift(), Minus)
			}
		} else if c == '*' {
			if len(src) > 1 && src[1] == '*' {
				shift()
				shift()
				column += 2
				tokens = append(tokens, Token{Value: "**", Type: Power, Line: line, Column: column - 2})
				continue
			} else {
				pushToken(shift(), Times)
			}
		} else if c == '/' {
			pushToken(shift(), Slash)
		} else if c == '%' {
			pushToken(shift(), Percent)
		} else if c == '=' {
			if len(src) > 1 && src[1] == '=' {
				shift()
				shift()
				column += 2
				tokens = append(tokens, Token{Value: "==", Type: Equals, Line: line, Column: column - 2})
				continue
			} else if len(src) > 1 && src[1] == '>' {
				shift()
				shift()
				column += 2
				tokens = append(tokens, Token{Value: "=>", Type: Arrow, Line: line, Column: column - 2})
				continue
			} else {
				pushToken(shift(), Assign)
			}
		} else if c == '!' {
			if len(src) > 1 && src[1] == '=' {
				shift()
				shift()
				column += 2
				tokens = append(tokens, Token{Value: "!=", Type: NotEquals, Line: line, Column: column - 2})
				continue
			} else {
				pushToken(shift(), NotLogic)
			}
		} else if c == '<' {
			if len(src) > 1 && src[1] == '=' {
				shift()
				shift()
				column += 2
				tokens = append(tokens, Token{Value: "<=", Type: LessEquals, Line: line, Column: column - 2})
				continue
			} else if len(src) > 1 && src[1] == '<' {
				shift()
				shift()
				column += 2
				tokens = append(tokens, Token{Value: "<<", Type: ShiftLeft, Line: line, Column: column - 2})
				continue
			} else {
				pushToken(shift(), LessThan)
			}
		} else if c == '>' {
			if len(src) > 1 && src[1] == '=' {
				shift()
				shift()
				column += 2
				tokens = append(tokens, Token{Value: ">=", Type: GreaterEquals, Line: line, Column: column - 2})
				continue
			} else if len(src) > 1 && src[1] == '>' {
				shift()
				shift()
				column += 2
				tokens = append(tokens, Token{Value: ">>", Type: ShiftRight, Line: line, Column: column - 2})
				continue
			} else {
				pushToken(shift(), GreaterThan)
			}
		} else if c == '&' {
			if len(src) > 1 && src[1] == '&' {
				shift()
				shift()
				column += 2
				tokens = append(tokens, Token{Value: "&&", Type: AndLogic, Line: line, Column: column - 2})
				continue
			} else {
				pushToken(shift(), Ampersand)
			}
		} else if c == '|' {
			if len(src) > 1 && src[1] == '|' {
				shift()
				shift()
				column += 2
				tokens = append(tokens, Token{Value: "||", Type: OrLogic, Line: line, Column: column - 2})
				continue
			} else {
				pushToken(shift(), Pipe)
			}
		} else if c == '^' {
			pushToken(shift(), Caret)
		} else if c == '?' {
			if len(src) > 1 && src[1] == '?' {
				shift()
				shift()
				column += 2
				tokens = append(tokens, Token{Value: "??", Type: NullCoalesce, Line: line, Column: column - 2})
				continue
			} else if len(src) > 1 && src[1] == '.' {
				shift()
				shift()
				column += 2
				tokens = append(tokens, Token{Value: "?.", Type: OptionalChain, Line: line, Column: column - 2})
				continue
			} else {
				pushToken(shift(), Question)
			}
		} else if c == '#' {
			for len(src) > 0 && src[0] != '\n' {
				shift()
			}
		} else if c == '\n' {
			line++
			column = 1
			shift()
			continue
		} else if isWhitespace(c) {
			shift()
			column++
			continue
		} else if isDigit(c) {
			num := ""
			for len(src) > 0 && (isDigit(src[0]) || src[0] == '.') {
				num += shift()
				column++
			}
			tokens = append(tokens, Token{Value: num, Type: Number, Line: line, Column: column - len(num)})
			continue
		} else if c == '"' || c == '\'' {
			quote := shift()
			startLine := line
			startColumn := column
			column++
			str := ""
			for len(src) > 0 && string(src[0]) != quote {
				if src[0] == '\\' {
					shift()
					column++
					if len(src) == 0 {
						break
					}
					escapeChar := shift()
					column++
					switch escapeChar {
					case "n":
						str += "\n"
					case "r":
						str += "\r"
					case "t":
						str += "\t"
					case "b":
						str += "\b"
					case "f":
						str += "\f"
					case "v":
						str += "\v"
					case "\\":
						str += "\\"
					case "\"":
						str += "\""
					case "'":
						str += "'"
					case "e":
						str += "\x1b"
					case "x":
						if len(src) >= 2 {
							hex := shift() + shift()
							column += 2
							val, _ := strconv.ParseInt(hex, 16, 32)
							str += string(rune(val))
						}
					default:
						str += escapeChar
					}
				} else {
					str += shift()
					column++
				}
			}
			if len(src) > 0 && string(src[0]) == quote {
				shift()
				column++
			}
			tokens = append(tokens, Token{Value: str, Type: StringToken, Line: startLine, Column: startColumn})
			continue
		} else if isAlpha(c) {
			ident := ""
			for len(src) > 0 && isAlphaNumeric(src[0]) {
				ident += shift()
				column++
			}
			lowerIdent := strings.ToLower(ident)
			if reserved, ok := KEYWORDS[lowerIdent]; ok {
				tokens = append(tokens, Token{Value: ident, Type: reserved, Line: line, Column: column - len(ident)})
			} else {
				tokens = append(tokens, Token{Value: ident, Type: IdentifierToken, Line: line, Column: column - len(ident)})
			}
			continue
		} else {
			fmt.Printf("Unrecognized character found in source: %c at line %d\n", c, line)
			shift()
			column++
		}
		column++
	}

	tokens = append(tokens, Token{Type: EOF, Value: "EndOfFile", Line: line, Column: column})
	return tokens
}

func isWhitespace(r rune) bool {
	return r == ' ' || r == '\t' || r == '\r'
}

func isDigit(r rune) bool {
	return r >= '0' && r <= '9'
}

func isAlpha(r rune) bool {
	matched, _ := regexp.MatchString(`[a-zA-Z_]`, string(r))
	return matched
}

func isAlphaNumeric(r rune) bool {
	matched, _ := regexp.MatchString(`[a-zA-Z0-9_]`, string(r))
	return matched
}
