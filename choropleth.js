// ============================================
// CHOROPLETH MAP WITH ENHANCED INTERACTIONS
// ============================================

var margin = { top: 50, right: 50, bottom: 50, left: 50 },
    width = 960,
    height = 480;

var colorScheme = d3.schemeOranges[9];
var color = d3.scaleThreshold().domain(d3.range(1, 9)).range(colorScheme);

var svg = d3
    .select("#choropleth")
    .append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom);

var g = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Year data for slider
var dataTime = d3.range(0, 60, 10).map(function (d) {
    return new Date(1960 + d, 1, 1);
});
dataTime.push(new Date(2019, 1, 1));

var projection = d3.geoAlbersUsa()
    .scale(800)
    .translate([400, 200]);

var path = d3.geoPath(projection);

var promises = [
    d3.json("states-10m.json"),
    d3.csv("https://raw.githubusercontent.com/fuyuGT/CS7450-data/main/state_crime.csv")
];

var year = 1960;
var selectedState = null;

// Enhanced tooltip
var tooltip = d3.select('body').append('div')
    .attr('class', 'd3-tip')
    .style('opacity', 0)
    .style('position', 'absolute')
    .style('pointer-events', 'none');

// Slider with enhanced styling
var sliderTime = d3
    .sliderBottom()
    .min(new Date(1960, 1, 1))
    .max(new Date(2019, 1, 1))
    .step(1000 * 60 * 60 * 24 * 365)
    .width(400)
    .tickFormat(d3.timeFormat('%Y'))
    .tickValues(dataTime)
    .default(new Date(1960, 1, 1))
    .on('onchange', function(value) {
        year = d3.timeFormat('%Y')(value);
        display(states_10m, state_crime, year);
    });

var gTime = d3
    .select('div#slider-year')
    .append('svg')
    .attr('width', 500)
    .attr('height', 100)
    .append('g')
    .attr('transform', 'translate(50,40)');

gTime.call(sliderTime);

Promise.all(promises).then((array) => {
    states_10m = array[0];
    state_crime = array[1];
    console.log("Choropleth data loaded", state_crime);
    display(states_10m, state_crime, year);
});

function display(states_10m, state_crime, year) {
    var crimeRates = {};
    var allTime = [];
    var info = {};

    // Process data for current year
    state_crime.forEach(function (d) {
        if (d.Year == year) {
            crimeRates[d.State] = (+d['Data.Rates.Property.All']) + (+d['Data.Rates.Violent.All']);
            allTime.push(crimeRates[d.State]);
        }
    });

    state_crime.forEach(function (d) {
        if (d.Year == year) {
            info[d.State] = {
                state: d.State,
                propertyRate: +d['Data.Rates.Property.All'],
                violentRate: +d['Data.Rates.Violent.All'],
                totalRate: (+d['Data.Rates.Property.All']) + (+d['Data.Rates.Violent.All']),
                population: +d['Data.Population']
            };
        }
    });

    var form = d3.format(".0f");
    var indicies = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    var measure = [];

    var linearScale = d3.scaleLinear()
        .domain([d3.min(allTime), d3.max(allTime)])
        .range([1, 9]);

    indicies.forEach(function (d) {
        measure.push(form(linearScale.invert(d)));
    });

    // Remove existing states and legend
    g.selectAll(".states").remove();
    g.selectAll(".legend").remove();
    g.selectAll(".title").remove();

    // Title with fade-in animation
    g.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", 15)
        .style("text-anchor", "middle")
        .style("opacity", 0)
        .text("Crime Rate Map by State " + year)
        .transition()
        .duration(600)
        .style("opacity", 1);

    // Create states with smooth color transitions
    var states = g.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(topojson.feature(states_10m, states_10m.objects.states).features, d => d.properties.name);

    // Exit - fade out
    states.exit()
        .transition()
        .duration(500)
        .style("opacity", 0)
        .remove();

    // Update existing states with color transition
    states
        .transition()
        .duration(800)
        .attr("fill", function (d) {
            var rate = crimeRates[d.properties.name] || 0;
            return color(linearScale(rate));
        })
        .style("opacity", function(d) {
            return selectedState === d.properties.name ? 1 : 0.85;
        })
        .attr("stroke", function(d) {
            return selectedState === d.properties.name ? "#0ea5e9" : "#525252";
        })
        .attr("stroke-width", function(d) {
            return selectedState === d.properties.name ? 2.5 : 1.5;
        });

    // Enter - fade in with stagger
    states.enter()
        .append("path")
        .attr("d", path)
        .attr("fill", function (d) {
            var rate = crimeRates[d.properties.name] || 0;
            return color(linearScale(rate));
        })
        .attr("opacity", 0)
        .attr("stroke", "#525252")
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer")
        .on('mouseover', function(event, d) {
            handleStateHover(event, d, info, year);
        })
        .on('mousemove', function(event) {
            tooltip
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function(event, d) {
            handleStateMouseOut(event, d);
        })
        .on('click', function(event, d) {
            handleStateClick(event, d, info, year);
        })
        .merge(states)
        .transition()
        .duration(500)
        .delay((d, i) => i * 10)
        .style("opacity", function(d) {
            return selectedState === d.properties.name ? 1 : 0.85;
        });

    // Legend with animation
    var legend = g.selectAll("g.legend")
        .data(measure, (d, i) => i);

    legend.exit().remove();

    var legendEnter = legend.enter()
        .append("g")
        .attr("class", "legend")
        .style("opacity", 0);

    legendEnter.append("text")
        .attr("class", "caption")
        .attr("x", width - 150)
        .attr("y", 30)
        .attr("fill", "var(--gray-900)")
        .attr("text-anchor", "start")
        .style("font-size", "22px")
        .style("font-weight", "600")
        .text("Crime Rate");

    legendEnter.append("text")
        .attr("class", "caption")
        .attr("x", width - 250)
        .attr("y", 50)
        .attr("fill", "var(--gray-600)")
        .attr("text-anchor", "start")
        .style("font-size", "12px")
        .text("Rates are the number of reported offenses per 100,000 population");

    legendEnter.append("text")
        .attr("x", width - 120)
        .attr("y", function (d, i) {
            return 38 + (i + 2) * 25;
        })
        .style("font-size", "14px")
        .style("fill", "var(--gray-700)")
        .text(function (d, i) {
            return measure[i] + "+ per 100,000";
        });

    legendEnter.append("rect")
        .attr("x", width - 150)
        .attr("y", function (d, i) {
            return 20 + (i + 2) * 25;
        })
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", function (d) {
            return color(linearScale(d));
        })
        .attr("opacity", 0.85)
        .attr("rx", 2);

    legend.merge(legendEnter)
        .transition()
        .duration(600)
        .delay((d, i) => 500 + i * 50)
        .style("opacity", 1);
}

