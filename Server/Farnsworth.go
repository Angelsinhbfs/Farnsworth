package main

import (
	"Farnsworth/Server/db"
	"context"
	"github.com/joho/godotenv"
	"log"
	"os"
)

var DBClient *db.MongoClient
var CTX context.Context
var ExpectedUser string
var ExpectedKey string
var DBConnected bool
var DevelopmentCORS bool

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Printf("Error loading .env file")
	}
	ExpectedUser = os.Getenv("EXPECTED_USER")
	ExpectedKey = os.Getenv("EXPECTED_KEY")
	if ExpectedUser == "" || ExpectedKey == "" {
		log.Fatal("Credentials not set in env")
	}
	mongoURI := os.Getenv("MONGODB_URI")
	dbName := os.Getenv("MONGODB_DB_NAME")
	DevelopmentCORS = os.Getenv("DevCORS") == "true"
	log.Printf("Development CORS enabled: %v", DevelopmentCORS)
	if mongoURI == "" || dbName == "" {
		log.Print("MongoDB connection information not set in env. Client will not load. Limited functionality")

	} else {
		DBClient, err = db.NewMongoClient(mongoURI, dbName)
		if err != nil {
			log.Print("DB not connected. Bad Login. Error connecting to database:", err)
			DBConnected = false
		} else {
			DBConnected = true
		}
	}

	Route()
}
