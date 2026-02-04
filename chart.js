// ============================================
// STATE MANAGEMENT & EVENT SYSTEM
// ============================================

var statesGA = ['Georgia', 'South Carolina', 'Florida', 'Tennessee', 'North Carolina', 'Alabama'],
    colors = {
        'Georgia': '#1f77b4',
        'South Carolina': '#ff7f0e',
        'Florida': '#2ca02c',
        'Tennessee': '#d62728',
        'North Carolina': '#9467bd',
        'Alabama': '#8c564b',
    };

// State management
var appState = {
    selectedCrime: 'Property',
    selectedPoints: new Set(),
    selectedState: null,
    selectedYear: null,
    hoveredElement: null,
    brushSelection: null,
    yearRange: [1960, 2019],
    selectedStates: new Set(statesGA) // All states selected by default
};

// Event bus for cross-chart communication
var eventBus = d3.dispatch('select', 'hover', 'brush', 'clear');

// Color scales based on crime type
var getCrimeColor = function(crimeType) {
    return crimeType === 'Property'
        ? { primary: '#c2410c', secondary: '#ea580c', light: '#fed7aa' }
        : { primary: '#8b1a1a', secondary: '#c92a2a', light: '#ffc9c9' };
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

var formatNumber = d3.format(',');
var formatLargeNumber = function(d) {
    if (d >= 1000000) return (d / 1000000).toFixed(1) + 'M';
    if (d >= 1000) return (d / 1000).toFixed(1) + 'K';
    return formatNumber(d);
};

// D3 v5 compatible rollups function
var rollups = function(data, reduce, key) {
    var nest = d3.nest()
        .key(key)
        .rollup(function(leaves) {
            return reduce(leaves);
        })
        .entries(data);
    return nest.map(function(d) {
        return [d.key, d.value];
    });
};

// D3 v5 compatible pointer function
var getPointer = function(event, node) {
    if (event.touches && event.touches.length > 0) {
        var touch = event.touches[0];
        var point = node.createSVGPoint();
        point.x = touch.clientX;
        point.y = touch.clientY;
        return point.matrixTransform(node.getScreenCTM().inverse());
    } else {
        return d3.mouse(node);
    }
};

// Enhanced tooltip creation
var createTooltip = function() {
    return d3.select('body').append('div')
        .attr('class', 'd3-tip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('pointer-events', 'none');
};

// ============================================
// INITIALIZATION
// ============================================

var margin = { top: 50, right: 50, bottom: 50, left: 50 },
    width = 960,
    height = 480;

var colorScheme = d3.schemeOranges[9];
var color = d3.scaleThreshold().domain(d3.range(1, 9)).range(colorScheme);

var dropdownOptions = ['Property', 'Violent'];
var select = d3.select("#crimeDropdown");
select
    .selectAll("option")
    .data(dropdownOptions.sort())
    .enter()
    .append("option")
    .attr("value", function(d) { return d; })
    .html(function(d) { return d; });

// Create SVG containers
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

// Global tooltip
var tooltip = createTooltip();

// Detail panel handlers
d3.select('#closeDetailPanel').on('click', function() {
    d3.select('#detailPanel').classed('active', false);
    appState.selectedState = null;
    appState.selectedYear = null;
    eventBus.call('clear');
});

// ============================================
// SCATTER PLOT WITH ENHANCED INTERACTIONS
// ============================================

function createChart(data, selectedCrime) {
    const maxHeight = 400, maxWidth = 600, originalCircleSize = 2, barChartWidth = width + margin.left;

    appState.selectedCrime = selectedCrime;
    var crimeColors = getCrimeColor(selectedCrime);

    svg.selectAll("*").remove();
    barGroup1.selectAll("*").remove();

    let circleGroup1 = svg.append('g');

    // Scales
    var x = d3.scaleLog()
        .domain([200000, 50000000])
        .range([0, width]);

    var y = d3.scaleLog()
        .domain(selectedCrime === 'Property' ? [1000, 2500000] : [20, 2500000])
        .range([height, 0]);

    // Axes with transitions
    var xAxis = circleGroup1.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + height + ")")
        .style("opacity", 0);

    var yAxis = circleGroup1.append("g")
        .attr("class", "axis")
        .style("opacity", 0);

    xAxis.transition().duration(800).style("opacity", 1).call(d3.axisBottom(x));
    yAxis.transition().duration(800).delay(200).style("opacity", 1).call(d3.axisLeft(y));

    // Title
    circleGroup1.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", -30)
        .style("text-anchor", "middle")
        .style("opacity", 0)
        .text(selectedCrime === 'Property'
            ? "Property Crimes vs Population 1960-2019"
            : "Violent Crimes vs Population 1960-2019")
        .transition()
        .duration(600)
        .delay(400)
        .style("opacity", 1);

    // Axis labels
    circleGroup1.append("text")
        .style("text-anchor", "middle")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("fill", "var(--gray-700)")
        .style("font-size", 12)
        .text("Population");

    circleGroup1.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", 0 - height / 2)
        .attr("y", 0 - margin.left / 2)
        .attr("dy", -10)
        .style("text-anchor", "middle")
        .style("fill", "var(--gray-700)")
        .style("font-size", 12)
        .text("Crime Count");

    // Instructions
    svg.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", -10)
        .style("text-anchor", "middle")
        .attr("font-size", "14px")
        .style("font-weight", "normal")
        .style("fill", "var(--gray-600)")
        .text("Click dots to select • Brush to filter • Hover for details");

    // Create circles with staggered entrance animation
    let myCircles = circleGroup1
        .selectAll(".myCircles")
        .data(data, function(d) { return d.State + '-' + d.Year; })
        .enter()
        .append("circle")
        .attr('class', 'myCircles')
        .attr("cx", d => x(d['Data.Population']))
        .attr("cy", d => selectedCrime === 'Property'
            ? y(d['Data.Totals.Property.All'])
            : y(d['Data.Totals.Violent.All']))
        .attr("r", 0)
        .style("fill", crimeColors.primary)
        .style("opacity", 0.6)
        .style("cursor", "pointer")
        .on('mouseover', function(event, d) {
            mouseOverCircle(event, d, myCircles, x, y, selectedCrime, crimeColors);
        })
        .on('mouseout', function(event, d) {
            if (!appState.selectedPoints.has(d.State + '-' + d.Year)) {
                mouseoutCircle(event, d, myCircles, originalCircleSize);
            }
        })
        .on('click', function(event, d) {
            event.stopPropagation();
            handleCircleClick(event, d, myCircles, selectedCrime);
        });

    // Staggered entrance animation
    myCircles
        .transition()
        .duration(300)
        .delay(function(d, i) { return i * 2; })
        .attr("r", originalCircleSize)
        .style("opacity", 0.6);

    // Brush functionality
    let circleBrush = d3.brush()
        .extent([[0, 0], [width, height]])
        .on('end', function() {
            var event = d3.event;
            if (event && event.selection) {
                appState.brushSelection = event.selection;
                let brushedArea = event.selection;
                myCircles.classed('selected', function(d) {
                    return isBrushed(brushedArea, x(d['Data.Population']),
                        selectedCrime === 'Property'
                            ? y(d['Data.Totals.Property.All'])
                            : y(d['Data.Totals.Violent.All']));
                });
                let newBarData = data.filter(function(d) {
                    return isBrushed(brushedArea, x(d['Data.Population']),
                        selectedCrime === 'Property'
                            ? y(d['Data.Totals.Property.All'])
                            : y(d['Data.Totals.Violent.All']));
                });
                // Get stored scales from barGroup1
                var storedXBar = barGroup1.node().__xBar;
                var storedYBar = barGroup1.node().__yBar;
                var storedMaxHeight = barGroup1.node().__maxHeight;
                var storedBarChartWidth = barGroup1.node().__barChartWidth;
                updateBar(newBarData, selectedCrime, crimeColors, storedXBar, storedYBar, storedMaxHeight, storedBarChartWidth);
                eventBus.call('brush', null, newBarData);
            }
        });

    circleGroup1.append("g")
        .attr("class", "brush")
        .call(circleBrush);

    myCircles.raise();

    function isBrushed(brush_coords, cx, cy) {
        if (brush_coords) {
            var x0 = brush_coords[0][0],
                x1 = brush_coords[1][0],
                y0 = brush_coords[0][1],
                y1 = brush_coords[1][1];
            return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
        }
    }

    // Bar chart setup
    let yearData = rollups(data, function(v) {
        return d3.mean(v, function(d) { return +d['Data.Population']; });
    }, function(d) { return d['Year']; });

    const xBar = d3.scaleBand()
        .range([0, barChartWidth])
        .domain(yearData.map(function(d) { return d[0]; }))
        .padding(0.5);

    let yMaxBar = d3.max(yearData.map(function(d) { return +d[1]; }));

    const yBar = d3.scaleLinear()
        .domain([0, yMaxBar])
        .range([maxHeight, 0]);

    let xAxisBar = barGroup1.append("g")
        .attr("class", "axis x")
        .attr("transform", "translate(0, " + maxHeight + ")")
        .style("opacity", 0);

    let yAxisBar = barGroup1.append("g")
        .attr("class", "axis y")
        .style("opacity", 0);

    xAxisBar.transition().duration(800).delay(600).style("opacity", 1).call(d3.axisBottom(xBar));
    yAxisBar.transition().duration(800).delay(800).style("opacity", 1).call(d3.axisLeft(yBar));

    // Store scales on the barGroup1 element for later access
    if (barGroup1.node()) {
        barGroup1.node().__xBar = xBar;
        barGroup1.node().__yBar = yBar;
        barGroup1.node().__maxHeight = maxHeight;
        barGroup1.node().__barChartWidth = barChartWidth;
    }

    barGroup1.append("text")
        .style("text-anchor", "middle")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height - 20)
        .style("fill", "var(--gray-700)")
        .style("font-size", 12)
        .text("Year");

    barGroup1.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", 0 - height / 2)
        .attr("y", 0 - margin.left)
        .attr("dy", -10)
        .style("text-anchor", "middle")
        .style("fill", "var(--gray-700)")
        .style("font-size", 12)
        .text("Average Population");

    updateBar(data, selectedCrime, crimeColors, xBar, yBar, maxHeight, barChartWidth);
}

