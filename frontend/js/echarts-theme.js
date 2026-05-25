/* ================================================================
   ECharts 自定义主题 — Coffee Quality
   ================================================================ */
(function () {
    const theme = {
        color: [
            '#2F8F62', '#315F88', '#D9A441', '#C96F2D', '#C94E46',
            '#5BBE9E', '#7A4E2D', '#8FD1BD', '#9A6B43', '#E8C9A0'
        ],
        backgroundColor: 'transparent',
        textStyle: { fontFamily: "'Inter', 'Microsoft YaHei', sans-serif" },
        title: {
            textStyle: { color: '#3A2417', fontWeight: 700, fontSize: 15 },
            subtextStyle: { color: '#A0988E', fontSize: 12 }
        },
        legend: {
            textStyle: { color: '#5E554A', fontSize: 12 },
            icon: 'roundRect',
            itemWidth: 12,
            itemHeight: 8,
            itemGap: 16
        },
        tooltip: {
            backgroundColor: 'rgba(24, 20, 16, 0.94)',
            borderWidth: 0,
            padding: [10, 14],
            textStyle: { color: '#fff', fontSize: 13, fontWeight: 400 },
            extraCssText: 'border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.2);'
        },
        grid: { top: 16, right: 20, bottom: 24, left: 20, containLabel: true },
        xAxis: {
            axisLine: { lineStyle: { color: '#E6E1D9' } },
            axisTick: { show: false },
            axisLabel: { color: '#A0988E', fontSize: 11 },
            splitLine: { show: false }
        },
        yAxis: {
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: '#A0988E', fontSize: 11 },
            splitLine: { lineStyle: { color: '#F3F0EC', type: 'dashed' } }
        },
        categoryAxis: {
            axisLine: { lineStyle: { color: '#E6E1D9' } },
            axisTick: { show: false },
            axisLabel: { color: '#5E554A', fontSize: 11 },
            splitLine: { show: false }
        },
        valueAxis: {
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: '#A0988E', fontSize: 11 },
            splitLine: { lineStyle: { color: '#F3F0EC', type: 'dashed' } }
        }
    };
    echarts.registerTheme('coffee', theme);
})();
