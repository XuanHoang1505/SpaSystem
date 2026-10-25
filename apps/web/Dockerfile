FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
RUN npm ci --workspace @spa/web --workspace @spa/api-client --workspace @spa/shared-types --workspace @spa/shared-config --include-workspace-root
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN test -n "$VITE_API_BASE_URL" && npm run web:build

FROM nginx:stable-alpine AS final
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80
