const scenes = [
    { id: 'overall', 
        title: 'Annual Infant Death Rates in the United States',
        yKey: 'Total', 
        paragraph: 'The line chart displays data on live births and infant (age under 365 days) death rates (per 1000 births) to maternal residents of the United States from CDC.' },
    { id: 'comparison',
        title: 'Annual Infant Death Rates in the United States', 
        yKey: 'Black', 
        paragraph: 'The line chart displays data on live births and infant death rates in the United States in comparison to death rates from infants from black mother in the United States.' },
    { id: 'interactive', 
        title: 'Annual Infant Death Rates in the United States by Race', 
        paragraph: 'Interactively explore the infant death rate trends across different demographics.' }
];

let currentScene = 0;
let rateData = [];

const margin = { top: 20, right: 30, bottom: 40, left: 40 };
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Stroke colors stored in an array
const colors = {
    'Total': 'steelblue',
    'White': 'green',
    'Black': 'red',
    'Native': 'blue',
    'Asian': 'orange'
};

d3.csv("data/dataset.csv").then(data => {
    data.forEach(d => {
        d.Year = +d.Year;
        for (let key in d) {
            if (key !== 'Year') d[key] = +d[key];
        }
    });

    rateData = data;
    createScene();
});

function createScene() {
    const scene = scenes[currentScene];
    d3.select("#scene").html("");

    const content = d3.create("div").attr("class", "content");
    content.append("div").attr("class", "title").text(scene.title);

    var text = 'The line chart displays data from <a href="https://wonder.cdc.gov/lbd-current.html" target="_blank">CDC</a> on live births and infant (age under 365 days) death rates (per 1000 births) to maternal residents of the United States 2007 to 2019. ' +
    'The graph shows that trend that a consistent decline in infant death rates over the except small increase from 2014 to 2015. ' +
    'The highest value is 6.75 in 2007, the earliest year in data, and the lowest value is 5.58, the latest year in data, confirming the trend.';
    
    if (scene.id === 'comparison') {
        text = 'The line chart displays data on live births and infant death rates in the United States in comparison to death rates from infants from Black mother in the United States. ' +
        'Although the trend for infant death rates for Black mothers have been decreasing as well, you can see the large gap in numbers between two comparison groups. ' +
        'Even at the year with smallest difference between values, the infant death rates for Black are about 80% higher.';
    } else if (scene.id === 'interactive') {
        text = 'Interactively explore the infant death rate trends across different races to conduct further analysis. Hover over the data point to get exact infant death rate value.'
    }
    
    const paragraph = content.append("div").attr("class", "paragraph");
    paragraph.html(text);

    d3.select("#scene").append(() => content.node());

    d3.select(".arrow.left").classed("hidden", currentScene === 0);
    d3.select(".arrow.right").classed("hidden", currentScene === scenes.length - 1);
    d3.select(".arrow.replay").classed("hidden", currentScene !== scenes.length - 1);

    if (scene.id === 'interactive') {
        createInteractiveScene(rateData);
    } else {
        createChartScene(rateData, scene);
    }
}

// Function to create a chart scene
function createChartScene(data, scene) {
    const svgContainer = d3.select("#scene").append("div").attr("class", "chart");
    const svg = createSvg(svgContainer);

    const x = createXScale(data);
    const y = createYScale(data, scene);

    addAxes(svg, x, y);
    addLine(svg, x, y, data, scene.yKey, colors['Total']);

    if (scene.id == 'overall') {
        addPointsAnnotations(svg, data, {yKey: 'Total'}, x, y);
    }

    // Add line path for the overall data if scene is 'comparison'
    if (scene.id === 'comparison') {
        addLine(svg, x, y, data, 'Black', colors['Black']);
        addLine(svg, x, y, data, 'Total', colors['Total']);
        addDifferenceAnnotations(svg, data, scene, x, y);
        addLegend(svg, ['Black', 'Total']); // Call legend for 'comparison' scene
    }

    addAxisLabels(svg);
}

