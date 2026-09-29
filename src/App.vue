<template>
  <div class="app-container">
    <div class="app-title">
      <img src="/logo.png" alt="logo" @click="toGithub()" title="前往仓库"/>
      <span>UIGF Schema Verify Tool</span>
    </div>
    <div class="app-actions">
      <a-upload :show-file-list="false" :custom-request="uploadFile"></a-upload>
      <a-button type="primary" :loading="isVerifying" :disabled="!selectedFile" @click="verify()">验证</a-button>
      <a-select v-model="curSchema" style="width: 100px">
        <a-option :value="SchemaType.UIGF">{{ SchemaType.UIGF.toUpperCase() }}</a-option>
        <a-option :value="SchemaType.UIAF">{{ SchemaType.UIAF.toUpperCase() }}</a-option>
        <a-option :value="SchemaType.SRGF">{{ SchemaType.SRGF.toUpperCase() }}</a-option>
      </a-select>
      <a-select v-model="curVersion" style="width: 100px">
        <a-option v-for="version in schemaList[curSchema]" :key="version" :value="version">{{ version }}</a-option>
      </a-select>
    </div>
    <div class="verify-result" v-if="verifyResult !== ''">
      <a-alert type="success" v-if="isSucceed">Verification passed</a-alert>
      <a-alert type="error" v-else>
        <span v-if="typeof verifyResult === 'string'">{{ verifyResult }}</span>
        <ul v-else>
          <li v-for="error in verifyResult" :key="error.schemaPath">
            <span class="error-path">{{ error.instancePath || error.schemaPath }}:&emsp;</span>
            <span class="error-message">{{ error.message }}</span>
            <span style="margin-left: auto" v-if="error.instancePath!==''">
              <a-button @click="showErrData(error)" type="text">查看错误数据</a-button>
            </span>
          </li>
        </ul>
      </a-alert>
    </div>
    <div class="verify-body">
      <div class="verify-item">
        <div class="verify-title">File Content</div>
        <div v-if="selectedFile" class="preview-note">
          {{ previewFormatted ? '已格式化 · 2 空格缩进' : '原始内容' }}
          <span v-if="previewTruncated"> · 仅显示前约 10 万字符；验证使用完整文件。</span>
        </div>
        <JsonPreview class="verify-box" :content="filePreview" label="文件 JSON 预览"/>
      </div>
      <div class="verify-item">
        <div class="verify-title">
          <span>Schema</span>
        </div>
        <JsonPreview class="verify-box" :content="curSchemaContent" label="Schema JSON"/>
      </div>
    </div>
    <a-modal v-model:visible="errorDataVisible" title="错误数据" :footer="false" width="min(800px, 90vw)">
      <a-alert type="error" class="error-data-message">{{ errorDataMessage }}</a-alert>
      <div class="error-data-path">{{ errorDataPath }}</div>
      <JsonPreview class="verify-box error-data-box" :content="errorData" label="错误数据 JSON"/>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import type {ErrorObject} from "ajv";
import {computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, shallowRef, watch} from "vue";
import {RequestOption, UploadRequest} from "@arco-design/web-vue";
import {getSchema, schemaList, SchemaType} from "./tools/schemaSwitch.ts";
import type {WorkerResponse} from "./tools/verify.worker.ts";

const JsonPreview = defineAsyncComponent(() => import('./components/JsonPreview.vue'));

let worker: Worker | undefined;
let requestId = 0;
let fileId = 0;

// 当前schema类型
const curSchema = ref<SchemaType>(SchemaType.UIGF);
const curVersion = ref<string>("");
const curSchemaContent = computed(() => JSON.stringify(schema.value, null, 2));

onMounted(() => {
  const url = new URL(window.location.href);
  const schemaType = url.searchParams.get("schema");
  const check = [SchemaType.UIGF, SchemaType.UIAF, SchemaType.SRGF];
  if (check.includes(schemaType as SchemaType)) {
    curSchema.value = schemaType as SchemaType;
  }
  freshSchema(curSchema.value);
});

// freshSchema
function freshSchema(schemaType: SchemaType = curSchema.value, version: string = curVersion.value) {
  const versions = schemaList[schemaType];
  const selectedVersion = versions.includes(version) ? version : versions[0];
  curVersion.value = selectedVersion;
  schema.value = getSchema(schemaType, selectedVersion);
  requestId++;
  isVerifying.value = false;
  errorDataVisible.value = false;
  verifyResult.value = "";
}

// 监听schema类型变化
watch(curSchema, (value: SchemaType) => freshSchema(value));

// 监听版本变化
watch(curVersion, (value: string) => freshSchema(curSchema.value, value));

