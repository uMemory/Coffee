/* ================================================================
   ECharts theme — GrandCoffee palette
   ================================================================ */
(function () {
    echarts.registerTheme('coffee', {
        color: ['#f76d37', '#2fa866', '#2374ab', '#f5a623', '#e57b26', '#d64545', '#252525', '#d85521'],
        backgroundColor: 'transparent',
        textStyle: { fontFamily: "'Poppins','Microsoft YaHei',sans-serif" },
        title: { textStyle: { color: '#252525', fontWeight: 700, fontSize: 15 } },
        legend: { textStyle: { color: '#6f6f6f', fontSize: 12 }, icon: 'roundRect', itemWidth: 12, itemHeight: 8 },
        tooltip: { backgroundColor: 'rgba(37,37,37,0.94)', borderWidth: 0, padding: [10,14], textStyle: { color: '#fff', fontSize: 13 }, extraCssText: 'border-radius:4px;' },
        xAxis: { axisLine: { lineStyle: { color: '#e9e9e9' } }, axisTick: { show: false }, axisLabel: { color: '#6f6f6f', fontSize: 11 }, splitLine: { show: false } },
        yAxis: { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#6f6f6f', fontSize: 11 }, splitLine: { lineStyle: { color: '#f4f4f4', type: 'dashed' } } },
    });
})();