function handleStateHover(event, d, info, year) {
    var stateInfo = info[d.properties.name];
    if (!stateInfo) return;

    d3.select(event.currentTarget)
        .transition()
        .duration(200)
        .attr("stroke", "#0ea5e9")
        .attr("stroke-width", 2.5)
        .style("opacity", 1);

    tooltip
        .style('opacity', 0)
        .html(`
            <div class="tip-header">${stateInfo.state}</div>
            <div class="tip-row">
                <span class="tip-label">Year:</span>
                <span class="tip-value">${year}</span>
            </div>
            <div class="tip-row">
                <span class="tip-label">Total Crime Rate:</span>
                <span class="tip-value">${stateInfo.totalRate.toFixed(1)} per 100K</span>
            </div>
            <div class="tip-row">
                <span class="tip-label">Property Rate:</span>
                <span class="tip-value">${stateInfo.propertyRate.toFixed(1)} per 100K</span>
            </div>
            <div class="tip-row">
                <span class="tip-label">Violent Rate:</span>
                <span class="tip-value">${stateInfo.violentRate.toFixed(1)} per 100K</span>
            </div>
            <div class="tip-row">
                <span class="tip-label">Population:</span>
                <span class="tip-value">${formatLargeNumber(stateInfo.population)}</span>
            </div>
        `)
        .transition()
        .duration(200)
        .style('opacity', 1);
}

function handleStateMouseOut(event, d) {
    d3.select(event.currentTarget)
        .transition()
        .duration(200)
        .attr("stroke", selectedState === d.properties.name ? "#0ea5e9" : "#525252")
        .attr("stroke-width", selectedState === d.properties.name ? 2.5 : 1.5)
        .style("opacity", selectedState === d.properties.name ? 1 : 0.85);

    tooltip.transition().duration(200).style('opacity', 0);
}

function handleStateClick(event, d, info, year) {
    selectedState = selectedState === d.properties.name ? null : d.properties.name;

    // Update all states to show selection
    g.selectAll(".states path")
        .transition()
        .duration(300)
        .attr("stroke", function(state) {
            return selectedState === state.properties.name ? "#0ea5e9" : "#525252";
        })
        .attr("stroke-width", function(state) {
            return selectedState === state.properties.name ? 2.5 : 1.5;
        })
        .style("opacity", function(state) {
            if (selectedState === null) return 0.85;
            return selectedState === state.properties.name ? 1 : 0.4;
        });

    if (selectedState) {
        var stateInfo = info[selectedState];
        if (stateInfo) {
            // Show detail panel or navigate to main page
            console.log("Selected state:", selectedState, "Year:", year);
            // Could add navigation or detail panel here
        }
    }
}

function formatLargeNumber(d) {
    if (d >= 1000000) return (d / 1000000).toFixed(1) + 'M';
    if (d >= 1000) return (d / 1000).toFixed(1) + 'K';
    return d3.format(',')(d);
}
