

##  file
- **key #** offline mode - download map tiles
- **key \*** jump between markers
- **key Backspace** close: Menu,measure distance,info panel

## import/export

you have the possibility to import gpx and geojson. Markers can also be exported as geojson so that you can e.g. share them or edit them in another program.
it is also possible to connect the app to your openstreetmap account to load gpx files from there.

## custom maps and layer

you have the possibility to use your own maps/layers.
For this you have to create a JSON file with the following structure:

```javascript
[
  {
    name: "Hiking",
    type: "overlayer",
    url: "http://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png",
    attribution: "hiking.waymarkedtrails.org",
    maxzoom: 18,
  },

  {
    name: "Google Satelite",
    type: "map",
    url: "http://mt0.google.com/vt/lyrs=r&hl=en&x={x}&y={y}&z={z}",
    attribution: "Google",
    maxzoom: 18,
  },

  {
    name: "climbing",
    type: "overpass",
    url: "sport=climbing",
    attribution: "Overpass",
    maxzoom: 18,
  },

  {
    name: "water",
    type: "overpass",
    url: "amenity=drinking_water",
    attribution: "Overpass",
    maxzoom: 18,
  },
];
```

you can also add an overpass layer, https://taginfo.openstreetmap.org/ you add the tags in the key url.

you can find an example file here: [omap_maps.json](omap_maps.json)

### Good to know

Some layers cannot be loaded because KaiOs has not equipped all devices with a valid Let's Encrypt certificate. If your device is rooted you can do it yourself:
https://github.com/openGiraffes/b2g-certificates

If you use the tiles intentisv cache, the app can slow down from around 400mb. The solution is to delete the cache via the app menu.

## Desktop Version

https://strukturart.github.io/o.map/

## How to install

- KaiOS Store
- Sideloading <a href="https://www.martinkaptein.com/blog/sideloading-and-deploying-apps-to-kai-os/">step-by-step article</a> by martinkaptein

### Thank you

- Openstreetmap
- OpenTopoMap
- https://openrouteservice.org/
- https://www.rainviewer.com/api.html
- https://github.com/MazeMap/Leaflet.TileLayer.PouchDBCached
- leaflet.js

### LICENSES

This software (except KaiAds) is open source and licensed under the MIT License. View the source code.
OpenStreetMap is a trademark of the OpenStreetMap Foundation. o.map is not endorsed by or affiliated with the OpenStreetMap Foundation.

- o.map [UNLICENSE](UNLICENSE)
- Leaflet - BSD-2-Clause License
- leaflet.tilelayer.pouchdbcached MIT license
- OpenStreetMap®
- Overpass [Affero GPL](https://github.com/drolbr/Overpass-API/blob/master/COPYING)

### Privacy Policy

This software uses KaiAds. This is a third party service that may collect information used to identify you. Pricacy policy of KaiAds.

### other map apps for KaiOs

https://wiki.openstreetmap.org/wiki/KaiOS

## Donation

If you use the app often, please donate an amount to me.
<br>

<table class="border-0"> 
  <tr class="border-0" >
    <td valign="top" class="border-0">
        <div>
            <a href="https://paypal.me/strukturart?locale.x=de_DE" target="_blank">
                <img src="/images/paypal.png" width="120px">
            </a>
        </div>
    </td>
    <td valign="top" class="border-0">
        <div>
            <div>Bitcoin</div>
            <img src="/images/bitcoin_rcv.png" width="120px">
        </div>
    </td>
  </tr>
 </table>
