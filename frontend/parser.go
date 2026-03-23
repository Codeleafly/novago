package frontend

import (
	"fmt"
	"strconv"

	"novago/errors"
)

type Parser struct {
	tokens   []Token
	filename string
	source   string
}

func NewParser() *Parser {
	return &Parser{
		filename: "repl",
	}
}

func (p *Parser) notEof() bool {
	return len(p.tokens) > 0 && p.tokens[0].Type != EOF
}

func (p *Parser) at() Token {
	if len(p.tokens) > 0 {
		return p.tokens[0]
	}
	return Token{Type: EOF, Value: "EOF"}
}

func (p *Parser) peek(offset int) Token {
	if offset < len(p.tokens) {
		return p.tokens[offset]
	}
	return Token{Type: EOF, Value: "EOF"}
}

func (p *Parser) eat() Token {
	tok := p.at()
	if len(p.tokens) > 0 {
		p.tokens = p.tokens[1:]
	}
	return tok
}

func (p *Parser) expect(expectedType TokenType, err string) Token {
	prev := p.eat()
	if prev.Type != expectedType {
		panic(&errors.NovaError{
			Type:    errors.SyntaxError,
			Message: fmt.Sprintf("%s. Expected %v but got %v ('%s')", err, expectedType, prev.Type, prev.Value),
			Location: errors.ErrorLocation{
				File:   p.filename,
				Line:   prev.Line,
				Column: prev.Column,
				Source: p.source,
			},
		})
	}
	return prev
}

func (p *Parser) ProduceAST(sourceCode string, filename string) *Program {
	p.source = sourceCode
	p.filename = filename
	p.tokens = Tokenize(sourceCode)

	program := &Program{
		BaseNode: BaseNode{
			Type:   ProgramNode,
			Line:   1,
			Column: 1,
			File:   filename,
			Source: sourceCode,
		},
		Body: []Stmt{},
	}

	for p.notEof() {
		program.Body = append(program.Body, p.parseStatement())
		if p.at().Type == SemiColon {
			p.eat()
		}
	}

	return program
}

func (p *Parser) parseStatement() Stmt {
	switch p.at().Type {
	case Let, Const:
		return p.parseVarDeclaration()
	case Global:
		return p.parseGlobalDeclaration()
	case Async, Fn:
		return p.parseFunctionDeclaration()
	case If:
		return p.parseIfStatement()
	case While:
		return p.parseWhileStatement()
	case For:
		return p.parseForStatement()
	case Switch:
		return p.parseSwitchStatement()
	case Try:
		return p.parseTryCatchStatement()
	case Return:
		return p.parseReturnStatement()
	case Throw:
		return p.parseThrowStatement()
	case Break:
		return p.parseBreakStatement()
	case Continue:
		return p.parseContinueStatement()
	case OpenBrace:
		return p.parseBlock()
	case Export:
		return p.parseExportDeclaration()
	case Include:
		if p.peek(1).Type == OpenBrace {
			return p.parseNamedImport()
		}
		return p.parseExpression()
	default:
		return p.parseExpression()
	}
}

func (p *Parser) parseBlock() Stmt {
	openBrace := p.expect(OpenBrace, "Expected { to start block")
	body := []Stmt{}
	for p.notEof() && p.at().Type != CloseBrace {
		body = append(body, p.parseStatement())
		if p.at().Type == SemiColon {
			p.eat()
		}
	}
	p.expect(CloseBrace, "Expected } to end block")

	return &Program{
		BaseNode: BaseNode{Type: ProgramNode, Line: openBrace.Line, Column: openBrace.Column, File: p.filename, Source: p.source},
		Body:     body,
	}
}

func (p *Parser) parseReturnStatement() Stmt {
	retToken := p.eat()
	var value Expr
	if p.isStartOfExpression(p.at().Type) {
		value = p.parseExpression()
	}
	return &ReturnStatement{
		BaseNode: BaseNode{Type: ReturnStatementNode, Line: retToken.Line, Column: retToken.Column, File: p.filename, Source: p.source},
		Value:    value,
	}
}

