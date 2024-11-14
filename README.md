# Try it out

The Best way to try it out is to go to the live app at  [nyc3d-front-end-acdc497c2b32.herokuapp.com](https://nyc3d-front-end-acdc497c2b32.herokuapp.com/). To enable the AI Summarization feature, you will need to add use Chrome built in AI https://developer.chrome.com/docs/ai/built-in

# Running locally

To run the app locally, you will need to have convex set up and node.js installed. Then be sure to run 
```npm install```

Then you must configure your VITE_CONVEX_URL and VITE_GOOGLE_MAPS_API_KEY environment variables. Run 
```npx convex dev``` to set up your convex environment. 

To populate your database, you can run the populate.py script in the root directory. This will read the posts.json file and add each post to the database.

Once your backend is running, you can run the following command to start the frontend:
```npm run dev```

`