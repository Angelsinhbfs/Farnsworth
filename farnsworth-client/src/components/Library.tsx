import React, { useState, useEffect } from 'react';
import {
    listEntries,
    extractDirectoryName,
    deleteEntry,
    API_BASE_URL
} from '../api';
import {DataGrid, GridColDef, GridRowSelectionModel, GridActionsCellItem, GridRowParams} from '@mui/x-data-grid';
import {
    AppBar,
    Toolbar,
    Box,
    Button,
    Typography,
    TextField,
} from '@mui/material';
import UploadForm from './UploadForm';
import Playlist from './Playlist';
import {MediaIndexEntry} from "../MediaIndexEntry";
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';

interface MediaLibraryProps {
    handleLogout: () => void;
    addToPlaylist: (url: string) => void;
    playlistUrls: string[];
    setPlaylistUrls: React.Dispatch<React.SetStateAction<string[]>>;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({ handleLogout, addToPlaylist, playlistUrls, setPlaylistUrls }) => {
    const [mediaType, setMediaType] = useState<'video' | 'audio'>('video');
    const [entries, setEntries] = useState<MediaIndexEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);
    const [searchQuery, setSearchQuery] = useState('');  // State for search query
    const [currentDirectory, setCurrentDirectory] = useState('');  // State for search query
    const [filteredEntries, setFilteredEntries] = useState<MediaIndexEntry[]>([]); // State for filtered entries

    const getRowId = (row: MediaIndexEntry) => {
        return row.isDirectory ? row.directory : row.id;
    };
    const fetchDirectories = async () => {
        try {
            const entries = await listEntries(mediaType);
            setEntries(entries);

        } catch (err) {
            setError('Failed to fetch directories');
        }
    };
    useEffect(() => {
        fetchDirectories().catch(e => console.log(e));
    }, [mediaType]);
    useEffect(() => {
        const filterEntries = () => {
            if (searchQuery) {
                const filtered = entries.filter((entry) =>
                    Object.values(entry).some((value) =>
                        value && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
                    )
                );
                setFilteredEntries(filtered);
            } else {
                const filtered = entries.filter((entry) => {
                    // Filter by current directory and add directory entries
                    const entryDir = entry.directory || ''; // Handle missing Directory property
                    return entryDir.startsWith(currentDirectory);
                });

                // Add directory entries to filteredEntries
                const directoryEntries = getDirectoryEntries(filtered, currentDirectory);
                // Add directory entries to filteredEntries

                // Add ".." entry if not at root
                if (currentDirectory !== '') {
                    const parentDir = currentDirectory.split('/').slice(0, -1).join('/');
                    directoryEntries.unshift({  // Add to the beginning
                        id: 0,
                        title: '..',
                        isDirectory: true,
                        directory: parentDir,
                        description: '',
                        location: '',
                        mediaType: '',
                        genre: [],
                        tags: [],
                    } as MediaIndexEntry);
                    directoryEntries[0].id = getRowId(directoryEntries[0])
                }
                setFilteredEntries([...directoryEntries, ...filtered.filter(entry => !entry.isDirectory && entry.directory === currentDirectory)]);
            }

        };

        filterEntries(); // Call filterEntries whenever entries or searchQuery changes
    }, [entries, searchQuery, currentDirectory, mediaType]);

    const getDirectoryEntries = (entries: MediaIndexEntry[], currentDirectory: string): MediaIndexEntry[] => {
        const directories = new Set<string>();
        entries.forEach(entry => {
            const entryDir = entry.directory || '';
            if (entryDir.startsWith(currentDirectory) && entryDir !== currentDirectory) {
                const parts = entryDir.split('/');
                const nextDir = parts.slice(0, parts.indexOf(currentDirectory.split('/').pop() || '') + 2).join('/');
                if (nextDir) {
                    directories.add(nextDir);
                }
            }
        });

        return Array.from(directories).map((dir, index) => ({
            id: dir, // Use directory path as ID
            title: dir.split('/').pop() || '', // Display last part of path as title
            isDirectory: true, // Mark as directory entry
            directory: dir, // Include full directory path
            description: '',
            location: '',
            mediaType: '',
            genre: [],
            tags: [],
        } as MediaIndexEntry)); // Type assertion for consistency
    };

    const handleOpenUploadModal = () => {
        setUploadModalOpen(true);
    };