function mouseOverCircle(event, d, myCircles, x, y, selectedCrime, crimeColors) {
    var crimeValue = selectedCrime === 'Property'
        ? d['Data.Totals.Property.All']
        : d['Data.Totals.Violent.All'];

    // Enhanced tooltip
    tooltip
        .style('opacity', 0)
        .html(
            '<div class="tip-header">' + d['State'] + '</div>' +
            '<div class="tip-row">' +
            '<span class="tip-label">Year:</span>' +
            '<span class="tip-value">' + d['Year'] + '</span>' +
            '</div>' +
            '<div class="tip-row">' +
            '<span class="tip-label">Population:</span>' +
            '<span class="tip-value">' + formatLargeNumber(+d['Data.Population']) + '</span>' +
            '</div>' +
            '<div class="tip-row">' +
            '<span class="tip-label">' + selectedCrime + ' Crimes:</span>' +
            '<span class="tip-value">' + formatLargeNumber(+crimeValue) + '</span>' +
            '</div>'
        )
        .transition()
        .duration(200)
        .style('opacity', 1);

    var mousePos = getPointer(event, svg.node());
    var xPos = mousePos[0];
    var yPos = mousePos[1];
    tooltip
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px');

    // Highlight related circles
    myCircles
        .transition()
        .duration(200)
        .style('opacity', function(dCircle) {
            return dCircle['State'] === d['State'] ? 1 : 0.2;
        })
        .attr('r', function(dCircle) {
            if (dCircle['State'] === d['State'] && dCircle['Year'] === d['Year']) return 6;
            if (dCircle['State'] === d['State']) return 3;
            return 2;
        })
        .style('fill', function(dCircle) {
            if (dCircle['State'] === d['State'] && dCircle['Year'] === d['Year']) return crimeColors.secondary;
            if (dCircle['State'] === d['State']) return crimeColors.primary;
            return crimeColors.primary;
        });

    // Highlight bar - only if element exists
    var addOnBar = d3.select('#addOnBar');
    if (!addOnBar.empty()) {
        addOnBar
            .style('visibility', 'visible')
            .transition()
            .duration(300)
            .attr('height', function() {
                var yBar = d3.select(this).attr('data-ybar');
                return yBar ? (400 - parseFloat(yBar)) : 0;
            })
            .attr('y', function() {
                return d3.select(this).attr('data-ybar') || 0;
            })
            .attr('x', function() {
                var xBar = d3.select(this).attr('data-xbar');
                return xBar ? (parseFloat(xBar) - 10) : 0;
            })
            .attr("width", function() {
                return d3.select(this).attr('data-width') || 0;
            });
    }

    eventBus.call('hover', null, d);
}

