FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG VITE_API_URL=/api
ARG VITE_DEVICE_MANAGER_URL
ARG VITE_MQTT_BROKER
ARG VITE_MQTT_PORT=8883

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DEVICE_MANAGER_URL=$VITE_DEVICE_MANAGER_URL
ENV VITE_MQTT_BROKER=$VITE_MQTT_BROKER
ENV VITE_MQTT_PORT=$VITE_MQTT_PORT

RUN npm run build


FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
