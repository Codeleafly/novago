package runtime

import (
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"

	"novago/errors"
	"novago/frontend"
)

var moduleCache = make(map[string]RuntimeVal)
var libraryManager = NewLibraryManager()

func evalModule(modulePath string, env *Environment, callerFile string) RuntimeVal {
	resolvedPath, err := libraryManager.Resolve(modulePath)
	if err != nil {
		panic(&errors.NovaError{
			Type:    errors.ImportError,
			Message: err.Error(),
			Location: errors.ErrorLocation{
				File: callerFile,
			},
		})
	}
	modulePath = resolvedPath

	if strings.HasPrefix(modulePath, "go:") {
		nativeName := strings.ToLower(modulePath[3:])
		globalEnv := env.GetGlobalEnv()
		
		// Fallback for some common ones
		if nativeName == "fs" { return globalEnv.variables["FS"] }
		if nativeName == "sys" { return globalEnv.variables["Sys"] }
		if nativeName == "http" { return globalEnv.variables["HTTP"] }
		if nativeName == "math" { return globalEnv.variables["Math"] }
		if nativeName == "string" { return globalEnv.variables["String"] }
		if nativeName == "array" { return globalEnv.variables["Array"] }
		
		panic(fmt.Sprintf("Unknown Go native module: %s", nativeName))
	}

	absPath := modulePath
	if !filepath.IsAbs(absPath) && callerFile != "" && callerFile != "repl" {
		absPath = filepath.Join(filepath.Dir(callerFile), modulePath)
	}
	absPath, _ = filepath.Abs(absPath)

	// Try adding .ng extension if not present
	if _, err := os.Stat(absPath); os.IsNotExist(err) && !strings.HasSuffix(absPath, ".ng") {
		if _, err := os.Stat(absPath + ".ng"); err == nil {
			absPath += ".ng"
		}
	}

	if val, ok := moduleCache[absPath]; ok {
		return val
	}

	data, err := os.ReadFile(absPath)
	if err != nil {
		panic(fmt.Sprintf("Module not found: %s", absPath))
	}

	parser := frontend.NewParser()
	program := parser.ProduceAST(string(data), absPath)

	moduleEnv := NewEnvironment(env.GetGlobalEnv(), BlockScope)
	exports := MK_OBJECT(make(map[string]RuntimeVal))
	moduleEnv.DeclareVar("exports", exports, false)

	Evaluate(program, moduleEnv)

	moduleCache[absPath] = exports
	return exports
}

func evalNamedImport(stmt *frontend.NamedImportStatement, env *Environment) {
	moduleVal := evalModule(stmt.ModuleName, env, stmt.File)
	if obj, ok := moduleVal.(*ObjectVal); ok {
		for _, name := range stmt.Imports {
			if val, ok := obj.Properties[name]; ok {
				env.DeclareVar(name, val, true)
			} else {
				panic(fmt.Sprintf("Module '%s' has no export named '%s'", stmt.ModuleName, name))
			}
		}
	} else {
		panic(fmt.Sprintf("Module '%s' did not export an object", stmt.ModuleName))
	}
}

type BreakException struct{}
func (e *BreakException) Error() string { return "Break" }

type ContinueException struct{}
func (e *ContinueException) Error() string { return "Continue" }