func (p *Parser) parseWhileStatement() Stmt {
	whileToken := p.eat()
	hasParen := p.at().Type == OpenParen
	if hasParen {
		p.eat()
	}
	condition := p.parseExpression()
	if hasParen {
		p.expect(CloseParen, "Expected ) after condition")
	}

	bodyNode := p.parseStatement()
	var body []Stmt
	if prog, ok := bodyNode.(*Program); ok {
		body = prog.Body
	} else {
		body = []Stmt{bodyNode}
	}

	return &WhileStatement{
		BaseNode:  BaseNode{Type: WhileStatementNode, Line: whileToken.Line, Column: whileToken.Column, File: p.filename, Source: p.source},
		Condition: condition,
		Body:      body,
	}
}

func (p *Parser) parseForStatement() Stmt {
	forToken := p.eat()
	hasParen := p.at().Type == OpenParen
	if hasParen {
		p.eat()
	}

	isNovaStyle := p.at().Type == IdentifierToken && p.peek(1).Type == From

	if isNovaStyle {
		identifier := p.expect(IdentifierToken, "Expected identifier in for loop").Value
		p.expect(From, "Expected 'from' in for loop")
		start := p.parseExpression()
		p.expect(To, "Expected 'to' in for loop")
		end := p.parseExpression()
		if hasParen {
			p.expect(CloseParen, "Expected ) after for range")
		}

		bodyNode := p.parseStatement()
		var body []Stmt
		if prog, ok := bodyNode.(*Program); ok {
			body = prog.Body
		} else {
			body = []Stmt{bodyNode}
		}

		return &ForStatement{
			BaseNode: BaseNode{Type: ForStatementNode, Line: forToken.Line, Column: forToken.Column, File: p.filename, Source: p.source},
			Counter:  identifier,
			Start:    start,
			End:      end,
			Body:     body,
		}
	} else {
		var init Stmt
		if p.at().Type != SemiColon {
			init = p.parseStatement()
		}
		p.expect(SemiColon, "Expected ; after for init")

		var condition Expr
		if p.at().Type != SemiColon {
			condition = p.parseExpression()
		}
		p.expect(SemiColon, "Expected ; after for condition")

		var update Expr
		isClose := false
		if hasParen && p.at().Type == CloseParen {
			isClose = true
		}
		if !isClose {
			update = p.parseExpression()
		}

		if hasParen {
			p.expect(CloseParen, "Expected ) after for header")
		}

		bodyNode := p.parseStatement()
		var body []Stmt
		if prog, ok := bodyNode.(*Program); ok {
			body = prog.Body
		} else {
			body = []Stmt{bodyNode}
		}

		return &ForStatement{
			BaseNode:  BaseNode{Type: ForStatementNode, Line: forToken.Line, Column: forToken.Column, File: p.filename, Source: p.source},
			Init:      init,
			Condition: condition,
			Update:    update,
			Body:      body,
		}
	}
}

func (p *Parser) parseIfStatement() Stmt {
	ifToken := p.eat()
	hasParen := p.at().Type == OpenParen
	if hasParen {
		p.eat()
	}
	condition := p.parseExpression()
	if hasParen {
		p.expect(CloseParen, "Expected ) after condition")
	}

	thenNode := p.parseStatement()
	var thenBranch []Stmt
	if prog, ok := thenNode.(*Program); ok {
		thenBranch = prog.Body
	} else {
		thenBranch = []Stmt{thenNode}
	}

	var elseBranch []Stmt
	if p.at().Type == Else {
		p.eat()
		elseNode := p.parseStatement()
		if prog, ok := elseNode.(*Program); ok {
			elseBranch = prog.Body
		} else {
			elseBranch = []Stmt{elseNode}
		}
	}

	return &IfStatement{
		BaseNode:   BaseNode{Type: IfStatementNode, Line: ifToken.Line, Column: ifToken.Column, File: p.filename, Source: p.source},
		Condition:  condition,
		ThenBranch: thenBranch,
		ElseBranch: elseBranch,
	}
}

