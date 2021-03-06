
// http://meucongressonacional.com/lavajato/empresas

	var bChart = dc.bubbleChart("#doacoes_partidos");
	var empreiteirasChart = dc.barChart("#doacoes_empreiteira")

		
		d3.csv('static/dados/doacoes.csv',function (total_doacoes) {
			d3.csv('static/dados/doacoes2.csv',function(doacoes){

				find = {}
				cores = {
					"PT" : '#FF0000',
					"PSDB" : 'blue',
					"PMDB" : "green",
					"PP" : "steelblue",
					'SD' : 'orange',
					'PTB' : 'magenta',
					'outros' : 'grey'
				}
				total_doacoes.forEach(function(d){
					d.Valor = +d.Valor;
					d.Total = +d.Total;
					d.Envolvidos = +d.Envolvidos;
					find[d.Partido] = {
						"nEnvolvidos" : d.Envolvidos,
						'total' : d.Total,
					}
				})
				doacoes.forEach(function(d){
						d.Valor = +d.Valor;
				})

				var facts_total = crossfilter(total_doacoes);

				var facts_doacoes = crossfilter(doacoes);
				
				var dimensao_partido_total = facts_total.dimension(function(d){
					return d.Partido;
				})
				var dimensao_partido_doacoes = facts_doacoes.dimension(function(d){
					return d.Partido;
				})
				

				var grupo_total_por_partido = dimensao_partido_total.group().reduceSum(function(x){
					return x.Total
				})
				l = grupo_total_por_partido.top(Infinity)
				//totais_por_partido e usado para determinar o valor x das bolhas em fucnao do partido.
				totais_por_partido = {}
				for (var i = l.length - 1; i >= 0; i--) {
					totais_por_partido[l[i].key] = l[i].value
				}
				
				
				
				var doacoes_suspeitas_por_partido = dimensao_partido_doacoes.group().reduceSum(function(d){
					return d.Valor
				})

				
				partidos_filtrados = []
				// console.log(find['PT']['total'])
				bChart.dimension(doacoes_suspeitas_por_partido)
					.group(doacoes_suspeitas_por_partido,'Valor')
					.turnOnControls(true)
					.mouseZoomable(true)
					.zoomOutRestrict(true)
					.title(function(d){
						// if(d.key == 'PT')
							// console.log( d.key + '+' + d.value)
						if(d.key in find){
							total = find[d.key]['total']
							pr = d.value/total*100
							n = find[d.key]['nEnvolvidos']
							return d.key + 
								"\nProveniente de empresas envolvidas: R$ " 
								+ d.value.toFixed(2) + 'M ('+pr.toFixed(1)+'%)'+
								"\nMembros investigados na Lava-Jato: "+ n + 
								'\nTodas as doacoes: R$'+total.toFixed(2)+' Milhões';
						}
					})
					.keyAccessor(function(p){
						return totais_por_partido[p.key]
					})
					.valueAccessor(function (p) {
						return p.value
					})
					.radiusValueAccessor(function (p) {
						return 10;
					})
					.width(600)
					.height(400)
					.colors(function(d){return cores[d]})
					.colorAccessor(function (d, i){
						if(d.key in cores)
							return d.key;
						else
							return 'outros'
					})
					.sortBubbleSize(true)
					.radiusValueAccessor(function(d,x){
						if(d.key in find)
							var ne = find[d.key]['nEnvolvidos'];
							if(ne != 0)
								return 1.*(ne+6);
						return 0.3;
						})
					.renderHorizontalGridLines(true)
					.renderVerticalGridLines(true)
					.x(d3.scale.linear().domain([0,700]))
					.y(d3.scale.linear().domain([0,140]))
					.xAxisLabel('Total arrecadado em doacoes - Milhões R$')
					.yAxisLabel('Doações de empresas envolvidas na Lava Jato - Milhões')
					.on('renderlet.click',function(chart){
						chart.selectAll("g.node circle").on("click.me", function(d){
					    	console.log(partidos_filtrados)
					    	var index = partidos_filtrados.indexOf(d.key)
					    	console.log(index);
					    	if( index != -1)
					    		partidos_filtrados.splice(index,1)
					    	else
					    		partidos_filtrados.push(d.key)
					    	console.log(partidos_filtrados)
					        dimensao_partido_doacoes.filter(function(f){
					        	if(partidos_filtrados.length != 0)
						        	return partidos_filtrados.includes(f);
								else
									return true
					        })

					        dc.redrawAll(chart.chartGroup());

					    })
					})
					.on('zoomed',function(d){
						bChart.filterAll();
					})	

				$("#reset_button").click(function() {
					dimensao_partido_doacoes.filter(null);
					bChart.filterAll()
					empreiteirasChart.filterAll()
					dc.redrawAll();
					partidos_filtrados = []
						
				})
			
				var dimensao_empresa = facts_doacoes.dimension(function(d){
					return d.Empresa;
				})
				var g = dimensao_empresa.group().reduceSum(dc.pluck('Valor'))
				
				empreiteirasChart.dimension(dimensao_empresa)
					.width(300)
					.height(400)
					// .centerBar(true)
					.margins({top: 30, right: 50, bottom: 140, left: 40})
					.group(g,'Valor')
					.x(d3.scale.ordinal())
					.xUnits(dc.units.ordinal)
					.ordering(dc.pluck('value'))
					.renderHorizontalGridLines(true)
					.renderVerticalGridLines(true)
					.yAxisLabel('Total de doações em Milhões')
					.title(function(d){
						return d.key + ': R$' + d.value.toFixed(2) + 'M'
					})
					
				
				dc.renderAll();
			});
		});

			