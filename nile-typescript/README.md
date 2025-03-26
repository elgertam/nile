# Nile-TS

A TypeScript implementation of the Nile language using Ohm/JS parser.

## About Nile

Nile is a domain-specific language for graphics and computation, particularly designed for operations involving vectors, matrices, colors, and geometric operations. This implementation converts the original JavaScript-based implementation to a type-safe TypeScript version with a modern parser.

## Features

- Full TypeScript implementation with proper typing
- Modern parser using Ohm/JS
- AST (Abstract Syntax Tree) based interpreter
- Comprehensive type system
- Built-in operations and processes
- Support for pipeline-based processing

## Installation

```bash
npm install nile-ts
```

## Usage

### Basic Example

```typescript
import { nile } from 'nile-ts';

// Parse and evaluate a simple expression
const result = nile.parseAndEvaluate('2 + 3');
console.log(result); // Output: 5

// Execute a block with input data
const output = nile.evaluateBlock(`
  x:Number = 5
  y:Number = 3
  z:Number = x + y
  >> z
  >> z * 2
`, []);

console.log(output); // Output: [8, 16]
```

### Pipelines

Nile supports pipeline-based processing:

```typescript
// Sort data using a pipeline
const input = [
  [3, 'c'],
  [1, 'a'],
  [2, 'b'],
  [5, 'e'],
  [4, 'd']
];

const sorted = nile.evaluateBlock(`
  -> SortBy (1)
`, input);

console.log(sorted);
// Output: [[1, 'a'], [2, 'b'], [3, 'c'], [4, 'd'], [5, 'e']]
```

### Custom Types

You can define and use custom types:

```typescript
// Add type definitions
nile.addDefinitions(`
  type Color = (r:Number, g:Number, b:Number, α:Number)
  type Point = (x:Number, y:Number)
`);

// Use the custom types
const result = nile.evaluateBlock(`
  p:Point = (10, 20)
  c:Color = (1, 0, 0, 1)
  >> p.x
  >> p.y
  >> c.r
`, []);

console.log(result); // Output: [10, 20, 1]
```

### Custom Operations

You can define custom operations:

```typescript
nile.addDefinitions(`
  // Square a number
  a:Number² : Number
    a * a
    
  // Distance between two points
  distance (p1:Point, p2:Point) : Number
    dx:Number = p2.x - p1.x
    dy:Number = p2.y - p1.y
    √(dx² + dy²)
`);

const result = nile.parseAndEvaluate('5²');
console.log(result); // Output: 25

const dist = nile.evaluateBlock(`
  p1:Point = (0, 0)
  p2:Point = (3, 4)
  >> distance (p1, p2)
`, []);

console.log(dist); // Output: [5]
```

## License

MIT
