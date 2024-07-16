<template>
    <div class="app-container">
        <div class="app-title">
            <img src="/logo.png" alt="logo" />
            <span>UIGF Format Converter</span>
            <a-upload :show-file-list="false" :custom-request="uploadFile" />
            <a-button type="primary" @click="conv">转换</a-button>
            <a-button type="primary" @click="downloadFile">下载转换后</a-button>

        </div>
        <div class="route-switcher">
            <a-radio-group v-model="selectedRoute" type="button">
                <a-radio value="verify">验证</a-radio>
                <a-radio value="conv">转换</a-radio>
            </a-radio-group>
        </div>
        <div class="format-container">
            <div class="format-title">转换后格式</div>
            <a-select v-model="endFormat" class="format-select" defaultValue="UIGF-4.0">
                <a-option value="uigf4">UIGF-4.0</a-option>
                <a-option value="uigf3">UIGF-3.0</a-option>
                <a-option value="srgf1">SRGF-1.0</a-option>
            </a-select>
        </div>
        <a-collapse style="width: 100%; item-align: center;" v-if='uploaded'>
            <a-collapse-item header="文件信息" key="1">
            </a-collapse-item>
        </a-collapse>
        <div class="verify-body">
            <div class="verify-item">
                <div class="verify-title">待转换的文件内容</div>
                <a-textarea class="verify-box" v-model="fileContent" auto-size />
            </div>
            <div class="verify-item">
                <div class="verify-title">
                    <span>转换后的文件内容</span>
                </div>
                <a-textarea class="verify-box" v-model="convertedContent" readonly auto-size />
            </div>
        </div>
    </div>
</template>

<script lang="js" setup>
import { ref, watch } from 'vue';
import { Message } from '@arco-design/web-vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const selectedRoute = ref('conv'); // 默认选择转换页面

watch(selectedRoute, (newRoute) => {
  router.push(`/${newRoute}`);
});

const endFormat = ref('uigf4'); // 默认格式
const fileContent = ref(''); // 假定文件内容会在文件上传后填充
const convertedContent = ref(''); // 转换后的文件内容
const uploaded = ref(false); // 文件是否已上传标志

// 文件上传处理函数
async function uploadFile(option) {
    const file = option.fileItem.file;
    if (!file) {
        option.onError();
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        fileContent.value = e.target?.result;
        option.onSuccess(); // 确保在读取完成后再调用
    };
    reader.onerror = () => {
        option.onError();
    };
    reader.readAsText(file);
}

// 转换函数
const conv = async () => {
    let content; // 在函数作用域内声明 content 变量
    try {
        // 解析为 JSON
        content = JSON.parse(fileContent.value);
    } catch (error) {
        Message.error("不是有效的 JSON");
        console.error("转换失败:", error);
        return;
    }

    uploaded.value = true;
    if (endFormat.value === 'uigf4') {
        // 进行 UIGF-4.0 格式的转换
        content = await convertToUIGF4(content);
    } else if (endFormat.value === 'uigf3') {
        // 进行 UIGF-3.0 格式的转换
        content = await convertToUIGF3(content);
    } else if (endFormat.value === 'srgf1') {
        // 进行 SRGF-1.0 格式的转换
        content = await convertToSRGF1(content);
    }

    convertedContent.value = JSON.stringify(content, null, 2);
};

// 下载文件函数
const downloadFile = () => {
    const blob = new Blob([convertedContent.value], {
        type: 'application/json'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `converted_file_${endFormat.value}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// 示例转换函数
const convertToUIGF4 = async (content) => {
    if (!['v3.0', 'v4.0', 'v2.4', 'v2.3'].includes(content.info.uigf_version)) {
        Message.error(content.info.uigf_version + "不支持");
        return;
    }

    // 实现 UIGF-4.0 格式的转换逻辑
    return content;
};

const convertToUIGF3 = async (content) => {
    if (!['v3.0', 'v4.0', 'v2.4', 'v2.3'].includes(content.uigf_version)) {
        console.log('ERROR');
    }

    // 实现 UIGF-3.0 格式的转换逻辑
    return content;
};

const convertToSRGF1 = async (content) => {
    // 实现 SRGF-1.0 格式的转换逻辑
    return content;
};
</script>

<style scoped>
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

    .format-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        margin-top: 10px;
    }

    .format-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
    }

    .format-select {
        width: 80%;
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

        .verify-body>.verify-item {
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
        height: calc(100vh - 300px);
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        overflow-y: auto;
    }
</style>