// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function () {
    const d3Container = document.getElementById('d3Container');
    let showLand = true;
    let showGraticule = true;
    let showFolds = true;
    let showGlobe = true;
    let showIDs = false;
    let showUploaded = true;
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
    const showUploadedInput = document.getElementById('showUploaded');
    const downloadSVGButton = document.getElementById('downloadSVG');
    const downloadPNGButton = document.getElementById('downloadPNG');
    const topojsonUploadInput = document.getElementById('topojsonUpload');

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

    showUploadedInput.addEventListener('change', (e) => {
        showUploaded = e.target.checked;
        toggleRendering();
    });

    function toggleRendering() {
        renderGlobe();
        renderMap();
        renderGraticule();
        renderFolds();
        renderIDs();

        const uploadedFile = topojsonUploadInput.files[0];
    if (uploadedFile && showUploaded) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const uploadedData = JSON.parse(e.target.result);
            renderUploadedTopoJSON(uploadedData);
        };
        reader.readAsText(uploadedFile);
    } else {
        svg.selectAll(".user-uploaded").remove();
    }
    }


    topojsonUploadInput.addEventListener('change', handleTopoJSONUpload);
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
        if (showLand && geojsonData) {
            let landFeature = topojson.feature(geojsonData, geojsonData.objects.land);
            svg.append("path")
                .attr("class", "land")
                .datum(landFeature)
                .attr("d", pathGenerator)
                .attr("fill", mapFillColor)
                .attr("stroke", mapStrokeColor)
                .attr("stroke-width", 1);
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


    function handleTopoJSONUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const uploadedData = JSON.parse(e.target.result);
                renderUploadedTopoJSON(uploadedData);
            } catch (error) {
                console.error("Error parsing uploaded file:", error);
                alert("Error parsing the uploaded file. Please ensure it is a valid TopoJSON file.");
            }
        };
        reader.readAsText(file);
    }

    function renderUploadedTopoJSON(uploadedData) {
    svg.selectAll(".user-uploaded").remove();

    // Iterate over all objects in the TopoJSON
    for (const [key, object] of Object.entries(uploadedData.objects)) {
        const feature = topojson.feature(uploadedData, object);

        // Render the feature based on its geometry type
        svg.append("path")
            .attr("class", "user-uploaded")
            .datum(feature)
            .attr("d", pathGenerator)
            .attr("fill", "#ff000080") // Semi-transparent red fill for polygons
            .attr("stroke", "#ff0000") // Red stroke for lines and polygon edges
            .attr("stroke-width", 0.5);
    }
}

    window.addEventListener("resize", resizeSVG);
});
