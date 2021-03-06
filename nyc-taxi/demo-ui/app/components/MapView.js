import 'leaflet-providers'
import '!style!css!../../node_modules/leaflet/dist/leaflet.css'
import React, {Component} from 'react'
import leaflet from 'leaflet'
import Mask from './Mask'
import destinationMarker from '../images/destination-marker.svg'
import originMarker from '../images/origin-marker.svg'
import styles from './MapView.css'

const ORIGIN_MARKER = leaflet.icon({
  iconUrl: originMarker,
  iconSize: [100, 100],
  iconAnchor: [50, 100]
})

const DEST_MARKER = leaflet.icon({
  iconUrl: destinationMarker,
  iconSize: [100, 100],
  iconAnchor: [50, 100]
})

const rmap = L.tileLayer.wms("http://localhost:8080/geoserver/nurc/wms", { //change this
    layers: 'nurc:nyc_kde', //change this
    format: 'image/png',
    transparent: true,
    version: '1.1.0',
    opacity: 0.5,
    crs: L.CRS.EPSG4326,
    tileSize: 512
})

const rmapdrop = L.tileLayer.wms("http://localhost:8080/geoserver/nurc/wms", { //change this
    layers: 'nurc:nyc_kde_drop', //change this
    format: 'image/png',
    transparent: true,
    version: '1.1.0',
    opacity: 0.5,
    crs: L.CRS.EPSG4326,
    tileSize: 512
})

const vmap = L.tileLayer.wms("http://localhost:8080/geoserver/nurc/wms", { //change this
    layers: 'nurc:nyctlcpoint', //change this
    format: 'image/png',
    transparent: true,
    version: '1.1.0'
});

const vmapdrop = L.tileLayer.wms("http://localhost:8080/geoserver/nurc/wms", { //change this
    layers: 'nurc:nyctlcdropoffpoint', //change this
    format: 'image/png',
    transparent: true,
    version: '1.1.0'
});

var layers = L.layerGroup();

export default class MapView extends Component {
  constructor() {
    super()
    this.state = {hideBoroughs: false}
    this._setInfoVisible = this._setInfoVisible.bind(this)
    this.markers = {origin: null, destination: null, line: null}
    this._located = this._located.bind(this)
    this._originChanged = this._originChanged.bind(this)
    this._destinationChanged = this._destinationChanged.bind(this)
    this._updateLinePosition = this._updateLinePosition.bind(this)
    this._neighborhoodClicked = this._neighborhoodClicked.bind(this)
    this._onButtonClick = this._onButtonClick.bind(this)
    this._onButtonClick3 = this._onButtonClick3.bind(this)
    this._onButtonClick2 = this._onButtonClick2.bind(this)
    this._onButtonClick4 = this._onButtonClick4.bind(this)
    this._onButtonClick5 = this._onButtonClick5.bind(this)

  }

  componentDidUpdate() {
    this._updateMarkers()
  }

  componentDidMount() {
    this._initializeMap()
    this._fetchNeighborhoodOverlays()
    this._attachMarkers()    
    this.map.on('locationfound', this._located)
    this._getLayers()
    // this.map.locate()
  }

  render() {
    return (
      <div>
        <div className={styles.root2}>
          <li><button onClick={this._onButtonClick2} className={styles.button}>Pickup Point Data</button></li>
          <li><button onClick={this._onButtonClick3} className={styles.button}>Dropoff Point Data</button></li>
          <li><button onClick={this._onButtonClick} className={styles.button}>Pickup Heatmap</button></li>
          <li><button onClick={this._onButtonClick5} className={styles.button}>Dropoff Heatmap</button></li>
          <li><button onClick={this._onButtonClick4} className={styles.button}>Toggle Peripherals</button></li>

        </div>
        
        <div className={`${styles.root} ${this.state.hideBoroughs? styles.hideBoroughs : ""}`}>
          <div ref="container" className={styles.map}/>
          <Mask className={styles.mask} visible={!this.props.origin}>
            <div className={styles.locatingMessage}>
              <h2>Where are you anyway?</h2>
              Please wait while we find your location...
            </div>
          </Mask>
        </div>
     </div>
     )
  }

  //
  // Internal API
  //

  _attachMarkers() {
    const {origin, destination} = this.props
    this.markers.origin = leaflet.marker(origin, {icon: ORIGIN_MARKER, draggable: true})
      .addTo(this.map)
      .on('drag', this._updateLinePosition)
      .on('dragend', this._originChanged)
    this.markers.destination = leaflet.marker(destination, {icon: DEST_MARKER, draggable: true})
      .addTo(this.map)
      .on('drag', this._updateLinePosition)
      .on('dragend', this._destinationChanged)
    this.markers.line = leaflet.polyline([origin, destination], {className: styles.flightPath})
      .addTo(this.map)
  }