func (p *Parser) parseFunctionDeclaration() Stmt {
	isAsync := false
	if p.at().Type == Async {
		p.eat()
		isAsync = true
	}
	fnToken := p.expect(Fn, "Expected 'fn' keyword after 'async' (or alone)")
	name := p.expect(IdentifierToken, "Expected function name").Value
	p.expect(OpenParen, "Expected ( after function name")
	var args []string
	for p.at().Type == IdentifierToken {
		args = append(args, p.eat().Value)
		if p.at().Type == Comma {
			p.eat()
		}
	}
	p.expect(CloseParen, "Expected ) after function parameters")
	bodyNode := p.parseStatement()
	var body []Stmt
	if prog, ok := bodyNode.(*Program); ok {
		body = prog.Body
	} else {
		body = []Stmt{bodyNode}
	}

	return &FunctionDeclaration{
		BaseNode:   BaseNode{Type: FunctionDeclarationNode, Line: fnToken.Line, Column: fnToken.Column, File: p.filename, Source: p.source},
		Name:       name,
		Parameters: args,
		Body:       body,
		Async:      isAsync,
	}
}

func (p *Parser) parseSwitchStatement() Stmt {
	switchToken := p.eat()
	hasParen := p.at().Type == OpenParen
	if hasParen {
		p.eat()
	}
	discriminant := p.parseExpression()
	if hasParen {
		p.expect(CloseParen, "Expected ) after switch expression")
	}

	p.expect(OpenBrace, "Expected { to start switch block")
	var cases []CaseStatement
	var defaultBlock []Stmt

	for p.notEof() && p.at().Type != CloseBrace {
		if p.at().Type == Case {
			caseToken := p.eat()
			test := p.parseExpression()
			p.expect(OpenBrace, "Expected { after case value")
			var consequent []Stmt
			for p.at().Type != CloseBrace && p.notEof() {
				consequent = append(consequent, p.parseStatement())
			}
			p.expect(CloseBrace, "Expected } to end case block")
			cases = append(cases, CaseStatement{
				BaseNode:   BaseNode{Type: CaseStatementNode, Line: caseToken.Line, Column: caseToken.Column, File: p.filename, Source: p.source},
				Test:       test,
				Consequent: consequent,
			})
		} else if p.at().Type == Default {
			p.eat()
			p.expect(OpenBrace, "Expected { after default keyword")
			defaultBlock = []Stmt{}
			for p.at().Type != CloseBrace && p.notEof() {
				defaultBlock = append(defaultBlock, p.parseStatement())
			}
			p.expect(CloseBrace, "Expected } to end default block")
		} else {
			panic(fmt.Sprintf("Unexpected token in switch: %s", p.at().Value))
		}
	}
	p.expect(CloseBrace, "Expected } to end switch block")

	return &SwitchStatement{
		BaseNode:     BaseNode{Type: SwitchStatementNode, Line: switchToken.Line, Column: switchToken.Column, File: p.filename, Source: p.source},
		Discriminant: discriminant,
		Cases:        cases,
		Default:      defaultBlock,
	}
}

func (p *Parser) parseTryCatchStatement() Stmt {
	tryToken := p.eat()
	bodyNode := p.parseBlock()
	body := bodyNode.(*Program).Body

	var catchParameter string
	var catchBlock []Stmt
	var finallyBlock []Stmt

	if p.at().Type == Catch {
		p.eat()
		if p.at().Type == OpenParen {
			p.eat()
			catchParameter = p.expect(IdentifierToken, "Expected identifier for catch parameter").Value
			p.expect(CloseParen, "Expected ) after catch parameter")
		} else if p.at().Type == IdentifierToken {
			catchParameter = p.eat().Value
		}
		catchNode := p.parseBlock()
		catchBlock = catchNode.(*Program).Body
	}

	if p.at().Type == Finally {
		p.eat()
		finallyNode := p.parseBlock()
		finallyBlock = finallyNode.(*Program).Body
	}

	if len(catchBlock) == 0 && len(finallyBlock) == 0 {
		panic("Try statement must have a catch or finally block")
	}

	return &TryCatchStatement{
		BaseNode:       BaseNode{Type: TryCatchStatementNode, Line: tryToken.Line, Column: tryToken.Column, File: p.filename, Source: p.source},
		Body:           body,
		CatchParameter: catchParameter,
		CatchBlock:     catchBlock,
		FinallyBlock:   finallyBlock,
	}
}

func (p *Parser) parseThrowStatement() Stmt {
	throwToken := p.eat()
	argument := p.parseExpression()
	return &ThrowStatement{
		BaseNode: BaseNode{Type: ThrowStatementNode, Line: throwToken.Line, Column: throwToken.Column, File: p.filename, Source: p.source},
		Argument: argument,
	}
}

