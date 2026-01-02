import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export default defineStore('infoStore', {
    state: () => ({
        errorMessageBoxSetting: {
            confirmButtonText: '確認',
            showCancelButton: false,
            type: 'error',
            confirmButtonClass: '!bg-red-500 !border !border-red-500'
        },
        successMessageBoxSetting: {
            confirmButtonText: 'OK',
            showCancelButton: false,
            type: 'success',
            confirmButtonClass: '!bg-blue-500 !border !border-blue-500'
        },
    })
})
