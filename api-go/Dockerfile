FROM golang:1.22.4-alpine AS builder
WORKDIR /app
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
RUN go build -o /bin/api-server ./cmd/server

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /bin/api-server /bin/api-server
ENV PORT=4001
EXPOSE 4001
CMD ["/bin/api-server"]
