/**
 * Resolver for Nile AST nodes
 * Handles name resolution and type checking
 */
import {
  Node, Type, TypeRef, TypeDef, VarDecl, TuplePat, NumExpr, VarExpr, TupleExpr,
  RecFieldExpr, OpExpr, OpSig, OpDef, ProcessSig, ProcessBody, ProcessDef,
  ProcessInst, VarDef, Block
} from './nodes';
import { Environment } from '../runtime/environment';
import { getNodeType, areTypesEqual } from './typeChecker';

/**
 * Resolve a type reference in the given environment
 */
export function resolveType(type: Type, env: Environment): Type {
  if (type.type === 'TypeRef') {
    const typeRef = type as TypeRef;
    const resolvedType = env.getTypedef(typeRef.name);
    if (resolvedType) {
      return resolvedType.definition;
    }
    return type; // Keep the reference if not found
  }
  
  // Recursively resolve inner types for compound types
  if (type.type === 'TupleType') {
    const tupleType = { ...type } as any;
    tupleType.types = tupleType.types.map((innerType: Type) => resolveType(innerType, env));
    return tupleType;
  }
  
  if (type.type === 'RecordType') {
    const recordType = { ...type } as any;
    recordType.fields = recordType.fields.map((field: VarDecl) => resolveVarDecl(field, env));
    return recordType;
  }
  
  if (type.type === 'ProcessType') {
    const processType = { ...type } as any;
    processType.intype = resolveType(processType.intype, env);
    processType.outtype = resolveType(processType.outtype, env);
    return processType;
  }
  
  return type;
}

/**
 * Resolve a variable declaration in the given environment
 */
export function resolveVarDecl(vardecl: VarDecl, env: Environment): VarDecl {
  const resolvedType = resolveType(vardecl.varType, env);
  const newVarDecl = {
    ...vardecl,
    varType: resolvedType,
    getType: () => resolvedType
  };
  
  return env.addVardecl(newVarDecl);
}

/**
 * Resolve a variable declaration with a specific type
 */
export function resolveVarDeclWithType(vardecl: VarDecl, env: Environment, type: Type): VarDecl {
  // If the vardecl has AnyType, use the provided type instead
  const resolvedType = vardecl.varType.type === 'AnyType' ? 
    resolveType(type, env) : 
    resolveType(vardecl.varType, env);
  
  const newVarDecl = {
    ...vardecl,
    varType: resolvedType,
    getType: () => resolvedType
  };
  
  return env.addVardecl(newVarDecl);
}

/**
 * Resolve a tuple pattern with a specific type
 */
export function resolveTuplePatWithType(pat: TuplePat, env: Environment, type: Type): TuplePat {
  const resolvedType = resolveType(type, env);
  
  if (resolvedType.type !== 'TupleType') {
    throw new Error(`Cannot resolve tuple pattern with non-tuple type: ${resolvedType.type}`);
  }
  
  const tupleType = resolvedType as any;
  const resolvedElements = pat.elements.map((element, i) => {
    if (i < tupleType.types.length) {
      return resolveVarDeclWithType(element as VarDecl, env, tupleType.types[i]);
    }
    return resolveVarDecl(element as VarDecl, env);
  });
  
  return {
    ...pat,
    elements: resolvedElements,
    getType: () => resolvedType
  };
}

/**
 * Resolve a number expression
 */
export function resolveNumExpr(expr: NumExpr, env: Environment): NumExpr {
  // Nothing to resolve for a number expression
  return expr;
}

/**
 * Resolve a variable expression
 */
export function resolveVarExpr(expr: VarExpr, env: Environment): VarExpr {
  // Get the variable declaration from the environment
  const vardecl = env.getVardecl(expr.variable.name);
  if (!vardecl) {
    throw new Error(`Variable not found: ${expr.variable.name}`);
  }
  
  return {
    ...expr,
    variable: vardecl,
    getType: () => vardecl.getType()
  };
}

/**
 * Resolve a record field expression
 */
export function resolveRecFieldExpr(expr: RecFieldExpr, env: Environment): RecFieldExpr {
  const resolvedRecord = resolveNode(expr.record, env) as any;
  const recordType = getNodeType(resolvedRecord);
  
  // If field is a number, use it directly; otherwise, get the field index by name
  let fieldIndex: number;
  if (typeof expr.field === 'number') {
    fieldIndex = expr.field;
  } else {
    if (recordType.type === 'RecordType') {
      const rec = recordType as any;
      fieldIndex = rec.fields.findIndex((f: VarDecl) => f.name === expr.field);
    } else if (recordType.type === 'TupleType') {
      fieldIndex = parseInt(expr.field as string, 10);
    } else {
      throw new Error(`Cannot access field of non-record/tuple type: ${recordType.type}`);
    }
  }
  
  if (fieldIndex < 0) {
    throw new Error(`Field not found: ${expr.field}`);
  }
  
  return {
    ...expr,
    record: resolvedRecord,
    field: fieldIndex,
    getType: () => {
      const recordType = getNodeType(resolvedRecord);
      if (recordType.type === 'RecordType') {
        const rec = recordType as any;
        return rec.fields[fieldIndex].getType();
      } else if (recordType.type === 'TupleType') {
        const tup = recordType as any;
        return tup.types[fieldIndex];
      }
      throw new Error(`Cannot get type of field ${fieldIndex} from type ${recordType.type}`);
    }
  };
}

