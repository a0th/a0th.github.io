$.get('static/dados/delacoes.csv', function(csv) {
    console.log(csv)
    // csv.forEach(function(d){
    //         d.Cervero = +d.Cervero;
    //         d.delcidio = +d.delcidio;
    //         d.Cervero = +d.Cervero;
    //         d.Youssef = +d.Youssef;
    //         d['Paulo Roberto Costa'] = +d['Paulo Roberto Costa'];

    //     });
 
    $('#citacoes').highcharts({
        chart: {
            type: 'bar'
        },
        data: {
            csv: csv
        },
        title: {
            text: ''
        },
        
        
        plotOptions: {
            series: {
                stacking: 'normal'
            },
        },
    });
});
console.log('melao')