FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npx esbuild server/index.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist-server/index.cjs

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
RUN echo '{"type":"commonjs"}' > /app/dist-server/package.json
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "dist-server/index.cjs"]
