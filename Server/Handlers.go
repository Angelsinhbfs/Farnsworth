package main

import (
	"archive/zip"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

var tokens []string

type MediaIndexEntry struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Genre       []string `json:"genre"`
	Tags        []string `json:"tags"`
	Directory   string   `json:"directory"`
	Location    string   `json:"location"`
	MediaType   string   `json:"mediaType"`
}

func UploadZipHandler(w http.ResponseWriter, r *http.Request) {
	// Parse the multipart form
	err := r.ParseMultipartForm(10 << 20) // 10 MB max memory
	if err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	// Get the metadata from the form data
	metadata := r.FormValue("metadata")
	if metadata == "" {
		http.Error(w, "Metadata not found in form data", http.StatusBadRequest)
		return
	}

	// Unmarshal the JSON metadata
	var mie MediaIndexEntry
	err = json.Unmarshal([]byte(metadata), &mie)
	if err != nil {
		http.Error(w, "Invalid metadata JSON", http.StatusBadRequest)
		return
	}

	if mie.MediaType != "video" && mie.MediaType != "audio" {
		http.Error(w, "Invalid media type", http.StatusBadRequest)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	// Retrieve the file from form data
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving the file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Retrieve chunk information
	chunkIndex := r.FormValue("chunkIndex")
	totalChunks, err := strconv.Atoi(r.FormValue("totalChunks"))
	if chunkIndex == "" || err != nil {
		http.Error(w, "Chunk information missing", http.StatusBadRequest)
		return
	}

	// Create a temporary directory for storing chunks
	chunkDir := "./chunks/" + mie.Title
	if _, err := os.Stat(chunkDir); os.IsNotExist(err) {
		err = os.MkdirAll(chunkDir, os.ModePerm)
		if err != nil {
			fmt.Println(err)
			http.Error(w, "Unable to create chunk directory", http.StatusInternalServerError)
			return
		}
	}

	// Save the chunk to a temporary file
	chunkFilePath := filepath.Join(chunkDir, fmt.Sprintf("chunk-%s", chunkIndex))
	chunkFile, err := os.Create(chunkFilePath)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Unable to create chunk file", http.StatusInternalServerError)
		return
	}
	defer chunkFile.Close()

	_, err = io.Copy(chunkFile, file)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Unable to save chunk", http.StatusInternalServerError)
		return
	}

	// Check if all chunks are received
	chunkCount, err := countChunks(chunkDir)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Error counting chunks", http.StatusInternalServerError)
		return
	}

	if chunkCount == totalChunks {
		// Assemble chunks into a complete file
		finalFilePath := filepath.Join("./media/", mie.MediaType, mie.Title+".zip")
		err = assembleChunks(chunkDir, finalFilePath)
		// Clean up chunk directory
		os.RemoveAll(chunkDir)
		if err != nil {

			fmt.Println(err)
			http.Error(w, "Error assembling chunks", http.StatusInternalServerError)
			return
		}

		expandedDir := strings.TrimSuffix(finalFilePath, filepath.Ext(finalFilePath))
		mie.Location = expandedDir
		// Unzip the file
		err = unzip(finalFilePath, mie.Location)
		os.Remove(finalFilePath)
		if err != nil {

			fmt.Println(err)
			http.Error(w, "Error unzipping file", http.StatusInternalServerError)
			return
		}

		// If DB is there, add to DB
		if DBConnected {
			if mie.MediaType == "video" {
				_, err = DBClient.AddVideo(CTX, mie)
			} else {
				_, err = DBClient.AddAudio(CTX, mie)
			}
			if err != nil {
				fmt.Println(err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}

		// Respond with success
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "Upload complete")
	} else {
		// Respond with success for the chunk
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "Chunk received")
	}
}

func countChunks(chunkDir string) (int, error) {
	files, err := os.ReadDir(chunkDir)
	if err != nil {
		return 0, err
	}
	return len(files), nil
}

func assembleChunks(chunkDir, finalFilePath string) error {
	finalFile, err := os.Create(finalFilePath)
	if err != nil {
		return err
	}
	defer finalFile.Close()

	files, err := os.ReadDir(chunkDir)
	if err != nil {
		return err
	}

	for i := 0; i < len(files); i++ {
		chunkFilePath := filepath.Join(chunkDir, fmt.Sprintf("chunk-%d", i))
		chunkFile, err := os.Open(chunkFilePath)
		if err != nil {
			return err
		}
		_, err = io.Copy(finalFile, chunkFile)
		chunkFile.Close()
		if err != nil {
			return err
		}
	}

	return nil
}

