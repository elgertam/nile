/**
 * Type checking implementation for Nile
 */
import {
  Type, PrimType, AnyType, TupleType, RecordType, ProcessType, TypeRef, TypeDef,
  VarDecl, TuplePat, Expression, NumExpr, VarExpr, TupleExpr, CondCase, CondExpr,
  RecFieldExpr, OpExpr, ProcessInst
} from './nodes';

/**
 * Check if two types are equal
 * @param type1 First type
 * @param type2 Second type
 */
export function areTypesEqual(type1: Type, type2: Type): boolean {
  // If both are type references, compare their names
  if (type1.type === 'TypeRef' && type2.type === 'TypeRef') {
    return (type1 as TypeRef).name === (type2 as TypeRef).name;
  }

  // Check if types are structurally the same
  if (type1.type !== type2.type) {
    return false;
  }

  // For tuple types, check that all inner types match
  if (type1.type === 'TupleType' && type2.type === 'TupleType') {
    const tupleType1 = type1 as TupleType;
    const tupleType2 = type2 as TupleType;
    
    if (tupleType1.types.length !== tupleType2.types.length) {
      return false;
    }
    
    return tupleType1.types.every((innerType, index) => 
      areTypesEqual(innerType, tupleType2.types[index])
    );
  }

  // For record types, we'd need to check field names and types
  if (type1.type === 'RecordType' && type2.type === 'RecordType') {
    const recordType1 = type1 as RecordType;
    const recordType2 = type2 as RecordType;
    
    if (recordType1.fields.length !== recordType2.fields.length) {
      return false;
    }
    
    return recordType1.fields.every((field1, index) => {
      const field2 = recordType2.fields[index];
      return field1.name === field2.name && 
             areTypesEqual(field1.getType(), field2.getType());
    });
  }

  // For process types, check input and output types
  if (type1.type === 'ProcessType' && type2.type === 'ProcessType') {
    const processType1 = type1 as ProcessType;
    const processType2 = type2 as ProcessType;
    
    return areTypesEqual(processType1.intype, processType2.intype) &&
           areTypesEqual(processType1.outtype, processType2.outtype);
  }

  // For primitive types, they're always equal if the types match
  return true;
}

/**
 * Get the size of a type (null for primitive, number for aggregate)
 * @param type The type to check
 */
export function getTypeSize(type: Type): number | null {
  switch (type.type) {
    case 'PrimType':
    case 'TypeRef': // This depends on the actual type that is referenced
      return null;
    case 'TupleType':
      return (type as TupleType).types.length;
    case 'RecordType':
      return (type as RecordType).fields.length;
    case 'ProcessType':
      return null;
    default:
      return null;
  }
}

/**
 * Get inner types of aggregate types
 * @param type The type to get inner types from
 */
export function getInnerTypes(type: Type): Type[] {
  switch (type.type) {
    case 'TupleType':
      return (type as TupleType).types;
    case 'RecordType':
      return (type as RecordType).fields.map(field => field.getType());
    default:
      return [];
  }
}

/**
 * Get a field from a record type by index
 * @param type The record type
 * @param index The field index
 */
export function getField(type: Type, index: number): VarDecl | undefined {
  if (type.type === 'RecordType') {
    return (type as RecordType).fields[index];
  }
  if (type.type === 'TypeRef') {
    // Would need to resolve the type reference first
    return undefined;
  }
  return undefined;
}

/**
 * Get the index of a field in a record type by name
 * @param type The record type
 * @param fieldName The field name
 */
export function getFieldIndex(type: Type, fieldName: string): number {
  if (type.type === 'RecordType') {
    return (type as RecordType).fields.findIndex(field => field.name === fieldName);
  }
  if (type.type === 'TypeRef') {
    // Would need to resolve the type reference first
    return -1;
  }
  return -1;
}

/**
 * Get the input type of a process type
 * @param type The process type
 */
export function getIntype(type: Type): Type | undefined {
  if (type.type === 'ProcessType') {
    return (type as ProcessType).intype;
  }
  if (type.type === 'TypeRef') {
    // Would need to resolve the type reference first
    return undefined;
  }
  return undefined;
}

/**
 * Get the output type of a process type
 * @param type The process type
 */
export function getOuttype(type: Type): Type | undefined {
  if (type.type === 'ProcessType') {
    return (type as ProcessType).outtype;
  }
  if (type.type === 'TypeRef') {
    // Would need to resolve the type reference first
    return undefined;
  }
  return undefined;
}

/**
 * Get the type of a node
 * @param node The node to get the type of
 */
export function getNodeType(node: Expression): Type {
  switch (node.type) {
    case 'NumExpr':
      // Assuming there's a Number type in the type system
      return { type: 'TypeRef', name: 'Number' };
    
    case 'VarExpr':
      return (node as VarExpr).variable.getType();
    
    case 'TupleExpr':
      return {
        type: 'TupleType',
        types: (node as TupleExpr).elements.map(element => getNodeType(element))
      };
    
    case 'RecFieldExpr': {
      const recFieldExpr = node as RecFieldExpr;
      const recordType = getNodeType(recFieldExpr.record);
      
      if (typeof recFieldExpr.field === 'number') {
        // Access by index
        const field = getField(recordType, recFieldExpr.field);
        return field ? field.getType() : { type: 'AnyType' };
      } else {
        // Access by name
        const index = getFieldIndex(recordType, recFieldExpr.field);
        if (index >= 0) {
          const field = getField(recordType, index);
          return field ? field.getType() : { type: 'AnyType' };
        }
        return { type: 'AnyType' };
      }
    }
    
    case 'CondExpr': {
      const condExpr = node as CondExpr;
      // All cases must have the same type, so we just take the first one
      if (condExpr.cases.length > 0) {
        const firstCase = condExpr.cases[0];
        return getNodeType(firstCase.value);
      }
      return { type: 'AnyType' };
    }
    
    case 'OpExpr': {
      const opExpr = node as OpExpr;
      return opExpr.op.getType();
    }
    
    case 'ProcessInst': {
      const processInst = node as ProcessInst;
      if (typeof processInst.processdef === 'string') {
        // Would need to resolve the process name
        return { type: 'AnyType' };
      } else {
        return processInst.processdef.getType();
      }
    }
    
    default:
      return { type: 'AnyType' };
  }
}

/**
 * Type check a variable declaration against a value
 * @param declaration The variable declaration
 * @param valueType The type of the value
 */
export function checkVarDecl(declaration: VarDecl | TuplePat, valueType: Type): boolean {
  if (declaration.type === 'VarDecl') {
    const varDecl = declaration as VarDecl;
    return areTypesEqual(varDecl.getType(), valueType);
  } else if (declaration.type === 'TuplePat') {
    const tuplePat = declaration as TuplePat;
    
    if (valueType.type !== 'TupleType') {
      return false;
    }
    
    const tupleType = valueType as TupleType;
    
    if (tuplePat.elements.length !== tupleType.types.length) {
      return false;
    }
    
    return tuplePat.elements.every((element, index) => 
      checkVarDecl(element, tupleType.types[index])
    );
  }
  
  return false;
}
