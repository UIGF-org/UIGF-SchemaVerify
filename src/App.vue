<template>
  <div class="app-container">
    <div class="app-title">
      <img src="/logo.png" alt="logo"/>
      <span>UIGF Schema Verify Tool</span>
    </div>
    <div class="app-actions">
      <a-upload :show-file-list="false" :custom-request="uploadFile"></a-upload>
      <a-button type="primary" @click="verify()">验证</a-button>
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
          <li v-for="error in verifyResult" :key="error.instancePath">
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
        <a-textarea class="verify-box" v-model="fileContent" readonly auto-size/>
      </div>
      <div class="verify-item">
        <div class="verify-title">
          <span>Schema</span>
        </div>
        <a-textarea class="verify-box" v-model="curSchemaContent" readonly auto-size/>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Ajv, {ErrorObject, ValidateFunction} from "ajv";
import {computed, onMounted, ref, watch} from "vue";
import {RequestOption, UploadRequest} from "@arco-design/web-vue";
import {getSchema, schemaList, SchemaType} from "./tools/schemaSwitch.ts";

const ajv = new Ajv();

const validate = ref<ValidateFunction | undefined>(undefined);

// 当前schema类型
const curSchema = ref<SchemaType>(SchemaType.UIGF);
const curVersion = ref<string>("");
const curSchemaContent = computed(() => JSON.stringify(schema.value, null, 2));

onMounted(async () => {
  const url = new URL(window.location.href);
  const schemaType = url.searchParams.get("schema");
  const check = [SchemaType.UIGF, SchemaType.UIAF, SchemaType.SRGF];
  if (check.includes(schemaType as SchemaType)) {
    curSchema.value = schemaType as SchemaType;
  }
  await freshSchema(curSchema.value);
});

// freshSchema
async function freshSchema(schemaType: SchemaType = curSchema.value, version: string = curVersion.value) {
  const versions = schemaList[schemaType];
  if (!versions.includes(version)) {
    curVersion.value = versions[0];
  }
  schema.value = await getSchema(schemaType, curVersion.value);
  validate.value = ajv.compile(schema.value);
}

// 监听schema类型变化
watch(curSchema, async (value: SchemaType) => await freshSchema(value));

// 监听版本变化
watch(curVersion, async (value: string) => await freshSchema(curSchema.value, value));

// schema 文件内容
const schema = ref<any>({});
// 文件内容
const fileContent = ref<string>("");
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
  const reader = new FileReader();
  try {
    reader.onload = (e) => {
      fileContent.value = e.target?.result as string;
      verify();
    };
    reader.readAsText(file);
    option.onSuccess();
  } catch (e) {
    option.onError();
  }
  return {};
}

// 验证
function verify() {
  if (validate.value === undefined) {
    console.error("Schema is not loaded");
    return;
  }
  try {
    const data = JSON.parse(fileContent.value);
    const valid = validate.value(data);
    if (valid) {
      verifyResult.value = "Verification passed";
      return;
    }
    verifyResult.value = validate.value.errors || "Verification failed";
    console.log(validate.value.errors);
  } catch (e) {
    verifyResult.value = "Verification failed\n" + e;
  }
}

// 显示错误数据
function showErrData(error: ErrorObject) {
  const path = error.instancePath.split("/").filter((item) => item);
  let data = JSON.parse(fileContent.value);
  // 最多深入两层
  for (let i = 0; i < Math.min(path.length, 2); i++) {
    data = data[path[i]];
  }
  alert(JSON.stringify(data, null, 2));
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
}

.app-title span {
  font-size: 20px;
  font-weight: bold;
}

.app-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
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
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  overflow-y: auto;
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
