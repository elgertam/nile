/**
 * Helper functions for Nile TypeScript implementation
 */

/**
 * Get own property names of an object
 */
export function ownPropertyNames(obj: any): string[] {
  const result: string[] = [];
  for (const name in obj) {
    if (obj.hasOwnProperty(name)) {
      result.push(name);
    }
  }
  return result;
}

/**
 * Check if a value is immutable (null, undefined, boolean, number, string)
 */
export function isImmutable(x: any): boolean {
  return x === null || 
         x === undefined || 
         typeof x === 'boolean' || 
         typeof x === 'number' || 
         typeof x === 'string';
}

/**
 * Check if an object is sequenceable (string or array)
 */
export function isSequenceable(x: any): boolean {
  return typeof x === 'string' || Array.isArray(x);
}

/**
 * Get a tag for an object (for memoization)
 */
export const getTag = (function() {
  let numIdx = 0;
  return function(x: any): string | null | undefined {
    if (x === null || x === undefined) {
      return x;
    }
    
    switch (typeof x) {
      case 'boolean': return x ? 'Btrue' : 'Bfalse';
      case 'string': return 'S' + x;
      case 'number': return 'N' + x;
      default: return x.hasOwnProperty('_id_') ? x._id_ : x._id_ = 'R' + numIdx++;
    }
  };
})();

/**
 * This adds a custom method to the Array prototype to execute a method on each element
 * and return the results in a new array
 */
export function mapMethod<T, U>(arr: T[], methodName: string, ...args: any[]): U[] {
  return arr.map(function(e: any) {
    return e[methodName].apply(e, args);
  });
}

/**
 * Find the first element in an array that matches a predicate
 */
export function detect<T>(arr: T[], predicate: (item: T) => boolean): T | undefined {
  const index = detectIndex(arr, predicate);
  if (index >= 0) {
    return arr[index];
  }
  return undefined;
}

/**
 * Find the index of the first element in an array that matches a predicate
 */
export function detectIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i])) {
      return i;
    }
  }
  return -1;
}

/**
 * Wrap a method with a before/after function
 */
export function wrapMethod<T extends Function>(method: T, wrapper: (originalMethod: T, ...args: any[]) => any): T {
  const wrappedMethod = function(this: any, ...args: any[]) {
    return wrapper.apply(this, [method.bind(this), ...args]);
  };
  return wrappedMethod as unknown as T;
}

/**
 * This is a helper for string formatting
 */
export class StringBuffer {
  private strings: string[] = [];
  
  constructor(...args: string[]) {
    for (let i = 0; i < args.length; i++) {
      this.nextPutAll(args[i]);
    }
  }
  
  nextPutAll(s: string): void {
    this.strings.push(s);
  }
  
  contents(): string {
    return this.strings.join('');
  }
}

/**
 * Add padded zeroes to the left of a string until it reaches the specified length
 */
export function padLeft(str: string, pad: string, length: number): string {
  let result = str;
  while (result.length < length) {
    result = pad + result;
  }
  return result;
}

/**
 * Convert a string to a program string (with escapes)
 */
export function toProgramString(str: string): string {
  const escapeMap: Record<string, string> = {
    "'": "\\'",
    '"': '\\"',
    '\\': '\\\\',
    '\b': '\\b',
    '\f': '\\f',
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\v': '\\v'
  };
  
  const buffer = new StringBuffer('"');
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    const code = str.charCodeAt(i);
    
    if (escapeMap[char]) {
      buffer.nextPutAll(escapeMap[char]);
    } else if (code < 32 || code >= 128) {
      // Unicode escape
      if (code < 256) {
        buffer.nextPutAll(`\\x${padLeft(code.toString(16), '0', 2)}`);
      } else {
        buffer.nextPutAll(`\\u${padLeft(code.toString(16), '0', 4)}`);
      }
    } else {
      buffer.nextPutAll(char);
    }
  }
  
  buffer.nextPutAll('"');
  return buffer.contents();
}

/**
 * Unescape a string (convert escape sequences back to characters)
 */
export function unescape(s: string): string {
  if (s.charAt(0) === '\\') {
    switch (s.charAt(1)) {
      case "'": return "'";
      case '"': return '"';
      case '\\': return '\\';
      case 'b': return '\b';
      case 'f': return '\f';
      case 'n': return '\n';
      case 'r': return '\r';
      case 't': return '\t';
      case 'v': return '\v';
      case 'x': return String.fromCharCode(parseInt(s.substring(2, 4), 16));
      case 'u': return String.fromCharCode(parseInt(s.substring(2, 6), 16));
      default: return s.charAt(1);
    }
  } else {
    return s;
  }
}

/**
 * Generate a temporary name
 */
export function tempName(prefix: string = '_tmpnam_'): string {
  return prefix + tempNameCounter++;
}
let tempNameCounter = 0;

/**
 * Stable sort implementation that preserves order of equal elements
 */
export function stableSort<T>(
  array: T[], 
  extractKey: (value: T) => number
): T[] {
  const keysIndicesValues = array.map((value, index) => {
    return [extractKey(value), index, value] as [number, number, T];
  });
  
  keysIndicesValues.sort((a, b) => {
    const result = a[0] - b[0];
    return result === 0 ? a[1] - b[1] : result;
  });
  
  return keysIndicesValues.map(kiv => kiv[2]);
}

/**
 * Print a value to a string buffer
 */
export function printOn(x: any, buffer: StringBuffer): void {
  if (x === undefined || x === null) {
    buffer.nextPutAll('' + x);
  } else if (Array.isArray(x)) {
    buffer.nextPutAll('[');
    for (let idx = 0; idx < x.length; idx++) {
      if (idx > 0) {
        buffer.nextPutAll(', ');
      }
      printOn(x[idx], buffer);
    }
    buffer.nextPutAll(']');
  } else {
    buffer.nextPutAll(x.toString());
  }
}

/**
 * Convert a value to a string using the printOn function
 */
export function toString(x: any): string {
  const buffer = new StringBuffer();
  printOn(x, buffer);
  return buffer.contents();
}

/**
 * Create an object that delegates to another object
 */
export function objectThatDelegatesTo<T extends object, U extends object>(
  parent: T, 
  props: U
): T & U {
  // @ts-ignore
  const F = function() {};
  F.prototype = parent;
  // @ts-ignore
  const result = new F();
  
  for (const p in props) {
    if (props.hasOwnProperty(p)) {
      // @ts-ignore
      result[p] = props[p];
    }
  }
  // @ts-ignore
  return result;
}