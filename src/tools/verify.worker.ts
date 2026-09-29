import Ajv, {type ErrorObject, type ValidateFunction} from 'ajv';
import {getSchema, type SchemaType} from './schemaSwitch';

type VerifyRequest = {
    type: 'verify';
    requestId: number;
    fileId: number;
    file: File;
    schemaType: SchemaType;
    version: string;
};

type ErrorDataRequest = {
    type: 'error-data';
    requestId: number;
    path: string;
};

type WorkerRequest = VerifyRequest | ErrorDataRequest;

export type WorkerResponse =
    | {type: 'preview'; fileId: number; value: string; truncated: boolean; formatted: boolean}
    | {type: 'result'; requestId: number; valid: boolean; errors: ErrorObject[]}
    | {type: 'failure'; requestId: number; message: string}
    | {type: 'error-data'; requestId: number; value: string};

let parsedData: unknown;
let parsedFileId = -1;
let latestRequestId = 0;
const validators = new Map<string, ValidateFunction>();
const ajv = new Ajv();

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    const request = event.data;
    if (request.type === 'error-data') {
        let value = parsedData;
        for (const segment of request.path.split('/').slice(1)) {
            const key = segment.replace(/~1/g, '/').replace(/~0/g, '~');
            value = (value as Record<string, unknown> | undefined)?.[key];
        }
        const content = JSON.stringify(value, null, 2) ?? 'undefined';
        const limit = 4000;
        self.postMessage({
            type: 'error-data',
            requestId: request.requestId,
            value: content.length > limit ? `${content.slice(0, limit)}\n…（内容已截断）` : content,
        } satisfies WorkerResponse);
        return;
    }

    latestRequestId = request.requestId;
    try {
        if (parsedFileId !== request.fileId) {
            const raw = await request.file.text();
            if (latestRequestId !== request.requestId) return;
            let data: unknown;
            try {
                data = JSON.parse(raw);
            } catch (error) {
                sendPreview(raw, request.fileId, false);
                throw error;
            }
            sendPreview(JSON.stringify(data, null, 2), request.fileId, true);
            parsedData = data;
            parsedFileId = request.fileId;
        }
        const schemaKey = `${request.schemaType}-${request.version}`;
        let validate = validators.get(schemaKey);
        if (!validate) {
            validate = ajv.compile(getSchema(request.schemaType, request.version));
            validators.set(schemaKey, validate);
        }
        const valid = validate(parsedData);
        if (latestRequestId !== request.requestId) return;
        self.postMessage({
            type: 'result',
            requestId: request.requestId,
            valid,
            errors: validate.errors ?? [],
        } satisfies WorkerResponse);
    } catch (error) {
        if (latestRequestId !== request.requestId) return;
        parsedData = undefined;
        parsedFileId = -1;
        self.postMessage({
            type: 'failure',
            requestId: request.requestId,
            message: `Verification failed\n${error}`,
        } satisfies WorkerResponse);
    }
};

function sendPreview(content: string, fileId: number, formatted: boolean) {
    const limit = 100 * 1024;
    const truncated = content.length > limit;
    let value = content.slice(0, limit);
    if (truncated) {
        const lastLine = value.lastIndexOf('\n');
        if (lastLine > 0) value = value.slice(0, lastLine);
    }
    self.postMessage({type: 'preview', fileId, value, truncated, formatted} satisfies WorkerResponse);
}
