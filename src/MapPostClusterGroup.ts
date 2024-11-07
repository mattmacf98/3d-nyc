import { MapPost } from "./MapPost";
import { MapPostCluster } from "./MapPostCluster";

export class MapPostClusterGroup {
    private _postClusters: MapPostCluster[];

    constructor() {
        this._postClusters = [];
    }

    get postClusters(): MapPostCluster[] {
        return this._postClusters;
    }

    addPost(post: MapPost) {
        let clusterToAddTo: MapPostCluster | null = null;
        let minDist = Infinity;
        for (const cluster of this._postClusters) {
          const dist = cluster.computeDistance({lat: post.lat(), lng: post.lng()})
          if (dist < 1000 && dist < minDist) {
            minDist = dist;
            clusterToAddTo = cluster;
          }
        }
        if (clusterToAddTo !== null) {
          clusterToAddTo.addPost(post);
        } else {
          this._postClusters.push(new MapPostCluster(post))
        }
    }

    async generatePolygons() {
        const polygons = [];
        for (const cluster of this._postClusters) {
            const polygon = await cluster.generatePolygon();
            if (polygon) {
                polygons.push(polygon);
            }
        }
        return polygons;
    }

    removeMapResources() {
      for (const cluster of this._postClusters) {
          cluster.removeMapResources();
      }
  }
}