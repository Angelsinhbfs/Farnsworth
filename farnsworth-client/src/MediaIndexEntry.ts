export interface MediaIndexEntry {
    id: string | number;
    title: string;
    description: string;
    genre: string[];
    tags: string[];
    directory: string;
    location: string;
    mediaType: string;
    isDirectory?: boolean;
}