func Evaluate(astNode frontend.Stmt, env *Environment) RuntimeVal {
	switch node := astNode.(type) {
	case *frontend.NumericLiteral:
		return MK_NUMBER(node.Value)
	case *frontend.StringLiteral:
		return MK_STRING(node.Value)
	case *frontend.Identifier:
		return evalIdentifier(node, env)
	case *frontend.ObjectLiteral:
		return evalObjectExpr(node, env)
	case *frontend.ArrayLiteral:
		return evalArrayExpr(node, env)
	case *frontend.MemberExpr:
		return evalMemberExpr(node, env)
	case *frontend.CallExpr:
		return evalCallExpr(node, env)
	case *frontend.AssignmentExpr:
		return evalAssignment(node, env)
	case *frontend.BinaryExpr:
		return evalBinaryExpr(node, env)
	case *frontend.Program:
		return evalProgram(node, env)
	case *frontend.VarDeclaration:
		return evalVarDeclaration(node, env)
	case *frontend.GlobalDeclaration:
		return evalGlobalDeclaration(node, env)
	case *frontend.FunctionDeclaration:
		return evalFunctionDeclaration(node, env)
	case *frontend.IfStatement:
		return evalIfStatement(node, env)
	case *frontend.WhileStatement:
		return evalWhileStatement(node, env)
	case *frontend.ForStatement:
		return evalForStatement(node, env)
	case *frontend.ReturnStatement:
		var returnVal RuntimeVal = MK_NULL()
		if node.Value != nil {
			returnVal = Evaluate(node.Value, env)
		}
		panic(&ReturnException{Value: returnVal})
	case *frontend.BreakStatement:
		panic(&BreakException{})
	case *frontend.ContinueStatement:
		panic(&ContinueException{})
	case *frontend.ImportStatement:
		evalModule(node.ModuleName, env, node.File)
		return MK_NULL()
	case *frontend.NamedImportStatement:
		evalNamedImport(node, env)
		return MK_NULL()
	case *frontend.ImportExpr:
		modName := Evaluate(node.ModuleName, env)
		if s, ok := modName.(*StringVal); ok {
			return evalModule(s.Value, env, node.File)
		}
		panic("Module name must be a string")
	case *frontend.SwitchStatement:
		return evalSwitchStatement(node, env)
	case *frontend.TryCatchStatement:
		return evalTryCatchStatement(node, env)
	case *frontend.ThrowStatement:
		arg := Evaluate(node.Argument, env)
		panic(&errors.NovaError{
			Type:    errors.RuntimeError,
			Message: PlainStringify(arg),
			Location: errors.ErrorLocation{
				File:   node.File,
				Line:   node.Line,
				Column: node.Column,
				Source: node.Source,
			},
		})
	case *frontend.ExportDeclaration:
		val := Evaluate(node.Declaration, env)
		exports, _ := env.LookupVar("exports").(*ObjectVal)
		if exports != nil {
			var name string
			if v, ok := node.Declaration.(*frontend.VarDeclaration); ok {
				name = v.Identifier
			} else if f, ok := node.Declaration.(*frontend.FunctionDeclaration); ok {
				name = f.Name
			}
			if name != "" {
				exports.Properties[name] = val
			}
		}
		return val
	case *frontend.AwaitExpr:
		val := Evaluate(node.Argument, env)
		if p, ok := val.(*PromiseVal); ok {
			return <-p.Result
		}
		return val
	case *frontend.ArrowFnExpr:
		fn := &FunctionVal{
			Type:           FunctionValType,
			Name:           "anonymous",
			Parameters:     node.Parameters,
			DeclarationEnv: env,
			Body:           node.Body,
			Async:          node.Async,
		}
		return fn
	default:
		panic(fmt.Sprintf("This AST Node has not yet been setup for interpretation: %v", node.Kind()))
	}
}

func evalProgram(program *frontend.Program, env *Environment) RuntimeVal {
	var lastEvaluated RuntimeVal = MK_NULL()
	for _, statement := range program.Body {
		lastEvaluated = Evaluate(statement, env)
	}
	return lastEvaluated
}

func evalVarDeclaration(declaration *frontend.VarDeclaration, env *Environment) RuntimeVal {
	var value RuntimeVal = MK_NULL()
	if declaration.Value != nil {
		value = Evaluate(declaration.Value, env)
	}
	return env.DeclareVar(declaration.Identifier, value, declaration.Constant)
}

func evalGlobalDeclaration(declaration *frontend.GlobalDeclaration, env *Environment) RuntimeVal {
	var value RuntimeVal = MK_NULL()
	if declaration.Value != nil {
		value = Evaluate(declaration.Value, env)
	}
	return env.DeclareGlobal(declaration.Identifier, value, declaration.Constant)
}

func evalFunctionDeclaration(declaration *frontend.FunctionDeclaration, env *Environment) RuntimeVal {
	fn := &FunctionVal{
		Type:           FunctionValType,
		Name:           declaration.Name,
		Parameters:     declaration.Parameters,
		DeclarationEnv: env,
		Body:           declaration.Body,
		Async:          declaration.Async,
	}

	if declaration.Name == "anonymous" {
		return fn
	}
	return env.DeclareVar(declaration.Name, fn, true)
}

