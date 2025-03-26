/**
 * ToString implementation for Nile AST nodes
 *
 * This file adds toString methods to the AST nodes to convert them to string representations.
 * These are useful for debugging, visualization, and serialization.
 */
import {
  Node, Type, PrimType, AnyType, TupleType, RecordType, ProcessType, TypeRef, TypeDef,
  VarDecl, TuplePat, NumExpr, VarExpr, TupleExpr, CondCase, CondExpr, RecFieldExpr,
  OpExpr, OpSig, OpDef, ProcessSig, ProcessDef, ProcessInst, Pipeline, VarDef,
  Block, InStmt, OutStmt, IfStmt, SubStmt
} from './nodes';
import { StringBuffer } from '../utils/helpers';

/**
 * Interface to extend Node with toString method
 */
export interface ToStringCapable {
  toString(indentation?: number): string;
}

/**
 * Add toString method to a node
 * @param node The node to add toString to
 * @param toStringFn The toString implementation
 */
export function addToString<T extends Node>(node: T, toStringFn: (indentation?: number) => string): T & ToStringCapable {
  const nodeWithToString = node as T & ToStringCapable;
  nodeWithToString.toString = toStringFn;
  return nodeWithToString;
}

/**
 * Generate a toString method for a node with named fields
 * @param name The name of the node type
 * @param fieldnames The field names to include
 */
export function generateToString(name: string, fieldnames: string[]): (indentation?: number) => string {
  return function(indentation: number = 0): string {
    const node = this;
    const indentSize = indentation;
    const childIndentSize = indentSize + 4;
    const indent = ' '.repeat(indentSize);
    const childIndent = ' '.repeat(childIndentSize);

    const buffer = new StringBuffer(name, ' {\n');

    for (const fieldname of fieldnames) {
      const fieldValue = node[fieldname];
      buffer.nextPutAll(childIndent);
      buffer.nextPutAll(fieldname);
      buffer.nextPutAll('=');

      if (fieldValue === null || fieldValue === undefined) {
        buffer.nextPutAll('<null>\n');
      } else if (typeof fieldValue === 'number') {
        buffer.nextPutAll(fieldValue.toString());
        buffer.nextPutAll('\n');
      } else if (typeof fieldValue === 'string') {
        buffer.nextPutAll(fieldValue);
        buffer.nextPutAll('\n');
      } else if (typeof fieldValue === 'object' && typeof fieldValue.toString === 'function') {
        const str = fieldValue.toString(childIndentSize);
        buffer.nextPutAll(str);
      } else {
        buffer.nextPutAll('<unserializable>\n');
      }
    }

    if (node.location) {
      buffer.nextPutAll(childIndent);
      buffer.nextPutAll('CharacterRange=');
      buffer.nextPutAll(node.location.start.toString());
      buffer.nextPutAll('-');
      buffer.nextPutAll(node.location.end.toString());
      buffer.nextPutAll('\n');
    }

    buffer.nextPutAll(indent);
    buffer.nextPutAll('}\n');

    return buffer.contents();
  };
}

/**
 * Add toString methods to all node types
 * This is called at initialization time to extend the nodes
 */
