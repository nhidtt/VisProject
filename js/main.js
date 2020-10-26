const data_src = "asset/VisData.csv";

var overviewGraphId = "#overviewGraph";
var adMatrixId = "#adjacencyMatrix";
var parallelSetId = "#cancelParallelSet";
var delayPCId = "#delayPC";
var delayViolinPlotId = "#delayViolinPlot";


function countFlight(name, count_data, flight_status) {
    var count_val = 0;
    count_data.forEach(function (item) {
        if (item.ORIGIN_STATE_ABR == name && item.CANCELLED == flight_status) {
            count_val++;
        }
    });
    return count_val;
}


$(document).ready(function () {
    $('.detail-maps-container').hide();
    drawOverviewNodeLink();

    drawAdjacencyMatrix('occurence');

    // drawCancelParallelSet("WA");

    // drawDelayPC("NJ");

    // drawDelayViolinPlot("WA");


});
//NODE LINK DIAGRAM
function drawOverviewNodeLink() {
    var width = 600,
        height = 500;

    var tooltip = d3.select("#overviewGraph")
        .append("div")
        .attr("class", "tooltip");
    var overviewGraph = d3.select(overviewGraphId).append("svg").attr("width", width).attr("height", height);

    var colors = d3.scaleOrdinal(d3.schemeCategory10);


    var sizeScale = d3.scaleQuantize().domain([1, 140])
        .range([10, 20, 30, 35, 40, 45]);

    d3.csv(data_src).then(function (data) {

        var nodesByName = {};

        data.forEach(function (link) {
            link.source = nodeByName(link.ORIGIN_STATE_ABR, link.ORIGIN_STATE_NM);
            link.target = nodeByName(link.DEST_STATE_ABR, link.DEST_STATE_NM);
        });

        const nodes = Object.values(nodesByName);

        nodes.forEach(function (state_node) {
            var total_cancel = countFlight(state_node.name, data, 1);
            var total_delay = countFlight(state_node.name, data, 0);
            state_node.total_cancel = total_cancel;
            state_node.total_delay = total_delay;
            var total_flight = total_cancel + total_delay;

            state_node.pieChart = [{
                    "color": 1,
                    "percent": 100 / (total_flight / total_cancel)
                },
                {
                    "color": 2,
                    "percent": 100 / (total_flight / total_delay)
                }
            ]
        });

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(data).id(d => d.id).distance(120))
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = overviewGraph.append("g")
            .attr("stroke", "#94A3B8")
            .attr("stroke-opacity", 0.5)
            .selectAll("line")
            .data(data)
            .join("line")
            .attr("stroke-width", d => Math.sqrt(d.value));

        const node = overviewGraph.append("g")
            .selectAll("circle")
            .data(nodes)
            .enter().append("circle")
            .attr("r", function (d) {
                return (sizeScale(d.total_cancel + d.total_delay)); //scale corresponding to size
            })
            .attr("class", "node")
            .attr('fill', function (d) {
                return (colors(d.name))
            })
            .call(drag(simulation));

        //Draw pie chart for each node 

        // node.selectAll('path')
        //     .data(d => getPieData(d))
        //     .enter()
        //     .append('svg:path')
        //     .attr('d', d3.arc()
        //         .innerRadius(0)
        //         .outerRadius(function (d) {
        //             return (d.total_cancel + d.total_delay);
        //         })
        //     )
        //     .attr('fill', function (d) {
        //         return (colors(d.data.key))
        //     });


        function getPieData(n) {
            const arcs = [];
            var cancelItem = {
                name: "cancel",
                value: n.total_cancel
            };
            arcs.push(cancelItem);
            var delayItem = {
                name: "delay",
                value: n.total_delay
            };
            arcs.push(delayItem);
            var pie = d3.pie()
                .value(function (d) {
                    return d.value.value;
                })
            var data_ready = pie(d3.entries(arcs));
            return data_ready;
        }

        node.on("click", function (e, d) {
            //VIEW DETAIL
            $(parallelSetId).empty();
            $(delayPCId).empty();
            $(delayViolinPlotId).empty();
            $('.detail-maps-container').show();
            if (d.total_cancel > 0) {
                drawCancelParallelSet(d.name);
                $('.cancel-graph-wrapper').show();
            } else {
                $('.cancel-graph-wrapper').hide();
            }
            if (d.total_delay > 0) {
                drawDelayPC(d.name);
                drawDelayViolinPlot(d.name);
                $('.delay-graph-wrapper').show();
            } else {
                $('.delay-graph-wrapper').hide();
            }

        });

        node.on("mouseover", function (e, d) {
            link.style('stroke', function (l) {
                if (d === l.source) return "#FF3220";
                else return "#94A3B8";
            });

            tooltip.style("top", d3.select(this).attr("cy") + "px");
            tooltip.style("left", d3.select(this).attr("cx") + "px");
            tooltip.html("<b>" + d.fullname + "</b><br/>Canceled: <b>" + d.total_cancel + "</b><br/> Delayed: <b>" + d.total_delay) + "</b>";
            return tooltip.style("visibility", "visible");
        }).on("mouseout", function () {
            link.style('stroke', "#94A3B8");
            return tooltip.style("visibility", "hidden");
        })

        const texts = overviewGraph.selectAll(".texts")
            .data(nodes)
            .enter()
            .append("text")
            .attr("font-size", "15px")
            .attr("text-anchor", "top")
            .attr("class", ".state-name")
            .text(d => d.name);

        node.append("title")
            .text(d => d.name);

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
            texts
                .attr("x", d => d.x)
                .attr("y", d => d.y);
        });

        function pieChart(placeholder, data, r) {



        }

        function nodeByName(name, fullname) {
            return nodesByName[name] || (nodesByName[name] = {
                name: name,
                fullname: fullname
            });
        }


        function drag(simulation) {
            function dragstarted(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }

            function dragged(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }

            function dragended(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }

            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }
    });
}


