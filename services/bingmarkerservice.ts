﻿import { Injectable, NgZone } from "@angular/core";
import { Observer } from "rxjs/Observer";
import { Observable } from "rxjs/Observable";
import { ILatLong } from "../interfaces/ilatlong";
import { IMarkerOptions } from "../interfaces/imarkeroptions";
import { IPoint } from "../interfaces/ipoint";
import { MapMarker } from "../components/mapmarker";
import { MarkerService } from "../services/markerservice";
import { MapService } from "../services/mapservice";
import { LayerService } from "../services/layerservice";
import { ClusterService } from "../services/clusterservice";
import { Marker } from "../models/marker";
import { BingMapService } from "./bingmapservice";
import { BingConversions } from "./bingconversions";

@Injectable()
export class BingMarkerService implements MarkerService {

    private _markers: Map<MapMarker, Promise<Marker>> = new Map<MapMarker, Promise<Marker>>();

    constructor(private _mapService: MapService, private _layerService: LayerService, private _clusterService: ClusterService, private _zone: NgZone) { }

    public AddMarker(marker: MapMarker) {
        let o: IMarkerOptions = {
            position: { latitude: marker.Latitude, longitude: marker.Longitude },
            title: marker.Title,
            label: marker.Label,
            draggable: marker.Draggable,
            icon: marker.IconUrl,
            iconInfo: marker.IconInfo
        };
        if (marker.Width) o.width = marker.Width;
        if (marker.Height) o.height = marker.Height;
        if (marker.Anchor) o.anchor = marker.Anchor;
        if (marker.Metadata) o.metadata = marker.Metadata;

        // create marker via promise.
        let markerPromise: Promise<Marker> = null;
        if(marker.InClusterLayer) markerPromise = this._clusterService.CreateMarker(marker.LayerId, o);
        else if(marker.InCustomLayer) markerPromise = this._layerService.CreateMarker(marker.LayerId, o);
        else markerPromise = this._mapService.CreateMarker(o);

        this._markers.set(marker, markerPromise);
        if (marker.IconInfo) markerPromise.then((m: Marker) => {
            // update iconInfo to provide hook to do post icon creation activities and
            // also re-anchor the marker 
            marker.DynamicMarkerCreated.emit(o.iconInfo);
            let p: IPoint = {
                x: (o.iconInfo.size && o.iconInfo.markerOffsetRatio) ? (o.iconInfo.size.width * o.iconInfo.markerOffsetRatio.x) : 0,
                y: (o.iconInfo.size && o.iconInfo.markerOffsetRatio) ? (o.iconInfo.size.height * o.iconInfo.markerOffsetRatio.y) : 0,
            }
            m.SetAnchor(p);
        });
    }

    public CreateEventObservable<T>(eventName: string, marker: MapMarker): Observable<T> {
        return Observable.create((observer: Observer<T>) => {
            this._markers.get(marker).then((m: Marker) => {
                m.AddListener(eventName, (e: T) => this._zone.run(() => observer.next(e)));
            });
        });
    }

    public DeleteMarker(marker: MapMarker): Promise<void> {
        const m = this._markers.get(marker);
        if (m == null) {
            return Promise.resolve();
        }
        return m.then((m: Marker) => {
            return this._zone.run(() => {
                m.DeleteMarker();
                this._markers.delete(marker);
            });
        });
    }

    public GetCoordinatesFromClick(e: MouseEvent| any): ILatLong {
        if (!e) return null;
        if (!e.primitive) return null;
        if (!(e.primitive instanceof Microsoft.Maps.Pushpin)) return null;
        let p: Microsoft.Maps.Pushpin = e.primitive;
        let loc: Microsoft.Maps.Location = p.getLocation();
        return { latitude: loc.latitude, longitude: loc.longitude };
    }

    public GetNativeMarker(marker: MapMarker): Promise<Marker> {
        return this._markers.get(marker);
    }

    public GetPixelsFromClick(e: MouseEvent| any): IPoint {
        let loc: ILatLong = this.GetCoordinatesFromClick(e);
        if (loc == null) return null;
        let l: Microsoft.Maps.Location = BingConversions.TranslateLocation(loc);
        let p: Microsoft.Maps.Point = <Microsoft.Maps.Point>(<BingMapService>this._mapService).MapInstance.tryLocationToPixel(l, Microsoft.Maps.PixelReference.control);
        if (p == null) return null;
        return { x: p.x, y: p.y };
    }

    public LocationToPoint(marker: MapMarker): Promise<IPoint> {
        return this._markers.get(marker).then((m: Marker) => {
            let l: ILatLong = m.Location;
            let p: Promise<IPoint> = this._mapService.LocationToPoint(l);
            return p;
        });
    }

    public UpdateAnchor(marker: MapMarker): Promise<void> {
        return this._markers.get(marker).then((m: Marker) => {
            m.SetAnchor(marker.Anchor);
        });
    }

    public UpdateMarkerPosition(marker: MapMarker): Promise<void> {
        return this._markers.get(marker).then(
            (m: Marker) => m.SetPosition({
                latitude: marker.Latitude,
                longitude: marker.Longitude
            }));
    }

    public UpdateTitle(marker: MapMarker): Promise<void> {
        return this._markers.get(marker).then((m: Marker) => m.SetTitle(marker.Title));
    }

    public UpdateLabel(marker: MapMarker): Promise<void> {
        return this._markers.get(marker).then((m: Marker) => { m.SetLabel(marker.Label); });
    }

    public UpdateDraggable(marker: MapMarker): Promise<void> {
        return this._markers.get(marker).then((m: Marker) => m.SetDraggable(marker.Draggable));
    }

    public UpdateIcon(marker: MapMarker): Promise<void> {
        return this._markers.get(marker).then((m: Marker) => {
            if (marker.IconInfo) {
                let x: IMarkerOptions = {
                    position: { latitude: marker.Latitude, longitude: marker.Longitude },
                    iconInfo: marker.IconInfo
                }
                let o: Microsoft.Maps.IPushpinOptions = BingConversions.TranslateMarkerOptions(x);
                m.SetIcon(o.icon);
                marker.DynamicMarkerCreated.emit(x.iconInfo);
            }
            else {
                m.SetIcon(marker.IconUrl)
            }

        });
    }

}