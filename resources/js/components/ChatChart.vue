<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Chart from 'chart.js/auto';
import type { ChartSpec } from '@/types/chart';

const props = defineProps<{
    chart: ChartSpec;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

function renderChart(): void {
    if (!canvas.value) {
        return;
    }

    chartInstance?.destroy();
    chartInstance = new Chart(canvas.value, {
        type: props.chart.type,
        data: {
            labels: props.chart.labels,
            datasets: props.chart.datasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display:
                        props.chart.datasets.length > 1 ||
                        props.chart.type === 'pie' ||
                        props.chart.type === 'doughnut',
                    position: 'bottom',
                },
                title: {
                    display: Boolean(props.chart.title),
                    text: props.chart.title,
                },
            },
        },
    });
}

onMounted(renderChart);

watch(
    () => props.chart,
    () => renderChart(),
    { deep: true },
);

onBeforeUnmount(() => {
    chartInstance?.destroy();
});
</script>

<template>
    <div
        class="h-72 w-full rounded-lg border border-border bg-background p-4 sm:h-80"
    >
        <canvas
            ref="canvas"
            role="img"
            :aria-label="chart.title || `${chart.type} chart`"
        />
    </div>
</template>
