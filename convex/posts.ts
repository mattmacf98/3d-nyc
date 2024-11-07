import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { encodeBase32 } from 'geohashing';
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

export const createPostInternal = internalMutation({
    args: { text: v.string(), lat: v.float64(), lng: v.float64(), altitude: v.float64(), geoHash: v.string(), 
      embedding: v.array(v.float64()), photoId: v.optional(v.string()), relatedUrl: v.optional(v.string()), tag: v.optional(v.string())},
    handler: async (ctx, args) => {
    
      const newPostId = await ctx.db.insert("posts", {
          text: args.text,
          lat: args.lat,
          lng: args.lng,
          altitude: args.altitude,
          geoHash: args.geoHash,
          embedding: args.embedding,
          photoId: args.photoId,
          relatedUrl: args.relatedUrl,
          tag: args.tag
      });
      return newPostId;
    },
});

export const createPost = action({
    args: { text: v.string(), lat: v.float64(), lng: v.float64(), altitude: v.float64(), 
      photoId: v.optional(v.string()), relatedUrl: v.optional(v.string()), tag: v.optional(v.string()) },
    handler: async (ctx, args) => {
      const geohash = encodeBase32(args.lat, args.lng);

      const embedding = await getEmbedding(args.text);

      const newPostId: Id<"posts"> = await ctx.runMutation(internal.posts.createPostInternal, {
          text: args.text,
          lat: args.lat,
          lng: args.lng,
          altitude: args.altitude,
          geoHash: geohash,
          embedding: embedding,
          photoId: args.photoId,
          relatedUrl: args.relatedUrl,
          tag: args.tag
      });
      
      return newPostId;
    },
  });

  export const getPostsInternal = internalQuery({
    args: {ids: v.array(v.id("posts"))},
    handler: async (ctx, args) => {
        const results = [];
        for (const id of args.ids) {
            const doc = await ctx.db.get(id);
            if (doc == null) {
                continue;
            }
            results.push(doc);
        }
        return results;
    }
  })

  export const searchPosts = action({
    args: {
        text: v.string()
    },
    handler: async (ctx, args) => {
        const embedding = await getEmbedding(args.text);

        const results = await ctx.vectorSearch("posts", "by_embedding", {
            vector: embedding,
            limit: 30
        });


        const posts: Array<Doc<"posts">> = await ctx.runQuery(internal.posts.getPostsInternal, {ids: results.map((result) => result._id)});
        
        return {posts, scores: results.map(r => r._score)};
    }
  });

  export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  });

  export const generateDownloadUrl = query({
    args: {photoId: v.string()},
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.photoId);
    }
  });

  const getEmbedding = async (text: string): Promise<number[]> => {
    const response = await fetch(
        "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer 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`,
                "Content-Type": "application/json",
                "x-use-cache": "false"
            },
            body: JSON.stringify({inputs: [text]}),
        }
      );
      const result = await response.json();

      return result[0] as number[];
  }