func (p *Parser) parseBreakStatement() Stmt {
	breakToken := p.eat()
	return &BreakStatement{
		BaseNode: BaseNode{Type: BreakStatementNode, Line: breakToken.Line, Column: breakToken.Column, File: p.filename, Source: p.source},
	}
}

func (p *Parser) parseContinueStatement() Stmt {
	continueToken := p.eat()
	return &ContinueStatement{
		BaseNode: BaseNode{Type: ContinueStatementNode, Line: continueToken.Line, Column: continueToken.Column, File: p.filename, Source: p.source},
	}
}

func (p *Parser) parseGlobalDeclaration() Stmt {
	tk := p.eat()
	identifier := p.expect(IdentifierToken, "Expected identifier name after 'global'.").Value
	if p.at().Type == Assign {
		p.eat()
		value := p.parseExpression()
		return &GlobalDeclaration{
			BaseNode:   BaseNode{Type: GlobalDeclarationNode, Line: tk.Line, Column: tk.Column, File: p.filename, Source: p.source},
			Constant:   false,
			Identifier: identifier,
			Value:      value,
		}
	}
	return &GlobalDeclaration{
		BaseNode:   BaseNode{Type: GlobalDeclarationNode, Line: tk.Line, Column: tk.Column, File: p.filename, Source: p.source},
		Constant:   false,
		Identifier: identifier,
		Value:      nil,
	}
}

func (p *Parser) parseVarDeclaration() Stmt {
	tk := p.eat()
	isConstant := tk.Type == Const
	identifier := p.expect(IdentifierToken, "Expected identifier name.").Value
	if p.at().Type == Assign {
		p.eat()
		value := p.parseExpression()
		return &VarDeclaration{
			BaseNode:   BaseNode{Type: VarDeclarationNode, Line: tk.Line, Column: tk.Column, File: p.filename, Source: p.source},
			Constant:   isConstant,
			Identifier: identifier,
			Value:      value,
		}
	}
	if isConstant {
		panic("Must assign value to constant.")
	}
	return &VarDeclaration{
		BaseNode:   BaseNode{Type: VarDeclarationNode, Line: tk.Line, Column: tk.Column, File: p.filename, Source: p.source},
		Constant:   false,
		Identifier: identifier,
		Value:      nil,
	}
}

func (p *Parser) parseExpression() Expr {
	return p.parseAssignmentExpr()
}

func (p *Parser) parseAssignmentExpr() Expr {
	left := p.parseNullCoalesceExpr()
	if p.at().Type == Assign || p.at().Type == PlusEquals || p.at().Type == MinusEquals {
		opToken := p.eat()
		value := p.parseAssignmentExpr()

		if opToken.Type == PlusEquals || opToken.Type == MinusEquals {
			op := "+"
			if opToken.Type == MinusEquals {
				op = "-"
			}
			binary := &BinaryExpr{
				BaseNode: BaseNode{Type: BinaryExprNode, Line: opToken.Line, Column: opToken.Column, File: p.filename, Source: p.source},
				Left:     left,
				Right:    value,
				Operator: op,
			}
			return &AssignmentExpr{
				BaseNode: BaseNode{Type: AssignmentExprNode, Line: left.GetLine(), Column: left.GetColumn(), File: p.filename, Source: p.source},
				Assignee: left,
				Value:    binary,
			}
		}

		return &AssignmentExpr{
			BaseNode: BaseNode{Type: AssignmentExprNode, Line: left.GetLine(), Column: left.GetColumn(), File: p.filename, Source: p.source},
			Assignee: left,
			Value:    value,
		}
	}
	return left
}

func (p *Parser) parseNullCoalesceExpr() Expr {
	left := p.parseObjectExpr()
	for p.at().Type == NullCoalesce {
		opToken := p.eat()
		right := p.parseObjectExpr()
		left = &BinaryExpr{
			BaseNode: BaseNode{Type: BinaryExprNode, Line: opToken.Line, Column: opToken.Column, File: p.filename, Source: p.source},
			Left:     left,
			Right:    right,
			Operator: "??",
		}
	}
	return left
}

