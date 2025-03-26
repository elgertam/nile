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
export function generateToString(name: string, fieldnames: string[]): (this: any, indentation?: number) => string {
  return function(this: any, indentation: number = 0): string {
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
 * Add toString methods to all node types using prototypes
 * This is called at initialization time to extend the nodes
 */
export function initToString(): void {
  // Modify toString method prototype implementations instead of directly referencing types

  // Store type names to function mappings instead of direct prototype access
  const typeStringMethods: Record<string, (indentation?: number) => string> = {};

  // Define toString for PrimType
  typeStringMethods['PrimType'] = function(indentation?: number): string {
    return 'PrimType\n';
  };

  // Define toString for AnyType
  typeStringMethods['AnyType'] = function(indentation?: number): string {
    return 'AnyType\n';
  };

  // Define toString for TypeRef
  typeStringMethods['TypeRef'] = function(indentation?: number): string {
    if (indentation && indentation > 0) {
      return `"${this.name}"\n`;
    }
    return generateToString('TypeRef', ['name']).call(this, indentation);
  };

  // Define toString for TupleType
  typeStringMethods['TupleType'] = function(indentation?: number): string {
    return generateToString('TupleType', ['types']).call(this, indentation);
  };

  // Define toString for RecordType
  typeStringMethods['RecordType'] = function(indentation?: number): string {
    return generateToString('RecordType', ['fields']).call(this, indentation);
  };

  // Define toString for ProcessType
  typeStringMethods['ProcessType'] = function(indentation?: number): string {
    return generateToString('ProcessType', ['intype', 'outtype']).call(this, indentation);
  };

  // Define toString for TypeDef
  typeStringMethods['TypeDef'] = function(indentation?: number): string {
    if (indentation && indentation > 0) {
      return this.name;
    }
    return generateToString('TypeDef', ['name', 'definition']).call(this, indentation);
  };

  // Define toString for VarDecl
  typeStringMethods['VarDecl'] = function(indentation?: number): string {
    return `${this.name}:${this.varType.toString(indentation)}`;
  };

  // Define toString for TuplePat
  typeStringMethods['TuplePat'] = function(indentation?: number): string {
    return generateToString('TuplePat', ['elements']).call(this, indentation);
  };

  // Define toString for NumExpr
  typeStringMethods['NumExpr'] = function(indentation?: number): string {
    if (indentation && indentation > 0) {
      return `${this.value}\n`;
    }
    return generateToString('NumExpr', ['value']).call(this, indentation);
  };

  // Define toString for VarExpr
  typeStringMethods['VarExpr'] = function(indentation?: number): string {
    return generateToString('VarExpr', ['variable']).call(this, indentation);
  };

  // Define toString for TupleExpr
  typeStringMethods['TupleExpr'] = function(indentation?: number): string {
    return generateToString('TupleExpr', ['elements']).call(this, indentation);
  };

  // Define toString for CondCase
  typeStringMethods['CondCase'] = function(indentation?: number): string {
    return generateToString('CondCase', ['value', 'condition']).call(this, indentation);
  };

  // Define toString for CondExpr
  typeStringMethods['CondExpr'] = function(indentation?: number): string {
    return generateToString('CondExpr', ['cases', 'otherwise']).call(this, indentation);
  };

  // Define toString for RecFieldExpr
  typeStringMethods['RecFieldExpr'] = function(indentation?: number): string {
    return generateToString('RecFieldExpr', ['record', 'field']).call(this, indentation);
  };

  // Define toString for OpExpr
  typeStringMethods['OpExpr'] = function(indentation?: number): string {
    return generateToString('OpExpr', ['op', 'fixity', 'arg']).call(this, indentation);
  };

  // Define toString for OpSig
  typeStringMethods['OpSig'] = function(indentation?: number): string {
    if (indentation && indentation > 5) {
      return `${this.name} ${this.param.toString(indentation)}`;
    }
    return generateToString('OpSig', ['name', 'fixity', 'param', 'returnType']).call(this, indentation);
  };

  // Define toString for OpDef
  typeStringMethods['OpDef'] = function(indentation?: number): string {
    if (indentation && indentation > 0) {
      return this.sig.toString(indentation);
    }
    return generateToString('OpDef', ['sig', 'body']).call(this, indentation);
  };

  // Define toString for ProcessSig
  typeStringMethods['ProcessSig'] = function(indentation?: number): string {
    if (indentation && indentation > 5) {
      return `${this.name}\n`;
    }
    return generateToString('ProcessSig', ['name', 'param', 'processType']).call(this, indentation);
  };

  // Define toString for ProcessDef
  typeStringMethods['ProcessDef'] = function(indentation?: number): string {
    if (indentation && indentation > 0) {
      return this.sig.toString(indentation);
    }
    return generateToString('ProcessDef', ['sig', 'prologue', 'body', 'epilogue']).call(this, indentation);
  };

  // Define toString for ProcessInst
  typeStringMethods['ProcessInst'] = function(indentation?: number): string {
    return generateToString('ProcessInst', ['processdef', 'arg']).call(this, indentation);
  };

  // Define toString for Pipeline
  typeStringMethods['Pipeline'] = function(indentation?: number): string {
    return generateToString('Pipeline', ['producer', 'consumer']).call(this, indentation);
  };

  // Define toString for VarDef
  typeStringMethods['VarDef'] = function(indentation?: number): string {
    return generateToString('VarDef', ['lvalue', 'rvalue']).call(this, indentation);
  };

  // Define toString for Block
  typeStringMethods['Block'] = function(indentation?: number): string {
    return generateToString('Block', ['vardefs', 'stmts']).call(this, indentation);
  };

  // Define toString for InStmt
  typeStringMethods['InStmt'] = function(indentation?: number): string {
    return generateToString('InStmt', ['values']).call(this, indentation);
  };

  // Define toString for OutStmt
  typeStringMethods['OutStmt'] = function(indentation?: number): string {
    return generateToString('OutStmt', ['values']).call(this, indentation);
  };

  // Define toString for IfStmt
  typeStringMethods['IfStmt'] = function(indentation?: number): string {
    return generateToString('IfStmt', ['condition', 'thenBlock', 'elseBlock']).call(this, indentation);
  };

  // Define toString for SubStmt
  typeStringMethods['SubStmt'] = function(indentation?: number): string {
    return generateToString('SubStmt', ['pipeline']).call(this, indentation);
  };

  // Store the methods for use in applyToString
  (global as any).__nileToStringMethods = typeStringMethods;
}

/**
 * Apply toString methods to a specific node instance
 * This is useful for dynamically created nodes that don't inherit from the prototype
 * @param node The node to add toString to
 */
export function applyToString(node: Node): Node & ToStringCapable {
  if (!node) return node as Node & ToStringCapable;

  const typeStringMethods = (global as any).__nileToStringMethods || {};

  if (typeStringMethods[node.type]) {
    return addToString(node, typeStringMethods[node.type]);
  }

  // For unknown node types, use a generic toString
  return addToString(node, generateToString(node.type, Object.keys(node)));
}
