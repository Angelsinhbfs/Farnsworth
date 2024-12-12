// @ts-ignore
import archiver from 'archiver';
import {MediaIndexEntry} from "./MediaIndexEntry";

export const API_BASE_URL = process.env.BASE_URL || 'http://localhost:8080'; // Fallback for development
export function getAuthToken() {
    const name = 'auth-token=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

export async function uploadZip(
    file: File,
    title: string,
    desc: string,
    genre: string[],
    tags: string[],
    dir: string,
    mediaType: string
): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);

    const metadata = {
        Title: title,
        Description: desc,
        Genre: genre.filter(g=>g!==''),
        Tags: tags.filter(g=>g!==''),
        Directory: dir,
        MediaType: mediaType
    };

    formData.append('metadata', JSON.stringify(metadata));


    const url = new URL(`${API_BASE_URL}/upload/`);

    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getAuthToken() || ''}`
        },
        body: formData
    });

    if (!response.ok) {
        throw new Error('Failed to upload ZIP file');
    }
}

export async function listEntries(mediaType: string): Promise<MediaIndexEntry[]> {
    const response = await fetch(`${API_BASE_URL}/dir/?mType=${mediaType}`, {
        headers: {
            'Authorization': `Bearer ${getAuthToken() || ''}`
        }
    });

    const data = await response.json();
    if (!data){
        return [];
    }

    // Check if the data is an array of strings
    if (Array.isArray(data) && data.every(item => typeof item === 'string')) {
        return data.map((item, index) => objectifyDir(item, index,mediaType));
    } else if (Array.isArray(data)) { // Assuming it's an array of objects otherwise
        return data.map((item, index)=>{return {...item, id: index}});
    } else {
        throw new Error('Invalid data format received from server');
    }
}
function objectifyDir(dir: string, index: number, mType: string) :MediaIndexEntry {
    return {
        id:index,
        title : extractDirectoryName(dir),
        description : "null",
        genre : [],
        tags : [],
        directory: "unsorted",
        location: dir,
        mediaType: mType
    }
}
export function login() {
    window.location.href = `${API_BASE_URL}/login/`;
}

export function savePlaylistToLocalStorage(urls: string[]): void {
    localStorage.setItem('playlistUrls', JSON.stringify(urls));
}

export function loadPlaylistFromLocalStorage(): string[] {
    const savedUrls = localStorage.getItem('playlistUrls');
    return savedUrls ? JSON.parse(savedUrls) : [];
}

export function extractDirectoryName(url: string): string {
    const parts = url.split('/');
    const videoIndex = parts.indexOf('video');
    const audioIndex = parts.indexOf('audio');
    const dirIndex = (videoIndex > -1 ? videoIndex : audioIndex) + 1;
    return parts[dirIndex] || url;
}

export async function deleteEntry(title: string, mType: string): Promise<void> {
    const encodedTitle = encodeURIComponent(title); // Encode the title for URLs
    const url = `${API_BASE_URL}/delete/?mType=${mType}&title=${encodedTitle}`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${getAuthToken() || ''}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to delete entry'); // Add error handling
    }
}