func (p *Parser) parseObjectExpr() Expr {
	if p.at().Type != OpenBrace {
		return p.parseLogicalOrExpr()
	}
	openBrace := p.eat()
	var properties []Property

	for p.notEof() && p.at().Type != CloseBrace {
		keyToken := p.eat()
		if keyToken.Type != IdentifierToken && keyToken.Type != StringToken {
			panic("Object key must be identifier or string")
		}
		key := keyToken.Value

		if p.at().Type != Colon && p.at().Type != Assign {
			panic("Expected : or = after object key")
		}
		p.eat()

		value := p.parseExpression()
		properties = append(properties, Property{
			BaseNode: BaseNode{Type: PropertyNode, Line: keyToken.Line, Column: keyToken.Column, File: p.filename, Source: p.source},
			Key:      key,
			Value:    value,
		})

		if p.at().Type == Comma {
			p.eat()
		}
	}
	p.expect(CloseBrace, "Object literal missing closing brace.")
	return &ObjectLiteral{
		BaseNode:   BaseNode{Type: ObjectLiteralNode, Line: openBrace.Line, Column: openBrace.Column, File: p.filename, Source: p.source},
		Properties: properties,
	}
}

func (p *Parser) parseLogicalOrExpr() Expr {
	left := p.parseLogicalAndExpr()
	for p.at().Type == Or || p.at().Type == OrLogic {
		opToken := p.eat()
		opVal := opToken.Value
		if opVal == "" {
			opVal = "||"
		}
		right := p.parseLogicalAndExpr()
		left = &BinaryExpr{
			BaseNode: BaseNode{Type: BinaryExprNode, Line: opToken.Line, Column: opToken.Column, File: p.filename, Source: p.source},
			Left:     left,
			Right:    right,
			Operator: opVal,
		}
	}
	return left
}

func (p *Parser) parseLogicalAndExpr() Expr {
	left := p.parseBitwiseOrExpr()
	for p.at().Type == And || p.at().Type == AndLogic {
		opToken := p.eat()
		opVal := opToken.Value
		if opVal == "" {
			opVal = "&&"
		}
		right := p.parseBitwiseOrExpr()
		left = &BinaryExpr{
			BaseNode: BaseNode{Type: BinaryExprNode, Line: opToken.Line, Column: opToken.Column, File: p.filename, Source: p.source},
			Left:     left,
			Right:    right,
			Operator: opVal,
		}
	}
	return left
}

func (p *Parser) parseBitwiseOrExpr() Expr {
	left := p.parseBitwiseXorExpr()
	for p.at().Type == Pipe {
		opToken := p.eat()
		right := p.parseBitwiseXorExpr()
		left = &BinaryExpr{
			BaseNode: BaseNode{Type: BinaryExprNode, Line: opToken.Line, Column: opToken.Column, File: p.filename, Source: p.source},
			Left:     left,
			Right:    right,
			Operator: "|",
		}
	}
	return left
}

func (p *Parser) parseBitwiseXorExpr() Expr {
	left := p.parseBitwiseAndExpr()
	for p.at().Type == Caret {
		opToken := p.eat()
		right := p.parseBitwiseAndExpr()
		left = &BinaryExpr{
			BaseNode: BaseNode{Type: BinaryExprNode, Line: opToken.Line, Column: opToken.Column, File: p.filename, Source: p.source},
			Left:     left,
			Right:    right,
			Operator: "^",
		}
	}
	return left
}

func (p *Parser) parseBitwiseAndExpr() Expr {
	left := p.parseEqualityExpr()
	for p.at().Type == Ampersand {
		opToken := p.eat()
		right := p.parseEqualityExpr()
		left = &BinaryExpr{
			BaseNode: BaseNode{Type: BinaryExprNode, Line: opToken.Line, Column: opToken.Column, File: p.filename, Source: p.source},
			Left:     left,
			Right:    right,
			Operator: "&",
		}
	}
	return left
}

func (p *Parser) parseEqualityExpr() Expr {
	left := p.parseRelationalExpr()
	for p.at().Type == Is || p.at().Type == Isnt || p.at().Type == Equals || p.at().Type == NotEquals {
		opToken := p.eat()
		right := p.parseRelationalExpr()
		left = &BinaryExpr{
			BaseNode: BaseNode{Type: BinaryExprNode, Line: opToken.Line, Column: opToken.Column, File: p.filename, Source: p.source},
			Left:     left,
			Right:    right,
			Operator: opToken.Value,
		}
	}
	return left
}

