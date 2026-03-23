"use strict";
// src/frontend/lexer.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenType = void 0;
exports.tokenize = tokenize;
var TokenType;
(function (TokenType) {
    // Literals
    TokenType[TokenType["Number"] = 0] = "Number";
    TokenType[TokenType["String"] = 1] = "String";
    TokenType[TokenType["Identifier"] = 2] = "Identifier";
    // Keywords
    TokenType[TokenType["Let"] = 3] = "Let";
    TokenType[TokenType["Const"] = 4] = "Const";
    TokenType[TokenType["Global"] = 5] = "Global";
    TokenType[TokenType["Fn"] = 6] = "Fn";
    TokenType[TokenType["If"] = 7] = "If";
    TokenType[TokenType["Else"] = 8] = "Else";
    TokenType[TokenType["While"] = 9] = "While";
    TokenType[TokenType["For"] = 10] = "For";
    TokenType[TokenType["From"] = 11] = "From";
    TokenType[TokenType["To"] = 12] = "To";
    TokenType[TokenType["Return"] = 13] = "Return";
    TokenType[TokenType["Include"] = 14] = "Include";
    TokenType[TokenType["And"] = 15] = "And";
    TokenType[TokenType["Or"] = 16] = "Or";
    TokenType[TokenType["Not"] = 17] = "Not";
    TokenType[TokenType["Is"] = 18] = "Is";
    TokenType[TokenType["Isnt"] = 19] = "Isnt";
    // Symbols
    TokenType[TokenType["Assign"] = 20] = "Assign";
    TokenType[TokenType["PlusEquals"] = 21] = "PlusEquals";
    TokenType[TokenType["MinusEquals"] = 22] = "MinusEquals";
    TokenType[TokenType["Equals"] = 23] = "Equals";
    TokenType[TokenType["NotEquals"] = 24] = "NotEquals";
    TokenType[TokenType["LessThan"] = 25] = "LessThan";
    TokenType[TokenType["LessEquals"] = 26] = "LessEquals";
    TokenType[TokenType["GreaterThan"] = 27] = "GreaterThan";
    TokenType[TokenType["GreaterEquals"] = 28] = "GreaterEquals";
    TokenType[TokenType["Plus"] = 29] = "Plus";
    TokenType[TokenType["Minus"] = 30] = "Minus";
    TokenType[TokenType["Times"] = 31] = "Times";
    TokenType[TokenType["Power"] = 32] = "Power";
    TokenType[TokenType["Slash"] = 33] = "Slash";
    TokenType[TokenType["Percent"] = 34] = "Percent";
    TokenType[TokenType["Ampersand"] = 35] = "Ampersand";
    TokenType[TokenType["Pipe"] = 36] = "Pipe";
    TokenType[TokenType["Caret"] = 37] = "Caret";
    TokenType[TokenType["ShiftLeft"] = 38] = "ShiftLeft";
    TokenType[TokenType["ShiftRight"] = 39] = "ShiftRight";
    TokenType[TokenType["AndLogic"] = 40] = "AndLogic";
    TokenType[TokenType["OrLogic"] = 41] = "OrLogic";
    TokenType[TokenType["NotLogic"] = 42] = "NotLogic";
    TokenType[TokenType["OpenParen"] = 43] = "OpenParen";
    TokenType[TokenType["CloseParen"] = 44] = "CloseParen";
    TokenType[TokenType["OpenBrace"] = 45] = "OpenBrace";
    TokenType[TokenType["CloseBrace"] = 46] = "CloseBrace";
    TokenType[TokenType["OpenBracket"] = 47] = "OpenBracket";
    TokenType[TokenType["CloseBracket"] = 48] = "CloseBracket";
    TokenType[TokenType["Comma"] = 49] = "Comma";
    TokenType[TokenType["Dot"] = 50] = "Dot";
    TokenType[TokenType["Colon"] = 51] = "Colon";
    TokenType[TokenType["SemiColon"] = 52] = "SemiColon";
    TokenType[TokenType["Arrow"] = 53] = "Arrow";
    TokenType[TokenType["DotDotDot"] = 54] = "DotDotDot";
    TokenType[TokenType["Question"] = 55] = "Question";
    TokenType[TokenType["NullCoalesce"] = 56] = "NullCoalesce";
    TokenType[TokenType["OptionalChain"] = 57] = "OptionalChain";
    // Keywords
    TokenType[TokenType["Switch"] = 58] = "Switch";
    TokenType[TokenType["Case"] = 59] = "Case";
    TokenType[TokenType["Default"] = 60] = "Default";
    TokenType[TokenType["Try"] = 61] = "Try";
    TokenType[TokenType["Catch"] = 62] = "Catch";
    TokenType[TokenType["Finally"] = 63] = "Finally";
    TokenType[TokenType["Throw"] = 64] = "Throw";
    TokenType[TokenType["Async"] = 65] = "Async";
    TokenType[TokenType["Await"] = 66] = "Await";
    TokenType[TokenType["Break"] = 67] = "Break";
    TokenType[TokenType["Continue"] = 68] = "Continue";
    TokenType[TokenType["Export"] = 69] = "Export";
    // Special
    TokenType[TokenType["EOF"] = 70] = "EOF";
})(TokenType || (exports.TokenType = TokenType = {}));
const KEYWORDS = {
    "let": TokenType.Let,
    "const": TokenType.Const,
    "global": TokenType.Global,
    "fn": TokenType.Fn,
    "if": TokenType.If,
    "else": TokenType.Else,
    "while": TokenType.While,
    "for": TokenType.For,
    "from": TokenType.From,
    "to": TokenType.To,
    "return": TokenType.Return,
    "include": TokenType.Include,
    "import": TokenType.Include,
    // Aliases (Mapped to logic tokens directly)
    "and": TokenType.AndLogic,
    "or": TokenType.OrLogic,
    "not": TokenType.NotLogic,
    "is": TokenType.Equals,
    "isnt": TokenType.NotEquals,
    "switch": TokenType.Switch,
    "case": TokenType.Case,
    "default": TokenType.Default,
    "try": TokenType.Try,
    "catch": TokenType.Catch,
    "finally": TokenType.Finally,
    "throw": TokenType.Throw,
    "async": TokenType.Async,
    "await": TokenType.Await,
    "break": TokenType.Break,
    "continue": TokenType.Continue,
    "export": TokenType.Export,
};
function tokenize(sourceCode) {
    const tokens = [];
    const src = sourceCode.split("");
    let line = 1;
    let column = 1;
    const pushToken = (value, type) => {
        tokens.push({ value, type, line, column: column - value.length });
    };
    while (src.length > 0) {
        // 1. Handle Single-character Symbols
        if (src[0] === "(") {
            pushToken(src.shift(), TokenType.OpenParen);
        }
        else if (src[0] === ")") {
            pushToken(src.shift(), TokenType.CloseParen);
        }
        else if (src[0] === "{") {
            pushToken(src.shift(), TokenType.OpenBrace);
        }
        else if (src[0] === "}") {
            pushToken(src.shift(), TokenType.CloseBrace);
        }
        else if (src[0] === "[") {
            pushToken(src.shift(), TokenType.OpenBracket);
        }
        else if (src[0] === "]") {
            pushToken(src.shift(), TokenType.CloseBracket);
        }
        else if (src[0] === ",") {
            pushToken(src.shift(), TokenType.Comma);
        }
        else if (src[0] === ":") {
            pushToken(src.shift(), TokenType.Colon);
        }
        else if (src[0] === ";") {
            pushToken(src.shift(), TokenType.SemiColon);
        }
        else if (src[0] === ".") {
            pushToken(src.shift(), TokenType.Dot);
        }
        else if (src[0] === "+") {
            if (src[1] === "=") {
                src.shift();
                src.shift();
                column += 2;
                tokens.push({ value: "+=", type: TokenType.PlusEquals, line, column: column - 2 });
                continue;
            }
            else {
                pushToken(src.shift(), TokenType.Plus);
            }
        }
        else if (src[0] === "-") {
            if (src[1] === "=") {
                src.shift();
                src.shift();
                column += 2;
                tokens.push({ value: "-=", type: TokenType.MinusEquals, line, column: column - 2 });
                continue;
            }
            else {
                pushToken(src.shift(), TokenType.Minus);
            }
        }
        else if (src[0] === "*") {
            if (src[1] === "*") {
                src.shift();
                src.shift();
                column += 2;
                tokens.push({ value: "**", type: TokenType.Power, line, column: column - 2 });
                continue;
            }
            else {
                pushToken(src.shift(), TokenType.Times);
            }
        }
        else if (src[0] === "/") {
            pushToken(src.shift(), TokenType.Slash);
        }
        else if (src[0] === "%") {
            pushToken(src.shift(), TokenType.Percent);
        }
        else if (src[0] === "=") {
            if (src[1] === "=") {
                src.shift();
                src.shift();
                column += 2;
                tokens.push({ value: "==", type: TokenType.Equals, line, column: column - 2 });
                continue;
            }
            else if (src[1] === ">") {
                src.shift();
                src.shift();
                column += 2;
                tokens.push({ value: "=>", type: TokenType.Arrow, line, column: column - 2 });
                continue;
            }
            else {
                pushToken(src.shift(), TokenType.Assign);
            }
        }
        else if (src[0] === "!") {
            if (src[1] === "=") {
                src.shift();
                src.shift();
                column += 2;
                tokens.push({ value: "!=", type: TokenType.NotEquals, line, column: column - 2 });
                continue;
            }
            else {
                pushToken(src.shift(), TokenType.NotLogic);
            }
        }
        else if (src[0] === "<") {
            if (src[1] === "=") {
                src.shift();
                src.shift();
                column += 2;
                tokens.push({ value: "<=", type: TokenType.LessEquals, line, column: column - 2 });
                continue;
            }
            else if (src[1] === "<") {
                src.shift();
                src.shift();
                column += 2;
                tokens.push({ value: "<<", type: TokenType.ShiftLeft, line, column: column - 2 });
                continue;
            }
            else {
                pushToken(src.shift(), TokenType.LessThan);
            }
        }
        else if (src[0] === ">") {
            if (src[1] === "=") {
                src.shift();
                src.shift();
                column += 2;
                tokens.push({ value: ">=", type: TokenType.GreaterEquals, line, column: column - 2 });
                continue;
            }
            else if (src[1] === ">") {
                src.shift();
                src.shift();
                column += 2;
                tokens.push({ value: ">>", type: TokenType.ShiftRight, line, column: column - 2 });
                continue;
            }
            else {
                pushToken(src.shift(), TokenType.GreaterThan);
            }
        }
        else if (src[0] === "&") {
            if (src[1] === "&") {
                src.shift();
                src.shift();
                column += 2;
                tokens.push({ value: "&&", type: TokenType.AndLogic, line, column: column - 2 });
                continue;
            }
            else {
                pushToken(src.shift(), TokenType.Ampersand);
            }
        }
        else if (src[0] === "|") {
            if (src[1] === "|") {
                src.shift();
                src.shift();
                column += 2;
                tokens.push({ value: "||", type: TokenType.OrLogic, line, column: column - 2 });
                continue;
            }
            else {
                pushToken(src.shift(), TokenType.Pipe);
            }
        }
        else if (src[0] === "^") {
            pushToken(src.shift(), TokenType.Caret);
        }
        else if (src[0] === "?") {
            if (src[1] === "?") {
                src.shift();
                src.shift();
                column += 2;
                tokens.push({ value: "??", type: TokenType.NullCoalesce, line, column: column - 2 });
                continue;
            }
            else if (src[1] === ".") {
                src.shift();
                src.shift();
                column += 2;
                tokens.push({ value: "?.", type: TokenType.OptionalChain, line, column: column - 2 });
                continue;
            }
            else {
                pushToken(src.shift(), TokenType.Question);
            }
        }
        // 2. Handle Comments, Whitespace, and Multi-character Tokens
        else if (src[0] === "#") {
            while (src.length > 0 && src[0] !== "\n") {
                src.shift();
            }
        }
        else if (src[0] === "\n") {
            line++;
            column = 1;
            src.shift();
            continue;
        }
        else if (/\s/.test(src[0])) {
            src.shift();
            column++;
            continue;
        }
        else if (/[0-9]/.test(src[0])) {
            let num = "";
            while (src.length > 0 && /[0-9.]/.test(src[0])) {
                num += src.shift();
                column++;
            }
            tokens.push({ value: num, type: TokenType.Number, line, column: column - num.length });
            continue;
        }
        else if (src[0] === '"' || src[0] === "'") {
            const quote = src.shift();
            const startLine = line;
            const startColumn = column;
            column++;
            let str = "";
            while (src.length > 0 && src[0] !== quote) {
                if (src[0] === '\\') {
                    src.shift();
                    column++;
                    const escapeChar = src.shift();
                    column++;
                    if (!escapeChar)
                        break;
                    switch (escapeChar) {
                        case 'n':
                            str += '\n';
                            break;
                        case 'r':
                            str += '\r';
                            break;
                        case 't':
                            str += '\t';
                            break;
                        case 'b':
                            str += '\b';
                            break;
                        case 'f':
                            str += '\f';
                            break;
                        case 'v':
                            str += '\v';
                            break;
                        case '\\':
                            str += '\\';
                            break;
                        case '"':
                            str += '"';
                            break;
                        case "'":
                            str += "'";
                            break;
                        case 'e':
                            str += '\x1b';
                            break;
                        case 'x': {
                            let hex = (src.shift() || "") + (src.shift() || "");
                            column += 2;
                            str += String.fromCharCode(parseInt(hex, 16) || 0);
                            break;
                        }
                        default:
                            str += escapeChar;
                            break;
                    }
                }
                else {
                    str += src.shift();
                    column++;
                }
            }
            if (src.length > 0 && src[0] === quote) {
                src.shift();
                column++;
            }
            tokens.push({ value: str, type: TokenType.String, line: startLine, column: startColumn });
            continue;
        }
        else if (/[a-zA-Z_]/.test(src[0])) {
            let ident = "";
            while (src.length > 0 && /[a-zA-Z0-9_]/.test(src[0])) {
                ident += src.shift();
                column++;
            }
            const lowerIdent = ident.toLowerCase();
            const reserved = KEYWORDS[lowerIdent];
            if (reserved !== undefined) {
                tokens.push({ value: ident, type: reserved, line, column: column - ident.length });
            }
            else {
                tokens.push({ value: ident, type: TokenType.Identifier, line, column: column - ident.length });
            }
            continue;
        }
        else {
            console.error(`Unrecognized character found in source: ${src[0]} at line ${line}`);
            src.shift();
            column++;
        }
        // Default increment for single char tokens handled by pushToken
        column++;
    }
    tokens.push({ type: TokenType.EOF, value: "EndOfFile", line, column });
    return tokens;
}
