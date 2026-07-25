import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import { connectFirebaseEmulators } from './firebase/emulators'

import './styles/main.css'

connectFirebaseEmulators()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