// Function to create an interactive scene
function createInteractiveScene(data) {
    const checkboxContainer = d3.select("#scene").append("div").attr("class", "filter-container");

    const keys = Object.keys(data[0]).filter(key => key !== 'Year' && key !== '');
    checkboxContainer.selectAll("label")
        .data(keys)
        .enter()
        .append("label")
        .each(function (d) {
            d3.select(this)
                .append("input")
                .attr("type", "checkbox")
                .attr("id", d)
                .attr("checked", true)
                .on("change", function () {
                    updateLines(filterData(slider.node().value));
                });
            d3.select(this)
                .append("div")
                .attr("class", "color-box")
                .style("background-color", colors[d] || 'gray');
            d3.select(this)
                .append("span")
                .text(d);
        });

    const svgContainer = d3.select("#scene").append("div").attr("class", "chart");
    const svg = createSvg(svgContainer);

    const x = createXScale(data);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => Math.max(...keys.map(key => d[key])))]).range([height, 0]);

    addAxes(svg, x, y);

    const lines = svg.append("g").attr("class", "lines");

    const updateLines = (filteredData) => {
        lines.selectAll("*").remove();

        keys.forEach(key => {
            if (document.getElementById(key).checked) {
                addLine(lines, x, y, filteredData, key, colors[key] || 'gray');
                addTooltip(lines, x, y, filteredData, key); // Add tooltips to the lines
            }
        });
    };

    const filterData = (year) => data.filter(d => d.Year <= year);

    const sliderContainer = d3.select("#scene").append("div").attr("class", "slider-container"); // Assuming there's a container with this ID

    const slider = sliderContainer
        .append("input")
        .attr("type", "range")
        .attr("min", d3.min(data, d => d.Year))
        .attr("max", d3.max(data, d => d.Year))
        .attr("value", d3.max(data, d => d.Year))
        .attr("step", 1)
        .style("width", `${width}px`)
        .attr("list", "tickmarks")
        .on("input", function () {
            const year = +this.value;
            updateLines(filterData(year));
        });

    const tickmarks = sliderContainer.append("datalist").attr("id", "tickmarks");
    tickmarks.selectAll("option")
        .data(x.ticks(data.length))
        .enter()
        .append("option")
        .attr("value", d => d);

    // Adding labels for min and max values
    const minValue = d3.min(data, d => d.Year);
    const maxValue = d3.max(data, d => d.Year);

    const labelContainer = sliderContainer.append("div")
        .attr("class", "slider-labels");

    labelContainer.selectAll("span")
        .data([minValue, maxValue])
        .enter()
        .append("span")
        .attr("class", (d, i) => i === 0 ? "min-label" : "max-label")
        .text(d => d);

    updateLines(data);
    addAxisLabels(svg);
}

// Function to add tooltips
function addTooltip(svg, x, y, data, key) {
    const tooltip = d3.select("body").append("div").attr("class", "tooltip").attr("id", `tooltip-${key}`);

    svg.selectAll(`circle-${key}`)
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.Year))
        .attr("cy", d => y(d[key]))
        .attr("r", 5)
        .attr("fill", colors[key])
        .on("mouseover", (event, d) => {
            d3.select(`#tooltip-${key}`).html(`<strong>${key}:</strong> ${d[key]}`)
                .style("visibility", "visible");
        })
        .on("mousemove", (event) => {
            d3.select(`#tooltip-${key}`).style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", () => {
            d3.select(`#tooltip-${key}`).style("visibility", "hidden");
        });
}

// Function to create SVG container
function createSvg(container) {
    return container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom + 40) // Added extra height for x-axis label
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
}

// Function to create X scale
function createXScale(data) {
    return d3.scaleLinear().domain(d3.extent(data, d => d.Year)).range([0, width]);
}

// Function to create Y scale
function createYScale(data, scene) {
    //return d3.scaleLinear().domain([0, 13]).range([height, 0]);
    //return d3.scaleLinear().domain([5, d3.max(data, d => d3.max([d[scene.yKey], d.Overall]))]).range([height, 0]);
    const keys = Object.keys(data[0]).filter(key => key !== 'Year' && key !== '');
    return d3.scaleLinear().domain([0, d3.max(data, d => Math.max(...keys.map(key => d[key])))]).range([height, 0]);
}

// Function to add axes
function addAxes(svg, x, y) {
    var axisGenerator = d3.axisBottom(x).tickFormat(d3.format("d")); // Remove commas from years
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(axisGenerator);

    svg.append("g")
        .call(d3.axisLeft(y));
}

// Function to add a line path
function addLine(svg, x, y, data, key, color) {
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(d => x(d.Year))
            .y(d => y(d[key]))
        );
}

