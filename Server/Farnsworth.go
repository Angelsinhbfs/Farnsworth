package main

import (
	"Farnsworth/Server/db"
	"context"
	"fmt"
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
var Log *Logger

func main() {
	var err error
	Log, err = NewLogger("./logs/app.log", 500)
	if err != nil {
		fmt.Println("Error initializing logger:", err)
		return
	}
	err = godotenv.Load()
	if err != nil {
		Log.Info("Error loading .env file. This is normal for production server")
	}
	ExpectedUser = os.Getenv("EXPECTED_USER")
	ExpectedKey = os.Getenv("EXPECTED_KEY")
	if ExpectedUser == "" || ExpectedKey == "" {
		Log.Error("FATAL: Credentials not set in env")
		log.Fatal("Credentials not set in env")
	}
	mongoURI := os.Getenv("MONGODB_URI")
	dbName := os.Getenv("MONGODB_DB_NAME")
	DevelopmentCORS = os.Getenv("DevCORS") == "true"
	Log.Info(fmt.Sprintf("Development CORS enabled: %v", DevelopmentCORS))
	if mongoURI == "" || dbName == "" {
		Log.Error(fmt.Sprintf("MongoDB connection information not set in env. Client will not load. Limited functionality"))

	} else {
		DBClient, err = db.NewMongoClient(mongoURI, dbName)
		if err != nil {
			Log.Error(fmt.Sprintf("DB not connected. Bad Login. Error connecting to database: %v", err))
			DBConnected = false
		} else {
			DBConnected = true
		}
	}

	Route()
}