    const handleCloseUploadModal = () => {
        fetchDirectories().catch(e=>console.error(e));
        setUploadModalOpen(false);
    };
    const columns: GridColDef[] = [
        {
            field: 'title',
            headerName: 'Title',
            width: 130,
            renderCell: (params) => (
                <Box sx={{display: 'flex', alignItems: 'center'}}>
                    {params.row.isDirectory && <FolderIcon sx={{mr: 1}}/>} {/* Folder icon for directories */}
                    {params.value}
                </Box>
            ),
        },
        {
            field: 'description',
            headerName: 'Description',
            width: 130
        },
        {
            field: 'genre',
            headerName: 'Genre',
            width: 130
        },
        {
            field: 'tags',
            headerName: 'Tags',
            width: 130
        },
        {
            field: 'actions',
            type: 'actions',
            width: 80,
            getActions: (params) => {
                if (!params.row.isDirectory
                ) { // Only show delete button for non-directory entries
                    return [
                        <GridActionsCellItem
                            icon={<DeleteIcon/>}
                            label="Delete"
                            onClick={() => {
                                const sel = entries.find(e => e.id === params.id);
                                if (sel) {
                                    // @ts-ignore
                                    handleDeleteEntry(sel.title, sel.mediatype).then(fetchDirectories).catch(e => console.log(e));
                                } else {
                                    console.error("Entry not found for ID:", params.id);
                                }
                            }}
                        />
                    ];
                }
                return []; // Return empty array for directory entries
            },
        },
    ];
    const handleDeleteEntry = async (title: string, mType: string) => {
        try {
            await deleteEntry(title, mType) // Call the API function to delete the entry
            // Update the entries state after successful deletion
            fetchDirectories().catch(e => console.log(e));
        } catch (error) {
            console.error("Error deleting entry:", error);
            // Handle error, e.g., show an error message to the user
            setError('Failed to delete entry');
        }
    };
    const handleRowSelection = (newSelectionModel: GridRowSelectionModel) => {
        setSelectionModel(newSelectionModel);

        const selectedRows = filteredEntries.filter((entry) => newSelectionModel.includes(entry.id));
        selectedRows.forEach(row => {
            if (row.location) {
                addToPlaylist(`${API_BASE_URL}/media/${mediaType}/${extractDirectoryName(row.location)}/output.m3u8`);
            }
        });

    };
    const handleRowClick = (params: GridRowParams) => {
        const clickedEntry = filteredEntries.find(e => e.id === params.id);
        if (clickedEntry && clickedEntry.isDirectory) {
            setCurrentDirectory(clickedEntry.directory || ''); // Handle potential null directory
        }
    };
    const paginationModel = {page: 0, pageSize: 5};
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value);
    };
    return (
        <Box sx={{display: 'flex', height: '100vh', flexDirection: 'column'}}>
            <AppBar position="static" sx={{zIndex: (theme) => theme.zIndex.drawer + 1}}>
                <Toolbar>
                    <Typography variant="h6" noWrap>
                        Welcome Samurai
                    </Typography>
                    <Box sx={{flexGrow: 1}}/>
                    <Button color="inherit" onClick={() => setMediaType('video')}>Video</Button>
                    <Button color="inherit" onClick={() => setMediaType('audio')}>Audio</Button>
                    <Button color="inherit" onClick={handleOpenUploadModal}>Upload</Button>
                    <Button color="inherit" onClick={handleLogout}>Logout</Button>
                </Toolbar>
            </AppBar>
            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <Box
                sx={{
                    width: 240,
                    flexShrink: 0,
                    overflow: 'auto',
                    resize: 'horizontal',
                    borderRight: '1px solid #ccc',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Typography variant="h6" noWrap sx={{flexGrow: 1}}>
                    Playlist
                </Typography>
                <Playlist initialUrls={playlistUrls} setPlaylistUrls={setPlaylistUrls}/>
            </Box>
                <UploadForm open={isUploadModalOpen} onClose={handleCloseUploadModal} currDir={currentDirectory}/>
            <Box component="main" sx={{flexGrow: 1, p: 3, overflow:'auto', pb: 8}}>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2
                }}> {/* Box for label and search */}
                    <Typography variant="h6" component="div"> {/* Directory label */}
                        {mediaType === 'video' ? 'Videos' : 'Audio'} Directory: {currentDirectory}
                    </Typography>
                    <TextField
                        label="Search"
                        variant="outlined"
                        value={searchQuery}
                        onChange={handleSearchChange}
                    />
                </Box>
                <DataGrid
                    columns={columns}
                    rows={filteredEntries}
                    initialState={{pagination: {paginationModel}}}
                    pageSizeOptions={[5, 10]}
                    getRowId={getRowId}
                    onRowSelectionModelChange={handleRowSelection}
                    onRowClick={handleRowClick}
                    sx={{border: 0}}
                />
            </Box>
            </Box>
        </Box>
    );
};

export default MediaLibrary;