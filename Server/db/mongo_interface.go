package db

import "context"

type MongoDBInterface interface {
	AddVideo(ctx context.Context, entry string, directory string) (interface{}, error)
	GetVideos(ctx context.Context) (interface{}, error)
	DeleteVideo(ctx context.Context, title string) (interface{}, error)

	AddAudio(ctx context.Context, entry string, directory string) (interface{}, error)
	GetAudio(ctx context.Context) (interface{}, error)
	DeleteAudio(ctx context.Context, title string) (interface{}, error)
}
