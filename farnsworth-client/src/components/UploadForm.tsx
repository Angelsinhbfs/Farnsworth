import React, {useEffect, useState} from 'react';
import { uploadZip } from '../api';
import {
    Button,
    TextField,
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    ListItem, Chip, List, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import MediaConverter from "./Converter";

interface UploadFormProps {
    open: boolean;
    onClose: () => void;
    currDir: string;
}

const UploadForm: React.FC<UploadFormProps> = ({ open, onClose, currDir }) => {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [genre, setGenre] = useState(['']);
    const [tags, setTags] = useState(['']);
    const [dir, setDir] = useState('');
    const [mediaType, setMediaType] = useState('video');
    const [tempGenre, setTempGenre] = useState('');
    const [tempTag, setTempTag] = useState('');
    const [finalDir, setFinalDir] = useState('');

    useEffect(() => {
        setFinalDir(currDir); // Initialize dir with currDir
    }, [currDir]);
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        setFile(selectedFile);
        if (selectedFile) {
            setTitle(selectedFile.name);
        }
    };

    const handleConversionComplete = async (zipFile: File) => {
        try {
            await uploadZip(
                zipFile,
                title,
                desc,
                genre,
                tags,
                dir,
                mediaType);
            alert('File uploaded successfully');
            onClose(); // Close the modal after successful upload
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleDeleteGenre = (genreToDelete: string) => () => {
        setGenre((chips) => chips.filter((chip) => chip !== genreToDelete));
    };

    const handleDeleteTag = (tagToDelete: string) => () => {
        setTags((chips) => chips.filter((chip) => chip !== tagToDelete));
    };
    const handleDirChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDir((prevDir) => {
            const newDir = e.target.value;
            setFinalDir(`${currDir}/${newDir}`);
            return newDir;
        });
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Upload File</DialogTitle>
            <DialogContent>
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                    <input
                        type="file"
                        onChange={handleFileChange}
                        style={{ marginBottom: '16px' }}
                    />
                    <TextField
                        label="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                    />
                    <TextField
                        label="Description"
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        fullWidth
                    />
                    <TextField
                        label={dir !== ''? finalDir : "Directory"}
                        value={dir}
                        onChange={handleDirChange}
                        fullWidth
                    />
                    <List sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {genre.filter(g=>g!=='').map((g) => {
                        return (
                                <ListItem key={g} sx={{ margin: 0, padding:0}}>
                                    <Chip
                                        label={g}
                                        onDelete={handleDeleteGenre(g)}
                                    />
                                </ListItem>
                        )
                    })}
                    </List>
                    <TextField
                        label="Genre"
                        value={tempGenre}
                        onChange={(e) => setTempGenre(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key == 'Enter') {
                                setGenre([...genre, tempGenre]);
                                setTempGenre('');
                            }
                        }}
                        fullWidth
                    />
                    <List sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {tags.filter(g=>g!=='').map((g) => {
                            return (
                                <ListItem key={g} sx={{ margin: 0, padding:0}}>
                                    <Chip
                                        label={g}
                                        onDelete={handleDeleteTag(g)}
                                    />
                                </ListItem>
                            )
                        })}
                    </List>
                    <TextField
                        label="Tags"
                        value={tempTag}
                        onChange={(e) => setTempTag(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key == 'Enter') {
                                setTags([...tags, tempTag]);
                                setTempTag('');
                            }
                        }}
                        fullWidth
                    />
                    <ToggleButtonGroup
                        value={mediaType}
                        exclusive
                        onChange={(e:React.MouseEvent<HTMLElement>, newMediaType: string) => {
                            setMediaType(newMediaType)
                        }}
                        fullWidth
                    >
                        <ToggleButton value="video">Video</ToggleButton>
                        <ToggleButton value="audio">Audio</ToggleButton>
                    </ToggleButtonGroup>
                </Box>
                {file && <MediaConverter file={file} onConversionComplete={handleConversionComplete} />}
            </DialogContent>
            <DialogActions>
                {file && file.name.split('.').pop() === 'zip' && ( // Add button JSX here
                    <Button onClick={() => {uploadZip(file,title,desc,genre,tags,finalDir,mediaType)}} color="primary">
                        Upload
                    </Button>
                )}
                <Button onClick={onClose} color="primary">
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UploadForm;