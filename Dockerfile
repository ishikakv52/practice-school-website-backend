# --- Base image ---
# Use a specific Node LTS version (not "latest") so builds are reproducible.
FROM node:20-alpine

# Create and use a working directory inside the container
WORKDIR /app

# Copy only the dependency files first — Docker caches this layer, so
# `npm install` only re-runs when package.json/package-lock.json actually
# change, not on every code edit. Speeds up rebuilds a lot.
COPY package.json package-lock.json ./

# Install dependencies. --omit=dev skips devDependencies (e.g. nodemon)
# since we don't need them to run in production.
RUN npm install --omit=dev

# Now copy the rest of the application code
COPY . .

# Run as a non-root user for security (the node:alpine image already
# includes a "node" user).
USER node

# Document which port the app listens on. This doesn't publish the port —
# that happens with `-p` when running the container — it's metadata.
EXPOSE 5000

# Start the server the same way `npm start` does.
CMD ["node", "server.js"]