function drawAdjacencyMatrix(sort) {

    var width = 1100,
        height = 1000;

    var adjacencyTooltip = d3.select(adMatrixId)
        .append("div")
        .attr("class", "ad-tooltip");
    // $(adMatrixId).show();
    d3.csv(data_src).then(function (data) {
        var nodesByCity = {};

        data.forEach(function (link) {
            link.source = nodeByCity(link.ORIGIN_STATE_NM);
            link.target = nodeByCity(link.DEST_STATE_NM);
        });

        const nodes = Object.values(nodesByCity);

        function nodeByCity(name) {
            return nodesByCity[name] || (nodesByCity[name] = {
                name: name
            });
        }

        var edgeMap = {};

        //create edges for matrix
        data.forEach(edge => {
            var name = edge.ORIGIN_STATE_NM + "-" + edge.DEST_STATE_NM;
            // edge.weight = 1;
            if (edgeMap[name] == undefined) {
                edge.weight = 1;
                if (edge.CANCELLED == "0") {
                    edge.total_cancel = 0;
                    edge.total_delay = 1;
                } else {
                    edge.total_cancel = 1;
                    edge.total_delay = 0;
                }
            } else {
                if (edge.CANCELLED == "0") {
                    edge.total_delay = edgeMap[name].total_delay + 1;
                    edge.total_cancel = edgeMap[name].total_cancel;
                } else {
                    edge.total_cancel = edgeMap[name].total_cancel + 1;
                    edge.total_delay = edgeMap[name].total_delay;
                }
                edge.weight = edgeMap[name].weight + 1;
            }
            edgeMap[name] = edge;
        });

        var edgeArray = [];

        $.each(edgeMap, function (index, value) {
            var convertItem = {};
            convertItem.name = index;
            convertItem.total_cancel = value.total_cancel;
            convertItem.total_delay = value.total_delay;
            convertItem.weight = value.weight;
            convertItem.source = value.source;
            convertItem.target = value.target;
            convertItem.CANCELLED = value.CANCELLED;
            edgeArray.push(convertItem);
        });

        var sortedFrequencyResult = sortByFrequency(edgeArray);
        var sortedNodes;
        if (sort == 'occurence') {
            sortedNodes = sortedFrequencyResult.nodes;
        } else if (sort == 'name') {
            sortedNodes = nodes.slice().sort((a, b) => d3.ascending(a.name, b.name));
        }

        console.log("value: " + sort);

        var matrixData = [];
        sortedNodes.forEach((source, a) => {
            sortedNodes.forEach((target, b) => {
                var grid = {
                    name: source.name + "-" + target.name,
                    x: b,
                    y: a,
                    weight: 0
                };
                if (edgeMap[grid.name]) {
                    grid.weight = edgeMap[grid.name].weight;
                    grid.total_cancel = edgeMap[grid.name].total_cancel;
                    grid.total_delay = edgeMap[grid.name].total_delay;
                }
                matrixData.push(grid);
            })
        });


        var colors = d3.scaleSequential().domain([1, 20, 30, 40, 50]).range(["#ffffff", "#E22020"]);
        var cellSize = 14;

        const adMatrix = d3.select(adMatrixId).append("svg").attr("width", width).attr("height", height);
        adMatrix.append("g")
            .attr("transform", "translate(70,90)")
            .attr("id", "adjacencyG")
            .selectAll("rect")
            .data(matrixData)
            .enter()
            .append("rect")
            .attr("class", "grid")
            .attr("stroke-width", 0.1)
            .attr("stroke", "#999999")
            .attr("width", cellSize)
            .attr("height", cellSize)
            .attr("x", d => d.x * cellSize)
            .attr("y", d => d.y * cellSize)
            .attr('fill', function (d) {
                return (colors(d.weight))
            })
            .on("mouseover", function (e, d) {
                if (d.total_cancel != undefined && d.total_delay != undefined) {
                    adjacencyTooltip.style("top", e.clientY + "px");
                    adjacencyTooltip.style("left", e.clientX + "px");
                    adjacencyTooltip.html("<b>" + d.name + "</b><br/>Canceled: <b>" + d.total_cancel + "</b><br/> Delayed: <b>" + d.total_delay) + "</b>";
                    return adjacencyTooltip.style("visibility", "visible");
                }
            })
            .on("mouseout", function () {
                return adjacencyTooltip.style("visibility", "hidden");
            });


        adMatrix
            .append("g")
            .attr("transform", "translate(65, 90)")
            .attr("class", "top-cell-title")
            .selectAll("text")
            .data(sortedNodes)
            .enter()
            .append("text")
            .attr("x", (d, i) => i * cellSize + cellSize / 2)
            .text(d => d.name)
            .style("text-anchor", "end")
            .style("font-size", "10px")

        adMatrix
            .append("g").attr("transform", "translate(60, 90)")
            .selectAll("text")
            .data(sortedNodes)
            .enter()
            .append("text")
            .attr("y", (d, i) => i * cellSize + cellSize / 2)
            .text(d => d.name)
            .style("text-anchor", "end")
            .style("font-size", "10px")

    });
}

