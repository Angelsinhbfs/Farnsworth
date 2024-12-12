import React, { useState, useEffect } from 'react';
import { savePlaylistToLocalStorage, loadPlaylistFromLocalStorage } from '../api';
import MediaLibrary from './Library';
import {createTheme, ThemeProvider} from '@mui/material/styles';
interface MediaManagerProps{
    handleLogout: () => void;
}
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});

const MediaManager: React.FC<MediaManagerProps> = ({ handleLogout }) => {
    const [playlistUrls, setPlaylistUrls] = useState<string[]>(() => loadPlaylistFromLocalStorage());

    useEffect(() => {
        savePlaylistToLocalStorage(playlistUrls);
    }, [playlistUrls]);

    const addToPlaylist = (url: string) => {
        setPlaylistUrls((prevUrls) => [...prevUrls, url]);
    };

    return (
        <ThemeProvider theme={darkTheme}> {/* Add ThemeProvider here */}
            <MediaLibrary handleLogout={handleLogout} addToPlaylist={addToPlaylist} playlistUrls={playlistUrls} setPlaylistUrls={setPlaylistUrls} />
        </ThemeProvider>
    );
};

export default MediaManager;