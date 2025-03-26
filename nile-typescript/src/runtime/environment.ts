/**
 * Nile runtime environment implementation
 */
import { 
  Type, TypeDef, VarDecl, OpDef, ProcessDef, ProcessInst, 
  Expression, Statement
} from '../ast/nodes';

/**
 * Environment scope for variable, type, and function definitions
 */
interface Scope {
  [key: string]: VarDecl;
}

/**
 * Runtime variable value
 */
interface VariableStore {
  [key: string]: any;
}

/**
 * Environment class to manage variable scopes, types, operations, and processes
 */
export class Environment {
  private typedefs: TypeDef[] = [];
  private opdefs: OpDef[] = [];
  private processdefs: ProcessDef[] = [];
  private scopes: Scope[] = [];
  private vars: VariableStore = {};
  private input: any[] = [];
  private output: any[] = [];
  public traceRanges: [number, number][] = [];
  public traceOutput: [number, number][][] = [];

  /**
   * Add a type definition to the environment
   */
  addTypedef(typedef: TypeDef): TypeDef {
    this.typedefs.push(typedef);
    return typedef;
  }

  /**
   * Get a type definition by name
   */
  getTypedef(name: string): TypeDef | undefined {
    return this.typedefs.find(t => t.name === name);
  }

  /**
   * Get all type definitions
   */
  getTypedefs(): TypeDef[] {
    return this.typedefs;
  }

  /**
   * Push a new scope onto the stack
   */
  pushScope(): void {
    this.scopes.push({});
  }

  /**
   * Pop the top scope from the stack
   */
  popScope(): void {
    this.scopes.pop();
  }

  /**
   * Add a variable declaration to the current scope
   */
  addVardecl(vardecl: VarDecl): VarDecl {
    if (vardecl.name === '_') {
      return vardecl;
    }
    
    const scope = this.scopes[this.scopes.length - 1];
    scope[vardecl.name] = vardecl;
    return vardecl;
  }

  /**
   * Get a variable declaration by name from any scope
   */
  getVardecl(name: string): VarDecl | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const scope = this.scopes[i];
      if (scope[name]) {
        return scope[name];
      }
    }
    return undefined;
  }

  /**
   * Add an operation definition
   */
  addOpdef(opdef: OpDef): OpDef {
    this.opdefs.push(opdef);
    return opdef;
  }

  /**
   * Get an operation definition by name, fixity and parameter type
   */
  getOpdef(name: string, fixity: string, paramType: Type): OpDef | undefined {
    return this.opdefs.find(opdef => opdef.matchSig(name, fixity, paramType));
  }

  /**
   * Get all operation definitions
   */
  getOpdefs(): OpDef[] {
    return this.opdefs;
  }

  /**
   * Add a process definition
   */
  addProcessdef(processdef: ProcessDef): ProcessDef {
    const index = this.processdefs.findIndex(p => p.sig.name === processdef.sig.name);
    if (index >= 0) {
      this.processdefs.splice(index, 1);
    }
    this.processdefs.push(processdef);
    return processdef;
  }

  /**
   * Get a process definition by name
   */
  getProcessdef(name: string): ProcessDef | undefined {
    return this.processdefs.find(p => p.sig.name === name);
  }

  /**
   * Get all process definitions
   */
  getProcessdefs(): ProcessDef[] {
    return this.processdefs;
  }

  /**
   * Set a variable value
   */
  setVarValue(name: string, value: any): void {
    if (name !== '_') {
      this.vars[name] = value;
    }
  }

  /**
   * Get a variable value
   */
  getVarValue(name: string): any {
    return this.vars[name];
  }

  /**
   * Get all variables
   */
  getVars(): VariableStore {
    return this.vars;
  }

  /**
   * Set all variables
   */
  setVars(vars: VariableStore): void {
    this.vars = vars;
  }

  /**
   * Set the input stream
   */
  setInput(input: any[]): void {
    this.input = input;
  }

  /**
   * Check if there is input available
   */
  hasInput(): boolean {
    return this.input.length > 0;
  }

  /**
   * Consume an input value
   */
  consumeInput(): any {
    return this.input.shift();
  }

  /**
   * Add a value to the front of the input stream
   */
  prefixInput(value: any): void {
    this.input.unshift(value);
  }

  /**
   * Add a value to the output stream
   */
  appendOutput(value: any): void {
    this.output.push(value);
  }

  /**
   * Get the output stream
   */
  getOutput(): any[] {
    return this.output;
  }

  /**
   * Swap input and output streams
   */
  swapInputAndOutput(): void {
    const temp = this.input;
    this.input = this.output;
    this.output = temp;
  }

  /**
   * Append trace information
   */
  appendTrace(): void {
    this.traceOutput.push([...this.traceRanges]);
  }

  /**
   * Clear the environment state
   */
  clear(): void {
    this.input = [];
    this.output = [];
    this.vars = {};
    this.traceRanges = [];
    this.traceOutput = [];
  }

  /**
   * Initialize the environment with a parser
   */
  init(parser: any): void {
    // This will be implemented once we have the parser
  }
}