package frontend

type NodeType string

const (
	ProgramNode              NodeType = "Program"
	VarDeclarationNode       NodeType = "VarDeclaration"
	GlobalDeclarationNode    NodeType = "GlobalDeclaration"
	FunctionDeclarationNode  NodeType = "FunctionDeclaration"
	IfStatementNode          NodeType = "IfStatement"
	WhileStatementNode       NodeType = "WhileStatement"
	ForStatementNode         NodeType = "ForStatement"
	SwitchStatementNode      NodeType = "SwitchStatement"
	CaseStatementNode        NodeType = "CaseStatement"
	TryCatchStatementNode    NodeType = "TryCatchStatement"
	ReturnStatementNode      NodeType = "ReturnStatement"
	ThrowStatementNode       NodeType = "ThrowStatement"
	BreakStatementNode       NodeType = "BreakStatement"
	ContinueStatementNode    NodeType = "ContinueStatement"
	ImportStatementNode      NodeType = "ImportStatement"
	ImportExprNode           NodeType = "ImportExpr"
	AssignmentExprNode       NodeType = "AssignmentExpr"
	BinaryExprNode           NodeType = "BinaryExpr"
	CallExprNode             NodeType = "CallExpr"
	MemberExprNode           NodeType = "MemberExpr"
	AwaitExprNode            NodeType = "AwaitExpr"
	IdentifierNode           NodeType = "Identifier"
	NumericLiteralNode       NodeType = "NumericLiteral"
	StringLiteralNode        NodeType = "StringLiteral"
	ObjectLiteralNode        NodeType = "ObjectLiteral"
	PropertyNode             NodeType = "Property"
	ArrayLiteralNode         NodeType = "ArrayLiteral"
	ArrowFnExprNode          NodeType = "ArrowFnExpr"
	ExportDeclarationNode    NodeType = "ExportDeclaration"
	NamedImportStatementNode NodeType = "NamedImportStatement"
)

type Stmt interface {
	Kind() NodeType
	GetLine() int
	GetColumn() int
	GetFile() string
	SetFile(file string)
	GetSource() string
	SetSource(source string)
}

type Expr interface {
	Stmt
	exprNode()
}

type BaseNode struct {
	Type   NodeType
	Line   int
	Column int
	File   string
	Source string
}

func (b *BaseNode) Kind() NodeType { return b.Type }
func (b *BaseNode) GetLine() int { return b.Line }
func (b *BaseNode) GetColumn() int { return b.Column }
func (b *BaseNode) GetFile() string { return b.File }
func (b *BaseNode) SetFile(file string) { b.File = file }
func (b *BaseNode) GetSource() string { return b.Source }
func (b *BaseNode) SetSource(source string) { b.Source = source }

type Program struct {
	BaseNode
	Body []Stmt
}

type VarDeclaration struct {
	BaseNode
	Constant   bool
	Identifier string
	Value      Expr
}

type GlobalDeclaration struct {
	BaseNode
	Constant   bool
	Identifier string
	Value      Expr
}

type FunctionDeclaration struct {
	BaseNode
	Name       string
	Parameters []string
	Body       []Stmt
	Async      bool
}

type IfStatement struct {
	BaseNode
	Condition  Expr
	ThenBranch []Stmt
	ElseBranch []Stmt
}

type WhileStatement struct {
	BaseNode
	Condition Expr
	Body      []Stmt
}

type ForStatement struct {
	BaseNode
	Counter   string
	Start     Expr
	End       Expr
	Init      Stmt
	Condition Expr
	Update    Expr
	Body      []Stmt
}

type SwitchStatement struct {
	BaseNode
	Discriminant Expr
	Cases        []CaseStatement
	Default      []Stmt
}

type CaseStatement struct {
	BaseNode
	Test       Expr
	Consequent []Stmt
}

type TryCatchStatement struct {
	BaseNode
	Body           []Stmt
	CatchParameter string
	CatchBlock     []Stmt
	FinallyBlock   []Stmt
}

type ReturnStatement struct {
	BaseNode
	Value Expr
}

type ThrowStatement struct {
	BaseNode
	Argument Expr
}

type BreakStatement struct {
	BaseNode
}

type ContinueStatement struct {
	BaseNode
}

type ImportStatement struct {
	BaseNode
	ModuleName string
}

type NamedImportStatement struct {
	BaseNode
	Imports    []string
	ModuleName string
}

type ExportDeclaration struct {
	BaseNode
	Declaration Stmt
}

// Expressions
func (b *BaseNode) exprNode() {}

type ImportExpr struct {
	BaseNode
	ModuleName Expr
}

type AssignmentExpr struct {
	BaseNode
	Assignee Expr
	Value    Expr
}

type BinaryExpr struct {
	BaseNode
	Left     Expr
	Right    Expr
	Operator string
}

type CallExpr struct {
	BaseNode
	Args   []Expr
	Caller Expr
}

type MemberExpr struct {
	BaseNode
	Object   Expr
	Property Expr
	Computed bool
	Optional bool
}

type AwaitExpr struct {
	BaseNode
	Argument Expr
}

type Identifier struct {
	BaseNode
	Symbol string
}

type NumericLiteral struct {
	BaseNode
	Value float64
}

type StringLiteral struct {
	BaseNode
	Value string
}

type Property struct {
	BaseNode
	Key   string
	Value Expr
}

type ObjectLiteral struct {
	BaseNode
	Properties []Property
}

type ArrayLiteral struct {
	BaseNode
	Elements []Expr
}

type ArrowFnExpr struct {
	BaseNode
	Parameters []string
	Body       []Stmt
	Async      bool
}
