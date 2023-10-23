
// enter code to define margin and dimensions for svg
var margin = { top: 50, right: 50, bottom: 50, left: 50 },
    //   , width = window.innerWidth - margin.left - margin.right // Use the window's width
    //   , height = window.innerHeight - margin.top - margin.bottom; // Use the window's height
    // width = innerWidth - margin.left - margin.right,
    // height = innerHeight - margin.top - margin.bottom;
    width = 960, height = 480;

// enter code to create color scale
var colorScheme = d3.schemeOranges[9];
var color = d3.scaleThreshold().domain(d3.range(1, 9)).range(colorScheme);

var svg = d3
    .select("#choropleth")
    .append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.right)
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// year on x-axis
var dataTime = d3.range(0, 60, 10).map(function (d) {
    return new Date(1960 + d, 1, 1);
});
dataTime.push(new Date(2019, 1, 1))

var projection = d3.geoAlbersUsa()
    .scale(800)
    .translate([400, 200]);

var path = d3.geoPath(projection);

var promises = [
    d3.json("states-10m.json"),
    d3.csv("https://raw.githubusercontent.com/fuyuGT/CS7450-data/main/state_crime.csv")
]

var year = 1960;

// slider bottom
var sliderTime = d3
    .sliderBottom()
    .min(new Date(1960, 1, 1))
    .max(new Date(2019, 1, 1))
    .step(1000 * 60 * 60 * 24 * 365)
    .width(300)
    .tickFormat(d3.timeFormat('%Y'))
    .tickValues(dataTime)
    .default(new Date(1960, 1, 1))
    .on('onchange', show);

function show() {
    d3.selectAll(".legend")
        .remove();
    year = d3.timeFormat('%Y')(sliderTime.value());
    display(states_10m, state_crime, year);
}

var gTime = d3
    .select('div#slider-year')
    .append('svg')
    .attr('width', 480)
    .attr('height', 100)
    .append('g')
    .attr('transform', 'translate(40,40)');

gTime.call(sliderTime);

Promise.all(promises).then((array) => {
    states_10m = array[0];
    state_crime = array[1];
    console.log(state_crime);

    display(states_10m, state_crime, year);
});

function display(states_10m, state_crime, year) {
    var crimeRates = {};
    var allTime = [];
    var info = {};

    state_crime.forEach(function (d) {
        if (d.Year == year) {
            console.log('d.Year', d.Year)
            crimeRates[d.State] = (+d['Data.Rates.Property.All']) + (+d['Data.Rates.Violent.All']);
            allTime.push(crimeRates[d.State]);
        };

    });

    state_crime.forEach(function (d) {
        info[d.State] = [d.State, d['Data.Rates.Property.All'], d['Data.Rates.Violent.All']];
    });

    console.log('crimeRates', crimeRates)
    console.log('allTime', allTime)
    console.log('info', info)

    var tip = d3.tip()
        .attr("class", "d3-tip")
        .attr("id", "tooltip")
        .offset([0, 0])
        .html(function (d) {
            return "<strong style='color:red'>State: </strong><span style='color:white'>" + info[d.properties.name] + "</span><br>" +
                "<strong style='color:red'>Year: </strong><span style='color:white'>" + year + "</span><br>" +
                "<strong style='color:red'>Crime Rate: </strong><span style='color:white'>" + crimeRates[d.properties.name] + "</span><br>"
        });
    svg.call(tip);

    var form = d3.format(".0f");
    var indicies = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    var measure = [];

    var linearScale = d3.scaleLinear()
        .domain([1, d3.max(allTime)]).range([1, 9]);

    indicies.forEach(function (d) {
        measure.push(form(linearScale.invert(d)));
    })


    svg.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(topojson.feature(
            states_10m,
            states_10m.objects.states).features
        )
        .enter().append("path")
        .attr("d", path)
        .attr("fill", function (d) {
            return color(linearScale(crimeRates[d.properties.name]))
        })
        .attr("opacity", 0.8)
        .attr("stroke", "#000")
        .on('mouseover', tip.show)
        .on('mousemove', function (d) {
            d3.select("#tooltip")
                .style("left", (d3.event.pageX + 20) + 'px')
                .style('top', (d3.event.pageY + 20) + 'px')
        })
        .on('mouseout', tip.hide);

    svg.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", 15)
        .style("text-anchor", "middle")
        .attr("font-size", "18px")
        .style("font-weight", "bold")
        .text("Crime Rate Map by State 1960-2019");

    var legend = svg.selectAll("g.legend")
        .data(measure)
        .enter()
        .append("g")
        .attr("class", "legend");

    legend.append("text")
        .attr("class", "caption")
        .attr("x", width - 150)
        .attr("y", 30)
        .attr("fill", "#000")
        .attr("text-anchor", "start")
        .style("font-size", "22px")
        .text("Crime Rate");

    legend.append("text")
        .attr("class", "caption")
        .attr("x", width - 250)
        .attr("y", 50)
        .attr("fill", "#000")
        .attr("text-anchor", "start")
        .style("font-size", "12px")
        .text("Rates are the number of reported offenses per 100,000 population");

    legend.append("text")
        .attr("x", width - 120)
        .attr("y", function (d, i) {
            return 38 + (i + 2) * 25;
        })
        .style("font-size", "16px")
        .text(function (d, i) {
            return measure[i] + "+ per 100,000"
        });

    legend.append("rect")
        .attr("x", width - 150)
        .attr("y", function (d, i) {
            return 20 + (i + 2) * 25
        })
        .attr("width", 20)
        .attr("height", 20)
        .style("", "middle")
        .style("fill", function (d) {
            return color(linearScale(d))
        })
        .attr("opacity", 0.8)
        .style("opacity", 0.85);



}