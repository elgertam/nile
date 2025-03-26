# Nile TypeScript Project Structure

## File Organization

```
src/
├── ast/
│   ├── nodes.ts             - AST node type definitions
│   ├── toString.ts          - AST serialization
│   ├── typeChecker.ts       - Type checking
│   ├── resolver.ts          - Name resolution
│   └── evaluator.ts         - Evaluation logic
├── parser/
│   ├── grammar.ohm          - Ohm grammar definition
│   └── semantics.ts         - Ohm semantics actions
├── runtime/
│   ├── environment.ts       - Runtime environment
│   ├── builtins.ts          - Built-in operations
│   └── primitives.ts        - Primitive type implementations
├── utils/
│   └── helpers.ts           - Utility functions
└── index.ts                 - Main entry point

tests/
├── parser.test.ts           - Parser tests
├── typeChecker.test.ts      - Type checker tests
└── evaluation.test.ts       - Evaluation tests

package.json
tsconfig.json
```

## Migration Strategy

1. **Create TypeScript interfaces** for all AST nodes and data structures
2. **Port the grammar** from OMeta to Ohm/JS format
3. **Implement semantics actions** to build the AST
4. **Port core functionality** like type checking and evaluation
5. **Add comprehensive tests** to ensure correctness
