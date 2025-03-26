/**
 * TypeScript definitions for Nile AST nodes
 */

export interface SourceLocation {
  start: number;
  end: number;
}

export interface Node {
  type: string;
  location?: SourceLocation;
}

// --- Types ---

export interface Type extends Node {
  size(): number | null;
  isEqual(other: Type): boolean;
  getInnerTypes?(): Type[];
  getField?(index: number): VarDecl;
  getFieldIndex?(fieldName: string): number;
  getIntype?(): Type;
  getOuttype?(): Type;
}

export interface PrimType extends Type {
  type: 'PrimType';
}

export interface AnyType extends Type {
  type: 'AnyType';
}

export interface TupleType extends Type {
  type: 'TupleType';
  types: Type[];
}

export interface RecordType extends Type {
  type: 'RecordType';
  fields: VarDecl[];
}

export interface ProcessType extends Type {
  type: 'ProcessType';
  intype: Type;
  outtype: Type;
}

export interface TypeRef extends Type {
  type: 'TypeRef';
  name: string;
}

export interface TypeDef extends Node {
  type: 'TypeDef';
  name: string;
  definition: Type;
}

// --- Variables and Patterns ---

export interface VarDecl extends Node {
  type: 'VarDecl';
  name: string;
  varType: Type;
  getType(): Type;
}

export interface TuplePat extends Node {
  type: 'TuplePat';
  elements: VarDecl[];
  getType(): TupleType;
}

export interface VarDef extends Node {
  type: 'VarDef';
  lvalue: VarDecl | TuplePat;
  rvalue: Expression;
}

// --- Expressions ---

export interface Expression extends Node {
  getType(): Type;
  eval?(env: any): any;
}

export interface NumExpr extends Expression {
  type: 'NumExpr';
  value: number;
}

export interface VarExpr extends Expression {
  type: 'VarExpr';
  variable: VarDecl;
}

export interface TupleExpr extends Expression {
  type: 'TupleExpr';
  elements: Expression[];
}

export interface RecFieldExpr extends Expression {
  type: 'RecFieldExpr';
  record: Expression;
  field: string | number;
}

export interface CondCase extends Node {
  type: 'CondCase';
  value: Expression;
  condition: Expression;
  getType(): Type;
}

export interface CondExpr extends Expression {
  type: 'CondExpr';
  cases: CondCase[];
  otherwise: Expression;
}

export interface OpExpr extends Expression {
  type: 'OpExpr';
  op: OpDef;
  fixity: 'in' | 'pre' | 'post' | 'out';
  arg: Expression | [Expression, Expression];
  isInfixRelational(): boolean;
  isChainedRelational(): boolean;
  unchainRelational(): OpExpr;
}

// --- Operations ---

export interface OpSig extends Node {
  type: 'OpSig';
  name: string;
  fixity: 'in' | 'pre' | 'post' | 'out';
  param: VarDecl | TuplePat;
  returnType: Type;
  getType(): Type;
}

export interface OpBody extends Node {
  type: 'OpBody';
  vardefs: VarDef[];
  result: Expression;
  getType(): Type;
}

export interface OpDef extends Node {
  type: 'OpDef';
  sig: OpSig;
  body: OpBody | Function;
  getType(): Type;
  matchSig(name: string, fixity: string, argType: Type): boolean;
}

// --- Processes ---

export interface ProcessSig extends Node {
  type: 'ProcessSig';
  name: string;
  param: VarDecl | TuplePat;
  processType: ProcessType;
  getType(): ProcessType;
}

export interface ProcessBody extends Node {
  type: 'ProcessBody';
  forpat: VarDecl | TuplePat;
  block: Block;
}

export interface ProcessDef extends Node {
  type: 'ProcessDef';
  sig: ProcessSig;
  prologue: Block | Function;
  body: ProcessBody | Function;
  epilogue: Block | Function;
  getType(): ProcessType;
}

export interface ProcessInst extends Expression {
  type: 'ProcessInst';
  processdef: ProcessDef | string;
  arg: Expression;
  run?(env: any): void;
}

export interface Pipeline extends Node {
  type: 'Pipeline';
  producer: ProcessInst;
  consumer: ProcessInst | null;
  run?(env: any): void;
}

// --- Statements ---

export interface Statement extends Node {
  eval?(env: any): any;
}

export interface Block extends Node {
  type: 'Block';
  vardefs: VarDef[];
  stmts: Statement[];
  isEmpty(): boolean;
  eval?(env: any): any;
}

export interface InStmt extends Statement {
  type: 'InStmt';
  values: Expression[];
}

export interface OutStmt extends Statement {
  type: 'OutStmt';
  values: Expression[];
}

export interface IfStmt extends Statement {
  type: 'IfStmt';
  condition: Expression;
  thenBlock: Block;
  elseBlock: Block;
}

export interface SubStmt extends Statement {
  type: 'SubStmt';
  pipeline: Pipeline;
}

// Factory functions for creating AST nodes
export function createPrimType(location?: SourceLocation): PrimType {
  return { type: 'PrimType', location };
}

export function createAnyType(location?: SourceLocation): AnyType {
  return { type: 'AnyType', location };
}

export function createTupleType(types: Type[], location?: SourceLocation): TupleType {
  return { type: 'TupleType', types, location };
}

export function createRecordType(fields: VarDecl[], location?: SourceLocation): RecordType {
  return { type: 'RecordType', fields, location };
}

export function createProcessType(intype: Type, outtype: Type, location?: SourceLocation): ProcessType {
  return { type: 'ProcessType', intype, outtype, location };
}

export function createTypeRef(name: string, location?: SourceLocation): TypeRef {
  return { type: 'TypeRef', name, location };
}

export function createTypeDef(name: string, definition: Type, location?: SourceLocation): TypeDef {
  return { type: 'TypeDef', name, definition, location };
}

export function createVarDecl(name: string, varType: Type, location?: SourceLocation): VarDecl {
  return { 
    type: 'VarDecl', 
    name, 
    varType, 
    location,
    getType: () => varType
  };
}

export function createTuplePat(elements: VarDecl[], location?: SourceLocation): TuplePat {
  return { 
    type: 'TuplePat', 
    elements, 
    location,
    getType: () => createTupleType(elements.map(e => e.getType()))
  };
}

export function createVarDef(lvalue: VarDecl | TuplePat, rvalue: Expression, location?: SourceLocation): VarDef {
  return { type: 'VarDef', lvalue, rvalue, location };
}

export function createNumExpr(value: number, location?: SourceLocation): NumExpr {
  return { 
    type: 'NumExpr', 
    value, 
    location,
    getType: () => createTypeRef('Number')
  };
}

export function createBlock(vardefs: VarDef[], stmts: Statement[], location?: SourceLocation): Block {
  return { 
    type: 'Block', 
    vardefs, 
    stmts, 
    location,
    isEmpty: () => vardefs.length === 0 && stmts.length === 0
  };
}
