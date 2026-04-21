# Dockerfile
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- produzione ----
FROM nginx:alpine

# rimuove config default nginx
RUN rm -rf /usr/share/nginx/html/*

# copia l'output browser del build Angular
COPY --from=build /app/dist/PlanimetriaEditor/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
