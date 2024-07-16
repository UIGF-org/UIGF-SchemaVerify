import { createRouter, createWebHistory } from 'vue-router';
import verify from '@/views/verify.vue';
import conversion from '@/views/conversion.vue';

const routes = [
  {
    path: '/',
    redirect: 'Conv'
  },
  {
    path: '/verify',
    name: 'Verify',
    component: verify,
  },
  {
    path: '/conv',
    name: 'Conv',
    component: conversion
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;