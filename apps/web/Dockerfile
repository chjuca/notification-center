FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter web...

COPY apps/web apps/web
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter web build
RUN pnpm --filter web deploy --prod --legacy /out

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/web/next.config.ts ./
COPY --from=build /repo/apps/web/.next ./.next

USER node
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]
