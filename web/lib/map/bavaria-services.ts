export const BAVARIA_BOUNDS: [number, number, number, number] = [8.9451, 47.2484, 13.9089, 50.5799];

export const BAVARIA_SERVICES = {
  basemap: {
    id: "bavaria-basemap",
    tiles: ["https://wmtsod1.bayernwolke.de/wmts/by_webkarte_grau/smerc/{z}/{x}/{y}"],
    attribution: "Bayerische Vermessungsverwaltung, GeoBasis-DE / BKG",
    minzoom: 5,
    maxzoom: 19,
  },
  tennet: {
    id: "tennet-grid",
    tiles: ["https://geowms.tennet.eu/server/services/open/Leitungsnetz/MapServer/WMSServer?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&CRS=EPSG:3857&WIDTH=256&HEIGHT=256&LAYERS=Leitungen%2CUW-Standorte&BBOX={bbox-epsg-3857}"],
    attribution: "TenneT TSO GmbH",
    minzoom: 5,
    maxzoom: 18,
  },
} as const;
