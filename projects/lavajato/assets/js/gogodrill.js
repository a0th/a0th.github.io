

$(document).ready(function(){
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
    console.log(chaveslist)
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
        console.log(nomeDaChave)
        data  = $.ajax({type: "GET", url: 'assets/data/'+nomeDaChave+'s.csv', async: false, })['responseText'];
        var dados = $.csv.toObjects(data);
        for (var j = dados.length - 1; j >= 0; j--) {
            listaDeObjetos[i].data.push([ dados[j][nomeDaChave] , +dados[j]['Envolvidos'] ]);
        }        
    }
    return listaDeObjetos;
}
    
    var dados = d3.csv('assets/data/envolvidos.csv',function(dados){
        l = build_data(dados);
        d = build_drill(chaves);
        // console.log(d);
        $(function () {
            // Create the chart
            $('#envolvidos').highcharts({
                chart: {
                    type: 'column'
                },
                title: {
                    text: ''
                },
                subtitle: {
                    text: ''
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


    })

});
