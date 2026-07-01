FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./

ENV NODE_ENV=development
RUN npm ci --production=false --include=dev --no-audit --no-fund

COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
