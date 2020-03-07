FROM node:10

# Create app directory
WORKDIR /usr/src/sieve

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 3000 

ENTRYPOINT ["/go/bin/myapp"]
CMD [ "node", "app.js" ]
