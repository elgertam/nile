/**
 * Built-in operations and processes for Nile
 */
import { Environment } from './environment';
import {
  Type, TypeDef, OpDef, OpSig, ProcessDef, ProcessSig, ProcessType,
  createAnyType, createProcessType
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
      // Get the input, process it, and set it as output
      const input = env.getInput().slice();
      env.setInput([]);
      input.forEach(item => env.appendOutput(item));
    },
    epilogue: (env: Environment) => { }
  },

  {
    sig: "Reverse () : α >> α",
    prologue: (env: Environment) => { },
    body: (env: Environment) => {
      // Reverse the input and swap input/output
      const input = env.getInput().slice();
      env.setInput([]);
      input.reverse().forEach(item => env.appendOutput(item));
    },
    epilogue: (env: Environment) => { }
  },

  {
    sig: "SortBy (f:Number) : α >> α",
    prologue: (env: Environment) => { },
    body: (env: Environment) => {
      const f = env.getVarValue("f") - 1;
      const input = env.getInput().slice();
      env.setInput([]);

      const sorted = stableSort(input, (a: any) => a[f]);
      sorted.forEach(item => env.appendOutput(item));
    },
    epilogue: (env: Environment) => { }
  },

  {
    sig: "DupZip (p1:(α >> β), p2:(α >> γ)) : α >> (β, γ)",
    prologue: (env: Environment) => {
      const p1 = env.getVarValue("p1");
      const p2 = env.getVarValue("p2");
      const input = env.getInput().slice();

      // Execute the first process
      env.setInput(input);
      p1.run(env);
      const output1 = env.getOutput().slice();

      // Reset for the second process
      env.setInput(input);
      env.setOutput([]);

      // Execute the second process
      p2.run(env);
      const output2 = env.getOutput().slice();

      // Create zipped output
      env.setOutput([]);
      for (let i = 0; i < Math.min(output1.length, output2.length); i++) {
        env.appendOutput([output1[i], output2[i]]);
      }

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
      const input = env.getInput().slice();

      // Execute the first process
      env.setInput(input);
      p1.run(env);
      const output1 = env.getOutput().slice();

      // Reset for the second process
      env.setInput(input);
      env.setOutput([]);

      // Execute the second process
      p2.run(env);
      const output2 = env.getOutput().slice();

      // Create concatenated output
      env.setOutput([]);
      output1.forEach(item => env.appendOutput(item));
      output2.forEach(item => env.appendOutput(item));

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
export const SubStmtException = Symbol('SubStmtException');

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

    // Create a ProcessType from the signature
    let processType: ProcessType;
    if (sig.processType) {
      processType = sig.processType;
    } else {
      processType = createProcessType(
        createAnyType(),
        createAnyType(),
        sig.location
      );
    }

    const resolvedProcess: ProcessDef = {
      type: 'ProcessDef',
      sig: {
        ...sig,
        processType
      },
      prologue: pdef.prologue,
      body: pdef.body,
      epilogue: pdef.epilogue,
      getType: () => processType
    };

    env.addProcessdef(resolvedProcess);
  });
}
