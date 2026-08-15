import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { setupDocumentMeta } from './router/document-meta'
import { registerRouterGuards, registerSessionReconciliation } from './router/guards'
import { i18n } from './i18n'

import { connectFirebaseEmulators } from './firebase/emulators'

import './main.css'

connectFirebaseEmulators()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
setupDocumentMeta(router, i18n)
registerRouterGuards(router, pinia)
registerSessionReconciliation(router, pinia)
app.use(router)

app.mount('#app')
