/**
 * Built-in operations and processes for Nile
 */
import { Environment } from './environment';
import { 
  Type, TypeDef, OpDef, OpSig, ProcessDef, ProcessSig, ProcessType
} from '../ast/nodes';
import { parseNile } from '../parser/semantics';

/**
 * Builtin type definitions
 */
const BUILTIN_TYPEDEFS = [
  "type Boolean",
  "type Number"
];

/**
 * Builtin operation definitions
 */
const BUILTIN_OPDEFS = [
  {
    sig: "¬a:Boolean : Boolean",
    body: (arg: boolean) => !arg
  },
  {
    sig: "a:Boolean ∨ b:Boolean : Boolean",
    body: (arg: [boolean, boolean]) => arg[0] || arg[1]
  },
  {
    sig: "a:Boolean ∧ b:Boolean : Boolean",
    body: (arg: [boolean, boolean]) => arg[0] && arg[1]
  },
  {
    sig: "-a:Number : Number",
    body: (arg: number) => -arg
  },
  {
    sig: "√a:Number : Number",
    body: (arg: number) => Math.sqrt(arg)
  },
  {
    sig: "⌊a:Number⌋ : Number",
    body: (arg: number) => Math.floor(arg)
  },
  {
    sig: "⌈a:Number⌉ : Number",
    body: (arg: number) => Math.ceil(arg)
  },
  {
    sig: "a:Number = b:Number : Boolean",
    body: (arg: [number, number]) => arg[0] === arg[1]
  },
  {
    sig: "a:Number ≠ b:Number : Boolean",
    body: (arg: [number, number]) => arg[0] !== arg[1]
  },
  {
    sig: "a:Number < b:Number : Boolean",
    body: (arg: [number, number]) => arg[0] < arg[1]
  },
  {
    sig: "a:Number ≤ b:Number : Boolean",
    body: (arg: [number, number]) => arg[0] <= arg[1]
  },
  {
    sig: "a:Number > b:Number : Boolean",
    body: (arg: [number, number]) => arg[0] > arg[1]
  },
  {
    sig: "a:Number ≥ b:Number : Boolean",
    body: (arg: [number, number]) => arg[0] >= arg[1]
  },
  {
    sig: "a:Number + b:Number : Number",
    body: (arg: [number, number]) => arg[0] + arg[1]
  },
  {
    sig: "a:Number - b:Number : Number",
    body: (arg: [number, number]) => arg[0] - arg[1]
  },
  {
    sig: "a:Number   b:Number : Number",
    body: (arg: [number, number]) => arg[0] * arg[1]
  },
  {
    sig: "a:Number / b:Number : Number",
    body: (arg: [number, number]) => arg[0] / arg[1]
  }
];

/**
 * Builtin process definitions
 */
const BUILTIN_PROCESSDEFS = [
  {
    sig: "PassThrough () : α >> α",
    prologue: (env: Environment) => { },
    body: (env: Environment) => {
      env.output = env.output.concat(env.input);
      env.input = [];
    },
    epilogue: (env: Environment) => { }
  },
  
  {
    sig: "Reverse () : α >> α",
    prologue: (env: Environment) => { },
    body: (env: Environment) => {
      env.input.reverse();
      env.swapInputAndOutput();
    },
    epilogue: (env: Environment) => { }
  },
  
  {
    sig: "SortBy (f:Number) : α >> α",
    prologue: (env: Environment) => { },
    body: (env: Environment) => {
      const f = env.getVarValue("f") - 1;
      env.input = stableSort(env.input, (a: any) => a[f]);
      env.swapInputAndOutput();
    },
    epilogue: (env: Environment) => { }
  },
  
  {
    sig: "DupZip (p1:(α >> β), p2:(α >> γ)) : α >> (β, γ)",
    prologue: (env: Environment) => {
      const p1 = env.getVarValue("p1");
      const p2 = env.getVarValue("p2");
      const input = env.input.slice(0);
      
      p1.run(env);
      const output1 = env.output;
      
      env.input = input;
      env.output = [];
      
      p2.run(env);
      const output2 = env.output;
      
      env.output = output1.map((e: any, i: number) => [e, output2[i]]);
      throw SubStmtException;
    },
    body: (env: Environment) => { },
    epilogue: (env: Environment) => { }
  },
  
  {
    sig: "DupCat (p1:(α >> β), p2:(α >> β)) : α >> β",
    prologue: (env: Environment) => {
      const p1 = env.getVarValue("p1");
      const p2 = env.getVarValue("p2");
      const input = env.input.slice(0);
      
      p1.run(env);
      const output1 = env.output;
      
      env.input = input;
      env.output = [];
      
      p2.run(env);
      const output2 = env.output;
      
      env.output = output1.concat(output2);
      throw SubStmtException;
    },
    body: (env: Environment) => { },
    epilogue: (env: Environment) => { }
  }
];

/**
 * Stable sort that preserves order of equal elements
 */
function stableSort<T>(array: T[], extractor: (item: T) => number): T[] {
  const keysIndicesValues = array.map((value, index) => [
    extractor(value), index, value
  ]);
  
  keysIndicesValues.sort((a, b) => {
    const result = (a[0] as number) - (b[0] as number);
    return result === 0 ? (a[1] as number) - (b[1] as number) : result;
  });
  
  return keysIndicesValues.map(kiv => kiv[2] as T);
}

/**
 * Exception for subprocess statements
 */
export const SubStmtException = {};

/**
 * Initialize the environment with builtin operations and processes
 */
export function initBuiltins(env: Environment, parser: any): void {
  // Add builtin types
  BUILTIN_TYPEDEFS.forEach(typedef => {
    parser.matchAll(typedef, "TypeDef").resolve(env);
  });
  
  // Add builtin operations
  BUILTIN_OPDEFS.forEach(opdef => {
    env.pushScope();
    const sig = parser.matchAll(opdef.sig, "OpSig").resolve(env) as OpSig;
    env.popScope();
    
    const resolvedOp: OpDef = {
      type: 'OpDef',
      sig,
      body: opdef.body,
      getType: () => sig.returnType,
      matchSig: (name: string, fixity: string, argType: Type) => {
        return sig.name === name && 
               sig.fixity === fixity && 
               sig.param.getType().isEqual(argType);
      }
    };
    
    env.addOpdef(resolvedOp);
  });
  
  // Add builtin processes
  BUILTIN_PROCESSDEFS.forEach(pdef => {
    env.pushScope();
    const sig = parser.matchAll(pdef.sig, "ProcessSig").resolve(env) as ProcessSig;
    env.popScope();
    
    const resolvedProcess: ProcessDef = {
      type: 'ProcessDef',
      sig,
      prologue: pdef.prologue,
      body: pdef.body,
      epilogue: pdef.epilogue,
      getType: () => sig.processType
    };
    
    env.addProcessdef(resolvedProcess);
  });
}