function mouseoutCircle(event, d, myCircles, originalCircleSize) {
    tooltip.transition().duration(200).style('opacity', 0);

    if (!appState.selectedPoints.has(d.State + '-' + d.Year)) {
        myCircles
            .transition()
            .duration(200)
            .style('opacity', function(dCircle) {
                return appState.selectedPoints.has(dCircle.State + '-' + dCircle.Year) ? 0.8 : 0.6;
            })
            .attr('r', function(dCircle) {
                return appState.selectedPoints.has(dCircle.State + '-' + dCircle.Year) ? 4 : originalCircleSize;
            });
    }

    var addOnBar = d3.select('#addOnBar');
    if (!addOnBar.empty()) {
        addOnBar.style('visibility', 'hidden');
    }
}

function handleCircleClick(event, d, myCircles, selectedCrime) {
    var key = d.State + '-' + d.Year;

    if (appState.selectedPoints.has(key)) {
        // Deselect
        appState.selectedPoints.delete(key);
        myCircles
            .filter(dCircle => dCircle.State === d.State && dCircle.Year === d.Year)
            .classed('selected', false)
            .transition()
            .duration(300)
            .attr('r', 2)
            .style('opacity', 0.6);
    } else {
        // Select
        appState.selectedPoints.add(key);
        appState.selectedState = d.State;
        appState.selectedYear = d.Year;

        myCircles
            .filter(function(dCircle) { return dCircle.State === d.State && dCircle.Year === d.Year; })
            .classed('selected', true)
            .transition()
            .duration(300)
            .attr('r', 5)
            .style('opacity', 1);

        showDetailPanel(d, selectedCrime);
    }

    updateSelectionSummary();
    eventBus.call('select', null, { state: d.State, year: d.Year });
}

