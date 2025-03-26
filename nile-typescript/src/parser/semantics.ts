/**
 * Ohm Semantics for the Nile grammar
 */
import * as ohm from 'ohm-js';
import fs from 'fs';
import path from 'path';
import {
  Node, Type, PrimType, AnyType, TupleType, RecordType, ProcessType, TypeRef,
  TypeDef, VarDecl, TuplePat, VarDef, NumExpr, VarExpr, TupleExpr, CondCase,
  CondExpr, RecFieldExpr, OpExpr, OpSig, OpBody, OpDef, ProcessSig, ProcessBody,
  ProcessDef, ProcessInst, Pipeline, Block, InStmt, OutStmt, IfStmt, SubStmt,
  Expression, Statement,
  createPrimType, createAnyType, createTupleType, createRecordType, createProcessType,
  createTypeRef, createTypeDef, createVarDecl, createTuplePat, createVarDef,
  createNumExpr, createBlock
} from '../ast/nodes';
import { Environment } from '../runtime/environment';

// Helper to create a source location from Ohm nodes
function createLocation(matchResult: ohm.MatchResult, node: ohm.Node): { start: number, end: number } {
  const sourceString = matchResult.input;
  return {
    start: node.source.startIdx,
    end: node.source.endIdx
  };
}

// Load and compile the grammar
export function loadGrammar(): ohm.Grammar {
  const grammarSource = fs.readFileSync(path.join(__dirname, 'grammar.ohm'), 'utf8');
  return ohm.grammar(grammarSource);
}

// Create semantics for the grammar
export function createSemantics(grammar: ohm.Grammar): ohm.Semantics {
  const semantics = grammar.createSemantics();

  semantics.addOperation<Node>('toAST(env)', {
    // Top level rules
    Program(definitions) {
      return definitions.children.map(c => c.toAST(this.args.env));
    },

    Definition(definition) {
      return definition.toAST(this.args.env);
    },

    // Type definitions
    TypeDef_withType(_type, _space, name, _eq, typeNode) {
      const typeName = name.sourceString;
      const typeDefinition = typeNode.toAST(this.args.env) as Type;
      const typedef = createTypeDef(typeName, typeDefinition, createLocation(this.source, this.source));
      return this.args.env.addTypedef(typedef);
    },

    // Types
    Type(type) {
      return type.toAST(this.args.env);
    },

    SimpleType(type) {
      return type.toAST(this.args.env);
    },

    TupleType(_open, firstType, _comma, otherTypes, _close) {
      const types = [firstType.toAST(this.args.env) as Type]
        .concat(otherTypes.children.map(c => c.toAST(this.args.env))) as Type[];
      return createTupleType(types, createLocation(this.source, this.source));
    },

    RecordType(_open, firstField, _comma, otherFields, _close) {
      const fields = [firstField.toAST(this.args.env) as VarDecl]
        .concat(otherFields.children.map(c => c.toAST(this.args.env))) as VarDecl[];
      return createRecordType(fields, createLocation(this.source, this.source));
    },

    ProcessType(inType, _arrow, outType) {
      return createProcessType(
        inType.toAST(this.args.env) as Type,
        outType.toAST(this.args.env) as Type,
        createLocation(this.source, this.source)
      );
    },

    TypeName(name) {
      return createTypeRef(name.sourceString, createLocation(this.source, this.source));
    },

    // Variables and patterns
    TypedVar(name, _colon, type) {
      return createVarDecl(
        name.sourceString,
        type.toAST(this.args.env) as Type,
        createLocation(this.source, this.source)
      );
    },

    VarPat_simple(name) {
      // For simple variable patterns without a type, use AnyType
      return createVarDecl(
        name.sourceString,
        createAnyType(createLocation(this.source, this.source)),
        createLocation(this.source, this.source)
      );
    },

    TuplePat(_open, firstPat, _comma, otherPats, _close) {
      const elements = [];
      if (firstPat.numChildren > 0) {
        elements.push(firstPat.toAST(this.args.env) as VarDecl);
      }
      elements.push(...otherPats.children.map(c => c.toAST(this.args.env)));
      return createTuplePat(elements, createLocation(this.source, this.source));
    },

    // Variable definitions
    VarDef(pattern, _space1, _eq, _space2, expr) {
      return createVarDef(
        pattern.toAST(this.args.env) as VarDecl | TuplePat,
        expr.toAST(this.args.env) as Expression,
        createLocation(this.source, this.source)
      );
    },

    // Expressions
    Expr(expr) {
      return expr.toAST(this.args.env);
    },

    NumExpr(num) {
      const value = num.sourceString === "∞" ? Infinity : parseFloat(num.sourceString);
      return createNumExpr(value, createLocation(this.source, this.source));
    },

    VarExpr(name) {
      const varDecl = this.args.env.getVardecl(name.sourceString);
      if (!varDecl) {
        throw new Error(`Variable not found: ${name.sourceString}`);
      }
      
      return {
        type: 'VarExpr',
        variable: varDecl,
        location: createLocation(this.source, this.source),
        getType: () => varDecl.getType()
      } as VarExpr;
    },

    // Implement other semantic actions based on the grammar...
    // This is a starting point, you'll need to add many more operations
    
    // For now, a fallback that returns a basic Node for unimplemented rules
    _default(children) {
      const childResults = children.map(child => {
        if (child.isTerminal()) {
          return child.sourceString;
        } else {
          return child.toAST(this.args.env);
        }
      });
      
      return {
        type: this.ctorName,
        children: childResults,
        location: createLocation(this.source, this.source)
      };
    }
  });

  return semantics;
}

/**
 * Parse a Nile program string into AST nodes
 * @param sourceCode The source code to parse
 * @param env The environment to use for resolving names
 */
export function parseNile(sourceCode: string, env: Environment): Node[] {
  const grammar = loadGrammar();
  const semantics = createSemantics(grammar);
  const matchResult = grammar.match(sourceCode, 'Program');
  
  if (matchResult.failed()) {
    throw new Error(`Parse error: ${matchResult.message}`);
  }
  
  return semantics(matchResult).toAST(env) as Node[];
}
