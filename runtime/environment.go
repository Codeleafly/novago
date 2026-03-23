package runtime

import (
	"fmt"
)

type ScopeType string

const (
	GlobalScope   ScopeType = "global"
	FunctionScope ScopeType = "function"
	BlockScope    ScopeType = "block"
)

type Environment struct {
	parent    *Environment
	variables map[string]RuntimeVal
	constants map[string]bool
	ScopeType ScopeType
}

func NewEnvironment(parent *Environment, scopeType ScopeType) *Environment {
	return &Environment{
		parent:    parent,
		variables: make(map[string]RuntimeVal),
		constants: make(map[string]bool),
		ScopeType: scopeType,
	}
}

func (e *Environment) GetGlobalEnv() *Environment {
	env := e
	for env.parent != nil {
		env = env.parent
	}
	return env
}

func (e *Environment) DeclareVar(varname string, value RuntimeVal, constant bool) RuntimeVal {
	if _, ok := e.variables[varname]; ok {
		panic(fmt.Sprintf("Cannot declare variable '%s'. It is already defined in this scope.", varname))
	}
	e.variables[varname] = value
	if constant {
		e.constants[varname] = true
	}
	return value
}

func (e *Environment) DeclareGlobal(varname string, value RuntimeVal, constant bool) RuntimeVal {
	global := e.GetGlobalEnv()
	if _, ok := global.variables[varname]; ok {
		if global.constants[varname] {
			panic(fmt.Sprintf("Cannot redeclare constant global '%s'.", varname))
		}
	}
	global.variables[varname] = value
	if constant {
		global.constants[varname] = true
	}
	return value
}

func (e *Environment) AssignVar(varname string, value RuntimeVal) RuntimeVal {
	env := e.Resolve(varname)
	if env.constants[varname] {
		panic(fmt.Sprintf("Cannot reassign to constant '%s'.", varname))
	}
	env.variables[varname] = value
	return value
}

func (e *Environment) LookupVar(varname string) RuntimeVal {
	env := e.Resolve(varname)
	return env.variables[varname]
}

func (e *Environment) Resolve(varname string) *Environment {
	if _, ok := e.variables[varname]; ok {
		return e
	}
	if e.parent == nil {
		panic(fmt.Sprintf("Cannot resolve '%s' as it does not exist.", varname))
	}
	return e.parent.Resolve(varname)
}

func (e *Environment) HasOwn(varname string) bool {
	_, ok := e.variables[varname]
	return ok
}

func CreateGlobalEnv() *Environment {
	env := NewEnvironment(nil, GlobalScope)
	env.DeclareVar("true", MK_BOOL(true), true)
	env.DeclareVar("false", MK_BOOL(false), true)
	env.DeclareVar("null", MK_NULL(), true)
	return env
}
