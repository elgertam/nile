/**
 * Main entry point for the Nile TypeScript implementation
 */
import { Node, Expression, Block } from './ast/nodes';
import { Environment } from './runtime/environment';
import { loadGrammar, createSemantics, parseNile } from './parser/semantics';
import { resolveNode, resolveWithSourceRange } from './ast/resolver';
import { evalNode, evalBlock } from './ast/evaluator';
import { initBuiltins } from './runtime/builtins';

/**
 * The Nile compiler and interpreter
 */
export class Nile {
  private grammar: any;
  private semantics: any;
  private environment: Environment;
  
  /**
   * Create a new Nile instance
   */
  constructor() {
    this.grammar = loadGrammar();
    this.semantics = createSemantics(this.grammar);
    this.environment = new Environment();
    
    // Initialize built-in operations and processes
    initBuiltins(this.environment, this);
  }
  
  /**
   * Match a source string against a grammar rule
   * @param source The source string
   * @param rule The grammar rule to match
   */
  matchAll(source: string, rule: string): any {
    const matchResult = this.grammar.match(source, rule);
    if (matchResult.failed()) {
      throw new Error(`Parse error: ${matchResult.message}`);
    }
    return this.semantics(matchResult).toAST(this.environment);
  }
  
  /**
   * Parse a Nile program
   * @param source The source code
   */
  parse(source: string): Node[] {
    return parseNile(source, this.environment);
  }
  
  /**
   * Resolve a node against the environment
   * @param node The node to resolve
   */
  resolve(node: Node): Node {
    return resolveWithSourceRange(node, this.environment);
  }
  
  /**
   * Evaluate a node
   * @param node The node to evaluate
   */
  evaluate(node: Node): any {
    return evalNode(node, this.environment);
  }
  
  /**
   * Parse and resolve a Nile program
   * @param source The source code
   */
  parseAndResolve(source: string): Node[] {
    const nodes = this.parse(source);
    return nodes.map(node => this.resolve(node));
  }
  
  /**
   * Parse and evaluate a Nile expression
   * @param source The source code
   */
  parseAndEvaluate(source: string): any {
    const expr = this.matchAll(source, 'Expr');
    const resolved = this.resolve(expr) as Expression;
    return this.evaluate(resolved);
  }
  
  /**
   * Parse and evaluate a Nile block with input
   * @param source The source code
   * @param input The input data
   */
  evaluateBlock(source: string, input: any[]): any[] {
    // Add a newline at the beginning because the block rule needs it
    const sourceWithNewline = '\n' + source;
    
    // Parse the block
    const block = this.matchAll(sourceWithNewline, 'Block') as Block;
    
    // Create a new scope
    this.environment.pushScope();
    
    // Resolve the block
    const resolvedBlock = this.resolve(block) as Block;
    
    // Set the input
    this.environment.setInput(input);
    
    // Evaluate the block
    try {
      evalBlock(resolvedBlock, this.environment);
    } catch (e) {
      if (e !== SubStmtException) {
        this.environment.clear();
        throw e;
      }
    }
    
    // Get the output
    const output = this.environment.getOutput();
    
    // Clean up
    this.environment.popScope();
    this.environment.clear();
    
    return output;
  }
  
  /**
   * Add types, operations, and processes to the environment
   * @param source The source code containing definitions
   */
  addDefinitions(source: string): void {
    const defs = this.parse(source);
    defs.forEach(def => this.resolve(def));
  }
  
  /**
   * Get the environment
   */
  getEnvironment(): Environment {
    return this.environment;
  }
}

/**
 * Create and export a default Nile instance
 */
export const nile = new Nile();

/**
 * SubStmt exception to break out of process evaluation
 */
export const SubStmtException = Symbol('SubStmt');
