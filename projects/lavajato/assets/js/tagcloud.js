
function draw1(file,mycolor,element,dominio){
    $.get(file,function(x){
    var count = {};
    var forbidden  = {"com":"no","como":"no","em":"no","no":"no","se":"no","700001743752":"no","18:53:515006205-98":"no",
        "SFM©" : "no","::" : "no","(fls" : "no","\n" : "no","" : "no","nº" : "no","de" : "no","o" : "no","que" : "no","e" : "no",        "a" : "no","ao" : "no","ou" : "no","na" : "no","já" : "no","ainda" : "no","à" : "no","já" : "no","eu" : "no","este" : "no","à" : "no","é" : "no","ser" : "no","ele" : "no","isso" : "no","então" : "no","mais" : "no","também" : "no","há" :"no","tem" : "no","Eu" : "no","tem" : "no","as" : "no","pela" :"no","todo" :"no","Em" : "no","eles" : "no","pra" : "no","tá":"no","por" : "no",
        "para" :"no"
        }
    var s = x.split([' '])
    for (var i = s.length - 1; i >= 0; i--) {
        if (s[i] in count){
            count[s[i]] += 1;
        }
        else if(!( s[i] in forbidden) ){
            count[s[i]] = 1;
        }
        else{
            // console.log('forbidden : '+ s[i])
        }
    }
    var it;
    var l = [];

    for (it in count) {
        l.push({text:it, size:count[it]})
    }
    // console.log(s)



    var color = d3.scale.linear()
            .domain(dominio)
            // .range([ "#e57373", "#ef5350", "#f44336", "#e53935", "#d32f2f", "#c62828", "#b71c1c"]);
            .range(mycolor[9].reverse().slice(0,6))
    d3.layout.cloud().size([800, 300])
            .words(l)
            .rotate(0)
            .fontSize(function(d) { return d.size; })
            .on("end", draw)
            .start();

    function draw(words) {
        d3.select(element)
                .append("svg")
                .attr("width", 850)
                .attr("height", 350)
                .attr("class", "wordcloud")
                .append("g")
                .attr("transform", "translate(320,200)")
                .selectAll("text")
                .data(words)
                .enter()
                //  .append("div")
                .append("text")
                // .attr("data-tooltip",function(d){return "X: " + d.size})
                .style("font-size", function(d) { return d.size + "px"; })
                .style("fill", function(d, i) { return color(i); })
                .attr("transform", function(d) {
                    return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                })

                // .attr("fodace","Materialize.toast("+d.size+",1000)")
                .text(function(d) { return d.text; })
    }
})

}

draw1('assets/data/esclarecimento.txt',colorbrewer.Blues,"#morocloud",[10,20,30,70,130])
draw1('assets/data/lula.txt',colorbrewer.Reds,"#lulacloud",[4,10,15,30,50])
