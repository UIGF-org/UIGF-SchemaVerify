/**
 * @description schema type enum
 */
export enum SchemaType {
    UIAF = 'uiaf',
    UIGF3 = 'uigf3',
    SRGF = 'srgf',
    UIGF4 = 'uigf4'
}

/**
 * @description get schema json file path
 * @param schemaType schema type
 */
export async function getSchema(schemaType: SchemaType): Promise<any> {
    const schemaPath = `../source/${schemaType}-schema.json`;
    const schemaJson = import.meta.glob('../source/*-schema.json');
    const schemaFile = await schemaJson[schemaPath]() as { default: any };
    return schemaFile.default;
}
