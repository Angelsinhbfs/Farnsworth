package db

import (
	"context"
	"fmt"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoClient struct {
	client *mongo.Client
	dbName string
}

func NewMongoClient(uri, dbName string) (*MongoClient, error) {
	clientOptions := options.Client().ApplyURI(uri)
	client, err := mongo.Connect(context.Background(), clientOptions)
	if err != nil {
		return nil, err
	}

	return &MongoClient{
		client: client,
		dbName: dbName,
	}, nil
}

func (mc *MongoClient) AddVideo(ctx context.Context, entry interface{}) (interface{}, error) {
	collection := mc.client.Database("Media").Collection("video")
	entryBSON, err := bson.Marshal(entry)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal entry: %v", err)
	}
	result, err := collection.InsertOne(ctx, entryBSON)
	if err != nil {
		return nil, fmt.Errorf("failed to insert entry: %v", err)
	}
	return result.InsertedID, nil
}

func (mc *MongoClient) GetVideos(ctx context.Context) (interface{}, error) {
	collection := mc.client.Database("Media").Collection("video")
	filter := bson.M{}
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to find video entries: %v", err)
	}
	defer cursor.Close(ctx)
	var videos []interface{}
	for cursor.Next(ctx) {
		var message bson.M
		if err := cursor.Decode(&message); err != nil {
			return nil, fmt.Errorf("failed to decode message: %v", err)
		}
		videos = append(videos, message)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %v", err)
	}
	return videos, nil
}

func (mc *MongoClient) AddAudio(ctx context.Context, entry interface{}) (interface{}, error) {
	collection := mc.client.Database("Media").Collection("audio")
	entryBSON, err := bson.Marshal(entry)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal entry: %v", err)
	}
	result, err := collection.InsertOne(ctx, entryBSON)
	if err != nil {
		return nil, fmt.Errorf("failed to insert entry: %v", err)
	}
	return result.InsertedID, nil
}

func (mc *MongoClient) GetAudio(ctx context.Context) (interface{}, error) {
	collection := mc.client.Database("Media").Collection("audio")
	filter := bson.M{}
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to find audio entries: %v", err)
	}
	defer cursor.Close(ctx)
	var videos []interface{}
	for cursor.Next(ctx) {
		var message bson.M
		if err := cursor.Decode(&message); err != nil {
			return nil, fmt.Errorf("failed to decode message: %v", err)
		}
		videos = append(videos, message)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %v", err)
	}
	return videos, nil
}

func (mc *MongoClient) DeleteVideo(ctx context.Context, title string) (interface{}, error) {
	collection := mc.client.Database("Media").Collection("video")
	filter := bson.M{}
	filter["title"] = title
	var result bson.M
	err := collection.FindOneAndDelete(ctx, filter).Decode(&result)
	if err != nil {
		return nil, fmt.Errorf("failed to delete entry")
	}
	return result, nil
}

func (mc *MongoClient) DeleteAudio(ctx context.Context, title string) (interface{}, error) {
	collection := mc.client.Database("Media").Collection("audio")
	filter := bson.M{}
	filter["title"] = title
	var result bson.M
	err := collection.FindOneAndDelete(ctx, filter).Decode(&result)
	if err != nil {
		return nil, fmt.Errorf("failed to delete entry")
	}
	return result, nil
}

type MediaIndexEntry struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Genre       []string `json:"genre"`
	Tags        []string `json:"tags"`
	Directory   string   `json:"directory"`
	Location    string   `json:"location"`
	MediaType   string   `json:"mediaType"`
}

func (mc *MongoClient) UpdateMetaData(ctx context.Context, oldTitle string, newMetadata MediaIndexEntry) (interface{}, error) {
	collection := mc.client.Database("Media").Collection(newMetadata.MediaType)
	filter := bson.M{"title": oldTitle}

	// Create an update document excluding the location field
	update := bson.M{
		"$set": bson.M{
			"title":       newMetadata.Title,
			"description": newMetadata.Description,
			"genre":       newMetadata.Genre,
			"tags":        newMetadata.Tags,
			"directory":   newMetadata.Directory,
			// "location" is intentionally excluded
		},
	}

	// Perform the update operation
	result, err := collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return nil, fmt.Errorf("failed to update metadata: %v", err)
	}

	// Return the number of documents modified
	return result.ModifiedCount, nil
}
