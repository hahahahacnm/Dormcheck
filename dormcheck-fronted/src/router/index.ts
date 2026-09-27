import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import AdminLayout from '../layouts/AdminLayout.vue'

const Dashboard = () => import('../views/Dashboard.vue')
const StudentBind = () => import('../views/StudentBind.vue')
const StudentBindEditor = () => import('../views/StudentBindEditor.vue')
const Tasks = () => import('../views/Tasks.vue')
const TaskEditor = () => import('../views/TaskEditor.vue')
const About = () => import('../views/About.vue')
const Guide = () => import('../views/Guide.vue')
const Updates = () => import('../views/Updates.vue')
const NotFound = () => import('../views/NotFound.vue')
const AdminUsers = () => import('../views/AdminUsers.vue')
const AdminStudentBlacklist = () => import('../views/AdminStudentBlacklist.vue')
const AdminSettings = () => import('../views/AdminSettings.vue')
const AdminUpdates = () => import('../views/AdminUpdates.vue')

const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', component: Dashboard },
      { path: 'student-bind', component: StudentBind },
      { path: 'student-bind/add', component: StudentBindEditor },
      { path: 'student-bind/:stuId/edit', component: StudentBindEditor },
      { path: 'tasks', component: Tasks },
      { path: 'tasks/new', component: TaskEditor },
      { path: 'tasks/edit/:taskId', component: TaskEditor },
      { path: 'about', component: About },
      { path: 'guide', component: Guide },
      { path: 'updates', component: Updates },
    ],
  },
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      { path: '', redirect: '/admin/users' },
      { path: 'users', component: AdminUsers },
      { path: 'students/blacklist', component: AdminStudentBlacklist },
      { path: 'updates', component: AdminUpdates },
      { path: 'settings', component: AdminSettings },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