func evalIdentifier(ident *frontend.Identifier, env *Environment) RuntimeVal {
	defer func() {
		if r := recover(); r != nil {
			panic(&errors.NovaError{
				Type:    errors.ReferenceError,
				Message: fmt.Sprintf("%v", r),
				Location: errors.ErrorLocation{
					File:   ident.File,
					Line:   ident.Line,
					Column: ident.Column,
					Source: ident.Source,
				},
			})
		}
	}()
	return env.LookupVar(ident.Symbol)
}

func evalAssignment(node *frontend.AssignmentExpr, env *Environment) RuntimeVal {
	if ident, ok := node.Assignee.(*frontend.Identifier); ok {
		varname := ident.Symbol
		value := Evaluate(node.Value, env)
		return env.AssignVar(varname, value)
	} else if memberExpr, ok := node.Assignee.(*frontend.MemberExpr); ok {
		object := Evaluate(memberExpr.Object, env)
		if object.GetType() != ObjectValType {
			panic("Cannot assign to property of non-object.")
		}

		property := ""
		if memberExpr.Computed {
			propVal := Evaluate(memberExpr.Property, env)
			if strVal, ok := propVal.(*StringVal); ok {
				property = strVal.Value
			} else {
				panic("Computed property key must be a string")
			}
		} else {
			if ident, ok := memberExpr.Property.(*frontend.Identifier); ok {
				property = ident.Symbol
			} else {
				panic("Dot notation requires identifier")
			}
		}

		value := Evaluate(node.Value, env)
		object.(*ObjectVal).Properties[property] = value
		return value
	}
	panic("Invalid LHS inside assignment expr")
}

func evalObjectExpr(obj *frontend.ObjectLiteral, env *Environment) RuntimeVal {
	object := MK_OBJECT(make(map[string]RuntimeVal))
	for _, prop := range obj.Properties {
		var runtimeVal RuntimeVal
		if prop.Value == nil {
			runtimeVal = env.LookupVar(prop.Key)
		} else {
			runtimeVal = Evaluate(prop.Value, env)
		}
		object.Properties[prop.Key] = runtimeVal
	}
	return object
}

func evalArrayExpr(arr *frontend.ArrayLiteral, env *Environment) RuntimeVal {
	elements := make([]RuntimeVal, 0)
	for _, element := range arr.Elements {
		elements = append(elements, Evaluate(element, env))
	}
	return MK_ARRAY(elements)
}

func evalMemberExpr(expr *frontend.MemberExpr, env *Environment) RuntimeVal {
	object := Evaluate(expr.Object, env)
	property := ""
	numericIndex := -1

	if expr.Computed {
		propVal := Evaluate(expr.Property, env)
		if numVal, ok := propVal.(*NumberVal); ok {
			numericIndex = int(numVal.Value)
		} else if strVal, ok := propVal.(*StringVal); ok {
			property = strVal.Value
		} else {
			panic("Computed property key must be a string or number")
		}
	} else {
		if ident, ok := expr.Property.(*frontend.Identifier); ok {
			property = ident.Symbol
		} else {
			panic("Dot notation requires identifier")
		}
	}

	if object.GetType() == NullValType {
		if expr.Optional {
			return MK_NULL()
		}
		panic(fmt.Sprintf("Cannot read property '%s' of null", property))
	}

	if object.GetType() == ArrayValType {
		arr := object.(*ArrayVal).Elements
		if numericIndex >= 0 {
			if numericIndex < len(arr) {
				return arr[numericIndex]
			}
			return MK_NULL()
		}
		if property == "length" {
			return MK_NUMBER(float64(len(arr)))
		}
		panic(fmt.Sprintf("Array does not have property %s", property))
	}

	if object.GetType() == StringValType {
		if property == "length" {
			return MK_NUMBER(float64(len(object.(*StringVal).Value)))
		}
		panic(fmt.Sprintf("String does not have property %s", property))
	}

	if object.GetType() != ObjectValType && object.GetType() != NativeFnValType {
		if expr.Optional {
			return MK_NULL()
		}
		panic(fmt.Sprintf("Cannot access property of non-object. Found: %v", object.GetType()))
	}

	key := property
	if numericIndex >= 0 {
		key = fmt.Sprintf("%d", numericIndex)
	}

	var props map[string]RuntimeVal
	if obj, ok := object.(*ObjectVal); ok {
		props = obj.Properties
	} else if nfn, ok := object.(*NativeFnVal); ok {
		props = nfn.Properties
	}

	if val, ok := props[key]; ok {
		return val
	}
	return MK_NULL()
}