// Function to add points annotations
function addPointsAnnotations(svg, data, scene, x, y) {
    var point = data.reduce((max, d) => d[scene.yKey] > max[scene.yKey] ? d : max, data[0]);
    var annotations = [
        {
            note: {
                label: `Value: ${point[scene.yKey]}`,
                title: "Highest Point in US",
                align: "middle",
                bgPadding: 10,
                wrap: 200
            },
            data: { Year: point.Year, value: point[scene.yKey] },
            dy: -50,
            dx: 100
        }
    ];

    addAnnotationLine(svg, x, y, point, scene);
    addAnnotation(svg, x, y, annotations);

    point = data.reduce((min, d) => d[scene.yKey] < min[scene.yKey] ? d : min, data[0]);
    annotations = [
        {
            note: {
                label: `Value: ${point[scene.yKey]}`,
                title: "Lowest Point in US",
                align: "middle",
                bgPadding: 10,
                wrap: 200
            },
            data: { Year: point.Year, value: point[scene.yKey] },
            dy: 70,
            dx: -80
        }
    ];

    addAnnotationLine(svg, x, y, point, scene);
    addAnnotation(svg, x, y, annotations);
}

// Function to add difference annotations
function addDifferenceAnnotations(svg, data, scene, x, y) {
    const minDifferencePoint = data.reduce((min, d) => {
        const diff = Math.abs(d[scene.yKey] - d.Total);
        return diff < min.diff ? { ...d, diff } : min;
    }, { diff: Infinity });

    var point = minDifferencePoint;
    var annotations = [
        {
            note: {
                label: `Difference: ${point.diff.toFixed(2)}`,
                title: "Smallest Difference",
                align: "middle",
                bgPadding: 10,
                wrap: 200
            },
            data: { Year: point.Year, value: (point[scene.yKey] + point.Total) / 2 },
            dy: -5,
            dx: -120
        }
    ];

    addAnnotationLine(svg, x, y, point, scene);
    addAnnotation(svg, x, y, annotations);

    var annotations = [
        {
            note: {
                label: `Value: ${point['Total']}`,
                title: "Infant death rates (Total)",
                align: "middle",
                bgPadding: 10,
                wrap: 200
            },
            data: { Year: point.Year, value: point['Total'] },
            dy: 30,
            dx: -100
        }
    ];

    addAnnotationLine(svg, x, y, point, scene);
    addAnnotation(svg, x, y, annotations);
    
    annotations = [
        {
            note: {
                label: `Value: ${point[scene.yKey]}`,
                title: "Infant death rates (Black)",
                align: "middle",
                bgPadding: 10,
                wrap: 200
            },
            data: { Year: point.Year, value: point[scene.yKey] },
            dy: -30,
            dx: -280
        }
    ];

    addAnnotationLine(svg, x, y, point, scene);
    addAnnotation(svg, x, y, annotations);
}

// New function to add an annotation line
function addAnnotationLine(svg, x, y, point, scene) {
    svg.append("line")
        .attr("x1", x(point.Year))
        .attr("y1", y(point[scene.yKey]))
        .attr("x2", x(point.Year))
        .attr("y2", y(point.Total))
        .attr("stroke", "gray")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4");
}

function addAnnotation(svg, x, y, annotations) {
    const makeAnnotations = d3.annotation()
        .type(d3.annotationLabel)
        .accessors({
            x: d => x(d.Year),
            y: d => y(d.value)
        })
        .annotations(annotations);

    svg.append("g")
        .attr("class", "annotation-group")
        .call(makeAnnotations);
}

// Fuction to update legend based on checked data
function updateLegend(keys) {
    const checkedKeys = keys.filter(key => document.getElementById(key).checked);
    d3.select(".legend").remove();
    addLegend(d3.select("svg"), checkedKeys);
}

// Function to add legend
function addLegend(svg, keys) {
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 100},${10})`);

    keys.forEach((key, i) => {
        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * 30)
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", colors[key]);

        legend.append("text")
            .attr("x", 25)
            .attr("y", i * 30 + 15)
            .text(key);
    });
}

// Function to add axis labels
function addAxisLabels(svg) {
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", width / 2 + margin.left)
        .attr("y", height + margin.top + 30)
        .text("Year");

    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2 + margin.top + 30)
        .attr("y", -margin.left + 15)
        .text("Infant death rate");
}

function nextScene() {
    currentScene = (currentScene + 1) % scenes.length;
    createScene();
}

function prevScene() {
    if (currentScene === 0) return;
    currentScene = (currentScene - 1 + scenes.length) % scenes.length;
    createScene();
}