func (p *Parser) parseRelationalExpr() Expr {
	left := p.parseShiftExpr()
	for p.at().Type == LessThan || p.at().Type == GreaterThan || p.at().Type == LessEquals || p.at().Type == GreaterEquals {
		opToken := p.eat()
		right := p.parseShiftExpr()
		left = &BinaryExpr{
			BaseNode: BaseNode{Type: BinaryExprNode, Line: opToken.Line, Column: opToken.Column, File: p.filename, Source: p.source},
			Left:     left,
			Right:    right,
			Operator: opToken.Value,
		}
	}
	return left
}

func (p *Parser) parseShiftExpr() Expr {
	left := p.parseAdditiveExpr()
	for p.at().Type == ShiftLeft || p.at().Type == ShiftRight {
		opToken := p.eat()
		right := p.parseAdditiveExpr()
		left = &BinaryExpr{
			BaseNode: BaseNode{Type: BinaryExprNode, Line: opToken.Line, Column: opToken.Column, File: p.filename, Source: p.source},
			Left:     left,
			Right:    right,
			Operator: opToken.Value,
		}
	}
	return left
}

func (p *Parser) parseAdditiveExpr() Expr {
	left := p.parseMultiplicativeExpr()
	for p.at().Type == Plus || p.at().Type == Minus {
		opToken := p.eat()
		right := p.parseMultiplicativeExpr()
		left = &BinaryExpr{
			BaseNode: BaseNode{Type: BinaryExprNode, Line: opToken.Line, Column: opToken.Column, File: p.filename, Source: p.source},
			Left:     left,
			Right:    right,
			Operator: opToken.Value,
		}
	}
	return left
}

func (p *Parser) parseMultiplicativeExpr() Expr {
	left := p.parsePowerExpr()
	for p.at().Type == Times || p.at().Type == Slash || p.at().Type == Percent {
		opToken := p.eat()
		right := p.parsePowerExpr()
		left = &BinaryExpr{
			BaseNode: BaseNode{Type: BinaryExprNode, Line: opToken.Line, Column: opToken.Column, File: p.filename, Source: p.source},
			Left:     left,
			Right:    right,
			Operator: opToken.Value,
		}
	}
	return left
}

func (p *Parser) parsePowerExpr() Expr {
	left := p.parseUnaryExpr()
	for p.at().Type == Power {
		opToken := p.eat()
		right := p.parsePowerExpr()
		left = &BinaryExpr{
			BaseNode: BaseNode{Type: BinaryExprNode, Line: opToken.Line, Column: opToken.Column, File: p.filename, Source: p.source},
			Left:     left,
			Right:    right,
			Operator: "**",
		}
	}
	return left
}

func (p *Parser) parseUnaryExpr() Expr {
	if p.at().Type == Minus || p.at().Type == Not || p.at().Type == NotLogic {
		opToken := p.eat()
		arg := p.parseUnaryExpr()
		opVal := opToken.Value
		if opVal == "" {
			opVal = "not"
		}
		return &BinaryExpr{
			BaseNode: BaseNode{Type: BinaryExprNode, Line: opToken.Line, Column: opToken.Column, File: p.filename, Source: p.source},
			Left:     arg,
			Right:    &NumericLiteral{BaseNode: BaseNode{Type: NumericLiteralNode}, Value: 0},
			Operator: "unary_" + opVal,
		}
	}
	if p.at().Type == Await {
		awaitToken := p.eat()
		arg := p.parseUnaryExpr()
		return &AwaitExpr{
			BaseNode: BaseNode{Type: AwaitExprNode, Line: awaitToken.Line, Column: awaitToken.Column, File: p.filename, Source: p.source},
			Argument: arg,
		}
	}
	return p.parseCallMemberExpr()
}

func (p *Parser) parseCallMemberExpr() Expr {
	object := p.parsePrimaryExpr()

	for p.at().Type == OpenParen || p.at().Type == Dot || p.at().Type == OpenBracket || p.at().Type == OptionalChain {
		if p.at().Type == OpenParen {
			object = p.parseCallExpr(object)
		} else {
			object = p.parseMemberExprStep(object)
		}
	}
	return object
}

func (p *Parser) parseCallExpr(caller Expr) Expr {
	openParen := p.eat()
	var args []Expr
	if p.at().Type != CloseParen {
		args = p.parseArgumentsList()
	}
	p.expect(CloseParen, "Missing closing parenthesis in call expression.")
	return &CallExpr{
		BaseNode: BaseNode{Type: CallExprNode, Line: openParen.Line, Column: openParen.Column, File: p.filename, Source: p.source},
		Caller:   caller,
		Args:     args,
	}
}

