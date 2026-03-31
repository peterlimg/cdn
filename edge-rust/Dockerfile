FROM rust:1.87-alpine AS builder
WORKDIR /app
RUN apk add --no-cache musl-dev
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN cargo build --release

FROM alpine:3.20
WORKDIR /app
RUN apk add --no-cache libgcc
COPY --from=builder /app/target/release/edge-rust /bin/edge-rust
ENV HOST=0.0.0.0
ENV PORT=4002
EXPOSE 4002
CMD ["/bin/edge-rust"]