func DeleteHandler(w http.ResponseWriter, r *http.Request) {
	mediaType := r.URL.Query().Get("mType")
	toDeleteEncoded := r.URL.Query().Get("title")
	toDelete, err := url.QueryUnescape(toDeleteEncoded) // Decode the title
	if err != nil {
		http.Error(w, "Invalid title encoding", http.StatusBadRequest)
		return
	}

	if mediaType != "video" && mediaType != "audio" {
		http.Error(w, "Invalid media type", http.StatusBadRequest)
		return
	}
	if DBConnected {
		if mediaType == "video" {
			_, err := DBClient.DeleteVideo(CTX, toDelete)
			if err != nil {
				fmt.Println(err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		} else {
			_, err := DBClient.DeleteAudio(CTX, toDelete)
			if err != nil {
				fmt.Println(err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
		dirPath := "./media/" + mediaType + "/" + toDelete // Add "/" separator
		fmt.Printf("Deleting directory: %v\n", dirPath)    // Log the directory to be deleted
		err = RemoveContents(dirPath)                      // Call RemoveContents to delete directory contents
		if err != nil {
			fmt.Println(err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		err = os.Remove(dirPath) // Remove the directory itself
		if err != nil {
			fmt.Println(err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	}
}
func RemoveContents(dir string) error {
	d, err := os.Open(dir)
	if err != nil {
		return err
	}
	defer d.Close()
	names, err := d.Readdirnames(-1)
	if err != nil {
		return err
	}
	for _, name := range names {
		err = os.RemoveAll(filepath.Join(dir, name))
		if err != nil {
			return err
		}
	}
	return nil
}

func HandleRoot(w http.ResponseWriter, r *http.Request) {
	dir := "./client"
	fs := http.FileServer(http.Dir(dir))
	http.StripPrefix("/", fs).ServeHTTP(w, r)
}

func HandleLogin(w http.ResponseWriter, r *http.Request) {
	token, _ := randomHex(20)
	tokens = append(tokens, token)
	http.SetCookie(w, &http.Cookie{
		Name:  "auth-token",
		Value: token,
		Path:  "/",
	})
	w.Header().Set("token", token)
	redirectURL := "/"
	if r.Referer() == "http://localhost:3000/" {
		redirectURL = "http://localhost:3000/"
	}

	w.Header().Set("Location", redirectURL)
	w.WriteHeader(http.StatusFound)
}

func randomHex(n int) (string, error) {
	bytes := make([]byte, n)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func BasicAuth(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		username, password, ok := r.BasicAuth()

		if ok {
			usernameHash := sha256.Sum256([]byte(username))
			passwordHash := sha256.Sum256([]byte(password))
			expectedUsernameHash := sha256.Sum256([]byte(ExpectedUser))
			expectedPasswordHash := sha256.Sum256([]byte(ExpectedKey))

			usernameMatch := subtle.ConstantTimeCompare(usernameHash[:], expectedUsernameHash[:]) == 1
			passwordMatch := subtle.ConstantTimeCompare(passwordHash[:], expectedPasswordHash[:]) == 1

			if usernameMatch && passwordMatch {

				next.ServeHTTP(w, r)
				return
			}
		}

		w.Header().Set("WWW-Authenticate", `Basic realm="restricted", charset="UTF-8"`)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
	})
}

func CheckToken(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		bToken := r.Header.Get("Authorization")
		if bToken != "" {
			parts := strings.Split(bToken, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				reqToken := parts[1]
				for _, token := range tokens {
					if token == reqToken {
						next.ServeHTTP(w, r)
						return
					}
				}
			}
		}
		// If token is not found or does not match, return unauthorized
		w.Header().Set("WWW-Authenticate", `Basic realm="restricted", charset="UTF-8"`)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
	})
}

func unzip(src, dest string) error {
	r, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		fPath := filepath.Join(dest, f.Name)
		if f.FileInfo().IsDir() {
			os.MkdirAll(fPath, os.ModePerm)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(fPath), os.ModePerm); err != nil {
			return err
		}

		outFile, err := os.OpenFile(fPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			return err
		}

		_, err = io.Copy(outFile, rc)

		outFile.Close()
		rc.Close()

		if err != nil {
			return err
		}
	}
	return nil
}

func ListDirectoriesHandler(w http.ResponseWriter, r *http.Request) {
	mediaType := r.URL.Query().Get("mType")
	if mediaType != "video" && mediaType != "audio" {
		http.Error(w, "Invalid media type", http.StatusBadRequest)
		return
	}

	if DBConnected {
		if mediaType == "video" {
			videos, err := DBClient.GetVideos(CTX)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			jsonData, err := json.Marshal(videos)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.Write(jsonData)
		} else {
			audio, err := DBClient.GetAudio(CTX)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			jsonData, err := json.Marshal(audio)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.Write(jsonData)
		}
	} else {
		dirPath := "./media/" + mediaType
		dirs, err := listDirectories(dirPath)
		if err != nil {
			http.Error(w, "Error reading directories", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(dirs)
	}
}

func listDirectories(path string) ([]string, error) {
	var directories []string

	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			directories = append(directories, entry.Name())
		}
	}

	return directories, nil
}

func ServeMediaHandler(w http.ResponseWriter, r *http.Request) {
	// Extract the path from the URL
	urlPath := r.URL.Path

	// Ensure the URL path starts with "/media/"
	if !strings.HasPrefix(urlPath, "/media/") {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	// Map the URL path to the file system path
	// Remove the "/media/" prefix to get the relative path
	trimmedPath := strings.TrimPrefix(urlPath, "/media/")
	filePath := filepath.Join("./media", trimmedPath)

	// Serve the file
	http.ServeFile(w, r, filePath)
}

func ServeFFMPEGHandler(w http.ResponseWriter, r *http.Request) {
	urlPath := r.URL.Path
	if !strings.HasPrefix(urlPath, "/ffmpeg/") {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	trimmedPath := strings.TrimPrefix(urlPath, "/ffmpeg/")
	filePath := filepath.Join("./Server/ffmpeg", trimmedPath)
	http.ServeFile(w, r, filePath)
}

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !DevelopmentCORS {
			next.ServeHTTP(w, r)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		}
	})
}
