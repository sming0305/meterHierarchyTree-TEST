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
        <VueDraggable group="meters" v-model="meterHierarchyTree" class="p-1 grow" v-if="draggableInitialized">
          <div v-for="node in meterHierarchyTree" :key="node.id"
            class="flex items-center justify-between px-4 py-3 rounded hover:bg-gray-300 cursor-pointer select-none"
            :class="{ 'bg-blue-50 text-blue-600': isSelected(node.id) }" @click="handleNodeClick(node, 0, $event)">
            <p>{{ node.name }}</p>
            <img v-if="node.children?.length"
              src="../src/assets/image/keyboard_arrow_right_24dp_666666_FILL0_wght400_GRAD0_opsz24.svg" alt="">
            <!-- 項目作為容器 -->
            <VueDraggable v-model="node.children" group="meters" class="drop-zone border border-gray-400" v-if="draggableInitialized">
              <!-- 這裡可以為空，因為子項目會顯示在下一列 -->
            </VueDraggable>
          </div>
        </VueDraggable>
      </div>
      <!-- 第 1 層及更高層級 -->
      <template v-for="level in currentMaxLevel" :key="level">
        <div v-if="selectedNodes[level - 1] && selectedNodes[level - 1].children.length > 0"
          class="w-[300px] m-[-1px] border border-gray-300 flex flex-col">
          <p class="py-3 px-5 header-bg border-b border-gray-300">第 {{ level }} 層</p>
          <VueDraggable group="meters" v-model="selectedNodes[level - 1].children" class="p-1 grow" v-if="draggableInitialized">
            <div v-for="node in selectedNodes[level - 1].children || []"
              class="flex items-center justify-between px-4 py-3 rounded hover:bg-gray-300 cursor-pointer select-none"
              :class="{ 'bg-blue-50 text-blue-600': isSelected(node.id) }"
              @click="handleNodeClick(node, level, $event)">
              <p>{{ node.name }}</p>
              <img v-if="node.children?.length"
                src="../src/assets/image/keyboard_arrow_right_24dp_666666_FILL0_wght400_GRAD0_opsz24.svg" alt="">
              <!-- 項目作為容器 -->
              <VueDraggable v-model="node.children" group="meters" class="drop-zone border border-gray-400" v-if="draggableInitialized">
                <!-- 這裡可以為空，因為子項目會顯示在下一列 -->
              </VueDraggable>
            </div>
          </VueDraggable>
        </div>
      </template>
    </div>
    <MoveHierarchyModal :visible="visible" :meterFlatList="meterFlatList" :metersToMove="metersToMove"
      @cancel="visible = false" @confirm="refreshData">
    </MoveHierarchyModal>
  </section>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import axios from 'axios'
import MoveHierarchyModal from '@/components/MoveHierarchyModal.vue'
import { ElMessageBox } from 'element-plus'
import { VueDraggable } from 'vue-draggable-plus';

// 電表數據
const meterHierarchyTree = ref({})
// 扁平電表數據
const meterFlatList = ref([])

// 追蹤選中的節點完整路線
const selectedNodes = ref({})
// 目前需要渲染的最大層數
const currentMaxLevel = ref(1)
// 存儲所有選中的節點
const selectedItems = ref([]);
// 欲移動的裝置
const metersToMove = ref([])

const visible = ref(false)

// 考慮集中到 pinia
const errorMessageBoxSetting = {
  confirmButtonText: '確認',
  showCancelButton: false,
  type: 'error',
  confirmButtonClass: '!bg-red-500 !border !border-red-500'
}

// 標記拖曳功能是否已初始化
const draggableInitialized = ref(false);

async function getMeterHierarchyTreeAction() {
  try {
    const res = await axios.get('http://localhost:3001/nodes?flat=false')
    if (!res.data.length) res.data = [{ ...res.data }]
    meterHierarchyTree.value = res.data
  } catch (err) {
    console.log(err)
  }
}

