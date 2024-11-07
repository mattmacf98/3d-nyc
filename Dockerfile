# Use the official Node.js image.
FROM node:18-alpine

# Set the working directory in the container.
WORKDIR /app

# Copy package.json and package-lock.json.
COPY package*.json ./

# Install dependencies.
RUN npm install

# Copy the rest of the application code.
COPY . .

# Build the Vite app.
RUN npm run build

# Install serve to serve the built app.
RUN npm install -g serve

# Expose the port the app runs on.
EXPOSE 3000

# Command to run the app.
CMD ["serve", "-s", "dist"]