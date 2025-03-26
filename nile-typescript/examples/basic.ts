import { nile } from '../src';

// Add basic type definitions
nile.addDefinitions(`
  type Color = (r:Number, g:Number, b:Number, α:Number)
  type Point = (x:Number, y:Number)
  type Vector = (x:Number, y:Number)
  
  // Square a number
  a:Number² : Number
    a * a
  
  // Dot product of two vectors
  u:Vector ∙ v:Vector : Number
    ((x1, y1), (x2, y2)) = (u, v)
    x1*x2 + y1*y2
  
  // Length (magnitude) of a vector
  ‖u:Vector‖ : Number
    √(u ∙ u)
  
  // Normalize a vector
  norm (v:Vector) : Vector
    (x, y) = v
    mag:Number = ‖v‖
    (x / mag, y / mag)
`);

// Evaluate a simple expression
const result1 = nile.parseAndEvaluate('2 + 3');
console.log('2 + 3 =', result1);

// Evaluate a more complex expression
const result2 = nile.parseAndEvaluate('5²');
console.log('5² =', result2);

// Run a block with vector operations
const result3 = nile.evaluateBlock(`
  v1:Vector = (3, 4)
  v2:Vector = (1, 2)
  
  // Calculate dot product
  dot:Number = v1 ∙ v2
  >> dot
  
  // Calculate magnitude
  mag:Number = ‖v1‖
  >> mag
  
  // Normalize the vector
  n:Vector = norm(v1)
  >> n
`, []);

console.log('Vector operations:');
console.log('v1 ∙ v2 =', result3[0]);
console.log('‖v1‖ =', result3[1]);
console.log('norm(v1) =', result3[2]);

// Run a pipeline example
const data = [
  [5, 'e'],
  [3, 'c'],
  [1, 'a'],
  [4, 'd'],
  [2, 'b']
];

console.log('\nOriginal data:', data);

const result4 = nile.evaluateBlock(`
  -> SortBy (1)
`, data);

console.log('Sorted data:', result4);

const result5 = nile.evaluateBlock(`
  -> DupZip (-> PassThrough (), -> Reverse ())
`, [1, 2, 3, 4, 5]);

console.log('\nDupZip result:', result5);

// Define and use a custom process
nile.addDefinitions(`
  MapSquare () : Number >> Number
    ∀ n
      >> n²
`);

const result6 = nile.evaluateBlock(`
  -> MapSquare ()
`, [1, 2, 3, 4, 5]);

console.log('\nMapSquare result:', result6);
