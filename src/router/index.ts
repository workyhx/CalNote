import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/note',
      component: () => import('@/views/note/NotePage.vue'),
    },
  ],
})

export default router