func evalCallExpr(expr *frontend.CallExpr, env *Environment) RuntimeVal {
	args := make([]RuntimeVal, 0)
	for _, arg := range expr.Args {
		args = append(args, Evaluate(arg, env))
	}
	fn := Evaluate(expr.Caller, env)

	if fn.GetType() == NullValType {
		if memberExpr, ok := expr.Caller.(*frontend.MemberExpr); ok && memberExpr.Optional {
			return MK_NULL()
		}
	}

	if fn.GetType() == NativeFnValType {
		return fn.(*NativeFnVal).Call(args, env)
	}

	if fn.GetType() == FunctionValType {
		funcVal := fn.(*FunctionVal)
		
		executeBody := func(scope *Environment, args []RuntimeVal) (result RuntimeVal) {
			result = MK_NULL()
			defer func() {
				if r := recover(); r != nil {
					if retEx, ok := r.(*ReturnException); ok {
						result = retEx.Value
					} else {
						panic(r)
					}
				}
			}()
			for _, stmt := range funcVal.Body {
				result = Evaluate(stmt, scope)
			}
			return result
		}

		scope := NewEnvironment(funcVal.DeclarationEnv, FunctionScope)
		for i := 0; i < len(funcVal.Parameters); i++ {
			var argVal RuntimeVal = MK_NULL()
			if i < len(args) {
				argVal = args[i]
			}
			scope.DeclareVar(funcVal.Parameters[i], argVal, false)
		}

		if funcVal.Async {
			p := MK_PROMISE()
			go func() {
				res := executeBody(scope, args)
				p.Result <- res
			}()
			return p
		}

		return executeBody(scope, args)
	}

	panic(fmt.Sprintf("Cannot call value that is not a function: %v", fn.GetType()))
}

func evalBinaryExpr(binop *frontend.BinaryExpr, env *Environment) RuntimeVal {
	if strings.HasPrefix(binop.Operator, "unary_") {
		arg := Evaluate(binop.Left, env)
		op := strings.ToLower(strings.Split(binop.Operator, "_")[1])

		if op == "not" || op == "!" {
			if b, ok := arg.(*BooleanVal); ok {
				return MK_BOOL(!b.Value)
			}
			if arg.GetType() == NullValType {
				return MK_BOOL(true)
			}
			if num, ok := arg.(*NumberVal); ok {
				return MK_BOOL(num.Value == 0)
			}
			return MK_BOOL(false)
		}
		if op == "-" {
			if num, ok := arg.(*NumberVal); ok {
				return MK_NUMBER(-num.Value)
			}
			panic("- requires number")
		}
	}

	op := strings.ToLower(binop.Operator)
	if op == "and" || op == "&&" {
		lhs := Evaluate(binop.Left, env)
		if lhs.GetType() != BooleanValType {
			panic("&& requires boolean")
		}
		if !lhs.(*BooleanVal).Value {
			return MK_BOOL(false)
		}
		rhs := Evaluate(binop.Right, env)
		if rhs.GetType() != BooleanValType {
			panic("&& requires boolean")
		}
		return MK_BOOL(rhs.(*BooleanVal).Value)
	}
	if op == "or" || op == "||" {
		lhs := Evaluate(binop.Left, env)
		if lhs.GetType() != BooleanValType {
			panic("|| requires boolean")
		}
		if lhs.(*BooleanVal).Value {
			return MK_BOOL(true)
		}
		rhs := Evaluate(binop.Right, env)
		if rhs.GetType() != BooleanValType {
			panic("|| requires boolean")
		}
		return MK_BOOL(rhs.(*BooleanVal).Value)
	}

	lhs := Evaluate(binop.Left, env)
	rhs := Evaluate(binop.Right, env)

	if op == "is" || op == "==" {
		if lhs.GetType() != rhs.GetType() {
			return MK_BOOL(false)
		}
		if lhs.GetType() == NumberValType {
			return MK_BOOL(lhs.(*NumberVal).Value == rhs.(*NumberVal).Value)
		}
		if lhs.GetType() == StringValType {
			return MK_BOOL(lhs.(*StringVal).Value == rhs.(*StringVal).Value)
		}
		if lhs.GetType() == BooleanValType {
			return MK_BOOL(lhs.(*BooleanVal).Value == rhs.(*BooleanVal).Value)
		}
		return MK_BOOL(false)
	}
	if op == "isnt" || op == "!=" {
		if lhs.GetType() != rhs.GetType() {
			return MK_BOOL(true)
		}
		if lhs.GetType() == NumberValType {
			return MK_BOOL(lhs.(*NumberVal).Value != rhs.(*NumberVal).Value)
		}
		if lhs.GetType() == StringValType {
			return MK_BOOL(lhs.(*StringVal).Value != rhs.(*StringVal).Value)
		}
		if lhs.GetType() == BooleanValType {
			return MK_BOOL(lhs.(*BooleanVal).Value != rhs.(*BooleanVal).Value)
		}
		return MK_BOOL(true)
	}

	if lhs.GetType() == NumberValType && rhs.GetType() == NumberValType {
		l := lhs.(*NumberVal).Value
		r := rhs.(*NumberVal).Value
		switch op {
		case "+":
			return MK_NUMBER(l + r)
		case "-":
			return MK_NUMBER(l - r)
		case "*":
			return MK_NUMBER(l * r)
		case "/":
			if r == 0 {
				panic("Division by zero")
			}
			return MK_NUMBER(l / r)
		case "%":
			return MK_NUMBER(math.Mod(l, r))
		case "**":
			return MK_NUMBER(math.Pow(l, r))
		case ">":
			return MK_BOOL(l > r)
		case "<":
			return MK_BOOL(l < r)
		case ">=":
			return MK_BOOL(l >= r)
		case "<=":
			return MK_BOOL(l <= r)
		}
	}

	if op == "+" {
		if lhs.GetType() == StringValType || rhs.GetType() == StringValType {
			lStr := PlainStringify(lhs)
			rStr := PlainStringify(rhs)
			return MK_STRING(lStr + rStr)
		}
	}

	if op == "??" {
		if lhs.GetType() != NullValType {
			return lhs
		}
		return rhs
	}

	return MK_NULL()
}