function showDetailPanel(d, selectedCrime) {
    if (!d || !d.State || !d.Year) {
        console.warn("Invalid data passed to showDetailPanel:", d);
        return;
    }

    var panel = d3.select('#detailPanel');
    var content = d3.select('#detailPanelContent');

    d3.select('#detailPanelTitle').text(d.State + ' - ' + d.Year);

    var crimeValue = selectedCrime === 'Property'
        ? (d['Data.Totals.Property.All'] || 0)
        : (d['Data.Totals.Violent.All'] || 0);

    var population = d['Data.Population'] || 0;
    var rateField = selectedCrime === 'Property' ? 'Data.Rates.Property.All' : 'Data.Rates.Violent.All';
    var rateValue = d[rateField] ? (+d[rateField]).toFixed(1) : '0.0';

    content.html(
        '<div class="detail-stat">' +
        '<div class="detail-stat-label">Population</div>' +
        '<div class="detail-stat-value">' + formatLargeNumber(+population) + '</div>' +
        '</div>' +
        '<div class="detail-stat">' +
        '<div class="detail-stat-label">' + selectedCrime + ' Crimes</div>' +
        '<div class="detail-stat-value">' + formatLargeNumber(+crimeValue) + '</div>' +
        '</div>' +
        '<div class="detail-stat">' +
        '<div class="detail-stat-label">Crime Rate</div>' +
        '<div class="detail-stat-value">' + rateValue + ' per 100K</div>' +
        '</div>'
    );

    panel.classed('active', true);
}

function updateSelectionSummary() {
    var summary = d3.select('#selectionSummary');
    if (appState.selectedPoints.size > 0) {
        summary
            .classed('active', true)
            .select('#selectionSummaryText')
            .text(`${appState.selectedPoints.size} point${appState.selectedPoints.size > 1 ? 's' : ''} selected`);
    } else {
        summary.classed('active', false);
    }
}

// ============================================
// BAR CHART UPDATE FUNCTION
// ============================================

function updateBar(newData, selectedCrime, crimeColors, xBar, yBar, maxHeight, barChartWidth) {
    // Get stored values if not provided
    if (!xBar || !yBar) {
        xBar = barGroup1.node().__xBar;
        yBar = barGroup1.node().__yBar;
        maxHeight = barGroup1.node().__maxHeight || 400;
        barChartWidth = barGroup1.node().__barChartWidth || width + margin.left;
    }

    if (!xBar || !yBar) {
        // Initial setup if still not available
        let yearData = rollups(newData, function(v) {
            return d3.mean(v, function(d) { return +d['Data.Population']; });
        }, function(d) { return d['Year']; });
        xBar = d3.scaleBand()
            .range([0, barChartWidth || width + margin.left])
            .domain(yearData.map(function(d) { return d[0]; }))
            .padding(0.5);
        yBar = d3.scaleLinear()
            .domain([0, d3.max(yearData.map(function(d) { return +d[1]; }))])
            .range([maxHeight || 400, 0]);

        // Store for future use
        barGroup1.node().__xBar = xBar;
        barGroup1.node().__yBar = yBar;
        barGroup1.node().__maxHeight = maxHeight || 400;
        barGroup1.node().__barChartWidth = barChartWidth || width + margin.left;
    }

    let newYearData = rollups(newData, function(v) {
        return d3.mean(v, function(d) { return +d['Data.Population']; });
    }, function(d) { return d['Year']; });

    if (newYearData.length === 0) {
        console.warn("No data for bar chart");
        return;
    }

    xBar.domain(newYearData.map(function(d) { return d[0]; }));
    let yMaxBar = d3.max(newYearData.map(function(d) { return +d[1]; }));
    if (!yMaxBar || yMaxBar === 0) {
        yMaxBar = 1; // Prevent division by zero
    }
    yBar.domain([0, yMaxBar]);

    let myBars = barGroup1.selectAll(".myBar")
        .data(newYearData, function(d) { return d[0]; });

    // Exit
    myBars.exit()
        .transition()
        .duration(500)
        .attr("height", 0)
        .attr("y", maxHeight)
        .style("opacity", 0)
        .remove();

    // Update
    myBars
        .transition()
        .duration(800)
        .ease(d3.easeElasticOut)
        .attr("x", function(d) { return xBar(d[0]); })
        .attr("y", function(d) { return yBar(d[1]); })
        .attr("width", xBar.bandwidth())
        .attr("height", function(d) { return maxHeight - yBar(d[1]); })
        .style("fill", crimeColors.primary)
        .style("opacity", 0.8);

    // Enter
    myBars.enter()
        .append("rect")
        .attr('class', 'myBar')
        .style('cursor', 'pointer')
        .attr("x", function(d) { return xBar(d[0]); })
        .attr("y", maxHeight)
        .attr("width", xBar.bandwidth())
        .attr("height", 0)
        .style("fill", crimeColors.primary)
        .style("opacity", 0)
        .on('mouseover', function(event, d) {
            mouseOverBar(event, d, selectedCrime);
        })
        .on('mouseout', function(event, d) {
            mouseOutBar(event, d);
        })
        .on('click', function(event, d) {
            handleBarClick(event, d, selectedCrime);
        })
        .merge(myBars)
        .transition()
        .duration(800)
        .delay(function(d, i) { return i * 30; })
        .ease(d3.easeElasticOut)
        .attr("y", function(d) { return yBar(d[1]); })
        .attr("height", function(d) { return maxHeight - yBar(d[1]); })
        .style("opacity", 0.8);

    // Update axes
    barGroup1.select(".axis.x")
        .transition()
        .duration(800)
        .call(d3.axisBottom(xBar))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");

    barGroup1.select(".axis.y")
        .transition()
        .duration(800)
        .call(d3.axisLeft(yBar));

    // Highlight bar element
    var highlightBar = barGroup1.selectAll('#addOnBar').data([null]);
    highlightBar.enter()
        .append('rect')
        .attr('id', 'addOnBar')
        .merge(highlightBar)
        .attr('x', 0)
        .attr("y", 0)
        .attr('width', 0)
        .attr("height", 0)
        .attr("fill", crimeColors.secondary)
        .style('visibility', 'hidden');
}