// schema 文件内容
const schema = shallowRef<any>({});
const selectedFile = shallowRef<File | null>(null);
const filePreview = ref("");
const previewTruncated = ref(false);
const previewFormatted = ref(false);
const errorDataVisible = ref(false);
const errorData = ref('');
const errorDataPath = ref('');
const errorDataMessage = ref('');
const isVerifying = ref(false);
//  验证结果
const verifyResult = ref<string | Array<ErrorObject>>("");
// 是否验证成功
const isSucceed = computed(() => {
  if (verifyResult.value === "Verification passed") {
    return true;
  }
  if (verifyResult.value === "Verification failed") {
    return false;
  }
  return !verifyResult.value.length;
})

// 上传文件
function uploadFile(option: RequestOption): UploadRequest {
  const file = option.fileItem.file;
  if (!file) {
    option.onError();
    return {};
  }
  if (file.name.split('.').pop() !== 'json') {
    alert('Please upload a json file');
    option.onError();
    return {};
  }
  selectedFile.value = file;
  fileId++;
  filePreview.value = "";
  previewTruncated.value = false;
  previewFormatted.value = false;
  verify();
  option.onSuccess();
  return {};
}

// 验证
function verify() {
  const file = selectedFile.value;
  if (!file) return;

  const currentWorker = getWorker();
  const currentRequestId = ++requestId;
  isVerifying.value = true;
  errorDataVisible.value = false;
  verifyResult.value = "";
  currentWorker.postMessage({type: 'verify', requestId: currentRequestId, fileId, file,
    schemaType: curSchema.value, version: curVersion.value});
}

// 显示错误数据
function showErrData(error: ErrorObject) {
  errorDataPath.value = error.instancePath;
  errorDataMessage.value = error.message ?? 'Verification failed';
  worker?.postMessage({type: 'error-data', requestId, path: error.instancePath});
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./tools/verify.worker.ts', import.meta.url), {type: 'module'});
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data;
    if (response.type === 'preview') {
      if (response.fileId !== fileId) return;
      filePreview.value = response.value;
      previewTruncated.value = response.truncated;
      previewFormatted.value = response.formatted;
      return;
    }
    if (response.requestId !== requestId) return;
    if (response.type === 'error-data') {
      errorData.value = response.value;
      errorDataVisible.value = true;
      return;
    }
    isVerifying.value = false;
    verifyResult.value = response.type === 'failure'
        ? response.message
        : response.valid ? 'Verification passed' : response.errors.length ? response.errors : 'Verification failed';
  };
  worker.onerror = () => {
    worker?.terminate();
    worker = undefined;
    if (isVerifying.value) {
      isVerifying.value = false;
      verifyResult.value = 'Verification failed: worker error';
    }
  };
  return worker;
}

onBeforeUnmount(() => worker?.terminate());

function toGithub(): void {
  window.open("https://github.com/UIGF-org/UIGF-SchemaVerify");
}
</script>


<style lang="css" scoped>
.app-container {
  position: relative;
  margin: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 20px;
}

.app-title {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 10px;
  flex-wrap: wrap;
}

.app-title img {
  width: 40px;
  height: 40px;
  border-radius: 5px;
  border: 1px solid #ccc;
  box-sizing: border-box;
  padding: 4px;
  cursor: pointer;
}

.app-title span {
  font-size: 20px;
  font-weight: bold;
}

.app-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  width: 100%;
  gap: 10px;
}

.verify-body {
  position: relative;
  display: flex;
  width: 100%;
  justify-content: space-between;
}

@media (max-width: 768px) {
  .verify-body {
    flex-direction: column;
  }

  .verify-body > .verify-item {
    width: 100%;
  }
}

.verify-item {
  width: 49%;
  min-width: 0;
}

.verify-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 10px;
}

.verify-box {
  width: 100%;
  height: calc(100vh - 200px);
  box-sizing: border-box;
  padding: 0;
  border: 1px solid #ccc;
  border-radius: 5px;
  color: #1d2129;
  background: #f7f8fa;
}

.error-data-box {
  height: 45vh;
}

.error-data-path {
  margin-bottom: 12px;
  font-family: monospace;
  overflow-wrap: anywhere;
}

.error-data-message {
  margin-bottom: 12px;
  overflow-wrap: anywhere;
}

.preview-note {
  margin-bottom: 6px;
  color: #666;
}

.verify-result {
  width: 100%;
}

.verify-result ul {
  list-style: none;
  padding: 0;
}

.verify-result li {
  margin-top: 10px;
}

.error-path {
  font-weight: bold;
  color: #D14748;
}

.error-message {
  color: #EC407A;
}
</style>
