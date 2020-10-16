const data_csv = d3.csv("/asset/VisData.csv");

var overviewGraphId = "#overviewGraph";
var adMatrixId = "#adjacencyMatrix";

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

    drawOverviewNodeLink();

    drawAdjacencyMatrix();


});
//NODE LINK DIAGRAM
function drawOverviewNodeLink() {
    var width = 800,
        height = 500;

    var tooltip = d3.select("#overviewGraph")
        .append("div")
        .attr("class", "tooltip");
    var overviewGraph = d3.select(overviewGraphId).append("svg").attr("width", width).attr("height", height);

    var colors = d3.scaleOrdinal(d3.schemeCategory10);


    var numScence = d3.scaleQuantize().domain([1, 140])
        .range([10, 20, 30, 35, 40, 45]);

    d3.csv("asset/VisData.csv").then(function (data) {

        var nodesByName = {};

        data.forEach(function (link) {
            link.source = nodeByName(link.ORIGIN_STATE_ABR, link.ORIGIN_STATE_NM);
            link.target = nodeByName(link.DEST_STATE_ABR, link.DEST_STATE_NM);
        });

        const nodes = Object.values(nodesByName);

        //count total flight for each state: 0 is delayed, 1 is cancelled
        nodes.forEach(function (state_node) {
            var total_cancel = countFlight(state_node.name, data, 1);
            var total_delay = countFlight(state_node.name, data, 0);
            state_node.total_cancel = total_cancel;
            state_node.total_delay = total_delay;
            var total_flight = total_cancel + total_delay;

            state_node.pie_chart = [{
                    "color": 1,
                    "percent": 100 / (total_flight / total_cancel)
                },
                {
                    "color": 2,
                    "percent": 100 / (total_flight / total_delay)
                }
            ]
        });

        // console.log(nodes);

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(data).id(d => d.id).distance(120))
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(width / 2, height / 2));

        // var link = svg.selectAll(".link").data(links).enter().append("line").attr("class", "link");
        const link = overviewGraph.append("g")
            .attr("stroke", "#94A3B8")
            .attr("stroke-opacity", 0.5)
            .selectAll("line")
            .data(data)
            .join("line")
            .attr("stroke-width", d => Math.sqrt(d.value));

        const node = overviewGraph.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll("circle")
            .data(nodes)
            .enter().append("circle")
            .attr("r", function (d) {
                return (numScence(d.total_cancel + d.total_delay));
            })
            .attr("fill", function (d) {
                return colors(d.name)
            })
            .attr("class", "node")
            .call(drag(simulation));

        node.on("click", function () {
            //VIEW DETAIL
            console.log("click");
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

function drawAdjacencyMatrix(state_abr) {
    var width = 1100,
        height = 1000;

    
    d3.csv("asset/VisData.csv").then(function (data) {

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

        var edgeHash = {};
        data.forEach(edge => {
            var name = edge.ORIGIN_STATE_NM + "-" + edge.DEST_STATE_NM;
            edgeHash[name] = edge;
        });
        console.log(edgeHash);
        var matrix = [];
        nodes.forEach((source, a) => {
            nodes.forEach((target, b) => {
                var grid = {
                    name: source.name + "-" + target.name,
                    x: b,
                    y: a,
                    weight: 0
                };
                if (edgeHash[grid.name]) {
                    grid.weight = edgeHash[grid.name].weight;
                    console.log("update weight: " + grid.weight);
                }
                matrix.push(grid)
            })
        });
        
        var cellSize = 15;

        var adMatrix = d3.select(adMatrixId).append("svg").attr("width", width).attr("height", height);
        adMatrix.append("g")
            .attr("transform", "translate(70,90)")
            .attr("id", "adjacencyG")
            .selectAll("rect")
            .data(matrix)
            .enter()
            .append("rect")
            .attr("class", "grid")
            .attr("width", cellSize)
            .attr("height", cellSize)
            .attr("x", d => d.x * cellSize)
            .attr("y", d => d.y * cellSize)
            .style("fill-opacity", d => d.weight * 0.2);


            adMatrix
            .append("g")
            .attr("transform", "translate(65, 90)")
            .attr("class", "top-cell-title")
            .selectAll("text")
            .data(nodes)
            .enter()
            .append("text")
            .attr("x", (d, i) => i * cellSize + cellSize/2)
            .text(d => d.name)
            .style("text-anchor", "end")
            .style("font-size", "12px")

            adMatrix
            .append("g").attr("transform", "translate(60, 90)")
            .selectAll("text")
            .data(nodes)
            .enter()
            .append("text")
            .attr("y", (d, i) => i * cellSize + cellSize/2)
            .text(d => d.name)
            .style("text-anchor", "end")
            .style("font-size", "12px")

    });
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