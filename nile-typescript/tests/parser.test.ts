import { nile } from '../src';

describe('Nile Parser', () => {
  beforeAll(() => {
    // Add common definitions
    nile.addDefinitions(`
      type Color = (r:Number, g:Number, b:Number, α:Number)
      type Point = (x:Number, y:Number)
      
      a:Number² : Number
        a * a
        
      a:Number + b:Number : Number
        a + b
    `);
  });
  
  test('should parse a simple expression', () => {
    const expr = nile.matchAll('2 + 3', 'Expr');
    expect(expr).toBeDefined();
  });
  
  test('should parse and evaluate a simple numeric expression', () => {
    const result = nile.parseAndEvaluate('2 + 3');
    expect(result).toBe(5);
  });
  
  test('should parse and evaluate a squared operation', () => {
    const result = nile.parseAndEvaluate('4²');
    expect(result).toBe(16);
  });
  
  test('should parse and evaluate a variable definition', () => {
    const env = nile.getEnvironment();
    env.pushScope();
    
    // Define a variable
    const vardef = nile.matchAll('x:Number = 5', 'VarDef');
    nile.resolve(vardef);
    
    // Evaluate an expression using that variable
    const result = nile.parseAndEvaluate('x + 3');
    expect(result).toBe(8);
    
    env.popScope();
  });
  
  test('should parse and evaluate a conditional expression', () => {
    const result = nile.parseAndEvaluate(`
      { 10, if 5 > 3
        5, otherwise }
    `);
    expect(result).toBe(10);
    
    const result2 = nile.parseAndEvaluate(`
      { 10, if 5 < 3
        5, otherwise }
    `);
    expect(result2).toBe(5);
  });
  
  test('should parse and evaluate a block', () => {
    const result = nile.evaluateBlock(`
      x:Number = 5
      y:Number = 3
      z:Number = x + y
      >> z
      >> z * 2
    `, []);
    
    expect(result).toEqual([8, 16]);
  });
  
  test('should run a simple pipeline', () => {
    const result = nile.evaluateBlock(`
      -> PassThrough () -> Reverse ()
    `, [1, 2, 3, 4, 5]);
    
    expect(result).toEqual([5, 4, 3, 2, 1]);
  });
  
  test('should sort input using SortBy', () => {
    const input = [
      [3, 'c'],
      [1, 'a'],
      [2, 'b'],
      [5, 'e'],
      [4, 'd']
    ];
    
    const result = nile.evaluateBlock(`
      -> SortBy (1)
    `, input);
    
    expect(result).toEqual([
      [1, 'a'],
      [2, 'b'],
      [3, 'c'],
      [4, 'd'],
      [5, 'e']
    ]);
  });
  
  test('should run DupZip process', () => {
    const result = nile.evaluateBlock(`
      -> DupZip (-> PassThrough (), -> Reverse ())
    `, [1, 2, 3, 4, 5]);
    
    expect(result).toEqual([
      [1, 5],
      [2, 4],
      [3, 3],
      [4, 2],
      [5, 1]
    ]);
  });
  
  test('should run DupCat process', () => {
    const result = nile.evaluateBlock(`
      p1 = -> PassThrough ()
      p2 = -> Reverse ()
      -> DupCat (p1, p2)
    `, [1, 2, 3]);
    
    expect(result).toEqual([1, 2, 3, 3, 2, 1]);
  });
  
  test('should handle tuple patterns', () => {
    const result = nile.evaluateBlock(`
      (x:Number, y:Number) = (5, 3)
      z:Number = x + y
      >> z
    `, []);
    
    expect(result).toEqual([8]);
  });
  
  test('should handle color and point types', () => {
    const result = nile.evaluateBlock(`
      p:Point = (10, 20)
      c:Color = (1, 0, 0, 1)
      >> p.x
      >> p.y
      >> c.r
      >> c.g
      >> c.b
      >> c.α
    `, []);
    
    expect(result).toEqual([10, 20, 1, 0, 0, 1]);
  });
});
