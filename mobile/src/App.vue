<template>
  <ion-app>
    <SplashScreenMobile />
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import SplashScreenMobile from './components/SplashScreenMobile.vue';
</script>