function mouseOverBar(event, d, selectedCrime) {
    d3.selectAll('.myBar')
        .transition()
        .duration(200)
        .style('opacity', function(d1) { return d1[0] === d[0] ? 1 : 0.2; });

    // Store bar position for scatter plot highlighting
    var barElement = d3.select(event.currentTarget);
    var addOnBar = d3.select('#addOnBar');

    // Only update if the element exists and barElement has valid attributes
    if (!addOnBar.empty() && !barElement.empty()) {
        try {
            var xAttr = barElement.attr('x');
            var widthAttr = barElement.attr('width');

            if (xAttr !== null && widthAttr !== null && xAttr !== undefined && widthAttr !== undefined) {
                addOnBar
                    .attr('data-xbar', xAttr)
                    .attr('data-ybar', function() {
                        var allBars = d3.selectAll('.myBar');
                        var barData = [];
                        allBars.each(function(d) { barData.push(d); });
                        var maxVal = d3.max(barData.map(function(d) { return d[1]; }));
                        var yScale = d3.scaleLinear()
                            .domain([0, maxVal || 1])
                            .range([400, 0]);
                        return yScale(d[1]);
                    })
                    .attr('data-width', widthAttr);
            }
        } catch(e) {
            console.warn('Error updating addOnBar:', e);
        }
    }

    eventBus.call('hover', null, { year: d[0], type: 'bar' });
}

function mouseOutBar(event, d) {
    d3.selectAll('.myBar')
        .transition()
        .duration(200)
        .style('opacity', 0.8);
}

function handleBarClick(event, d, selectedCrime) {
    appState.selectedYear = d[0];
    showYearDetailPanel(d[0], selectedCrime);
    eventBus.call('select', null, { year: d[0], type: 'bar' });
}

function showYearDetailPanel(year, selectedCrime) {
    // Implementation for year detail panel
}

// ============================================
// LINE CHART WITH PATH ANIMATIONS
// ============================================

