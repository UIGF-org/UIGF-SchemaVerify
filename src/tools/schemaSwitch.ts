/**
 * @description schema类型
 */
export enum SchemaType {
    UIAF = 'uiaf',
    UIGF = 'uigf',
    SRGF = 'srgf',
}

/**
 * @description schema列表
 */
type SchemaList = {
    [key in SchemaType]: string[];
}

/**
 * @description schema列表
 */
export const schemaList: SchemaList = {
    [SchemaType.UIAF]: ['1.1'],
    [SchemaType.UIGF]: ['4.2', '3.0'],
    [SchemaType.SRGF]: ['1.0'],
}

/**
 * @description 获取schema
 * @param schemaType schema类型
 * @param version schema版本
 * @returns schema
 */
const schemaFiles = import.meta.glob('../source/*-schema.json', { eager: true, import: 'default' });

export function getSchema(schemaType: SchemaType, version: string): any {
    const schemaPath = `../source/${schemaType}-${version}-schema.json`;
    const schema = schemaFiles[schemaPath];
    if (!schema) {
        throw new Error(`Schema not found: ${schemaType} ${version}`);
    }
    return schema;
}
