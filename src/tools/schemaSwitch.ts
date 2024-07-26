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
    [SchemaType.UIGF]: ['3.0', '4.0'],
    [SchemaType.SRGF]: ['1.0'],
}

/**
 * @description 获取schema
 * @param schemaType schema类型
 * @param version schema版本
 * @returns schema
 */
export async function getSchema(schemaType: SchemaType, version: string): Promise<any> {
    const schemaPath = `../source/${schemaType}-${version}-schema.json`;
    const schemaJson = import.meta.glob('../source/*-schema.json');
    const schemaFile = await schemaJson[schemaPath]() as { default: any };
    return schemaFile.default;
}