function createLineChart(data, selectedCrime) {
    svg_line.selectAll("*").remove();

    // Initialize the 4th chart (detail chart) with a placeholder message
    svg1.selectAll("*").remove();
    svg1.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "var(--gray-500)")
        .style("font-family", "var(--font-body)")
        .text("Click on a line chart point to see crime breakdown details");

    var crimeColors = getCrimeColor(selectedCrime);

    var dataNest = d3.nest()
        .key(function (d) { return d.State; })
        .key(function (d) { return +d.Year; })
        .rollup(function (leaves) {
            return {
                "states": leaves,
                "sum": d3.sum(leaves, function (d) {
                    return selectedCrime === 'Property'
                        ? d['Data.Totals.Property.All']
                        : d['Data.Totals.Violent.All'];
                })
            }
        })
        .entries(data);

    dataFiltered = dataNest.filter(function (d) { return statesGA.includes(d.key) });

    var xScale = d3.scaleTime()
        .domain([new Date("1960"), new Date("2019")])
        .range([0, width]);

    var yScale = d3.scaleLog()
        .domain(selectedCrime === 'Property' ? [1000, 2500000] : [2500, 200000])
        .range([height, 0]);

    // Axes
    var xAxisLine = svg_line.append("g")
        .attr("class", "axis x")
        .attr("transform", "translate(0," + height + ")")
        .style("opacity", 0);

    var yAxisLine = svg_line.append("g")
        .attr("class", "axis y")
        .style("opacity", 0);

    xAxisLine.transition().duration(800).style("opacity", 1)
        .call(d3.axisBottom(xScale).ticks(d3.timeYear.every(5)));
    yAxisLine.transition().duration(800).delay(200).style("opacity", 1)
        .call(d3.axisLeft(yScale));

    var formatTime = d3.timeParse("%Y");

    var line = d3.line()
        .x(function (d) { return xScale(formatTime(d.key)); })
        .y(function (d) { return yScale(d.value.sum); })
        .curve(d3.curveMonotoneX);

    // Draw lines with path animation
    var paths = svg_line.selectAll(".line-path")
        .data(dataFiltered)
        .enter()
        .append("g")
        .attr("class", "path");

    paths.append("path")
        .attr("class", "line")
        .attr("d", function (d) { return line(d.values); })
        .attr("stroke", function (d) { return colors[d.key]; })
        .style("stroke-width", 3)
        .style("fill", "none")
        .style("opacity", 0)
        .each(function() {
            var totalLength = this.getTotalLength();
            d3.select(this)
                .attr("stroke-dasharray", totalLength + " " + totalLength)
                .attr("stroke-dashoffset", totalLength)
                .transition()
                .duration(2000)
                .ease(d3.easeLinear)
                .attr("stroke-dashoffset", 0)
                .style("opacity", 1);
        });

    // Title
    svg_line.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", -10)
        .style("text-anchor", "middle")
        .style("opacity", 0)
        .text(selectedCrime === 'Property'
            ? "Property Crimes Around Georgia by State 1960-2019"
            : "Violent Crimes Around Georgia by State 1960-2019")
        .transition()
        .duration(600)
        .delay(1500)
        .style("opacity", 1);

    svg_line.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", +8)
        .style("text-anchor", "middle")
        .attr("font-size", "14px")
        .style("font-weight", "normal")
        .style("fill", "var(--gray-600)")
        .text("Click points for drill-down • Hover for details");

    // Axis labels
    svg_line.append("text")
        .style("text-anchor", "middle")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("fill", "var(--gray-700)")
        .style("font-size", 12)
        .text("Year");

    svg_line.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", 0 - height / 2)
        .attr("y", 0 - margin.left / 2)
        .attr("dy", -10)
        .style("text-anchor", "middle")
        .style("fill", "var(--gray-700)")
        .style("font-size", 12)
        .text("Crime Count");

    // Legend
    var legend = svg_line.selectAll(".legend")
        .data(dataFiltered)
        .enter()
        .append("g")
        .attr("class", "legend")
        .style("opacity", 0);

    legend.append("circle")
        .attr("cx", width + 15)
        .attr("cy", function (d, i) { return 12 + i * 20; })
        .attr("r", 6)
        .style("fill", function (d) { return colors[d.key]; });

    legend.append("text")
        .attr("x", width + 25)
        .attr("y", function (d, i) { return 14 + i * 20; })
        .attr("font-size", "15px")
        .text(function (d) { return d.key; })
        .style("alignment-baseline", "middle");

    legend.transition()
        .duration(600)
        .delay(function(d, i) { return 2000 + i * 100; })
        .style("opacity", 1);

    // Points with click handlers
    var dotsGroups = svg_line.selectAll("myDots")
        .data(dataFiltered)
        .enter()
        .append('g')
        .style("fill", function (d) { return colors[d.key]; })
        .style("stroke-width", 2)
        .style("stroke", "white");

    var dots = dotsGroups.selectAll("myPoints")
        .data(function (d) { return d.values; })
        .enter()
        .append("circle")
        .attr("cx", function (d) { return xScale(formatTime(d.key)); })
        .attr("cy", function (d) { return yScale(d.value.sum); })
        .attr("r", 0)
        .style("opacity", 0)
        .on("mouseover", function(d) {
            mouseoverHandler(this, d, selectedCrime, data);
        })
        .on("mouseout", function(d) {
            mouseoutHandler(this, d);
        })
        .on("click", function(d) {
            handleLinePointClick(this, d, selectedCrime, data);
        });

    dots.transition()
        .duration(300)
        .delay(function(d, i) { return 2000 + i * 50; })
        .attr("r", 5)
        .style("opacity", 1);
}

function mouseoverHandler(element, d, selectedCrime, data) {
    // Access data properly - d is the data bound to the circle
    var Syear = d.key; // The year from the nested data
    var currentElement = d3.select(element);
    var parentElement = currentElement.node() ? currentElement.node().parentNode : null;
    var parentData = parentElement ? d3.select(parentElement).datum() : null;
    var Sstate = parentData ? parentData.key : null;

    // Fallback: try to get from the data structure
    if (!Sstate && d.value && d.value.states && d.value.states[0]) {
        Syear = d.value.states[0].Year;
        Sstate = d.value.states[0].State;
    }

    if (!Sstate) {
        console.warn("Could not determine state from point data");
        return;
    }

    currentElement
        .transition()
        .duration(200)
        .attr("r", 8);

    // Show tooltip
    var crimeValue = d.value.sum;
    var event = d3.event;
    var pageX = event ? event.pageX : 0;
    var pageY = event ? event.pageY : 0;

    tooltip
        .style('opacity', 0)
        .html(
            '<div class="tip-header">' + Sstate + '</div>' +
            '<div class="tip-row">' +
            '<span class="tip-label">Year:</span>' +
            '<span class="tip-value">' + Syear + '</span>' +
            '</div>' +
            '<div class="tip-row">' +
            '<span class="tip-label">' + selectedCrime + ' Crimes:</span>' +
            '<span class="tip-value">' + formatLargeNumber(crimeValue) + '</span>' +
            '</div>'
        )
        .transition()
        .duration(200)
        .style('opacity', 1)
        .style('left', (pageX + 15) + 'px')
        .style('top', (pageY - 10) + 'px');

    // Highlight line
    if (parentElement) {
        d3.select(parentElement)
            .select('.line')
            .transition()
            .duration(200)
            .style("stroke-width", 5);
    }

    eventBus.call('hover', null, { state: Sstate, year: Syear, type: 'line' });
}

