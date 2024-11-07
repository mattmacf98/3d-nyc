import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    posts: defineTable({
      text: v.string(),
      lat: v.float64(),
      lng: v.float64(),
      altitude: v.float64(),
      geoHash: v.string(),
      embedding: v.array(v.float64()),
      photoId: v.optional(v.string()),
      relatedUrl: v.optional(v.string()),
      tag: v.optional(v.string())
    }).vectorIndex("by_embedding", {
        vectorField: "embedding",
        dimensions: 384
    }),
  });