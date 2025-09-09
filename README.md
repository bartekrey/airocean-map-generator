# Airocean Map Generator
Generate an airocean projection of the world. Done with D3.js and d3-geo-polygon library.  Upload your own data using topoJSON files. 

I would have done this in QGIS, but it seems that their Fuller projection implementation simply doesn't work. I found some examples on the internet of how this projection is implmented in D3 - https://observablehq.com/@fil/airocean-projection https://www.jasondavies.com/maps/airocean/ https://observablehq.com/@d3/fullers-airocean - However, none of them allowed me to actually use the projection to show data. So I made this. 

You can transform any shapefile into topoJSON here: https://mapshaper.org/