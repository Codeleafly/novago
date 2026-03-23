package runtime

import (
	"fmt"
	"strings"

	"novago/frontend"
)

type ValueType string

const (
	NullValType     ValueType = "null"
	NumberValType   ValueType = "number"
	BooleanValType  ValueType = "boolean"
	ObjectValType   ValueType = "object"
	NativeFnValType ValueType = "native-fn"
	FunctionValType ValueType = "function"
	StringValType   ValueType = "string"
	ArrayValType    ValueType = "array"
	PromiseValType  ValueType = "promise"
)

type RuntimeVal interface {
	GetType() ValueType
}

type PromiseVal struct {
	Type   ValueType
	Result chan RuntimeVal
}

func (p *PromiseVal) GetType() ValueType { return p.Type }
func MK_PROMISE() *PromiseVal {
	return &PromiseVal{Type: PromiseValType, Result: make(chan RuntimeVal, 1)}
}

type NullVal struct {
	Type ValueType
}

func (n *NullVal) GetType() ValueType { return n.Type }
func MK_NULL() *NullVal {
	return &NullVal{Type: NullValType}
}

type BooleanVal struct {
	Type  ValueType
	Value bool
}

func (b *BooleanVal) GetType() ValueType { return b.Type }
func MK_BOOL(b bool) *BooleanVal {
	return &BooleanVal{Type: BooleanValType, Value: b}
}

type NumberVal struct {
	Type  ValueType
	Value float64
}

func (n *NumberVal) GetType() ValueType { return n.Type }
func MK_NUMBER(n float64) *NumberVal {
	return &NumberVal{Type: NumberValType, Value: n}
}

type StringVal struct {
	Type  ValueType
	Value string
}

func (s *StringVal) GetType() ValueType { return s.Type }
func MK_STRING(s string) *StringVal {
	return &StringVal{Type: StringValType, Value: s}
}

type ObjectVal struct {
	Type       ValueType
	Properties map[string]RuntimeVal
}

func (o *ObjectVal) GetType() ValueType { return o.Type }
func MK_OBJECT(props map[string]RuntimeVal) *ObjectVal {
	return &ObjectVal{Type: ObjectValType, Properties: props}
}

type ArrayVal struct {
	Type     ValueType
	Elements []RuntimeVal
}

func (a *ArrayVal) GetType() ValueType { return a.Type }
func MK_ARRAY(elements []RuntimeVal) *ArrayVal {
	return &ArrayVal{Type: ArrayValType, Elements: elements}
}

type FunctionCall func(args []RuntimeVal, env *Environment) RuntimeVal

type NativeFnVal struct {
	Type       ValueType
	Call       FunctionCall
	Properties map[string]RuntimeVal
}

func (n *NativeFnVal) GetType() ValueType { return n.Type }
func MK_NATIVE_FN(call FunctionCall) *NativeFnVal {
	return &NativeFnVal{Type: NativeFnValType, Call: call, Properties: make(map[string]RuntimeVal)}
}

type FunctionVal struct {
	Type           ValueType
	Name           string
	Parameters     []string
	DeclarationEnv *Environment
	Body           []frontend.Stmt
	Async          bool
}

func (f *FunctionVal) GetType() ValueType { return f.Type }

type ReturnException struct {
	Value RuntimeVal
}

func (e *ReturnException) Error() string {
	return "Return"
}

func PlainStringify(val RuntimeVal) string {
	switch v := val.(type) {
	case *StringVal:
		return v.Value
	case *NumberVal:
		return fmt.Sprintf("%v", v.Value)
	case *BooleanVal:
		return fmt.Sprintf("%v", v.Value)
	case *NullVal:
		return "null"
	case *ArrayVal:
		var strs []string
		for _, e := range v.Elements {
			strs = append(strs, PlainStringify(e))
		}
		return "[" + strings.Join(strs, ", ") + "]"
	case *ObjectVal:
		var strs []string
		for k, val := range v.Properties {
			strs = append(strs, fmt.Sprintf("%s: %s", k, PlainStringify(val)))
		}
		return "{ " + strings.Join(strs, ", ") + " }"
	case *FunctionVal:
		return "[Function]"
	case *NativeFnVal:
		return "[Native Function]"
	default:
		return fmt.Sprintf("%v", v)
	}
}

func ToNumber(val RuntimeVal) float64 {
	switch v := val.(type) {
	case *NumberVal:
		return v.Value
	case *StringVal:
		var f float64
		fmt.Sscanf(v.Value, "%f", &f)
		return f
	case *BooleanVal:
		if v.Value {
			return 1
		}
		return 0
	default:
		return 0
	}
}

func ToBool(val RuntimeVal) bool {
	switch v := val.(type) {
	case *BooleanVal:
		return v.Value
	case *NumberVal:
		return v.Value != 0
	case *StringVal:
		return v.Value != ""
	case *NullVal:
		return false
	default:
		return true
	}
}

func GoToRuntimeVal(goVal interface{}) RuntimeVal {
	if goVal == nil {
		return MK_NULL()
	}

	switch v := goVal.(type) {
	case float64:
		return MK_NUMBER(v)
	case int:
		return MK_NUMBER(float64(v))
	case string:
		return MK_STRING(v)
	case bool:
		return MK_BOOL(v)
	case []interface{}:
		elements := make([]RuntimeVal, 0, len(v))
		for _, item := range v {
			elements = append(elements, GoToRuntimeVal(item))
		}
		return MK_ARRAY(elements)
	case map[string]interface{}:
		props := make(map[string]RuntimeVal)
		for key, item := range v {
			props[key] = GoToRuntimeVal(item)
		}
		return MK_OBJECT(props)
	default:
		return MK_NULL()
	}
}
