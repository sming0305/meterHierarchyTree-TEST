<template>
  <section class="subheader-bg min-h-screen flex flex-col">
    <h1 class="px-5 py-2 header-bg border-b border-gray-300 text-xl font-bold">階層設定</h1>
    <div class="px-5 subheader-bg border-b border-gray-300 flex justify-between">
      <p class="grow border-r border-gray-300 py-3">已選取 {{ selectedItems.length }} 個電表</p>
      <div class="flex items-center pl-3">
        <button type="button" class="flex items-center mr-6 cursor-pointer">
          <img class="mr-2 h-4 w-4 mb-1"
            src="../src/assets/image/border_color_20dp_2854C5_FILL0_wght400_GRAD0_opsz20.png" alt="">編輯電表
        </button>
        <button type="button" class="flex items-center" @click="openDialog" :class="{
          'cursor-pointer': selectedItems.length > 0,
          'text-gray-400': selectedItems.length === 0
        }" :disabled="selectedItems.length === 0">
          <img class="mr-1 h-5 w-5 d-block "
            src="../src/assets/image/tab_move_20dp_2854C5_FILL0_wght400_GRAD0_opsz20.png" alt="">
          <span class="leading-tight">移動階層</span>
        </button>
      </div>
    </div>
    <div class="flex grow overflow-x-auto">
      <!-- 第 0 層 (root) -->
      <div class="w-[300px] m-[-1px] border border-gray-300 flex flex-col">
        <p class="py-3 px-5 header-bg border-b border-gray-300">第 0 層</p>
        <ul class="p-1 grow">
          <li v-for="node in meterHierarchyTree" :key="node.id">
            <div
              class="flex items-center justify-between px-4 py-3 rounded hover:bg-gray-300 cursor-pointer select-none"
              :class="{ 'bg-blue-50 text-blue-600': isSelected(node.id) }" @click="handleNodeClick(node, 0, $event)">
              <p class="">{{ node.name }}</p>
              <img v-if="node.children?.length"
                src="../src/assets/image/keyboard_arrow_right_24dp_666666_FILL0_wght400_GRAD0_opsz24.svg" alt="">
            </div>
          </li>
        </ul>
      </div>
      <!-- 第 1 層及更高層級 -->
      <template v-for="level in currentMaxLevel" :key="level">
        <div v-if="selectedNodes[level - 1] && selectedNodes[level - 1].children.length > 0"
          class="w-[300px] m-[-1px] border border-gray-300 flex flex-col">
          <p class="py-3 px-5 header-bg border-b border-gray-300">第 {{ level }} 層</p>
          <ul class="p-1 grow">
            <li v-for="node in selectedNodes[level - 1].children || []"
              class="flex items-center justify-between px-4 py-3 rounded hover:bg-gray-300 cursor-pointer select-none"
              :class="{ 'bg-blue-50 text-blue-600': isSelected(node.id) }"
              @click="handleNodeClick(node, level, $event)">
              <p>{{ node.name }}</p>
              <img v-if="node.children?.length"
                src="../src/assets/image/keyboard_arrow_right_24dp_666666_FILL0_wght400_GRAD0_opsz24.svg" alt="">
            </li>
          </ul>
        </div>
      </template>
    </div>


    <MoveHierarchyModal :visible="visible" :meterFlatList="meterFlatList" :metersToMove="metersToMove"
      @cancel="visible = false">
    </MoveHierarchyModal>
  </section>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import axios from 'axios'
import MoveHierarchyModal from '@/components/MoveHierarchyModal.vue'

// 電表數據
const meterHierarchyTree = ref({})
// 扁平電表數據
const meterFlatList = ref([])


// 追蹤選中的節點
const selectedNodes = ref({})
// 目前需要的最大層數
const currentMaxLevel = ref(1)
// 存儲所有選中的節點
const selectedItems = ref([]);
const metersToMove = ref([])


const visible = ref(false)

axios.get('http://localhost:3001/nodes?flat=false').then((res) => {
  if (!res.data.length) {
    res.data = [{ ...res.data }]
  }
  meterHierarchyTree.value = res.data
  // meterFlatList.value = flattenTreeForSelect(res.data)
  console.log(meterHierarchyTree.value)
  // console.log(meterFlatList.value)
}).catch(err => {
  console.log(err)
})

// axios.get('http://localhost:3001/nodes?flat=true').then((res) => {
//   console.log(res.data)
// }).catch(err => {
//   console.log(err)
// })


// 處理點擊節點
const handleNodeClick = (node, level, event) => {

  // 設置當前層級的選中節點
  selectedNodes.value[level] = node;

  // 清除更高層級的選中節點
  for (let i = level + 1; i < currentMaxLevel.value; i++) {
    selectedNodes.value[i] = null;
  }

  // 更新當前需要的最大層級
  currentMaxLevel.value = level + 1;



  // 處理多選邏輯（按住Ctrl鍵）
  if (event.ctrlKey || event.metaKey) {
    const index = selectedItems.value.findIndex(item => item.id === node.id);
    if (index === -1) {
      // 檢查是否可以添加到選中項（同層級同子樹）
      if (canSelectMultiple(node)) {
        selectedItems.value.push(node);
      }
    } else {
      // 取消選中
      selectedItems.value.splice(index, 1);
    }
  } else {
    // !! 這邊要注意一下，設置當前選中節點是否要移過來這個地方  !!



    // 單選模式
    selectedItems.value = [node];
  }
};

// 檢查是否可以多選（同層級同子樹）
const canSelectMultiple = (node) => {
  if (selectedItems.value.length === 0) return true;

  const firstSelected = selectedItems.value[0];

  // 檢查是否同層級
  if (node.depth !== firstSelected.depth) {
    console.log('不能選擇不同層級的節點');
    return false;
  }

  // 檢查是否同一子樹（有相同的父節點）
  if (node.parent_id !== firstSelected.parent_id) {
    console.log('不能選擇不同子樹的節點');
    return false;
  }

  return true;
};

// 檢查節點是否被選中
const isSelected = (id) => {
  return selectedItems.value.some(item => item.id === id);
};


const openDialog = async () => {
  visible.value = true
  meterFlatList.value = flattenTreeForSelect(meterHierarchyTree.value)
  metersToMove.value = []
  await nextTick()
  metersToMove.value = selectedItems.value
}









// 將樹狀資料扁平化為列表
const flattenTreeForSelect = (nodes, parent_id = null, parentPath = '', result = []) => {

  if (!nodes) return result

  for (const node of nodes) {

    // 構建當前節點的路徑
    const currentPath = parentPath ? `${parentPath}/${node.id}` : `/${node.id}`;

    const option = {
      id: node.id,
      value: node.id,
      name: node.name,
      depth: node.depth,
      parent_id: parent_id,
      path: currentPath  // 添加路徑信息
    };

    result.push(option);

    // 遞歸處理子節點
    if (node.children && node.children.length > 0) {
      flattenTreeForSelect(node.children, node.id, currentPath, result);
    }
  }

  console.log(result)

  return result;
};




</script>

<style scoped>
.header-bg {
  background-color: rgb(245, 245, 239);
}

.subheader-bg {
  background-color: rgb(235, 235, 240);
}
</style>