export function initToString(): void {
  // Add toString methods to basic types
  (PrimType.prototype as any).toString = function(indentation?: number): string {
    return 'PrimType\n';
  };

  (AnyType.prototype as any).toString = function(indentation?: number): string {
    return 'AnyType\n';
  };

  (TypeRef.prototype as any).toString = function(indentation?: number): string {
    if (indentation && indentation > 0) {
      return `"${this.name}"\n`;
    }
    return generateToString('TypeRef', ['name']).call(this, indentation);
  };

  (TupleType.prototype as any).toString = function(indentation?: number): string {
    return generateToString('TupleType', ['types']).call(this, indentation);
  };

  (RecordType.prototype as any).toString = function(indentation?: number): string {
    return generateToString('RecordType', ['fields']).call(this, indentation);
  };

  (ProcessType.prototype as any).toString = function(indentation?: number): string {
    return generateToString('ProcessType', ['intype', 'outtype']).call(this, indentation);
  };

  // Add toString methods to declarations
  (TypeDef.prototype as any).toString = function(indentation?: number): string {
    if (indentation && indentation > 0) {
      return this.name;
    }
    return generateToString('TypeDef', ['name', 'definition']).call(this, indentation);
  };

  (VarDecl.prototype as any).toString = function(indentation?: number): string {
    return `${this.name}:${this.varType.toString(indentation)}`;
  };

  (TuplePat.prototype as any).toString = function(indentation?: number): string {
    return generateToString('TuplePat', ['elements']).call(this, indentation);
  };

  // Add toString methods to expressions
  (NumExpr.prototype as any).toString = function(indentation?: number): string {
    if (indentation && indentation > 0) {
      return `${this.value}\n`;
    }
    return generateToString('NumExpr', ['value']).call(this, indentation);
  };

  (VarExpr.prototype as any).toString = function(indentation?: number): string {
    return generateToString('VarExpr', ['variable']).call(this, indentation);
  };

  (TupleExpr.prototype as any).toString = function(indentation?: number): string {
    return generateToString('TupleExpr', ['elements']).call(this, indentation);
  };

  (CondCase.prototype as any).toString = function(indentation?: number): string {
    return generateToString('CondCase', ['value', 'condition']).call(this, indentation);
  };

  (CondExpr.prototype as any).toString = function(indentation?: number): string {
    return generateToString('CondExpr', ['cases', 'otherwise']).call(this, indentation);
  };

  (RecFieldExpr.prototype as any).toString = function(indentation?: number): string {
    return generateToString('RecFieldExpr', ['record', 'field']).call(this, indentation);
  };

  (OpExpr.prototype as any).toString = function(indentation?: number): string {
    return generateToString('OpExpr', ['op', 'fixity', 'arg']).call(this, indentation);
  };

  // Add toString methods to operations and processes
  (OpSig.prototype as any).toString = function(indentation?: number): string {
    if (indentation && indentation > 5) {
      return `${this.name} ${this.param.toString(indentation)}`;
    }
    return generateToString('OpSig', ['name', 'fixity', 'param', 'returnType']).call(this, indentation);
  };

  (OpDef.prototype as any).toString = function(indentation?: number): string {
    if (indentation && indentation > 0) {
      return this.sig.toString(indentation);
    }
    return generateToString('OpDef', ['sig', 'body']).call(this, indentation);
  };

  (ProcessSig.prototype as any).toString = function(indentation?: number): string {
    if (indentation && indentation > 5) {
      return `${this.name}\n`;
    }
    return generateToString('ProcessSig', ['name', 'param', 'processType']).call(this, indentation);
  };

  (ProcessDef.prototype as any).toString = function(indentation?: number): string {
    if (indentation && indentation > 0) {
      return this.sig.toString(indentation);
    }
    return generateToString('ProcessDef', ['sig', 'prologue', 'body', 'epilogue']).call(this, indentation);
  };

  (ProcessInst.prototype as any).toString = function(indentation?: number): string {
    return generateToString('ProcessInst', ['processdef', 'arg']).call(this, indentation);
  };

  (Pipeline.prototype as any).toString = function(indentation?: number): string {
    return generateToString('Pipeline', ['producer', 'consumer']).call(this, indentation);
  };

  // Add toString methods to statements and blocks
  (VarDef.prototype as any).toString = function(indentation?: number): string {
    return generateToString('VarDef', ['lvalue', 'rvalue']).call(this, indentation);
  };

  (Block.prototype as any).toString = function(indentation?: number): string {
    return generateToString('Block', ['vardefs', 'stmts']).call(this, indentation);
  };

  (InStmt.prototype as any).toString = function(indentation?: number): string {
    return generateToString('InStmt', ['values']).call(this, indentation);
  };

  (OutStmt.prototype as any).toString = function(indentation?: number): string {
    return generateToString('OutStmt', ['values']).call(this, indentation);
  };

  (IfStmt.prototype as any).toString = function(indentation?: number): string {
    return generateToString('IfStmt', ['condition', 'thenBlock', 'elseBlock']).call(this, indentation);
  };

  (SubStmt.prototype as any).toString = function(indentation?: number): string {
    return generateToString('SubStmt', ['pipeline']).call(this, indentation);
  };
}

/**
 * Apply toString methods to a specific node instance
 * This is useful for dynamically created nodes that don't inherit from the prototype
 * @param node The node to add toString to
 */
export function applyToString(node: Node): Node & ToStringCapable {
  if (!node) return node as Node & ToStringCapable;

  switch (node.type) {
    case 'PrimType':
      return addToString(node, (PrimType.prototype as any).toString);
    case 'AnyType':
      return addToString(node, (AnyType.prototype as any).toString);
    case 'TypeRef':
      return addToString(node, (TypeRef.prototype as any).toString);
    case 'TupleType':
      return addToString(node, (TupleType.prototype as any).toString);
    case 'RecordType':
      return addToString(node, (RecordType.prototype as any).toString);
    case 'ProcessType':
      return addToString(node, (ProcessType.prototype as any).toString);
    case 'TypeDef':
      return addToString(node, (TypeDef.prototype as any).toString);
    case 'VarDecl':
      return addToString(node, (VarDecl.prototype as any).toString);
    case 'TuplePat':
      return addToString(node, (TuplePat.prototype as any).toString);
    case 'NumExpr':
      return addToString(node, (NumExpr.prototype as any).toString);
    case 'VarExpr':
      return addToString(node, (VarExpr.prototype as any).toString);
    case 'TupleExpr':
      return addToString(node, (TupleExpr.prototype as any).toString);
    case 'CondCase':
      return addToString(node, (CondCase.prototype as any).toString);
    case 'CondExpr':
      return addToString(node, (CondExpr.prototype as any).toString);
    case 'RecFieldExpr':
      return addToString(node, (RecFieldExpr.prototype as any).toString);
    case 'OpExpr':
      return addToString(node, (OpExpr.prototype as any).toString);
    case 'OpSig':
      return addToString(node, (OpSig.prototype as any).toString);
    case 'OpDef':
      return addToString(node, (OpDef.prototype as any).toString);
    case 'ProcessSig':
      return addToString(node, (ProcessSig.prototype as any).toString);
    case 'ProcessDef':
      return addToString(node, (ProcessDef.prototype as any).toString);
    case 'ProcessInst':
      return addToString(node, (ProcessInst.prototype as any).toString);
    case 'Pipeline':
      return addToString(node, (Pipeline.prototype as any).toString);
    case 'VarDef':
      return addToString(node, (VarDef.prototype as any).toString);
    case 'Block':
      return addToString(node, (Block.prototype as any).toString);
    case 'InStmt':
      return addToString(node, (InStmt.prototype as any).toString);
    case 'OutStmt':
      return addToString(node, (OutStmt.prototype as any).toString);
    case 'IfStmt':
      return addToString(node, (IfStmt.prototype as any).toString);
    case 'SubStmt':
      return addToString(node, (SubStmt.prototype as any).toString);
    default:
      // For unknown node types, use a generic toString
      return addToString(node, generateToString(node.type, Object.keys(node)));
  }
}
