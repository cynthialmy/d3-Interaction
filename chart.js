var statesGA = ['Georgia', 'South Carolina', 'Florida', 'Tennessee', 'North Carolina', 'Alabama'],
    colors = {
        'Georgia': d3.schemeCategory10[0],
        'South Carolina': d3.schemeCategory10[1],
        'Florida': d3.schemeCategory10[2],
        'Tennessee': d3.schemeCategory10[3],
        'North Carolina': d3.schemeCategory10[4],
        'Alabama': d3.schemeCategory10[5],
    };

d3.csv("https://raw.githubusercontent.com/fuyuGT/CS7450-data/main/state_crime.csv")
    .then(function (data) {
        console.log("scatterdata", data);

        // event listener for the dropdown. Update choropleth and legend when selection changes. Call createMapAndLegend() with required arguments.
        
        select.on("change", function () {
            var selectedCrime = d3
                .select(this)
                .property("value");
            createChart(data, selectedCrime);
            createLineChart(data, selectedCrime);
        });

        createChart(data, dropdownOptions[0]);
        createLineChart(data, dropdownOptions[0]);

    });

var svg = d3.select("#scatter")
    .append("svg")
    .attr("width", width + margin.left + margin.right + 80)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var barGroup1 = d3
    .select("#bar-scatter")
    .append("svg")
    .attr("width", width + margin.left + margin.right + 80)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr('transform', 'translate(' + 80 + ',' + 0 + ')');

