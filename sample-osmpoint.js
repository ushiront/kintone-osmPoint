/*global ol*/
/*eslint-disable no-console*/

jQuery.noConflict();
(function($) {
    "use strict";

    // Set appId. Mobile API is browser application ID
    var appId = kintone.app.getId() ? kintone.app.getId() :
    Number(location.pathname.replace(/\/k\/m\//, "").split("/")[0]);
    var osmPosition = {
        // London city
        defLat: 51.507351,
        defLng: -0.127758,
        defZoom: 16
    };

    // Load to JavaScript file or css file
    var loadHeaderFiles = function(link, type) {

        var header = document.getElementsByTagName('head')[0];
        switch (type) {
            case "js":
                var objScript = document.createElement("script");
                objScript.type = "text/javascript";
                objScript.src = link;
                header.appendChild(objScript);
                break;
            case "css":
                var objLink = document.createElement("link");
                objLink.type = "text/css";
                objLink.rel = "stylesheet";
                objLink.href = link;
                header.appendChild(objLink);
                break;
        }
    };

    var onloadBlob = function(xhr) {
        xhr.onload = function() {
            if (xhr.status === 200) {
                // Create URL from blob
                var blob = xhr.response;
                var urlFile = window.URL || window.webkitURL;
                loadHeaderFiles(urlFile.createObjectURL(blob), "css");
            }
        };
    };

    var loadRegistCSS = function() {
        var url = kintone.api.url('/k/v1/app/customize', true) + '?app=' + appId;
        kintone.api(url, 'GET', {}, function(resp) {
            for (var i = 0; i < resp.desktop.css.length; i++) {
                switch (resp.desktop.css[i].type) {
                    case "URL":
                        loadHeaderFiles(resp.desktop.css[i].url, "css");
                        break;
                    case "FILE":
                        var urlKey = kintone.api.url('/k/v1/file', true) +
                        '?fileKey=' + resp.desktop.css[i].file.fileKey;
                        var xhr = new XMLHttpRequest();
                        xhr.open('GET', urlKey, true);
                        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                        // IE,FF
                        xhr.responseType = "blob";
                        xhr.send();

                        // load blob
                        onloadBlob(xhr);
                }
            }
        }, function(error) {
            console.log(error);
        });
    };
    loadRegistCSS();

    var setTitle = function(event) {
        if (!event.type.match(/^mobile./)) {
            if (kintone.app.record.getFieldElement("Title") === "undefined") { return; }
            if (kintone.app.record.getFieldElement("Creator") === "undefined") { return; }
            if (kintone.app.record.getFieldElement("Created_datetime") === "undefined") { return; }
        }
        event.record["Title"]["value"] = kintone.getLoginUser()["name"] +
        " [" + moment().format('YYYY/MM/DD(ddd) HH:mm:ss') + "]";
    };

    var hideGroupFields = function(event) {
        if (event.type.match(/^mobile./)) {
            kintone.mobile.app.record.setFieldShown("Lat", false);
            kintone.mobile.app.record.setFieldShown("Lng", false);
        } else {
            if (kintone.app.record.getFieldElement("Lat") === "undefined") { return; }
            if (kintone.app.record.getFieldElement("Lng") === "undefined") { return; }
            if (kintone.app.record.getFieldElement("Title") === "undefined") { return; }
            if (kintone.app.record.getFieldElement("Address") === "undefined") { return; }

            kintone.app.record.setFieldShown("Lat", false);
            kintone.app.record.setFieldShown("Lng", false);
        }
        event.record["Title"]["disabled"] = true;
        event.record["Address"]["disabled"] = true;
    };

    // show map
    var showMap = function(event, lat, lng) {

        var space;
        if (event.type.match(/^mobile./)) {
            space = kintone.mobile.app.getHeaderSpaceElement();
        } else {
            space = kintone.app.record.getSpaceElement('Space');
        }
        $(space).append('<div id="map" style="width:400px; height:400px"></div>');

        if (!lat || !lng) {
            lat = osmPosition.defLat;
            lng = osmPosition.defLng;
        }

        // OpenStreetMap and OpenLayers
        var map = new ol.Map({
            target: 'map',
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM()
                })
            ],
            view: new ol.View({
                center: ol.proj.fromLonLat([lng, lat]),
                zoom: osmPosition.defZoom
            })
        });

        // Append Overlay
        var pos = ol.proj.transform([lng, lat], 'EPSG:4326', 'EPSG:3857');
        // Marker pin
        var imgElement = document.createElement('img');
        var imgSrc = 'data:image/png;base64,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';
        imgElement.setAttribute('src', imgSrc);

        var marker = new ol.Overlay({
            position: pos,
            element: imgElement,
            stopEvent: false,
            positioning: 'center-center'
        });
        map.addOverlay(marker);

        // Text label
        if (event.record["Address"]["value"]) {
            var txtElement = document.createElement('div');
            var textNode = document.createElement('span');
            txtElement.setAttribute('class', 'pinText');
            textNode = document.createTextNode(event.record["Title"]["value"] ? event.record["Title"]["value"] : "");
            txtElement.appendChild(textNode);
            var vienna = new ol.Overlay({
                position: pos,
                element: txtElement
            });
            map.addOverlay(vienna);
        }
    };

    var eventShow = [
        "app.record.detail.show",
        "app.record.create.show",
        "app.record.edit.show",
        "mobile.app.record.detail.show",
        "mobile.app.record.create.show",
        "mobile.app.record.edit.show"
    ];
    kintone.events.on(eventShow, function(event) {
        var lat = event.record["Lat"]["value"] ? Number(event.record["Lat"]["value"]) : null;
        var lng = event.record["Lng"]["value"] ? Number(event.record["Lng"]["value"]) : null;
        showMap(event, lat, lng);
        hideGroupFields(event);
        return event;
    });

    if ($('.spinner-map').length === 0) {
        // create spnner element and id
        var divSpinner = $('<div id ="spinner-map" class="spinner-map"></div>');

        // body append to spinner element
        $('body').append(divSpinner);
    }

    var eventSubmit = [
        "app.record.create.submit",
        "mobile.app.record.create.submit"
    ];
    kintone.events.on(eventSubmit, function(event) {

        var spinner = new Spinner().spin(document.getElementById('spinner-map'));
        $('.spinner-map').show();

        hideGroupFields(event);
        setTitle(event);
        // kintone promise
        return new kintone.Promise(function(resolve, reject) {
            // geolocation API
            navigator.geolocation.getCurrentPosition(function(position) {

                event.record["Lat"]["value"] = position.coords.latitude.toFixed(7);
                event.record["Lng"]["value"] = position.coords.longitude.toFixed(7);

                var url = "https://nominatim.openstreetmap.org/reverse?format=json";
                url += "&lat=" + event.record["Lat"]["value"];
                url += "&lon=" + event.record["Lng"]["value"];

                // Get address by Re-Geocording
                kintone.proxy(url, 'GET', {}, {}).then(function(args) {
                    var resp = JSON.parse(args[0]);
                    var respValue = {
                        state: resp.address.state ? resp.address.state : "",
                        city: resp.address.city ? resp.address.city : "",
                        traffic_signals: resp.address.traffic_signals ? resp.address.traffic_signals : "",
                        country: resp.address.country ? resp.address.country : ""
                    };
                    event.record["Address"]["value"] =
                    respValue.state + respValue.city + respValue.traffic_signals + "(" + respValue.country + ")";

                    resolve(event);
                    spinner.spin();
                }, function(error) {
                    console.log(error);

                    reject(event);
                    spinner.spin();
                });

            }, function(error) {
                switch (error.code) {
                    case 1:
                        event.error = "Permission denied";
                        break;
                    case 2:
                        event.error = "Position unavailable";
                        break;
                    case 3:
                        event.error = "Timeout";
                        break;
                    default:
                        event.error = "Nouse API";
                }
                reject(event);
                spinner.spin();
            });
        });
    });

})(jQuery);