func (p *Parser) parseArgumentsList() []Expr {
	args := []Expr{p.parseExpression()}
	for p.at().Type == Comma {
		p.eat()
		args = append(args, p.parseExpression())
	}
	return args
}

func (p *Parser) parseMemberExprStep(object Expr) Expr {
	operator := p.eat()
	var property Expr
	computed := false
	optional := operator.Type == OptionalChain

	if operator.Type == Dot || operator.Type == OptionalChain {
		computed = false
		property = p.parsePrimaryExpr()
		if property.Kind() != IdentifierNode {
			panic("Cannot use dot operator without identifier.")
		}
	} else {
		computed = true
		property = p.parseExpression()
		p.expect(CloseBracket, "Missing closing bracket in computed property.")
	}

	return &MemberExpr{
		BaseNode: BaseNode{Type: MemberExprNode, Line: operator.Line, Column: operator.Column, File: p.filename, Source: p.source},
		Object:   object,
		Property: property,
		Computed: computed,
		Optional: optional,
	}
}

func (p *Parser) parseArrayExpr() Expr {
	openBracket := p.eat()
	var elements []Expr
	for p.at().Type != CloseBracket && p.notEof() {
		elements = append(elements, p.parseExpression())
		if p.at().Type == Comma {
			p.eat()
		}
	}
	p.expect(CloseBracket, "Expected ] after array literal.")
	return &ArrayLiteral{
		BaseNode: BaseNode{Type: ArrayLiteralNode, Line: openBracket.Line, Column: openBracket.Column, File: p.filename, Source: p.source},
		Elements: elements,
	}
}

func (p *Parser) parsePrimaryExpr() Expr {
	tk := p.at()
	switch tk.Type {
	case IdentifierToken:
		if p.peek(1).Type == Arrow {
			param := p.eat().Value
			p.eat()
			var body []Stmt
			if p.at().Type == OpenBrace {
				prog := p.parseBlock().(*Program)
				body = prog.Body
			} else {
				expr := p.parseExpression()
				body = []Stmt{&ReturnStatement{
					BaseNode: BaseNode{Type: ReturnStatementNode, Line: expr.GetLine(), Column: expr.GetColumn(), File: p.filename, Source: p.source},
					Value:    expr,
				}}
			}
			return &ArrowFnExpr{
				BaseNode:   BaseNode{Type: ArrowFnExprNode, Line: tk.Line, Column: tk.Column, File: p.filename, Source: p.source},
				Parameters: []string{param},
				Body:       body,
				Async:      false,
			}
		}
		return &Identifier{
			BaseNode: BaseNode{Type: IdentifierNode, Line: tk.Line, Column: tk.Column, File: p.filename, Source: p.source},
			Symbol:   p.eat().Value,
		}
	case Number:
		val, _ := strconv.ParseFloat(p.eat().Value, 64)
		return &NumericLiteral{
			BaseNode: BaseNode{Type: NumericLiteralNode, Line: tk.Line, Column: tk.Column, File: p.filename, Source: p.source},
			Value:    val,
		}
	case StringToken:
		return &StringLiteral{
			BaseNode: BaseNode{Type: StringLiteralNode, Line: tk.Line, Column: tk.Column, File: p.filename, Source: p.source},
			Value:    p.eat().Value,
		}
	case Include:
		includeToken := p.eat()
		p.expect(OpenParen, "Expected ( after include keyword.")
		moduleExpr := p.parseExpression()
		p.expect(CloseParen, "Expected ) after module name in include().")
		return &ImportExpr{
			BaseNode:   BaseNode{Type: ImportExprNode, Line: includeToken.Line, Column: includeToken.Column, File: p.filename, Source: p.source},
			ModuleName: moduleExpr,
		}
	case OpenParen:
		i := 1
		for p.peek(i).Type != EOF && p.peek(i).Type != CloseParen {
			i++
		}
		if p.peek(i).Type == CloseParen && p.peek(i+1).Type == Arrow {
			p.eat()
			var params []string
			for p.at().Type != CloseParen {
				params = append(params, p.expect(IdentifierToken, "Expected identifier in arrow function parameters").Value)
				if p.at().Type == Comma {
					p.eat()
				}
			}
			p.eat()
			p.eat()
			var body []Stmt
			if p.at().Type == OpenBrace {
				prog := p.parseBlock().(*Program)
				body = prog.Body
			} else {
				expr := p.parseExpression()
				body = []Stmt{&ReturnStatement{
					BaseNode: BaseNode{Type: ReturnStatementNode, Line: expr.GetLine(), Column: expr.GetColumn(), File: p.filename, Source: p.source},
					Value:    expr,
				}}
			}
			return &ArrowFnExpr{
				BaseNode:   BaseNode{Type: ArrowFnExprNode, Line: tk.Line, Column: tk.Column, File: p.filename, Source: p.source},
				Parameters: params,
				Body:       body,
				Async:      false,
			}
		}

		p.eat()
		value := p.parseExpression()
		p.expect(CloseParen, "Expected closing parenthesis.")
		return value
	case OpenBracket:
		return p.parseArrayExpr()
	case OpenBrace:
		return p.parseObjectExpr()
	case Async:
		if p.peek(1).Type == Fn {
			return p.parseAnonymousFunction(true)
		}
		panic(fmt.Sprintf("Unexpected token found: %s", tk.Value))
	case Fn:
		return p.parseAnonymousFunction(false)
	default:
		panic(fmt.Sprintf("Unexpected token found: %s", tk.Value))
	}
}

