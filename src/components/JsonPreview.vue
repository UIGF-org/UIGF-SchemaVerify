<template>
  <div class="json-preview">
    <div class="json-toolbar">
      <button type="button" @click="searchText">搜索</button>
      <button type="button" @click="fold">全部折叠</button>
      <button type="button" @click="unfold">全部展开</button>
    </div>
    <div ref="host" class="json-editor"/>
  </div>
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {EditorState} from '@codemirror/state';
import {EditorView, keymap, lineNumbers} from '@codemirror/view';
import {defaultKeymap} from '@codemirror/commands';
import {defaultHighlightStyle, foldAll, foldGutter, syntaxHighlighting, unfoldAll} from '@codemirror/language';
import {json} from '@codemirror/lang-json';
import {openSearchPanel, search, searchKeymap} from '@codemirror/search';

const props = defineProps<{content: string; label: string}>();
const host = ref<HTMLDivElement>();
let view: EditorView | undefined;

onMounted(() => {
  view = new EditorView({
    parent: host.value,
    doc: props.content,
    extensions: [
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      EditorView.contentAttributes.of({'aria-label': props.label, tabindex: '0'}),
      lineNumbers(),
      foldGutter(),
      json(),
      syntaxHighlighting(defaultHighlightStyle),
      search({top: true}),
      keymap.of([...searchKeymap, ...defaultKeymap]),
      EditorView.theme({
        '&': {height: '100%', backgroundColor: '#f7f8fa'},
        '.cm-scroller': {overflow: 'auto', fontFamily: "Consolas, 'Cascadia Code', monospace", fontSize: '13px', lineHeight: '1.65'},
        '.cm-content': {padding: '10px 0'},
        '.cm-gutters': {backgroundColor: '#f2f3f5', color: '#86909c', border: 'none'},
      }),
    ],
  });
});

watch(() => props.content, (content) => {
  if (!view || content === view.state.doc.toString()) return;
  view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: content}, selection: {anchor: 0}});
  view.scrollDOM.scrollTop = 0;
  view.scrollDOM.scrollLeft = 0;
});

function searchText() {
  if (view) openSearchPanel(view);
}

function fold() {
  if (view) foldAll(view);
}

function unfold() {
  if (view) unfoldAll(view);
}

onBeforeUnmount(() => view?.destroy());
</script>

<style scoped>
.json-preview {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.json-toolbar {
  display: flex;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid #e5e6eb;
  background: #fff;
}

.json-toolbar button {
  border: 0;
  border-radius: 3px;
  padding: 4px 8px;
  color: #165dff;
  background: #f2f3f5;
  cursor: pointer;
}

.json-toolbar button:hover {
  background: #e8f3ff;
}

.json-editor {
  flex: 1;
  min-height: 0;
}
</style>