$('#adSelector').change(function () {
    var selectedVal = $(this).val();
    $(adMatrixId).empty();
    drawAdjacencyMatrix(selectedVal);

});

function sortByFrequency(data) {
    var result = {};
    for (var i = 0; i < data.length; i++) {
        for (var j = i + 1; j < data.length; j++) {
            var totalFlight1 = parseInt(data[i].total_delay + data[i].total_cancel);
            var totalFlight2 = parseInt(data[j].total_delay + data[j].total_cancel);

            if (totalFlight1 > totalFlight2) {
                var temp = data[i];
                data[i] = data[j];
                data[j] = temp;
            }
        }
    }
    // var sortedMatrixData = data.slice().sort((a, b) => d3.ascending(a.total_flight, b.total_flight));
    var sortedNodes = [];
    var reversedData = data.reverse();
    reversedData.forEach(item => {
        var stateName = item.name.split("-")[0];
        var state = {
            name: stateName
        };
        var index = sortedNodes.findIndex(a => a.name == stateName);
        if (index === -1) {
            sortedNodes.push(state);
        }
    });
    // console.log(sortedMatrixData);
    result.matrix_data = reversedData;
    result.nodes = sortedNodes;
    return result;
}

function sortByName(matrixData) {
    return matrixData.slice().sort((a, b) => d3.ascending(a.total_cancel + a.total_delay, b.total_cancel + b.total_delay));
}



const IS_CANCELLED_CODE = 1;
const IS_DELAYED_CODE = 0;

