import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import SingleCall from '../views/SingleCall.vue'
import MultiCall from '../views/MultiCall.vue'
import NCEngine from '../utils/NCEngine'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login
  },
  {
    path: '/single-call',
    name: 'SingleCall',
    component: SingleCall,
    meta: { requiresAuth: true }
  },
  {
    path: '/multi-call',
    name: 'MultiCall',
    component: MultiCall,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard to check if user is connected
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const isConnected = NCEngine.getCurrentUserId() !== null

  if (requiresAuth && !isConnected) {
    // Redirect to login page if not connected
    next({ name: 'Login' })
  } else {
    next()
  }
})

export default router
