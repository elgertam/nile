/**
 * Evaluator for Nile AST nodes
 */
import {
  Node, Type, TupleType, NumExpr, VarExpr, TupleExpr, RecFieldExpr, CondCase,
  CondExpr, OpExpr, ProcessInst, Pipeline, VarDef, Block, InStmt, OutStmt,
  IfStmt, SubStmt, OpBody, VarDecl, TuplePat, ProcessBody
} from './nodes';
import { Environment } from '../runtime/environment';
import { SubStmtException } from '../runtime/builtins';

/**
 * Coerce a value to match a type's structure
 * @param value The value to coerce
 * @param type The target type
 */
export function coerceValue(value: any, type: Type): any {
  const size = type.size ? type.size() : null;

  if (size === null) {
    // Primitive type
    if (Array.isArray(value)) {
      throw new Error('Cannot coerce aggregate to primitive');
    }
    return value;
  } else {
    // Aggregate type (tuple, record)
    if (Array.isArray(value)) {
      if (value.length !== size) {
        throw new Error(`Cannot coerce aggregate to different size aggregate: expected ${size}, got ${value.length}`);
      }
      return value;
    } else {
      // Duplicate the primitive value for each slot
      const result = [];
      for (let i = 0; i < size; i++) {
        result.push(value);
      }
      return result;
    }
  }
}

/**
 * Evaluate a number expression
 */
export function evalNumExpr(expr: NumExpr, env: Environment): number {
  return expr.value;
}

/**
 * Evaluate a variable expression
 */
export function evalVarExpr(expr: VarExpr, env: Environment): any {
  return env.getVarValue(expr.variable.name);
}

/**
 * Evaluate a tuple expression
 */
export function evalTupleExpr(expr: TupleExpr, env: Environment): any[] {
  return expr.elements.map(element => evalNode(element, env));
}

/**
 * Evaluate a record field expression
 */
export function evalRecFieldExpr(expr: RecFieldExpr, env: Environment): any {
  const record = evalNode(expr.record, env);
  return record[expr.field];
}

/**
 * Evaluate a conditional expression
 */
export function evalCondExpr(expr: CondExpr, env: Environment): any {
  // Get the type for result
  const resultType = expr.getType();
  const resultSize = resultType.size ? resultType.size() : null;

  let conditionType: Type;
  let result: any;

  if (resultSize === null) {
    // Primitive result
    conditionType = { type: 'PrimType' } as Type;
    result = null;
  } else {
    // Aggregate result
    conditionType = {
      type: 'TupleType',
      types: new Array(resultSize).fill({ type: 'PrimType' })
    } as TupleType;
    result = new Array(resultSize).fill(null);
  }

  // Process all cases
  for (const c of expr.cases) {
    const condition = coerceValue(evalNode(c.condition, env), conditionType);
    const value = coerceValue(evalNode(c.value, env), resultType);

    if (resultSize === null) {
      // Primitive result
      result = result === null && condition ? value : result;
    } else {
      // Aggregate result
      for (let j = 0; j < resultSize; j++) {
        result[j] = result[j] === null && condition[j] ? value[j] : result[j];
      }
    }
  }

  // Process the otherwise case
  const otherwise = evalNode(expr.otherwise, env);

  if (resultSize === null) {
    // Primitive result
    result = result === null ? otherwise : result;
  } else {
    // Aggregate result
    for (let j = 0; j < resultSize; j++) {
      result[j] = result[j] === null ? otherwise[j] : result[j];
    }
  }

  return result;
}

/**
 * Evaluate an operation body
 */
export function evalOpBody(body: OpBody, env: Environment): any {
  // Process variable definitions
  body.vardefs.forEach(vardef => evalVarDef(vardef, env));

  // Evaluate the result expression
  return evalNode(body.result, env);
}

/**
 * Evaluate an operation expression
 */
