"use strict";
// src/frontend/parser.ts
Object.defineProperty(exports, "__esModule", { value: true });
const lexer_1 = require("./lexer");
const errors_1 = require("../runtime/errors");
class Parser {
    constructor() {
        this.tokens = [];
        this.filename = "repl";
        this.source = "";
    }
    not_eof() {
        return this.tokens[0].type !== lexer_1.TokenType.EOF;
    }
    at() {
        return this.tokens[0];
    }
    peek(offset = 0) {
        return (this.tokens[offset] || { type: lexer_1.TokenType.EOF, value: "EOF" });
    }
    eat() {
        return this.tokens.shift();
    }
    getLocation(token) {
        return {
            file: this.filename,
            line: token.line,
            column: token.column,
            source: this.source
        };
    }
    expect(type, err) {
        const prev = this.tokens.shift();
        if (!prev || prev.type !== type) {
            throw new errors_1.NovaSyntaxError(`${err}. Expected ${lexer_1.TokenType[type]} but found ${prev ? lexer_1.TokenType[prev.type] : "EOF"} ('${prev?.value}')`, this.getLocation(prev || { line: 0, column: 0, type: lexer_1.TokenType.EOF, value: "" }));
        }
        return prev;
    }
    produceAST(sourceCode, filename = "repl") {
        this.source = sourceCode;
        this.filename = filename;
        this.tokens = (0, lexer_1.tokenize)(sourceCode);
        const program = {
            kind: "Program",
            body: [],
            line: 1,
            column: 1,
            file: filename
        };
        while (this.not_eof()) {
            program.body.push(this.parse_statement());
        }
        this.attach_file(program);
        return program;
    }
    attach_file(node) {
        if (!node || typeof node !== "object")
            return;
        if (node.kind && !node.file)
            node.file = this.filename;
        for (const key in node) {
            if (Array.isArray(node[key])) {
                for (const child of node[key])
                    this.attach_file(child);
            }
            else if (typeof node[key] === "object") {
                this.attach_file(node[key]);
            }
        }
    }
    parse_statement() {
        switch (this.at().type) {
            case lexer_1.TokenType.Let:
            case lexer_1.TokenType.Const:
                return this.parse_var_declaration();
            case lexer_1.TokenType.Global:
                return this.parse_global_declaration();
            case lexer_1.TokenType.Async:
            case lexer_1.TokenType.Fn:
                return this.parse_function_declaration();
            case lexer_1.TokenType.If:
                return this.parse_if_statement();
            case lexer_1.TokenType.While:
                return this.parse_while_statement();
            case lexer_1.TokenType.For:
                return this.parse_for_statement();
            case lexer_1.TokenType.Switch:
                return this.parse_switch_statement();
            case lexer_1.TokenType.Try:
                return this.parse_try_catch_statement();
            case lexer_1.TokenType.Return:
                return this.parse_return_statement();
            case lexer_1.TokenType.Throw:
                return this.parse_throw_statement();
            case lexer_1.TokenType.Break:
                return this.parse_break_statement();
            case lexer_1.TokenType.Continue:
                return this.parse_continue_statement();
            case lexer_1.TokenType.OpenBrace:
                return this.parse_block();
            case lexer_1.TokenType.Export:
                return this.parse_export_declaration();
            case lexer_1.TokenType.Include:
                // Handle include as statement if at statement level (import "mod" form)
                if (this.peek(1).type === lexer_1.TokenType.OpenBrace) {
                    return this.parse_named_import();
                }
            // fallthrough to expression
            default:
                return this.parse_expression();
        }
    }
    parse_block() {
        const openBrace = this.expect(lexer_1.TokenType.OpenBrace, "Expected { to start block");
        const body = [];
        while (this.at().type !== lexer_1.TokenType.CloseBrace && this.not_eof()) {
            body.push(this.parse_statement());
        }
        this.expect(lexer_1.TokenType.CloseBrace, "Expected } to end block");
        return { kind: "Program", body, line: openBrace.line, column: openBrace.column };
    }
    parse_return_statement() {
        const returnToken = this.eat();
        const value = this.is_start_of_expression(this.at().type) ? this.parse_expression() : undefined;
        return { kind: "ReturnStatement", value, line: returnToken.line, column: returnToken.column };
    }
    parse_while_statement() {
        const whileToken = this.eat();
        const hasParen = this.at().type === lexer_1.TokenType.OpenParen;
        if (hasParen)
            this.eat();
        const condition = this.parse_expression();
        if (hasParen)
            this.expect(lexer_1.TokenType.CloseParen, "Expected ) after condition");
        const bodyNode = this.parse_statement();
        const body = bodyNode.kind === "Program" ? bodyNode.body : [bodyNode];
        return { kind: "WhileStatement", condition, body, line: whileToken.line, column: whileToken.column };
    }
    parse_for_statement() {
        const forToken = this.eat();
        const hasParen = this.at().type === lexer_1.TokenType.OpenParen;
        if (hasParen)
            this.eat();
        // Determine style: Nova-style "for i from 0 to 10" vs JS-style "for (let i=0; i<10; i++)"
        const isNovaStyle = this.at().type === lexer_1.TokenType.Identifier && this.peek(1).type === lexer_1.TokenType.From;
        if (isNovaStyle) {
            const identifier = this.expect(lexer_1.TokenType.Identifier, "Expected identifier in for loop").value;
            this.expect(lexer_1.TokenType.From, "Expected 'from' in for loop");
            const start = this.parse_expression();
            this.expect(lexer_1.TokenType.To, "Expected 'to' in for loop");
            const end = this.parse_expression();
            if (hasParen)
                this.expect(lexer_1.TokenType.CloseParen, "Expected ) after for range");
            const bodyNode = this.parse_statement();
            const body = bodyNode.kind === "Program" ? bodyNode.body : [bodyNode];
            return { kind: "ForStatement", counter: identifier, start, end, body, line: forToken.line, column: forToken.column };
        }
        else {
            // JS-style: for (init; condition; update)
            const init = this.at().type === lexer_1.TokenType.SemiColon ? undefined : this.parse_statement();
            this.expect(lexer_1.TokenType.SemiColon, "Expected ; after for init");
            const condition = this.at().type === lexer_1.TokenType.SemiColon ? undefined : this.parse_expression();
            this.expect(lexer_1.TokenType.SemiColon, "Expected ; after for condition");
            const update = (hasParen ? this.at().type === lexer_1.TokenType.CloseParen : false) ? undefined : this.parse_expression();
            if (hasParen)
                this.expect(lexer_1.TokenType.CloseParen, "Expected ) after for header");
            const bodyNode = this.parse_statement();
            const body = bodyNode.kind === "Program" ? bodyNode.body : [bodyNode];
            return { kind: "ForStatement", init, condition, update, body, line: forToken.line, column: forToken.column };
        }
    }
    parse_if_statement() {
        const ifToken = this.eat();
        const hasParen = this.at().type === lexer_1.TokenType.OpenParen;
        if (hasParen)
            this.eat();
        const condition = this.parse_expression();
        if (hasParen)
            this.expect(lexer_1.TokenType.CloseParen, "Expected ) after condition");
        const thenNode = this.parse_statement();
        const thenBranch = thenNode.kind === "Program" ? thenNode.body : [thenNode];
        let elseBranch = undefined;
        if (this.at().type === lexer_1.TokenType.Else) {
            this.eat();
            const elseNode = this.parse_statement();
            elseBranch = elseNode.kind === "Program" ? elseNode.body : [elseNode];
        }
        return { kind: "IfStatement", condition, thenBranch, elseBranch, line: ifToken.line, column: ifToken.column };
    }
    parse_function_declaration() {
        let isAsync = false;
        if (this.at().type === lexer_1.TokenType.Async) {
            this.eat();
            isAsync = true;
        }
        const fnToken = this.expect(lexer_1.TokenType.Fn, "Expected 'fn' keyword after 'async' (or alone)");
        const name = this.expect(lexer_1.TokenType.Identifier, "Expected function name").value;
        this.expect(lexer_1.TokenType.OpenParen, "Expected ( after function name");
        const args = [];
        while (this.at().type === lexer_1.TokenType.Identifier) {
            args.push(this.eat().value);
            if (this.at().type === lexer_1.TokenType.Comma)
                this.eat();
        }
        this.expect(lexer_1.TokenType.CloseParen, "Expected ) after function parameters");
        const bodyNode = this.parse_statement();
        const body = bodyNode.kind === "Program" ? bodyNode.body : [bodyNode];
        return { kind: "FunctionDeclaration", name, parameters: args, body, async: isAsync, line: fnToken.line, column: fnToken.column };
    }
    parse_switch_statement() {
        const switchToken = this.eat();
        const hasParen = this.at().type === lexer_1.TokenType.OpenParen;
        if (hasParen)
            this.eat();
        const discriminant = this.parse_expression();
        if (hasParen)
            this.expect(lexer_1.TokenType.CloseParen, "Expected ) after switch expression");
        this.expect(lexer_1.TokenType.OpenBrace, "Expected { to start switch block");
        const cases = [];
        let defaultBlock = undefined;
        while (this.not_eof() && this.at().type !== lexer_1.TokenType.CloseBrace) {
            if (this.at().type === lexer_1.TokenType.Case) {
                const caseToken = this.eat();
                const test = this.parse_expression();
                this.expect(lexer_1.TokenType.OpenBrace, "Expected { after case value");
                const consequent = [];
                while (this.at().type !== lexer_1.TokenType.CloseBrace && this.not_eof()) {
                    consequent.push(this.parse_statement());
                }
                this.expect(lexer_1.TokenType.CloseBrace, "Expected } to end case block");
                cases.push({ kind: "CaseStatement", test, consequent, line: caseToken.line, column: caseToken.column });
            }
            else if (this.at().type === lexer_1.TokenType.Default) {
                this.eat();
                this.expect(lexer_1.TokenType.OpenBrace, "Expected { after default keyword");
                defaultBlock = [];
                while (this.at().type !== lexer_1.TokenType.CloseBrace && this.not_eof()) {
                    defaultBlock.push(this.parse_statement());
                }
                this.expect(lexer_1.TokenType.CloseBrace, "Expected } to end default block");
            }
            else {
                throw new errors_1.NovaSyntaxError(`Unexpected token in switch: ${this.at().value}`, this.getLocation(this.at()));
            }
        }
        this.expect(lexer_1.TokenType.CloseBrace, "Expected } to end switch block");
        return { kind: "SwitchStatement", discriminant, cases, default: defaultBlock, line: switchToken.line, column: switchToken.column };
    }
    parse_try_catch_statement() {
        const tryToken = this.eat();
        const bodyNode = this.parse_block();
        const body = bodyNode.body;
        let catchParameter = undefined;
        let catchBlock = [];
        let finallyBlock = undefined;
        if (this.at().type === lexer_1.TokenType.Catch) {
            this.eat();
            if (this.at().type === lexer_1.TokenType.OpenParen) {
                this.eat();
                catchParameter = this.expect(lexer_1.TokenType.Identifier, "Expected identifier for catch parameter").value;
                this.expect(lexer_1.TokenType.CloseParen, "Expected ) after catch parameter");
            }
            else if (this.at().type === lexer_1.TokenType.Identifier) {
                catchParameter = this.eat().value;
            }
            const catchNode = this.parse_block();
            catchBlock = catchNode.body;
        }
        if (this.at().type === lexer_1.TokenType.Finally) {
            this.eat();
            const finallyNode = this.parse_block();
            finallyBlock = finallyNode.body;
        }
        if (catchBlock.length === 0 && !finallyBlock) {
            throw new errors_1.NovaSyntaxError("Try statement must have a catch or finally block", this.getLocation(tryToken));
        }
        return { kind: "TryCatchStatement", body, catchParameter, catchBlock, finallyBlock, line: tryToken.line, column: tryToken.column };
    }
    parse_throw_statement() {
        const throwToken = this.eat();
        const argument = this.parse_expression();
        return { kind: "ThrowStatement", argument, line: throwToken.line, column: throwToken.column };
    }
    parse_break_statement() {
        const breakToken = this.eat();
        return { kind: "BreakStatement", line: breakToken.line, column: breakToken.column };
    }
    parse_continue_statement() {
        const continueToken = this.eat();
        return { kind: "ContinueStatement", line: continueToken.line, column: continueToken.column };
    }
    parse_global_declaration() {
        const tk = this.eat(); // consume 'global'
        const isConstant = false; // global const uses 'const global' — for now always mutable
        const identifier = this.expect(lexer_1.TokenType.Identifier, "Expected identifier name after 'global'.").value;
        if (this.at().type === lexer_1.TokenType.Assign) {
            this.eat();
            const value = this.parse_expression();
            return { kind: "GlobalDeclaration", constant: isConstant, identifier, value, line: tk.line, column: tk.column };
        }
        return { kind: "GlobalDeclaration", constant: false, identifier, value: undefined, line: tk.line, column: tk.column };
    }
    parse_var_declaration() {
        const tk = this.eat();
        const isConstant = tk.type === lexer_1.TokenType.Const;
        const identifier = this.expect(lexer_1.TokenType.Identifier, "Expected identifier name.").value;
        if (this.at().type === lexer_1.TokenType.Assign) {
            this.eat();
            const value = this.parse_expression();
            return { kind: "VarDeclaration", constant: isConstant, identifier, value, line: tk.line, column: tk.column };
        }
        if (isConstant)
            throw new errors_1.NovaSyntaxError("Must assign value to constant.", this.getLocation(this.at()));
        return { kind: "VarDeclaration", constant: false, identifier, value: undefined, line: tk.line, column: tk.column };
    }
    parse_expression() {
        return this.parse_assignment_expr();
    }
    parse_assignment_expr() {
        const left = this.parse_null_coalesce_expr();
        if (this.at().type === lexer_1.TokenType.Assign || this.at().type === lexer_1.TokenType.PlusEquals || this.at().type === lexer_1.TokenType.MinusEquals) {
            const opToken = this.eat();
            const value = this.parse_assignment_expr();
            if (opToken.type === lexer_1.TokenType.PlusEquals || opToken.type === lexer_1.TokenType.MinusEquals) {
                // Desugar += and -= to BinaryExpr
                const op = opToken.type === lexer_1.TokenType.PlusEquals ? "+" : "-";
                const binary = { kind: "BinaryExpr", left, right: value, operator: op, line: opToken.line, column: opToken.column };
                return { kind: "AssignmentExpr", assignee: left, value: binary, line: left.line, column: left.column };
            }
            return { kind: "AssignmentExpr", assignee: left, value, line: left.line, column: left.column };
        }
        return left;
    }
    parse_null_coalesce_expr() {
        let left = this.parse_object_expr();
        while (this.at().type === lexer_1.TokenType.NullCoalesce) {
            const opToken = this.eat();
            const right = this.parse_object_expr();
            left = { kind: "BinaryExpr", left, right, operator: "??", line: opToken.line, column: opToken.column };
        }
        return left;
    }
    parse_object_expr() {
        if (this.at().type !== lexer_1.TokenType.OpenBrace)
            return this.parse_logical_or_expr();
        const openBrace = this.eat(); // {
        const properties = [];
        while (this.not_eof() && this.at().type !== lexer_1.TokenType.CloseBrace) {
            // Key can be Identifier or String
            const keyToken = this.eat();
            if (keyToken.type !== lexer_1.TokenType.Identifier && keyToken.type !== lexer_1.TokenType.String) {
                throw new errors_1.NovaSyntaxError("Object key must be identifier or string", this.getLocation(keyToken));
            }
            const key = keyToken.value;
            // Support ':' or '=' separator
            if (this.at().type !== lexer_1.TokenType.Colon && this.at().type !== lexer_1.TokenType.Assign) {
                throw new errors_1.NovaSyntaxError("Expected : or = after object key", this.getLocation(this.at()));
            }
            this.eat(); // consume : or =
            const value = this.parse_expression();
            properties.push({ kind: "Property", key, value, line: keyToken.line, column: keyToken.column });
            if (this.at().type === lexer_1.TokenType.Comma) {
                this.eat();
            }
        }
        this.expect(lexer_1.TokenType.CloseBrace, "Object literal missing closing brace.");
        return { kind: "ObjectLiteral", properties, line: openBrace.line, column: openBrace.column };
    }
    parse_logical_or_expr() {
        let left = this.parse_logical_and_expr();
        while (this.at().type === lexer_1.TokenType.Or || this.at().type === lexer_1.TokenType.OrLogic) {
            const opToken = this.eat();
            const right = this.parse_logical_and_expr();
            left = { kind: "BinaryExpr", left, right, operator: opToken.value || "||", line: opToken.line, column: opToken.column };
        }
        return left;
    }
    parse_logical_and_expr() {
        let left = this.parse_bitwise_or_expr();
        while (this.at().type === lexer_1.TokenType.And || this.at().type === lexer_1.TokenType.AndLogic) {
            const opToken = this.eat();
            const right = this.parse_bitwise_or_expr();
            left = { kind: "BinaryExpr", left, right, operator: opToken.value || "&&", line: opToken.line, column: opToken.column };
        }
        return left;
    }
    parse_bitwise_or_expr() {
        let left = this.parse_bitwise_xor_expr();
        while (this.at().type === lexer_1.TokenType.Pipe) {
            const opToken = this.eat();
            const right = this.parse_bitwise_xor_expr();
            left = { kind: "BinaryExpr", left, right, operator: "|", line: opToken.line, column: opToken.column };
        }
        return left;
    }
    parse_bitwise_xor_expr() {
        let left = this.parse_bitwise_and_expr();
        while (this.at().type === lexer_1.TokenType.Caret) {
            const opToken = this.eat();
            const right = this.parse_bitwise_and_expr();
            left = { kind: "BinaryExpr", left, right, operator: "^", line: opToken.line, column: opToken.column };
        }
        return left;
    }
    parse_bitwise_and_expr() {
        let left = this.parse_equality_expr();
        while (this.at().type === lexer_1.TokenType.Ampersand) {
            const opToken = this.eat();
            const right = this.parse_equality_expr();
            left = { kind: "BinaryExpr", left, right, operator: "&", line: opToken.line, column: opToken.column };
        }
        return left;
    }
    parse_equality_expr() {
        let left = this.parse_relational_expr();
        while (this.at().type === lexer_1.TokenType.Is || this.at().type === lexer_1.TokenType.Isnt || this.at().type === lexer_1.TokenType.Equals || this.at().type === lexer_1.TokenType.NotEquals) {
            const opToken = this.eat();
            const right = this.parse_relational_expr();
            left = { kind: "BinaryExpr", left, right, operator: opToken.value, line: opToken.line, column: opToken.column };
        }
        return left;
    }
    parse_relational_expr() {
        let left = this.parse_shift_expr();
        while (this.at().type === lexer_1.TokenType.LessThan || this.at().type === lexer_1.TokenType.GreaterThan || this.at().type === lexer_1.TokenType.LessEquals || this.at().type === lexer_1.TokenType.GreaterEquals) {
            const opToken = this.eat();
            const right = this.parse_shift_expr();
            left = { kind: "BinaryExpr", left, right, operator: opToken.value, line: opToken.line, column: opToken.column };
        }
        return left;
    }
    parse_shift_expr() {
        let left = this.parse_additive_expr();
        while (this.at().type === lexer_1.TokenType.ShiftLeft || this.at().type === lexer_1.TokenType.ShiftRight) {
            const opToken = this.eat();
            const right = this.parse_additive_expr();
            left = { kind: "BinaryExpr", left, right, operator: opToken.value, line: opToken.line, column: opToken.column };
        }
        return left;
    }
    parse_additive_expr() {
        let left = this.parse_multiplicative_expr();
        while (this.at().type === lexer_1.TokenType.Plus || this.at().type === lexer_1.TokenType.Minus) {
            const opToken = this.eat();
            const right = this.parse_multiplicative_expr();
            left = { kind: "BinaryExpr", left, right, operator: opToken.value, line: opToken.line, column: opToken.column };
        }
        return left;
    }
    parse_multiplicative_expr() {
        let left = this.parse_power_expr();
        while (this.at().type === lexer_1.TokenType.Times || this.at().type === lexer_1.TokenType.Slash || this.at().type === lexer_1.TokenType.Percent) {
            const opToken = this.eat();
            const right = this.parse_power_expr();
            left = { kind: "BinaryExpr", left, right, operator: opToken.value, line: opToken.line, column: opToken.column };
        }
        return left;
    }
    parse_power_expr() {
        let left = this.parse_unary_expr();
        while (this.at().type === lexer_1.TokenType.Power) {
            const opToken = this.eat();
            const right = this.parse_power_expr(); // Right-associative or just recursive
            left = { kind: "BinaryExpr", left, right, operator: "**", line: opToken.line, column: opToken.column };
        }
        return left;
    }
    parse_unary_expr() {
        if (this.at().type === lexer_1.TokenType.Minus || this.at().type === lexer_1.TokenType.Not || this.at().type === lexer_1.TokenType.NotLogic) {
            const opToken = this.eat();
            const arg = this.parse_unary_expr();
            return { kind: "BinaryExpr", left: arg, right: { kind: "NumericLiteral", value: 0 }, operator: "unary_" + (opToken.value || "not"), line: opToken.line, column: opToken.column };
        }
        if (this.at().type === lexer_1.TokenType.Await) {
            const awaitToken = this.eat();
            const arg = this.parse_unary_expr();
            return { kind: "AwaitExpr", argument: arg, line: awaitToken.line, column: awaitToken.column };
        }
        return this.parse_call_member_expr();
    }
    parse_call_member_expr() {
        let object = this.parse_primary_expr();
        while (this.at().type === lexer_1.TokenType.OpenParen ||
            this.at().type === lexer_1.TokenType.Dot ||
            this.at().type === lexer_1.TokenType.OpenBracket ||
            this.at().type === lexer_1.TokenType.OptionalChain) {
            if (this.at().type === lexer_1.TokenType.OpenParen) {
                object = this.parse_call_expr(object);
            }
            else {
                object = this.parse_member_expr_step(object);
            }
        }
        return object;
    }
    parse_call_expr(caller) {
        const openParen = this.eat();
        const args = this.at().type === lexer_1.TokenType.CloseParen ? [] : this.parse_arguments_list();
        this.expect(lexer_1.TokenType.CloseParen, "Missing closing parenthesis in call expression.");
        return { kind: "CallExpr", caller, args, line: openParen.line, column: openParen.column };
    }
    parse_arguments_list() {
        const args = [this.parse_expression()];
        while (this.at().type === lexer_1.TokenType.Comma && this.eat()) {
            args.push(this.parse_expression());
        }
        return args;
    }
    parse_member_expr_step(object) {
        const operator = this.eat();
        let property;
        let computed;
        let optional = operator.type === lexer_1.TokenType.OptionalChain;
        if (operator.type === lexer_1.TokenType.Dot || operator.type === lexer_1.TokenType.OptionalChain) {
            computed = false;
            property = this.parse_primary_expr();
            if (property.kind !== "Identifier") {
                throw new errors_1.NovaSyntaxError("Cannot use dot operator without identifier.", this.getLocation(this.at()));
            }
        }
        else {
            computed = true;
            property = this.parse_expression();
            this.expect(lexer_1.TokenType.CloseBracket, "Missing closing bracket in computed property.");
        }
        return { kind: "MemberExpr", object, property, computed, optional, line: operator.line, column: operator.column };
    }
    parse_array_expr() {
        const openBracket = this.eat();
        const elements = [];
        while (this.at().type !== lexer_1.TokenType.CloseBracket && this.not_eof()) {
            elements.push(this.parse_expression());
            if (this.at().type === lexer_1.TokenType.Comma)
                this.eat();
        }
        this.expect(lexer_1.TokenType.CloseBracket, "Expected ] after array literal.");
        return { kind: "ArrayLiteral", elements, line: openBracket.line, column: openBracket.column };
    }
    parse_primary_expr() {
        const tk = this.at();
        switch (tk.type) {
            case lexer_1.TokenType.Identifier:
                // Lookahead for single-param arrow function: x => x * 2
                if (this.peek(1).type === lexer_1.TokenType.Arrow) {
                    const param = this.eat().value;
                    this.eat(); // consume =>
                    const body = this.at().type === lexer_1.TokenType.OpenBrace ? this.parse_block().body : this.parse_expression();
                    return { kind: "ArrowFnExpr", parameters: [param], body, async: false, line: tk.line, column: tk.column };
                }
                return { kind: "Identifier", symbol: this.eat().value, line: tk.line, column: tk.column };
            case lexer_1.TokenType.Number:
                return { kind: "NumericLiteral", value: parseFloat(this.eat().value), line: tk.line, column: tk.column };
            case lexer_1.TokenType.String:
                return { kind: "StringLiteral", value: this.eat().value, line: tk.line, column: tk.column };
            case lexer_1.TokenType.Include:
                const includeToken = this.eat();
                this.expect(lexer_1.TokenType.OpenParen, "Expected ( after include keyword.");
                const moduleExpr = this.parse_expression();
                this.expect(lexer_1.TokenType.CloseParen, "Expected ) after module name in include().");
                return { kind: "ImportExpr", moduleName: moduleExpr, line: includeToken.line, column: includeToken.column };
            case lexer_1.TokenType.OpenParen: {
                // Lookahead for multi-param arrow function: (a, b) => ...
                let i = 1;
                while (this.peek(i).type !== lexer_1.TokenType.EOF && this.peek(i).type !== lexer_1.TokenType.CloseParen) {
                    i++;
                }
                if (this.peek(i).type === lexer_1.TokenType.CloseParen && this.peek(i + 1).type === lexer_1.TokenType.Arrow) {
                    this.eat(); // (
                    const params = [];
                    while (this.at().type !== lexer_1.TokenType.CloseParen) {
                        params.push(this.expect(lexer_1.TokenType.Identifier, "Expected identifier in arrow function parameters").value);
                        if (this.at().type === lexer_1.TokenType.Comma)
                            this.eat();
                    }
                    this.eat(); // )
                    this.eat(); // =>
                    const body = this.at().type === lexer_1.TokenType.OpenBrace ? this.parse_block().body : this.parse_expression();
                    return { kind: "ArrowFnExpr", parameters: params, body, async: false, line: tk.line, column: tk.column };
                }
                this.eat(); // (
                const value = this.parse_expression();
                this.expect(lexer_1.TokenType.CloseParen, "Expected closing parenthesis.");
                return value;
            }
            case lexer_1.TokenType.OpenBracket:
                return this.parse_array_expr();
            case lexer_1.TokenType.OpenBrace:
                return this.parse_object_expr();
            case lexer_1.TokenType.Async:
                if (this.peek(1).type === lexer_1.TokenType.Fn) {
                    return this.parse_anonymous_function(true);
                }
                throw new errors_1.NovaSyntaxError(`Unexpected token found: ${tk.value}`, this.getLocation(tk));
            case lexer_1.TokenType.Fn:
                return this.parse_anonymous_function(false);
            default:
                throw new errors_1.NovaSyntaxError(`Unexpected token found: ${tk.value}`, this.getLocation(tk));
        }
    }
    parse_export_declaration() {
        const exportToken = this.eat(); // 'export'
        const declaration = this.parse_statement();
        // Ensure it's a valid exportable statement (let, const, fn)
        if (declaration.kind !== "VarDeclaration" && declaration.kind !== "FunctionDeclaration") {
            throw new errors_1.NovaSyntaxError(`Only variables and functions can be exported directly.`, this.getLocation(exportToken));
        }
        return { kind: "ExportDeclaration", declaration, line: exportToken.line, column: exportToken.column };
    }
    parse_named_import() {
        const importToken = this.eat(); // 'include' or 'import'
        this.expect(lexer_1.TokenType.OpenBrace, "Expected { for named imports.");
        const imports = [];
        while (this.at().type !== lexer_1.TokenType.CloseBrace && this.not_eof()) {
            const id = this.expect(lexer_1.TokenType.Identifier, "Expected identifier in named import").value;
            imports.push(id);
            if (this.at().type === lexer_1.TokenType.Comma) {
                this.eat();
            }
        }
        this.expect(lexer_1.TokenType.CloseBrace, "Expected } after named imports.");
        this.expect(lexer_1.TokenType.From, "Expected 'from' after named imports.");
        const moduleStr = this.expect(lexer_1.TokenType.String, "Expected module string after 'from'.").value;
        return { kind: "NamedImportStatement", imports, moduleName: moduleStr, line: importToken.line, column: importToken.column };
    }
    is_start_of_expression(type) {
        return type === lexer_1.TokenType.Identifier || type === lexer_1.TokenType.Number || type === lexer_1.TokenType.String ||
            type === lexer_1.TokenType.OpenParen || type === lexer_1.TokenType.OpenBrace || type === lexer_1.TokenType.OpenBracket ||
            type === lexer_1.TokenType.Minus || type === lexer_1.TokenType.Not || type === lexer_1.TokenType.NotLogic ||
            type === lexer_1.TokenType.Include || type === lexer_1.TokenType.Await || type === lexer_1.TokenType.Fn || type === lexer_1.TokenType.Async;
    }
    parse_anonymous_function(isAsync) {
        if (isAsync)
            this.eat(); // async
        const fnToken = this.eat(); // fn
        let name = "anonymous";
        if (this.at().type === lexer_1.TokenType.Identifier) {
            name = this.eat().value;
        }
        this.expect(lexer_1.TokenType.OpenParen, "Expected ( after function name");
        const args = [];
        while (this.at().type !== lexer_1.TokenType.CloseParen && this.not_eof()) {
            args.push(this.expect(lexer_1.TokenType.Identifier, "Expected identifier in parameters").value);
            if (this.at().type === lexer_1.TokenType.Comma)
                this.eat();
        }
        this.expect(lexer_1.TokenType.CloseParen, "Expected ) after function parameters");
        const bodyNode = this.parse_statement();
        const body = bodyNode.kind === "Program" ? bodyNode.body : [bodyNode];
        return { kind: "FunctionDeclaration", name, parameters: args, body, async: isAsync, line: fnToken.line, column: fnToken.column };
    }
}
exports.default = Parser;
