# homework 電表階層管理系統

模擬電表以階層方式展開供查閱各電表階層關係，並可使用移動階層 Modal  &  拖曳移動階層兩種方式對電表階層進行異動操作。

## 安裝與啟動

步驟 1. 請將壓縮檔解壓縮後，於同壓縮檔內另一名稱 mock-API 資料夾內先以終端機運行以下:
```
npm i
npm run start

```

步驟 2. 請於資料夾 blutech-project 內，以終端機運行以下:
```
npm i
npm run dev

# Vue3 Node.js 版本要求 ^20.19.0 || >=22.12.0
# 開發時使用 Node.js 版本為 24.12.0
# 若版本不符合要求，可以透過以下方式安裝或更新：
[官方安裝包](https://nodejs.org/en/download/)：
```

步驟 3. 將服務貼至瀏覽器進行操作如:
```
e.g.  ➜  Local:   http://localhost:5173/
```

## 專案資料夾結構

blutech-project/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/
│   │   └── image/ # 專案內圖片
│   │       
│   ├── components/
│   │   └── MoveHierarchyModal.vue  # 移動階層的彈出視窗元件
│   ├── router/
│   │   └── index.js                # router 路由檔
│   ├── stores/
│   │   └── infoStore.js            # Pinia 共用狀態管理
│   ├── views/
│   │   └── MeterHierarchicalSystem.vue  # 主要電表階層管理視圖
│   ├── App.vue                     # 根元件
│   └── main.js                     # 應用程式入口點
├── index.html                      # HTML 模板
├── package.json                    # 專案依賴與腳本
├── vite.config.js                  # Vite 設定檔
└── README.md                       # 專案說明文件


## 功能對應 / 套件
框架 : Vue.js (v3.5.26)
電表階層顯示與管理樣式：Tailwind 
拖曳功能：Vue Draggable Plus
API：Axios
狀態管理：Pinia
UI 元件與提示元件：Element Plus
路由：Vue Router