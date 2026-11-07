package moduletransforms

import (
	"slices"

	"github.com/microsoft/TypeScript/tsc/internal/ast"
	"github.com/microsoft/TypeScript/tsc/internal/printer"
)

// Free the lexical name Reflect for the emitted class-name helpers when the file
// declares both reflection APIs. Keep property keys and module export names intact.
func ProtectClassNameHelperBinding(resolver printer.EmitResolver, file *ast.SourceFile) *ast.SourceFile {
	ec := resolver.EmitContext()
	original := ec.MostOriginal(file.AsNode()).AsSourceFile()
	locals := original.Locals
	const valueFlags = ast.SymbolFlagsValue | ast.SymbolFlagsExportValue | ast.SymbolFlagsAlias
	object, reflect := locals["Object"], locals["Reflect"]
	if object == nil || object.Flags()&valueFlags == 0 || reflect == nil || reflect.Flags()&valueFlags == 0 || !ec.UsesClassNameHelpers(file) {
		return file
	}
	declarations := reflect.Declarations()
	f := ec.Factory
	alias := f.NewUniqueNameEx("Reflect", printer.AutoGenerateOptions{Flags: printer.GeneratedIdentifierFlagsReservedInNestedScopes})
	isDeclaration := func(id *ast.Node) bool {
		return slices.ContainsFunc(declarations, func(d *ast.Node) bool { return d.Name() == id })
	}
	refers := func(n *ast.Node) bool {
		if n == nil || !ast.IsIdentifier(n) || n.Text() != "Reflect" {
			return false
		}
		id := ec.ParseNode(n)
		if id == nil || !ast.IsIdentifier(id) {
			return false
		}
		if isDeclaration(id) {
			return true
		}
		return slices.Contains(declarations, resolver.GetReferencedValueDeclaration(id)) ||
			slices.Contains(declarations, resolver.GetReferencedImportDeclaration(id))
	}
	// Naming an anonymous initializer from its original property key avoids
	// inferring the generated local binding's spelling.
	namedInitializer := func(value *ast.Node) *ast.Node {
		if value == nil {
			return nil
		}
		inner := ast.SkipOuterExpressions(value, ast.OEKAll)
		if !ast.IsArrowFunction(inner) && !((ast.IsClassExpression(inner) || ast.IsFunctionExpression(inner)) && inner.Name() == nil) {
			return value
		}
		key := f.NewIdentifier("Reflect")
		holder := f.NewObjectLiteralExpression(f.NewNodeList([]*ast.Node{f.NewPropertyAssignment(nil, key, nil, nil, value)}), false)
		return f.NewPropertyAccessExpression(holder, nil, key.Clone(f), ast.NodeFlagsNone)
	}
	var visitor *ast.NodeVisitor
	var container *ast.Node
	visitor = ec.NewNodeVisitor(func(n *ast.Node) *ast.Node {
		parent := container
		container = n
		defer func() { container = parent }()
		switch n.Kind {
		case ast.KindVariableDeclaration:
			d := n.AsVariableDeclaration()
			if refers(d.Name()) {
				return f.UpdateVariableDeclaration(d, alias, d.ExclamationToken, d.Type, namedInitializer(visitor.VisitNode(d.Initializer)))
			}
		case ast.KindBinaryExpression:
			b := n.AsBinaryExpression()
			if ast.IsAssignmentExpression(n, true) && refers(b.Left) {
				return f.UpdateBinaryExpression(b, nil, alias, nil, b.OperatorToken, namedInitializer(visitor.VisitNode(b.Right)))
			}
		case ast.KindPropertyAccessExpression:
			p := n.AsPropertyAccessExpression()
			return f.UpdatePropertyAccessExpression(p, visitor.VisitNode(p.Expression), p.QuestionDotToken, p.Name(), p.Flags)
		case ast.KindImportSpecifier:
			s := n.AsImportSpecifier()
			if refers(s.Name()) {
				key := s.PropertyName
				if key == nil {
					key = s.Name()
				}
				return f.UpdateImportSpecifier(s, s.IsTypeOnly, key, alias)
			}
			return n
		case ast.KindExportDeclaration:
			if n.AsExportDeclaration().ModuleSpecifier != nil {
				return n
			}
		case ast.KindExportSpecifier:
			s := n.AsExportSpecifier()
			local := s.PropertyName
			if local == nil {
				local = s.Name()
			}
			if local.Text() == "Reflect" {
				return f.UpdateExportSpecifier(s, s.IsTypeOnly, alias, s.Name())
			}
			return n
		case ast.KindShorthandPropertyAssignment:
			s := n.AsShorthandPropertyAssignment()
			if refers(s.Name()) {
				value := alias
				if s.ObjectAssignmentInitializer != nil {
					value = f.NewAssignmentExpression(alias, visitor.VisitNode(s.ObjectAssignmentInitializer))
				}
				return f.NewPropertyAssignment(nil, s.Name(), nil, nil, value)
			}
		case ast.KindBindingElement:
			b := n.AsBindingElement()
			if refers(b.Name()) {
				key := b.PropertyName
				if key == nil && b.DotDotDotToken == nil && parent != nil && ast.IsObjectBindingPattern(parent) {
					key = b.Name()
				}
				return f.UpdateBindingElement(b, b.DotDotDotToken, key, alias, namedInitializer(visitor.VisitNode(b.Initializer)))
			}
		case ast.KindIdentifier:
			id := ec.ParseNode(n)
			if id != nil && ast.IsIdentifier(id) && (isDeclaration(id) || !ast.IsDeclarationName(id) && ast.IsExpressionNode(id)) && refers(n) {
				return alias
			}
			return n
		}
		return visitor.VisitEachChild(n)
	})
	var statements, hoisted []*ast.Node
	for _, stmt := range file.Statements.Nodes {
		updated := visitor.VisitNode(stmt)
		if ast.IsClassDeclaration(stmt) && refers(stmt.Name()) {
			// A named class expression retains its inner name during static initialization.
			c := stmt.AsClassDeclaration()
			class := f.NewClassExpression(nil, c.Name(), nil, visitor.VisitNodes(c.HeritageClauses), c.Members)
			declaration := f.NewVariableDeclaration(alias, nil, nil, class)
			statements = append(statements, f.NewVariableStatement(nil, f.NewVariableDeclarationList(f.NewNodeList([]*ast.Node{declaration}), ast.NodeFlagsLet)))
			if ast.HasSyntacticModifier(stmt, ast.ModifierFlagsExport) {
				publicName := c.Name()
				if ast.HasSyntacticModifier(stmt, ast.ModifierFlagsDefault) {
					publicName = f.NewIdentifier("default")
				}
				spec := f.NewExportSpecifier(false, alias, publicName)
				statements = append(statements, f.NewExportDeclaration(nil, false, f.NewNamedExports(f.NewNodeList([]*ast.Node{spec})), nil, nil))
			}
			continue
		}
		if ast.IsFunctionDeclaration(stmt) && refers(stmt.Name()) {
			value := f.NewPropertyAssignment(nil, f.NewIdentifier("value"), nil, nil, f.NewStringLiteral("Reflect", 0))
			descriptor := f.NewObjectLiteralExpression(f.NewNodeList([]*ast.Node{value}), false)
			call := f.NewMethodCall(f.NewIdentifier("Reflect"), f.NewIdentifier("defineProperty"), []*ast.Node{alias, f.NewStringLiteral("name", 0), descriptor})
			hoisted = append(hoisted, f.NewExpressionStatement(call))
		}
		if updated != stmt && ast.HasSyntacticModifier(stmt, ast.ModifierFlagsExport) && !ast.HasSyntacticModifier(stmt, ast.ModifierFlagsDefault) {
			var names []*ast.Node
			var collect func(*ast.Node)
			collect = func(name *ast.Node) {
				if ast.IsBindingPattern(name) {
					for _, element := range name.Elements() {
						if !ast.IsOmittedExpression(element) {
							collect(element.Name())
						}
					}
				} else {
					names = append(names, name)
				}
			}
			if ast.IsVariableStatement(stmt) {
				for _, d := range stmt.AsVariableStatement().DeclarationList.AsVariableDeclarationList().Declarations.Nodes {
					collect(d.Name())
				}
			} else if ast.IsClassDeclaration(stmt) || ast.IsFunctionDeclaration(stmt) {
				collect(stmt.Name())
			}
			if slices.ContainsFunc(names, refers) {
				var specs []*ast.Node
				for _, name := range names {
					var local *ast.Node
					if refers(name) {
						local = alias
					}
					specs = append(specs, f.NewExportSpecifier(false, local, name))
				}
				statements = append(statements, ast.ReplaceModifiers(f.AsNodeFactory(), updated, nil), f.NewExportDeclaration(nil, false, f.NewNamedExports(f.NewNodeList(specs)), nil, nil))
				continue
			}
		}
		statements = append(statements, updated)
	}
	if len(hoisted) > 0 {
		directives, rest := f.SplitStandardPrologue(statements)
		statements = slices.Concat(directives, hoisted, rest)
	}
	list := f.NewNodeList(statements)
	list.Loc = file.Statements.Loc
	return f.UpdateSourceFile(file, list, file.EndOfFileToken).AsSourceFile()
}
