
var str = 'data.csv';
var v = [1,2,3];
var chaves = [];
var build_data = function(d){
    l = []
    for (var i = d.length - 1; i >= 0; i--) {
        var v = {
            name: d[i].name,
            y: +d[i].y,
            drilldown : d[i].drilldown,
        }
        chaves.push(d[i].name);
        l.push(v)
    }
    return l;
}
var build_drill = function(chaveslist){
    var listaDeObjetos = [];
    for (var i = chaveslist.length - 1; i >= 0; i--) {
        var nomeDaChave = chaveslist[i].substring(0,chaveslist[i].length-1);
        if(nomeDaChave != "Outro"){
            var objeto = {
                name : chaveslist[i],
                id : chaveslist[i],
                data : [],
            };
            listaDeObjetos.push(objeto);
        }
    }

    for (var i = listaDeObjetos.length-1; i >= 0; i--) {
        var nomeDaChave = listaDeObjetos[i].id.substring(0,chaveslist[i].length-1);
        data  = $.ajax({type: "GET", url: nomeDaChave+'s.csv', async: false, })['responseText'];
        var dados = $.csv.toObjects(data);
        for (var j = dados.length - 1; j >= 0; j--) {
            listaDeObjetos[i].data.push([ dados[j][nomeDaChave] , +dados[j]['Envolvidos'] ]);
        }        
    }
    return listaDeObjetos;
}
        

// {
//     name: 'Microsoft Internet Explorer',
//     id: 'Microsoft Internet Explorer',
//     data: [
//         [
//             'v11.0',
//             24.13
//         ],
//         [
//             'v8.0',
//             17.2
//         ],
//         [
//             'v9.0',
//             8.11
//         ],
//         [
//             'v10.0',
//             5.33
//         ],
//         [
//             'v6.0',
//             1.06
//         ],
//         [
//             'v7.0',
//             0.5
//         ]
//     ]
// }
$.get(str, function(data) {    
    var dados = $.csv.toObjects(data);
    l = build_data(dados);
    d = build_drill(chaves);
    console.log(d);
    $(function () {
        // Create the chart
        $('#container').highcharts({
            chart: {
                type: 'column'
            },
            title: {
                text: 'Numero de investigados por grupo'
            },
            subtitle: {
                text: 'Clique nas colunas para mais detalhes'
            },
            xAxis: {
                type: 'category'
            },
            yAxis: {
                title: {
                    text: 'Numero de envolvidos'
                }

            },
            legend: {
                enabled: false  
            },
            plotOptions: {
                series: {
                    borderWidth: 0,
                    dataLabels: {
                        enabled: true,
                        format: '{point.y:.0f}'
                    }
                }
            },

            tooltip: {
                headerFormat: '',
                
                pointFormat: 'Envolvidos de {point.name}: <b>{point.y:.0f}</b> <br/>'
            },

            series: [{
                // name: 'Brands',
                colorByPoint: true,
                data: l
            }]
            ,
            drilldown: {
                series: d
            }
        });
    });
});
