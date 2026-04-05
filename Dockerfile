FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8')); if(p.dependencies && p.dependencies['@esbuild/linux-x64']) delete p.dependencies['@esbuild/linux-x64']; fs.writeFileSync('package.json', JSON.stringify(p, null, 2));" \
  && npm install --omit=dev --package-lock=false

COPY dist ./dist
COPY public ./public
COPY uploads ./uploads
COPY tmp ./tmp
COPY .htaccess ./

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "dist/index.cjs"]
