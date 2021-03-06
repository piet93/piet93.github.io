let startLayer = L.tileLayer.provider("BasemapAT.grau");

let map = L.map("map", {
    layers: [
        startLayer
    ]
});

let overlay = {
    stations: L.featureGroup(),
    temperature: L.featureGroup(),
    wind: L.featureGroup(),
    snow: L.featureGroup()
}

L.control.layers({
    "BasemapAT.grau": startLayer,
    "BasemapAT": L.tileLayer.provider("BasemapAT"),
    "BasemapAT.highdpi": L.tileLayer.provider("BasemapAT.highdpi"),
    "BasemapAT.terrain": L.tileLayer.provider("BasemapAT.terrain"),
    "BasemapAT.surface": L.tileLayer.provider("BasemapAT.surface"),
    "BasemapAT.orthofoto": L.tileLayer.provider("BasemapAT.orthofoto"),
    "BasemapAT.overlay": L.tileLayer.provider("BasemapAT.overlay"),
    "BasemapAT.orthofoto+overlay": L.layerGroup([
        L.tileLayer.provider("BasemapAT.orthofoto"),
        L.tileLayer.provider("BasemapAT.overlay")
    ])
}, {
    "Wetterstationen Tirol": overlay.stations,
    "Temperatur (°C)": overlay.temperature,
    "Windgeschwindigkeit (km/h)": overlay.wind,
    "Scheehöhe (cm)": overlay.snow
}).addTo(map);

let awsUrl = "https://aws.openweb.cc/stations";

let aws = L.geoJson.ajax(awsUrl, {
    filter: function (feature) {
        //console.log("Feature in filter: ", feature);
        return feature.properties.LT;
    },
    pointToLayer: function (point, latlng) {
        // console.log("point: ", point);
        let marker = L.marker(latlng).bindPopup(`
        <h3>${point.properties.name} ${point.geometry.coordinates[2]} m</h3>
        <ul>
        <li>Datum: ${point.properties.date}</li>
        <li>Position (Lat,Lng): ${point.geometry.coordinates[1].toFixed(5)}, ${point.geometry.coordinates[0].toFixed(5)}</li>
        <li>Lufttemperatur (°C): ${point.properties.LT}</li>
        <li>Windgeschwindigkeit (m/s): ${point.properties.WG || "-"}</li>
        <li>Relative Luftfeuchte (%): ${point.properties.RH || "-"}</li>
        <li>Schneehöhe (cm): ${point.properties.HS || "-"}</li>
        </ul>
        <p><a target="plot" href="https://lawine.tirol.gv.at/data/grafiken/1100/standard/tag/${point.properties.plot}.png">Grafik der vorhandenen Messwerte anzeigen</a></p>
        </ul>
        `);
        return marker;
    }
}).addTo(overlay.stations);

let getColor = function (val, ramp) {
    //console.log(val, ramp);
    let col = "red";

    for (let i = 0; i < ramp.length; i++) {
        const pair = ramp[i];
        if (val >= pair[0]) {
            break;
        } else {
            col = pair[1];
        }
        //console.log(val,pair);
    }
    return col;
};

//console.log(color);

let drawTemperature = function (jsonData) {
    //console.log("aus der Funktion", jsonData);
    L.geoJson(jsonData, {
        filter: function (feature) {
            return feature.properties.LT;
        },
        pointToLayer: function (feature, latlng) {
            let color = getColor(feature.properties.LT, COLORS.temperature);
            return L.marker(latlng, {
                title: `${feature.properties.name} (${feature.geometry.coordinates[2]}m)`,
                icon: L.divIcon({
                    html: `<div class="label-temperature" style="background-color:${color}">${feature.properties.LT.toFixed(1)}</div>`,
                    className: "ignore-me" // dirty hack
                })
            })
        }
    }).addTo(overlay.temperature);
};

// 1. neues overlay definieren, zu L.control.layers hinzufügen und default anzeigen
// 2. die Funktion drawWind als 1:1 Kopie von drawTemperature mit Anpassungen (in km/h)
// 3. einen neuen Stil .label-wind im CSS von main.css
// 4. die Funktion drawWind in data:loaded aufrufen

let drawWind = function (jsonData) {
    //console.log("aus der Funktion", jsonData);
    L.geoJson(jsonData, {
        filter: function (feature) {
            return feature.properties.WG;
        },
        pointToLayer: function (feature, latlng) {
            let kmh = Math.round(feature.properties.WG / 1000 * 3600);
            let color = getColor(kmh, COLORS.wind);
            let rotation = feature.properties.WR;
            return L.marker(latlng, {
                title: `${feature.properties.name} (${feature.geometry.coordinates[2]}m) - ${kmh} km/h`,
                icon: L.divIcon({
                    html: `<div class="label-wind"><i class="fas fa-arrow-circle-up" style="color:${color};transform: rotate(${rotation}deg)"></i></div>`,
                    className: "ignore-me" // dirty hack
                })
            })
        }
    }).addTo(overlay.wind);
};

let drawSnow = function (jsonData) {
    console.log("aus der Funktion", jsonData);
    L.geoJson(jsonData, {
        filter: function (feature) {
            return feature.properties.HS;
        },
        pointToLayer: function (feature, latlng) {
            let color = getColor(feature.properties.HS, COLORS.snow);
            return L.marker(latlng, {
                title: `${feature.properties.name} (${feature.geometry.coordinates[2]} m)`,
                icon: L.divIcon({
                    html: `<div class ="label-snow" style="background-color:${color}">${feature.properties.HS.toFixed(1)}</div>`,
                    className: "ignore-me" //dirty hack
                })
            })
        }
    }).addTo(overlay.snow);
};



aws.on("data:loaded", function () {
    //console.log(aws.toGeoJSON());
    drawTemperature(aws.toGeoJSON());
    drawWind(aws.toGeoJSON());
    drawSnow(aws.toGeoJSON());
    map.fitBounds(overlay.stations.getBounds());

    overlay.wind.addTo(map);

    //console.log(COLORS);
});

let rainviewer = L.control.rainviewer({
    position: 'bottomleft',
    nextButtonText: '>',
    playStopButtonText: 'Start/Stop',
    prevButtonText: '<',
    positionSliderLabelText: "Time:",
    opacitySliderLabelText: "Opacity:",
    animationInterval: 500,
    opacity: 0.5
});
rainviewer.addTo(map);