function drawCancelParallelSet(state_abr) {

    var width = 700,
        height = 600;

    // const data = d3.csvParse(data_src, d3.autoType);
    d3.csv(data_src).then(function (data) {
        var attr = ["ORIGIN_CITY_NAME", "DEST_CITY_NAME", "REASON", "FL_DATE"];

        const filteredData = getFlightsByState(data, state_abr, IS_CANCELLED_CODE);
        console.log(filteredData);
        var nodeLinkData = getNodeLinkFromData(attr, filteredData);
        // console.log(nodeLinkData);

        const sankey = d3.sankey().nodeSort(null)
            .linkSort(null)
            .nodeWidth(4)
            .nodePadding(10)
            .extent([
                [0, 5],
                [width, height - 5]
            ]);
        const {
            nodes,
            links
        } = sankey({
            nodes: nodeLinkData.nodes,
            links: nodeLinkData.links
        });


        const color = d3.scaleOrdinal(d3.schemeAccent);
        //draw parallel set
        const parallelSet = d3.select(parallelSetId).append("svg").attr("width", width).attr("height", height);
        //append node
        parallelSet.append("g")
            .selectAll("rect")
            .data(nodes)
            .join("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .append("title")
            .text(d => `${d.name}\n${d.value.toLocaleString()}`);

        const path = parallelSet.append("g")
            .attr("fill", "none")
            .selectAll("g")
            .data(links)
            .join("path")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke", "#BDC5D0")
            .attr("stroke-width", d => d.width)
            .style("mix-blend-mode", "multiply")
            .on("mouseover", function (e, d) {
                // console.log(d);
                path.style("stroke", s => {
                    if (s.names[0] == d.names[0]) {
                        return color(d.names[0]);
                    } else {
                        return "#BDC5D0";
                    }
                });
            })
            .on("mouseout", function () {
                return "#BDC5D0"
            });

        parallelSet.append("g")
            .style("font", "10px sans-serif")
            .selectAll("text")
            .data(nodes)
            .join("text")
            .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
            .attr("y", d => (d.y1 + d.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
            .text(d => d.name)
            .append("tspan")
            .attr("fill-opacity", 1)
            .text(d => ` ${d.value.toLocaleString()}`);

    });

}

function sortData(data) {
    var result = [];
    data.forEach((item) => {
        var newItem = new Object();
        newItem.ORIGIN_CITY_NAME = item.ORIGIN_CITY_NAME;
        newItem.DEST_CITY_NAME = item.DEST_CITY_NAME;
        newItem.DEP_DELAY = item.DEP_DELAY;
        newItem.FL_DATE = item.FL_DATE;
        result.push(newItem);
    });
    return result;
}

function drawDelayPC(state_abr) {
    var width = 700,
        height = 400,
        margin = ({
            top: 20,
            right: 20,
            bottom: 10,
            left: 20
        });
    const colorAttribute = "DEP_DELAY"; //set default attribute
    const attributes = ["ORIGIN_CITY_NAME", "DEST_CITY_NAME", "FL_DATE", "DEP_DELAY"];
    const shortAttributeNames = new Map(
        Object.entries({
            ORIGIN_CITY_NAME: "Origin City",
            DEST_CITY_NAME: "Destination City",
            FL_DATE: "Date",
            DEP_DELAY: "Departure Delay (Min)"
            
        })
    );
    let activeBrushes = new Map();

    d3.csv(data_src).then(function (data) {
        const flightList = getFlightsByState(data, state_abr, IS_DELAYED_CODE);
        const filteredData = sortData(flightList);

        var adjusted_height = height - margin.top - margin.bottom;
        var adjusted_width = width - margin.left - margin.right;
        var axesData = [{
                name: "ORIGIN_CITY_NAME",
                scale: d3.scaleOrdinal().range([0, height]),
                type: "string"
            },
            {
                name: "DEST_CITY_NAME",
                scale: d3.scaleOrdinal().range([0, height]),
                type: "string"
            },

            {
                name: "FL_DATE",
                scale: d3.scaleOrdinal().range([0, height]),
                type: "string"
            }, {
                name: "DEP_DELAY",
                scale: d3.scaleLinear().range([height, 0]),
                type: "number"
            }
        ];

        var x = d3.scalePoint().range([0, adjusted_width]).padding(0.1),
            y = {};

        var line = d3.line(),
            axis = d3.axisRight();


        //sort data
        //reference: https://observablehq.com/@ravengao/parallel-coordinates-for-discriminate-patterns
        x.domain(
            (axesData = d3.keys(filteredData[0]).filter(function (d) {
                if (attributes.includes(d)) {
                    return (y[d] = d3
                        .scalePoint()
                        .domain(filteredData.map(item => item[d]).sort())
                        .range([adjusted_height, margin.top]));
                }
            }))
        );


        const delayPC = d3.select(delayPCId).append("svg")
            .attr("width", width).attr("height", height);
        delayPC.append("style").text("path.hidden { stroke: #000; stroke-opacity: 0.1 !important;}");;

        const polylines = delayPC
            .append("g")
            .selectAll("path")
            .data(filteredData)
            .enter()
            .append("path")
            .attr("d", path)
            .attr('stroke', d => colorScale()(d[colorAttribute]))
            .style('stroke-width', '1.5')
            .style('stroke-opacity', '0.6')
            .attr('fill', 'none').join('path');

        const axes = delayPC
            .selectAll(".axes")
            .data(axesData)
            .enter()
            .append("g")
            .attr("class", "axes")
            // .attr('stroke', "#2F7DF1")
            .attr("transform", d => `translate(${x(d)},0)`);

        axes.append("g")
            .attr("class", "axis")
            .each(function (d) {
                d3.select(this).call(axis.scale(y[d]));
            })
            .append("text")
            .style("text-anchor", "left")
            .attr("y", margin.top - 10)
            .attr("fill", "red")
            .text(d => shortAttributeNames.get(d));

        function colorScale() {
            return d3.scaleSequential(d3.interpolateRdYlGn).domain(d3.extent(filteredData, d => d[colorAttribute]));
        }

        function path(d) {
            return line(
                axesData.map(function (p) {
                    return [x(p), y[p](d[p]) + Math.random()];
                })
            );
        }

        function updateBrushing() {
            delayPC.selectAll("path").classed("hidden", function (d) {
                var hide;
                attributes.forEach(attribute => {
                    if (activeBrushes.get(attribute) != undefined && activeBrushes.get(attribute) != null) {
                        try {
                            console.log(getY(attribute)(d[attribute]));
                            if (getY(attribute)(d[attribute]) < activeBrushes.get(attribute)[0] ||
                                getY(attribute)(d[attribute]) > activeBrushes.get(attribute)[1]) {
                                hide = true;
                            }
                        } catch (error) {

                        }
                    }
                })
                return hide;
            });
        }

        function getY(attribute) {
            return y[attribute];
        }

        function brushed(event, attribute) {
            activeBrushes.set(attribute, event.selection);
            updateBrushing();
        }

        function brushEnd(event, attribute) {
            if (event.selection !== null) return;
            activeBrushes.delete(attribute);
            updateBrushing();
        }

        const brushes = axes.append("g").call(
            d3
            .brushY()
            .extent([
                [-10, margin.top],
                [10, height - margin.bottom]
            ])
            .on("brush", brushed)
            .on("end", brushEnd)
        );
    });


}

function filterDataForViolinPlot(data, reasons) {
    var result = {};
    var max = 0;
    var convertData = [];
    var convertRecord = {};
    data.forEach(function (item) {

        //Carrier reason
        convertRecord = {};
        convertRecord.type = reasons[0];
        convertRecord.value = parseInt(item.CARRIER_DELAY);
        convertData.push(convertRecord);

        if (parseInt(item.CARRIER_DELAY) > max) {
            max = parseInt(item.CARRIER_DELAY);
        }

        //NAS reason
        convertRecord = {};
        convertRecord.type = reasons[1];
        convertRecord.value = parseInt(item.NAS_DELAY);
        convertData.push(convertRecord);

        if (parseInt(item.NAS_DELAY) > max) {
            max = parseInt(item.NAS_DELAY);
        }

        //Security reason
        convertRecord = {};
        convertRecord.type = reasons[2];
        convertRecord.value = parseInt(item.SECURITY_DELAY);
        convertData.push(convertRecord);

        if (parseInt(item.SECURITY_DELAY) > max) {
            max = parseInt(item.SECURITY_DELAY);
        }

        //Weather reason
        convertRecord = {};
        convertRecord.type = reasons[3];
        convertRecord.value = parseInt(item.WEATHER_DELAY);
        convertData.push(convertRecord);

        if (parseInt(item.WEATHER_DELAY) > max) {
            max = item.WEATHER_DELAY;
        }

        //Late Air Craft reason
        convertRecord = {};
        convertRecord.type = reasons[4];
        convertRecord.value = parseInt(item.LATE_AIRCRAFT_DELAY);
        convertData.push(convertRecord);

        if (parseInt(item.LATE_AIRCRAFT_DELAY) > max) {
            max = parseInt(item.LATE_AIRCRAFT_DELAY);
        }
    });
    console.log(convertData);
    result.data = convertData;
    result.max = max;
    return result;
}
//reference: https://www.d3-graph-gallery.com/graph/violin_jitter.html
function drawDelayViolinPlot(state_abr) {
    var margin = {
            top: 10,
            right: 30,
            bottom: 30,
            left: 40
        },
        width = 700 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    const delayViolinPlot = d3.select(delayViolinPlotId)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    d3.csv(data_src).then(function (data) {
        const reasons = ["Carrier", "NAS", "Security", "Weather", "Late Aircraft"];
        const filteredData = getFlightsByState(data, state_abr, IS_DELAYED_CODE);

        const dataToProcess = filterDataForViolinPlot(filteredData, reasons);

        var y = d3.scaleLinear()
            .domain([0, dataToProcess.max])
            .range([height, 0]);
        delayViolinPlot.append("g").call(d3.axisLeft(y));

        var x = d3.scaleBand()
            .range([0, width])
            .domain(reasons)
            .padding(0.05);
        delayViolinPlot.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        var histogram = d3.histogram()
            .domain(y.domain())
            .thresholds(y.ticks(20))
            .value(d => d);

        var sumstat = d3.nest()
            .key(function (d) {
                return d.type;
            })
            .rollup(function (d) {
                input = d.map(function (g) {
                    return g.value;
                })
                bins = histogram(input);
                return (bins);
            })
            .entries(dataToProcess.data);

        var maxNum = 0
        for (i in sumstat) {
            allBins = sumstat[i].value;
            lengths = allBins.map(function (a) {
                return a.length;
            })
            longuest = d3.max(lengths)
            if (longuest > maxNum) {
                maxNum = longuest;
            }
        }

        var xNum = d3.scaleLinear()
            .range([0, x.bandwidth()])
            .domain([-maxNum, maxNum]);

        var colors = d3.scaleSequential(d3.interpolateRdYlGn).domain([0, dataToProcess.max]);
        delayViolinPlot
            .selectAll("violin")
            .data(sumstat)
            .enter()
            .append("g")
            .attr("transform", function (d) {
                return ("translate(" + x(d.key) + " ,0)")
            })
            .append("path")
            .datum(function (d) {
                return (d.value)
            })
            .style("stroke", "none")
            .style("fill", "grey")
            .attr("d", d3.area()
                .x0(xNum(0))
                .x1(function (d) {
                    return (xNum(d.length))
                })
                .y(function (d) {
                    return (y(d.x0))
                })
                .curve(d3.curveCatmullRom)
            );

        var jitterWidth = 40;
        delayViolinPlot
            .selectAll("points")
            .data(dataToProcess.data)
            .enter()
            .append("circle")
            .attr("cx", function (d) {
                return (x(d.type) + x.bandwidth() / 2 - Math.random() * jitterWidth)
            })
            .attr("cy", function (d) {
                return (y(d.value))
            })
            .attr("r", 5)
            .style("fill", function (d) {
                return colors(d.value);
            })
            .attr("stroke", "white");

    });
}

function getFlightsByState(data, state_abr, status) {
    const result = [];
    if (status == null) { //get all data
        if (state_abr == undefined) { //get data from all state
            data.forEach((item, dataKey) => {
                switch (item.CANCELLATION_CODE) {
                    case "A":
                        item.REASON = "Carrier";
                        break;
                    case "B":
                        item.REASON = "Weather";
                        break;
                    case "C":
                        item.REASON = "National Aviation System";
                        break;
                    case "D":
                        item.REASON = "Security";
                        break;
                }
                result.push(item);
            });
        } else { //get data by state
            data.forEach((item) => {

                if (item.ORIGIN_STATE_ABR == state_abr) {
                    switch (item.CANCELLATION_CODE) {
                        case "A":
                            item.REASON = "Carrier";
                            break;
                        case "B":
                            item.REASON = "Weather";
                            break;
                        case "C":
                            item.REASON = "National Aviation System";
                            break;
                        case "D":
                            item.REASON = "Security";
                            break;
                    }
                    result.push(item);
                }
            });
        }
    } else { //get data by status

        if (state_abr == undefined) { //get all flight  
            data.forEach((item, dataKey) => {
                if (item.CANCELLED == status) {
                    switch (item.CANCELLATION_CODE) {
                        case "A":
                            item.REASON = "Carrier";
                            break;
                        case "B":
                            item.REASON = "Weather";
                            break;
                        case "C":
                            item.REASON = "National Aviation System";
                            break;
                        case "D":
                            item.REASON = "Security";
                            break;
                    }
                    result.push(item);
                }
            });
        } else { //get cancel or delay flights only from a state
            console.log("get cancel or delay flights only from a state: " + status);
            data.forEach((item) => {
                switch (item.CANCELLATION_CODE) {
                    case "A":
                        item.REASON = "Carrier";
                        break;
                    case "B":
                        item.REASON = "Weather";
                        break;
                    case "C":
                        item.REASON = "National Aviation System";
                        break;
                    case "D":
                        item.REASON = "Security";
                        break;
                }
                if (item.ORIGIN_STATE_ABR == state_abr && item.CANCELLED == status) {
                    result.push(item);
                }
            });
        }
    }
    return result;
}

function getNodeLinkFromData(attributes, data) {
    let index = -1;
    const nodes = [];
    const nodeByKey = new Map;
    const indexByKey = new Map;
    const links = [];

    attributes.forEach((attribute, attributeKey) => {

        data.forEach((item, dataKey) => {
            const key = JSON.stringify([attribute, item[attribute]]);
            if (!nodeByKey.has(key)) {
                const node = {
                    name: item[attribute]
                };
                nodes.push(node);
                nodeByKey.set(key, node);
                indexByKey.set(key, ++index);
            }
        });


    });

    for (let i = 1; i < attributes.length; ++i) {
        const attr = attributes[i - 1];
        const b = attributes[i];
        const prefix = attributes.slice(0, i + 1);
        const linkByKey = new Map;
        for (const d of data) {
            const names = prefix.map(k => d[k]);
            const key = JSON.stringify(names);
            const value = d.value || 1;
            let link = linkByKey.get(key);

            var tmpSource = indexByKey.get(JSON.stringify([attr, d[attr]]));
            var tmpTarget = indexByKey.get(JSON.stringify([b, d[b]]));

            if (tmpSource != undefined && tmpTarget != undefined) {
                // console.log(indexByKey.get(JSON.stringify([attr, d[attr]])));
                if (link) {
                    link.value += value;
                    continue;
                }
                link = {
                    source: indexByKey.get(JSON.stringify([attr, d[attr]])),
                    target: indexByKey.get(JSON.stringify([b, d[b]])),
                    names,
                    value
                };
                links.push(link);
                linkByKey.set(key, link);
            }
        }
    }

    return {
        nodes,
        links
    };
}

function getOriginCityList(data, state_abr) {
    var cities = [];
    data.forEach(function (item) {
        if (item.ORIGIN_STATE_ABR == state_abr) {
            cities.indexOf(item.ORIGIN_CITY_NAME) === -1 ? cities.push(item.ORIGIN_CITY_NAME) : console.log("");
        }
    });
    return cities;
}

function getDestCityList(data, state_abr) {
    var cities = [];
    data.forEach(function (item) {
        if (item.ORIGIN_STATE_ABR == state_abr) {
            cities.indexOf(item.ORIGIN_CITY_NAME) === -1 ? cities.push(item.ORIGIN_CITY_NAME) : console.log("");
        }
    });
    return cities;
}