export function evalOpExpr(expr: OpExpr, env: Environment): any {
  const arg = evalNode(expr.arg, env);

  // Handle built-in operations implemented as functions
  if (typeof expr.op.body === 'function') {
    return expr.op.body(arg);
  }

  // Create a new environment for the operation
  const opEnv = new Environment();

  // Bind the parameter to the argument value
  bindValueToPattern(expr.op.sig.param, opEnv, arg);

  // Evaluate the operation body
  const result = evalOpBody(expr.op.body as OpBody, opEnv);

  // Coerce the result to match the return type
  return coerceValue(result, expr.op.sig.returnType);
}

/**
 * Evaluate a process instance
 */
export function evalProcessInst(inst: ProcessInst, env: Environment): ProcessInst {
  // Return a resolved ProcessInst to be used in a pipeline
  return {
    ...inst,
    arg: evalNode(inst.arg, env)
  } as ProcessInst;
}

/**
 * Run a process instance
 */
export function runProcessInst(inst: ProcessInst, env: Environment): void {
  const processdef = inst.processdef as any;

  // Set up the environment
  env.setVars({});
  if (processdef.body.eval) {
    env.traceOutput = [];
  }
  env.traceRanges = [];

  if (processdef.sig.location) {
    env.traceRanges.push([
      processdef.sig.location.start,
      processdef.sig.location.end
    ]);
  }

  // Bind the process parameter to the argument value
  bindValueToPattern(processdef.sig.param, env, inst.arg);

  try {
    // Execute prologue
    if (typeof processdef.prologue === 'function') {
      processdef.prologue(env);
    } else {
      evalBlock(processdef.prologue as Block, env);
    }

    // Execute body
    if (typeof processdef.body === 'function') {
      processdef.body(env);
    } else {
      evalProcessBody(processdef.body as ProcessBody, env);
    }

    // Execute epilogue
    if (typeof processdef.epilogue === 'function') {
      processdef.epilogue(env);
    } else {
      evalBlock(processdef.epilogue as Block, env);
    }
  } catch (e) {
    // Allow SubStmt exceptions to propagate
    if (e === SubStmtException) {
      throw e;
    }
    throw e;
  }
}

/**
 * Run a pipeline
 */
export function runPipeline(pipeline: Pipeline, env: Environment): void {
  // Run the producer
  runProcessInst(pipeline.producer, env);

  // If there's a consumer, run it with the producer's output as input
  if (pipeline.consumer) {
    env.swapInputAndOutput();
    runProcessInst(pipeline.consumer, env);
  }
}

/**
 * Evaluate a process body
 */
export function evalProcessBody(body: ProcessBody, env: Environment): void {
  // Process input values one by one
  while (env.hasInput()) {
    // Bind the current input to the pattern
    bindValueToPattern(body.forpat, env, env.consumeInput());

    // Execute the block
    evalBlock(body.block, env);

    // Update variables with primed versions
    const vars = env.getVars();
    const primedVars: Record<string, any> = {};

    // Find all primed variables (ending with ')
    for (const v in vars) {
      if (v.endsWith("'")) {
        primedVars[v] = vars[v];
      }
    }

    // Update original variables with primed values
    for (const v in primedVars) {
      const originalName = v.slice(0, -1); // Remove the prime
      vars[originalName] = primedVars[v];
    }

    env.setVars(vars);
  }
}

/**
 * Evaluate a variable definition
 */
export function evalVarDef(vardef: VarDef, env: Environment): void {
  // Evaluate the right-hand side
  const value = evalNode(vardef.rvalue, env);

  // Bind the value to the pattern on the left-hand side
  bindValueToPattern(vardef.lvalue, env, value);
}

/**
 * Bind a value to a pattern
 */
export function bindValueToPattern(pattern: VarDecl | TuplePat, env: Environment, value: any): void {
  if (pattern.type === 'VarDecl') {
    // Simple variable binding
    const vardecl = pattern as VarDecl;
    env.setVarValue(vardecl.name, coerceValue(value, vardecl.getType()));
  } else if (pattern.type === 'TuplePat') {
    // Tuple pattern binding
    const tuplePat = pattern as TuplePat;
    tuplePat.elements.forEach((element, i) => {
      bindValueToPattern(element as VarDecl, env, value[i]);
    });
  }
}

