import { createApp } from 'vue';
import App from './App.vue';
import ArcoVue from '@arco-design/web-vue';
import { Message } from '@arco-design/web-vue';
import '@arco-design/web-vue/dist/arco.css';
import router from './router';

const app = createApp(App);

app.use(router);
app.use(ArcoVue);
app.mount('#app');

Message._context = app._context;

