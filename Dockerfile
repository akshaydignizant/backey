# Use Node base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Build the TypeScript code
RUN npm run build

# Run Prisma generate (if needed)
RUN npx prisma generate

# Expose the port your app runs on
EXPOSE 3000

# Command to run the app
CMD ["npm", "run", "start"]
