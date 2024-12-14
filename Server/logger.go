package main

import (
	"fmt"
	"os"
	"sync"
)

type Logger struct {
	file       *os.File
	entryCount int
	maxEntries int
	mutex      sync.Mutex
}

// NewLogger initializes and returns a new Logger
func NewLogger(filePath string, maxEntries int) (*Logger, error) {
	file, err := os.OpenFile(filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to open log file: %v", err)
	}

	return &Logger{
		file:       file,
		entryCount: 0,
		maxEntries: maxEntries,
	}, nil
}

// logEntry writes a log entry to the file
func (l *Logger) logEntry(entry string) error {
	l.mutex.Lock()
	defer l.mutex.Unlock()

	if l.entryCount >= l.maxEntries {
		if err := l.rotateLogs(); err != nil {
			return err
		}
	}

	_, err := l.file.WriteString(entry + "\n")
	if err != nil {
		return fmt.Errorf("failed to write log entry: %v", err)
	}

	l.entryCount++
	return nil
}

// rotateLogs handles log rotation by truncating the file
func (l *Logger) rotateLogs() error {
	if err := l.file.Truncate(0); err != nil {
		return fmt.Errorf("failed to truncate log file: %v", err)
	}
	if _, err := l.file.Seek(0, 0); err != nil {
		return fmt.Errorf("failed to seek log file: %v", err)
	}
	l.entryCount = 0
	return nil
}

// Info logs informational messages
func (l *Logger) Info(message string) {
	entry := fmt.Sprintf("INFO: %s", message)
	fmt.Println(entry)
	if err := l.logEntry(entry); err != nil {
		fmt.Println("Error logging info:", err)
	}
}

// Error logs error messages
func (l *Logger) Error(message string) {
	entry := fmt.Sprintf("ERROR: %s", message)
	fmt.Println(entry)
	if err := l.logEntry(entry); err != nil {
		fmt.Println("Error logging error:", err)
	}
}
