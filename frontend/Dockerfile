FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
RUN if test -f package-lock.json; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
