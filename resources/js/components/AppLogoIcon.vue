<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

defineOptions({
    inheritAttrs: false,
});

type Props = {
    className?: HTMLAttributes['class'];
};

defineProps<Props>();
</script>

<template>
    <img
        src="/ari-logo.png"
        alt=""
        :class="className"
        v-bind="$attrs"
        aria-hidden="true"
    />
</template>
