import React, {useState, useEffect, useRef} from 'react';
import { Box, Button, List, ListItem, ListItemText } from '@mui/material';
import HLSPlayer from './HLSPlayer';
import { extractDirectoryName, savePlaylistToLocalStorage, loadPlaylistFromLocalStorage } from '../api';

interface PlaylistProps {
    initialUrls: string[];
    setPlaylistUrls: React.Dispatch<React.SetStateAction<string[]>>;
}

const Playlist: React.FC<PlaylistProps> = ({ initialUrls, setPlaylistUrls }) => {
    const [urls, setUrls] = useState<string[]>(initialUrls);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlayerVisible, setPlayerVisible] = useState(false);

    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        savePlaylistToLocalStorage(urls);
        setUrls(initialUrls);
        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            const file = e.dataTransfer?.files?.[0];
            loadFile(file);
        };
        if (boxRef.current) {
            boxRef.current.addEventListener('drop', handleDrop);
            boxRef.current.addEventListener('dragover', (e) => e.preventDefault());
        }

        return () => {
            if (boxRef.current) {
                boxRef.current.removeEventListener('drop', handleDrop);
                boxRef.current.removeEventListener('dragover', (e) => e.preventDefault());
            }
        };
    }, [urls, initialUrls]);

    const handleDownload = () => {
        const playlistJson = JSON.stringify(urls, null, 2);
        const blob = new Blob([playlistJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'playlist.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleRemove = (url: string) => {
        const updatedUrls = urls.filter(itm => itm !== url);
        setUrls(updatedUrls);
        setPlaylistUrls(updatedUrls);
    };

    const handleVideoSelect = (index: number) => {
        setCurrentIndex(index);
        setPlayerVisible(true);
    };

    const handleClosePlayer = () => {
        setPlayerVisible(false);
    };

    const handleVideoEnd = () => {
        if (currentIndex < urls.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setPlayerVisible(false);
        }
    };

    const inputRef = useRef<HTMLInputElement>(null);

    const handleLoad = () => {
        inputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        loadFile(file);
    };

    function loadFile(file: File | undefined) {
        if (file && file.type === 'application/json') {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const loadedUrls = JSON.parse(event.target?.result as string);
                    if (Array.isArray(loadedUrls) && loadedUrls.every(item => typeof item === 'string')) {
                        setUrls(loadedUrls);
                        setPlaylistUrls(loadedUrls);
                    } else {
                        console.error("Invalid JSON format: Expected an array of strings.");
                    }
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                }
            };
            reader.readAsText(file);
        }
    }


    return (
        <Box ref={boxRef}>
            <HLSPlayer
                src={urls[currentIndex]}
                visible={isPlayerVisible}
                onClose={handleClosePlayer}
                onEnded={handleVideoEnd}
            />
            <List>
                {urls.map((url, index) => (
                    <ListItem key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <ListItemText primary={extractDirectoryName(url)} onClick={() => handleVideoSelect(index)} />
                        <Button variant="outlined" color="secondary" sx={{ marginLeft: 2 }} onClick={() => handleRemove(url)}>Remove</Button>
                    </ListItem>
                ))}
            </List>
            <Button variant="outlined" onClick={() => {
                setUrls([]);
                setPlaylistUrls([]);
            }}>
                Clear List
            </Button>
            <Button variant="outlined" onClick={handleDownload} sx={{ mr: 2 }}>
                Download Playlist
            </Button>
            <input
                type="file"
                accept="application/json"
                ref={inputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
            <Button variant="outlined" onClick={handleLoad}>Load Playlist</Button>
        </Box>
    );
};

export default Playlist;