function createChart(data, selectedCrime) {
    const maxHeight = 400, maxWidth = 600, originalCircleSize = 2, barChartWidth = width + margin.left

    svg.selectAll("*").remove();
    barGroup1.selectAll("*").remove();
    

    var maxX = d3.max(data, function (d) {
        return d['Data.Population'];
    })

    var maxY = d3.max(data, function (d) {
        return selectedCrime === 'Property' ? d['Data.Totals.Property.All'] : d['Data.Totals.Violent.All'];
    })

    let circleGroup1 = svg.append('g')

    // Add X axis
    var x = d3.scaleLog()
        .domain(selectedCrime === 'Property' ? [200000, 50000000]:[200000, 50000000])
        .range([0, width]);
    circleGroup1.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    // Add Y axis
    var y = d3.scaleLog()
        .domain(selectedCrime === 'Property' ?[1000, 2500000]:[20, 2500000])
        .range([height, 0]);
    circleGroup1.append("g")
        .call(d3.axisLeft(y));

    let myCircles = circleGroup1
        .selectAll(".myCircles")
        .data(data)
        .enter()
        .append("circle")
        .attr('class', 'myCircles')
        .attr("cx", function (d) {
            return x(d['Data.Population']);
        })
        .attr("cy", function (d) {
            // return y(d['Data.Totals.Property.All']);
            return selectedCrime === 'Property' ? y(d['Data.Totals.Property.All']) : y(d['Data.Totals.Violent.All']);
        })
        .attr("r", originalCircleSize)
        .style("fill", d3.schemeCategory10[9])

    circleGroup1.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", -30)
        .style("text-anchor", "middle")
        .attr("font-size", "18px")
        .style("font-weight", "bold")
        .text(selectedCrime === 'Property' ? "Property Crimes vs Population 1960-2019" : "Violent Crimes vs Population 1960-2019");

    circleGroup1.append("text")
        .style("text-anchor", "middle")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("fill", "black")
        .style("font-size", 12)
        .text("Population");

    circleGroup1.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", 0 - height / 2)
        .attr("y", 0 - margin.left / 2)
        .attr("dy", -10)
        .style("text-anchor", "middle")
        .style("fill", "black")
        .style("font-size", 12)
        .text("Crime Count");


    let circleTooltip = circleGroup1.append("text")
        .attr('x', 0)
        .attr('y', 0)
        .style('font-size', 16)
        .style('fill', 'black')
        .style('text-anchor', 'middle')
        .style("visibility", "hidden")
        .lower()

    myCircles
        .style('cursor', 'pointer')
        .on('mouseover', mouseOverCircle)
        .on('mouseout', mouseoutCircle)


    svg.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", -10)
        .style("text-anchor", "middle")
        .attr("font-size", "18px")
        .style("font-weight", "bold")
        .text(selectedCrime === 'Property' ? "Property Crimes vs. Poputation by State 1960-2019" : "Violent Crimes vs. Poputation by State 1960-2019");

    svg.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", +8)
        .style("text-anchor", "middle")
        .attr("font-size", "14px")
        .style("font-weight", "bold")
        .text("Hover on dots to see details in Bar Chart");


    function mouseOverCircle(event, d) {
        console.log("mouseOverCircle", d)

        circleTooltip
            .style('visibility', 'visible')
            .text(selectedCrime === 'Property' ? `${d['State']}: year: ${d['Year']} -  population: ${d['Data.Population']} - Property Crime Count: ${d['Data.Totals.Property.All']}` : `${d['State']}: year: ${d['Year']} -  population: ${d['Data.Population']} - Violent Crime Count: ${d['Data.Totals.Violent.All']}`)
            .attr('x', x(d['Data.Population']))
            // .attr('y', y(d['Data.Totals.Property.All']) - 10)
            .attr('y', selectedCrime === 'Property' ? y(d['Data.Totals.Property.All']) : y(d['Data.Totals.Violent.All']) - 10)

        myCircles
            .style('opacity', dCircle => dCircle['State'] === d['State'] ? 1 : 0.1)
            .style('fill', dCircle => dCircle['State'] === d['State'] && dCircle['Year'] === d['Year'] ? d3.schemeCategory10[3] : d3.schemeCategory10[9])
            .attr('r', dCircle => dCircle['State'] === d['State'] ? 2 : originalCircleSize)
            .style('r', dCircle => dCircle['State'] === d['State'] && dCircle['Year'] === d['Year'] ? 4 : originalCircleSize)

        d3.select('#addOnBar')
            .style('visibility', 'visible')
            .transition()
            .duration(500)
            .attr('height', maxHeight - yBar(d['Data.Population']))
            .attr('y', yBar(d['Data.Population']))
            .attr('x', xBar(d['Year']) + xBar.bandwidth / 2 - 10)
            .attr("width", xBar.bandwidth())
    }

    function mouseoutCircle(event, d) {

        circleTooltip
            .style('visibility', 'hidden')

        myCircles
            .style('opacity', 1)
            .attr('r', originalCircleSize)

        d3.selectAll('.myBar')
            .style('opacity', 1)

        d3.select('#addOnBar')
            .style('visibility', 'hidden')
    }

    // add brush 

    let circleBrush = d3.brush().extent([[0, 0], [width, maxHeight]])
        .on('end', function (event) {
            let brushedArea = event.selection
            myCircles.classed('selected', d => isBrushed(brushedArea, x(d['Data.Population']), selectedCrime === 'Property' ? y(d['Data.Totals.Property.All']) : y(d['Data.Totals.Violent.All'])))
            let newBarData = data.filter(d => isBrushed(brushedArea, x(d['Data.Population']), selectedCrime === 'Property' ? y(d['Data.Totals.Property.All']) : y(d['Data.Totals.Violent.All'])))
            console.log('newBarData::: ', newBarData);
            updateBar(newBarData)
        })

    circleGroup1.call(circleBrush) // calling a d3 brush
    myCircles.raise()
    function isBrushed(brush_coords, cx, cy) {
        if (brush_coords) {
            var x0 = brush_coords[0][0],
                x1 = brush_coords[1][0],
                y0 = brush_coords[0][1],
                y1 = brush_coords[1][1];
            return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
        }
    }

    // initial bar chart
    // Parent nodes should be initiated
    

    // let barGroup1 = svg.append('g')
    //     .attr('transform', 'translate(' + 50 + ',' + 600 + ')')

    let yearData = d3.rollups(data, v => d3.mean(v, d => d['Data.Population']), d => d['Year'])

    const xBar = d3.scaleBand()
        .range([0, barChartWidth])
        .domain(yearData.map(d => d[0]))
        .padding(0.5);

    let yMaxBar = d3.max(yearData.map(d => +d[1]))

    const yBar = d3.scaleLinear()
        .domain([0, yMaxBar])
        .range([maxHeight, 0]);

    let xAxis = barGroup1.append("g")
        .attr("transform", `translate(0, ${maxHeight})`)
        .call(d3.axisBottom(xBar))


    // add y axis

    let yAxis = barGroup1.append("g")
        .call(d3.axisLeft(yBar));

    barGroup1.append("text")
        .style("text-anchor", "middle")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height - 20)
        .style("fill", "black")
        .style("font-size", 12)
        .text("Year");

    barGroup1.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", 0 - height / 2)
        .attr("y", 0 - margin.left)
        .attr("dy", -10)
        .style("text-anchor", "middle")
        .style("fill", "black")
        .style("font-size", 12)
        .text("Crime Count");


    function updateBar(newData) {
        //update your bars and axis using new data
        console.log("newData", newData)

        let newYearData = d3.rollups(newData, v => d3.mean(v, d => d['Data.Population']), d => d['Year'])
        console.log('yearData::: ', newYearData);

        xBar.domain(newYearData.map(d => d[0]))

        let yMaxBar = d3.max(newYearData.map(d => +d[1]))

        yBar.domain([0, yMaxBar])

        let myBars = barGroup1.selectAll(".myBar")
            .data(newYearData)
            .join('rect')
            .attr('class', 'myBar')
            .style('cursor', 'pointer')
            .on('mouseover', mouseOverBar)
            .on('mouseout', mouseOutBar)
            .transition()
            .duration(1000)
            .attr("x", d => xBar(d[0]))
            .attr("y", d => yBar(d[1]))
            .attr("width", xBar.bandwidth())
            .attr("height", d => maxHeight - yBar(d[1]))
            .attr("fill", d3.schemeCategory10[9])

        xAxis.transition().duration(1000)
            .call(d3.axisBottom(xBar))
            .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-45)")
            .style("text-anchor", "end");

        // add y axis

        yAxis.transition().duration(1000)
            .call(d3.axisLeft(yBar));

        barGroup1.append('rect')
            .attr('id', 'addOnBar')
            .attr('x', 0)
            .attr("y", 0)
            .attr('width', 20)
            .attr("height", 0)
            .attr("fill", d3.schemeCategory10[3])
            .style('visibility', 'hidden')


        function mouseOverBar(event, d) {
            d3.selectAll('.myBar')
                .style('opacity', d1 => d1[0] === d[0] ? 1 : 0.1)
            myCircles
                .style('opacity', dCircle => dCircle['Year'] === d[0] ? 1 : 0.1)
        }
        function mouseOutBar(event, d) {
            d3.selectAll('.myBar')
                .style('opacity', 1)
            myCircles
                .style('opacity', 1)
        }
    }

    updateBar(data)

}