  _fetchNeighborhoodOverlays() {
    
    fetch('/nyc-taxi/shapes/neighborhoods.geojson')
      .then(response => response.json())
      .then(geojson => {
        leaflet.geoJson(geojson, {
          onEachFeature: (_, layer) => layer.on('click', this._neighborhoodClicked),
          style(feature) {
            switch (feature.properties.borough) {
              case 'Manhattan': return {className: styles.manhattan}
              case 'Bronx': return {className: styles.bronx}
              case 'Brooklyn': return {className: styles.brooklyn}
              case 'Queens': return {className: styles.queens}
              case 'Staten Island': return {className: styles.statenIsland}
            }
          }
        })
        .addTo(this.map)
        this.markers.line.bringToFront()
      })


  }
  
  _onButtonClick() {

    if(this.map.hasLayer(rmap)){
      this.map.removeLayer(rmap)
      this.setState({hideBoroughs: !this.state.hideBoroughs})
    }
    else if(this.map.hasLayer(rmapdrop)){
      this.map.removeLayer(rmap)
      this._loadRasterMap()
    }
    else{
      this._loadRasterMap()
      this.setState({hideBoroughs: !this.state.hideBoroughs})

  }
}


  _onButtonClick2() {
    var has = this.map.hasLayer(vmap)
    if (has){
      this.map.removeLayer(vmap)
    }
    else if(this.map.hasLayer(vmapdrop)){
      this.map.removeLayer(vmapdrop)
      this._loadVectorMap()
    }
    else{
    this._loadVectorMap()
  }
}

  _onButtonClick3() {
    var has = this.map.hasLayer(vmapdrop)
    if (has){
      this.map.removeLayer(vmapdrop)
    }
    else if(this.map.hasLayer(vmap)){
      this.map.removeLayer(vmap)
      this._loadVectorMapDrop()
    }
    else{
    this._loadVectorMapDrop()
  }
}


  _onButtonClick4() {
    if(this.map.hasLayer(this.markers.origin)){
      this.map.removeLayer(this.markers.origin)
      this.map.removeLayer(this.markers.destination)
      this.map.removeLayer(this.markers.line)
  }
    else{
      this.map.addLayer(this.markers.origin)
      this.map.addLayer(this.markers.destination)
      this.map.addLayer(this.markers.line)
  }
    this._setInfoVisible()
}

  _onButtonClick5() {
    if(this.map.hasLayer(rmapdrop)){
      this.map.removeLayer(rmapdrop)
      this.setState({hideBoroughs: !this.state.hideBoroughs})
    }
    else if(this.map.hasLayer(rmap)){
      this.map.removeLayer(rmapdrop)
      this._loadRasterMapDrop()
    }
    else{
      this._loadRasterMapDrop()
      this.setState({hideBoroughs: !this.state.hideBoroughs})

  }
}

  _loadVectorMap(){
    this._getLayers()
    vmap.addTo(this.map)
    layers.addLayer(vmap)

  }

  _loadVectorMapDrop(){
    this._getLayers()
    vmapdrop.addTo(this.map)
    layers.addLayer(vmapdrop)

  }

  _loadRasterMap(){

    rmap.addTo(this.map)
    layers.addLayer(rmap)
  }

  _loadRasterMapDrop(){

    rmapdrop.addTo(this.map)
    layers.addLayer(rmapdrop)
  }

  _getLayers(){
    this.map.eachLayer(function(layer) {
        layers.addLayer(layer) 
  });
  }



  _initializeMap() {
    this.map = leaflet.map(this.refs.container, {
      center: [40.747777160820704, -73.9482879638672],
      zoom: 12,
      layers: [
        leaflet.tileLayer.provider('Stamen.TonerLite')
      ],
      maxBounds: [
        [41.10005163093046, -74.5147705078125],
        [40.31513750307456, -73.37493896484374]
       ],
      minZoom: 11
    })
    this.map.attributionControl.addAttribution(`Neighborhoods from <a href="http://catalog.opendata.city/organization/pediacities">CivicDashboards</a>`)
    window.map = this.map
    window.L = leaflet
  }

  _updateMarkers() {
    const {origin, destination} = this.props
    this.markers.origin.setLatLng(origin)
    this.markers.destination.setLatLng(destination)
    this.markers.line.setLatLngs([origin, destination])
  }

  //
  // Events
  //

  _destinationChanged(event) {
    const {lat, lng} = event.target.getLatLng()
    this.props.destinationChanged({lat, lng})
  }

  _located({latlng: {lat, lng}}) {
    this.props.originChanged({lat, lng})
  }

  _neighborhoodClicked({latlng: {lat, lng}}) {
    this.props.destinationChanged({lat, lng})
  }

  _originChanged(event) {
    const {lat, lng} = event.target.getLatLng()
    this.props.originChanged({lat, lng})
  }

  _setInfoVisible(){
    this.props.setInfoVisible()
  }

  _updateLinePosition() {
    const {origin, destination, line} = this.markers
    line.setLatLngs([origin.getLatLng(), destination.getLatLng()])
  }
}

MapView.propTypes = {
  className: React.PropTypes.string,
  destination: React.PropTypes.object,
  origin: React.PropTypes.object,
  destinationChanged: React.PropTypes.func,
  originChanged: React.PropTypes.func,
  setInfoVisible: React.PropTypes.func
}