func evalIfStatement(stmt *frontend.IfStatement, env *Environment) RuntimeVal {
	condition := Evaluate(stmt.Condition, env)

	if b, ok := condition.(*BooleanVal); ok && b.Value {
		scope := NewEnvironment(env, BlockScope)
		var lastVal RuntimeVal = MK_NULL()
		for _, s := range stmt.ThenBranch {
			lastVal = Evaluate(s, scope)
		}
		return lastVal
	} else if len(stmt.ElseBranch) > 0 {
		scope := NewEnvironment(env, BlockScope)
		var lastVal RuntimeVal = MK_NULL()
		for _, s := range stmt.ElseBranch {
			lastVal = Evaluate(s, scope)
		}
		return lastVal
	}
	return MK_NULL()
}

func evalWhileStatement(stmt *frontend.WhileStatement, env *Environment) RuntimeVal {
	var lastVal RuntimeVal = MK_NULL()

	for {
		condition := Evaluate(stmt.Condition, env)
		if b, ok := condition.(*BooleanVal); !ok || !b.Value {
			break
		}
		scope := NewEnvironment(env, BlockScope)

		err := runLoopBody(stmt.Body, scope, &lastVal)
		if err == "break" {
			break
		} else if err == "continue" {
			continue
		} else if err != "" {
			panic(err)
		}
	}

	return lastVal
}

