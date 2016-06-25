console.log('mamao')          
$.get('delacoes.csv', function(csv) {
    $('#Citacoes').highcharts({
        chart: {
            type: 'bar'
        },
        data: {
            csv: csv
        },
        title: {
            text: 'Citacoes em delacoes'
        },
        
        
        plotOptions: {
            series: {
                stacking: 'normal'
            },
        },
    });
});
console.log('melao')