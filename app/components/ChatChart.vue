<!-- app/components/ChatChart.vue -->
<script setup lang="ts">
import { Pie, Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from 'chart.js'

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
)

const props = defineProps<{
  chart: {
    type: string
    title: string
    labels: string[]
    datasets: { data: number[] }[]
  }
}>()

const colors = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
]

const chartData = computed(() => ({
  labels: props.chart.labels,
  datasets: props.chart.datasets.map((ds, i) => ({
    ...ds,
    backgroundColor: props.chart.type === 'line'
      ? colors[0]
      : colors.slice(0, props.chart.labels.length),
    borderColor: props.chart.type === 'line' ? colors[0] : undefined,
  })),
}))

const chartOptions = computed(() => ({
  responsive: true,
  plugins: {
    title: {
      display: true,
      text: props.chart.title,
    },
  },
}))

const chartComponent = computed(() => {
  switch (props.chart.type) {
    case 'bar': return Bar
    case 'line': return Line
    default: return Pie
  }
})
</script>

<template>
  <div class="w-full max-w-[480px]">
    <component
      :is="chartComponent"
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>