func evalForStatement(stmt *frontend.ForStatement, env *Environment) RuntimeVal {
	if stmt.Init != nil || stmt.Condition != nil || stmt.Update != nil {
		scope := NewEnvironment(env, BlockScope)
		if stmt.Init != nil {
			Evaluate(stmt.Init, scope)
		}

		var lastVal RuntimeVal = MK_NULL()
		for {
			if stmt.Condition != nil {
				condition := Evaluate(stmt.Condition, scope)
				if b, ok := condition.(*BooleanVal); !ok || !b.Value {
					break
				}
			}

			iterationScope := NewEnvironment(scope, BlockScope)
			err := runLoopBody(stmt.Body, iterationScope, &lastVal)

			if err == "break" {
				break
			} else if err == "continue" {
				if stmt.Update != nil {
					Evaluate(stmt.Update, scope)
				}
				continue
			} else if err != "" {
				panic(err)
			}

			if stmt.Update != nil {
				Evaluate(stmt.Update, scope)
			}
		}
		return lastVal
	}

	startVal := Evaluate(stmt.Start, env)
	endVal := Evaluate(stmt.End, env)

	if startVal.GetType() != NumberValType || endVal.GetType() != NumberValType {
		panic("Repeat loop range must be numbers")
	}

	var lastVal RuntimeVal = MK_NULL()
	scope := NewEnvironment(env, BlockScope)

	scope.DeclareVar(stmt.Counter, startVal, false)

	current := startVal.(*NumberVal).Value
	end := endVal.(*NumberVal).Value

	for current <= end {
		iterationScope := NewEnvironment(scope, BlockScope)
		err := runLoopBody(stmt.Body, iterationScope, &lastVal)

		if err == "break" {
			break
		} else if err == "continue" {
			current++
			scope.AssignVar(stmt.Counter, MK_NUMBER(current))
			continue
		} else if err != "" {
			panic(err)
		}
		current++
		scope.AssignVar(stmt.Counter, MK_NUMBER(current))
	}

	return lastVal
}

func evalSwitchStatement(stmt *frontend.SwitchStatement, env *Environment) RuntimeVal {
	discriminant := Evaluate(stmt.Discriminant, env)
	found := false
	var lastVal RuntimeVal = MK_NULL()

	for _, c := range stmt.Cases {
		test := Evaluate(c.Test, env)
		
		// Use "is" comparison logic
		isMatch := false
		if discriminant.GetType() == test.GetType() {
			switch v := discriminant.(type) {
			case *NumberVal:
				isMatch = v.Value == test.(*NumberVal).Value
			case *StringVal:
				isMatch = v.Value == test.(*StringVal).Value
			case *BooleanVal:
				isMatch = v.Value == test.(*BooleanVal).Value
			case *NullVal:
				isMatch = true
			}
		}

		if isMatch {
			found = true
			scope := NewEnvironment(env, BlockScope)
			for _, s := range c.Consequent {
				lastVal = Evaluate(s, scope)
			}
			break
		}
	}

	if !found && len(stmt.Default) > 0 {
		scope := NewEnvironment(env, BlockScope)
		for _, s := range stmt.Default {
			lastVal = Evaluate(s, scope)
		}
	}

	return lastVal
}

func evalTryCatchStatement(stmt *frontend.TryCatchStatement, env *Environment) RuntimeVal {
	var lastVal RuntimeVal = MK_NULL()

	executeBlock := func(body []frontend.Stmt, scope *Environment) (res RuntimeVal, caught bool, err interface{}) {
		defer func() {
			if r := recover(); r != nil {
				caught = true
				err = r
			}
		}()
		for _, s := range body {
			res = Evaluate(s, scope)
		}
		return
	}

	tryScope := NewEnvironment(env, BlockScope)
	res, caught, err := executeBlock(stmt.Body, tryScope)
	if caught {
		if stmt.CatchParameter != "" {
			catchScope := NewEnvironment(env, BlockScope)
			var errVal RuntimeVal = MK_NULL()
			if novaErr, ok := err.(*errors.NovaError); ok {
				errVal = MK_STRING(novaErr.Message)
			} else {
				errVal = MK_STRING(fmt.Sprintf("%v", err))
			}
			catchScope.DeclareVar(stmt.CatchParameter, errVal, false)
			res, _, _ = executeBlock(stmt.CatchBlock, catchScope)
		} else {
			catchScope := NewEnvironment(env, BlockScope)
			res, _, _ = executeBlock(stmt.CatchBlock, catchScope)
		}
	}
	lastVal = res

	if len(stmt.FinallyBlock) > 0 {
		finallyScope := NewEnvironment(env, BlockScope)
		Evaluate(&frontend.Program{Body: stmt.FinallyBlock}, finallyScope)
	}

	return lastVal
}

func runLoopBody(body []frontend.Stmt, scope *Environment, lastVal *RuntimeVal) (err string) {
	defer func() {
		if r := recover(); r != nil {
			if _, ok := r.(*BreakException); ok {
				err = "break"
			} else if _, ok := r.(*ContinueException); ok {
				err = "continue"
			} else {
				panic(r)
			}
		}
	}()

	for _, s := range body {
		*lastVal = Evaluate(s, scope)
	}
	return ""
}
