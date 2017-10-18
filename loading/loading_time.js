$(document).ready(function () {
    var listUrl = 'goshare_notebook.csv';
    var loading = new Loading('parent-screen','main-screen');
    d3.csv(listUrl, function (data) {
        if (data.length) {
            data.forEach(function(d) {
                d.loading_time = +d.loading_time;
            });
            
            var charts = {
                17  :'box',
                12  :'small',
                11  :'large',
                9   :'cargo'
            };

            totalSize = 0;
            var format = d3.format('.1f');
            // $('#totalmean').text(format(totalMean/60));
            function loadingTimeChart(vehicle_id) {
                var localData = data.filter(function (d) {
                    return d.vehicle_type_single == vehicle_id;
                }).map(dc.pluck('loading_time'));
                this.histogramSettings = histogram(localData,{pretty:false});
                this.ndx = crossfilter(localData);
                this.dimension = this.ndx.dimension(this.histogramSettings.fun);
                this.group = this.dimension.group();
                this.ticks = d3.range.apply(d3, this.histogramSettings.tickRange(8))
                this.chart = dc.barChart('#' + charts[vehicle_id] + '-id-BarChart');
                this.renderLet = function (chart) {
                    var filteredData = chart.dimension().top(Infinity);
                    var maxNumber = d3.max(filteredData);
                    var minNumber = d3.min(filteredData);
                    var rightList = localData.filter(function(d){
                        return d>maxNumber;
                    });
                    
                    var leftList = localData.filter(function(d){
                        return d<minNumber;
                    });

                    var within = format(100*filteredData.length/localData.length);
                    $('#' + charts[vehicle_id] + '-id-average').text(format(d3.mean(localData)));
                    $('#' + charts[vehicle_id] + '-id-maxNumber').text(format(maxNumber));
                    $('#' + charts[vehicle_id] + '-id-minNumber').text(format(minNumber));
                    $('#' + charts[vehicle_id] + '-id-within').text(within);
                    $('#' + charts[vehicle_id] + '-id-w-number').text(filteredData.length);
                    $('#' + charts[vehicle_id] + '-id-rightSide').text(format(100*rightList.length/localData.length));
                    $('#' + charts[vehicle_id] + '-id-leftSide').text(format(100*leftList.length/localData.length));
                };
                this.chart.height(400)
                .width(null)
                .dimension(this.dimension)
                .transitionDuration(1250)
                .group(this.group)
                .elasticY(true)
                .turnOnControls(true)
                .elasticX(true)
                .on('filtered', this.renderLet)
                .on('preRender', this.renderLet)
                .x(d3.scale.linear())//[this.ticks[0], this.ticks[this.ticks.length - 1]]))
                .xUnits(dc.units.fp.precision(this.histogramSettings.size))
                // .xAxisLabel(config.label)
                .xAxis().tickValues(this.ticks);

                return this;
            }
            chart_list = Object.keys(charts).map(function(d) {
                return new loadingTimeChart(d);
            });

            // for (type in charts) {
            //     charts[type].chart = new waitChart(type, charts[type]);
            // }
            loading.stop();
            dc.renderAll();
        } else {
            loading.stop();
            bootbox.alert('Theres no data');
        }
    });
});