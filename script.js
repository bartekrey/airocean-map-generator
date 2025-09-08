// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function () {
    const d3Container = document.getElementById('d3Container');
    let showLand = true;
    let showGraticule = true;
    let showFolds = true;
    let showGlobe = true;
    let showIDs = false;
    let globeFillColor = '#eeeeff';
    let mapFillColor = '#f5f5f4';
    let mapStrokeColor = '#79716b';

    // Get DOM elements for controls
    const globeFillColorInput = document.getElementById('globeFillColor');
    const mapFillColorInput = document.getElementById('mapFillColor');
    const mapStrokeColorInput = document.getElementById('mapStrokeColor');
    const showGlobeInput = document.getElementById('showGlobe');
    const showLandInput = document.getElementById('showLand');
    const showGraticuleInput = document.getElementById('showGraticule');
    const showFoldsInput = document.getElementById('showFolds');
    const showIDsInput = document.getElementById('showIDs');
    const downloadSVGButton = document.getElementById('downloadSVG');
    const downloadPNGButton = document.getElementById('downloadPNG');
    const topojsonUploadInput = document.getElementById('topojsonUpload');
    const loadingStatusDiv = document.getElementById('loadingStatus');
    const resetMapButton = document.getElementById('resetMap');


    // Set up event listeners for controls
    globeFillColorInput.addEventListener('input', (e) => {
        globeFillColor = e.target.value;
        toggleRendering();
    });
    mapFillColorInput.addEventListener('input', (e) => {
        mapFillColor = e.target.value;
        toggleRendering();
    });
    mapStrokeColorInput.addEventListener('input', (e) => {
        mapStrokeColor = e.target.value;
        toggleRendering();
    });
    showGlobeInput.addEventListener('change', (e) => {
        showGlobe = e.target.checked;
        toggleRendering();
    });
    showLandInput.addEventListener('change', (e) => {
        showLand = e.target.checked;
        toggleRendering();
    });
    showGraticuleInput.addEventListener('change', (e) => {
        showGraticule = e.target.checked;
        toggleRendering();
    });
    showFoldsInput.addEventListener('change', (e) => {
        showFolds = e.target.checked;
        toggleRendering();
    });
    showIDsInput.addEventListener('change', (e) => {
        showIDs = e.target.checked;
        toggleRendering();
    });
    downloadSVGButton.addEventListener('click', downloadSVG);
    downloadPNGButton.addEventListener('click', downloadPNG);

    // D3 code (adapted from your React component)
    const svg = d3.select(d3Container)
        .append("svg")
        .attr("id", "airocean-map-svg")
        .attr("class", "");

    const projectionAirocean = d3.geoAirocean()
        .scale(50)
        .translate([0, 0]);

    let initialRotation = projectionAirocean.rotate();
    const pathGenerator = d3.geoPath().projection(projectionAirocean);
    let siteLocations = [];
    let foldLines = [];
    let geojsonData = null;

    function processFace(face) {
        var multiPointFeature = { type: "MultiPoint", coordinates: face.face };
        var centroid = d3.geoCentroid(multiPointFeature);
        centroid.id = face.id || siteLocations.length;
        siteLocations.push(centroid);
        if (face.children) {
            face.children.forEach(child => {
                var lineStringFeature = {
                    type: "LineString",
                    coordinates: child.shared.map(edgeCoordinate => {
                        return d3.geoInterpolate(edgeCoordinate, face.centroid)(0.00001);
                    })
                };
                foldLines.push(lineStringFeature);
                processFace(child);
            });
        }
    }

    function renderGlobe() {
        svg.selectAll(".Globe").remove();
        if (showGlobe) {
            svg.append("path")
                .attr("class", "Globe")
                .datum({ type: "Sphere" })
                .attr("d", pathGenerator)
                .attr("fill", globeFillColor)
                .attr("stroke", "#888888")
                .attr("stroke-width", 1);
        }
    }

    function renderMap() {
        svg.selectAll(".land").remove();
        svg.selectAll(".points").remove();
        svg.selectAll(".lines").remove();
        svg.selectAll(".polygons").remove();
        if (showLand && geojsonData) {
            console.log("Rendering objects:", Object.keys(geojsonData.objects));
            for (const [key, value] of Object.entries(geojsonData.objects)) {
                try {
                    let feature = topojson.feature(geojsonData, value);
                    console.log(`Rendering object ${key} (type: ${feature.geometry.type})`);
                    let pathData = pathGenerator(feature);
                    console.log(`Path data for ${key}:`, pathData);
                    if (!pathData) {
                        console.warn(`No path data for ${key}`);
                        continue;
                    }
                    let className = "polygons";
                    let fill = mapFillColor;
                    let stroke = mapStrokeColor;
                    let strokeWidth = 1;
                    if (feature.geometry.type === "Point" || feature.geometry.type === "MultiPoint") {
                        className = "points";
                        fill = "red";
                        stroke = "darkred";
                        strokeWidth = 2;
                    } else if (feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString") {
                        className = "lines";
                        fill = "none";
                        stroke = "blue";
                        strokeWidth = 1.5;
                    }
                    svg.append("path")
                        .attr("class", className)
                        .datum(feature)
                        .attr("d", pathData)
                        .attr("fill", fill)
                        .attr("stroke", stroke)
                        .attr("stroke-width", strokeWidth);
                } catch (error) {
                    console.error(`Error rendering object ${key}:`, error);
                }
            }
        }
    }


    function renderGraticule() {
        svg.selectAll(".graticule").remove();
        if (showGraticule) {
            let graticule = d3.geoGraticule();
            svg.append("path")
                .attr("class", "graticule")
                .datum(graticule)
                .attr("d", pathGenerator)
                .attr("fill", "none")
                .attr("stroke", "#cccccc")
                .attr("stroke-width", 0.5);
        }
    }

    function renderFolds() {
        svg.selectAll(".fold").remove();
        if (showFolds) {
            projectionAirocean.rotate([0, 0, 0]);
            foldLines.forEach(fold => {
                svg.append("path")
                    .attr("class", "fold")
                    .datum(fold)
                    .attr("d", pathGenerator)
                    .attr("fill", "none")
                    .attr("stroke", "#888888")
                    .attr("stroke-width", 0.5)
                    .attr("stroke-dasharray", "3,4");
            });
            projectionAirocean.rotate(initialRotation);
        }
    }

    function renderIDs() {
        svg.selectAll(".site, .site-text").remove();
        if (showIDs) {
            projectionAirocean.rotate([0, 0, 0]);
            siteLocations.forEach(function (site) {
                svg.append("text")
                    .attr("class", "site-text")
                    .attr("x", projectionAirocean(site)[0])
                    .attr("y", projectionAirocean(site)[1])
                    .attr("text-anchor", "middle")
                    .attr("dy", "0.35em")
                    .attr("font-size", "1em")
                    .attr("font-family", "'Roboto Mono', monospace")
                    .attr("fill", "black")
                    .text(site.id);
            });
            projectionAirocean.rotate(initialRotation);
        }
    }

    function toggleRendering() {
        renderGlobe();
        renderMap();
        renderGraticule();
        renderFolds();
        renderIDs();
    }

    function resizeSVG() {
        const bounds = pathGenerator.bounds({ type: "Sphere" });
        console.log("Projection bounds:", bounds);
        const naturalWidth = Math.ceil(bounds[1][0] - bounds[0][0]);
        const naturalHeight = Math.ceil(bounds[1][1] - bounds[0][1]);
        const container = d3Container;
        const isRotated = window.innerWidth < 1024;
        const width = isRotated ? naturalHeight : naturalWidth;
        const height = isRotated ? naturalWidth : naturalHeight;
        container.style.width = `${width}px`;
        container.style.height = `${height}px`;
        svg
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", `0 0 ${naturalWidth} ${naturalHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
        if (isRotated) {
            svg.classed("rotated", true);
        } else {
            svg.classed("rotated", false);
        }

        projectionAirocean.translate([
            naturalWidth / 2,
            naturalHeight / 2,
        ]);

        toggleRendering();
    }

    function downloadSVG() {
        const svgElement = d3Container.querySelector("svg");
        if (!svgElement) return;
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "airocean-map.svg";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function downloadPNG() {
        const svgElement = d3Container.querySelector("svg");
        if (!svgElement) return;

        // Create a canvas element
        const canvas = document.createElement("canvas");
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        // Create an image element to render the SVG
        const img = new Image();
        img.onload = function () {
            // Set canvas dimensions to match the SVG
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            // Fill the canvas with a white background (optional)
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Draw the SVG image onto the canvas
            ctx.drawImage(img, 0, 0);

            // Convert canvas to PNG and trigger download
            const pngUrl = canvas.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = pngUrl;
            a.download = "airocean-map.png";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }

    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json")
        .then(function (data) {
            geojsonData = data;
            processFace(projectionAirocean.tree());
            resizeSVG();
            toggleRendering();
        })
        .catch(error => console.error("Error loading or rendering the map data: ", error));

    topojsonUploadInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        // Show loading status
        const statusParagraph = document.createElement('p');
        statusParagraph.id = 'status-' + Date.now();
        statusParagraph.innerHTML = `Loading: ${file.name} <span id="status-icon-${statusParagraph.id}"></span>`;
        loadingStatusDiv.appendChild(statusParagraph);

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                console.log("Uploaded TopoJSON structure:", data);
                console.log("Objects in TopoJSON:", Object.keys(data.objects));
                geojsonData = data;
                processFace(projectionAirocean.tree());
                resizeSVG();
                toggleRendering();
                const statusIcon = document.getElementById(`status-icon-${statusParagraph.id}`);
                statusIcon.textContent = ' ✓';
                resetMapButton.classList.remove('hidden');
            } catch (error) {
                alert("Error parsing TopoJSON file: " + error.message);
            }
        };
        reader.readAsText(file);
    });

    // Add event listener for reset button
    resetMapButton.addEventListener('click', function () {
        d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json")
            .then(function (data) {
                geojsonData = data;
                processFace(projectionAirocean.tree());
                resizeSVG();
                toggleRendering();

                // Clear loading status
                loadingStatusDiv.innerHTML = '';

                // Hide reset button
                resetMapButton.classList.add('hidden');
            })
            .catch(error => console.error("Error loading default map data: ", error));
    });


    window.addEventListener("resize", resizeSVG);
});
