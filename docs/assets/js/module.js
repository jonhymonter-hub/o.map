const module = (() => {
  if (navigator.getBattery) {
    let battery_memory = 1;
    navigator.getBattery().then(function (battery) {
      battery.addEventListener("levelchange", function () {
        if (battery_memory < battery.level) return false;
        if (battery.level <= 0.2 && status.tracking_running) {
          module.pushLocalNotification(
            "battery is weak",
            "",
            "/assets/image/battery.png"
          );

          battery_memory = battery.level;
        }
      });
    });
  }

  let uniqueId =
    Date.now().toString(36) + Math.random().toString(36).substring(2);

  let pushLocalNotification = function (title, text, icon) {
    window.Notification.requestPermission().then((result) => {
      const options = {
        body: text,
        icon: icon,
      };

      var notification = new window.Notification(title, options);

      notification.onerror = function (err) {};
      notification.onclick = function (event) {
        if (window.navigator.mozApps) {
          var request = window.navigator.mozApps.getSelf();
          request.onsuccess = function () {
            if (request.result) {
              notification.close();
              request.result.launch();
            }
          };
        } else {
          window.open(document.location.origin, "_blank");
        }
      };
      notification.onshow = function () {
        // notification.close();
      };
    });
  };

  let link_to_marker = function (url) {
    let url_split = url.split("/");
    current_lat = url_split[url_split.length - 2];
    current_lng = url_split[url_split.length - 1];

    //remove !numbers
    current_lat = current_lat.replace(/[A-Za-z?=&]+/gi, "");
    current_lng = current_lng.replace(/[A-Za-z?=&]+/gi, "");
    mainmarker.current_lat = Number(current_lat);
    mainmarker.current_lng = Number(current_lng);

    map.setView([current_lat, current_lng], 14);
    L.marker([mainmarker.current_lat, mainmarker.current_lng]).addTo(
      markers_group
    );
  };

  let sunrise = function (lat, lng) {
    //get sunset
    //https://github.com/mourner/suncalc
    //sunset
    let times = SunCalc.getTimes(new Date(), lat, lng);
    let sunrise = times.sunrise.getHours() + ":" + times.sunrise.getMinutes();
    let sunset = times.sunset.getHours() + ":" + times.sunrise.getMinutes();

    let result = {
      sunrise: sunrise,
      sunset: sunset,
    };
    return result;
  };

  var colors = ["blue", "green", "yellow", "red", "black"];

  let hotline = (data) => {
    // Clear the existing polylines from the group
    hotline_group.clearLayers();

    // Find the minimum and maximum elevations in the data
    const minElevation = Math.min(...data.map((coord) => coord.alt));
    const maxElevation = Math.max(...data.map((coord) => coord.alt));

    // Loop through the coordinates using forEach
    data.forEach(function (coord, index, array) {
      if (index < array.length - 1) {
        var segmentCoords = [
          [coord.lat, coord.lng],
          [array[index + 1].lat, array[index + 1].lng],
        ];

        var altitude = coord.alt;

        // Calculate the percentage of elevation within the range
        const elevationPercent =
          (altitude - minElevation) / (maxElevation - minElevation);

        // Interpolate color based on elevation percentage using Chroma.js
        const color = chroma.scale(colors).mode("lab")(elevationPercent).hex();

        L.polyline(segmentCoords, { color: color }).addTo(hotline_group);
      }
    });
    setTimeout(() => {
      hotline_group.bringToFront();
    }, 1000);
  };

  //parse gpx

  let parseGPX = function (gpxData) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxData, "text/xml");
    const waypoints = xmlDoc.querySelectorAll("trkpt");

    const latLngAltData = [];

    waypoints.forEach(function (waypoint) {
      const lat = parseFloat(waypoint.getAttribute("lat"));
      const lng = parseFloat(waypoint.getAttribute("lon"));
      const ele = parseFloat(waypoint.querySelector("ele").textContent);

      latLngAltData.push({ lat: lat, lng: lng, alt: ele });
    });

    return latLngAltData;
  };
  /////////////////////////
  /////Load GPX///////////
  ///////////////////////
  function loadGPX(filename, url, move_to = true) {
    if (url) {
      new L.GPX(url, {
        async: true,
        marker_options: {
          startIconUrl: "/assets/css/images/start.png",
          endIconUrl: "/assets/css/images/end.png",
        },
      })
        .on("loaded", function (e) {
          map.fitBounds(e.target.getBounds());
        })
        .addTo(gpx_group);

      if (move_to) {
        document.querySelector("div#finder").style.display = "none";
        status.windowOpen = "map";
      }
    }

    if (filename) {
      try {
        let sdcard = navigator.getDeviceStorage("sdcard");
        let request = sdcard.get(filename);
        request.onsuccess = function () {
          m(this.result);
        };
        request.onerror = function (error) {
          alert(error);
        };
      } catch (e) {}

      if ("b2g" in navigator) {
        try {
          let sdcard = navigator.b2g.getDeviceStorage("sdcard");
          let request = sdcard.get(filename);
          request.onsuccess = function () {
            m(this.result);
          };
          request.onerror = function (error) {
            alert(error);
          };
        } catch (e) {}
      }

      let m = (r) => {
        let reader = new FileReader();

        reader.onerror = function (event) {
          helper.toaster("can't read file", 3000);
          reader.abort();
        };

        reader.onloadend = function (event) {
          var gpx = reader.result;

          new L.GPX(gpx, {
            async: true,
            marker_options: {
              startIconUrl: "/assets/css/images/start.png",
              endIconUrl: "/assets/css/images/end.png",
            },
          })
            .on("loaded", function (e) {
              map.fitBounds(e.target.getBounds());
              helper.side_toaster("select GPX path with key 6", 4000);
            })
            .addTo(gpx_group);

          if (move_to) {
            document.querySelector("div#finder").style.display = "none";
            status.windowOpen = "map";
          }
        };

        reader.readAsText(r);
      };
    }
  }

  function loadGPX_data(filename, callback) {
    if (filename) {
      try {
        let sdcard = navigator.getDeviceStorage("sdcard");
        let request = sdcard.get(filename);
        request.onsuccess = function () {
          let reader = new FileReader();

          reader.onerror = function (event) {
            helper.toaster("can't read file", 3000);
            reader.abort();
          };

          reader.onloadend = function (event) {
            callback(filename, event.target.result);
          };

          reader.readAsText(this.result);
        };
        request.onerror = function () {};
      } catch (e) {}

      try {
        if ("b2g" in navigator) {
          try {
            let sdcard = navigator.b2g.getDeviceStorage("sdcard");
            let request = sdcard.get(filename);
            request.onsuccess = function () {
              let reader = new FileReader();

              reader.onerror = function (event) {
                helper.toaster("can't read file", 3000);
                reader.abort();
              };

              reader.onloadend = function (event) {
                callback(filename, event.target.result);
              };

              reader.readAsText(this.result);
            };
            request.onerror = function () {};
          } catch (e) {}
        }
      } catch (e) {}
    }
  }

  /////////////////////////
  /////Load GeoJSON///////////
  ///////////////////////
  let loadGeoJSON = function (filename, callback, move_to = true) {
    //file reader
    try {
      let sdcard = navigator.getDeviceStorage("sdcard");
      let request = sdcard.get(filename);
      request.onsuccess = function () {
        m(this.result);
      };
      request.onerror = function () {
        helper.side_toaster("file not found", 3000);
      };
    } catch (e) {}

    if ("b2g" in window.navigator) {
      try {
        let sdcard = navigator.b2g.getDeviceStorage("sdcard");
        let request = sdcard.get(filename);
        request.onsuccess = function () {
          m(this.result);
        };
        request.onerror = function (e) {
          helper.side_toaster(e + "error", 3000);
        };
      } catch (e) {}
    }

    let m = (r) => {
      let geojson_data = "";
      let reader = new FileReader();

      reader.onerror = function (event) {
        reader.abort();
      };

      reader.onloadend = function () {
        //check if json valid
        try {
          geojson_data = JSON.parse(reader.result);
        } catch (e) {
          helper.toaster("JSON is not valid", 2000);
          return false;
        }

        //if valid add layer
        //to do if geojson is marker add to  marker_array[]
        //https://blog.codecentric.de/2018/06/leaflet-geojson-daten/
        L.geoJSON(geojson_data, {
          style: function (feature) {
            // Default values if not defined in the GeoJSON file
            var color = "black"; // Default line color
            var weight = 0.5; // Default line width

            // Check if the style properties are defined in the GeoJSON
            if (feature.properties.stroke) {
              color = feature.properties.stroke; // Use "stroke" property for line color
            }

            if (feature.properties["stroke-width"]) {
              weight = feature.properties["stroke-width"];
            }

            return {
              color: color, // Line color
              weight: weight, // Line width
            };
          },

          onEachFeature: function (feature) {
            if (feature.geometry != null) {
              let p = feature.geometry.coordinates[0];
              try {
                map.flyTo([p[1], p[0]]);
              } catch (e) {}
            }
            //routing data
            if (feature.properties.segments != undefined) {
              if (feature.properties.segments[0].steps) {
                callback(geojson_data, true);
              }
            }
          },

          // Marker Icon
          pointToLayer: function (feature, latlng) {
            let t = L.marker(latlng);
            if (feature.properties.hasOwnProperty("popup")) {
              t.bindPopup(feature.properties.popup, module.popup_option);
            }

            if (feature.properties.hasOwnProperty("description")) {
              t.bindPopup(feature.properties.description, module.popup_option);
            }

            t.addTo(markers_group);
            map.flyTo(latlng);
          },

          // Popup
        }).addTo(geoJSON_group);
        if (move_to) {
          document.querySelector("div#finder").style.display = "none";
          status.windowOpen = "map";
        }
      };

      reader.readAsText(r);
    };
  };

  ///////////////////
  //select marker
  ////////////////////
  // Flag to keep track of the need
  // of generating the new marker list
  let markers_updated = function () {
    marker_list_updated = false;
  };

  let index = -1;
  let select_marker = function () {
    index++;
    let markers_collection = []; //makers in map boundingbox

    // Reset contained list
    overpass_group.eachLayer(function (l) {
      // Check if the layer is a marker
      if (l instanceof L.Marker && markers_collection.indexOf(l) === -1) {
        markers_collection.push(l);
      }
    });

    markers_group.eachLayer(function (l) {
      // Check if the layer is a marker and not already in markers_collection
      if (l instanceof L.Marker && markers_collection.indexOf(l) === -1) {
        markers_collection.push(l);
      }
    });

    selected_polyline_markers_group.eachLayer(function (l) {
      // Check if the layer is a marker and not already in markers_collection
      if (l instanceof L.Marker && markers_collection.indexOf(l) === -1) {
        markers_collection.push(l);
      }
    });

    status.marker_selection = true;
    status.windowOpen = "marker";

    if (index >= markers_collection.length) index = 0;

    status.selected_marker = markers_collection[index];
    helper.bottom_bar("cancel", "option", "");

    //show selected marker
    //show/hide popop editor input field
    if (markers_collection[index].tag == undefined) {
      document.querySelector("#popup-editor").style.display = "block";
    } else {
      document.querySelector("#popup-editor").style.display = "none";
    }

    //get latlng
    map.setView(markers_collection[index].getLatLng());

    let marker_latlng = markers_collection[index].getLatLng();

    //popup
    document.querySelector("input#popup").value = "";
    let pu = markers_collection[index].getPopup();

    if (pu != undefined && pu._content != undefined) {
      //get popup content
      document.querySelector("input#popup").value = pu._content;
      //show popup

      setTimeout(function () {
        markers_collection[index]
          .bindPopup(pu._content, popup_option)
          .openPopup();
      }, 1000);
      //close popup
      setTimeout(function () {
        markers_collection[index].closePopup();
      }, 5000);
    }
    return markers_collection[index];
  };

  let index_polyline = -1;
  let select_polyline = function () {
    index_polyline++;
    let polyline_collection = [];

    overpass_group.eachLayer(function (l) {
      if (l instanceof L.Polyline) {
        // Check if the polyline has valid latlng coordinates
        var latlngs = l.getLatLngs();
        if (latlngs.length > 0 && latlngs[0] instanceof L.LatLng) {
          // Add the polyline to the collection
          polyline_collection.push(l);
        }
      }
    });

    markers_group.eachLayer(function (l) {
      if (l instanceof L.Polyline) {
        // Check if the polyline has valid latlng coordinates
        var latlngs = l.getLatLngs();
        if (latlngs.length > 0 && latlngs[0] instanceof L.LatLng) {
          // Add the polyline to the collection
          polyline_collection.push(l);
        }
      }
    });

    if (index_polyline >= polyline_collection.length) index_polyline = 0;
    let hh = polyline_collection[index_polyline];
    selected_polyline_markers_group.clearLayers();

    //show selected marker
    try {
      let pu = polyline_collection[index_polyline].getPopup();

      if (pu != undefined && pu._content != undefined) {
        //get popup content
        document.querySelector("input#popup").value = pu._content;
        //show popup

        polyline_collection[index_polyline].openPopup();
        //close popup
        setTimeout(function () {
          polyline_collection[index_polyline].closePopup();
        }, 5000);
      }

      map.setView(polyline_collection[index_polyline].getCenter());

      // console.log(polyline_collection[index_polyline].markers);
      /*
      hh.getLatLngs().forEach((e) => {
        L.marker(e)
          .addTo(selected_polyline_markers_group)
          .setIcon(maps.public_transport);
      });*/

      polyline_collection[index_polyline].markers.forEach((e) => {
        L.marker(e.latlng)
          .addTo(selected_polyline_markers_group)
          .setIcon(maps.public_transport);
      });
    } catch (e) {}

    return polyline_collection[index];
  };

  //remove GPX
  let remove_gpx = function () {
    let i = 0;
    gpx_group.eachLayer(function (l) {
      i++;
      if (i == gpx_selection_count + 1) {
        gpx_group.removeLayer(l);
        helper.side_toaster("path removed", 2000);
        status.windowOpen = "map";
        document.querySelector("div#finder").style.display = "none";
      }
    });
  };

  //SELECT GPX

  let gpx_selection_count = 0;
  let gpx_selection = [];
  let select_gpx = function () {
    gpx_selection = [];

    gpx_selection_count++;

    gpx_group.eachLayer(function (l) {
      if (l.getBounds()) gpx_selection.push(l);
    });

    if (gpx_selection.length == 0) {
      helper.side_toaster("no gpx file to select", 2000);
      return false;
    }

    if (gpx_selection_count > gpx_selection.length - 1) gpx_selection_count = 0;
    map.fitBounds(gpx_selection[gpx_selection_count].getBounds());
    let m = gpx_selection[gpx_selection_count].getLayers();

    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(
      gpx_selection[gpx_selection_count]._gpx,
      "text/xml"
    );

    var eleElements = xmlDoc.getElementsByTagName("ele");

    let altitudes = [];
    for (var i = 0; i < eleElements.length; i++) {
      var currentElement = eleElements[i];
      altitudes.push(currentElement.textContent);
    }

    const { gain, loss } = calculateGainAndLoss(altitudes);

    console.log(gain, loss);

    const keys = Object.keys(m[0]._layers);
    const firstKey = keys[0];
    general.gpx_selection_latlng = m[0]._layers[firstKey]._latlngs;

    //store info in object
    gpx_selection_info.duration =
      gpx_selection[gpx_selection_count]._info.duration.total;
    gpx_selection_info.elevation_gain = gain;

    gpx_selection_info.elevation_loss = loss;

    gpx_selection_info.distance =
      gpx_selection[gpx_selection_count]._info.length;

    gpx_selection_info.name = gpx_selection[gpx_selection_count]._info.name;
    update_gpx_info();
    status.select_gpx = true;
  };

  let update_gpx_info = function () {
    document.getElementById("gpx-name").innerText = gpx_selection_info.name;
    document.getElementById("gpx-time").innerText = format_ms(
      gpx_selection_info.duration
    );

    document.querySelector("#gpx-evo-up span").innerText =
      gpx_selection_info.elevation_gain.toFixed(2);

    document.querySelector("#gpx-evo-down span").innerText =
      gpx_selection_info.elevation_loss.toFixed(2);

    let n = gpx_selection_info.distance / 1000;
    n = n.toFixed(2);
    document.getElementById("gpx-distance").innerText = n;
    gpx_string = gpx_selection[gpx_selection_count]._gpx;
  };

  let closest_average = [];
  //closest point in route/track
  let get_closest_point = function (route) {
    if (!mainmarker.device_lat) return false;

    let m = L.polyline(route);

    let latlng = [mainmarker.device_lat, mainmarker.device_lng];

    let k = L.GeometryUtil.closest(map, m, latlng, true);

    let f = calc_distance(
      mainmarker.device_lat,
      mainmarker.device_lng,
      k.lat,
      k.lng,
      "km"
    );

    document.querySelector("#distance-to-track").innerText = f / 1000;
    //notification
    // Check if the main marker's accuracy is below 22
    if (mainmarker.accuracy < 22) {
      // Add the current value of f to the closest_average array
      closest_average.push(f);
    }

    // Calculate the average of the closest_average array if it has more than 48 elements
    if (closest_average.length > 48) {
      let sum = closest_average.reduce((acc, cur) => acc + cur);
      let result = sum / 40;

      // Reset the closest_average array and sum if it has more than 50 elements
      if (closest_average.length > 50) {
        closest_average.length = 0;
        sum = 0;
        result = 0;
      }

      // If the routing_notification setting is off, exit early
      if (setting.routing_notification == false) {
        return false;
      }

      // If the average is above 0.5, trigger a vibration and show a toaster message
      if (result > 0.5) {
        try {
          module.pushLocalNotification(
            "O.map",
            "Attention you have left the path"
          );
        } catch (e) {}
      }
    }
  };

  let format_ms = function (millisec) {
    var seconds = (millisec / 1000).toFixed(0);
    var minutes = Math.floor(seconds / 60);
    var hours = "";
    if (minutes > 59) {
      hours = Math.floor(minutes / 60);
      hours = hours >= 10 ? hours : "0" + hours;
      minutes = minutes - hours * 60;
      minutes = minutes >= 10 ? minutes : "0" + minutes;
    }

    seconds = Math.floor(seconds % 60);
    seconds = seconds >= 10 ? seconds : "0" + seconds;
    if (hours != "") {
      return hours + ":" + minutes + ":" + seconds;
    }
    return minutes + ":" + seconds;
  };

  let format_s = function (seconds) {
    let nhours = Math.floor(seconds / 3600);
    let nminutes = Math.floor((seconds % 3600) / 60);
    let nseconds = Math.floor(seconds % 60);
    if (nhours == 0) {
      return nminutes + ":" + nseconds;
    }
    return nhours + ":" + nminutes + ":" + nseconds;
  };

  //calc distance between markers
  let calc_distance = function (from_lat, from_lng, to_lat, to_lng, unit) {
    if (
      to_lat == undefined ||
      to_lng == undefined ||
      from_lat == undefined ||
      from_lng == undefined
    )
      return false;

    let d = map.distance([from_lat, from_lng], [to_lat, to_lng]);
    if (unit == "mil") {
      d = d * 3.28084;
    }

    d = Math.ceil(d);

    return d;
  };

  let calcDistance = function (polyline) {
    let dis = L.GeometryUtil.length(polyline);

    if (general.measurement_unit == "km") {
      dis = dis / 1000;
    }
    if (general.measurement_unit == "mil") {
      dis = dis / 1000;
      dis = dis / 1.60934;
    }
    return dis;
  };

  //convert degree to direction
  let compass = function (degree) {
    let a = "N";
    if (degree == 0 || degree == 360) a = "North";
    if (degree > 0 && degree < 90) a = "NorthEast";
    if (degree == 90) a = "East";
    if (degree > 90 && degree < 180) a = "SouthEast";
    if (degree == 180) a = "South";
    if (degree > 180 && degree < 270) a = "SouthWest";
    if (degree == 270) a = "West";
    if (degree > 270 && degree < 360) a = "NorthWest";
    return a;
  };

  /////////////////////
  ////PATH & TRACKING
  ///////////////////

  //calc gain & loss
  function calculateGainAndLoss(altitudes) {
    let gain = 0;
    let loss = 0;

    const highestAltitude = Math.max(...altitudes);
    const lowestAltitude = Math.min(...altitudes);

    gain = highestAltitude - altitudes[0];
    loss = altitudes[0] - lowestAltitude;

    return { gain, loss };
  }

  //json to gpx
  let toGPX = function () {
    let e = tracking_group.toGeoJSON();
    e.features[0].properties.software = "o.map";
    e.features[0].properties.timestamp = tracking_timestamp;

    let option = { featureCoordTimes: "timestamp", creator: "o.map" };

    return togpx(e, option);
  };

  function isDivisible(number, divisor) {
    return number % divisor === 0;
  }

  //tool to measure distance

  let popup_option = {
    closeButton: false,
    maxWidth: 200,
    maxHeight: 200,
  };

  let path_option = {
    color: "red",
    step: 0,
  };

  let distances = [];
  let latlngs = [];
  let tracking_latlngs = [];
  let tracking_interval;
  let tracking_cache = [];
  //let gps_lock;
  let tracking_altitude = [];
  let tracking = { duration: "" };
  let polyline = L.polyline(latlngs, path_option).addTo(measure_group_path);
  let polyline_tracking = L.polyline(tracking_latlngs, path_option).addTo(
    tracking_group
  );

  let update_tracking_view = () => {
    document.querySelector("#tracking-view .duration div").innerText =
      tracking.duration;

    document.querySelector("#tracking-view .distance div").innerText =
      tracking.distance;

    document.querySelector("#tracking-view .gain div").innerText = isNaN(
      tracking.gain
    )
      ? "-"
      : tracking.gain.toFixed(2);

    document.querySelector("#tracking-view .loss div").innerText = isNaN(
      tracking.loss
    )
      ? "-"
      : tracking.loss.toFixed(2);

    document.querySelector("#tracking-view .altitude div").innerText = isNaN(
      tracking.altitude
    )
      ? "-"
      : tracking.altitude;

    document.querySelector("#tracking-view .average-speed div").innerText =
      isNaN(tracking.speed_average) ? "-" : tracking.speed_average;

    document.querySelector("#tracking-evo-down span").innerText =
      tracking.loss.toFixed(2);
    document.querySelector("#tracking-evo-up span").innerText =
      tracking.gain.toFixed(2);
    document.getElementById("tracking-altitude").innerText =
      tracking.altitude.toFixed(2);

    document.querySelector("#tracking-speed-average-time").innerText = isNaN(
      tracking.speed_average
    )
      ? "-"
      : tracking.speed_average;

    document.querySelector("div#tracking-distance").innerText =
      tracking.distance;
  };

  const measure_distance = function (action) {
    if (action == "destroy") {
      status.path_selection = false;
      measure_group_path.clearLayers();
      measure_group.clearLayers();
      geoJSON_group.clearLayers();
      distances = [];

      polyline = L.polyline(latlngs, path_option).addTo(measure_group_path);
      calc = 0;
      return true;
    }

    if (action == "destroy_tracking") {
      clearInterval(tracking_interval);

      try {
        localStorage.removeItem("tracking_cache");
      } catch (e) {
        console.log(e);
      }

      tracking_timestamp = [];
      tracking_altitude = [];
      document.getElementById("tracking-altitude").innerText = "";
      document.querySelector("div#tracking-distance").innerText = "";
      document.querySelector("div#tracking-evo-up span").innerText = "";
      document.querySelector("div#tracking-evo-down span").innerText = "";
      document.querySelector("div#tracking-moving-time span").innerText = "";
      document.querySelector("div#tracking-speed-average-time").innerText = "";
      distances = [];

      tracking_group.clearLayers();
      hotline_group.clearLayers();

      polyline_tracking = L.polyline(tracking_latlngs, path_option).addTo(
        tracking_group
      );
      status.tracking_running = false;
      status.running = false;
      status.live_track = false;

      helper.side_toaster("tracking stopped", 2000);
      return true;
    }

    if (action == "tracking") {
      status.tracking_running = true;

      if (setting.tracking_screenlock) helper.wakeLock("lock", "screen");

      if (localStorage.getItem("tracking_cache") !== null) {
        if (
          window.confirm(
            "looks like a tracking was aborted without saving it, would you like to continue?"
          )
        ) {
          let f = JSON.parse(localStorage.getItem("tracking_cache"));
          f.forEach((e) => {
            tracking_cache.push(e);
          });

          //restore path
          tracking_altitude = [];
          tracking_timestamp = [];
          tracking_latlngs = [];

          for (let i = 0; i < tracking_cache.length; i++) {
            polyline_tracking.addLatLng([
              tracking_cache[i].lat,
              tracking_cache[i].lng,
              tracking_cache[i].alt,
            ]);

            //tracking_timestamp.push(tracking_cache[i].timestamp);
            //tracking_altitude.push(tracking_cache[i].alt);
          }
        } else {
          localStorage.removeItem("tracking_cache");
          tracking_cache = [];
          tracking_altitude = [];
          tracking_timestamp = [];
        }
      }
      let lastIntegerPart = 0;
      tracking_interval = setInterval(function () {
        // Only record data if accuracy is good
        if (mainmarker.accuracy > 10000) return false;

        // Only record data if device has moved
        if (general.positionHasChanged == false) return false;

        //store time
        let ts = new Date();
        // tracking_timestamp.push(ts.toISOString());
        // Store altitude
        let alt = null;

        if (mainmarker.device_alt && !isNaN(mainmarker.device_alt)) {
          alt = mainmarker.device_alt;
        }

        polyline_tracking.addLatLng([
          mainmarker.device_lat,
          mainmarker.device_lng,
          alt,
        ]);

        tracking_cache.push({
          lat: mainmarker.device_lat,
          lng: mainmarker.device_lng,
          alt: alt,
          timestamp: ts.toISOString(),
        });

        // Update the view with tracking data

        if (tracking_cache.length > 2) {
          // Save tracking data to local storage

          localStorage.setItem(
            "tracking_cache",
            JSON.stringify(tracking_cache)
          );

          try {
            if (setting.hotline_view) hotline(tracking_cache);
          } catch (e) {
            console.log(e);
          }

          // Extract altitudes from the LatLng objects and filter out null values
          tracking_altitude = tracking_cache
            .map((latlng) => latlng.alt)
            .filter((altitude) => altitude !== null && altitude != "");

          // Extract time from the LatLng objects and filter out null values
          tracking_timestamp = tracking_cache
            .map((latlng) => latlng.timestamp)
            .filter((timestamp) => timestamp !== null && timestamp !== "");

          // Now you can use the filtered tracking_altitude array in the calculateGainAndLoss function
          const { gain, loss } = calculateGainAndLoss(tracking_altitude);

          //get tracking data to display in view
          new L.GPX(toGPX(), { async: true }).on("loaded", function (e) {
            //meter

            if (general.measurement_unit == "km") {
              // Calculate the distance along the polyline
              let a = calcDistance(polyline_tracking);
              tracking.distance = a.toFixed(2) + general.measurement_unit;

              //gain
              let b = gain;
              tracking.gain = gain;

              //loss
              let c = loss;
              tracking.loss = loss;
              //alt

              tracking.altitude = mainmarker.device_alt;

              //speed
              let d = e.target.get_moving_speed();
              document.querySelector("#tracking-speed-average-time").innerText =
                tracking.speed_average = d.toFixed(2);
            }
            //miles
            if (general.measurement_unit == "mil") {
              // Calculate the distance along the polyline
              let a = calcDistance(polyline_tracking);
              tracking.distance = a.toFixed(2) + general.measurement_unit;

              //gain
              let b = gain;
              b = b * 3.280839895;
              tracking.gain = b.toFixed(2);

              //loss
              let c = loss;
              c = c * 3.280839895;
              tracking.loss = c.toFixed(2);

              //alt
              tracking.altitude = mainmarker.device_alt * 3.280839895;

              //speed
              let d = e.target.get_moving_speed_imp();
              tracking.speed_average = d.toFixed(2);
            }

            document.querySelector("#tracking-moving-time span").innerText =
              format_ms(e.target.get_total_time());
            tracking.duration = format_ms(e.target.get_total_time());

            //tracking notification
            //distance

            if (setting.tracking_notification_distance > 0) {
              // if (calcDistance(polyline_tracking) < 1) return false;

              const distance = Math.floor(calcDistance(polyline_tracking));
              // Check if the integer part has changed or if the interval missed an integer
              //let distance = k++;
              //distance = Math.floor(distance);
              if (
                isDivisible(
                  distance,
                  Number(setting.tracking_notification_distance)
                ) &&
                distance !== lastIntegerPart
              ) {
                // If the integer part has changed or the interval missed an integer
                // Trigger the notification
                module.pushLocalNotification(
                  "o.map",
                  "o.map distance " + tracking.distance
                );
                // Update the last seen integer part
                lastIntegerPart = distance;
              }
            }

            //time
            if (setting.tracking_notification_time > 0) {
              if (
                isDivisible(
                  Math.round(e.target.get_total_time() / 1000),
                  setting.tracking_notification_time * 60
                )
              ) {
                module.pushLocalNotification(
                  "o.map",
                  "o.map duration " + tracking.duration
                );
              }
            }
          });
        }
        //Upload gpx file every 5min, unfortunately the update function doesn't work, so I have to combine create/delete
        if (status.live_track) {
          if (status.live_track_file_created == false) {
            const currentDate = new Date();
            const isoString = currentDate.toISOString();
            const a = isoString.substring(0, 10);

            osm.osm_server_upload_gpx("live_track.gpx-" + a, toGPX(), false);
            status.live_track_file_created = true;
          } else {
            let calc_dif =
              new Date().getTime() / 1000 - status.tracking_backupup_at;
            //backup every 5min
            if (calc_dif > 300) {
              status.live_track_id.forEach((e, i) => {
                if (i != status.live_track_id.length)
                  osm.osm_delete_gpx(e, false);
              });

              osm.osm_server_upload_gpx("live_track.gpx-" + a, toGPX(), false);

              status.tracking_backupup_at = new Date().getTime() / 1000;
            }
          }
        }

        update_tracking_view();

        // Stop tracking if mainmarker.tracking is false
        if (status.tracking_running == false) {
          clearInterval(tracking_interval);
          if (setting.tracking_screenlock)
            helper.screenWakeLock("unlock", "screen");
        }
      }, 10000);
    }

    if (action == "addMarker") {
      status.path_selection = true;
      L.marker([mainmarker.current_lat, mainmarker.current_lng])
        .addTo(measure_group)
        .setIcon(maps.select_icon);

      let l = measure_group.getLayers();

      polyline.addLatLng([mainmarker.current_lat, mainmarker.current_lng]);

      geoJSON_group.addLayer(measure_group);
      geoJSON_group.addLayer(polyline);

      if (l.length < 2) return false;
      let dis = calc_distance(
        l[l.length - 1]._latlng.lat,
        l[l.length - 1]._latlng.lng,
        l[l.length - 2]._latlng.lat,
        l[l.length - 2]._latlng.lng
      );

      distances.push(dis);
      let calc = 0;

      for (let i = 0; i < distances.length; i++) {
        calc += distances[i];
      }
      calc = calc / 1000;
      calc.toFixed(2);
      parseFloat(calc);

      l[l.length - 1]
        .bindPopup(
          calc.toString() + " " + general.measurement_unit,
          popup_option
        )
        .openPopup();
    }
  };

  let user_input = function (param, file_name, label) {
    if (param == "open") {
      document.getElementById("user-input-description").innerText = label;

      document.querySelector("div#user-input").style.bottom = "25px";
      document.querySelector("div#user-input input").focus();
      document.querySelector("div#user-input input").value = file_name;
      status.windowOpen = "user-input";
    }
    if (param == "close") {
      document.querySelector("div#user-input").style.bottom = "-1000px";
      document.querySelector("div#user-input input").blur();
      status.windowOpen = "map";
      helper.bottom_bar("", "", "");
    }

    if (param == "return") {
      let input_value = document.querySelector("div#user-input input").value;
      document.querySelector("div#user-input").style.bottom = "-1000px";
      document.querySelector("div#user-input input").blur();
      helper.bottom_bar("", "", "");

      return input_value;
    }
  };

  //when the default value is always meter
  //setting.measurement == true = metric
  let convert_units = function (unit, value) {
    //metric
    let a;
    if (unit == "kilometer" && setting.measurement == true) {
      a = value / 1000;
    }

    if (unit == "meter" && setting.measurement == true) {
      a = value;
    }

    //imperial

    if (unit == "meter" && setting.measurement == false) {
      a = value * 3.280839895;
    }

    if (unit == "kilometer" && setting.measurement == false) {
      a = value * 0.6213711922;
    }
    return a.toFixed(2);
  };

  return {
    hotline,
    convert_units,
    markers_updated,
    select_marker,
    select_gpx,
    select_polyline,
    calc_distance,
    compass,
    measure_distance,
    link_to_marker,
    popup_option,
    loadGeoJSON,
    loadGPX,
    sunrise,
    loadGPX_data,
    user_input,
    format_ms,
    format_s,
    remove_gpx,
    get_closest_point,
    pushLocalNotification,
    uniqueId,
    parseGPX,
    update_gpx_info,
  };
})();