func (p *Parser) parseExportDeclaration() Stmt {
	exportToken := p.eat()
	declaration := p.parseStatement()
	if declaration.Kind() != VarDeclarationNode && declaration.Kind() != FunctionDeclarationNode {
		panic("Only variables and functions can be exported directly.")
	}
	return &ExportDeclaration{
		BaseNode:    BaseNode{Type: ExportDeclarationNode, Line: exportToken.Line, Column: exportToken.Column, File: p.filename, Source: p.source},
		Declaration: declaration,
	}
}

func (p *Parser) parseNamedImport() Stmt {
	importToken := p.eat()
	p.expect(OpenBrace, "Expected { for named imports.")

	var imports []string
	for p.at().Type != CloseBrace && p.notEof() {
		id := p.expect(IdentifierToken, "Expected identifier in named import").Value
		imports = append(imports, id)
		if p.at().Type == Comma {
			p.eat()
		}
	}
	p.expect(CloseBrace, "Expected } after named imports.")
	p.expect(From, "Expected 'from' after named imports.")
	moduleStr := p.expect(StringToken, "Expected module string after 'from'.").Value

	return &NamedImportStatement{
		BaseNode:   BaseNode{Type: NamedImportStatementNode, Line: importToken.Line, Column: importToken.Column, File: p.filename, Source: p.source},
		Imports:    imports,
		ModuleName: moduleStr,
	}
}

func (p *Parser) isStartOfExpression(t TokenType) bool {
	return t == IdentifierToken || t == Number || t == StringToken ||
		t == OpenParen || t == OpenBrace || t == OpenBracket ||
		t == Minus || t == Not || t == NotLogic ||
		t == Include || t == Await || t == Fn || t == Async
}

func (p *Parser) parseAnonymousFunction(isAsync bool) Expr {
	if isAsync {
		p.eat()
	}
	fnToken := p.eat()
	name := "anonymous"
	if p.at().Type == IdentifierToken {
		name = p.eat().Value
	}
	p.expect(OpenParen, "Expected ( after function name")
	var args []string
	for p.at().Type != CloseParen && p.notEof() {
		args = append(args, p.expect(IdentifierToken, "Expected identifier in parameters").Value)
		if p.at().Type == Comma {
			p.eat()
		}
	}
	p.expect(CloseParen, "Expected ) after function parameters")
	bodyNode := p.parseStatement()
	var body []Stmt
	if prog, ok := bodyNode.(*Program); ok {
		body = prog.Body
	} else {
		body = []Stmt{bodyNode}
	}
	return &FunctionDeclaration{
		BaseNode:   BaseNode{Type: FunctionDeclarationNode, Line: fnToken.Line, Column: fnToken.Column, File: p.filename, Source: p.source},
		Name:       name,
		Parameters: args,
		Body:       body,
		Async:      isAsync,
	}
}