/**
 * Resolve an operation expression
 */
export function resolveOpExpr(expr: OpExpr, env: Environment): OpExpr {
  if (expr.isChainedRelational()) {
    // Chained relational expressions need special handling
    return resolveNode(expr.unchainRelational(), env) as OpExpr;
  }
  
  // Resolve the argument(s)
  let resolvedArg: any;
  if (Array.isArray(expr.arg)) {
    resolvedArg = expr.arg.map(a => resolveNode(a, env));
  } else {
    resolvedArg = resolveNode(expr.arg, env);
  }
  
  // Get the type of the arg(s)
  let argType: Type;
  if (Array.isArray(resolvedArg)) {
    argType = {
      type: 'TupleType',
      types: resolvedArg.map(getNodeType)
    };
  } else {
    argType = getNodeType(resolvedArg);
  }
  
  // Find the matching operation in the environment
  const op = env.getOpdef(expr.op.sig.name, expr.fixity, argType);
  if (!op) {
    throw new Error(`Operation not found: ${expr.op.sig.name} with fixity ${expr.fixity}`);
  }
  
  return {
    ...expr,
    op,
    arg: resolvedArg,
    getType: () => op.getType()
  };
}

/**
 * Resolve a process instance
 */
export function resolveProcessInst(inst: ProcessInst, env: Environment): ProcessInst {
  const resolvedArg = resolveNode(inst.arg, env) as any;
  
  // If processdef is a string, look it up in the environment
  let processdef: ProcessDef;
  if (typeof inst.processdef === 'string') {
    const pd = env.getProcessdef(inst.processdef);
    if (!pd) {
      throw new Error(`Process not found: ${inst.processdef}`);
    }
    processdef = pd;
  } else {
    processdef = inst.processdef as ProcessDef;
  }
  
  return {
    ...inst,
    processdef,
    arg: resolvedArg,
    getType: () => processdef.getType()
  };
}

/**
 * Resolve a variable definition
 */
export function resolveVarDef(vardef: VarDef, env: Environment): VarDef {
  const resolvedRvalue = resolveNode(vardef.rvalue, env) as any;
  const rvalueType = getNodeType(resolvedRvalue);
  
  let resolvedLvalue: VarDecl | TuplePat;
  if (vardef.lvalue.type === 'VarDecl') {
    resolvedLvalue = resolveVarDeclWithType(vardef.lvalue as VarDecl, env, rvalueType);
  } else {
    resolvedLvalue = resolveTuplePatWithType(vardef.lvalue as TuplePat, env, rvalueType);
  }
  
  return {
    ...vardef,
    lvalue: resolvedLvalue,
    rvalue: resolvedRvalue
  };
}

/**
 * Resolve an operation signature
 */
export function resolveOpSig(sig: OpSig, env: Environment): OpSig {
  const resolvedParam = resolveNode(sig.param, env) as any;
  const resolvedType = resolveType(sig.returnType, env);
  
  return {
    ...sig,
    param: resolvedParam,
    returnType: resolvedType,
    getType: () => resolvedType
  };
}

/**
 * Resolve an operation definition
 */
export function resolveOpDef(def: OpDef, env: Environment): OpDef {
  env.pushScope();
  
  const resolvedSig = resolveOpSig(def.sig, env) as any;
  let resolvedBody: any;
  
  if (typeof def.body === 'function') {
    resolvedBody = def.body;
  } else {
    resolvedBody = resolveNode(def.body, env);
  }
  
  env.popScope();
  
  const result = {
    ...def,
    sig: resolvedSig,
    body: resolvedBody,
    getType: () => resolvedSig.getType(),
    matchSig: (name: string, fixity: string, argType: Type) => {
      return resolvedSig.name === name && 
             resolvedSig.fixity === fixity && 
             areTypesEqual(resolvedSig.param.getType(), argType);
    }
  };
  
  return env.addOpdef(result);
}

/**
 * Resolve a process signature
 */
export function resolveProcessSig(sig: ProcessSig, env: Environment): ProcessSig {
  const resolvedParam = resolveNode(sig.param, env) as any;
  const resolvedType = resolveType(sig.processType, env);
  
  const result = {
    ...sig,
    param: resolvedParam,
    processType: resolvedType,
    getType: () => resolvedType
  };
  
  // Add a provisional process definition to support recursive references
  env.addProcessdef({
    type: 'ProcessDef',
    sig: result,
    prologue: () => {},
    body: () => {},
    epilogue: () => {},
    getType: () => resolvedType
  });
  
  return result;
}

/**
 * Resolve a process body in the context of a specific type
 */
