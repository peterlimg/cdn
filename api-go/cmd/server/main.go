package main

import (
	"log"
	"net/http"
	"os"

	httpapi "cdn-demo/api-go/internal/http"
	"cdn-demo/api-go/internal/state"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "4001"
	}
	addr := ":" + port

	store := state.NewStore()
	server := httpapi.NewServer(store)
	mux := http.NewServeMux()
	server.Register(mux)
	log.Printf("go control API listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
