<template>
  <div @click="toggleShow" class="function-icon">
    <slot name="icon"></slot>
    <span class="function-icon-text" :style="labelStyle">
      {{ tools.name }}
      <br v-if="tools.key.includes('+')" />
      ({{ tools.key }})
    </span>
  </div>
  <div v-show="show">
    <slot name="function"></slot>
  </div>
</template>

<script lang="ts">
import bindkey from '@w-xuefeng/bindkey'
import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'FunctionIcon',
  props: {
    tools: {
      type: Object,
      required: true,
    },
    labelStyle: {
      type: Object,
    },
  },
  setup(props) {
    const show = ref(false)
    let toggleShow = () => (show.value = !show.value)
    const forceClosePanel = () => (show.value = false)
    if (props.tools.noPanel && typeof props.tools.cb === 'function') {
      toggleShow = props.tools.cb
    } else {
      bindkey.add(props.tools.key, toggleShow)
    }
    return { show, toggleShow, forceClosePanel }
  }
})
</script>

<style scoped>
.function-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin: 5px auto;
}
.function-icon-text {
  font-size: 12px;
  color: rgb(59, 59, 59);
  text-align: center;
}
</style>