export function resolveProcessBodyWithType(body: ProcessBody, env: Environment, type: Type): ProcessBody {
  const intype = type.type === 'ProcessType' ? 
    (type as any).intype : 
    type;
  
  const resolvedForpat = body.forpat.type === 'VarDecl' ?
    resolveVarDeclWithType(body.forpat as VarDecl, env, intype) :
    resolveTuplePatWithType(body.forpat as TuplePat, env, intype);
  
  const resolvedBlock = resolveNode(body.block, env) as any;
  
  return {
    ...body,
    forpat: resolvedForpat,
    block: resolvedBlock
  };
}

/**
 * Resolve a process definition
 */
export function resolveProcessDef(def: ProcessDef, env: Environment): ProcessDef {
  env.pushScope();
  
  const resolvedSig = resolveProcessSig(def.sig, env) as any;
  let resolvedPrologue: any;
  let resolvedBody: any;
  let resolvedEpilogue: any;
  
  if (typeof def.prologue === 'function') {
    resolvedPrologue = def.prologue;
  } else {
    resolvedPrologue = resolveNode(def.prologue, env);
  }
  
  if (def.body) {
    if (typeof def.body === 'function') {
      resolvedBody = def.body;
    } else {
      const intype = resolvedSig.processType.intype;
      env.pushScope();
      resolvedBody = resolveProcessBodyWithType(def.body as ProcessBody, env, intype);
      env.popScope();
    }
  } else {
    // Use a default pass-through body if none provided
    const passthroughProcess = env.getProcessdef("PassThrough");
    resolvedBody = passthroughProcess ? passthroughProcess.body : ((env: any) => {
      env.output = env.output.concat(env.input);
      env.input = [];
    });
  }
  
  if (typeof def.epilogue === 'function') {
    resolvedEpilogue = def.epilogue;
  } else {
    resolvedEpilogue = resolveNode(def.epilogue, env);
  }
  
  env.popScope();
  
  const result = {
    ...def,
    sig: resolvedSig,
    prologue: resolvedPrologue,
    body: resolvedBody,
    epilogue: resolvedEpilogue,
    getType: () => resolvedSig.getType()
  };
  
  return env.addProcessdef(result);
}

/**
 * Resolve a block of code
 */
export function resolveBlock(block: Block, env: Environment): Block {
  const resolvedVardefs = block.vardefs.map(v => resolveVarDef(v, env));
  const resolvedStmts = block.stmts.map(s => resolveNode(s, env));
  
  return {
    ...block,
    vardefs: resolvedVardefs,
    stmts: resolvedStmts,
    isEmpty: () => resolvedVardefs.length === 0 && resolvedStmts.length === 0
  };
}

/**
 * Generic resolver that dispatches to the appropriate function based on node type
 */
export function resolveNode(node: Node, env: Environment): Node {
  if (!node) return node;
  
  const location = (node as any).location;
  
  switch (node.type) {
    case 'TypeRef':
      return resolveType(node as Type, env);
    case 'VarDecl':
      return resolveVarDecl(node as VarDecl, env);
    case 'TuplePat':
      return resolveTuplePatWithType(node as TuplePat, env, (node as TuplePat).getType());
    case 'NumExpr':
      return resolveNumExpr(node as NumExpr, env);
    case 'VarExpr':
      return resolveVarExpr(node as VarExpr, env);
    case 'RecFieldExpr':
      return resolveRecFieldExpr(node as RecFieldExpr, env);
    case 'OpExpr':
      return resolveOpExpr(node as OpExpr, env);
    case 'ProcessInst':
      return resolveProcessInst(node as ProcessInst, env);
    case 'VarDef':
      return resolveVarDef(node as VarDef, env);
    case 'OpSig':
      return resolveOpSig(node as OpSig, env);
    case 'OpDef':
      return resolveOpDef(node as OpDef, env);
    case 'ProcessSig':
      return resolveProcessSig(node as ProcessSig, env);
    case 'ProcessDef':
      return resolveProcessDef(node as ProcessDef, env);
    case 'Block':
      return resolveBlock(node as Block, env);
    default:
      // For nodes we don't have specific handlers for, try to resolve their properties
      const result: any = { ...node };
      
      // Add back location info
      if (location) {
        result.location = location;
      }
      
      // We need to handle node-specific properties, but as a fallback
      // we try to resolve any properties that look like AST nodes
      for (const key in result) {
        const value = (result as any)[key];
        if (value && typeof value === 'object' && value.type) {
          result[key] = resolveNode(value, env);
        } else if (Array.isArray(value)) {
          result[key] = value.map((item: any) => {
            if (item && typeof item === 'object' && item.type) {
              return resolveNode(item, env);
            }
            return item;
          });
        }
      }
      
      return result;
  }
}

/**
 * Wrapper to add source code range information to resolved nodes
 */
export function resolveWithSourceRange(node: Node, env: Environment): Node {
  const range = (node as any).location;
  const result = resolveNode(node, env);
  
  if (range && result && typeof result === 'object') {
    (result as any).location = range;
  }
  
  return result;
}
