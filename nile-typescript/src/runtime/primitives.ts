/**
 * Primitive type implementations for Nile
 * 
 * These functions provide runtime behavior for primitive types
 * like Number and Boolean.
 */
import { Type, PrimType, AnyType, TypeRef } from '../ast/nodes';

/**
 * Boolean operations
 */
export const BooleanOps = {
  /**
   * Boolean NOT operator (¬)
   */
  not: (value: boolean): boolean => !value,
  
  /**
   * Boolean OR operator (∨)
   */
  or: (a: boolean, b: boolean): boolean => a || b,
  
  /**
   * Boolean AND operator (∧)
   */
  and: (a: boolean, b: boolean): boolean => a && b
};

/**
 * Number operations
 */
export const NumberOps = {
  /**
   * Negation operator (-)
   */
  negate: (value: number): number => -value,
  
  /**
   * Square root operator (√)
   */
  sqrt: (value: number): number => Math.sqrt(value),
  
  /**
   * Floor operator (⌊⌋)
   */
  floor: (value: number): number => Math.floor(value),
  
  /**
   * Ceiling operator (⌈⌉)
   */
  ceil: (value: number): number => Math.ceil(value),
  
  /**
   * Square operator (²)
   */
  square: (value: number): number => value * value,
  
  /**
   * Cube operator (³)
   */
  cube: (value: number): number => value * value * value,
  
  /**
   * Absolute value operator (|x|)
   */
  abs: (value: number): number => Math.abs(value),
  
  /**
   * Equality operator (=)
   */
  equal: (a: number, b: number): boolean => a === b,
  
  /**
   * Inequality operator (≠)
   */
  notEqual: (a: number, b: number): boolean => a !== b,
  
  /**
   * Less than operator (<)
   */
  lessThan: (a: number, b: number): boolean => a < b,
  
  /**
   * Less than or equal operator (≤)
   */
  lessThanOrEqual: (a: number, b: number): boolean => a <= b,
  
  /**
   * Greater than operator (>)
   */
  greaterThan: (a: number, b: number): boolean => a > b,
  
  /**
   * Greater than or equal operator (≥)
   */
  greaterThanOrEqual: (a: number, b: number): boolean => a >= b,
  
  /**
   * Addition operator (+)
   */
  add: (a: number, b: number): number => a + b,
  
  /**
   * Subtraction operator (-)
   */
  subtract: (a: number, b: number): number => a - b,
  
  /**
   * Multiplication operator (*)
   */
  multiply: (a: number, b: number): number => a * b,
  
  /**
   * Division operator (/)
   */
  divide: (a: number, b: number): number => a / b,
  
  /**
   * Modulo operator (%)
   */
  modulo: (a: number, b: number): number => {
    const n = b || 1; // Default to 1 if b is 0
    const result = a / n;
    return a - Math.floor(result) * n;
  },
  
  /**
   * Minimum operator (◁)
   * Returns the smaller of two values
   */
  min: (a: number, b: number): number => Math.min(a, b),
  
  /**
   * Maximum operator (▷)
   * Returns the larger of two values
   */
  max: (a: number, b: number): number => Math.max(a, b),
  
  /**
   * Approximately equal operator (≈)
   * Checks if two numbers are approximately equal (within a small epsilon)
   */
  approxEqual: (a: number, b: number): boolean => Math.abs(a - b) < 0.0001,
  
  /**
   * Not approximately equal operator (≉)
   * Checks if two numbers are not approximately equal
   */
  notApproxEqual: (a: number, b: number): boolean => Math.abs(a - b) >= 0.0001,
  
  /**
   * Conditional operator (?)
   * Returns a if a is not 0, otherwise returns b
   */
  conditional: (a: number, b: number): number => a !== 0 ? a : b
};

/**
 * Check if a type is a primitive type
 * @param type The type to check
 */
export function isPrimitiveType(type: Type): boolean {
  if (type.type === 'PrimType') {
    return true;
  }
  
  if (type.type === 'TypeRef') {
    const name = (type as TypeRef).name;
    return name === 'Number' || name === 'Boolean';
  }
  
  return false;
}

/**
 * Get the primitive operations for a type
 * @param type The type
 */
export function getPrimitiveOps(type: Type): any {
  if (type.type === 'TypeRef') {
    const name = (type as TypeRef).name;
    if (name === 'Number') {
      return NumberOps;
    } else if (name === 'Boolean') {
      return BooleanOps;
    }
  }
  
  return null;
}