var svg_line = d3.select("#line")
    .append("svg")
    .attr("width", width + margin.left + margin.right + 80)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var svg1 = d3
    .select("#bar")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

function createLineChart(data, selectedCrime) {
    svg_line.selectAll("*").remove();
    svg1.selectAll("*").remove();
    var dataNest = d3.nest()
        .key(function (d) {
            return d.State;
        })
        .key(function (d) {
            return +d.Year;
        })
        .rollup(function (leaves) {
            return {
                "states": leaves,
                "sum": d3.sum(leaves, function (d) {
                    return selectedCrime === 'Property' ? d['Data.Totals.Property.All'] : d['Data.Totals.Violent.All'];
                })
            }
        })
        .entries(data);

    dataFiltered = dataNest.filter(function (d) { return statesGA.includes(d.key) })
    console.log("dataFiltered", dataFiltered);

    var xScale = d3
        .scaleTime()
        .domain([new Date("1960"), new Date("2019")])
        .range([0, width]);

    var yScale = d3
        .scaleLog()
        .domain(selectedCrime === 'Property' ? [1000, 2500000] : [2500, 200000])
        .range([height, 0]);

    svg_line.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale).ticks(d3.timeYear.every(5)));

    svg_line.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(yScale));

    var formatTime = d3.timeParse("%Y");

    var line = d3.line()
        .x(function (d) {
            return xScale(formatTime(d.key))
        })
        .y(function (d) {
            return yScale(d.value.sum)
        });

    svg_line.selectAll("lines")
        .data(dataFiltered)
        .enter()
        .append("g")
        .attr("class", "path")
        .append("path")
        .attr("d", function (d) {
            return line(d.values)
        })
        .attr("stroke", function (d) {
            return colors[d.key]
        })
        .style("stroke-width", 3)
        .style("fill", "none");

    var legend = svg_line.selectAll(".legend")
        .data(dataFiltered)
        .enter().append("g")
        .attr("class", "legend");

    legend.append("circle")
        .attr("class", "legend")
        .attr("cx", width + 15)
        .attr("cy", function (d, i) {
            return 12 + i * 20
        })
        .attr("r", 6)
        .attr("width", 30)
        .attr("height", 20)
        .style("fill", function (d) {
            return colors[d.key]
        }
        );

    legend.append("text")
        .attr("class", "legend")
        .attr("x", width + 25)
        .attr("y", function (d, i) {
            return 14 + i * 20
        })
        .attr("font-size", "15px")
        .text(function (d) {
            return d.key
        })
        .style("alignment-baseline", "middle");

    svg_line.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", -10)
        .style("text-anchor", "middle")
        .attr("font-size", "18px")
        .style("font-weight", "bold")
        .text(selectedCrime === 'Property' ? "Property Crimes Around Georgia by State 1960-2019" : "Violent Crimes Around Georgia by State 1960-2019");

    svg_line.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", +8)
        .style("text-anchor", "middle")
        .attr("font-size", "14px")
        .style("font-weight", "bold")
        .text("Hover on dots to see details in Bar Chart");

    svg_line.append("text")
        .style("text-anchor", "middle")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("fill", "black")
        .style("font-size", 12)
        .text("Year");

    svg_line.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", 0 - height / 2)
        .attr("y", 0 - margin.left / 2)
        .attr("dy", -10)
        .style("text-anchor", "middle")
        .style("fill", "black")
        .style("font-size", 12)
        .text("Crime Count");

    var mouseoverHandler = function (d, i) {
        console.log('mouseoverHandler', d, i);
        var Syear = d3.select(this)._groups[0][0].__data__.value.states[0].Year;
        var Sstate = d3.select(this)._groups[0][0].__data__.value.states[0].State;
        console.log(Syear);
        console.log(Sstate);

        var dataBar = []
        data.map(function (d) {
            if (d.Year == Syear && d.State == Sstate) {
                if (selectedCrime === 'Violent') {
                    dataBar.push({
                        state: d.State,
                        year: d.Year,
                        crime: 'Assault',
                        value: +d['Data.Totals.Violent.Assault']
                    })
                    dataBar.push({
                        state: d.State,
                        year: d.Year,
                        crime: 'Murder',
                        value: +d['Data.Totals.Violent.Murder'],
                    })
                    dataBar.push({
                        state: d.State,
                        year: d.Year,
                        crime: 'Rape',
                        value: +d['Data.Totals.Violent.Rape'],
                    })
                    dataBar.push({
                        state: d.State,
                        year: d.Year,
                        crime: 'Robbery',
                        value: +d['Data.Totals.Violent.Robbery'],
                    })
                } else {
                    dataBar.push({
                        state: d.State,
                        year: d.Year,
                        crime: 'Burglary',
                        value: +d['Data.Totals.Property.Burglary']
                    })
                    dataBar.push({
                        state: d.State,
                        year: d.Year,
                        crime: 'Larceny',
                        value: +d['Data.Totals.Property.Larceny'],
                    })
                    dataBar.push({
                        state: d.State,
                        year: d.Year,
                        crime: 'Motor',
                        value: +d['Data.Totals.Property.Motor'],
                    })
                }

            }
        });

        var maxCount = d3.max(dataBar, function (d) {
            return d.value;
        })

        console.log('maxCount', maxCount);

        d3.select(this)
            .attr("r", 10);

        var xBarScale = d3
            .scaleLinear()
            .domain([0, maxCount])
            .range([0, width]);

        var yBarScale = d3.scaleBand()
            .range([height, 0])
            .domain(selectedCrime === 'Violent' ? ['Assault', 'Murder', 'Rape', 'Robbery'] : ['Burglary', 'Larceny', 'Motor'])
            .padding(0.05);

        svg1.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xBarScale));

        svg1.append("g")
            .attr("class", "y axis")
            .call(d3.axisLeft(yBarScale));

        var formatTime = d3.timeParse("%Y");

        console.log('dataBar', dataBar)

        svg1.selectAll("rect")
            .data(dataBar)
            .enter()
            .append("rect")
            .transition()
            .duration(1000)
            .attr("x", 0)
            .attr("y", function (d) {
                return yBarScale(d.crime);
            })
            .attr("width", function (d) {
                console.log('d', d.value)
                return xBarScale(d.value)
            })
            .attr("height", yBarScale.bandwidth())
            .attr("fill", function (d) {
                return colors[d.state];
            })

        svg1.append("text")
            .attr("class", "title")
            .attr("x", width / 2)
            .attr("y", -15)
            .style("text-anchor", "middle")
            .attr("font-size", "18px")
            .style("font-weight", "bold")
            .text(selectedCrime === 'Property' ? Sstate + " Region Property Crime in " + Syear : Sstate + " Region Violent Crime in " + Syear);

        svg1.append("text")
            .attr("class", "x axis")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom)
            .style("text-anchor", "middle")
            .attr("font-size", "18px");

        svg1.append("text")
            .attr("class", "y axis")
            .attr("x", -height / 2 - margin.top)
            .attr("y", -50)
            .style("text-anchor", "middle")
            .attr("transform", "rotate(270)")
            .attr("font-size", "18px");

        svg1.append("text")
            .style("text-anchor", "middle")
            .attr("class", "axis-label")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .style("fill", "black")
            .style("font-size", 12)
            .text("Crime Count");
    }

    var mouseoutHandler = function (d, i) {
        svg1.selectAll("*").remove();

        d3.select(this)
            .attr("r", 5)
            .attr("fill", function () {
                return colors[d.key];
            })
    }

    svg_line.selectAll("myDots")
        .data(dataFiltered)
        .enter()
        .append('g')
        .style("fill", function (d) { return colors[d.key] })
        .style("stroke-width", 2)
        .style("stroke", "white")
        .selectAll("myPoints")
        .data(function (d) { return d.values })
        .enter()
        .append("circle")
        .attr("cx", function (d) { return xScale(formatTime(d.key)) })
        .attr("cy", function (d) { return yScale(d.value.sum) })
        .attr("r", 5)
        .on("mouseover", mouseoverHandler)
        .on("mouseout", mouseoutHandler)

}