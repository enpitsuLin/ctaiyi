<script setup lang="ts">
import { Splitter } from '@ark-ui/vue/splitter'
import { onMounted, ref } from 'vue'

import Editor from '~/components/playground/Editor.vue'
import Console from './Console.vue'

const size = ref([
  { id: 'code', size: 50 },
  { id: 'console', size: 50, minSize: 50 },
])

const initialTemplate = ref('')

onMounted(() => {
  initialTemplate.value = `import { Client, http } from '@taiyinet/ctaiyi'

const client = Client.testnet({
  transport: http('http://127.0.0.1:8090'),
})

const {
  head_block_number
} = await client.baiyujing.getDynamicGlobalProperties()

console.log('当前块高:', head_block_number)`
})
</script>

<template>
  <div flex="~ gap-1" size-full>
    <Splitter.Root
      :size="size"
      orientation="vertical"
    >
      <Splitter.Panel id="code">
        <Editor :value="initialTemplate" />
      </Splitter.Panel>
      <Splitter.ResizeTrigger id="code:console" relative h-4 class="focus-within:outline-none">
        <div absolute h-1px w-30px bg-gray-200 class="left-1/2 top-1/2 translate-y-[calc(50%-3px)] scale-y-10" />
        <div absolute h-1px w-30px bg-gray-200 class="left-1/2 top-1/2 translate-y-[calc(50%+1px)] scale-y-10" />
      </Splitter.ResizeTrigger>
      <Splitter.Panel id="console">
        <Console />
      </Splitter.Panel>
    </Splitter.Root>
  </div>
</template>
