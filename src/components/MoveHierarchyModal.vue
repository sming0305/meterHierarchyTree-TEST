<template>
    <el-dialog v-model="dialogVisible" width="700" center :show-close="false" class="!rounded-xl overflow-hidden !p-0"
        :close-on-click-modal="false">
        <template #header>
            <p class="pb-2 pt-5 text-xl font-bold">移動階層</p>
        </template>
        <div class="pb-10 px-7 border-b border-gray-300">
            <p class="text-lg text-black mb-1">選取父電表</p>
            <p class="mb-2">移動至此父電表</p>
            <el-select placeholder="搜尋/選取父電表" class="mb-6 custom-select" v-model="targetMeter"
                @change="validateSelection" suffix-icon="">
                <el-option v-for="item in options" :key="item.value" :label="item.name" :value="item.value" />
            </el-select>
            <p class="text-lg text-black mb-1">移動設備</p>
            <p class="mb-2">此次移動之設備 <span class="text-red-600">*</span></p>
            <div class="border border-gray-300 p-4 rounded-xl flex flex-wrap">
                <el-tag v-for="(meter, index) in localMetersToMove" :key="meter.name" closable :type="'info'"
                    effect="plain" round class="mr-2" @close="removeMeter(index)">
                    {{ meter.name }}
                </el-tag>
            </div>
        </div>
        <div class="py-3 px-7 flex justify-end items-center">
            <button type="button" class="px-4 py-2 text-red-600 mr-3 cursor-pointer"
                @click="metersMoveAction(false)">取消</button>
            <el-button type="primary" size="large" color="#306FD9" class="!rounded-lg"
                @click="metersMoveAction(true)">確定</el-button>
        </div>
    </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import axios from 'axios'
import { ElMessageBox } from 'element-plus'
import infoStore from '@/stores/infoStore.js'

const emit = defineEmits(['confirm', 'cancel']);

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    meterFlatList: {
        type: Array,
        default: () => []
    },
    metersToMove: {
        type: Array,
        default: () => []
    }
});

// 本地狀態
const dialogVisible = ref(props.visible); // 是否顯示對話框
const options = ref(props.meterFlatList); //父電表選項列表
const localMetersToMove = ref([]); // 欲移動的設備 (副本，刪減不影響 props)
const targetMeter = ref(null) // 選定的父電表
const useInfoStore = infoStore()
const { errorMessageBoxSetting } = useInfoStore

watch(() => props.visible, (newValue) => {
    dialogVisible.value = newValue;
});
watch(() => props.meterFlatList, (newValue) => {
    newValue.unshift({
        id: null,
        value: 0,
        name: '第 0 層',
        depth: 0,
        parent_id: null,
        path: null
    });
    options.value = newValue;
});
watch(() => props.metersToMove, (newValue) => {
    localMetersToMove.value = JSON.parse(JSON.stringify(newValue));
}, {
    deep: true
})

const removeMeter = (index) => {
    if (localMetersToMove.value.length === 1) {
        ElMessageBox.confirm('若要移動階層請至少保留一個設備。', '錯誤', errorMessageBoxSetting)
        return
    }
    localMetersToMove.value.splice(index, 1)
}

function validateSelection(value) {
    const targetMeterInfo = options.value.find(item => item.value === value)

    // 規則 1. 不可移動到自身
    if (localMetersToMove.value.some(meter => meter.value === value)) {
        targetMeter.value = null
        ElMessageBox.confirm('不可將電表移動到自身，請重新設定。', '設定錯誤 (電表移動到自身)', errorMessageBoxSetting)
        return
    }
    // 規則 2. 不可移動到自身的子孫節點
    if (targetMeterInfo.path !== null && localMetersToMove.value.some(meter => targetMeterInfo.path.startsWith(meter.path))) {
        targetMeter.value = null
        ElMessageBox.confirm('不可將電表移動到自身的子孫節點底下，請重新設定。', '設定錯誤 (自身子孫節點)', errorMessageBoxSetting)
        return
    }
    // 規則 3. 不可移動到與原本相同的父層
    if (localMetersToMove.value.some(meter => meter.parent_id === targetMeterInfo.id)) {
        targetMeter.value = null
        ElMessageBox.confirm('不可將電表移動到與原本相同的父層，請重新設定。', '設定錯誤 (相同父層)', errorMessageBoxSetting)
        return
    }
}

//  執行設備移動或關閉視窗
async function metersMoveAction(action) {
    try {
        if (action) {
            if (targetMeter.value === null) {
                ElMessageBox.confirm('請設定要移動的目標父電表。', '設定錯誤', errorMessageBoxSetting)
                return
            }
            const node_ids = localMetersToMove.value.map(meter => meter.id)
            const target_parent_id = targetMeter.value === 0 ? null : targetMeter.value
            const payload = { target_parent_id, node_ids }

            await axios.patch('http://localhost:3001/nodes/move', payload)
            emit('confirm', localMetersToMove.value, true)
        } else {
            emit('cancel')
        }
    } catch (err) {
        console.log(err.response.data)
        ElMessageBox.confirm(`${err.response.data.error}，請重新設定正確的目標父電表或稍後再試。`, '設定失敗', errorMessageBoxSetting)
    } finally {
        targetMeter.value = null
    }
}
</script>

<style scoped>
:deep(.el-select__wrapper) {
    padding: 12px;
    border-radius: 10px;
}

.custom-select :deep(.el-select__suffix) {
    background: url('@/assets/image/arrow_drop_down_24dp_666666_FILL0_wght400_GRAD0_opsz24.svg') no-repeat center;
    background-size: contain;
    width: 24px !important;
    height: 24px !important;
    margin-top: -2px;
    transform: none !important;
    color: transparent !important;
}
</style>