/**
 * Evaluate a block of statements
 */
export function evalBlock(block: Block, env: Environment): void {
  // Process variable definitions
  block.vardefs.forEach(vardef => evalVarDef(vardef, env));

  // Execute statements
  block.stmts.forEach(stmt => evalNode(stmt, env));
}

/**
 * Evaluate an input statement
 */
export function evalInStmt(stmt: InStmt, env: Environment): void {
  // Evaluate values and add them to the input queue in reverse order
  for (let i = 0; i < stmt.values.length; i++) {
    env.prefixInput(evalNode(stmt.values[i], env));
  }
}

/**
 * Evaluate an output statement
 */
export function evalOutStmt(stmt: OutStmt, env: Environment): void {
  // Evaluate values and add them to the output queue in reverse order
  for (let i = stmt.values.length - 1; i >= 0; i--) {
    env.appendOutput(evalNode(stmt.values[i], env));
    env.appendTrace();
  }
}

/**
 * Evaluate an if statement
 */
export function evalIfStmt(stmt: IfStmt, env: Environment): void {
  const condition = evalNode(stmt.condition, env);

  if (condition) {
    evalBlock(stmt.thenBlock, env);
  } else {
    evalBlock(stmt.elseBlock, env);
  }
}

/**
 * Exception type for subprocess statements
 */
export const SubStmtException = {};

/**
 * Evaluate a subprocess statement
 */
export function evalSubStmt(stmt: SubStmt, env: Environment): void {
  // Evaluate the pipeline
  const pipeline = evalNode(stmt.pipeline, env) as Pipeline;

  // Run the pipeline
  runPipeline(pipeline, env);

  // Throw special exception to exit the current process
  throw SubStmtException;
}

/**
 * Generic evaluator that dispatches to the appropriate function based on node type
 */
export function evalNode(node: Node, env: Environment): any {
  if (!node) return undefined;

  switch (node.type) {
    case 'NumExpr':
      return evalNumExpr(node as NumExpr, env);
    case 'VarExpr':
      return evalVarExpr(node as VarExpr, env);
    case 'TupleExpr':
      return evalTupleExpr(node as TupleExpr, env);
    case 'RecFieldExpr':
      return evalRecFieldExpr(node as RecFieldExpr, env);
    case 'CondExpr':
      return evalCondExpr(node as CondExpr, env);
    case 'OpExpr':
      return evalOpExpr(node as OpExpr, env);
    case 'ProcessInst':
      return evalProcessInst(node as ProcessInst, env);
    case 'VarDef':
      evalVarDef(node as VarDef, env);
      return undefined;
    case 'Block':
      evalBlock(node as Block, env);
      return undefined;
    case 'InStmt':
      evalInStmt(node as InStmt, env);
      return undefined;
    case 'OutStmt':
      evalOutStmt(node as OutStmt, env);
      return undefined;
    case 'IfStmt':
      evalIfStmt(node as IfStmt, env);
      return undefined;
    case 'SubStmt':
      evalSubStmt(node as SubStmt, env);
      return undefined;
    case 'Pipeline':
      return node; // Pipelines are evaluated when run
    default:
      // For nodes we don't have specific handlers for, try to evaluate their properties
      const result: any = { ...node };

      // We need to handle node-specific properties, but as a fallback
      // we try to evaluate any properties that look like AST nodes
      for (const key in result) {
        const value = (result as any)[key];
        if (value && typeof value === 'object' && value.type) {
          result[key] = evalNode(value, env);
        } else if (Array.isArray(value)) {
          result[key] = value.map((item: any) => {
            if (item && typeof item === 'object' && item.type) {
              return evalNode(item, env);
            }
            return item;
          });
        }
      }

      return result;
  }
}
