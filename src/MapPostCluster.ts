import { getDistance } from 'geolib';
import { Loader } from "@googlemaps/js-api-loader"
import * as turf from '@turf/turf';
import { MapPost } from "./MapPost";

export class MapPostCluster {
    private static MAPS_LOADER = new Loader({
        apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
        version: "alpha"
    });

    private _posts: MapPost[];
    private _center: {lat: number, lng: number};
    private _polygon: any;

    constructor(initialPost: MapPost) {
        this._posts = [initialPost];
        this._center = {lat: initialPost.lat(), lng: initialPost.lng()}
    }

    get posts(): MapPost[] {
        return this._posts;
    }

    get center(): {lat: number, lng: number} {
        return this._center;
    }

    computeDistance(coord: {lat: number, lng: number}): number {
        return getDistance({latitude: coord.lat, longitude: coord.lng}, {latitude: this._center.lat, longitude: this._center.lng});
    }

    addPost(post: MapPost) {
        this._posts.push(post);
    }

    updateCenter() {
        const lats = this._posts.map(p => p.lat());
        const lngs = this._posts.map(p => p.lng());

        const avgLat = lats.reduce((sum, cur) => sum + cur, 0) / lats.length;
        const avgLng = lngs.reduce((sum, cur) => sum + cur, 0) / lngs.length;

        this._center = {lat: avgLat, lng: avgLng};
    }

    async generatePolygon() {
        // @ts-ignore
        const {Polygon3DElement} = await MapPostCluster.MAPS_LOADER.importLibrary("maps3d");

        this._polygon = undefined;
        if (this._posts.length >= 3) {
            const points = [];
            for (const post of this._posts) {
              points.push(turf.point([post.lng(), post.lat()]));
            }
    
            const polygon = turf.convex(turf.featureCollection(points));
    
            const polyPoints = polygon?.geometry.coordinates;
            if (polyPoints) {
                const polygonOptions = {
                  strokeColor: "#33cc33",
                  fillColor: "rgba(0, 0, 255, 0.4)",
                  strokeWidth: 4,
                  altitudeMode: "RELATIVE_TO_GROUND",
                  extruded: true,
                  drawsOccludedSegments: true,
                }
          
                this._polygon = new Polygon3DElement(polygonOptions);
                // turf is (lng,lat)
                const coords = polyPoints[0].map((pt) => {return {lat: pt[1], lng: pt[0], altitude: 0.5}});
                this._polygon.outerCoordinates = coords;
            }
        }
        return this._polygon;
    }

    removeMapResources() {
        if (this._polygon) {
            this._polygon.remove();
            this._polygon = undefined;
        }
        for (const post of this._posts) {
            post.removeMapResources();
        }
    }
}