function mouseoutHandler(element, d) {
    var currentElement = d3.select(element);
    var parentElement = currentElement.node() ? currentElement.node().parentNode : null;

    currentElement
        .transition()
        .duration(200)
        .attr("r", 5);

    tooltip.transition().duration(200).style('opacity', 0);

    if (parentElement) {
        d3.select(parentElement)
            .select('.line')
            .transition()
            .duration(200)
            .style("stroke-width", 3);
    }
}

function handleLinePointClick(element, d, selectedCrime, data) {
    // Access data properly
    var Syear = d.key; // The year from the nested data
    var currentElement = d3.select(element);
    var parentElement = currentElement.node() ? currentElement.node().parentNode : null;
    var parentData = parentElement ? d3.select(parentElement).datum() : null;
    var Sstate = parentData ? parentData.key : null;

    // Fallback: try to get from the data structure
    if (!Sstate && d.value && d.value.states && d.value.states[0]) {
        Syear = d.value.states[0].Year;
        Sstate = d.value.states[0].State;
    }

    if (!Sstate || !Syear) {
        console.warn("Could not determine state or year from clicked point");
        return;
    }

    appState.selectedState = Sstate;
    appState.selectedYear = Syear;

    var dataBar = [];
    data.forEach(function (d) {
        if (d.Year == Syear && d.State == Sstate) {
            if (selectedCrime === 'Violent') {
                dataBar.push({ state: d.State, year: d.Year, crime: 'Assault', value: +d['Data.Totals.Violent.Assault'] });
                dataBar.push({ state: d.State, year: d.Year, crime: 'Murder', value: +d['Data.Totals.Violent.Murder'] });
                dataBar.push({ state: d.State, year: d.Year, crime: 'Rape', value: +d['Data.Totals.Violent.Rape'] });
                dataBar.push({ state: d.State, year: d.Year, crime: 'Robbery', value: +d['Data.Totals.Violent.Robbery'] });
            } else {
                dataBar.push({ state: d.State, year: d.Year, crime: 'Burglary', value: +d['Data.Totals.Property.Burglary'] });
                dataBar.push({ state: d.State, year: d.Year, crime: 'Larceny', value: +d['Data.Totals.Property.Larceny'] });
                dataBar.push({ state: d.State, year: d.Year, crime: 'Motor', value: +d['Data.Totals.Property.Motor'] });
            }
        }
    });

    if (dataBar.length === 0) {
        console.warn("No data found for detail chart");
        svg1.selectAll("*").remove();
        svg1.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "var(--gray-500)")
            .text("Click on a line chart point to see details");
        return;
    }

    var maxCount = d3.max(dataBar, function (d) { return d.value; });

    if (!maxCount || maxCount === 0) {
        maxCount = 1; // Prevent division by zero
    }

    svg1.selectAll("*").remove();

    var xBarScale = d3.scaleLinear()
        .domain([0, maxCount])
        .range([0, width]);

    var yBarScale = d3.scaleBand()
        .range([height, 0])
        .domain(selectedCrime === 'Violent' ? ['Assault', 'Murder', 'Rape', 'Robbery'] : ['Burglary', 'Larceny', 'Motor'])
        .padding(0.2);

    var xAxisDetail = svg1.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + height + ")")
        .style("opacity", 0);

    var yAxisDetail = svg1.append("g")
        .attr("class", "axis")
        .style("opacity", 0);

    xAxisDetail.transition().duration(600).style("opacity", 1).call(d3.axisBottom(xBarScale));
    yAxisDetail.transition().duration(600).delay(200).style("opacity", 1).call(d3.axisLeft(yBarScale));

    var bars = svg1.selectAll("rect")
        .data(dataBar)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", function (d) { return yBarScale(d.crime); })
        .attr("width", 0)
        .attr("height", yBarScale.bandwidth())
        .attr("fill", function (d) { return colors[d.state]; })
        .style("opacity", 0);

    bars.transition()
        .duration(800)
        .delay(function(d, i) { return i * 100; })
        .ease(d3.easeElasticOut)
        .attr("width", function (d) { return xBarScale(d.value); })
        .style("opacity", 1);

    svg1.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", -15)
        .style("text-anchor", "middle")
        .style("opacity", 0)
        .text(selectedCrime === 'Property'
            ? Sstate + " Region Property Crime in " + Syear
            : Sstate + " Region Violent Crime in " + Syear)
        .transition()
        .duration(600)
        .delay(400)
        .style("opacity", 1);

    svg1.append("text")
        .style("text-anchor", "middle")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("fill", "var(--gray-700)")
        .style("font-size", 12)
        .text("Crime Count");

    svg1.append("text")
        .style("text-anchor", "middle")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", 0 - height / 2)
        .attr("y", 0 - margin.left / 2)
        .attr("dy", -10)
        .style("text-anchor", "middle")
        .style("fill", "var(--gray-700)")
        .style("font-size", 12)
        .text("Crime Type");

    // Show detail panel with the actual data object
    if (actualData) {
        showDetailPanel(actualData, selectedCrime);
    }
    eventBus.call('select', null, { state: Sstate, year: Syear, type: 'line' });
}

// ============================================
// FILTERING FUNCTIONS
// ============================================

function filterData(data) {
    return data.filter(function(d) {
        var year = +d.Year;
        var state = d.State;
        return year >= appState.yearRange[0] &&
               year <= appState.yearRange[1] &&
               appState.selectedStates.has(state);
    });
}

