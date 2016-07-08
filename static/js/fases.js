
		var composite = dc.compositeChart("#grafico_composite_fases"); 
		var chartConducao = dc.lineChart(composite,'gogo');
		var chartPrisoes = dc.lineChart(composite,'gogo');
		var chartBusca = dc.lineChart(composite,'gogo');
		var chartBarras = dc.barChart("#barras_fases")
		var numberChartConducao = dc.numberDisplay("#contaConducao")
		var numberChartPrisao = dc.numberDisplay("#contaPrisao")
		var numberChartBusca = dc.numberDisplay("#contaBusca")
		
		
		var dim_tipo;
		var grid = dc.dataGrid("#datagrid")
		d3.csv('static/dados/fases2.csv',function(data2){
			d3.csv('static/dados/fases.csv',function (data) {
				var dataFormat = d3.time.format("%d/%m/%Y");
				var fases = {}
				var fotos = {}
				var fases = {}
				data.forEach(function(d){
					d.Data = dataFormat.parse(d.Data);
					d.Fase = +d.Fase;
					d.Valor = +d.Valor;
					fases[d.Data] = d.Fase;
					// d.Tipo = d.Tipo;
				})
				data2.forEach(function(d){
					d.Data = dataFormat.parse(d.Data);
					fotos[d.Nome] = d.Foto;
				})
				var facts = crossfilter(data);
				var dados2 = crossfilter(data2);
				var dim = facts.dimension(function(x){
					return x.Data;
				})
				dim_tipo = facts.dimension(function(x){
					return x.Tipo;
				})
				dim_tipo_2 = dados2.dimension(function(x){
					return x.Tipo;
				})

				var dimensao_dados2_Data = dados2.dimension(dc.pluck("Data"))
				$("#reset_button").click(function() {
						dim_tipo.filter(null);
						composite.filterAll()
						dc.redrawAll();
							
					})

				$("#delete_button").click(function() {
						dim_tipo.filter(function(d){return false;});
						composite.filterAll()
						dc.redrawAll();
							
					})
				

				var gConducao  = dim.group().reduceSum(function(d){
					if(d.Tipo == 'Conducao')
						return d.Valor;
					else
						return 0;
				})
				var gPrisao = dim.group().reduceSum(function(d){
					if(d.Tipo == 'Prisao')
						return d.Valor;
					else
						return 0;
					
				})
				var gBusca = dim.group().reduceSum(function(d){
					if(d.Tipo == 'Busca')
						return d.Valor;
					else
						return 0;
				})
				filtro_nomes = ['Busca','Conducao','Prisao']
				filtro_datas = []
				var fConducaoAdd = function(p,v){
				
					if(v.Tipo == "Conducao")
						p.n += v.Valor;
					return p;
				}
				var fConducaoRemove = function(p,v){
					if(v.Tipo == "Conducao")
						p.n -= v.Valor;
					return p;
				}
				var fConducaoInitial = function(p,v){
					return {n:0};
				}
				var fPrisaoAdd = function(p,v){
				
					if(v.Tipo == "Prisao")
						p.n += v.Valor;
					return p;
				}
				var fPrisaoRemove = function(p,v){
					if(v.Tipo == "Prisao")
						p.n -= v.Valor;
					return p;
				}
				var fPrisaoInitial = function(p,v){
					return {n:0};
				}
				var fBuscaAdd = function(p,v){
				
					if(v.Tipo == "Busca")
						p.n += v.Valor;
					return p;
				}
				var fBuscaRemove = function(p,v){
					if(v.Tipo == "Busca")
						p.n -= v.Valor;
					return p;
				}
				var fBuscaInitial = function(p,v){
					return {n:0};
				}
				

				var grupo_conducao_counter = facts.groupAll().reduce(fConducaoAdd,fConducaoRemove,fConducaoInitial)
				var grupo_prisao_counter = facts.groupAll().reduce(fPrisaoAdd,fPrisaoRemove,fPrisaoInitial)
				var grupo_busca_counter = facts.groupAll().reduce(fBuscaAdd,fBuscaRemove,fBuscaInitial)

				numberChartConducao.group(grupo_conducao_counter)
					.valueAccessor(function(d){
						return d.n
					})
				numberChartPrisao.group(grupo_prisao_counter)
					.valueAccessor(function(d){
						return d.n
					})
				numberChartBusca.group(grupo_busca_counter)
					.valueAccessor(function(d){
						return d.n
					})

				chartBarras.dimension(dim)
					.centerBar(false)
					.group(gConducao)
					.stack(gBusca)
					.elasticY(true)
					.stack(gPrisao)
					.x(d3.scale.ordinal())
					.xUnits(dc.units.ordinal)
					.width(700)
					.height(200)
					.barPadding(0.2)
					.title(function(d){
						return fases[d.key] + "ª Fase\n" + "Valor: " + d.value;
					})
					.margins({top:30,bottom:50,left:30,right:30})
					.renderHorizontalGridLines(true)
					.on('filtered',function(d,f){
						composite.filter(null)
						dimensao_dados2_Data.filter(function(x){
							for (var i = d.filters().length - 1; i >= 0; i--) {
								if(d.filters()[i].getTime() == x.getTime())
									return true;
							}
							return false;
						})
						// dim.filter(f)
						composite.render()
						grid.render()
						numberChartConducao.render()
						numberChartPrisao.render()
						numberChartBusca.render()

					})
					.xAxis()
					.tickFormat(d3.time.format('%d/%m/%y'))

				chartConducao.dimension(dim)
					.group(gConducao,'Conducoes Coercitivas')
					.dotRadius(10)
					.colors('#1b9e77')
					.interpolate('cardinal')
					.elasticY(true)
					
					.renderArea(false)
					.renderDataPoints({radius: 3.5, fillOpacity: 0.8, strokeOpacity: 0.8})
					.tension(0.78)
					.title(function(d){
						return 'Fase: '+fases[d.key]+ '\nConduções coercitivas em ' + dataFormat(d.key) +': '+d.value;
					})

				chartPrisoes.dimension(dim)
					.group(gPrisao,'Prisoes')
					.colors('#7570b3')
					.tension(0.78)
					.dotRadius(10)
					.elasticY(true)
					
					.brushOn(true)
					
					.renderArea(false)
					.interpolate('cardinal')
					.renderDataPoints({radius: 3.5, fillOpacity: 0.8, strokeOpacity: 0.8})
					.title(function(d){
						return 'Fase: '+fases[d.key]+ '\nPrisões efetuadas em ' + dataFormat(d.key) +': '+d.value;
					})			
					
				chartBusca.dimension(dim)
					.group(gBusca,'Busca e Apreensao')
					.renderDataPoints(true)
					.colors('#d95f02')
					.interpolate('cardinal')
					.tension(0.78)
					.brushOn(true)
					.elasticY(true)
					
					.on('filtered',function(chart,f){
						dimensao_dados2_Data.filter(f)
						dim.filter(f)
						numberChartConducao.render()
						numberChartPrisao.render()
						numberChartBusca.render()
						grid.render()
					})
					.renderArea(false)
					.renderDataPoints({radius: 3.5, fillOpacity: 0.8, strokeOpacity: 0.8})

					.dotRadius(10)
					.title(function(d){
						return  'Fase: '+fases[d.key]+ '\nBuscas e apreensões em ' + dataFormat(d.key) +': '+d.value;
					})
					filtro_nomes = ['Busca','Conducao','Prisao']
					filtro_datas = []
				grid.dimension(dimensao_dados2_Data)
					.group(function (d) {
						return d.Tipo;
					})
					.width(200)
					.height(200)
					.html(function(object){
						var legenda = "("+object.Data.getDate()+"/"+object.Data.getMonth()+"/"+object.Data.getFullYear()+")\n "+
										object.Nota;
						var link = object.Foto;
						var duracao = 1000* legenda.length /40.0
						if(duracao < 3000)
							duracao = 3000;
						var obj_id = object.Nome.split(' ').join("");
						var fullimg = "<img class=\"circle modal-trigger\" data-target=\""+obj_id+"\" "+
							 			"style= \"height:80px;width:80px;\""+
							 			"src="+link+" />";




						var head = "<a  href=\"javascript:$('#"+obj_id+"').openModal();\" >" + fullimg +"</a>";
						var modal = "<div id=\""+obj_id+"\"class=\"modal\"> "+
							"<div class=\"modal-content\"><h2>"+object.Nome+"</h2><p>"+legenda+"</p>"+
							"</div>"+
							"<div class=\"modal-footer\"><a href=\"#!\" class=\"modal-action modal-close\" ></a></div></div>";
						return head+modal;

						// var matarg = legenda
						// return "<a onclick=\"Materialize.toast("+legenda+","+duracao.toString()+")\">"+
						// 			"<img class=\"circle\" "+
						// 	 			"style= \"height:80px;width:80px;\""+
						// 	 			"src="+link+" />"+
						// 	 	"</a>"

					})
					.htmlGroup(function(d){
						// console.log(d)
						return "";
					})
				composite
					.legend(dc.legend().x(400).y(10).itemHeight(13).gap(5).autoItemWidth(true))
					.width(700)
					.height(200)
					.shareTitle(false)
					.zoomOutRestrict(false)
					.x(d3.time.scale().domain(d3.extent(data, function(d) { return d.Data; })))
					.compose([chartPrisoes,chartConducao,chartBusca])	
					.elasticY(true)
					.elasticX(true)
					.mouseZoomable(false)
					.renderHorizontalGridLines(true)
					.brushOn(true)
					.elasticY(false)
					// .margins({top:30,bottom:20,left:30,right:30})					
					.on('renderlet.click',function(chart){
							chart.selectAll("g .dc-legend-item").on("click.me", function(d){
								tipo_do_grafico = d.name
								var nomechave = ""	
								if(tipo_do_grafico == "Prisoes"){
									nomechave = "Prisao";
								} else if ( tipo_do_grafico == "Conducoes Coercitivas"){
									nomechave = "Conducao";
								} else
									nomechave = "Busca" 
								var index = filtro_nomes.indexOf(nomechave);
								if( index  != -1 ){
									filtro_nomes.splice(index,1);
								}
								else
									filtro_nomes.push(nomechave)
								dim_tipo.filter(function(key){
									if(filtro_nomes.includes(key))
										return true;
									return false;
								})
								dim_tipo_2.filter(function(key){
									if(filtro_nomes.includes(key))
										return true;
									return false;
								})

								dc.redrawAll();
						    })
						})
				// dim_tipo.filter(null)
				dc.renderAll();
				dim_tipo.filter(function(d){
						return false;
					})
				dc.redrawAll();
				var f = function(){
					dim_tipo.filter(null)
					// alert('mamae!')
					dc.redrawAll()
				}
				var g = function(){
					dim_tipo.filter(function(d){
						return false;
					})
					dc.redrawAll();
				}
				
				// window.setTimeout(g,0.11);
				window.setTimeout(f,500);

				$('#reset').click((function(){
									dc.filterAll()
									dc.renderAll()
								}))
				
			});
		})

	 $(document).ready(function(){
    // the "href" attribute of .modal-trigger must specify the modal ID that wants to be triggered
    $('.modal-trigger').leanModal();
  });
			