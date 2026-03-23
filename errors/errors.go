package errors

import (
	"fmt"
)

type ErrorType string

const (
	SyntaxError       ErrorType = "SyntaxError"
	TypeError         ErrorType = "TypeError"
	ReferenceError    ErrorType = "ReferenceError"
	RuntimeError      ErrorType = "RuntimeError"
	ImportError       ErrorType = "ImportError"
	ValueError        ErrorType = "ValueError"
	ZeroDivisionError ErrorType = "ZeroDivisionError"
)

type ErrorLocation struct {
	File   string
	Line   int
	Column int
	Source string
}

type NovaError struct {
	Type     ErrorType
	Message  string
	Location ErrorLocation
}

func (e *NovaError) Error() string {
	return fmt.Sprintf("%s: %s at %s:%d:%d", e.Type, e.Message, e.Location.File, e.Location.Line, e.Location.Column)
}

func NewNovaError(errType ErrorType, message string, loc ErrorLocation) *NovaError {
	return &NovaError{Type: errType, Message: message, Location: loc}
}
