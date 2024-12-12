FROM node:16-alpine AS build-client

WORKDIR /app

COPY farnsworth-client/package*.json ./
RUN npm install

ARG BASE_URL
COPY farnsworth-client/ ./
RUN BASE_URL=${BASE_URL}
RUN npm run build

FROM golang:1.23.4-alpine AS build-server

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY Server/ ./Server
RUN go build -o farnsworth ./Server

FROM alpine:latest

WORKDIR /app

COPY --from=build-client /app/build ./client
COPY --from=build-server /app/farnsworth ./

EXPOSE 8080

CMD ["./farnsworth"]