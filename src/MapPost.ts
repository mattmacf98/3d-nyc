import { Loader } from "@googlemaps/js-api-loader";
import { Doc } from "../convex/_generated/dataModel";

export class MapPost {
    private static MAPS_LOADER = new Loader({
        apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
        version: "alpha"
    });
    private _postDoc: Doc<"posts">;
    private _onClickCallback: (text: string, photoId?: string, relatedUrl?: string, tag?: string) => void;
    private _marker: any;

    constructor(postDoc: Doc<"posts">, onClickCallback: (text: string, photoId?: string, relatedUrl?: string, tag?: string) => void) {
        this._postDoc = postDoc;
        this._onClickCallback = onClickCallback;
    }

    get postDoc(): Doc<"posts"> {
        return this._postDoc;
    }

    public lat() {
        return this._postDoc.lat;
    }

    public lng() {
        return this._postDoc.lng;
    }

    async generateMarker() {
        // @ts-ignore
        const {Marker3DInteractiveElement} = await MapPost.MAPS_LOADER.importLibrary("maps3d");
        this._marker = new Marker3DInteractiveElement({
            drawsWhenOccluded: true,
            position: {lat: this.lat(), lng: this.lng()},
            label: this._postDoc.text
        });
        
        this._marker.addEventListener('gmp-click', () => {
            this._onClickCallback(this._postDoc.text, this._postDoc.photoId, this._postDoc.relatedUrl, this._postDoc.tag);
        });

        return this._marker;
    }

    removeMapResources() {
       if (this._marker) {
            this._marker.remove();
            this._marker = undefined;
       }
    }
}