// 移動設備後重新獲取資料並正確渲染電表
async function refreshData(finalMetersToMove) {

  // 保存原始選中的節點 ID
  const selectedIds = finalMetersToMove.value.map(item => item.id);

  // 1. 獲取新資料
  await getMeterHierarchyTreeAction();

  // 2. 扁平化樹結構
  const flatNodes = flattenTreeForSelect(meterHierarchyTree.value);

  // 3. 找出其中一個移動的節點作為參考
  const movedNode = flatNodes.find(node => node.id === finalMetersToMove.value[0].id)

  // 4. 構建從根到該節點的路徑
  const pathNodes = [];
  pathNodes.unshift(movedNode) // 將該節點也完整加入路徑

  let currentNode = movedNode;

  // 先找到該節點的父節點
  let parentNode = flatNodes.find(node => node.id === movedNode.parent_id);

  // 向上追溯到根
  while (parentNode) {
    pathNodes.unshift(parentNode); // 添加到路徑前面
    currentNode = parentNode;
    parentNode = flatNodes.find(node => node.id === currentNode.parent_id);
  }

  // 5. 重置選中狀態
  selectedNodes.value = {};

  // 6. 設置路徑上的每個節點為選中
  pathNodes.forEach((node, index) => {
    selectedNodes.value[index] = node;
  });

  // 7. 設置最大層級
  currentMaxLevel.value = pathNodes.length + 1;

  // 8. 更新選中的節點
  selectedItems.value = [];
  selectedIds.forEach(id => {
    const updatedNode = flatNodes.find(node => node.id === id);
    selectedItems.value.push(updatedNode);
  })

  // 9. 關閉 modal
  visible.value = false;
}

getMeterHierarchyTreeAction()

// 處理點擊節點
const handleNodeClick = (node, level, event) => {

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

    // 設置當前層級的選中節點
    selectedNodes.value[level] = node;
    // 清除更高層級的選中節點
    for (let i = level + 1; i < currentMaxLevel.value; i++) {
      selectedNodes.value[i] = null;
    }
    // 更新當前需要的最大層級
    currentMaxLevel.value = level + 1;

    // 單選模式
    selectedItems.value = [node];

    console.log('第 0 層數據結構:', meterHierarchyTree.value);
    console.log('第 1 層數據結構:', selectedNodes.value[0]?.children);
  }

};

// 檢查是否可以多選（同層級同子樹）
const canSelectMultiple = (node) => {
  if (selectedItems.value.length === 0) return true;

  const firstSelected = selectedItems.value[0];

  // 檢查是否同層級
  if (node.depth !== firstSelected.depth) {
    // console.log('不能選擇不同層級的節點');
    ElMessageBox.confirm('多選時不能選擇不同層級的節點，請重新設定。', '錯誤 (跨層級選擇節點)', errorMessageBoxSetting)
    return false;
  }

  // 檢查是否同一子樹（有相同的父節點）
  if (node.parent_id !== firstSelected.parent_id) {
    // console.log('不能選擇不同子樹的節點');
    ElMessageBox.confirm('多選時不能選擇不同子樹的節點，請重新設定。', '錯誤 (不同子樹)', errorMessageBoxSetting)
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

    // 樹狀資料加上追蹤用數據
    node.value = node.id
    node.parent_id = parent_id
    node.path = currentPath

    // 整理扁平化資料內容
    const option = {
      id: node.id,
      value: node.id,
      name: node.name,
      depth: node.depth,
      parent_id: parent_id,
      path: currentPath,
      children: node.children
    };

    result.push(option);

    // 遞歸處理子節點
    if (node.children && node.children.length > 0) {
      flattenTreeForSelect(node.children, node.id, currentPath, result);
    }
  }

  return result;
};

// 拖曳結束後處理
const onDragEnd = (evt) => {
  console.log('拖曳結束', evt);
  console.log('從', evt.from);
  console.log('到', evt.to);
  console.log('拖曳的項目', evt.item);
  console.log('原始索引', evt.oldIndex);
  console.log('新索引', evt.newIndex);
};


// 在組件掛載後延遲初始化
onMounted(() => {
  setTimeout(() => {
    draggableInitialized.value = true;
  }, 100);
});
</script>

<style scoped>
.header-bg {
  background-color: rgb(245, 245, 239);
}

.subheader-bg {
  background-color: rgb(235, 235, 240);
}

.drop-zone {
  height: 60px;
  width: 160px;
  background-color: rgba(200, 200, 200, 0.2);
  transition: all 0.2s;
  margin: 2px 0;
  border-radius: 4px;
}

.drop-zone:hover {
  height: 20px;
  background-color: rgba(59, 130, 246, 0.3);
}

.ghost {
  opacity: 0.5;
  background: #c8ebfb !important;
}
</style>
