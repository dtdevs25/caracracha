# Build Stage for Frontend
FROM node:20-alpine as frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Build Stage for Backend
FROM node:20-alpine as backend-build
WORKDIR /server
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm install
COPY server/ .
RUN npx prisma generate
RUN npm run build

# Production Stage
FROM node:20-alpine
WORKDIR /app

# Install Nginx, OpenSSL and compatibility libraries
RUN apk add --no-cache nginx openssl libc6-compat

# Copy frontend build
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# Copy backend
COPY --from=backend-build /server /app/server
WORKDIR /app/server

# Nginx config for SPA
RUN printf 'server {\n\
    listen 80;\n\
    location / {\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    try_files $uri $uri/ /index.html;\n\
    }\n\
    location /api {\n\
    proxy_pass http://localhost:3001;\n\
    }\n\
    }\n' > /etc/nginx/http.d/default.conf

# Install PM2 to run both Nginx and Node
RUN npm install -g pm2

EXPOSE 80

CMD nginx && pm2-runtime start dist/index.js
