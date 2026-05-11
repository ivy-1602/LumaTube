# Base image
FROM node:20-slim

# Install ffmpeg and yt-dlp dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    unzip \
    && pip3 install yt-dlp --break-system-packages \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Deno
RUN curl -fsSL https://deno.land/install.sh | sh
ENV DENO_INSTALL="/root/.deno"
ENV PATH="${DENO_INSTALL}/bin:${PATH}"

# Download yt-dlp challenge solver (cached at build time)

# Set working directory
WORKDIR /app

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the project
COPY . .

# Create temp directory
RUN mkdir -p temp

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "server/index.js"]