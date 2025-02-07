# Use Node.js as the base image
FROM node:18-bullseye

# Set the working directory
WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y wget unzip curl libstdc++6

# 🔹 Copy the Rhubarb executable from the local folder
COPY rhubarb /usr/local/bin/rhubarb-lip-sync

# 🔹 Grant execute permissions to Rhubarb
RUN chmod +x /usr/local/bin/rhubarb-lip-sync/rhubarb

# Copy the application files
COPY . .

# Install project dependencies
RUN npm install

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
