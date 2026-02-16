FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Bundle app source
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD [ "node", "server/server.js" ]