function setupYearRangeSlider(data) {
    var yearExtent = d3.extent(data, function(d) { return +d.Year; });
    appState.yearRange = [yearExtent[0], yearExtent[1]];

    // Create a single range slider using D3 brush
    var container = d3.select('#yearRangeSlider');
    container.selectAll('*').remove();

    var sliderWidth = 400;
    var sliderHeight = 60;
    var marginSlider = { top: 20, right: 20, bottom: 30, left: 20 };

    var svg = container
        .append('svg')
        .attr('width', sliderWidth)
        .attr('height', sliderHeight);

    var g = svg.append('g')
        .attr('transform', 'translate(' + marginSlider.left + ',' + marginSlider.top + ')');

    var width = sliderWidth - marginSlider.left - marginSlider.right;
    var height = sliderHeight - marginSlider.top - marginSlider.bottom;

    // Create scale for the slider
    var xScale = d3.scaleLinear()
        .domain(yearExtent)
        .range([0, width])
        .clamp(true);

    // Create axis
    var xAxis = d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat(d3.format('d'));

    g.append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis)
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', 'var(--gray-600)');

    // Flag to prevent updates during initialization
    var isInitializing = true;

    // Create brush for range selection
    var brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on('brush', function() {
            if (isInitializing) return;
            var event = d3.event;
            if (event && event.selection) {
                var selection = event.selection;
                appState.yearRange[0] = Math.round(xScale.invert(selection[0]));
                appState.yearRange[1] = Math.round(xScale.invert(selection[1]));

                // Ensure min <= max
                if (appState.yearRange[0] > appState.yearRange[1]) {
                    var temp = appState.yearRange[0];
                    appState.yearRange[0] = appState.yearRange[1];
                    appState.yearRange[1] = temp;
                }

                updateYearDisplay();
            }
        })
        .on('end', function() {
            if (isInitializing) {
                isInitializing = false;
                return;
            }
            var event = d3.event;
            if (event && event.selection) {
                updateAllCharts();
            }
        });

    var brushG = g.append('g')
        .attr('class', 'brush')
        .call(brush);

    // Set initial selection
    brush.move(brushG, [xScale(yearExtent[0]), xScale(yearExtent[1])]);
    isInitializing = false;

    // Style the brush
    brushG.selectAll('.selection')
        .attr('fill', 'var(--interactive-blue)')
        .attr('fill-opacity', 0.2);

    brushG.selectAll('.handle')
        .attr('fill', 'var(--interactive-blue)')
        .attr('stroke', 'white')
        .attr('stroke-width', 2);

    function updateYearDisplay() {
        d3.select('#yearRangeDisplay').text(appState.yearRange[0] + ' - ' + appState.yearRange[1]);
    }

    updateYearDisplay();
}

function setupStateFilters() {
    var stateFiltersDiv = d3.select('#stateFilters');

    statesGA.forEach(function(state) {
        var filterItem = stateFiltersDiv.append('div')
            .attr('class', 'state-filter-item');

        filterItem.append('input')
            .attr('type', 'checkbox')
            .attr('id', 'state-' + state.replace(/\s+/g, '-'))
            .attr('checked', true)
            .on('change', function() {
                if (this.checked) {
                    appState.selectedStates.add(state);
                } else {
                    appState.selectedStates.delete(state);
                }
                updateAllCharts();
            });

        filterItem.append('label')
            .attr('for', 'state-' + state.replace(/\s+/g, '-'))
            .text(state);
    });
}

var allData = null;

function updateAllCharts() {
    if (!allData) return;
    var filteredData = filterData(allData);
    createChart(filteredData, appState.selectedCrime);
    createLineChart(filteredData, appState.selectedCrime);
}

// ============================================
// DATA LOADING & INITIALIZATION
// ============================================

d3.csv("https://raw.githubusercontent.com/fuyuGT/CS7450-data/main/state_crime.csv")
    .then(function (data) {
        console.log("Data loaded", data);
        allData = data;

        // Setup filters
        setupYearRangeSlider(data);
        setupStateFilters();

        select.on("change", function () {
            var selectedCrime = d3.select(this).property("value");
            appState.selectedCrime = selectedCrime;
            appState.selectedPoints.clear();
            updateSelectionSummary();
            updateAllCharts();
        });

        createChart(data, dropdownOptions[0]);
        createLineChart(data, dropdownOptions[0]);
    })
    .catch(function(error) {
        console.error("Error loading data:", error);
    });

// Click outside to clear selection
d3.select('body').on('click', function() {
    var event = d3.event;
    if (event && event.target) {
        var target = event.target;
        if (!target.closest && typeof target.closest !== 'function') {
            // Fallback for older browsers
            var element = target;
            while (element && element !== document.body) {
                if (element.classList && (element.classList.contains('myCircles') || element.id === 'detailPanel')) {
                    return;
                }
                element = element.parentNode;
            }
        } else if (!target.closest('.myCircles') && !target.closest('#detailPanel')) {
            // Optionally clear selections on outside click
        }
    }
});
