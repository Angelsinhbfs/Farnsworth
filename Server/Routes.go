package main

import (
	"log"
	"net/http"
)

func Route() {
	mux := http.NewServeMux()
	mux.HandleFunc("/upload/", enableCORS(CheckToken(UploadZipHandler)))
	mux.HandleFunc("/dir/", enableCORS(CheckToken(ListDirectoriesHandler)))
	mux.HandleFunc("/media/", enableCORS(CheckToken(ServeMediaHandler)))
	mux.HandleFunc("/delete/", enableCORS(CheckToken(DeleteHandler)))
	mux.HandleFunc("/login/", enableCORS(BasicAuth(HandleLogin)))
	mux.HandleFunc("/ffmpeg/", ServeFFMPEGHandler)
	mux.HandleFunc("/", enableCORS(HandleRoot))

	log.Print("Listening on 8080")

	http.ListenAndServe(":8080", mux)
}
